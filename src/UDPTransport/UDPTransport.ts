import * as udp from "dgram";
import { networkInterfaces } from "os";
import { Buffer } from "buffer";

import { generatePvaHeader, ipInt2String, ipString2Int, ipv4ToIpv6HexArray, ipv6NumberArrayToString, isIPaddr, setPayloadSizeInPvaHeader, splitPvaMessage } from "../Global/GlobalMethods";
import { printMsg } from "../Global/GlobalMethods";
import { CA_MESSAGE_HEADER_SIZE, CA_MINOR_PROTOCOL_REVISION, CA_MSG_HEADER_OFFSETS, CA_SERVER_PORT, PVA_COMMANDS, PVA_ENDIAN, PVA_MESSAGE_SEGMENT_TYPE, PVA_MESSAGE_TYPE, PVA_MSG_HEADER_OFFSETS } from "../Global/Constants";
import { CA_COMMANDS } from "../Global/Constants";
import { Context, Context_STATES, type_network_stats } from "../Context/Context";
import { generateCAHeader, GlobalMethods, splitCaMessage } from "../Global/GlobalMethods";


import { Intervals } from "../Intervals/Intervals";
import { Beacon } from "../Beacon/Beacon";
import { Promises } from "../Promises/Promises";
import { ENDIAN, writeUInt16, writeUInt32 } from "../PvaData/PvaMethods";
import { encodeData } from "../PvaData/DataEncoder";
import { SIZE_TYPE, typeIndexEnum } from "../PvaData/PvaData_typeEncoding";
import { decodeData } from "../PvaData/DataDecoder";

export enum UDPTransportState {
    NOT_INITIALIZED, // initial state
    INITIALIZING, // before socket binds to a port
    INITIALIZED, // socket successfully bound to a port
    FAILED, // error occurs, unrecoverable
    DESTROYED, // destroyed with Context
}


export class UDPTransport {
    // dgram
    private socket: udp.Socket = udp.createSocket({ type: "udp4", reuseAddr: true }); // reuseAddr = true;
    private localPort: number = -1;
    private localAddress: string = "";
    private caBroadcastAddresses: [number, string][] = [];
    private pvaBroadcastAddresses: [number, string][] = [];
    private pvaBeaconSocket: udp.Socket = udp.createSocket({ type: "udp4", reuseAddr: true });

    private context: Context;

    private state: UDPTransportState = UDPTransportState.NOT_INITIALIZED;

    private CA_PROTO_SEARCH_bulk_msg: Buffer;

    private beacons: Record<string, Beacon> = {};

    private pvaChannelSearchSequenceId = 0;

    // asynchronous
    private intervals: Intervals = new Intervals();;
    private promises: Promises = new Promises();

    // network statistics
    private networkStats: type_network_stats = {
        packetsReceivedInLastSecond: 0,
        bytesReceivedInLastSecond: 0,
        caMessagesReceivedInLastSecond: 0,
        packetsSentInLastSecond: 0,
        bytesSentInLastSecond: 0,
        caMessagesSentInLastSecond: 0,
        startTime: 0,
        endTime: 0,
    };
    private packetsReceivedInLastSecond: number = 0;
    private bytesReceivedInLastSecond: number = 0;
    private caMessagesReceivedInLastSecond: number = 0;
    private packetsSentInLastSecond: number = 0;
    private bytesSentInLastSecond: number = 0;
    private caMessagesSentInLastSecond: number = 0;

    constructor(context: Context) {
        this.context = context;
        this.updateCaBroadcastAddresses();
        this.updatePvaBroadcastAddresses();

        let maxUdpMessageSize = this.getContext().getEnv("EPICS_CA_MAX_UDP_BUFFER");
        if (typeof maxUdpMessageSize !== "number") {
            maxUdpMessageSize = 1024;
        }
        this.CA_PROTO_SEARCH_bulk_msg = Buffer.alloc(maxUdpMessageSize);


        // network statistics
        this.getIntervals().addInterval("NETWORK_STATS", 1, () => {
            this.getNetworkStats()["packetsReceivedInLastSecond"] = this.packetsReceivedInLastSecond;
            this.getNetworkStats()["bytesReceivedInLastSecond"] = this.bytesReceivedInLastSecond;
            this.getNetworkStats()["caMessagesReceivedInLastSecond"] = this.caMessagesReceivedInLastSecond;
            this.getNetworkStats()["packetsSentInLastSecond"] = this.packetsSentInLastSecond;
            this.getNetworkStats()["bytesSentInLastSecond"] = this.bytesSentInLastSecond;
            this.getNetworkStats()["caMessagesSentInLastSecond"] = this.caMessagesSentInLastSecond;
            this.getNetworkStats()["startTime"] = this.getNetworkStats()["endTime"];
            this.getNetworkStats()["endTime"] = Date.now();
            this.packetsReceivedInLastSecond = 0;
            this.bytesReceivedInLastSecond = 0;
            this.caMessagesReceivedInLastSecond = 0;
            this.packetsSentInLastSecond = 0;
            this.bytesSentInLastSecond = 0;
            this.caMessagesSentInLastSecond = 0;
        },
            []
        );
        this.getIntervals().startInterval("NETWORK_STATS");
    }

    // ---------------------- message handlers ----------------------

    messageHandler = (msg: Buffer, info: Record<string, any>) => {
        // UDP message is simply a package, we assume a CA/PVA message is not splitted in to multiple network packets.
        // Several CA/PVA messages can be combined into one UDP packet.
        // We can use the first byte of a UDP packet to determine if it is for PVA or CA.
        if (this.isPvaMessage(msg, 0)) {
            this.pvaMessageHandler(msg, info);
        } else {
            this.caMessageHandler(msg, info);
        }
    };

    private pvaMessageHandler = (msg: Buffer, info: Record<string, any>) => {
        // a packet may contain 1 or more commands
        const { messages, residualMessage } = splitPvaMessage(msg);
        for (let message of messages) {
            printMsg(message, info, "Received UDP PVA");
        }

        // update network statistics
        this.caMessagesReceivedInLastSecond = this.caMessagesReceivedInLastSecond + messages.length;
        this.packetsReceivedInLastSecond = this.packetsReceivedInLastSecond + 1;
        this.bytesReceivedInLastSecond = this.bytesReceivedInLastSecond + msg.length;

        for (let message of messages) {
            const command = message.readInt8(PVA_MSG_HEADER_OFFSETS.command);
            if (command === PVA_COMMANDS.PVA_PROTO_SEARCH_RESPONSE) {
                this.handle_PVA_PROTO_SEARCH_RESPONSE(message, info);
            }
        }
    }

    private caMessageHandler = (msg: Buffer, info: Record<string, any>) => {
        // a packet may contain 1 or more commands
        const { messages, residualMessage } = splitCaMessage(msg);
        for (let message of messages) {
            printMsg(message, info, "Received UDP CA");
        }

        // update network statistics
        this.caMessagesReceivedInLastSecond = this.caMessagesReceivedInLastSecond + messages.length;
        this.packetsReceivedInLastSecond = this.packetsReceivedInLastSecond + 1;
        this.bytesReceivedInLastSecond = this.bytesReceivedInLastSecond + msg.length;

        for (let message of messages) {
            let command = message.readUInt16BE(0);
            if (command === CA_COMMANDS.CA_PROTO_VERSION) {
                // 0x00
                // do nothing
            } else if (command === CA_COMMANDS.CA_PROTO_RSRV_IS_UP) {
                // 0x0d
                this.handle_CA_PROTO_RSRV_IS_UP(message, info);
            } else if (command === CA_COMMANDS.CA_REPEATER_CONFIRM) {
                // 0x11
                this.handle_CA_REPEATER_CONFIRM(message, info);
            } else if (command === CA_COMMANDS.CA_PROTO_SEARCH) {
                // 0x06
                this.handle_CA_PROTO_SEARCH(message, info);
            } else if (command === CA_COMMANDS.CA_PROTO_NOT_FOUND) {
                // 0x0e
                // todo: what should be done?
            } else if (command = 0xca) {
                // a PVA message

            }
        }
    }



    // handle CA_PROTO_SEARCH (0x06) reply message
    private handle_PVA_PROTO_SEARCH_RESPONSE = async (message: Buffer, info: Record<string, any>) => {

        const type_searchResponse = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "searchResponse",
            fields: {
                guid: { typeIndex: typeIndexEnum.integer_fixedSizeArray_unsignedByte, size: 12 },
                searchSequenceID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                serverAddress: { typeIndex: typeIndexEnum.integer_fixedSizeArray_unsignedByte, size: 16 },
                serverPort: { typeIndex: typeIndexEnum.integer_scalar_unsignedShort },
                protocol: { typeIndex: typeIndexEnum.string_scalar },
                found: { typeIndex: typeIndexEnum.boolean_scalar },
                searchInstanceIDs: { typeIndex: typeIndexEnum.integer_variableSizeArray_unsignedInt, sizeType: SIZE_TYPE.unsigned_short },
            }
        }

        try {
            const data = decodeData(type_searchResponse, message, 8, PVA_ENDIAN);

            for (let searchInstanceID of data["searchInstanceIDs"]) {
                try {
                    const channelClientID = searchInstanceID;
                    console.log(data, ipv6NumberArrayToString(data["serverAddress"]))
                    // if channel is not resolved yet
                    if (this.getContext().getUnresolvedChannelsByClientID()[channelClientID.toString()] !== undefined) {
                        const channel = this.getContext().getUnresolvedChannelsByClientID()[channelClientID.toString()];
                        // lift the blocking of Channel.createTCP(), next step is to create the TCP based on
                        // the info received in this UDP packet
                        const serverAddress = ipv6NumberArrayToString(data["serverAddress"]);
                        const serverPort = data["serverPort"];
                        console.log("AAAAAAA")
                        channel.getPromises().resolve("PVA_PROTO_SEARCH_RESPONSE", [serverAddress, serverPort]);
                        console.log("AAAAAAA bbb")
                    } else {
                        // the channel is already resolved: do nothing
                    }
                } catch (e) {
                    // continue to next channel
                }
            }

        } catch (e) {
            GlobalMethods.errorLog(e);
            return;
        }
    };

    // handle CA_PROTO_SEARCH (0x06) reply message
    private handle_CA_PROTO_SEARCH = async (message: Buffer, info: Record<string, any>) => {
        const serverTcpPort: number = message.readUInt16BE(CA_MSG_HEADER_OFFSETS.dataType);
        const serverAddress: string = info.address;
        const channelClientID: number = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter2);
        const serverCaMinorVersion: number = message.readUInt16BE(CA_MESSAGE_HEADER_SIZE);

        // if channel is not resolved yet
        if (this.getContext().getUnresolvedChannelsByClientID()[channelClientID.toString()] !== undefined) {
            const channel = this.getContext().getUnresolvedChannelsByClientID()[channelClientID.toString()];
            // lift the blocking of Channel.createTCP(), next step is to create the TCP based on
            // the info received in this UDP packet
            channel.getPromises().resolve("CA_PROTO_SEARCH", [serverAddress, serverTcpPort, serverCaMinorVersion]);
            return;
        } else {
            // the channel is already resolved: do nothing
        }
    };

    // CA server beacon, 0x0d
    private handle_CA_PROTO_RSRV_IS_UP(message: Buffer, info: Record<string, any>) {
        // Each beacon should associate with one or several TCPTransports
        // A TCPTransoprt is characterized by IP:port:(server scheduling priority)
        // if there is no TCP connection for this beacon, then this beacon is ignored

        let serverTcpPort = message.readUInt16BE(CA_MSG_HEADER_OFFSETS.dataCount);
        let serverAddressInt = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter2);
        let serverAddress = ipInt2String(serverAddressInt);
        let beaconID = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter1);
        let serverCaVersion = message.readUInt16BE(CA_MSG_HEADER_OFFSETS.dataType);

        // create a new Beacon if this beacon does not exist
        const beaconKey = Beacon.generateBeaconKey(serverTcpPort, serverAddress);
        let beacon = this.getBeacon(beaconKey);
        if (beacon === undefined) {
            // callback for beacon anomaly
            let beaconAnomalyCallback = this.getContext().getBeaconAnomalyCallback();
            beacon = new Beacon(serverTcpPort, serverAddress, beaconAnomalyCallback, serverCaVersion);
        }
        this.getBeacons()[beaconKey] = beacon;

        // networkChanged === true is serious, we should destroy the TcpTransport object
        // if there is someone interested in this TCP connection, it should connect by itself
        const networkChanged = beacon.updatePeriod(beaconID);
        if (networkChanged === true) {
            const affectedTcpTransports = this.getContext().getTcpTransports().getTCPTransportsByAddressAndPort(beaconKey);
            for (let affectedTcpTransport of affectedTcpTransports) {
                affectedTcpTransport.destroySoft();
            }
        }
    }

    // registration confirmation message from CA Repeater, 0x11
    private handle_CA_REPEATER_CONFIRM = (message: Buffer, info: Record<string, any>) => {
        GlobalMethods.infoLog("UDPTransport registered to CARepeater");
        // lift the await blocking in Context.initialize()
        this.getPromises().resolvePromise("CA_REPEATER_CONFIRM", "");
    }

    // ------------------------- methods ----------------------------

    send = (buffer: Buffer, port: number, address: string, offset?: number, length?: number) => {
        const { messages, residualMessage } = splitCaMessage(buffer);

        for (let message of messages) {
            printMsg(message, { port: port, address: address }, "Sending UDP");
        }

        if (typeof offset === "undefined") {
            offset = 0;
        }
        if (typeof length === "undefined") {
            length = buffer.length;
        }

        // update network statistics
        this.caMessagesSentInLastSecond = this.caMessagesSentInLastSecond + messages.length;
        this.packetsSentInLastSecond = this.packetsSentInLastSecond + 1;
        this.bytesSentInLastSecond = this.bytesSentInLastSecond + buffer.length;

        try {
            this.getSocket().send(buffer, offset, length, port, address, (error: Error | null) => {
                if (error !== null) {
                    // do nothing
                    GlobalMethods.errorLog(`Error occured when sending UDP message to ${address}:${port}. ${error}`);
                }
            });
        } catch (e) {
            GlobalMethods.errorLog(`Failed to send UDP message to ${address}:${port}. ${e}`);
        }
    };

    /**
     * Invoked when there is an error on socket.
     * 
     * This error is non-recoverable, we should quit the CA client (Context.destroyHard()).
     */
    handleDgramSocketError = (e: any) => {
        if (this.getState() === UDPTransportState.NOT_INITIALIZED) {
            // normal case, continue
        } else if (this.getState() === UDPTransportState.INITIALIZING) {
            // normal case, continue
        } else if (this.getState() === UDPTransportState.INITIALIZED) {
            // normal case, continue
        } else if (this.getState() === UDPTransportState.FAILED) {
            // alreayd failed, do nothing
            return;
        } else if (this.getState() === UDPTransportState.DESTROYED) {
            // already destroyed, do nothing
            return;
        } else {
            // unknown state, return
            return;
        }
        this.setState(UDPTransportState.FAILED);

        if (this.getContext().getState() === Context_STATES.NOT_INITIALIZED) {
            // normal case, continue
        } else if (this.getContext().getState() === Context_STATES.INITIALIZING) {
            // normal case, continue
        } else if (this.getContext().getState() === Context_STATES.INITIALIZED) {
            // normal case, continue
        } else if (this.getContext().getState() === Context_STATES.FAILED) {
            // already FAILED, no need to continue
            return;
        } else if (this.getContext().getState() === Context_STATES.DESTROYED) {
            // already DESTROYED, no need to continue
            return;
        } else if (this.getContext().getState() === Context_STATES.INITIALIZING) {
            // normal case, continue
        }
        this.getContext().setState(Context_STATES.FAILED);

        this.getContext().destroyHard();
        GlobalMethods.errorLog(`UDPTransport socket error or closed. ${e}.`, "This is non-recoverable, quit runnign this CA client");

    }

    // --------------------------- ca repeater ----------------------

    /**
     * Try to register to the CA repeater by periodically sending CA_REPEATER_REGISTER to 127.0.0.1:5065
     * It ends when we receive the CA_REPEATER_CONFIRM message.
     * 
     * (1) prepare the beacon registration message
     * 
     * (2) send out the first beacon registration message immediately
     * 
     * (3) send the beacon registration message every second until CARepeater replies
     * 
     * (4) wait for the CARepeater reply
     * 
     * (5) clear interval for beacon registration message
     */
    registerToCARepeater = async () => {

        // (1)
        let repeaterPort = this.getContext().getEnv("EPICS_CA_REPEATER_PORT");
        if (typeof repeaterPort !== "number") {
            repeaterPort = 5065;
        }

        const repeaterAddressInt = 0x7f000001; // 127.0.0.1
        const repeaterAddress = "127.0.0.1";

        let msg: Buffer = generateCAHeader(
            CA_COMMANDS.CA_REPEATER_REGISTER, //0x18
            0, // reserved
            0, // reserved
            0, // reserved
            0, // reserved
            repeaterAddressInt,
        ); // 127.0.0.1

        // (2)
        this.send(msg, repeaterPort, repeaterAddress);

        // (3)
        let period = this.getContext().getEnv("EPICS_CA_REPEATER_REGISTER_TIMEOUT");
        if (typeof period !== "number") {
            period = 1;
        }
        this.intervals.addInterval("register_to_CA_repeater",
            period, // unit second
            this.send,
            [
                msg,
                repeaterPort,
                repeaterAddress,
            ]);
        this.intervals.startInterval("register_to_CA_repeater");

        // (4)
        try {
            // resolved upon receiving CA_REPEATER_CONFIRM (0x11) from CA Repeater
            // this Promise is sololy for clearing the "register_to_CA_repeater" interval
            this.getPromises().appendPromise("CA_REPEATER_CONFIRM");
            const promiseObj = this.getPromises().getPromise("CA_REPEATER_CONFIRM")
            await promiseObj;
        } catch (e) {
            GlobalMethods.errorLog(`Failed to register to CA Repeater. ${e}`);
        }

        // (5)
        this.intervals.clearInterval("register_to_CA_repeater");
    };

    // ------------------- broadcast: CA --------------------------------

    sendToCaBroadcastAddresses = (buffer: Buffer, offset: number, length: number) => {
        if (this.getState() !== UDPTransportState.INITIALIZED) {
            return;
        }
        try {
            for (let broadcastAddress of this.getCaBroadcastAddresses()) {
                let port = broadcastAddress[0];
                let address = broadcastAddress[1];
                this.send(buffer, port, address, offset, length);
            }
        } catch (e) {
            GlobalMethods.errorLog(e);
        }
    };

    private getCaAutoBroadcastAddresses = (): [number, string][] => {
        const port: number = this.getContext().getEnv("EPICS_CA_SERVER_PORT") as number;
        let broadcastAddresses: [number, string][] = [];
        const netInterfaces = networkInterfaces();

        for (let name in netInterfaces) {
            if (netInterfaces[name] !== undefined) {
                netInterfaces[name]?.forEach((netInterface) => {
                    // for (let netInterface of netInterfaces[name]) {
                    // a real (non-zero MAC) interface and an IPv4 address
                    if (parseInt(netInterface.mac.replace(":", ""), 16) !== 0 && isIPaddr(netInterface.address)) {
                        let addressSplitted: string[] = netInterface.address.split(".");
                        let netmaskSplitted: string[] = netInterface.netmask.split(".");
                        let broadcastAddress = addressSplitted.map((e: string, i: number) => (~netmaskSplitted[i] & 0xff) | parseInt(e)).join(".");

                        let broadcastAddressExist = false;
                        for (let element of broadcastAddresses) {
                            if (element[0] === port && element[1] === broadcastAddress) {
                                broadcastAddressExist = true;
                            }
                        }
                        if (!broadcastAddressExist) {
                            broadcastAddresses.push([port, broadcastAddress]);
                        }
                    }
                });
            }
        }
        if (broadcastAddresses.length === 0) {
            broadcastAddresses.push([port, "255.255.255.255"]);
        }
        return broadcastAddresses;
    }


    // this.broadcastAddresses comes from
    // (1) EPICS_CA_ADDR_LIST
    // (2) this computer's broadcast address, if the EPICS_CA_AUTO_ADDR_LIST is YES (default).
    // (3) if the port is not explicitly defined in EPICS_CA_ADDR_LIST, these addresses will use EPICS_CA_SERVER_PORT (default 5064)

    private updateCaBroadcastAddresses = () => {
        for (let address of this.getContext().getEnv("EPICS_CA_ADDR_LIST") as string[]) {
            let port: number = this.getContext().getEnv("EPICS_CA_SERVER_PORT") as number; // default 5064
            let ip = address.split(":")[0];
            if (address.split(":").length === 2) {
                port = parseInt(address.split(":")[1]);
            }
            this.getCaBroadcastAddresses().push([port, ip]);
        }

        let autoAddresses: [number, string][] = [];
        if ((this.getContext().getEnv("EPICS_CA_AUTO_ADDR_LIST") as string).toUpperCase() === "YES") {
            autoAddresses = this.getCaAutoBroadcastAddresses();
        }
        this.setCaBroadcastAddresses([...this.getCaBroadcastAddresses(), ...autoAddresses]);

        // remove duplicated addresses
        let tmp = [];
        for (let ii of this.getCaBroadcastAddresses()) {
            tmp.push(ii[1] + ":" + ii[0].toString());
        }
        let tmp1 = Array.from(new Set(tmp));
        let tmp2: [number, string][] = [];
        for (let ii of tmp1) {
            tmp2.push([parseInt(ii.split(":")[1]), ii.split(":")[0]]);
        }
        this.setCaBroadcastAddresses(tmp2);
    }

    // ------------------- broadcast: PVA --------------------------------

    sendToPvaBroadcastAddresses = (buffer: Buffer, offset: number, length: number) => {
        if (this.getState() !== UDPTransportState.INITIALIZED) {
            return;
        }
        try {
            for (let broadcastAddress of this.getPvaBroadcastAddresses()) {
                let port = broadcastAddress[0];
                let address = broadcastAddress[1];
                this.send(buffer, port, address, offset, length);
            }
        } catch (e) {
            GlobalMethods.errorLog(e);
        }
    };

    private getPvaAutoBroadcastAddresses = (): [number, string][] => {
        const port: number = this.getContext().getEnv("EPICS_PVA_BROADCAST_PORT") as number;
        let broadcastAddresses: [number, string][] = [];
        const netInterfaces = networkInterfaces();

        for (let name in netInterfaces) {
            if (netInterfaces[name] !== undefined) {
                netInterfaces[name]?.forEach((netInterface) => {
                    // for (let netInterface of netInterfaces[name]) {
                    // a real (non-zero MAC) interface and an IPv4 address
                    if (parseInt(netInterface.mac.replace(":", ""), 16) !== 0 && isIPaddr(netInterface.address)) {
                        let addressSplitted: string[] = netInterface.address.split(".");
                        let netmaskSplitted: string[] = netInterface.netmask.split(".");
                        let broadcastAddress = addressSplitted.map((e: string, i: number) => (~netmaskSplitted[i] & 0xff) | parseInt(e)).join(".");

                        let broadcastAddressExist = false;
                        for (let element of broadcastAddresses) {
                            if (element[0] === port && element[1] === broadcastAddress) {
                                broadcastAddressExist = true;
                            }
                        }
                        if (!broadcastAddressExist) {
                            broadcastAddresses.push([port, broadcastAddress]);
                        }
                    }
                });
            }
        }
        if (broadcastAddresses.length === 0) {
            broadcastAddresses.push([port, "255.255.255.255"]);
        }
        return broadcastAddresses;
    }


    // this.broadcastAddresses comes from
    // (1) EPICS_CA_ADDR_LIST
    // (2) this computer's broadcast address, if the EPICS_CA_AUTO_ADDR_LIST is YES (default).
    // (3) if the port is not explicitly defined in EPICS_CA_ADDR_LIST, these addresses will use EPICS_CA_SERVER_PORT (default 5064)
    private updatePvaBroadcastAddresses = () => {
        for (let address of this.getContext().getEnv("EPICS_PVA_ADDR_LIST") as string[]) {
            let port: number = this.getContext().getEnv("EPICS_PVA_BROADCAST_PORT") as number; // default 5076
            let ip = address.split(":")[0];
            if (address.split(":").length === 2) {
                port = parseInt(address.split(":")[1]);
            }
            this.getPvaBroadcastAddresses().push([port, ip]);
        }

        let autoAddresses: [number, string][] = [];
        if ((this.getContext().getEnv("EPICS_PVA_AUTO_ADDR_LIST") as string).toUpperCase() === "YES") {
            autoAddresses = this.getPvaAutoBroadcastAddresses();
        }
        this.setPvaBroadcastAddresses([...this.getPvaBroadcastAddresses(), ...autoAddresses]);

        // remove duplicated addresses
        let tmp = [];
        for (let ii of this.getPvaBroadcastAddresses()) {
            tmp.push(ii[1] + ":" + ii[0].toString());
        }
        let tmp1 = Array.from(new Set(tmp));
        let tmp2: [number, string][] = [];
        for (let ii of tmp1) {
            tmp2.push([parseInt(ii.split(":")[1]), ii.split(":")[0]]);
        }
        this.setPvaBroadcastAddresses(tmp2);
    }

    // ---------------------- search PV -----------------------------

    /**
     * Periodically send out CA_PROTO_SEARCH and PVA_PROTO_SEARCH_REQUEST messages for all unresolved
     * CA and PVA channels.
     * 
     * The search request are combined into a few UDP packets.
     * 
     * Each CA search message always starts with CA_PROTO_VERSION.
     * 
     * It is invoked after the UDP socket binds to a port.
     */
    startToSearchBulkPVs = () => {
        this.intervals.addInterval(
            "CA_PVA_PROTO_SEARCH_bulk",
            // for now we CA and PVA use the same min search period
            (this.getContext().getEnv("EPICS_CA_MIN_SEARCH_PERIOD") as number), // default 0.1 s
            () => {
                // send out CA name search messages
                const caMessages = this.generate_CA_PROTO_SEARCH_bulk_msg();
                for (const message of caMessages) {
                    this.sendToCaBroadcastAddresses(message, 0, message.length);
                }
                // send out PVA name search messages
                const pvaMessages = this.generate_PVA_PROTO_SEARCH_REQUEST_bulk_msg();
                for (const message of pvaMessages) {
                    this.sendToPvaBroadcastAddresses(message, 0, message.length);
                    console.log("send out PVA UDP");
                    console.dir(message.toString("hex"), { maxArrayLength: null })
                }
            },
            []
        );
        this.intervals.startInterval("CA_PVA_PROTO_SEARCH_bulk");
    };

    /**
     * Generate CA_PROTO_SEARCH messages for all unresolved CA channels
     */
    private generate_CA_PROTO_SEARCH_bulk_msg = (): Buffer[] => {
        const context = this.getContext();

        // create CA_PROTO_VERSION message
        let serverSchedulingPriority = this.getContext().getEnv("EPICS_CA_SCHEDULING_PRIORITY_DEFAULT");
        if (typeof serverSchedulingPriority !== "number") {
            serverSchedulingPriority = 1;
        }
        const CA_PROTO_VERSION_msg = generatePvaHeader(
            PVA_COMMANDS.PVA_PROTO_SEARCH_REQUEST,
            PVA_MESSAGE_TYPE.APPLICATION,
            PVA_MESSAGE_SEGMENT_TYPE.NOT_SEGMENT,
        );

        // always starts with CA_PROTO_VERSION message
        CA_PROTO_VERSION_msg.copy(this.CA_PROTO_SEARCH_bulk_msg)

        let index = CA_PROTO_VERSION_msg.length;
        const result: Buffer[] = [];

        for (let pvName in context.getUnresolvedChannelsByName()) {
            const channel = context.getUnresolvedChannelsByName()[pvName];
            // if we want to search this channel at this cycle
            const doSearchPV = channel.doSearchPV() && channel.getProtocol() === "ca";
            if (doSearchPV) {
                const CA_PROTO_SEARCH_msg = channel.get_CA_PROTO_SEARCH_msg();
                // msg is full
                if (index + CA_PROTO_SEARCH_msg.length >= this.CA_PROTO_SEARCH_bulk_msg.length) {
                    // create a hard copy buffer, otherwise the dgram may send the same contents
                    const tmpBuffer = Buffer.alloc(index);
                    this.CA_PROTO_SEARCH_bulk_msg.copy(tmpBuffer);
                    result.push(tmpBuffer);
                    // clear msg
                    index = CA_PROTO_VERSION_msg.length;
                    this.CA_PROTO_SEARCH_bulk_msg.fill(0, index);
                }
                CA_PROTO_SEARCH_msg.copy(this.CA_PROTO_SEARCH_bulk_msg, index);
                index = index + CA_PROTO_SEARCH_msg.length;
            }
        }
        if (index > CA_PROTO_VERSION_msg.length) {
            const tmpBuffer = Buffer.alloc(index);
            this.CA_PROTO_SEARCH_bulk_msg.copy(tmpBuffer);
            result.push(tmpBuffer);
        }

        return result;
    };


    /**
     * Generate PVA_PROTO_SEARCH_REQUEST messages for all unresolved PVA channels
     */
    private generate_PVA_PROTO_SEARCH_REQUEST_bulk_msg = (): Buffer[] => {

        const result: Buffer[] = [];

        const context = this.getContext();

        // create PVA_PROTO_SEARCH_REQUEST message
        // the payload size is not determined yet
        const headerBuffer = generatePvaHeader(
            PVA_COMMANDS.PVA_PROTO_SEARCH_REQUEST,
            PVA_MESSAGE_TYPE.APPLICATION,
            PVA_MESSAGE_SEGMENT_TYPE.NOT_SEGMENT
        );

        const type_searchRequest = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "searchRequest",
            fields: {
                searchSequenceID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                flags: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
                reserved: { typeIndex: typeIndexEnum.integer_fixedSizeArray_unsignedByte, size: 3 },
                responseAddress: { typeIndex: typeIndexEnum.integer_fixedSizeArray_unsignedByte, size: 16 },
                responsePort: { typeIndex: typeIndexEnum.integer_scalar_unsignedShort },
                protocols: { typeIndex: typeIndexEnum.string_variableSizeArray },
                channels: {
                    typeIndex: typeIndexEnum.complex_variableSizeArray_structure,
                    sizeType: SIZE_TYPE.unsigned_short, // size is encoded as short, not "size"
                    name: "channel",
                    fields: {
                        searchInstanceID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                        channelName: { typeIndex: typeIndexEnum.string_scalar }
                    }
                }
            }
        }

        const channelsArray: Record<string, any>[][] = [];

        let channels: Record<string, any>[] = [];
        let bufferSize = 8 + 4 + 4 + 16 + 2 + 4; // fixed part
        for (let pvName in context.getUnresolvedChannelsByName()) {
            const channel = context.getUnresolvedChannelsByName()[pvName];
            // if we want to search this channel at this cycle
            const doSearchPV = channel.doSearchPV() && channel.getProtocol() === "pva";
            if (doSearchPV) {
                const expectedBufferSize = bufferSize + channels.length * (pvName.length + 5);
                if (expectedBufferSize > this.CA_PROTO_SEARCH_bulk_msg.length) {
                    channelsArray.push(channels);
                    channels = [];
                    bufferSize = 8 + 4 + 4 + 16 + 2 + 4;
                }
                channels.push({
                    searchInstanceID: channel.getChannelClientID(),
                    channelName: pvName,
                })
                bufferSize = bufferSize + channels.length * (pvName.length + 5);
            }
        }
        if (channels.length > 0) {
            channelsArray.push(channels);
        }

        for (const channels of channelsArray) {
            // search sequence ID
            this.pvaChannelSearchSequenceId++;

            const data = {
                searchSequenceID: this.pvaChannelSearchSequenceId,
                flags: 0, // do not reply if not exist, send as broadcast
                reserved: [0, 0, 0], // must be 3
                responseAddress: ipv4ToIpv6HexArray(this.getLocalAddress()), // should be 0.0.0.0
                responsePort: this.getLocalPort(),
                protocols: ["tcp"],
                channels: channels,
            };

            try {
                const payloadBuffer = encodeData(type_searchRequest, data, PVA_ENDIAN);
                setPayloadSizeInPvaHeader(headerBuffer, payloadBuffer.length);

                const buffer = Buffer.concat([headerBuffer, payloadBuffer]);
                
                result.push(buffer);
            } catch (e) {
                GlobalMethods.errorLog(e);
            }
        }
        return result;
    };


    // ----------------- destroy ------------------------------------

    /**
     * Destroy the UDPTransport. 
     * 
     * There is no such destroySoft() in here, the UDPTransport is part of Context, it is destroyed only when
     * Context is destroyed
     * 
     * (1) set state
     * 
     * (1) stop all Intervals
     * 
     * (2) close UDP socket
     * 
     * (3) destroy all beacons
     * 
     * (4) destroy all promises
     */
    destroyHard = () => {

        // (1)
        if (this.getState() === UDPTransportState.DESTROYED) {
            // already destroyed or being destroyed, no need to proceed
            return;
        } else {
            // normal case, continue
        }
        GlobalMethods.infoLog(`Destroying UDPTransport ${this.localAddress}:${this.localPort}`);
        this.setState(UDPTransportState.DESTROYED);

        // (2)
        this.intervals.clearAllIntervals();

        // (3)
        try {
            this.getSocket().close();
        } catch (e) {
        }
        GlobalMethods.infoLog(`UDP transport closed.`);

        // (4)
        for (let beaconKey in this.beacons) {
            const beacon = this.beacons[beaconKey];
            beacon.destroy();
            // remove this object from Context.beacons
            // we do it here to remove Beacon's dependency of Context
            delete this.beacons[beacon.getBeaconKey()];
        }

        // (5)
        this.getPromises().rejectAllPromises("UDP transport is being destroyed");
    };


    // -------------------- tools -----------------------------------

    /**
     * Check if a port is bound to UDP.
     * 
     * It is done by trying to bind this port using reuseAddr = false option. 
     * 
     * @returns {boolean} true if the port is already bound, false if the port is not bound to any process.
     */
    static portIsBoundInUDP = async (port: number): Promise<boolean> => {
        let resolveFunc: any;
        const promise = new Promise<boolean>((resolve, reject) => {
            resolveFunc = resolve;
        })
        const socket = udp.createSocket({
            type: "udp4",
            reuseAddr: false,
        });
        socket.on("error", () => {
            // this port is bound by udp
            resolveFunc(true);
        })
        socket.on("listening", () => {
            // this port is not bound by udp
            resolveFunc(false);
        })

        socket.bind({
            port: port,
            // bind to wildcard addresses
        });
        try {
            const result = await promise;
            try {
                socket.close();
            } catch (e) {
                GlobalMethods.errorLog(`socket is already closed`);
            }
            return result;
        } catch (e) {
            try {
                socket.close();
            } catch (e) {
                GlobalMethods.errorLog(`socket is already closed`);
            }
            return true;
        }
    }

    // --------------------- getters --------------------------------

    getContext = () => {
        return this.context;
    }

    getState = () => {
        return this.state;
    }

    setState = (newState: UDPTransportState) => {
        this.state = newState;
    }

    getSocket = () => {
        return this.socket;
    }

    getLocalPort = () => {
        return this.localPort;
    }
    getLocalAddress = () => {
        return this.localAddress;
    }

    setLocalPort = (newPort: number) => {
        this.localPort = newPort;
    }

    setLocalAddress = (newAddress: string) => {
        if (isIPaddr(newAddress)) {
            this.localAddress = newAddress;
        } else {
            GlobalMethods.errorLog("Failed to set the new address to UDPTransport:", newAddress);
        }
    }

    getIntervals = () => {
        return this.intervals;
    }

    getBeacons = () => {
        return this.beacons;
    }

    getBeacon = (beaconKey: string): Beacon | undefined => {
        return this.getBeacons()[beaconKey];
    }

    getPromises = () => {
        return this.promises;
    }

    public getCaBroadcastAddresses = () => {
        return this.caBroadcastAddresses;
    };

    setCaBroadcastAddresses = (newAddresses: [number, string][]) => {
        this.caBroadcastAddresses = newAddresses;
    }

    public getPvaBroadcastAddresses = () => {
        return this.pvaBroadcastAddresses;
    };

    setPvaBroadcastAddresses = (newAddresses: [number, string][]) => {
        this.pvaBroadcastAddresses = newAddresses;
    }

    getNetworkStats = () => {
        return this.networkStats;
    }

    getPvaBeaconSocket = () => {
        return this.pvaBeaconSocket;
    }

    /** 
     * If a UDP message from PVA server
     */
    private isPvaMessage = (msg: Buffer, offset: number) => {
        const command = msg.readUInt8(offset);
        if (command === 0xca) {
            return true;
        } else {
            return false;
        }
    }
}

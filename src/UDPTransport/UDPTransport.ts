import * as udp from "dgram";
import { networkInterfaces } from "os";
import { Buffer } from "buffer";

import { ipInt2String, ipString2Int, isIPaddr } from "../Global/GlobalMethods";
import { printMsg } from "../Global/GlobalMethods";
import { CA_MINOR_PROTOCOL_REVISION, CA_MSG_HEADER_OFFSETS, CA_SERVER_PORT } from "../Global/Constants";
import { CA_COMMANDS } from "../Global/Constants";
import { Context } from "../Context/Context";
import { generateCAHeader, GlobalMethods, splitMessage } from "../Global/GlobalMethods";


import { Intervals } from "../Intervals/Intervals";
import { Beacon } from "../Beacon/Beacon";
import { Promises } from "../Promises/Promises";

export enum UDPTransportState {
    NOT_INITIALIZED, // initial state
    INITIALIZING, // before socket binds to a port
    INITIALIZED, // socket successfully bound to a port
    FAILED, // error occurs, unrecoverable
    DESTROYED, // destroyed with Context
}

export class UDPTransport {
    private socket: udp.Socket;
    private context: Context;
    private broadcastAddresses: [number, string][];
    private localPort: number;
    private localAddress: string;
    private intervals: Intervals;
    private promises: Promises;
    private state: UDPTransportState;
    private CA_PROTO_SEARCH_bulk_msg: Buffer;
    private beacons: Record<string, Beacon> = {};


    constructor(context: Context) {
        this.context = context;
        // create the socket but do not bind yet
        this.socket = udp.createSocket({ type: "udp4", reuseAddr: true }); // reuseAddr = true
        this.broadcastAddresses = [];
        this.updateBroadcastAddresses();
        this.localAddress = "";
        this.localPort = -1;
        this.intervals = new Intervals();
        this.promises = new Promises();
        this.state = UDPTransportState.NOT_INITIALIZED;

        let maxUdpMessageSize = this.getContext().getEnv("EPICS_CA_MAX_UDP_BUFFER");
        if (typeof maxUdpMessageSize !== "number") {
            maxUdpMessageSize = 1024;
        }
        this.CA_PROTO_SEARCH_bulk_msg = Buffer.alloc(maxUdpMessageSize);
    }

    // ---------------------- message handlers ----------------------

    messageHandler = async (msg: Buffer, info: Record<string, any>) => {
        // a packet may contain 1 or more commands
        const { messages, residualMessage } = splitMessage(msg);
        for (let message of messages) {
            printMsg(message, info, "Received UDP");
        }

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
                await this.handle_CA_PROTO_SEARCH(message, info);
            } else if (command === CA_COMMANDS.CA_PROTO_NOT_FOUND) {
                // 0x0e
                // todo: what should be done?
            }
        }
    };

    // handle CA_PROTO_SEARCH (0x06) reply message
    private handle_CA_PROTO_SEARCH = async (message: Buffer, info: Record<string, any>) => {
        const serverTcpPort: number = message.readUInt16BE(CA_MSG_HEADER_OFFSETS.dataType);
        const serverAddress: string = info.address;
        const channelClientID: number = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter2);

        // if channel is not resolved yet
        if (this.getContext().getUnresolvedChannelsByClientID()[channelClientID.toString()] !== undefined) {
            const channel = this.getContext().getUnresolvedChannelsByClientID()[channelClientID.toString()];
            // lift the blocking of Channel.createTCP(), next step is to create the TCP based on
            // the info received in this UDP packet
            channel.promises.resolve("CA_PROTO_SEARCH", [serverAddress, serverTcpPort]);
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
        // beacon anomaly
        // this.context.processBeacon(message, info);
        let serverTcpPort = message.readUInt16BE(CA_MSG_HEADER_OFFSETS.dataCount);
        let serverAddressInt = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter2);
        let serverAddress = ipInt2String(serverAddressInt);
        let beaconID = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter1);
        let serverCaVersion = message.readUInt16BE(CA_MSG_HEADER_OFFSETS.dataType);

        const beaconKey = Beacon.generateBeaconKey(serverTcpPort, serverAddress);

        if (!this.getBeacons()[beaconKey]) {
            const beaconAnomalyCallback = () => {
                GlobalMethods.errorLog("beaconAnomalyNotify fired: restart search() for unresolved channels");
                for (let pvName in this.getContext().getUnresolvedChannelsByName()) {
                    const unresolvedChannel = this.getContext().getUnresolvedChannelsByName()[pvName];
                    // speed up channel search rate
                    unresolvedChannel.reSearchAndConnect();
                }
            }
            this.getBeacons()[beaconKey] = new Beacon(serverTcpPort, serverAddress, beaconAnomalyCallback, serverCaVersion);
        }

        const beacon = this.getBeacons()[beaconKey];
        if (beacon === undefined) {
            return;
        }
        const networkChanged = beacon.updatePeriod(beaconID);
        // todo: test this updatePeriod function
        if (networkChanged === true) {
            const affectedTcpTransports = this.getContext().getTcpTransports().getTCPTransportsByAddressAndPort(beaconKey);
            for (let affectedTcpTransport of affectedTcpTransports) {
                affectedTcpTransport.destroySoft();
            }
        }
        // From CA protocol:
        // "Clients wishing to detect new servers should maintain a list of all servers along with
        // the last BeaconID received, and the reception time. Servers SHOULD be removed from this
        // list when no Beacon is received for some time (two beacon periods is RECOMMENDED)."
        // Shall we implement it? What is it used for? The TCPTransoprt already has a mechanism to manage
        // the expired server.
    }

    // registration confirmation message from CA Repeater, 0x11
    private handle_CA_REPEATER_CONFIRM = (message: Buffer, info: Record<string, any>) => {
        GlobalMethods.infoLog("UDPTransport registered to CARepeater");
        // lift the await blocking in Context.initialize()
        this.getPromises().resolvePromise("CA_REPEATER_CONFIRM", "");
    }

    // ------------------------- methods ----------------------------

    send = (buffer: Buffer, port: number, address: string, offset?: number, length?: number) => {
        const { messages, residualMessage } = splitMessage(buffer);

        for (let message of messages) {
            printMsg(message, { port: port, address: address }, "Sending UDP");
        }

        if (typeof offset === "undefined") {
            offset = 0;
        }
        if (typeof length === "undefined") {
            length = buffer.length;
        }
        try {
            this.getSocket().send(buffer, offset, length, port, address, (error: Error | null) => {
                if (error !== null) {
                    //todo: what to do?
                    GlobalMethods.errorLog(`Error occured when sending UDP message to ${address}:${port}. ${error}`);
                }
            });
        } catch (e) {
            GlobalMethods.errorLog(`Failed to send UDP message to ${address}:${port}. ${e}`);
        }
    };

    // --------------------------- ca repeater ----------------------

    /**
     * Try to register to the CA repeater by periodically sending CA_REPEATER_REGISTER to 127.0.0.1:5065
     * It ends when we receive the CA_REPEATER_CONFIRM message.
     */
    registerToCARepeater = async () => {
        let repeaterPort = this.getContext().getEnv("EPICS_CA_REPEATER_PORT");
        if (typeof repeaterPort !== "number") {
            repeaterPort = 5065;
        }
        // 127.0.0.1
        const repeaterAddressInt = 0x7f000001;
        const repeaterAddress = "127.0.0.1";

        let msg: Buffer = generateCAHeader(
            CA_COMMANDS.CA_REPEATER_REGISTER, //0x18
            0, // reserved
            0, // reserved
            0, // reserved
            0, // reserved
            repeaterAddressInt,
        ); // 127.0.0.1

        // send immediately
        this.send(msg, repeaterPort, repeaterAddress);
        // send every second until CARepeater replies
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

        try {
            // resolved upon receiving CA_REPEATER_CONFIRM (0x11) from CA Repeater
            // this Promise is sololy for clearing the "register_to_CA_repeater" interval
            this.getPromises().appendPromise("CA_REPEATER_CONFIRM");
            const promiseObj = this.getPromises().getPromise("CA_REPEATER_CONFIRM")
            await promiseObj;
        } catch (e) {
            let logFunc = GlobalMethods.errorLog;
            if (typeof e === "string") {
                if (e.includes("all promises are rejected")) {
                    logFunc = GlobalMethods.infoLog;
                }
            }
            logFunc(`Failed to register to CA Repeater. ${e}`);
        }
        this.intervals.clearInterval("register_to_CA_repeater");
    };

    // ------------------- broadcast --------------------------------

    sendToBroadcastAddresses = (buffer: Buffer, offset: number, length: number) => {
        if (this.getState() !== UDPTransportState.INITIALIZED) {
            return;
        }
        try {
            for (let broadcastAddress of this.getBroadcastAddresses()) {
                let port = broadcastAddress[0];
                let address = broadcastAddress[1];
                this.send(buffer, port, address, offset, length);
            }
        } catch (e) {
            GlobalMethods.errorLog(e);
        }
    };

    private getAutoBroadcastAddresses = (): [number, string][] => {
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

    private updateBroadcastAddresses = () => {
        for (let address of this.getContext().getEnv("EPICS_CA_ADDR_LIST") as string[]) {
            let port: number = this.getContext().getEnv("EPICS_CA_SERVER_PORT") as number; // default 5064
            let ip = address.split(":")[0];
            if (address.split(":").length === 2) {
                port = parseInt(address.split(":")[1]);
            }
            this.getBroadcastAddresses().push([port, ip]);
        }

        let autoAddresses: [number, string][] = [];
        if ((this.getContext().getEnv("EPICS_CA_AUTO_ADDR_LIST") as string).toUpperCase() === "YES") {
            autoAddresses = this.getAutoBroadcastAddresses();
        }
        this.setBroadcastAddresses([...this.getBroadcastAddresses(), ...autoAddresses]);

        // remove duplicated addresses
        let tmp = [];
        for (let ii of this.getBroadcastAddresses()) {
            tmp.push(ii[1] + ":" + ii[0].toString());
        }
        let tmp1 = Array.from(new Set(tmp));
        let tmp2: [number, string][] = [];
        for (let ii of tmp1) {
            tmp2.push([parseInt(ii.split(":")[1]), ii.split(":")[0]]);
        }
        this.setBroadcastAddresses(tmp2);
    }

    // ---------------------- search PV -----------------------------

    /**
     * Start the interval to search all unresolved channels.
     * 
     * It is invoked after the UDP socket binds to a port.
     */
    startToSearchBulkPVs = () => {
        this.intervals.addInterval(
            "CA_PROTO_SEARCH_bulk",
            (this.getContext().getEnv("EPICS_CA_MIN_SEARCH_PERIOD") as number) * 1000, // default 0.1 s
            this.send_CA_PROTO_SEARCH_bulk_msg,
            []
        );
        this.intervals.startInterval("CA_PROTO_SEARCH_bulk");
    };

    /**
     * Periodically send out CA_PROTO_SEARCH messages for all unresolved channels.
     * The search request are combined into a few UDP packets, each starting with 
     * CA_PROTO_VERSION.
     * 
     */
    private send_CA_PROTO_SEARCH_bulk_msg = () => {
        const context = this.getContext();

        // create CA_PROTO_VERSION message
        let serverSchedulingPriority = this.getContext().getEnv("EPICS_CA_SCHEDULING_PRIORITY_DEFAULT");
        if (typeof serverSchedulingPriority !== "number") {
            serverSchedulingPriority = 1;
        }
        const CA_PROTO_VERSION_msg = generateCAHeader(
            CA_COMMANDS.CA_PROTO_VERSION, // 0x00
            0x00, // payload size
            serverSchedulingPriority, // desired priority
            CA_MINOR_PROTOCOL_REVISION,
            // in CA protocol specification, it must be 0. 
            // But practically seems like this is a counter of CA_PROTO_SEARCH
            // which increases by 1 each time this packet is sent out
            0x00,
            0x00
        );

        // always starts with CA_PROTO_VERSION message
        CA_PROTO_VERSION_msg.copy(this.CA_PROTO_SEARCH_bulk_msg)

        let index = CA_PROTO_VERSION_msg.length;

        for (let pvName in context.getUnresolvedChannelsByName()) {
            const channel = context.getUnresolvedChannelsByName()[pvName];
            // if we want to search this channel at this cycle
            const doSearchPV = channel.doSearchPV();
            if (doSearchPV) {
                const CA_PROTO_SEARCH_msg = channel.get_CA_PROTO_SEARCH_msg();
                // msg is full
                if (index + CA_PROTO_SEARCH_msg.length >= this.CA_PROTO_SEARCH_bulk_msg.length) {
                    // create a hard copy buffer, otherwise the dgram may send the same contents
                    const tmpBuffer = Buffer.from(this.CA_PROTO_SEARCH_bulk_msg);
                    this.sendToBroadcastAddresses(tmpBuffer, 0, index);
                    // clear msg
                    index = CA_PROTO_VERSION_msg.length;
                    this.CA_PROTO_SEARCH_bulk_msg.fill(0, index);
                }
                CA_PROTO_SEARCH_msg.copy(this.CA_PROTO_SEARCH_bulk_msg, index);
                index = index + CA_PROTO_SEARCH_msg.length;
            }
        }
        if (index > CA_PROTO_VERSION_msg.length) {
            const tmpBuffer = Buffer.from(this.CA_PROTO_SEARCH_bulk_msg);
            this.sendToBroadcastAddresses(tmpBuffer, 0, index);
        }
    };

    // ----------------- destroy ------------------------------------

    // (1) stop all Intervals
    // (2) close UDP socket
    // (3) destroy all beacons
    // (4) destroy all promises
    // Note: there is no such destroySoft() in here, the UDPTransport is part of Context, it is destroyed only when
    //       Context is destroyed
    destroyHard = () => {
        this.setState(UDPTransportState.DESTROYED);
        GlobalMethods.infoLog(`Destroying UDPTransport ${this.localAddress}:${this.localPort}`);
        // (1)
        this.intervals.clearAllIntervals();
        // (2)
        this.closeSocket();
        GlobalMethods.infoLog(`UDP transport closed.`);
        // (3)
        for (let beaconKey in this.beacons) {
            const beacon = this.beacons[beaconKey];
            beacon.destroy();
            // remove this object from Context.beacons
            // we do it here to remove Beacon's dependency of Context
            delete this.beacons[beacon.getBeaconKey()];
        }
        // (4)
        this.getPromises().rejectAllPromises("UDP transport is being destroyed");
    };

    private closeSocket = async () => {
        try {
            await this.getSocket().close();
        } catch (e) { }
        GlobalMethods.infoLog(`UDP transport closed.`);
    }

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

    getPromises = () => {
        return this.promises;
    }

    public getBroadcastAddresses = () => {
        return this.broadcastAddresses;
    };

    setBroadcastAddresses = (newAddresses: [number, string][]) => {
        this.broadcastAddresses = newAddresses;
    }
}

import * as udp from "dgram";
import { Constants } from "./Constants";
import { Buffer } from "buffer";
import { networkInterfaces } from 'os';
import { Context } from './Context';
import { TCPTransport } from "./TCPTransport";
import { GlobalMethods } from "./GlobalMethods";
import { CARepeater } from "./CARepeater/CARepeater";
import { Beacon } from "./Beacon";
import { Channel } from "./Channel"
import { epicsEnv, ipInt2String, printMsg } from ".";
import { EventEmitter } from "events";

// UDPTransport is for
//  - talking to CA Repeater
//  - search PV names

export class UDPTransport {
    socket: udp.Socket;
    context: Context;
    receiveBuffer: Buffer;
    broadcastAddresses: [number, string][] = [];
    beaconAnomalyDetected = false;
    // beaconList: Beacon[];

    constructor(context: Context) {

        this.context = context;
        this.socket = udp.createSocket({ type: 'udp4', reuseAddr: true }); // reuseAddr = true
        this.receiveBuffer = Buffer.alloc(Constants.MAX_UDP_RECV); // 0xFFFF + 16 = 64 kB

        this.updateBroadcastAddresses();
        // this.beaconList = [];
    }
    // a message may contain 2 or more commands
    async messageHandler(msg: Buffer, info: Record<string, any>) {
        GlobalMethods.debugLog(`Received message ${msg.toString('hex')} from ${info.address}:${info.port}`);
        let messages: Buffer[] = [];
        let offset = 0;

        while (offset < msg.length) {
            let payloadSize = msg.readUInt16BE(offset + 2);
            let headerSize = 16;
            // extended header 
            if (payloadSize === 0xFFFF) {
                headerSize = 24;
                payloadSize = msg.readUInt32BE(offset + 16);
            }
            messages.push(msg.slice(offset, offset + headerSize + payloadSize));
            offset = offset + headerSize + payloadSize;
        }

        for (let message of messages) {
            let command = message.readUInt16BE(0);
            if (command === 0x00) {
                // do nothing
            }
            // CA_PROTO_RSRV_IS_UP, beacon signal
            else if (command === 0x0d) {

                // add to beaconList
                let port = message.readUInt16BE(6);
                let addressInt = message.readUInt32BE(12);
                let address = ipInt2String(addressInt);
                let thisBeaconID = message.readUInt32BE(8);

                let beacon = this.context.beaconsByAddressPort[`${address}:${port}`];
                let beaconExists = false;
                if (beacon === undefined) {
                    beacon = new Beacon(this.context, message);
                    this.context.beaconsByAddressPort[`${address}:${port}`] = beacon;
                }
                else {
                    beaconExists = true;
                }

                // let beacon = new Beacon(this.context, message);
                // let beaconExists = false;
                // for (let existingBeacon of this.context.udpTransport.beaconList) {
                //     if (existingBeacon.port === port && existingBeacon.address === address) {
                //         beaconExists = true;
                //         beacon = existingBeacon;
                //         break;
                //     }
                // }
                // if (!beaconExists) {
                //     this.context.udpTransport.beaconList.push(beacon);
                // }


                let beaconAnomalyDetected = beacon.beaconAnomalyDetection(thisBeaconID);
                GlobalMethods.debugLog(`beaconAnomalyDetected = ${beaconAnomalyDetected}`);
                if (beaconAnomalyDetected) {

                    GlobalMethods.debugLog(`Beacon anomaly detected from ${info.address}:${info.port}`);
                    GlobalMethods.debugLog(`Restart search for unresolved ${this.context.unresolvedChannelList.length} channels`);

                    // remove this beacon from this.beaconList
                    // this.beaconList.filter(item => item !== beacon);
                    delete this.context.beaconsByAddressPort[`${address}:${port}`];

                    // restart all unresolved channel searches, just like Beacon.beaconAnomalyNotify()
                    for (let unresolvedChannel of this.context.unresolvedChannelList) {
                        // cancel current search() and start a new search()
                        clearTimeout(unresolvedChannel.searchSetTimeout);
                        await unresolvedChannel.search();
                        // unresolvedChannel.beaconAnomalyEmitter.emit("beaconAnomalyDetected");
                    }

                }
            }
            else if (command === 0x11) {
                GlobalMethods.debugLog("UDPTransport registered to CARepeater");
                this.context.registerToCARepeaterEvent.emit("success");
            }
            // CA_PROTO_SEARCH
            else if (command === 0x06) {
                let channelClientID: number = message.readUInt32BE(12);

                try {
                    let channel = this.context.channelsByChannelClientID[channelClientID.toString()];
                    GlobalMethods.debugLog(`Channel ${channel.name} found on ${info.address}:${info.port}.`);
                    // stop Channel.search()
                    clearTimeout(channel.searchSetTimeout);
                    // let Context.createChannel() proceed
                    channel.createChannelResolve0x06();

                    // set up TCPTransport
                    let port: number = message.readUInt16BE(4);
                    let address: string = info.address;

                    let tcpTransportExist: boolean;
                    let tcpTransport: TCPTransport;
                    if (this.context.tcpTransportsByAddressPort[`${address}:${port}`] !== undefined) {
                        tcpTransport = this.context.tcpTransportsByAddressPort[`${address}:${port}`];
                        tcpTransportExist = true;
                    }
                    else {
                        tcpTransport = new TCPTransport(this.context, port, address);
                        tcpTransportExist = false;
                    }

                    //todo improve it
                    // create a TCPTransport if there is not an existing one
                    // for (let existingTcpTransport of this.context.tcpTransportList) {
                    //     if (existingTcpTransport.serverAddress === address && existingTcpTransport.serverPort === port) {
                    //         tcpTransport = existingTcpTransport;
                    //         tcpTransportExist = true;
                    //         break;
                    //     }
                    // }

                    tcpTransport.socket.on("error", () => {
                        GlobalMethods.errorLog(`Error on tcpTransport for ${tcpTransport.serverAddress}:${tcpTransport.serverPort}`);
                        // do the same as "close" event
                        TCPTransport.removeTCPTransportAndReconnectChannels(tcpTransport);
                    });

                    tcpTransport.socket.on("data", (msg: Buffer) => {
                        tcpTransport.messageHandler(msg);
                    });

                    // emitted when remote TCP socket is closed gracefully, e.g. Ctrl+C
                    tcpTransport.socket.on("close", () => {
                        if (!tcpTransport.isDestroyed) {
                            GlobalMethods.errorLog(`TCP connection ${tcpTransport.serverAddress}:${tcpTransport.serverPort} closed.`);
                            TCPTransport.removeTCPTransportAndReconnectChannels(tcpTransport);
                        }
                    });

                    if (!tcpTransportExist) {
                        await tcpTransport.tryConnect();
                        this.context.tcpTransportsByAddressPort[`${address}:${port}`] = tcpTransport;
                        await tcpTransport.sendFirstFewMessages();
                        channel.tcpTransport = tcpTransport;
                    }

                    // send 0x12 (CA_PROTO_CREATE_CHAN) over TCP
                    let dataLength = (channel.name.length + 1) % 8 === 0 ? channel.length + 1 : Math.ceil((channel.name.length + 1) / 8) * 8;
                    let buffer0x12 = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE + dataLength);
                    Context.generateCAHeader(buffer0x12, 0, 0x12, dataLength, 0x00, 0x00, channel.channelClientID, 0x0d);
                    buffer0x12.write(channel.name, Constants.CA_MESSAGE_HEADER_SIZE);
                    GlobalMethods.debugLog(`Sending ${buffer0x12.toString("hex")} to ${tcpTransport.serverAddress}:${tcpTransport.serverPort}`);
                    await tcpTransport.socket.write(buffer0x12);

                } catch (e) {
                    GlobalMethods.errorLog(`Handle 0x06 message from ${info.address}:${info.port}`);
                }

            }
        }
    }


    async sendToBroadcastAddresses(buffer: Buffer, offset: number, length: number) {

        for (let broadcastAddress of this.broadcastAddresses) {
            let port = broadcastAddress[0];
            let address = broadcastAddress[1];
            GlobalMethods.debugLog(`Sending ${buffer.toString('hex').slice(0, Math.min(buffer.toString('hex').length, 100))} [${buffer.toString('hex').length - 100} more characters] to ${address}:${port}`);
            await this.socket.send(buffer, offset, length, port, address);
        }
    }

    async send(buffer: Buffer, port: number, address: string, offset?: number, length?: number) {
        printMsg(buffer, { port: port, address: address });
        // GlobalMethods.debugLog(`Sending ${buffer.toString('hex')} to ${address}:${port}`);
        if (typeof offset === "undefined") {
            offset = 0;
        }
        if (typeof length === "undefined") {
            length = buffer.length;
        }
        await this.socket.send(buffer, offset, length, port, address);
    }

    // send 0x18 command to 127.0.0.1:5065
    async registerToCARepeater() {

        let repeaterPort = epicsEnv["EPICS_CA_REPEATER_PORT"]; // 5065
        let repeaterAddress = '127.0.0.1';

        let msg: Buffer = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE);
        Context.generateCAHeader(msg, 0, Constants.CA_REPEATER_REGISTER, //0x18
            0, 0, 0, 0, GlobalMethods.ipString2Int(repeaterAddress));

        await this.send(msg, repeaterPort, repeaterAddress);

        // send every 1 second until CARepeater replies
        let tmp = setInterval(async () => {
            await this.send(msg, repeaterPort, repeaterAddress);
        }, 1000);

        this.context.registerToCARepeaterEvent.on("success", () => {
            clearInterval(tmp);
        });
    }


    getAutoBroadcastAddresses(): [number, string][] {
        const port: number = epicsEnv["EPICS_CA_SERVER_PORT"] as number;
        const isIPaddr = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/gi;
        let broadcastAddresses: [number, string][] = [];
        const netInterfaces = networkInterfaces();

        for (let name in netInterfaces) {
            if (netInterfaces[name] !== undefined) {
                netInterfaces[name]?.forEach((netInterface) => {

                    // for (let netInterface of netInterfaces[name]) {
                    // a real (non-zero MAC) interface and an IPv4 address
                    if (parseInt(netInterface.mac.replace(":", ""), 16) !== 0 && isIPaddr.test(netInterface.address)) {
                        let addressSplitted: string[] = netInterface.address.split('.');
                        let netmaskSplitted: string[] = netInterface.netmask.split('.');
                        let broadcastAddress = addressSplitted.map((e: string, i: number) => (~netmaskSplitted[i] & 0xFF) | parseInt(e)).join('.');

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
                })
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

    updateBroadcastAddresses() {
        for (let address of (epicsEnv["EPICS_CA_ADDR_LIST"] as string[])) { // EPICS_CA_ADDR_LIST
            let port: number = epicsEnv.EPICS_CA_SERVER_PORT as number; // default 5064
            let ip = address.split(":")[0];
            if (address.split(":").length === 2) {
                port = parseInt(address.split(":")[1]);
            }
            this.broadcastAddresses.push([port, ip]);
        }

        let autoAddresses: [number, string][] = [];
        if (epicsEnv["EPICS_CA_AUTO_ADDR_LIST"] === true) {
            autoAddresses = this.getAutoBroadcastAddresses();
        }
        this.broadcastAddresses = [...this.broadcastAddresses, ...autoAddresses];

        // remove duplicated addresses
        let tmp = [];
        for (let ii of this.broadcastAddresses) {
            tmp.push(ii[1] + ":" + ii[0].toString());
        }
        let tmp1 = Array.from(new Set(tmp));
        let tmp2: [number, string][] = [];
        for (let ii of tmp1) {
            tmp2.push([parseInt(ii.split(":")[1]), ii.split(":")[0]])
        }
        this.broadcastAddresses = tmp2;
    }
}


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
import { epicsEnv, ipInt2String, printMsg, epicsEnvCustom } from ".";
import { CA_MSG_HEADER_OFFSETS, CA_MSG_HEADER_SIZE, CA_EXT_MSG_HEADER_SIZE, CA_COMMANDS, isIPaddr } from ".";

export class UDPTransport {
    socket: udp.Socket;
    context: Context;
    broadcastAddresses: [number, string][];
    beaconAnomalyDetected: boolean;
    localPort: number;
    localAddress: string;
    registerToCARepeaterTimer: ReturnType<typeof setInterval> | null;

    constructor(context: Context) {
        this.context = context;
        this.socket = udp.createSocket({ type: 'udp4', reuseAddr: true }); // reuseAddr = true
        this.broadcastAddresses = [];
        this.updateBroadcastAddresses();
        this.registerToCARepeaterTimer = null;
        this.localAddress = "";
        this.localPort = -1;
        this.beaconAnomalyDetected = false;
    }

    // handle CA_PROTO_SEARCH (0x06) reply message
    private async handle_CA_PROTO_SEARCH(message: Buffer, info: Record<string, any>) {

        const serverTcpPort: number = message.readUInt16BE(CA_MSG_HEADER_OFFSETS.dataType);
        const serverAddress: string = info.address;
        const channelClientID: number = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter2);

        // the channel is already resolved
        let channel = this.context.resolvedChannelsByClientID[channelClientID.toString()];
        if (channel) {
            let tcpTransport = channel.tcpTransport;
            // channel is from the same server
            if (tcpTransport?.serverAddress === serverAddress && tcpTransport?.serverPort === serverTcpPort) {
                GlobalMethods.infoLog(`Channel ${channel.name} already resolved on ${serverAddress}:${serverTcpPort}`);
            }
            // channel has a different server
            else {
                GlobalMethods.errorLog(`Duplicated channel ${channel.name} on ${serverAddress}:${serverTcpPort}`);
            }
            return;
        }

        // if channel does not resolved yet
        channel = this.context.unresolvedChannelsByClientID[channelClientID.toString()];
        if (channel) {
            // lift the blocking of Channel.searchPV()
            channel.CA_PROTO_SEARCH_Resolve([serverAddress, serverTcpPort]);
        }
    }

    // CA server beacon, 0x0d
    private handle_CA_PROTO_RSRV_IS_UP(message: Buffer, info: Record<string, any>) {

        // Each beacon should associate with one or several TCPTransports
        // A TCPTransoprt is characterized by IP:port:(server scheduling priority)
        // if there is no TCP connection for this beacon, then this beacon is ignored

        // beacon anomaly
        this.context.processBeacon(message, info);

        // todo: should we keep it?
        // an empty function
        this.context.tcpTransports.processBeacon(message, info);

        // let port = message.readUInt16BE(CA_MSG_HEADER_OFFSETS.serverPort);
        // let addressInt = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter2);
        // let address = ipInt2String(addressInt);
        // let thisBeaconID = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter1);
        // let version = message.readUInt16BE(CA_MSG_HEADER_OFFSETS.dataType);

        // this.context.tcpTransports.processBeacon(port, address, thisBeaconID, version);
    }

    // registration confirmation message from CA Repeater, 0x11
    private handle_CA_REPEATER_CONFIRM(message: Buffer, info: Record<string, any>) {
        GlobalMethods.infoLog("UDPTransport registered to CARepeater");
        // lift the await blocking in Context.initialize()
        this.context.CA_REPEATER_CONFIRM_Resolve("");
    }

    async messageHandler(msg: Buffer, info: Record<string, any>) {
        // a packet may contain 1 or more commands
        const [messages, tmp] = GlobalMethods.splitMessage(msg);
        for (let message of messages) {
            printMsg(message, info, "Received UDP");
        }

        for (let message of messages) {
            let command = message.readUInt16BE(0);
            if (command === CA_COMMANDS.CA_PROTO_VERSION) { // 0x00
                // do nothing
            }
            else if (command === CA_COMMANDS.CA_PROTO_RSRV_IS_UP) { // 0x0d
                this.handle_CA_PROTO_RSRV_IS_UP(message, info);
            }
            else if (command === CA_COMMANDS.CA_REPEATER_CONFIRM) { // 0x11
                this.handle_CA_REPEATER_CONFIRM(message, info);
            }
            else if (command === CA_COMMANDS.CA_PROTO_SEARCH) { // 0x06
                await this.handle_CA_PROTO_SEARCH(message, info);
            }
            else if (command === CA_COMMANDS.CA_PROTO_NOT_FOUND) { // 0x0e
                // todo: what should be done?
            }
        }
    }

    // destroy the UDP transport, when Context wants to quit
    // does the following:
    //  (1) stop all Timers
    //  (2) close socket
    async destroy() {
        GlobalMethods.infoLog(`Destroying UDPTransport ${this.localAddress}:${this.localPort}`);
        // (1) stop all Timers
        if (this.registerToCARepeaterTimer) {
            clearInterval(this.registerToCARepeaterTimer);
        }
        // (2) close UDP socket
        await this.closeSocket();
        GlobalMethods.infoLog(`UDP transport closed.`);
    }

    private async closeSocket() {
        try {
            await this.socket.close();
        }
        catch (e) {
        }
        GlobalMethods.infoLog(`UDP transport closed.`);
    }

    async sendToBroadcastAddresses(buffer: Buffer, offset: number, length: number) {
        for (let broadcastAddress of this.broadcastAddresses) {
            let port = broadcastAddress[0];
            let address = broadcastAddress[1];
            await this.send(buffer, port, address, offset, length);
        }
    }

    async send(buffer: Buffer, port: number, address: string, offset?: number, length?: number) {
        const [messages, tmp] = GlobalMethods.splitMessage(buffer);

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
            await this.socket.send(buffer, offset, length, port, address);
        }
        catch (e) {
            GlobalMethods.errorLog(`Failed to send UDP message to ${address}:${port}. ${e}`);
        }
    }

    // send CA_REPEATER_REGISTER to 127.0.0.1:5065
    async registerToCARepeater() {

        let repeaterPort = epicsEnv["EPICS_CA_REPEATER_PORT"] ? epicsEnv["EPICS_CA_REPEATER_PORT"] : 5065;
        let repeaterAddress = '127.0.0.1';

        let msg: Buffer = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE);
        GlobalMethods.generateCAHeader(msg, 0,
            CA_COMMANDS.CA_REPEATER_REGISTER, //0x18
            0, // reserved
            0, // reserved
            0, // reserved
            0, // reserved
            GlobalMethods.ipString2Int(repeaterAddress)); // 127.0.0.1

        await this.send(msg, repeaterPort, repeaterAddress);

        // send every second until CARepeater replies
        this.registerToCARepeaterTimer = setInterval(async () => {
            await this.send(msg, repeaterPort, repeaterAddress);
        }, epicsEnvCustom.EPICS_CA_REPEATER_REGISTER_TIMEOUT * 1000);

        try {
            await this.context.CA_REPEATER_CONFIRM_Promise;
        }
        catch (e) {
            GlobalMethods.errorLog(`Failed to register to CA Repeater. ${e}`);
        }
        clearInterval(this.registerToCARepeaterTimer);
    }

    private getAutoBroadcastAddresses(): [number, string][] {
        const port: number = epicsEnv["EPICS_CA_SERVER_PORT"] as number;
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

    private updateBroadcastAddresses() {
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


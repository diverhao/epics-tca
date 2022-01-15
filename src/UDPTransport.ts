import * as udp from "dgram";
import { Constants } from "./Constants";
import { Buffer } from "buffer";
import { networkInterfaces } from 'os';
import { Context } from './Context';
import { TCPTransport } from "./TCPTransport";
import { GlobalMethods } from "./GlobalMethods";
import { CARepeater } from "./CARepeater";
import { Beacon } from "./Beacon";
import { Channel } from "./Channel"

export class UDPTransport {
    socket: udp.Socket;
    context: Context;
    receiveBuffer: Buffer;
    broadcastAddresses: [number, string][];
    // beaconList: Beacon[];

    constructor(context: Context) {

        this.context = context;
        // create a UDP socket, which will talk and listen to
        //  - CA Repeater: 127.0.0.1:5065
        //  - this.broadcastAddresses
        //    - current computer's broadcast address, e.g. 10.1.20.255:5064
        //    - computers in EPICS_CA_ADDR_LIST, e.g. 10.1.20.200:5064
        this.socket = udp.createSocket('udp4', true); // reuseAddr = true
        this.receiveBuffer = Buffer.alloc(Constants.MAX_UDP_RECV); // 0xFFFF + 16 = 64 kB

        // CA_SERVER_PORT = 5064, not 5065 repeaterPort
        if (context.autoAddressList === true) {
            this.broadcastAddresses = this.initBroadcastAddresses(context.serverPort);
        }
        else {
            this.broadcastAddresses = [];
        }
        // this.beaconList = [];
    }
    beaconAnomalyDetected = false;
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
                let address = CARepeater.ipInt2String(addressInt);
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
                GlobalMethods.debugLog("caRepeaterRegistered");
                this.context.caRepeaterRegistered = true;
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
                        //todo do the same as "close"
                    });

                    tcpTransport.socket.on("data", (msg: Buffer) => {
                        tcpTransport.messageHandler(msg);
                    });

                    // emitted when remote TCP socket is closed gracefully, e.g. Ctrl+C
                    tcpTransport.socket.on("close", () => {
                        GlobalMethods.errorLog(`TCP connection ${tcpTransport.serverAddress}:${tcpTransport.serverPort} closed.`);
                        TCPTransport.removeTCPTransportAndReconnectChannels(tcpTransport);
                    });

                    if (!tcpTransportExist) {
                        await tcpTransport.tryConnect();
                        this.context.tcpTransportsByAddressPort[`${address}:${port}`] = tcpTransport;
                        tcpTransport.sendFirstFewMessages();
                        channel.tcpTransport = tcpTransport;
                    }

                    // send 0x12 (CA_PROTO_CREATE_CHAN) over TCP
                    let dataLength = (channel.name.length + 1) % 8 === 0 ? channel.length + 1 : Math.ceil((channel.name.length + 1) / 8) * 8;
                    let buffer0x12 = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE + dataLength);
                    Context.generateCAHeader(buffer0x12, 0, 0x12, dataLength, 0x00, 0x00, channel.channelClientID, 0x0d);
                    buffer0x12.write(channel.name, Constants.CA_MESSAGE_HEADER_SIZE);
                    GlobalMethods.debugLog(`Sending ${buffer0x12.toString("hex")} to ${tcpTransport.serverAddress}:${tcpTransport.serverPort}`);
                    tcpTransport.socket.write(buffer0x12);

                } catch (e) {
                    GlobalMethods.errorLog(`Handle 0x06 message from ${info.address}:${info.port}`);
                }

            }
        }
    }

    // (1) obtain the all valid IP addresses and masks of current computer
    // (2) calulate the broadcast addresses
    // (3) add the broadcast addresses to array this.broadcastAddresses
    // e.g. it produces 10.1.20.255:5064 where 5064 is the CA_SERVER_PORT, and 10.1.20.255 is the 
    // broadcast address for 10.1.20.165/24, where 10.1.20.165 is the local computer's ip address
    initBroadcastAddresses(port: number) {
        const isIPaddr = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/gi;
        let broadcastAddresses: [number, string][] = [];
        const netInterfaces = networkInterfaces();

        for (let name in netInterfaces) {
            for (let netInterface of netInterfaces[name]) {
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
            }
        }
        if (broadcastAddresses.length === 0) {
            broadcastAddresses.push([port, "255.255.255.255"]);
        }
        return broadcastAddresses;
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
        GlobalMethods.debugLog(`Sending ${buffer.toString('hex')} to ${address}:${port}`);
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
        let repeaterPort = this.context.repeaterPort; // 5065
        let repeaterAddress = '127.0.0.1';

        let CA_REPEATER_REGISTER_msg: Buffer = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE);
        Context.generateCAHeader(CA_REPEATER_REGISTER_msg, 0, Constants.CA_REPEATER_REGISTER, //0x18
            0, 0, 0, 0, GlobalMethods.ipString2Int(repeaterAddress));

        await this.send(CA_REPEATER_REGISTER_msg, repeaterPort, repeaterAddress);
        // send every 1 second until CARepeater replies
        let caRepeaterRegisterInterval = setInterval(async () => {
            if (this.context.caRepeaterRegistered) {
                clearInterval(caRepeaterRegisterInterval);
                return;
            }
            await this.send(CA_REPEATER_REGISTER_msg, this.context.repeaterPort, repeaterAddress);
        }, 1000);
    }

    updateBroadcastAddresses() {

        for (let address of this.context.addressList) { // EPICS_CA_ADDR_LIST
            GlobalMethods.debugLog("updateBroadcastAddress", address);
            let port = this.context.serverPort; // 5064
            if (address.split(":").length === 2) {
                address = address.split(":")[0];
                port = parseInt(address.split(":")[1]);
            }

            // only add new address
            let broadcastAddressExist = false;
            for (let element of this.broadcastAddresses) {
                if (element[0] === port && element[1] === address) {
                    broadcastAddressExist = true;
                }
            }
            if (!broadcastAddressExist) {
                this.broadcastAddresses.push([port, address]);
            }
        }
    }
}


import { Context } from './Context';
import { Socket } from 'net';
import { Buffer } from 'buffer';
import { Constants } from './Constants';
import { userInfo, hostname } from 'os';
import { GlobalMethods } from './GlobalMethods';
import { Channel } from './Channel';
import { Beacon } from './Beacon';

// each Beacon object corresponds to a **possible** TCPTransport
// situations for a TCP connection: these behaviors are mostly defined in CATransport.java
//  - beacon anomaly, handled by 0x0d server beacon message in UDPTransport
//    - restart the search() of unresolved channels
//    - handled by 0x0d message handler in UDPTransport
//    - the corresponding TCPTransport is kept
//  - CA server close gracefully, handled by TCPTransport.reconnect() within "close" event
//    - remove all references of this TCPTransport
//      - set Channel.tcpClient to 'null'
//      - remove this TCPTransport from Context.tcpTransportList
//    - add the related channels to Context.unresolvedChannelList
//    - restart the search() of all unresolved channels
//  - CA server close abruptly, no way to detect it immediately
//  - CA server unresponsive, handled by Beacon.beaconAnomalyDetection() invoked in 
//    UDPTransport 0x0d server beacon message
//    - detected by the following mechanism:
//      - each time the UDPTransport receives a 0x0d beacon signal, it starts a 
//        setTimeout process which will be executed after 30 seconds
//      - if there is a beacon received within 30 seconds, this setTimeout() is canceled
//      - if this setTimeout() is not canceled, it executes, sending a 0x17 CA_PROTO_ECHO 
//        to this beacon's TCPTransport CA server
//      - if the echo is not responded, invoke TCPTransport.reconnect(), as if the 
//        remote TCP connection is closed gracefully
//  - normal situation

// -------------------------------
// A TCPTransport is referenced in:
//  - Channel.tcpTransport
//  - Beacon.tcpTransport
//  - Context.tcpTransportList <-- change from a pure list to an object, tcpTransportsByAddressPort, key = "address:port", value = TCPTransport
//  - ChannelMonitor.tcpTransport <-- eliminate, no need

// A TCPTransport is referenced in:
//  - Channel.tcpTransport
//  - Beacon.tcpTransport
//  - Context.tcpTransportsByAddressPort, key = "address:port", value = TCPTransport

// -------------------------------
// A Beacon is referenced in:
//  - TCPTransport.beacon
//  - UDPTransport.beaconList <-- change from a pure list to an object Context.beaconsByAddressPort, key = "address:port", value = Beacon

// A Beacon is referenced in:
//  - TCPTransport.beacon
//  - Context.beaconsByAddressPort, key = "address:port", value = Beacon

// -------------------------------
// A Channel is referenced in:
//  - TCPTransport.channelServerIDList <-- change name to channelsByServerID
//  - Context.channelsByName
//  - Context.channelsByChannelClientID
//  - Context.unresolvedChannelList, possibly
//  - ChannelMonitor.channel


// A Channel is referenced in:
//  - TCPTransport.channelsByServerID
//  - Context.channelsByName
//  - Context.channelsByChannelClientID
//  - Context.unresolvedChannelList, possibly
//  - ChannelMonitor.channel

// -------------------------------

// A ChannelMonitor is referenced in:
//  - Context.subscriptionIDList <-- keep as an object, rename it to channelMonitorsBySubscriptionID

// A ChannelMonitor is referenced in:
//  - Context.channelMonitorsBySubscriptionID

// -------------------------------

export class TCPTransport {
    socket: Socket;
    serverPort: number;
    serverAddress: string;
    context: Context;
    receiveBufferA: Buffer;
    receiveBufferB: Buffer;
    socketBuffer: Buffer;
    sendBuffer: Buffer;
    serverVersion: number;
    channelsByServerID: Record<string, any>;
    beacon: Beacon | null;

    constructor(context: Context, serverPort: number, serverAddress: string) {
        this.context = context;
        this.socket = new Socket();
        this.serverPort = serverPort;
        this.serverAddress = serverAddress;

        this.receiveBufferA = Buffer.alloc(Constants.CA_EXTENDED_MESSAGE_HEADER_SIZE); // 24 bytes
        this.receiveBufferB = Buffer.alloc(1024); // 1024 bytes
        this.socketBuffer = Buffer.alloc(Constants.MAX_TCP_RECV); // 16408 bytes
        // 16 * 1024 + 24 bytes
        this.sendBuffer = Buffer.alloc(16 * 1024 + Constants.CA_EXTENDED_MESSAGE_HEADER_SIZE);
        this.serverVersion = 0;
        this.channelsByServerID = {};
        this.beacon = null;
    }

    // must be async
    async tryConnect() {
        // TCP handshake with address:port, famous 3 packets 
        await this.socket.connect(this.serverPort, this.serverAddress);
        GlobalMethods.debugLog(`connected to ${this.serverAddress}:${this.serverPort}`);
    }

    async sendFirstFewMessages() {
        //HH in Connector.connect() invocation in CAJContext.searchResponse().getTransport()
        //HH new VersionRequest(transport, priority).submit();
        // this is a must, and weirdly the buffer may be modified before it is sent
        let buffer0x00 = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE); // 16 bytes
        Context.generateCAHeader(buffer0x00, 0, 0x00, 0x00, 0x00, 0x0d, 0x00, 0x00);
        GlobalMethods.debugLog(`Sending ${buffer0x00.toString("hex")} to ${this.serverAddress}:${this.serverPort}`);
        await this.socket.write(buffer0x00);

        //HH new UserNameRequest(transport).submit();
        let username = userInfo().username;
        let dataLength = (username.length + 1) % 8 === 0 ? username.length + 1 : Math.ceil((username.length + 1) / 8) * 8;
        let buffer0x14 = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE + dataLength);
        Context.generateCAHeader(buffer0x14, 0, 0x14, dataLength, 0x00, 0x00, 0x00, 0x00);
        buffer0x14.write(username, Constants.CA_MESSAGE_HEADER_SIZE);
        GlobalMethods.debugLog(`Sending ${buffer0x14.toString("hex")} to ${this.serverAddress}:${this.serverPort}`);
        await this.socket.write(buffer0x14);

        //HH new HostNameRequest(transport).submit();
        let hostnameString = hostname();
        dataLength = (hostnameString.length + 1) % 8 === 0 ? hostnameString.length + 1 : Math.ceil((hostnameString.length + 1) / 8) * 8;
        let buffer0x15 = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE + dataLength);
        Context.generateCAHeader(buffer0x15, 0, 0x15, dataLength, 0x00, 0x00, 0x00, 0x00);
        buffer0x15.write(hostnameString, Constants.CA_MESSAGE_HEADER_SIZE);
        GlobalMethods.debugLog(`Sending ${buffer0x15.toString("hex")} to ${this.serverAddress}:${this.serverPort}`);
        await this.socket.write(buffer0x15);
    }

    async messageHandler(msg: Buffer) {
        GlobalMethods.debugLog(`Received message ${msg.toString('hex')} from ${this.serverAddress}:${this.serverPort}`);
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
                this.serverVersion = message.readUInt16BE(6);
            }
            else if (command === 0x16) {
                let channelClientID = message.readUInt32BE(8);
                let channel = this.context.channelsByChannelClientID[channelClientID.toString()];
                channel.accessRight = message.readUInt32BE(12);
            }
            // CA_PROTO_CREATE_CHAN
            else if (command === 0x12) {
                let channelClientID = message.readUInt32BE(8);
                try {
                    let channel = this.context.channelsByChannelClientID[channelClientID.toString()];

                    channel.dbrType = message.readUInt16BE(4);
                    channel.dataCount = message.readUInt16BE(6);
                    channel.channelServerID = message.readUInt32BE(12);

                    this.channelsByServerID[channel.channelServerID.toString()] = channel;

                    this.context.unresolvedChannelList = this.context.unresolvedChannelList.filter(unresolvedChannel => unresolvedChannel !== channel);

                    let oldConnectionState = channel.connectionState;
                    channel.connectionState = Channel.CONNECTED;
                    channel.createChannelResolve0x12();

                    // connect all monitors
                    if (oldConnectionState !== Channel.CONNECTED) {
                        for (let subscriptionID in this.context.channelMonitorsBySubscriptionID) {
                            let channelMonitor = this.context.channelMonitorsBySubscriptionID[subscriptionID];
                            // the tcpTransport must be updated
                            channelMonitor.channel.tcpTransport = channel.tcpTransport;
                            await channelMonitor.runChannelMonitor();
                        }
                    }
                } catch (e) {
                    GlobalMethods.errorLog(`Handle 0x12 (CA_PROTO_CREATE_CHAN) message from ${this.serverAddress}:${this.serverPort}`);
                }
            }
            else if (command === 0x13) {
                let status = message.readUInt32BE(8);
                let ioID = message.readUInt32BE(12);
                let channel = this.context.ioList[ioID.toString()].channel;
                // Channel.put() continues
                this.context.ioList[ioID.toString()].promiseResolve(1);
            }
            // CA_PROTO_READ_NOTIFY
            else if (command === 0x0f) {
                let payloadSize = message.readUInt16BE(2);
                let dbrType = message.readUInt16BE(4);
                let dataCount = message.readUInt16BE(6);
                // Note: EPICS CA protocol spec is wrong, CA_PROTO_WRITE_NOTIFY is correct
                // it is "status code", not SID, 
                // where there are almost 60 "status code"
                //todo analyze status code, and do the response
                let status = message.readUInt32BE(8);
                let ioID = message.readUInt32BE(12);
                let dbrBuffer = message.slice(16, 16 + payloadSize);

                //HH Java also uses this to find the channel
                let channel = this.context.ioList[ioID.toString()].channel;
                let promiseResolve = this.context.ioList[ioID.toString()].promiseResolve;
                let promiseReject = this.context.ioList[ioID.toString()].promiseReject;

                let data = channel.decodeDBRBuffer(dbrBuffer, dbrType, dataCount);
                promiseResolve(data);

                delete this.context.ioList[ioID.toString()];
            }
            // CA_PROTO_EVENT_ADD, and response of CA_PROTO_EVENT_CANCEL
            else if (command === 0x01) {
                let payloadSize = message.readUInt16BE(2);
                let dbrType = message.readUInt16BE(4);
                let dataCount = message.readUInt16BE(6);
                // Note: EPICS CA protocol spec is wrong, CA_PROTO_WRITE_NOTIFY is correct
                // it is "status code", not SID, 
                // where there are almost 60 "status code"
                //todo analyze status code, and do the response
                let status = message.readUInt32BE(8);
                let subscriptionID = message.readUInt32BE(12);

                //HH Java also uses this to find the channel
                let channelMonitor = this.context.channelMonitorsBySubscriptionID[subscriptionID.toString()];
                let channel = channelMonitor.channel;

                // monitor canceled, stop the ChannelMonitor.runChannelMonitor()
                if (payloadSize === 0) {
                    // cancel the subscription, response from 0x02 (CA_PROTO_EVENT_CANCEL) command
                    let cancelChannelMonitorResolve = channelMonitor.cancelChannelMonitorResolve;
                    cancelChannelMonitorResolve(subscriptionID);
                }
                else {
                    // if (!channelMonitor.firstDataReceived) {
                    // channelMonitor.firstDataReceived = true;
                    let runChannelMonitorResolve = channelMonitor.runChannelMonitorResolve;
                    runChannelMonitorResolve(subscriptionID);
                    // }
                    let dbrBuffer = message.slice(16, 16 + payloadSize);
                    let data = channel.decodeDBRBuffer(dbrBuffer, dbrType, dataCount);
                    channel.monitorUpdatedEmitter.emit("monitorUpdated", data);
                }

            }
            // CA_PROTO_CLEAR_CHANNEL
            else if (command === 0x0c) {
                let channelClientID = message.readUInt32BE(12);
                let channel = this.context.channelsByChannelClientID[channelClientID.toString()];
                channel.clearChannelResolve0x0c();
            }
            // CA_PROTO_ECHO
            else if (command === 0x17) {
                clearTimeout(this.beacon?.beaconAnomalyDetectionSetTimeout);
                clearTimeout(this.beacon?.beaconAnomalyDetectionSetTimeout2);

            }
            // CA_PROTO_ERROR
            else if (command === 0x0B) {
                let channelClientID = message.readUInt32BE(8);
                let name = this.context.channelsByChannelClientID[channelClientID.toString()];
                let statusCode = message.readUInt32BE(12);
                let statusCodeHexString = statusCode.toString(16);
                GlobalMethods.errorLog(`ECA Code 0x${statusCodeHexString} in TCP tansport for Channel ${name} from ${this.serverAddress}:${this.serverPort}`);
                //todo: do something
            }
        }
    }

    // (1) when "error" event emit
    // (2) when "close" event emit
    // (3) when the beacon from this TCPTRansport expires and the echo fails
    static removeTCPTransportAndReconnectChannels(tcpTransport: TCPTransport|null) {
        if (tcpTransport === null) {
            return;
        }
        // For beacon anomaly, see Beacon.ts
        // "close" event is 
        // we cannot detect any abrupt disconneciton, e.g. network cable unplugged, lost power
        // this is only detectable through beacon anomaly
        // 
        // In Java, CATransport.processRead() has a while loop to read the TCP buffer flow, 
        // When "close", it triggers "bytesRead < 0" block
        // then the CATransport.close() is invoked, it does several things:
        //  - cancel Timer's taskId, what is this?
        //  - remove the CATransport from CATransportRegistry
        //  - flushInternal(), what is this?
        //  - free sendbuffer
        //  
        //  - closeNotifyClients(), let all CAJChannel that use this TCP to invoke transportClose()
        //    - change this CAJChannel's connection status to ConnectionState.DISCONNECTED
        //    - initiateSearch(): send 0x06 UDP packets to all EPICS_CA_ADDR_LIST to search this channel
        //    - let CATransport delete this CAJChannel object in CATransport's "Map owner"
        //  - seems like the CATransport object for this TCP connection is not explicitly deleted
        // In CAJChannle, it has a "CATransport transport"
        // In CATransport, it has a "Map owner" containing all CAJChannels that use this CATransport
        // ---------------------------------

        //todo:
        

        // destroy socket
        tcpTransport.socket.destroy();

        // assign tcpTransport property in channel to 'null'
        // search() for all the channels in this tcpTransport
        GlobalMethods.errorLog(`Remove TCPTransport ${tcpTransport.serverAddress}:${tcpTransport.serverPort} and reconnect all its channels`);
        for (let channelServerID in tcpTransport.channelsByServerID) {
            let channel = tcpTransport.channelsByServerID[channelServerID];
            // remove reference to tcpTransport in Channel
            channel.tcpTransport = null;
            channel.connectionState = Channel.DISCONNECTED;
            // whenever there is a beacon anomaly, the Channels in this list
            // are issued search() (after cancel search)
            if (!tcpTransport.context.unresolvedChannelList.includes(channel)) {
                tcpTransport.context.unresolvedChannelList.push(channel);
            }
        }
        // restart searches for all unresolved channels
        for (let unresolvedChannel of tcpTransport.context.unresolvedChannelList) {
            GlobalMethods.debugLog(`Searching ${unresolvedChannel.name}`);
            clearTimeout(unresolvedChannel.searchSetTimeout);
            unresolvedChannel.search();
        }

        // remove reference to tcpTransport in Context
        delete tcpTransport.context.tcpTransportsByAddressPort[`${tcpTransport.serverAddress}:${tcpTransport.serverPort}`];
        // remove reference to tcpTransport in Beacon
        if (tcpTransport.beacon) {
            tcpTransport.beacon.tcpTransport = null;
        }
    }
}

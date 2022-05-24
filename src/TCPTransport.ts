import { Context } from './Context';
import { Socket } from 'net';
import { Buffer } from 'buffer';
import { Constants } from './Constants';
import { userInfo, hostname } from 'os';
import { GlobalMethods } from './GlobalMethods';
import { Channel } from './Channel';
import { Beacon } from './Beacon';
import { CA_COMMANDS, CA_MSG_HEADER_OFFSETS, CA_MSG_HEADER_SIZE, CA_EXT_MSG_HEADER_SIZE, CA_EXT_MSG_HEADER_OFFSETS } from './global';
import { printMsg, epicsEnvCustom } from '.';
import { createInterface } from 'readline';


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
    // channelsByServerID: Record<string, any>;
    beacon: Beacon | null;
    isDestroyed: boolean;
    serverSchedulingPriority: number;
    key: string;
    channels: Record<string, Channel>;

    // promises
    CA_PROTO_VERSION_Promise: Promise<string>;
    CA_PROTO_VERSION_Resolve: any;
    CA_PROTO_VERSION_Reject: any;

    // time of any TCP message from server
    lastMsgTime: number;

    inactiveTimer1: any;
    inactiveTimer2: any;
    channelReSearchTimer: any;
    // todo: stich TCP packets, modify splitMessage()
    residualMessage: Buffer;

    constructor(context: Context, serverPort: number, serverAddress: string, serverSchedulingPriority: number) {
        this.residualMessage = Buffer.from("");

        this.lastMsgTime = new Date().getTime();

        this.serverSchedulingPriority = serverSchedulingPriority;
        this.context = context;
        this.socket = new Socket();
        this.serverPort = serverPort;
        this.serverAddress = serverAddress;

        context.tcpTransports.add(this);

        this.receiveBufferA = Buffer.alloc(Constants.CA_EXTENDED_MESSAGE_HEADER_SIZE); // 24 bytes
        this.receiveBufferB = Buffer.alloc(1024); // 1024 bytes
        this.socketBuffer = Buffer.alloc(Constants.MAX_TCP_RECV); // 16408 bytes
        // 16 * 1024 + 24 bytes
        this.sendBuffer = Buffer.alloc(16 * 1024 + Constants.CA_EXTENDED_MESSAGE_HEADER_SIZE);
        this.serverVersion = 0;
        // this.channelsByServerID = {};
        this.beacon = null;
        // so that TCPTransport.removeTCPTransportAndReconnectChannels() does not need to be async
        // Prevent "close" event invoke TCPTransport.removeTCPTransportAndReconnectChannels() twice
        this.isDestroyed = false;
        this.key = `${this.serverAddress}:${this.serverPort}:${this.serverSchedulingPriority}`
        this.channels = {};

        this.CA_PROTO_VERSION_Promise = new Promise((resolve, reject) => {
            this.CA_PROTO_VERSION_Resolve = resolve;
            this.CA_PROTO_VERSION_Reject = reject;
        })
        this.createInactiveTimers();
    }

    async send_CA_PROTO_ECHO() {
        let buffer = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE); // 16 bytes
        Context.generateCAHeader(buffer,
            0,
            CA_COMMANDS.CA_PROTO_ECHO, // 0x017
            0, // reserved
            0, // reserved
            0, // reserved
            0, // reserved
            0); // reserved
        await this.write(buffer);
    }

    createInactiveTimers() {
        this.inactiveTimer1 = setTimeout(async () => {
            // send CA_PROTO_ECHO to server, the CA server must reply it immediately
            GlobalMethods.debugLog(`Sending CA_PROT_ECHO (0x17) to ${this.serverAddress}:${this.serverPort}, to test its status`);
            await this.send_CA_PROTO_ECHO();
            // todo: change it to a generic number
        }, 16 * 1000);

        this.inactiveTimer2 = setTimeout(() => {
            // todo: disconnect, re-search all PVs, not destroy(), need a new function
            this.disconnected();
            GlobalMethods.errorLog(`CA server ${this.serverAddress}:${this.serverPort} not active for 30 seconds, disconnect it`);
        }, 30 * 1000);
    }


    // when the TCP connection is disconnected/lost disgracefully: 
    // e.g. unresponsive (Ctrl-z server, or 30s)/interrupted (Ctrl-Z, unplug cable), 
    // In this case, we want the Channels to be re-searched. 
    // Actions: destroy TCPTransports + re-connect channels
    // (1) destroy all channels in TCPTransport.channels
    // (2) close socket
    // (3) reject all promises
    // (4) remove TCPTransport from TCPTransports.tcpTransports
    // (5) clear all timeout Timer
    // (6) re-create all Channels, and re-search them
    async disconnected() {
        if (this.context.state !== this.context.DESTROYED) {
            let channelNames = Object.keys(this.channels);
            await this.destroy();
            // must be sync
            this.reSearchChannels(channelNames);
        }
    }

    reSearchChannels(channelNames: string[]) {
        // CA Protocol Specification: "Clients are RECOMMENDED to implement a timeout before re-starting a search"
        // must be the sync version
        this.channelReSearchTimer = setTimeout(() => {
            console.log(`Re-searching all channels for old TCPTransport ${this.key}`);
            channelNames.map((name: string) => {
                this.context.createChannel(name);
            })
        }, (epicsEnvCustom.EPICS_CA_TCP_RE_SEARCH_CHAN_TIMEOUT + epicsEnvCustom.EPICS_CA_TCP_RE_SEARCH_CHAN_TIMESPAN * Math.random()) * 1000);
    }

    // (1) mv all channels in TCPTransport.channels to Context.unresolvedChannels
    // (2) start to re-search all channels
    disconnectAndSearchChannels() {
        let unresolvedChannels = this.context.unresolvedChannels;
        for (let name in this.channels) {
            let channel = this.channels[name];
            unresolvedChannels[name] = channel;
        }
    }

    // usually invoked when we want to quit the program
    // destroy this TCP transport:
    // (1) destroy all channels in TCPTransport.channels
    // (2) close socket
    // (3) reject all promises
    // (4) remove TCPTransport from TCPTransports.tcpTransports
    // (5) clear all timeout Timer
    async destroy() {
        this.destroyChannels();
        await this.destroyTCPConnection();
    }

    // (1) destroy all channels in TCPTransport.channels
    destroyChannels() {
        // destroy all channels
        for (let name in this.channels) {
            let channel = this.channels[name];
            channel.destroy();
        }
    }

    // (2) close socket
    // (3) reject all promises
    // (4) remove TCPTransport from TCPTransports.tcpTransports
    // (5) clear all timeout Timer
    async destroyTCPConnection() {
        await this.destroyTCPConnectionWithoutChannelReSearch();
        // clear remaining Timers
        clearTimeout(this.channelReSearchTimer);
    }

    async destroyTCPConnectionWithoutChannelReSearch() {
        // close socket
        await this.socket.destroy();

        // reject all promises
        this.CA_PROTO_VERSION_Reject("");

        // remove from TCPTransports.tcpTransports
        let tcpTransports = this.context.tcpTransports.tcpTransports;
        delete tcpTransports[this.key];

        // clear all Timers
        clearTimeout(this.inactiveTimer1);
        clearTimeout(this.inactiveTimer2);
    }


    addChannel(channel: Channel) {
        const name = channel.name;
        // stop search
        GlobalMethods.debugLog(`Stop searching ${name}`);
        GlobalMethods.debugLog(`add channel ${channel.name} to TCPTransport ${this.serverAddress}:${this.serverPort}:${this.serverSchedulingPriority}`);
        channel.tcpTransport = this;
        
        this.channels[name] = channel;
        this.context.channelIDs[channel.channelClientID.toString()] = channel;

        // lift the blocking in Context.createChannel()
        // channel.createChannelResolve0x06();
    }



    async initialize() {
        GlobalMethods.debugLog("Initializing TCPTransport: tryConnect(), sendFirstFewMessages(), add message/error listeners");
        await this.tryConnect();
        await this.sendFirstFewMessages();
        this.socket.on("error", () => {
            GlobalMethods.errorLog(`Error on tcpTransport for ${this.serverAddress}:${this.serverPort}`);
            this.disconnected();
        });

        this.socket.on("data", (msg: Buffer) => {
            this.messageHandler(msg);
        });

        // emitted when remote TCP socket is closed gracefully, e.g. Ctrl+C
        this.socket.on("close", () => {
            GlobalMethods.errorLog(`TCP connection closed by server, destroy TCPTransport object for ${this.key}`);
            this.disconnected();
        });

        // lift blocking until we receive CA_PROTO_ACCESS_RIGHTS from server
        try {
            await this.CA_PROTO_VERSION_Promise;
        }
        catch {

        }
        GlobalMethods.debugLog("TCPTransport initialization finished");
    }

    // must be async
    async tryConnect() {
        // TCP handshake with address:port, famous 3 packets 
        await this.socket.connect(this.serverPort, this.serverAddress);
        GlobalMethods.debugLog(`TCPTransport connected to ${this.serverAddress}:${this.serverPort}`);
    }


    // very first 3 messages: CA_PROTO_VERSION, CA_PROTO_CLIENT_NAME, CA_PROTO_HOST_NAME
    async sendFirstFewMessages() {
        //HH in Connector.connect() invocation in CAJContext.searchResponse().getTransport()
        //HH new VersionRequest(transport, priority).submit();
        // this is a must
        let buffer0x00 = Buffer.alloc(CA_MSG_HEADER_SIZE); // 16 bytes 
        Context.generateCAHeader(buffer0x00,
            0,
            CA_COMMANDS.CA_PROTO_VERSION, // 0x00
            0x00, // payload size
            this.serverSchedulingPriority, // desired priority
            this.context.CA_VERION_MINOR, // version number
            0x00, // reserved
            0x00); // reserved
        this.write(buffer0x00);


        //HH new UserNameRequest(transport).submit();
        let username = userInfo().username;
        let payloadSize = GlobalMethods.getStringPaddedSize(username);
        let buffer0x14 = Buffer.alloc(CA_MSG_HEADER_SIZE + payloadSize);
        Context.generateCAHeader(buffer0x14,
            0,
            CA_COMMANDS.CA_PROTO_CLIENT_NAME,
            payloadSize,
            0x00, 0x00, 0x00, 0x00); // reserved, 0
        buffer0x14.write(username, CA_MSG_HEADER_SIZE);
        this.write(buffer0x14);

        //HH new HostNameRequest(transport).submit();
        let hostnameString = hostname();
        payloadSize = GlobalMethods.getStringPaddedSize(hostnameString);
        // payloadSize = (hostnameString.length + 1) % 8 === 0 ? hostnameString.length + 1 : Math.ceil((hostnameString.length + 1) / 8) * 8;
        let buffer0x15 = Buffer.alloc(CA_MSG_HEADER_SIZE + payloadSize);
        Context.generateCAHeader(buffer0x15,
            0,
            CA_COMMANDS.CA_PROTO_HOST_NAME,
            payloadSize,
            0x00, 0x00, 0x00, 0x00);
        buffer0x15.write(hostnameString, CA_MSG_HEADER_SIZE);
        this.write(buffer0x15);
        GlobalMethods.debugLog(`TCPTransport sent first frew messages to ${this.serverAddress}:${this.serverPort}`);
    }

    async write(buffer: Buffer) {
        const [messages, tmp] = GlobalMethods.splitMessage(buffer);
        for (let message of messages) {
            printMsg(message, { address: this.serverAddress, port: this.serverPort }, "Sending TCP");
        }
        await this.socket.write(buffer);
    }

    getChannelFromChannelClientID(channelClientID: number) {
        // for (let pvName in this.channels) {
        //     const channel = this.channels[pvName];
        //     if (channel.channelClientID === channelClientID) {
        //         return channel;
        //     }
        // }
        return this.context.channelIDs[channelClientID.toString()];
        // return null;
    }


    // todo: is it appropriate to use this name? Because the Channels are destroyed, means 
    // todo: the channels stop searching
    // todo: should be removed, it is the old fashion stuff
    async closeSocket() {
        GlobalMethods.infoLog(`Closing TCP transport for ${this.serverAddress}:${this.serverPort}:${this.serverSchedulingPriority}`);
        await this.socket.destroy();
    }

    handle_CA_PROTO_READ_NOTIFY_reply(message: Buffer) {

        let HEADER_OFFSETS = CA_MSG_HEADER_OFFSETS;
        let HEADER_SIZE = CA_MSG_HEADER_SIZE;
        if (GlobalMethods.isExtendedMessageHeader(message, 0)) {
            HEADER_OFFSETS = CA_EXT_MSG_HEADER_OFFSETS;
            HEADER_SIZE = CA_EXT_MSG_HEADER_SIZE;
        }

        let payloadSize = message.readUInt16BE(HEADER_OFFSETS.payloadSize);
        let dbrType = message.readUInt16BE(HEADER_OFFSETS.dataType);

        let dataCount = message.readUInt16BE(HEADER_OFFSETS.dataCount);
        // Note: EPICS CA protocol spec is wrong, CA_PROTO_WRITE_NOTIFY is correct
        // parameter1 is "status code", not SID, 
        // where there are almost 60 "status code"
        //todo analyze status code, and do the response
        let status = message.readUInt32BE(HEADER_OFFSETS.parameter1);
        let ioID = message.readUInt32BE(HEADER_OFFSETS.parameter2);
        let dbrBuffer = message.slice(HEADER_SIZE, HEADER_SIZE + payloadSize);

        let channel = this.context.ioList[ioID.toString()].channel;
        let promiseResolve = this.context.ioList[ioID.toString()].promiseResolve;

        let data = channel.decodeDBRBuffer(dbrBuffer, dbrType, dataCount);
        // lift the blocking in Channel.get()
        promiseResolve(data);
        delete this.context.ioList[ioID.toString()];
    }


    clearInactiveTimers() {
        clearTimeout(this.inactiveTimer1);
        clearTimeout(this.inactiveTimer2);
        clearTimeout(this.channelReSearchTimer);
    }



    async messageHandler(msg: Buffer) {

        // whenever we receive a TCP message, reset the inactive countdown timer

        if ((new Date().getTime()) - this.lastMsgTime < 30 * 1000) {
            this.lastMsgTime = new Date().getTime();
            // reset countdown
            this.clearInactiveTimers();
            this.createInactiveTimers();
        }

        let messages: Buffer[];

        [messages, this.residualMessage] = GlobalMethods.splitMessage(Buffer.concat([this.residualMessage, msg]));

        // for (let message of messages) {
        //     printMsg(message, { address: this.serverAddress, port: this.serverPort }, "Received TCP");
        // }

        // printMsg(msg, { address: this.serverAddress, port: this.serverPort }, "Received TCP")
        // let messages: Buffer[] = [];
        // let offset = 0;

        // while (offset < msg.length) {
        //     let payloadSize = msg.readUInt16BE(offset + CA_MSG_HEADER_OFFSETS.payloadSize);
        //     let headerSize = CA_MSG_HEADER_SIZE;
        //     // extended header 
        //     if (payloadSize === 0xFFFF) {
        //         headerSize = CA_EXT_MSG_HEADER_SIZE;
        //         payloadSize = msg.readUInt32BE(offset + CA_EXT_MSG_HEADER_OFFSETS.payloadSize);
        //     }
        //     messages.push(msg.slice(offset, offset + headerSize + payloadSize));
        //     offset = offset + headerSize + payloadSize;
        // }

        for (let message of messages) {
            let command = message.readUInt16BE(0);
            if (command === 0x00) {
                this.serverVersion = message.readUInt16BE(6);
                this.CA_PROTO_VERSION_Resolve("TCPTransport initialization finished");
            }
            else if (command === CA_COMMANDS.CA_PROTO_ACCESS_RIGHTS) { // 0x16
                let channelClientID = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter1);
                let accessRight = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter2);
                let channel = this.getChannelFromChannelClientID(channelClientID);
                if (channel) {
                    channel.accessRight = accessRight;
                }
                // lift blocking in TCPTransport.initialize(), indicating the initialization of TCPTransport is finished
                // this.CA_PROTO_ACCESS_RIGHTS_Resolve("TCPTransport initialization finished");
            }
            else if (command === CA_COMMANDS.CA_PROTO_CREATE_CHAN) { // reply for 0x12
                let dbrType = message.readUInt16BE(CA_MSG_HEADER_OFFSETS.dataType);
                let channelClientID = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter1);
                let channelServerID = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter2);
                let dataCount = message.readUInt16BE(CA_MSG_HEADER_OFFSETS.dataCount);

                // let channel: Channel | null = null;
                // for (let pvName in this.channels) {
                //     if (this.channels[pvName].channelClientID === channelClientID) {
                //         channel = this.channels[pvName];
                //         break;
                //     }
                // }
                let channel = this.getChannelFromChannelClientID(channelClientID);
                if (channel !== null) {
                    let oldConnectionState = channel.connectionState;
                    channel.connectionState = Channel.CONNECTED;

                    channel.dbrType = dbrType;
                    channel.channelServerID = channelServerID;
                    channel.dataCount = dataCount;
                    channel.CA_PROTO_CREATE_CHAN_Resolve(`Channel ${channel.name} created on server ${this.serverAddress}:${this.serverPort}`);

                    // channel.createChannelResolve0x12();
                    //todo: uncomment below
                    // if (oldConnectionState !== Channel.CONNECTED) {
                    //     for (let subscriptionID in this.context.channelMonitorsBySubscriptionID) {
                    //         let channelMonitor = this.context.channelMonitorsBySubscriptionID[subscriptionID];
                    //         // the tcpTransport must be updated
                    //         channelMonitor.channel.tcpTransport = channel.tcpTransport;
                    //         await channelMonitor.runChannelMonitor();
                    //     }
                    // }
                }
                //todo: do we really need it?
                try {
                    // let channel = this.context.channelsByChannelClientID[channelClientID.toString()];

                    // channel.dbrType = message.readUInt16BE(4);
                    // channel.dataCount = message.readUInt16BE(6);
                    // channel.channelServerID = message.readUInt32BE(12);

                    // this.channelsByServerID[channel.channelServerID.toString()] = channel;

                    // this.context.unresolvedChannelList = this.context.unresolvedChannelList.filter(unresolvedChannel => unresolvedChannel !== channel);
                    // connect all monitors
                } catch (e) {
                    GlobalMethods.errorLog(`Handle 0x12 (CA_PROTO_CREATE_CHAN) message from ${this.serverAddress}:${this.serverPort}`);
                }
            }
            //todo: review logic
            else if (command === 0x13) {
                let status = message.readUInt32BE(8);
                let ioID = message.readUInt32BE(12);
                let channel = this.context.ioList[ioID.toString()].channel;
                // Channel.put() continues
                this.context.ioList[ioID.toString()].promiseResolve(1);
            }
            else if (command === CA_COMMANDS.CA_PROTO_READ_NOTIFY) { // 0x0f
                this.handle_CA_PROTO_READ_NOTIFY_reply(message);
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
                // value updated
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
                // let channel = this.context.channelsByChannelClientID[channelClientID.toString()];
                // channel.clearChannelResolve0x0c();
            }
            // reply of CA_PROTO_ECHO (0x17)
            else if (command === CA_COMMANDS.CA_PROTO_ECHO) {
                // does nothing
            }
            // CA_PROTO_ERROR
            else if (command === 0x0B) {
                let channelClientID = message.readUInt32BE(8);
                // let name = this.context.channelsByChannelClientID[channelClientID.toString()];
                let name = this.getChannelFromChannelClientID(channelClientID);
                let statusCode = message.readUInt32BE(12);
                let statusCodeHexString = statusCode.toString(16);
                GlobalMethods.errorLog(`ECA Code 0x${statusCodeHexString} in TCP tansport for Channel ${name} ${channelClientID} from ${this.serverAddress}:${this.serverPort}`);
                //todo: decode statusCode, originalRequest, and errorMessage
                let originalRequest = "";
                let errorMessage = "";
            }
            // CA_PROTO_SERVER_DISCONN || CA_PROTO_CREATE_CH_FAIL
            // else if (command === 0x1B || command === 0x1A) {
            //     let channelClientID = message.readUInt32BE(8);
            //     let channel = this.context.channelsByChannelClientID[channelClientID.toString()];
            //     if (channel !== undefined) {
            //         GlobalMethods.errorLog(`Channel ${channel.name} creation failed or disconnected by CA server ${this.serverAddress}:${this.serverPort}`);
            //         await channel.clearChannel();
            //     }
            // }
            else if (command === CA_COMMANDS.CA_PROTO_SERVER_DISCONN) { // 0x1b
                let channelClientID = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter1);
                const channel = this.getChannelFromChannelClientID(channelClientID);
                if (channel) {
                    channel.destroy();
                }
            }
            else if (command === CA_COMMANDS.CA_PROTO_CLEAR_CHANNEL) { // 0x0c
                let channelServerID = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter1);
                let channelClientID = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter2);

                const channel = this.getChannelFromChannelClientID(channelClientID);
                if (channel) {
                    channel.destroy();
                }
            }
        }
    }

    // (1) when "error" event emit
    // (2) when "close" event emit
    // (3) when the beacon from this TCPTRansport expires and the echo fails
    static removeTCPTransportAndReconnectChannels(tcpTransport: TCPTransport | null) {
        //todo: uncomment below, examine behavior
        // if (tcpTransport === null) {
        //     return;
        // }
        // // For beacon anomaly, see Beacon.ts
        // // "close" event is 
        // // we cannot detect any abrupt disconneciton, e.g. network cable unplugged, lost power
        // // this is only detectable through beacon anomaly
        // // 
        // // In Java, CATransport.processRead() has a while loop to read the TCP buffer flow, 
        // // When "close", it triggers "bytesRead < 0" block
        // // then the CATransport.close() is invoked, it does several things:
        // //  - cancel Timer's taskId, what is this?
        // //  - remove the CATransport from CATransportRegistry
        // //  - flushInternal(), what is this?
        // //  - free sendbuffer
        // //  
        // //  - closeNotifyClients(), let all CAJChannel that use this TCP to invoke transportClose()
        // //    - change this CAJChannel's connection status to ConnectionState.DISCONNECTED
        // //    - initiateSearch(): send 0x06 UDP packets to all EPICS_CA_ADDR_LIST to search this channel
        // //    - let CATransport delete this CAJChannel object in CATransport's "Map owner"
        // //  - seems like the CATransport object for this TCP connection is not explicitly deleted
        // // In CAJChannle, it has a "CATransport transport"
        // // In CATransport, it has a "Map owner" containing all CAJChannels that use this CATransport
        // // ---------------------------------

        // // destroy socket
        // tcpTransport.socket.destroy();
        // tcpTransport.isDestroyed = true;

        // // assign tcpTransport property in channel to 'null'
        // // search() for all the channels in this tcpTransport
        // GlobalMethods.errorLog(`Remove TCPTransport ${tcpTransport.serverAddress}:${tcpTransport.serverPort} and reconnect all its channels`);
        // for (let channelServerID in tcpTransport.channelsByServerID) {
        //     let channel = tcpTransport.channelsByServerID[channelServerID];
        //     // remove reference to tcpTransport in Channel
        //     channel.tcpTransport = null;
        //     channel.connectionState = Channel.DISCONNECTED;
        //     // whenever there is a beacon anomaly, the Channels in this list
        //     // are issued search() (after cancel search)
        //     if (!tcpTransport.context.unresolvedChannelList.includes(channel)) {
        //         tcpTransport.context.unresolvedChannelList.push(channel);
        //     }
        // }
        // // restart searches for all unresolved channels
        // for (let unresolvedChannel of tcpTransport.context.unresolvedChannelList) {
        //     GlobalMethods.debugLog(`Searching ${unresolvedChannel.name}`);
        //     clearTimeout(unresolvedChannel.searchSetTimeout);
        //     unresolvedChannel.search();
        // }

        // // remove reference to tcpTransport in Context
        // delete tcpTransport.context.tcpTransportsByAddressPort[`${tcpTransport.serverAddress}:${tcpTransport.serverPort}`];
        // // remove reference to tcpTransport in Beacon
        // if (tcpTransport.beacon) {
        //     tcpTransport.beacon.tcpTransport = null;
        // }
    }
}

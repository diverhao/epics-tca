import { Context } from './Context';
import { Socket } from 'net';
import { Buffer } from 'buffer';
import { Constants } from './Constants';
import { userInfo, hostname } from 'os';
import { GlobalMethods } from './GlobalMethods';
import { Channel } from './Channel';

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
    channelServerIDList: Record<string, any>;

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
        this.channelServerIDList = {};
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
        await this.socket.write(buffer0x00);

        //HH new UserNameRequest(transport).submit();
        let username = userInfo().username;
        let dataLength = (username.length + 1) % 8 === 0 ? username.length + 1 : Math.ceil((username.length + 1) / 8) * 8;
        let buffer0x14 = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE + dataLength);
        Context.generateCAHeader(buffer0x14, 0, 0x14, dataLength, 0x00, 0x00, 0x00, 0x00);
        buffer0x14.write(username, Constants.CA_MESSAGE_HEADER_SIZE);
        await this.socket.write(buffer0x14);

        //HH new HostNameRequest(transport).submit();
        let hostnameString = hostname();
        dataLength = (hostnameString.length + 1) % 8 === 0 ? hostnameString.length + 1 : Math.ceil((hostnameString.length + 1) / 8) * 8;
        let buffer0x15 = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE + dataLength);
        Context.generateCAHeader(buffer0x15, 0, 0x15, dataLength, 0x00, 0x00, 0x00, 0x00);
        buffer0x15.write(hostnameString, Constants.CA_MESSAGE_HEADER_SIZE);
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
                let channel = this.context.channelsByChannelClientID[channelClientID.toString()];
                channel.dbrType = message.readUInt16BE(4);
                channel.dataCount = message.readUInt16BE(6);
                channel.channelServerID = message.readUInt32BE(12);
                this.channelServerIDList[channel.channelServerID.toString()] = channel;
                channel.createChannelResolve0x12();
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
            // CA_PROTO_EVENT_ADD
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
                let channel = this.context.subscriptionIDList[subscriptionID.toString()].channel;
                let promiseResolve = this.context.subscriptionIDList[subscriptionID.toString()].promiseResolve;
                let promiseReject = this.context.subscriptionIDList[subscriptionID.toString()].promiseReject;

                if (payloadSize === 0) {
                    // cancel the subscription, response from 0x02 (CA_PROTO_EVENT_CANCEL) command
                    promiseResolve();
                    delete this.context.subscriptionIDList[subscriptionID.toString()];
                }
                else {
                    let dbrBuffer = message.slice(16, 16 + payloadSize);
                    let data = channel.decodeDBRBuffer(dbrBuffer, dbrType, dataCount);
                    channel.monitorUpdatedEmitter.emit("monitorUpdated", data);
                }

            }
            else if (command === 0x0c) {
                let channelClientID = message.readUInt32BE(12);
                let channel = this.context.channelsByChannelClientID[channelClientID.toString()];
                channel.clearChannelResolve0x0c();
            }
        }
    }
}

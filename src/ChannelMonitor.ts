import { Channel } from "./Channel";
import { Context } from "./Context";
import { TCPTransport } from "./TCPTransport";
import { Buffer } from 'buffer';
import { GlobalMethods } from "./GlobalMethods";
import { Constants } from "./Constants";
import { EventEmitter } from "events";
import { CA_COMMANDS } from ".";
import { CA_MSG_HEADER_OFFSETS, CA_MSG_HEADER_SIZE, CA_EXT_MSG_HEADER_OFFSETS, CA_EXT_MSG_HEADER_SIZE } from ".";

export class ChannelMonitor extends EventEmitter {
    context: Context;
    channel: Channel;
    // tcpTransport: TCPTransport | null;

    // a channel monitor is identified by:
    mask: number;
    dataCount: number;
    dbrType: number;

    name: string;

    channelServerID: number;
    channelClientID: number;
    subscriptionID: number;

    cancelChannelMonitorPromise: any;
    cancelChannelMonitorResolve: any;
    cancelChannelMonitorReject: any;

    runChannelMonitorPromise: any;
    runChannelMonitorResolve: any;
    runChannelMonitorReject: any;

    firstDataReceived: boolean;

    tcpTransport: TCPTransport | null;

    subID: number;

    constructor(channel: Channel, subID: number, dbrType: number, dataCount: number, mask: number) {
        super();


        this.channel = channel;
        this.context = this.channel.context;
        // this.tcpTransport = this.channel.tcpTransport;

        if (typeof dbrType === 'undefined') {
            dbrType = channel.dbrType;
        }
        if (typeof dataCount === 'undefined') {
            dataCount = channel.dataCount;
        }
        if (typeof mask === 'undefined') {
            mask = 0x05;
        }

        this.dbrType = dbrType;
        this.dataCount = dataCount;
        this.mask = mask;
        this.subID = subID;

        this.name = this.channel.name;
        this.channelServerID = this.channel.channelServerID;
        this.channelClientID = this.channel.channelClientID;

        this.subscriptionID = -1;

        this.cancelChannelMonitorPromise = new Promise((resolve, reject) => {
            this.cancelChannelMonitorResolve = resolve;
            this.cancelChannelMonitorReject = reject;
        });

        this.firstDataReceived = false;

        this.tcpTransport = this.channel.tcpTransport;
        // this.on("updated", () => {})
        this.channel.context.monitorsBySubID[this.subID.toString()] = this;

    }

    // // obtain a subscriptionID, and add info to Context.channelMonitorsBySubscriptionID
    // obtainSubscriptionID() {
    //     for (let id in this.context.channelMonitorsBySubscriptionID) {
    //         if (this.context.channelMonitorsBySubscriptionID[id] === this) {
    //             GlobalMethods.debugLog(`Channel monitor with subscriptID ${id} for ${this.name} already exists`);
    //             return parseInt(id);
    //         }
    //     }

    //     // 0xFFFFFFFF
    //     if (this.context.subscriptionID === 4294967295) {
    //         this.context.subscriptionID = 0;
    //     }
    //     else {
    //         this.context.subscriptionID++;
    //     }
    //     this.subscriptionID = this.context.subscriptionID;

    //     this.context.channelMonitorsBySubscriptionID[this.subscriptionID.toString()] = this;
    //     // this.context.channelMonitorsBySubscriptionID[this.subscriptionID.toString()] = {};
    //     // this.context.channelMonitorsBySubscriptionID[this.subscriptionID.toString()].channel = this.channel;
    //     // this.context.channelMonitorsBySubscriptionID[this.subscriptionID.toString()].channelMonitor = this;
    //     return this.subscriptionID;
    // }

    async subscribe() {
        // must wait until the channel is created on the server
        try {
            await this.channel.CA_PROTO_CREATE_CHAN_Promise;
        }
        catch {
            GlobalMethods.errorLog(`Creation of channel ${this.name} for monitor interrupted.`);
        }

        const payloadSize = 16; // const

        let buffer = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE + payloadSize);
        GlobalMethods.generateCAHeader(buffer,
            0, // 0 offset
            CA_COMMANDS.CA_PROTO_EVENT_ADD,
            payloadSize, // fixed number, 16
            this.dbrType, // desired data type, default is the server provided data type
            this.dataCount, // desired data count
            this.channelServerID, // channel server ID
            this.subID); // subscription ID, unique for whole context
        buffer.writeUInt16BE(this.mask, Constants.CA_MESSAGE_HEADER_SIZE + 12)
        await this.tcpTransport?.write(buffer);


        // this.obtainSubscriptionID();

        // this.runChannelMonitorPromise = new Promise((resolve, reject) => {
        //     this.runChannelMonitorResolve = resolve;
        //     this.runChannelMonitorReject = reject;
        // });

        // // update all properties:
        // this.dbrType = this.channel.dbrType;
        // this.dataCount = this.channel.dataCount;
        // this.channelServerID = this.channel.channelServerID;

        // let buffer0x01Header = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE);
        // Context.generateCAHeader(buffer0x01Header, 0, 0x01, 16, this.dbrType, this.dataCount, this.channelServerID, this.subscriptionID);
        // let buffer0x01Data = Buffer.alloc(16);
        // buffer0x01Data.writeUInt16BE(this.mask, 12);

        // let buffer0x01 = Buffer.concat([buffer0x01Header, buffer0x01Data]);

        // if (this.channel.tcpTransport !== null) {
        //     GlobalMethods.debugLog(`Sending ${buffer0x01.toString('hex')} to ${this.channel.tcpTransport.serverAddress}:${this.channel.tcpTransport.serverPort}`);
        //     await this.channel.tcpTransport.socket.write(buffer0x01);
        // }

        // // Promise is resolved when 0x01 packet is received
        // let id = await this.runChannelMonitorPromise;
        // GlobalMethods.debugLog(`CA monitor for ${this.name} with subscriptID = ${this.subscriptionID} runs`);
        // return id;
    }

    processData(message: Buffer) {
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
        // it is "status code", not SID, 
        // where there are almost 60 "status code"
        //todo analyze status code, and do the response
        let status = message.readUInt32BE(HEADER_OFFSETS.parameter1);
        let subID = message.readUInt32BE(HEADER_OFFSETS.parameter2);
        let dbrBuffer = message.slice(HEADER_SIZE, HEADER_SIZE + payloadSize);
        let data = this.channel.decodeDBRBuffer(dbrBuffer, dbrType, dataCount);
        console.log(data);
    }

    // pause ALL CA monitors on this CA server
    async pauseAllChannelMonitors() {
        let buffer0x08 = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE);
        // CA_PROTO_EVENTS_OFF
        GlobalMethods.generateCAHeader(buffer0x08, 0, 0x08, 0, 0, 0, 0, 0);
        if (this.channel.tcpTransport !== null) {
            GlobalMethods.debugLog(`sending ${buffer0x08.toString('hex')} to ${this.channel.tcpTransport.serverAddress}:${this.channel.tcpTransport.serverPort}`);
            await this.channel.tcpTransport.socket.write(buffer0x08);
        }
    }

    // resume ALL CA monitors on this CA server
    async resumeAllChannelMonitors() {
        let buffer0x09 = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE);
        // CA_PROTO_EVENTS_ON
        GlobalMethods.generateCAHeader(buffer0x09, 0, 0x09, 0, 0, 0, 0, 0);
        if (this.channel.tcpTransport !== null) {
            GlobalMethods.debugLog(`sending ${buffer0x09.toString('hex')} to ${this.channel.tcpTransport.serverAddress}:${this.channel.tcpTransport.serverPort}`);
            await this.channel.tcpTransport.socket.write(buffer0x09);
        }
    }

    // send 0x02, receive 0x01
    async cancelChannelMonitor() {
        try {
            let buffer0x02 = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE);
            GlobalMethods.generateCAHeader(buffer0x02, 0, 0x02, 0, this.dbrType, this.dataCount, this.channelServerID, this.subscriptionID);
            if (this.channel.tcpTransport !== null) {
                GlobalMethods.debugLog("Sending", buffer0x02?.toString("hex"), "to", this.channel.tcpTransport?.serverAddress, ":", this.channel.tcpTransport?.serverPort);
                await this.channel.tcpTransport.socket.write(buffer0x02);
            }
        } catch (e) {
            return false;
        }
        await this.cancelChannelMonitorPromise;
        GlobalMethods.debugLog(`CA monitor for ${this.name} with subscriptID = ${this.subscriptionID} successfully canceled`);
        // it is the only reference of "this"
        delete this.context.channelMonitorsBySubscriptionID[this.subscriptionID.toString()];
    }
}
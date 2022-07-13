import { Buffer } from 'buffer';

import { Channel, Context, TCPTransport, GlobalMethods, Constants, 
    CA_COMMANDS, epicsEnvCustom, CA_MSG_HEADER_OFFSETS, CA_MSG_HEADER_SIZE, 
    CA_EXT_MSG_HEADER_OFFSETS, CA_EXT_MSG_HEADER_SIZE } from "..";

export class ChannelMonitor {
    context: Context;
    channel: Channel;

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
    SUBSCRIBED: number;
    NOT_SUBSCRIBED: number;
    PAUSED: number;

    // emitEvent: boolean;
    // eventName: string;
    // stores the most recent value
    data: Record<string, any>;

    listener: ((monitor: ChannelMonitor) => any) | null;

    status: number;
    // constructor(channel: Channel, subID: number, dbrType: number, dataCount: number, mask: number, emitEvent: boolean) {
    constructor(channel: Channel, subID: number, listener: ((monitor: ChannelMonitor) => any) | null, dbrType: number, dataCount: number, mask: number) {

        this.NOT_SUBSCRIBED = 0;
        this.SUBSCRIBED = 1;
        this.PAUSED = 2;
        this.status = this.NOT_SUBSCRIBED;

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
        if (typeof listener === 'undefined') {
            listener = null;
        }

        this.dbrType = dbrType;
        this.dataCount = dataCount;
        this.mask = mask;
        this.listener = listener;
        this.subID = subID;

        this.name = this.channel.name;
        this.channelServerID = -1;
        this.channelClientID = this.channel.channelClientID;

        this.subscriptionID = -1;

        this.cancelChannelMonitorPromise = new Promise((resolve, reject) => {
            this.cancelChannelMonitorResolve = resolve;
            this.cancelChannelMonitorReject = reject;
        });

        this.firstDataReceived = false;

        this.tcpTransport = null;
        // this.on("updated", () => {})
        this.channel.context.monitorsBySubID[this.subID.toString()] = this;

        this.data = {};

        let prioritySuffix = "";
        if (this.channel.serverSchedulingPriority !== epicsEnvCustom.EPICS_CA_SCHEDULING_PRIORITY_DEFAULT) {
            prioritySuffix = "_CAPriority" + this.channel.serverSchedulingPriority.toString();
        }
        // this.eventName = this.name + prioritySuffix;

    }


    async subscribe() {
        if (this.status === this.SUBSCRIBED) {
            return;
        }
        // must wait until the channel is created on the server
        try {
            await this.channel.CA_PROTO_CREATE_CHAN_Promise;
        }
        catch {
            GlobalMethods.errorLog(`Creation of channel ${this.name} for monitor interrupted.`);
        }
        this.channelServerID = this.channel.channelServerID;
        this.tcpTransport = this.channel.tcpTransport;
        const payloadSize = 16; // const

        let buffer = Buffer.alloc(CA_MSG_HEADER_SIZE + payloadSize);
        GlobalMethods.generateCAHeader(buffer,
            0, // 0 offset
            CA_COMMANDS.CA_PROTO_EVENT_ADD, // 0x01
            payloadSize, // fixed number, 16
            this.dbrType, // desired data type, default is the server provided data type
            this.dataCount, // desired data count
            this.channelServerID, // channel server ID
            this.subID); // subscription ID, unique for whole context
        buffer.writeUInt16BE(this.mask, CA_MSG_HEADER_SIZE + 12)
        await this.tcpTransport?.write(buffer);
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
        this.data = this.channel.decodeDBRBuffer(dbrBuffer, dbrType, dataCount);

        if (this.listener !== null) {
            this.listener(this);
        }
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

    // todo: do we need the reply?
    destroy(hard: boolean) {
        let buffer = Buffer.alloc(CA_MSG_HEADER_SIZE);
        GlobalMethods.generateCAHeader(buffer,
            0, // 0 offset
            CA_COMMANDS.CA_PROTO_EVENT_CANCEL, // 0x02
            0, // must be 0
            this.dbrType, // identify this subscription
            this.dataCount, // identify this subscription
            this.channelServerID, // identify this subscription
            this.subID, // identify this subscription
        );
        this.tcpTransport?.write(buffer);
        if (!hard) {
            let monitor = this;
            let monitorData = {
                // emitEvent: monitor.emitEvent,
                listener: monitor.listener,
                dbrType: monitor.dbrType,
                dataCount: monitor.dataCount,
                mask: monitor.mask,
            };
            if (!this.context.unresolvedMonitors[this.name]) {
                this.context.unresolvedMonitors[this.name] = {};
            }
            this.context.unresolvedMonitors[this.name][this.subID.toString()] = monitorData;
            delete this.context.monitorsBySubID[this.subID.toString()];
        }
    }

}
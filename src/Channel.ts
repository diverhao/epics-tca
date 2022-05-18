import { Context } from "./Context";
import { Buffer } from 'buffer';
import { Constants } from "./Constants";
import { TCPTransport } from "./TCPTransport";
import { GlobalMethods } from "./GlobalMethods";
import { UDPTransport } from "./UDPTransport";

import { EventEmitter } from "events";
import { ChannelMonitor } from "./ChannelMonitor";

import { CA_COMMANDS, epicsEnv, epicsEnvCustom } from ".";
import { printMsg } from ".";

// priority is on TCP connection level, not on channel level

// todo:
// from CAJChannel.java
// connectionState, lastConnectionState
// listeners, callback function list when the channel is connected (not updated)
// accessRightListeners, list
// consider all the channel related operations
// (TCP)transportChanged(): initiateSearch(), broadcast 0x06 UDP to search this channel
//   - when there is a beacon anomaly: 
//     - a CA server is changed, e.g. reboot, network glitch, the 
//     - a new CA server is added
// timeout(), what is this?
// registerMonitor()/unregister/destroy, there are many monitors for each channel
// how to sense the CA server is down? listen 'disconnect' event

export class Channel {
    context: Context;
    tcpTransport: TCPTransport | null;

    name: string;
    channelClientID: number;
    channelServerID: number;
    searchPVTimer: any;
    dbrType: number;

    static NEVER_CONNECTED: number = 0;
    static CONNECTED: number = 1;
    static DISCONNECTED: number = 2;
    static CLOSED: number = 3;
    connectionState: number;
    connectionStateChangeEmitter: EventEmitter;

    accessRight: number;
    dataCount: number;

    dbrTime: Record<string, any> = {};

    // resolve when 0x06 CA_PROTO_SEARCH replies 
    createChannelResolve0x06: any;
    createChannelReject0x06: any;
    createChannelPromise0x06: any;

    // resolve when 0x12 CA_PROTO_CREATE_CHAN replies 
    createChannelResolve0x12: any;
    createChannelReject0x12: any;
    createChannelPromise0x12: any;

    readChannelResolve0x0f: any;
    readChannelReject0x0f: any;
    readChannelPromise0x0f: any;

    // resolve when 0x0c CA_PROTO_CLEAR_CHANNEL replies 
    // clearChannelResolve0x0c: any;
    // clearChannelReject0x0c: any;
    // clearChannelPromise0x0c: any;

    searchInterrupted: boolean;

    // beaconAnomalyEmitter = new EventEmitter();
    monitorUpdatedEmitter = new EventEmitter();
    monitorValue: Record<string, any> = {};

    searchBuffer: Buffer;
    udpTransport: UDPTransport;

    serverSchedulingPriority: number;

    // listener: any;
    //todo listener
    constructor(context: Context, name: string, serverSchedulingPriority: number = epicsEnvCustom.EPICS_CA_SCHEDULING_PRIORITY_DEFAULT) {

        this.context = context;
        this.name = name;
        this.channelClientID = this.context.channelClientID;
        this.channelServerID = 0xFFFFFFFF;
        this.tcpTransport = null;
        this.udpTransport = this.context.udpTransport;
        this.connectionState = Channel.NEVER_CONNECTED
        this.serverSchedulingPriority = serverSchedulingPriority;

        this.connectionStateChangeEmitter = new EventEmitter();
        this.connectionStateChangeEmitter.on("CONNECTED", () => {
            // connect all 
        });

        //todo listener
        // properties of this channel
        this.dbrType = -1;
        this.accessRight = -1;
        this.dataCount = -1;

        this.createChannelPromise0x06 = new Promise((resolve, reject) => {
            this.createChannelResolve0x06 = resolve;
            this.createChannelReject0x06 = reject;
        });

        this.createChannelPromise0x12 = new Promise((resolve, reject) => {
            this.createChannelResolve0x12 = resolve;
            this.createChannelReject0x12 = reject;
        });

        this.readChannelPromise0x0f = new Promise((resolve, reject) => {
            this.readChannelResolve0x0f = resolve;
            this.readChannelReject0x0f = reject;
        });

        this.searchInterrupted = false;

        // this.clearChannelPromise0x0c = new Promise((resolve, reject) => {
        //     this.clearChannelResolve0x0c = resolve;
        //     this.clearChannelReject0x0c = reject;
        // });

        // if the channel search is successful, move it to the proper TCPTransport
        // this.beaconAnomalyEmitter.on("beaconAnomalyDetected", async () => {
        //     // cancel current search() and start a new search()
        //     clearTimeout(this.searchSetTimeout);
        //     await this.search();
        // });

        //todo the listener should take this event
        this.monitorUpdatedEmitter.on("monitorUpdated", async (data: Record<string, any>) => {
            GlobalMethods.debugLog(`CA monitor ${this.name} value updated to`, data);
            this.monitorValue = data;
        })

        this.context.unresolvedChannels[name] = this;
        this.searchBuffer = Buffer.alloc(Constants.MAX_UDP_SEND); // 1024 bytes
        this.initializeSearchBuffer();
        this.searchPV();

    }

    // one UDP packet with 2 commands: CA_PROTO_VERSION (0x00) and CA_PROTO_SEARCH (0x06)
    initializeSearchBuffer() {

        // CA_PROTO_VERSION 0x00, with 0 offset
        Context.generateCAHeader(this.searchBuffer,
            0x00,
            CA_COMMANDS.CA_PROTO_VERSION, // 0x00
            0x00, // payload size
            this.serverSchedulingPriority, // desired priority
            this.context.CA_VERION_MINOR, // version number
            0x00,
            0x00
        );

        // CA_PROTO_SEARCH 0x06
        Context.generateCAHeader(this.searchBuffer,
            16,
            CA_COMMANDS.CA_PROTO_SEARCH, // 0x06
            GlobalMethods.getStringPaddedSize(this.name), // padded size of channel name
            0x00, // DO_REPLY flag, do not use it with UDP
            this.context.CA_VERION_MINOR, // version number
            this.channelClientID, // search ID, the channel client ID is used for simplicity
            this.channelClientID  // duplicate of search ID
        );
        // payload
        this.searchBuffer.write(this.name, 32);
    }


    // dt unit = milli-second
    async searchPV(dt: number = epicsEnvCustom.EPICS_CA_MIN_SEARCH_PERIOD * 1000) {

        const dtMin = epicsEnvCustom.EPICS_CA_MIN_SEARCH_PERIOD * 1000;
        const dtMax = epicsEnv.EPICS_CA_MAX_SEARCH_PERIOD * 1000;

        GlobalMethods.debugLog(`${Date.now()}`);
        let bufferPaddedSize = GlobalMethods.getBufferPaddedSize(this.searchBuffer);
        await this.udpTransport.sendToBroadcastAddresses(this.searchBuffer, 0, bufferPaddedSize);

        this.searchPVTimer = setTimeout(() => {
            let newDt = dt * 2;
            if (newDt > dtMax) {
                dt = dtMax;
            }
            else if (newDt < dtMin) {
                dt = dtMin;
            }
            else {
                dt = dt * 2;
            }
            this.searchPV(dt);
        }, dt);
    }

    stopSearchPV() {
        clearTimeout(this.searchPVTimer);
    }


    //todo: more tests
    // tell server to clear this channel, delete all references to this Channel
    // when (1) CA_PROTO_CLEAR_CHANNEL is sent out, or (2) CA_PROTO_SERVER_DISCONN is received 
    // or (3) TCP connectio is closed
    async closeChannel() {
        // GlobalMethods.debugLog("Closing channel", this.name);
        // // stop search()
        // clearTimeout(this.searchPVTimer);

        // // remove all references of this Channel
        // delete this.tcpTransport?.channels[this.name];

        // // delete this.context.channelsByChannelClientID[this.channelClientID];
        // // delete this.context.channelsByName[this.name];
        // // this.context.unresolvedChannelList = this.context.unresolvedChannelList.filter(element => element !== this);
        // // for (let channelServerID in this.tcpTransport?.channelsByServerID) {
        // //     if (this.tcpTransport?.channelsByServerID[channelServerID] === this) {
        // //         delete this.tcpTransport?.channelsByServerID[channelServerID];
        // //     }
        // // }

        // // all channel monitors are canceled autoamtically on server side
        // // only need to delte the references to these channel monitors
        // for (let subscriptionID in this.context.channelMonitorsBySubscriptionID) {
        //     let channelMonitor = this.context.channelMonitorsBySubscriptionID[subscriptionID];
        //     if (channelMonitor.channel === this) {
        //         // channelMonitor.channel = null;
        //         delete this.context.channelMonitorsBySubscriptionID[subscriptionID];
        //     }
        // }

        // if (this.tcpTransport !== null) {
        //     if (Object.keys(this.tcpTransport.channelsByServerID).length === 0) {
        //         // remove this tcpTansport
        //         TCPTransport.removeTCPTransportAndReconnectChannels(this.tcpTransport);
        //     }
        // }

        // GlobalMethods.debugLog(`Channel ${this.name} cleared`);
    }
    async clearChannel() {
        // GlobalMethods.debugLog("clearing channel", this.name);
        // //todo catch() the exception
        // let buffer0x0c = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE);
        // Context.generateCAHeader(buffer0x0c, 0, 0x0c, 0, 0, 0, this.channelServerID, this.channelClientID);
        // if (this.tcpTransport !== null) {
        //     GlobalMethods.debugLog(`Sending ${buffer0x0c.toString('hex')} to ${this.tcpTransport?.serverAddress}:${this.tcpTransport?.serverPort}`);
        //     await this.tcpTransport.socket.write(buffer0x0c);
        // }
        // await this.clearChannelPromise0x0c;

        // // stop search()
        // clearTimeout(this.searchPVTimer);

        // // remove all references of this Channel
        // delete this.context.channelsByChannelClientID[this.channelClientID];
        // delete this.context.channelsByName[this.name];
        // this.context.unresolvedChannelList = this.context.unresolvedChannelList.filter(element => element !== this);
        // for (let channelServerID in this.tcpTransport?.channelsByServerID) {
        //     if (this.tcpTransport?.channelsByServerID[channelServerID] === this) {
        //         delete this.tcpTransport?.channelsByServerID[channelServerID];
        //     }
        // }
        // // all channel monitors are canceled autoamtically on server side
        // // only need to delte the references to these channel monitors
        // for (let subscriptionID in this.context.channelMonitorsBySubscriptionID) {
        //     let channelMonitor = this.context.channelMonitorsBySubscriptionID[subscriptionID];
        //     if (channelMonitor.channel === this) {
        //         // channelMonitor.channel = null;
        //         delete this.context.channelMonitorsBySubscriptionID[subscriptionID];
        //     }
        // }

        // if (this.tcpTransport !== null) {
        //     if (Object.keys(this.tcpTransport.channelsByServerID).length === 0) {
        //         // remove this tcpTansport
        //         TCPTransport.removeTCPTransportAndReconnectChannels(this.tcpTransport);
        //     }
        // }

        // GlobalMethods.debugLog(`Channel ${this.name} cleared`);
    }

    // 0x12, CA_PROTO_CREATE_CHAN
    async createChannel() {
        const payloadSize = GlobalMethods.getStringPaddedSize(this.name);
        let buffer = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE + payloadSize);
        Context.generateCAHeader(buffer,
            0, // offset
            CA_COMMANDS.CA_PROTO_CREATE_CHAN, // command, 0x12
            payloadSize, // 
            0x00, // reserved
            0x00, // reserved
            this.channelClientID, // channel ID 
            this.context.CA_VERION_MINOR); // 0x0d
        buffer.write(this.name, Constants.CA_MESSAGE_HEADER_SIZE);
        // printMsg(buffer, { address: this.tcpTransport?.serverAddress, port: this.tcpTransport?.serverPort }, "Sending TCP");
        // await this.tcpTransport?.socket.write(buffer);
        await this.tcpTransport?.write(buffer);

    }

    // default mask = 0x05 
    async monitor(dbrType: number = this.dbrType, dataCount: number = this.dataCount, mask: number = 0x05) {
        //todo: throw an exception
        if (this.connectionState !== Channel.CONNECTED) {
            GlobalMethods.errorLog(`${this.name}'s connection state is ${this.connectionState}, cannot monitor`);
            return {};
        }
        let channelMonitor = null;
        let channelMonitorExists = false;
        for (let subscriptionID in this.context.channelMonitorsBySubscriptionID) {
            let existingChannelMonitor = this.context.channelMonitorsBySubscriptionID[subscriptionID];
            if (existingChannelMonitor.mask === mask && existingChannelMonitor.dataCount === dataCount && existingChannelMonitor.dbrType === dbrType) {
                channelMonitor = existingChannelMonitor;
                channelMonitorExists = true;
            }
        }
        if (!channelMonitorExists) {
            channelMonitor = new ChannelMonitor(this, dbrType, dataCount, mask);
        }
        if (channelMonitor !== null) {
            let id = await channelMonitor.runChannelMonitor();
        }
        return channelMonitor;
    }

    updateIoID() {
        // 0xFFFFFFFF
        if (this.context.ioID === 4294967295) {
            this.context.ioID = 0;
        }
        else {
            this.context.ioID++;
        }

        let ioID = this.context.ioID;

        // for read and put notify
        let promiseResolve;
        let promiseReject;
        let promiseFunction = new Promise((resolve, reject) => {
            promiseResolve = resolve;
            promiseReject = reject;
        });

        this.context.ioList[ioID.toString()] = {};
        this.context.ioList[ioID.toString()].channel = this;
        this.context.ioList[ioID.toString()].promiseResolve = promiseResolve;
        this.context.ioList[ioID.toString()].promiseReject = promiseReject;
        this.context.ioList[ioID.toString()].promiseFunction = promiseFunction;

        return ioID;
    }

    async get(dbrType: number = this.dbrType, dataCount: number = this.dataCount) {
        if (this.connectionState !== Channel.CONNECTED) {
            GlobalMethods.errorLog(`${this.name}'s connection state is ${this.connectionState}, cannot get()`);
            return {};
        }

        GlobalMethods.infoLog(`Trying to get('${this.name}') from ${this.tcpTransport?.serverAddress}:${this.tcpTransport?.serverPort}`);

        let ioID = this.updateIoID();
        let promiseFunction = this.context.ioList[ioID.toString()].promiseFunction;
        let promiseReject = this.context.ioList[ioID.toString()].promiseReject;
        let promiseResolve = this.context.ioList[ioID.toString()].promiseResolve;

        let buffer = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE); // 16 bytes
        //todo what if dataCount > CA server's data count
        Context.generateCAHeader(buffer,
            0,
            CA_COMMANDS.CA_PROTO_READ_NOTIFY, // 0x0f
            0, // payload size, must be 0
            dbrType, // desired DBR type
            dataCount, // desired number of elements
            this.channelServerID, // server's channel ID
            ioID); // ioID

        if (this.tcpTransport !== null) {
            await this.tcpTransport.write(buffer);
        }

        // causes unstable issue, 
        // timeout
        // setTimeout(() => { 
        //     console.log("1*****************************")
        //     promiseReject({}) 
        // }, 5000);
        // lifted upon receiving CA_PROTO_READ_NOTIFY reply via TCP
        // or timeout
        let data = null;
        try {
            data = await promiseFunction;
        }
        catch(e) {
            GlobalMethods.infoLog(`Channel ${this.name} get() operation interrupted`, e);
        }

        //todo: close() all sockets: udp and tcp
        // this.context.closeAllSockets();
        return data;
    }




    async put(dbrData: any[], dbrType: number = this.dbrType) {
        // if (this.connectionState !== Channel.CONNECTED) {
        //     GlobalMethods.errorLog(`${this.name}'s connection state is ${this.connectionState}, cannot put()`);
        //     return {};
        // }

        // let ioID = this.updateIoID();
        // let promiseFunction = this.context.ioList[ioID.toString()].promiseFunction;

        // // if dbrData.length > this.dataCount, throw an error
        // if (dbrData.length > this.dataCount) {
        //     GlobalMethods.errorLog(`Channel.put() error: too many elements. ${dbrData.length} > ${this.dataCount}`);
        //     return -1;
        // }

        // // if dbrData.length <= this.dataCount, sequentially write to buffer
        // let buffer0x13 = this.encodeDBRBuffer(dbrData, dbrType);

        // if (this.tcpTransport !== null) {
        //     GlobalMethods.debugLog("Sending", buffer0x13?.toString("hex"), "to", this.tcpTransport?.serverAddress, ":", this.tcpTransport?.serverPort);
        //     await this.tcpTransport.socket.write(buffer0x13);
        // }

        // // promise resolved until server replies 0x13
        // let data = await promiseFunction;
        // GlobalMethods.debugLog("0x13--Channel.put() promise resolved");
        // //todo update ioIDList
        // return data;
    }

    encodeDBRBuffer(dbrData: number[] | string[], dbrType: number = this.dbrType, hasListener: boolean = false) {
        let dataCount = dbrData.length;

        // check elements type consistency
        let dbrElementType = typeof dbrData[0];
        for (let ii = 1; ii < dbrData.length; ii++) {
            let dbrElement = dbrData[ii];
            if (typeof dbrElement !== dbrElementType) {
                GlobalMethods.errorLog(`put() error`);
                //todo may be throw an exception
                return;
            }
        }

        // decode dbr data buffer
        let dbrBufferElements: Buffer[] = [];
        for (let element of dbrData) {
            if (dbrType % 7 === 0) { // DBR_*_STRING
                dbrBufferElements.push(this.encodeDBRBufferString(element));
            }
            else if (dbrType % 7 === 1) {
                dbrBufferElements.push(this.encodeDBRBufferInt(element));
            }
            else if (dbrType % 7 === 2) {
                dbrBufferElements.push(this.encodeDBRBufferFloat(element));
            }
            else if (dbrType % 7 === 3) {
                dbrBufferElements.push(this.encodeDBRBufferEnum(element));
            }
            else if (dbrType % 7 === 4) {
                dbrBufferElements.push(this.encodeDBRBufferChar(element));
            }
            else if (dbrType % 7 === 5) {
                dbrBufferElements.push(this.encodeDBRBufferLong(element));
            }
            else if (dbrType % 7 === 6) {
                dbrBufferElements.push(this.encodeDBRBufferDouble(element));
            }
            else {

                GlobalMethods.errorLog(`Error in dbr buffer dbrType: ${dbrType}`);
            }
        }

        let dbrBufferAllElements = Buffer.concat(dbrBufferElements);
        if (dbrBufferAllElements.length % 8 !== 0) {
            dbrBufferAllElements = Buffer.concat([dbrBufferAllElements, Buffer.alloc(8 - dbrBufferAllElements.length % 8)]);
        }

        // dbrMeta --> dbrBufferMeta
        //todo: listener
        if (!hasListener) {
            let buffer0x13Header = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE);
            Context.generateCAHeader(buffer0x13Header, 0, 0x13, dbrBufferAllElements.length, dbrType, dataCount, this.channelServerID, this.context.ioID);
            let buffer0x13 = Buffer.concat([buffer0x13Header, dbrBufferAllElements]);
            return buffer0x13;
        }
        else {
            let buffer0x04Header = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE);
            Context.generateCAHeader(buffer0x04Header, 0, 0x04, dbrBufferAllElements.length, dbrType, dataCount, this.channelServerID, this.context.ioID);
            let buffer0x04 = Buffer.concat([buffer0x04Header, dbrBufferAllElements]);
            return buffer0x04;
        }
    }

    encodeDBRBufferString(element: string | number) {
        let buffer = Buffer.alloc(40);
        let elementStringfied = "";
        if (typeof element === "number") {
            elementStringfied = element.toString();
        }
        else {
            elementStringfied = element;
        }
        for (let ii = 0; ii < Math.min(elementStringfied.length, 39); ii++) {
            buffer.writeUInt8(elementStringfied.charCodeAt(ii), ii);
        }
        return buffer;
    }

    encodeDBRBufferInt(element: number | string) {

        let elementInt;
        if (typeof element === 'string') {
            elementInt = parseInt(element);
        }
        else {
            elementInt = Math.round(element);
        }

        let buffer = Buffer.alloc(2);
        // writeInt16BE() rounds down the number, so we give it a slightly larger number
        buffer.writeInt16BE(elementInt + 0.001, 0);
        return buffer;
    }

    encodeDBRBufferFloat(element: number | string) {

        let elementFloat;
        if (typeof element === 'string') {
            elementFloat = parseFloat(element);
        }
        else {
            elementFloat = element;
        }

        let buffer = Buffer.alloc(4);
        buffer.writeFloatBE(elementFloat, 0);
        return buffer;
    }

    // same as encodeDBRBufferInt(), except using writeUint16BE()
    encodeDBRBufferEnum(element: number | string) {
        let elementEnum;
        if (typeof element === 'string') {
            elementEnum = parseInt(element);
        }
        else {
            elementEnum = Math.round(element);
        }
        let buffer = Buffer.alloc(2);
        // writeUInt16BE() rounds down the number, so we give it a slightly larger number
        buffer.writeUInt16BE(elementEnum + 0.001, 0);
        return buffer;
    }

    //todo: what does it do with string input??
    encodeDBRBufferChar(element: number | string) {
        let buffer = Buffer.alloc(1);
        if (typeof element === 'number') {
            buffer.writeUInt8(element, 0);
        }
        else if (typeof element === 'string') {
            buffer.writeUInt8(element.charCodeAt(0), 0);
        }
        return buffer;
    }

    encodeDBRBufferLong(element: number | string) {

        let elementLong;
        if (typeof element === 'string') {
            elementLong = parseInt(element);
        }
        else {
            elementLong = Math.round(element);
        }
        let buffer = Buffer.alloc(2);
        // writeInt16BE() rounds down the number, so we give it a slightly larger number
        buffer.writeInt32BE(elementLong + 0.001, 0);
        return buffer;
    }

    encodeDBRBufferDouble(element: number | string) {

        let elementDouble;
        if (typeof element === 'string') {
            elementDouble = parseFloat(element);
        }
        else {
            elementDouble = element;
        }

        let buffer = Buffer.alloc(8);
        buffer.writeDoubleBE(elementDouble, 0);
        return buffer;
    }

    // https://epics.anl.gov/base/R3-16/0-docs/CAproto/index.html#payload-data-types
    dbrBufferMetaSizes: number[] = [
        0, 0, 0, 0, 0, 0, 0,        // DBR_*
        4, 4, 4, 4, 4, 4, 4,        // DBR_STS_*
        12, 12, 12, 12, 12, 12, 12, // DBR_TIME_*
        4, 24, 40, 422, 18, 36, 64, // DBR_GR_*
        4, 28, 48, 422, 20, 44, 80  // DBR_CTRL_*
    ];

    dbrBufferPaddingSizes: number[] = [
        0, 0, 0, 0, 0, 0, 0, // DBR_*
        0, 0, 0, 0, 1, 0, 4, // DBR_STS_*
        0, 2, 0, 2, 3, 0, 4, // DBR_TIME_*
        0, 0, 0, 0, 1, 0, 0, // DBR_GR_*
        0, 0, 0, 0, 1, 0, 0  // DBR_CTRL_*
    ];

    dbrBufferElementSizes: number[] = [
        40, 2, 4, 2, 1, 4, 8, // DBR_*
        40, 2, 4, 2, 1, 4, 8, // DBR_STS_*
        40, 2, 4, 2, 1, 4, 8, // DBR_TIME_*
        40, 2, 4, 2, 1, 4, 8, // DBR_GR_*
        40, 2, 4, 2, 1, 4, 8  // DBR_CTRL_*
    ];

    decodeDBRBuffer(dbrBuffer: Buffer, dbrType: number, dataCount: number) {
        let dbrBufferMetaSize = this.dbrBufferMetaSizes[dbrType];
        let dbrBufferPaddingSize = this.dbrBufferPaddingSizes[dbrType];
        let dbrBufferElementSize = this.dbrBufferElementSizes[dbrType];

        let dbrBufferMeta = dbrBuffer.slice(0, dbrBufferMetaSize);
        let dbrBufferAllElements = dbrBuffer.slice(dbrBufferMetaSize + dbrBufferPaddingSize,
            dbrBufferMetaSize + dbrBufferPaddingSize + dbrBufferElementSize * dataCount);

        let dbrBufferElements: Buffer[] = [];
        GlobalMethods.debugLog(`${dbrBufferMetaSize}, ${dbrBufferPaddingSize}, ${dbrBufferElementSize}, ${dataCount}`);
        for (let ii = 0; ii < dataCount; ii++) {
            dbrBufferElements.push(dbrBufferAllElements.slice(dbrBufferElementSize * ii, dbrBufferElementSize * (ii + 1)));
            GlobalMethods.debugLog(dbrBufferAllElements.slice(dbrBufferElementSize * ii, dbrBufferElementSize * (ii + 1)).toString("hex"));
        }

        // decode dbr meta buffer
        let dbrMeta: Record<string, any> = {};
        if (Math.floor(dbrType / 7) === 0) { // DBR_*
            // do nothing
        }
        else if (Math.floor(dbrType / 7) === 1) { // DBR_STS_*
            dbrMeta = this.decodeDBRBufferSts(dbrBufferMeta);
        }
        else if (Math.floor(dbrType / 7) === 2) { // DBR_TIME_*
            dbrMeta = this.decodeDBRBufferTime(dbrBufferMeta);
        }
        else if (Math.floor(dbrType / 7) === 3) { // DBR_GR_*
            dbrMeta = this.decodeDBRBufferGr(dbrBufferMeta, dbrType);
        }
        else if (Math.floor(dbrType / 7) === 4) { // DBR_CTRL_*
            dbrMeta = this.decodeDBRBufferCtrl(dbrBufferMeta, dbrType);
        }
        GlobalMethods.debugLog(dbrMeta);

        // decode dbr data buffer
        let dbrData: any[] = [];
        for (let element of dbrBufferElements) {
            if (dbrType % 7 === 0) { // DBR_*_STRING
                dbrData.push(this.decodeDBRBufferString(element));
            }
            else if (dbrType % 7 === 1) {
                dbrData.push(this.decodeDBRBufferInt(element));
            }
            else if (dbrType % 7 === 2) {
                dbrData.push(this.decodeDBRBufferFloat(element));
            }
            else if (dbrType % 7 === 3) {
                dbrData.push(this.decodeDBRBufferEnum(element));
            }
            else if (dbrType % 7 === 4) {
                dbrData.push(this.decodeDBRBufferChar(element));
            }
            else if (dbrType % 7 === 5) {
                dbrData.push(this.decodeDBRBufferLong(element));
            }
            else if (dbrType % 7 === 6) {
                dbrData.push(this.decodeDBRBufferDouble(element));
            }
            else {
                GlobalMethods.errorLog("Error in dbr buffer dbrType");
            }
        }
        GlobalMethods.debugLog("Decoded dbrData:", dbrData);

        return {
            ...dbrMeta,
            data: dbrData
        };

    }

    // methods for decoding DBR buffer meta 
    decodeDBRBufferSts(buffer: Buffer) {
        return {
            status: buffer.readUInt16BE(0),
            severity: buffer.readUInt16BE(2),
        }
    }
    decodeDBRBufferTime(buffer: Buffer) {
        return {
            status: buffer.readUInt16BE(0),
            severity: buffer.readUInt16BE(2),
            secondsSinceEpoch: buffer.readUInt32BE(4),
            nanoSeconds: buffer.readUInt32BE(8),
        };
    }

    decodeDBRBufferGr(buffer: Buffer, dbrType: number) {
        let dbrMeta: Record<string, any> = {};
        dbrMeta.status = buffer.readUInt16BE(0);
        dbrMeta.severity = buffer.readUInt16BE(2);
        // dbrType = 21 -- 27
        if (dbrType === 21) {
            // do nothing
        }
        else if (dbrType === 22) {
            dbrMeta.units = buffer.slice(4, 12).toString('utf8').replaceAll('\0', '');
            dbrMeta.upperDisplayLimit = buffer.readInt16BE(12);
            dbrMeta.lowerDisplayLimit = buffer.readInt16BE(14);
            dbrMeta.upperAlarmLimit = buffer.readInt16BE(16);
            dbrMeta.upperWarningLimit = buffer.readInt16BE(18);
            dbrMeta.lowerWarningLimit = buffer.readInt16BE(20);
            dbrMeta.lowerAlarmLimit = buffer.readInt16BE(22);
        }
        else if (dbrType === 23) {
            dbrMeta.precision = buffer.readUInt16BE(4);
            dbrMeta.units = buffer.slice(8, 16).toString('utf8').replaceAll('\0', '');
            dbrMeta.upperDisplayLimit = buffer.readFloatBE(16);
            dbrMeta.lowerDisplayLimit = buffer.readFloatBE(20);
            dbrMeta.upperAlarmLimit = buffer.readFloatBE(24);
            dbrMeta.upperWarningLimit = buffer.readFloatBE(28);
            dbrMeta.lowerWarningLimit = buffer.readFloatBE(32);
            dbrMeta.lowerAlarmLimit = buffer.readFloatBE(36);
        }
        else if (dbrType === 24) {
            dbrMeta.noStr = buffer.readUInt16BE(4);
            dbrMeta.strs = []; //todo, read a 16x24 string array
        }
        else if (dbrType === 25) {
            dbrMeta.units = buffer.slice(4, 12).toString('utf8').replaceAll('\0', '');
            dbrMeta.upperDisplayLimit = buffer.readUInt8(12);
            dbrMeta.lowerDisplayLimit = buffer.readUInt8(13);
            dbrMeta.upperAlarmLimit = buffer.readUInt8(14);
            dbrMeta.upperWarningLimit = buffer.readUInt8(15);
            dbrMeta.lowerWarningLimit = buffer.readUInt8(16);
            dbrMeta.lowerAlarmLimit = buffer.readUInt8(17);
        }
        else if (dbrType === 26) {
            dbrMeta.units = buffer.slice(4, 12).toString('utf8').replaceAll('\0', '');
            dbrMeta.upperDisplayLimit = buffer.readInt32BE(12);
            dbrMeta.lowerDisplayLimit = buffer.readInt32BE(16);
            dbrMeta.upperAlarmLimit = buffer.readInt32BE(20);
            dbrMeta.upperWarningLimit = buffer.readInt32BE(24);
            dbrMeta.lowerWarningLimit = buffer.readInt32BE(28);
            dbrMeta.lowerAlarmLimit = buffer.readInt32BE(32);
        }
        else if (dbrType === 27) {
            dbrMeta.precision = buffer.readUInt16BE(4);
            dbrMeta.units = buffer.slice(8, 16).toString('utf8').replaceAll('\0', '');
            dbrMeta.upperDisplayLimit = buffer.readDoubleBE(16);
            dbrMeta.lowerDisplayLimit = buffer.readDoubleBE(24);
            dbrMeta.upperAlarmLimit = buffer.readDoubleBE(32);
            dbrMeta.upperWarningLimit = buffer.readDoubleBE(40);
            dbrMeta.lowerWarningLimit = buffer.readDoubleBE(48);
            dbrMeta.lowerAlarmLimit = buffer.readDoubleBE(56);
        }
        return dbrMeta;
    }


    decodeDBRBufferCtrl(buffer: Buffer, dbrType: number) {
        let dbrMeta: Record<string, any> = {};
        dbrMeta.status = buffer.readUInt16BE(0);
        dbrMeta.severity = buffer.readUInt16BE(2);
        // dbrType = 21 -- 27
        if (dbrType === 28) {
            // do nothing
        }
        else if (dbrType === 29) {
            dbrMeta.units = buffer.slice(4, 12).toString('utf8').replaceAll('\0', '');
            dbrMeta.upperDisplayLimit = buffer.readInt16BE(12);
            dbrMeta.lowerDisplayLimit = buffer.readInt16BE(14);
            dbrMeta.upperAlarmLimit = buffer.readInt16BE(16);
            dbrMeta.upperWarningLimit = buffer.readInt16BE(18);
            dbrMeta.lowerWarningLimit = buffer.readInt16BE(20);
            dbrMeta.lowerAlarmLimit = buffer.readInt16BE(22);
            dbrMeta.upperCtrlLimit = buffer.readInt16BE(24);
            dbrMeta.lowerCtrlLimit = buffer.readInt16BE(26);
        }
        else if (dbrType === 30) {
            dbrMeta.precision = buffer.readUInt16BE(4);
            dbrMeta.units = buffer.slice(8, 16).toString('utf8').replaceAll('\0', '');
            dbrMeta.upperDisplayLimit = buffer.readFloatBE(16);
            dbrMeta.lowerDisplayLimit = buffer.readFloatBE(20);
            dbrMeta.upperAlarmLimit = buffer.readFloatBE(24);
            dbrMeta.upperWarningLimit = buffer.readFloatBE(28);
            dbrMeta.lowerWarningLimit = buffer.readFloatBE(32);
            dbrMeta.lowerAlarmLimit = buffer.readFloatBE(36);
            dbrMeta.upperCtrlLimit = buffer.readFloatBE(40);
            dbrMeta.lowerCtrlLimit = buffer.readFloatBE(44);
        }
        else if (dbrType === 31) {
            dbrMeta.noStr = buffer.readUInt16BE(4);
            dbrMeta.strs = []; //todo 16x26 char[][]
        }
        else if (dbrType === 32) {
            dbrMeta.units = buffer.slice(4, 12).toString('utf8').replaceAll('\0', '');
            dbrMeta.upperDisplayLimit = buffer.readUInt8(12);
            dbrMeta.lowerDisplayLimit = buffer.readUInt8(13);
            dbrMeta.upperAlarmLimit = buffer.readUInt8(14);
            dbrMeta.upperWarningLimit = buffer.readUInt8(15);
            dbrMeta.lowerWarningLimit = buffer.readUInt8(16);
            dbrMeta.lowerAlarmLimit = buffer.readUInt8(17);
            dbrMeta.upperCtrlLimit = buffer.readUInt8(18);
            dbrMeta.lowerCtrlLimit = buffer.readUInt8(19);
        }
        else if (dbrType === 33) {
            dbrMeta.units = buffer.slice(4, 12).toString('utf8').replaceAll('\0', '');
            dbrMeta.upperDisplayLimit = buffer.readInt32BE(12);
            dbrMeta.lowerDisplayLimit = buffer.readInt32BE(16);
            dbrMeta.upperAlarmLimit = buffer.readInt32BE(20);
            dbrMeta.upperWarningLimit = buffer.readInt32BE(24);
            dbrMeta.lowerWarningLimit = buffer.readInt32BE(28);
            dbrMeta.lowerAlarmLimit = buffer.readInt32BE(32);
            dbrMeta.upperCtrlLimit = buffer.readInt32BE(36);
            dbrMeta.lowerCtrlLimit = buffer.readInt32BE(40);
        }
        else if (dbrType === 34) {
            dbrMeta.precision = buffer.readUInt16BE(4);
            dbrMeta.units = buffer.slice(8, 16).toString('utf8').replaceAll('\0', '');
            dbrMeta.upperDisplayLimit = buffer.readDoubleBE(16);
            dbrMeta.lowerDisplayLimit = buffer.readDoubleBE(24);
            dbrMeta.upperAlarmLimit = buffer.readDoubleBE(32);
            dbrMeta.upperWarningLimit = buffer.readDoubleBE(40);
            dbrMeta.lowerWarningLimit = buffer.readDoubleBE(48);
            dbrMeta.lowerAlarmLimit = buffer.readDoubleBE(56);
            dbrMeta.upperCtrlLimit = buffer.readDoubleBE(64);
            dbrMeta.lowerCtrlLimit = buffer.readDoubleBE(72);
        }
        return dbrMeta;
    }



    // methods to decode DBR buffer payload
    decodeDBRBufferString(buffer: Buffer) {
        let ii = 0;
        for (ii = 0; ii < buffer.length; ii++) {
            if (buffer.readUInt8(ii) === 0) {
                break;
            }
        }
        return buffer.slice(0, ii).toString('utf8');
    }
    decodeDBRBufferInt(buffer: Buffer) {
        return buffer.readInt16BE(0);
    }
    decodeDBRBufferFloat(buffer: Buffer) {
        return buffer.readFloatBE(0);
    }
    decodeDBRBufferEnum(buffer: Buffer) {
        return buffer.readUInt16BE(0);
    }
    decodeDBRBufferChar(buffer: Buffer) {
        return buffer.readUInt8(0);
    }
    decodeDBRBufferLong(buffer: Buffer) {
        return buffer.readInt32BE(0);
    }
    decodeDBRBufferDouble(buffer: Buffer) {
        return buffer.readDoubleBE(0);
    }
    // ------------------------------------

    destroy() { }
}
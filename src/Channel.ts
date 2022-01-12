import { Context } from "./Context";
import { Buffer } from 'buffer';
import { Constants } from "./Constants";
import { TCPTransport } from "./TCPTransport";
import { GlobalMethods } from "./GlobalMethods";

import { EventEmitter } from "events";

export class Channel {
    public static PRIORITY_DEFAULT: number = 0;
    context: Context;
    name: string;
    priority: number;
    channelClientID: number;
    channelServerID: number;
    channelFound: boolean;
    searchSetTimeout: any;
    dbrType: number;

    tcpTransport: TCPTransport | null;

    accessRight: 0 | 1 | 2 | 3 | null;
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

    // resolve when 0x12 CA_PROTO_CREATE_CHAN replies 
    clearChannelResolve0x0c: any;
    clearChannelReject0x0c: any;
    clearChannelPromise0x0c: any;

    searchInterrupted: boolean;

    beaconAnomalyEmitter = new EventEmitter();
    monitorUpdatedEmitter = new EventEmitter();
    monitorValue: Record<string, any> = {};

    // listener: any;
    //todo listener and priority
    constructor(context: Context, name: string, priority: number = 0) {

        this.context = context;
        this.name = name;
        this.priority = priority;
        this.channelClientID = this.context.channelClientID;
        this.channelServerID = 0;
        this.channelFound = false;
        this.tcpTransport = null;
        //todo listener
        // unlike in Java, move initiateSearch out of constructor
        this.dbrType = -1;
        this.accessRight = null;
        this.dataCount = -1;
        this.createChannelPromise0x06 = new Promise((resolve, reject) => {
            this.createChannelResolve0x06 = resolve;
            this.createChannelReject0x06 = reject;
        });

        this.createChannelPromise0x12 = new Promise((resolve, reject) => {
            this.createChannelResolve0x12 = resolve;
            this.createChannelReject0x12 = reject;
        });
        this.searchInterrupted = false;

        this.clearChannelPromise0x0c = new Promise((resolve, reject) => {
            this.clearChannelResolve0x0c = resolve;
            this.clearChannelReject0x0c = reject;
        });

        this.context.unresolvedChannelList.push(this);
        this.beaconAnomalyEmitter.on("beaconAnomalyDetected", async () => {
            // cancel current search() and start a new search()
            clearTimeout(this.searchSetTimeout);
            await this.search();
        });

        this.monitorUpdatedEmitter.on("monitorUpdated", async (data: Record<string, any>) => {
            GlobalMethods.debugLog(`CA monitor ${this.name} value updated to`, data);
            this.monitorValue = data;
        })
    }

    // dt unit = milli-second
    async search(dt: number = 0.1 * 1000) {

        let udpTransport = this.context.udpTransport;
        // 0x00 and 0x06
        let buffer = this.generateChannelSearchMessage(this.channelClientID);
        buffer.write(this.name, 32);
        let bufferPaddedSize = GlobalMethods.getBufferPaddedSize(buffer);
        await udpTransport.sendToBroadcastAddresses(buffer, 0, bufferPaddedSize);

        this.searchSetTimeout = setTimeout(() => {
            if (dt > 120 * 1000) {
                dt = 120 * 1000;
            }
            else if (dt < 0.1 * 1000) {
                dt = 0.1 * 1000;
            }
            else {
                dt = dt * 2;
            }
            this.search(dt);
        }, dt);
    }

    generateChannelSearchMessage(channelClientID: number) {
        let buffer = Buffer.alloc(Constants.MAX_UDP_SEND); // 1024 bytes
        // version request, "command 0x00"
        Context.generateCAHeader(buffer, 0, 0x00, 0x00, 0x01, 0x0d, 0x00, 0x00);
        // search channel request, "command 0x06"
        Context.generateCAHeader(buffer, 16, 0x06, 0x08, 0x05, 0x0d, channelClientID, channelClientID);
        return buffer;
    }

    //todo provide an eventEmitter or Promise
    async generateAndSend0x12Command() {
        GlobalMethods.debugLog("sending 0x12");
        let dataLength = (this.name.length + 1) % 8 === 0 ? this.name.length + 1 : Math.ceil((this.name.length + 1) / 8) * 8;
        let buffer0x12 = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE + dataLength);
        Context.generateCAHeader(buffer0x12, 0, 0x12, dataLength, 0x00, 0x00, this.channelClientID, 0x0d);
        buffer0x12.write(this.name, Constants.CA_MESSAGE_HEADER_SIZE);
        if (this.tcpTransport !== null) {
            await this.tcpTransport.socket.write(buffer0x12);
        }
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

    updateSubscriptionID(dbrType: number, dataCount: number) {
        // 0xFFFFFFFF
        if (this.context.subscriptionID === 4294967295) {
            this.context.subscriptionID = 0;
        }
        else {
            this.context.subscriptionID++;
        }

        let subscriptionID = this.context.subscriptionID;

        let promiseResolve;
        let promiseReject;
        let promiseFunction = new Promise((resolve, reject) => {
            promiseResolve = resolve;
            promiseReject = reject;
        });

        this.context.subscriptionIDList[subscriptionID.toString()] = {};
        this.context.subscriptionIDList[subscriptionID.toString()].channel = this;
        this.context.subscriptionIDList[subscriptionID.toString()].promiseResolve = promiseResolve;
        this.context.subscriptionIDList[subscriptionID.toString()].promiseReject = promiseReject;
        this.context.subscriptionIDList[subscriptionID.toString()].promiseFunction = promiseFunction;

        this.context.subscriptionIDList[subscriptionID.toString()].dbrType = dbrType;
        this.context.subscriptionIDList[subscriptionID.toString()].dataCount = dataCount;
        this.context.subscriptionIDList[subscriptionID.toString()].channelServerID = this.channelServerID;

        return subscriptionID;
    }

    async get(dbrType: number = this.dbrType, dataCount: number = this.dataCount) {

        let ioID = this.updateIoID();
        let promiseFunction = this.context.ioList[ioID.toString()].promiseFunction;
        let promiseReject = this.context.ioList[ioID.toString()].promiseReject;
        let promiseResolve = this.context.ioList[ioID.toString()].promiseResolve;

        let buffer0x15 = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE); // 16 bytes
        //todo what if dataCount > CA server's data count
        Context.generateCAHeader(buffer0x15, 0, 0x0F, 0, dbrType, dataCount, this.channelServerID, ioID);
        GlobalMethods.debugLog("Sending", buffer0x15.toString("hex"), "to", this.tcpTransport?.serverAddress, ":", this.tcpTransport?.serverPort);

        if (this.tcpTransport !== null) {
            await this.tcpTransport.socket.write(buffer0x15);
        }

        // timeout
        setTimeout(() => { promiseReject({}) }, 5000);
        let data = await promiseFunction;
        GlobalMethods.debugLog("Promise resolved");
        return data;
    }


    async monitor(dbrType: number = this.dbrType, dataCount: number = this.dataCount, mask: number = 0x05) {
        if (mask > 15 || mask < 0) {
            return "error";
        }

        //todo find the existing monitor, with same
        // - dbrType
        // - dataCount
        // - channelServerID
        // - subscriptionID
        // In this code, "subscriptionID" is the unique identifier of the monitor (subscription)

        let subscriptionID = this.updateSubscriptionID(dbrType, dataCount);
        let promiseFunction = this.context.subscriptionIDList[subscriptionID.toString()].promiseFunction;
        let promiseReject = this.context.subscriptionIDList[subscriptionID.toString()].promiseReject;
        let promiseResolve = this.context.subscriptionIDList[subscriptionID.toString()].promiseResolve;

        let buffer0x01Header = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE);
        Context.generateCAHeader(buffer0x01Header, 0, 0x01, 16, dbrType, dataCount, this.channelServerID, subscriptionID);
        let buffer0x01Data = Buffer.alloc(16);
        buffer0x01Data.writeUInt16BE(mask, 12);

        let buffer0x01 = Buffer.concat([buffer0x01Header, buffer0x01Data]);

        if (this.tcpTransport !== null) {
            await this.tcpTransport.socket.write(buffer0x01);
        }
        // Promise is resolved when Channel.monitorCancel() (0x02) packet is received
        let data = await promiseFunction;
        GlobalMethods.debugLog(`CA monitor for ${this.name} with subscriptID = ${subscriptionID} canceled`);

        return data;
    }

    // pause ALL CA monitors on this CA server
    monitorPause() {
        let buffer0x08 = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE);
        // CA_PROTO_EVENTS_OFF
        Context.generateCAHeader(buffer0x08, 0, 0x08, 0, 0, 0, 0, 0);
        if (this.tcpTransport !== null) {
            GlobalMethods.debugLog(`sending ${buffer0x08.toString('hex')} to ${this.tcpTransport.serverAddress}:${this.tcpTransport.serverPort}`);
            this.tcpTransport.socket.write(buffer0x08);
        }
    }

    // resume ALL CA monitors on this CA server
    monitorResume() {
        let buffer0x09 = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE);
        // CA_PROTO_EVENTS_ON
        Context.generateCAHeader(buffer0x09, 0, 0x09, 0, 0, 0, 0, 0);
        if (this.tcpTransport !== null) {
            GlobalMethods.debugLog(`sending ${buffer0x09.toString('hex')} to ${this.tcpTransport.serverAddress}:${this.tcpTransport.serverPort}`);
            this.tcpTransport.socket.write(buffer0x09);
        }
    }

    // 0x02
    monitorCancel(subscriptionID?: number) {
        if (subscriptionID === undefined) {
            //todo search 
            for (let ii in this.context.subscriptionIDList) {
                if (this.context.subscriptionIDList[ii].channel === this) {
                    subscriptionID = parseInt(ii);
                    break;
                }
            }
        }
        if (subscriptionID === undefined) {
            return false;
        }

        try {
            let existingSubscription = this.context.subscriptionIDList[subscriptionID.toString()];
            // let channel = existingSubscription.channel;
            let dataType = existingSubscription.dataType;
            let dataCount = existingSubscription.dataCount;
            let channelServerID = existingSubscription.channel.channelServerID;
            let buffer0x02 = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE);
            Context.generateCAHeader(buffer0x02, 0, 0x02, 0, dataType, dataCount, channelServerID, subscriptionID);
            if (this.tcpTransport !== null) {
                GlobalMethods.debugLog("Sending", buffer0x02?.toString("hex"), "to", this.tcpTransport?.serverAddress, ":", this.tcpTransport?.serverPort);
                this.tcpTransport.socket.write(buffer0x02);
            }
        } catch (e) {
            return false;
        }
    }

    async put(dbrData: any[], dbrType: number = this.dbrType) {
        let ioID = this.updateIoID();
        let promiseFunction = this.context.ioList[ioID.toString()].promiseFunction;

        // if dbrData.length > this.dataCount, throw an error
        if (dbrData.length > this.dataCount) {
            GlobalMethods.errorLog(`Channel.put() error: too many elements. ${dbrData.length} > ${this.dataCount}`);
            return -1;
        }

        // if dbrData.length <= this.dataCount, sequentially write to buffer
        let buffer0x13 = this.encodeDBRBuffer(dbrData, dbrType);

        if (this.tcpTransport !== null) {
            GlobalMethods.debugLog("Sending", buffer0x13?.toString("hex"), "to", this.tcpTransport?.serverAddress, ":", this.tcpTransport?.serverPort);
            await this.tcpTransport.socket.write(buffer0x13);
        }

        // promise resolved until server replies 0x13
        let data = await promiseFunction;
        GlobalMethods.debugLog("0x13--Channel.put() promise resolved");
        return data;
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
        GlobalMethods.debugLog(dbrData);

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
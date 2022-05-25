#!/usr/bin/env node

//HH CAJContext.java
//HH CAJContext.java extends Context.java, and it is the only class that extends Context.java

//todo: move ioList to channel, but ioid is still global
// because it is only in CA_PROTO_READ_NOTIFY, CA_PROTO_WRITE_NOTIFY, and CA_PROTO_WRITE 

import { Buffer } from "buffer";
import { Constants } from "./Constants";
import { Channel } from "./Channel";
import { UDPTransport } from './UDPTransport';
import { TCPTransport } from "./TCPTransport";
import { GlobalMethods } from "./GlobalMethods";
import { Beacon } from "./Beacon";
import { ChannelMonitor } from "./ChannelMonitor";
import { epicsEnv, epicsEnvCustom, type_env } from "./global"
import { Worker, isMainThread, workerData } from "worker_threads";
import { EventEmitter } from "events";
import { CA_MSG_HEADER_OFFSETS, CA_EXT_MSG_HEADER_OFFSETS } from "."
import { TCPTransports } from "./TCPTransports";

type stateType = 0 | 1 | 2;

export type type_io = {
    channel: Channel,
    promiseResolve: any,
    promiseReject: any,
    promiseFunction: Promise<string>,
}

export class Context {

    // caRepeaterRegistered: boolean;
    // channelsByName: Record<string, any>;
    // channelsByChannelClientID: Record<string, any>;
    // tcpTransportList: TCPTransport[];
    // tcpTransportsByAddressPort: Record<string, TCPTransport>;
    // contextInitializedPromise: Promise<string>;
    // contextInitializedResolve: any;
    // contextInitializedReject: any;

    readonly VERSION_MAJOR: number = 2022;
    readonly VERSION_MINOR: number = 5;
    readonly VERSION_REVISION: number = 0;

    readonly NOT_INITIALIZED: stateType = 0;
    readonly INITIALIZED: stateType = 1;
    readonly DESTROYED: stateType = 2;
    state: stateType;

    readonly CA_VERION_MAJOR: number = 4;
    readonly CA_VERION_MINOR: number = 13;

    // beacon
    beaconsByAddressPort: Record<string, Beacon>;

    channelClientID: number;

    // monitor
    subscriptionID: number = 0;
    channelMonitorsBySubscriptionID: Record<string, ChannelMonitor>;

    // Promise
    CA_REPEATER_CONFIRM_Promise: Promise<string>;
    CA_REPEATER_CONFIRM_Resolve: any;
    CA_REPEATER_CONFIRM_Reject: any;

    // these 3 lists, together with TCPTransport.channels must be changed at the same time
    resolvedChannelsByClientID: Record<string, Channel>;
    unresolvedChannelsByClientID: Record<string, Channel>;
    unresolvedChannelsByName: Record<string, Channel>;

    // IOID: used by CA_PROTO_READ_NOTIFY, CA_PROTO_WRITE_NOTIFY, and CA_PROTO_WRITE
    ioID: number = 0;
    ioList: Record<string, type_io>;

    // possibly multiple TCPTransports for a client
    tcpTransports: TCPTransports;
    // one UDPTransport for a client
    udpTransport: UDPTransport;

    repeaterThread: Worker | null;

    constructor(env: Record<string, any> = {}) {

        const showAllInfo = false;
        GlobalMethods.DEBUG = showAllInfo;
        GlobalMethods.SHOWINFO = showAllInfo;
        GlobalMethods.SHOWERROR = showAllInfo;


        this.loadConfiguration(env);

        this.unresolvedChannelsByName = {};
        this.unresolvedChannelsByClientID = {};
        this.resolvedChannelsByClientID = {};

        this.repeaterThread = null;

        this.channelClientID = 0;

        this.state = this.NOT_INITIALIZED;

        this.tcpTransports = new TCPTransports(this);
        this.udpTransport = new UDPTransport(this);

        // todo
        this.beaconsByAddressPort = {};
        // todo
        // this.subscriptionIDList = {};

        this.ioList = {};
        this.channelMonitorsBySubscriptionID = {};

        // Block at 2 places:
        //   (1) let UDPTransport sending periodic UDP packet CA_REPEATER_REGISTER to CA Repeater 
        //       If the Promise is fulfilled or rejected, the setInterval() is canceled
        //   (2) Context.initialize()
        //       If the Promise is fulfilled, the Context.initialize() continues to set Context.state
        //       If the Promise is rejected, return Context.initialize() immediately, which causes
        //       the subsequent functions, like Context.createChannel(), fails or returns "null"
        this.CA_REPEATER_CONFIRM_Promise = new Promise((resolve, reject) => {
            this.CA_REPEATER_CONFIRM_Resolve = resolve;
            this.CA_REPEATER_CONFIRM_Reject = reject;
        })
    }

    // (1) start CARepeater in a worker thread if CA_REPEATER_PORT (5065) is not used 
    // (2) bind UDPTransport socket
    // (3) register client to CA Repeater, proceed after registration is successful
    async initialize() {

        if (this.state === this.DESTROYED) {
            GlobalMethods.infoLog("Context destroyed");
            return;
        }
        else if (this.state === this.INITIALIZED) {
            GlobalMethods.infoLog("Context initialized.");
            return;
        }

        GlobalMethods.infoLog("Initializing context");
        GlobalMethods.infoLog("Starting CARepeater on port", epicsEnv["EPICS_CA_REPEATER_PORT"]);

        this.repeaterThread = new Worker("./CARepeater/CARepeater.js");
        this.repeaterThread.on("error", (err: any) => {
            GlobalMethods.errorLog(err);
        })

        // bind UDP socket
        try {
            await this.udpTransport.socket.bind();
            this.udpTransport.port = this.udpTransport.socket.address().port;
            this.udpTransport.address = this.udpTransport.socket.address().address;
        }
        catch (e) {
            GlobalMethods.errorLog(`UDPTransport socket binding failure. ${e}`);
            //todo what we should do?
        }

        this.udpTransport.socket.on('error', (error: any) => {
            GlobalMethods.errorLog(`${this.udpTransport.socket.address()} error: ${error}`);
            //todo what we should do? restart UDPTransport there is an error on client's UDP?
        });
        this.udpTransport.socket.on('message',
            async (msg: Buffer, info: Record<string, any>) => {
                await this.udpTransport.messageHandler(msg, info);
            }
        );

        // when CARepeater worker thread is ready, send CA_REPEATER_REGISTER = 0x18 to CARepeater
        this.repeaterThread.on("message", async (msg: any) => {
            if (msg === "ready") {
                await this.udpTransport.registerToCARepeater();
            }
            if (msg === "terminate") {
                GlobalMethods.infoLog("CA Repeater thread terminated");
                this.repeaterThread?.terminate();
            }
        })

        // block until the UDPTransport is registered to CARepeater (received 0x11 CA_REPEATER_CONFIRM via UDP)
        try {
            await this.CA_REPEATER_CONFIRM_Promise;
        }
        catch (e) {
            GlobalMethods.errorLog(`${e}`);
            return;
        }

        this.state = this.INITIALIZED;
        // this.contextInitializedResolve("Context initialized");
        GlobalMethods.infoLog("Context.initialize() success");
    }

    // stop the running of Context
    // (1) reject Promises 
    // (2) cancel all Timers
    // (3) stop all unresolved channel searches, the unresolved channels are managed by Context
    // (4) terminate CA Repeater thread
    destroy() {
        // (1) reject Promises 
        this.CA_REPEATER_CONFIRM_Reject("");
        for (let ii in this.ioList) {
            let io = this.ioList[ii];
            io.promiseReject(`IOID ${ii} CA_PROTO_READ_NOTIFY interrupted`);
        }
        // (2) cancel all Timers
        // (3) stop all unresolved channel searches, the unresolved channels are managed by Context
        for (let ii in this.unresolvedChannelsByName) {
            let unresolvedChannel = this.unresolvedChannelsByName[ii];
            unresolvedChannel.stopSearchPV();
        }
        // (4) terminate CA Repeater thread
        this.repeaterThread?.postMessage("terminate");
    }

    async terminate() {
        this.state = this.DESTROYED;
        this.destroy();
        await this.tcpTransports.destroy();
        await this.udpTransport.destroy();
    }

    //todo listener
    async createChannel(name: string) {
        if (this.state !== this.INITIALIZED) {
            GlobalMethods.errorLog("Context initialization failed, quit creating channel");
            return (null);
        }
        //todo: ensure this number does not overflow
        this.channelClientID++;
        let newChannel = new Channel(this, name);
        await newChannel.searchPV();
        await newChannel.create();
        return newChannel;
    }


    // used by CA_PROTO_READ_NOTIFY 0x0f, CA_PROTO_WRITE_NOTIFY 0x13, and CA_PROTO_WRITE 0x04
    createIo(channel: Channel) {
        //todo: a property mechanism to recycle ioIDs, 4.3E9 can only handle 10k IOs per second for 5 days
        // 0xFFFFFFFF
        if (this.ioID === 4294967295) {
            this.ioID = 0;
        }
        else {
            this.ioID++;
        }

        let ioID = this.ioID;

        let promiseResolve;
        let promiseReject;
        let promiseFunction = new Promise<string>((resolve, reject) => {
            promiseResolve = resolve;
            promiseReject = reject;
        });

        this.ioList[ioID.toString()] = {
            channel: channel,
            promiseResolve: promiseResolve,
            promiseReject: promiseReject,
            promiseFunction: promiseFunction,
        };
        return ioID;
    }

    static generateCAHeader(buffer: Buffer, offset: number, command: number, payloadSize: number, dataType: number, dataCount: number, pararmeter1: number, pararmeter2: number) {
        // payloadSize >= 65535 Bytes or dataCount >= 65535 Bytes
        const useExtendedHeader: boolean = payloadSize >= 0xFFFF || dataCount >= 0xFFFF;
        const requiredSize = useExtendedHeader ? Constants.CA_EXTENDED_MESSAGE_HEADER_SIZE : Constants.CA_MESSAGE_HEADER_SIZE;
        // let buffer: Buffer = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE);
        if (buffer.length < requiredSize) {
            buffer = Buffer.alloc(requiredSize);
        }
        if (!useExtendedHeader) {
            buffer.writeInt16BE(command, offset + CA_MSG_HEADER_OFFSETS.command);
            buffer.writeInt16BE(payloadSize, offset + CA_MSG_HEADER_OFFSETS.payloadSize);
            buffer.writeInt16BE(dataType, offset + CA_MSG_HEADER_OFFSETS.dataType);
            buffer.writeInt16BE(dataCount, offset + CA_MSG_HEADER_OFFSETS.dataCount);
            buffer.writeInt32BE(pararmeter1, offset + CA_MSG_HEADER_OFFSETS.parameter1);
            buffer.writeInt32BE(pararmeter2, offset + CA_MSG_HEADER_OFFSETS.parameter2);
        }
        else {
            buffer.writeInt16BE(command, offset + CA_EXT_MSG_HEADER_OFFSETS.command);
            buffer.writeInt16BE(0xFFFF, offset + 2);
            buffer.writeInt16BE(dataType, offset + CA_EXT_MSG_HEADER_OFFSETS.dataType);
            buffer.writeInt16BE(0x0000, offset + 6);
            buffer.writeInt32BE(pararmeter1, offset + CA_EXT_MSG_HEADER_OFFSETS.parameter1);
            buffer.writeInt32BE(pararmeter2, offset + CA_EXT_MSG_HEADER_OFFSETS.parameter2);
            buffer.writeInt32BE(payloadSize, offset + CA_EXT_MSG_HEADER_OFFSETS.payloadSize);
            buffer.writeInt32BE(dataCount, offset + CA_EXT_MSG_HEADER_OFFSETS.dataCount);
        }
        return buffer;
    }
    loadConfiguration(env: Partial<type_env>) {
        for (let name in epicsEnv) {

            switch (name) {
                case "EPICS_CA_ADDR_LIST":
                case "EPICS_CA_NAME_SERVERS":
                    if (typeof env[name] !== "undefined") {
                        epicsEnv[name] = [...(env[name] || [])];
                        break;
                    }
                    if (process.env[name]) {
                        epicsEnv[name] = (process.env[name] || "").split(" ").filter((element: string) => {
                            if (element.trim() === "") {
                                return false;
                            }
                            else {
                                return true;
                            }
                        });
                    }
                    break;
                case "EPICS_CA_AUTO_ADDR_LIST":
                    if (env[name]) {
                        epicsEnv[name] = env[name] || false;
                        break;
                    }
                    if (process.env[name]) {
                        if (process.env[name]?.toUpperCase() === "YES") {
                            epicsEnv[name] = true;
                            break;
                        }
                        else if (process.env[name]?.toUpperCase() === "NO") {
                            epicsEnv[name] = false;
                            break;
                        }
                    }
                    break;
                case "EPICS_CA_CONN_TMO":
                case "EPICS_CA_BEACON_PERIOD":
                case "EPICS_CA_REPEATER_PORT":
                case "EPICS_CA_SERVER_PORT":
                case "EPICS_CA_MAX_ARRAY_BYTES":
                case "EPICS_CA_MAX_SEARCH_PERIOD":
                case "EPICS_TS_MIN_WEST":
                    if (env[name]) {
                        epicsEnv[name] = env[name];
                        break;
                    }
                    if (process.env[name]) {
                        if (parseFloat(process.env[name] as string)) {
                            epicsEnv[name] = parseFloat(process.env[name] as string);
                            break;
                        }
                    }
                    break;
                default:
                    break;
            }

        }
    }
}

export class RepeaterRegistrationTask {
    context: Context;
    repeaterPort: number;
    repeaterAddress: string;
    constructor(context: Context, repeaterPort: number, repeaterAddress: string) {
        this.context = context;
        this.repeaterPort = repeaterPort;
        this.repeaterAddress = repeaterAddress;
    }
}

//HH CATransport.java

// let a = new Context();
// let b = a.createChannel('val3');

// for (let tmp = 28; tmp <= 34; tmp++) {
//     setTimeout(() => {
//         b.then((channel) => {
//             return channel.get(tmp);
//         }).then((data) =>
//             GlobalMethods.infoLog(data));
//     }, 1000 + tmp/10*1000)
// }

// let a = new Context();

// async function fun1(pvName: string) {
//     let b = await a.createChannel(pvName);
//     let count = 0.78;
//     // let c = await b.get();
//     let c = await b.put([count++]);
//     setInterval(async () => {

//         let c = await b.put([count++]);
//         // let c = await b.get(4);
//         // console.log(c);
//     }, 1000);
// }

// let b: Channel;

// async function fun2(pvName: string) {
//     let b = await a.createChannel(pvName);
//     // b = await a.createChannel(pvName);
//     // let count = 0.78;
//     let c = await b.get();
//     // let c = b.monitor(20);
//     // GlobalMethods.debugLog("c =", c);
//     // setTimeout(() => c.cancelChannelMonitor(), 5000);
//     // setTimeout(() => { b.clearChannel() }, 10000);
//     // return c;

// }



// fun1('val3');

// fun2("TGT_LWS2:Tnk_TE1710D:MinAvg")
// fun2('val2');


// setTimeout(() => b.monitorCancel(),
//     5000);

// setTimeout(async () => a.clearChannel('val2'),
//     5000);

// setTimeout(async () => console.log("----------------------", a.subscriptionIDList),
//     2000);

// setTimeout(async () => console.log("----------------------", a.subscriptionIDList),
//     6000);

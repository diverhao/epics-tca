#!/usr/bin/env node

//HH CAJContext.java
//HH CAJContext.java extends Context.java, and it is the only class that extends Context.java

import { Buffer } from "buffer";
import { Constants } from "./Constants";
import { Channel } from "./Channel";
import { UDPTransport } from './UDPTransport';
import { TCPTransport } from "./TCPTransport";
import { GlobalMethods } from "./GlobalMethods";
import { Beacon } from "./Beacon";
import { ChannelMonitor } from "./ChannelMonitor";
import { epicsEnv } from "./global"
import { Worker, isMainThread, workerData } from "worker_threads";
import { EventEmitter } from "events";
import {CA_MSG_HEADER_OFFSETS, CA_EXT_MSG_HEADER_OFFSETS} from "."
import { TCPTransports } from "./TCPTransports";

type stateType = 0 | 1 | 2;

export class Context {

    readonly VERSION_MAJOR: number = 2022;
    readonly VERSION_MINOR: number = 5;
    readonly VERSION_REVISION: number = 0;

    readonly NOT_INITIALIZED: stateType = 0;
    readonly INITIALIZED: stateType = 1;
    readonly DESTROYED: stateType = 2;
    state: stateType;

    readonly CA_VERION_MAJOR: number = 4;
    readonly CA_VERION_MINOR: number = 13;


    caRepeaterRegistered: boolean;
    udpTransport: UDPTransport;
    channelsByName: Record<string, any>;
    channelsByChannelClientID: Record<string, any>;

    // tcpTransportList: TCPTransport[];
    tcpTransportsByAddressPort: Record<string, TCPTransport>;
    beaconsByAddressPort: Record<string, Beacon>;

    channelClientID: number;

    ioID: number = 0;
    ioList: Record<string, any>;

    subscriptionID: number = 0;
    channelMonitorsBySubscriptionID: Record<string, ChannelMonitor>;

    registerToCARepeaterEvent: EventEmitter;

    unresolvedChannels: Record<string, Channel>;

    tcpTransports: TCPTransports;

    constructor(env: Record<string, any> = {}) {
        GlobalMethods.DEBUG = true;

        // CA configurations
        this.loadConfiguration(env); // empty method
        // this.serverPort = Constants.CA_SERVER_PORT; // 5064
        // this.repeaterPort = Constants.CA_REPEATER_PORT; // 5065
        // default is true, EPICS_CA_AUTOADDRESS_LIST, the broadcast address of current computer is added to udpTransport.broadcastAddresses
        // this.autoAddressList = true;
        // this.addressList = ['160.91.228.17']; // from system environment EPICS_CA_ADDR_LIST, or from somewhere else
        // this.addressList = ['10.1.20.200']; // from system environment EPICS_CA_ADDR_LIST, or from somewhere else
        // this.addressList = ['10.1.20.108']; // from system environment EPICS_CA_ADDR_LIST, or from somewhere else
        // this.addressList = ['160.91.167.59']; // from system environment EPICS_CA_ADDR_LIST, or from somewhere else
        // this.addressList = ['10.159.213.48']; // from system environment EPICS_CA_ADDR_LIST, or from somewhere else
        this.channelClientID = 0;

        this.tcpTransports = new TCPTransports(this);

        this.registerToCARepeaterEvent = new EventEmitter();

        // CA status
        this.state = this.NOT_INITIALIZED;
        this.caRepeaterRegistered = false;

        // CA data structures
        this.channelsByChannelClientID = {};
        this.channelsByName = {};
        // one UDPTransport
        this.udpTransport = new UDPTransport(this);
        // many TCPTransports
        // this.tcpTransportList = [];
        this.tcpTransportsByAddressPort = {};
        this.beaconsByAddressPort = {};

        this.ioList = {};
        // this.subscriptionIDList = {};
        this.channelMonitorsBySubscriptionID = {};
        this.unresolvedChannels = {};
    }


    loadConfiguration(env: Record<string, any>) {
        for (let name in epicsEnv) {

            switch (name) {
                case "EPICS_CA_ADDR_LIST":
                case "EPICS_CA_NAME_SERVERS":
                    if (env[name]) {
                        epicsEnv[name] = [...env[name]];
                        break;
                    }
                    if (process.env[name]) {
                        epicsEnv[name] = process.env[name]?.split(" ").filter((element: string) => {
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
                        epicsEnv[name] = env[name];
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

    //HH same as checkState()
    // start CARepeater if CA_REPEATER_PORT is not used 
    // register to CA Repeater, does not proceed until registration is successful
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
        const repeaterThread = new Worker("./CARepeater/CARepeater.js");
        repeaterThread.on("error", (err: any) => {
            console.log(err);
        })

        // bind a random port on 127.0.0.1
        await this.udpTransport.socket.bind();
        this.udpTransport.socket.on('error', (error: any) => {
            console.log(`${this.udpTransport.socket.address()} error: ${error}`);
            //todo shall we close() it? If so, what to do next?
        });
        this.udpTransport.socket.on('message',
            async (msg: Buffer, info: Record<string, any>) => {
                await this.udpTransport.messageHandler(msg, info);
            }
        );

        // when CARepeater worker thread is ready, send CA_REPEATER_REGISTER = 0x18 to CARepeater
        repeaterThread.on("message", async (msg: any) => {
            if (msg === true) {
                // send 0x18 every second
                await this.udpTransport.registerToCARepeater();
            }
        })

        // block until the UDPTransport is registered to CARepeater
        await new Promise((resolve, reject) => {
            this.registerToCARepeaterEvent.on("success", () => {
                resolve(0);
            })
        })

        this.state = this.INITIALIZED;
        GlobalMethods.infoLog("Context.initialize() finished");
    }

    //todo listener and priority
    async createChannel(name: string, timeout: number = 1000) {
        await this.initialize();
        this.channelClientID++;
        
        // let channelClientID = this.channelClientID;

        let newChannel = new Channel(this, name);

        // // this.channelsByName[`${newChannel.name}\0${newChannel.priority.toString()}`] = newChannel;
        // this.channelsByName[`${newChannel.name}`] = newChannel;
        // this.channelsByChannelClientID[channelClientID.toString()] = newChannel;

        // // 0x00 and 0x06 commands, response of 0x06 command is in UDPTransport.messageHandler()
        // await newChannel.search(0.1 * 1000);

        // resolve after CA server successfully sends 0x06 (CA_PROTO_SEARCH) response via UDP
        await newChannel.createChannelPromise0x06;
        // resolve after CA server successfully sends 0x12 (CA_PROTO_CREATE_CHAN) response via TCP
        await newChannel.createChannelPromise0x12;

        // return newChannel;
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

//HH TransportRegistry.java
//HH no plan to use it
class TCPTransportRegistry {
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

let a = new Context();

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

let b: Channel;

async function fun2(pvName: string) {
    await a.createChannel(pvName);
    // b = await a.createChannel(pvName);
    // let count = 0.78;
    // let c = await b.get();
    // let c = b.monitor(20);
    // GlobalMethods.debugLog("c =", c);
    // setTimeout(() => c.cancelChannelMonitor(), 5000);
    // setTimeout(() => { b.clearChannel() }, 10000);
    // return c;

}



// fun1('val3');

// fun2("TGT_LWS2:Tnk_TE1710D:MinAvg")
fun2('val2');


// setTimeout(() => b.monitorCancel(),
//     5000);

// setTimeout(async () => a.clearChannel('val2'),
//     5000);

// setTimeout(async () => console.log("----------------------", a.subscriptionIDList),
//     2000);

// setTimeout(async () => console.log("----------------------", a.subscriptionIDList),
//     6000);

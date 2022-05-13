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
type stateType = 0 | 1 | 2;

export class Context {
    readonly NOT_INITIALIZED: stateType = 0;
    readonly INITIALIZED: stateType = 1;
    readonly DESTROYED: stateType = 2;
    state: stateType;
    autoAddressList: boolean;

    serverPort: number;
    repeaterPort: number;

    addressList: string[];

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


    unresolvedChannelList: Channel[];

    constructor() {
        GlobalMethods.DEBUG = true;

        // CA configurations
        this.loadConfiguration(); // empty method
        this.serverPort = Constants.CA_SERVER_PORT; // 5064
        this.repeaterPort = Constants.CA_REPEATER_PORT; // 5065
        // default is true, EPICS_CA_AUTOADDRESS_LIST, the broadcast address of current computer is added to udpTransport.broadcastAddresses
        this.autoAddressList = true;
        this.addressList = ['160.91.228.17']; // from system environment EPICS_CA_ADDR_LIST, or from somewhere else
        // this.addressList = ['10.1.20.200']; // from system environment EPICS_CA_ADDR_LIST, or from somewhere else
        // this.addressList = ['10.1.20.108']; // from system environment EPICS_CA_ADDR_LIST, or from somewhere else
        // this.addressList = ['160.91.167.59']; // from system environment EPICS_CA_ADDR_LIST, or from somewhere else
        // this.addressList = ['10.159.213.48']; // from system environment EPICS_CA_ADDR_LIST, or from somewhere else
        this.channelClientID = 0;

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
        this.unresolvedChannelList = [];
    }

    //todo: load from different places: system env, customized config file, default
    loadConfiguration() {
    }

    //HH same as checkState()
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

        this.state = this.INITIALIZED;

        //todo start CARepeater
        GlobalMethods.infoLog("Starting CARepeater");

        // bind a random port on 127.0.0.1, e.g. 53565
        await this.udpTransport.socket.bind();

        // if the socke has an error
        this.udpTransport.socket.on('error', (error: any) => {
            console.log(`${this.udpTransport.socket.address()} error: ${error}`);
            //todo shall we close() it? If so, what to do next?
        });

        // when the UDP socket receives a message
        this.udpTransport.socket.on('message',
            async (msg: Buffer, info: Record<string, any>) => {
                await this.udpTransport.messageHandler(msg, info);
            }
        );

        this.udpTransport.updateBroadcastAddresses();

        // talk to CARepeater: send CA_REPEATER_REGISTER = 0x18 to 127.0.0.1:5065
        // expect to receive a reply, which will be processed by the UDPTransport.messageHandler()
        this.udpTransport.registerToCARepeater();

        GlobalMethods.infoLog("Context.initialize() finished");
    }

    //todo listener and priority
    async createChannel(name: string, timeout: number = 1000) {
        await this.initialize();
        this.channelClientID++;
        let channelClientID = this.channelClientID;

        let newChannel = new Channel(this, name);

        // this.channelsByName[`${newChannel.name}\0${newChannel.priority.toString()}`] = newChannel;
        this.channelsByName[`${newChannel.name}`] = newChannel;
        this.channelsByChannelClientID[channelClientID.toString()] = newChannel;

        // 0x00 and 0x06 commands, response of 0x06 command is in UDPTransport.messageHandler()
        await newChannel.search(0.1 * 1000);

        // resolve after CA server successfully sends 0x06 (CA_PROTO_SEARCH) response via UDP
        await newChannel.createChannelPromise0x06;
        // resolve after CA server successfully sends 0x12 (CA_PROTO_CREATE_CHAN) response via TCP
        await newChannel.createChannelPromise0x12;

        return newChannel;
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
            buffer.writeInt16BE(command, offset + 0);
            buffer.writeInt16BE(payloadSize, offset + 2);
            buffer.writeInt16BE(dataType, offset + 4);
            buffer.writeInt16BE(dataCount, offset + 6);
            buffer.writeInt32BE(pararmeter1, offset + 8);
            buffer.writeInt32BE(pararmeter2, offset + 12);
        }
        else {
            buffer.writeInt16BE(command, offset + 0);
            buffer.writeInt16BE(0xFFFF, offset + 2);
            buffer.writeInt16BE(dataType, offset + 4);
            buffer.writeInt16BE(0x0000, offset + 6);
            buffer.writeInt32BE(pararmeter1, offset + 8);
            buffer.writeInt32BE(pararmeter2, offset + 12);
            buffer.writeInt32BE(payloadSize, offset + 16);
            buffer.writeInt32BE(dataCount, offset + 20);
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

async function fun1(pvName: string) {
    let b = await a.createChannel(pvName);
    let count = 0.78;
    // let c = await b.get();
    let c = await b.put([count++]);
    setInterval(async () => {

        let c = await b.put([count++]);
        // let c = await b.get(4);
        // console.log(c);
    }, 1000);
}

let b: Channel;

async function fun2(pvName: string) {
    b = await a.createChannel(pvName);
    let count = 0.78;
    // let c = await b.get();
    let c = b.monitor(20);
    // GlobalMethods.debugLog("c =", c);
    // setTimeout(() => c.cancelChannelMonitor(), 5000);
    setTimeout(() => {b.clearChannel()}, 10000);
    // return c;

}



// fun1('val3');

fun2("TGT_LWS2:Tnk_TE1710D:MinAvg")
// fun2('val22');

// setTimeout(() => b.monitorCancel(),
//     5000);

// setTimeout(async () => a.clearChannel('val2'),
//     5000);

// setTimeout(async () => console.log("----------------------", a.subscriptionIDList),
//     2000);

// setTimeout(async () => console.log("----------------------", a.subscriptionIDList),
//     6000);

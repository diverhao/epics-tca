import { Context } from './Context';
import { Buffer } from 'buffer';
import { CARepeater } from './CARepeater';
import { GlobalMethods } from './GlobalMethods';
import { Channel } from './Channel';
import { TCPTransport } from './TCPTransport';
import { Constants } from './Constants';
// In Java:
// BeaconResponse.internalHandleResponse() is invoked every time beacon arrives
// it invokes  CABeaconHandler.beaconNotify(), where in this beaconNotify()
// it invokes  CABeaconHandler.updateBeaconPeriod(). This method is to calcualate
// beacon signal anomaly. If there is an anomaly, updateBeaconPeriod() returns false
// If there is an anomaly, CABeaconHandler.changedTransport() is invoked:
//  - this CATransport that represents the TCP connection is NOT removed from CAContext.TransportRegistry
//  - CATransport.changedTransport() is invoked, where all its "CAJChannel" clients' method are invoked
//    - CAJChannel.transportChanged() invoked for each of above CATransport's "CAJChannel" clients
//      - if this CAJChannel is DISCONNECTED, CAJChannel.initiateSearch() invoked: send 0x06 UDP packets to EPICS_CA_ADDR_LIST
// when beacon anomaly occurs:


export class Beacon {
    context: Context;
    tcpTransport: TCPTransport | null;

    port: number;
    address: string;
    lastBeaconPeriod: number; // milli-seconds
    lastBeaconTime: number; // milli-second
    lastBeaconID: number;
    // thisBeaconID: number;
    count: number;
    periodStablized: boolean;
    averageBeaconPeriod: number;
    version: number;
    readonly Number_MIN_VALUE: number = -3000000000000; // about 100 years

    beaconAnomalyDetectionSetTimeout: any;
    beaconAnomalyDetectionSetTimeout2: any;

    constructor(contex: Context, message: Buffer) {

        this.version = message.readUInt16BE(4);
        this.port = message.readUInt16BE(6);
        let addressInt = message.readUInt32BE(12);
        this.address = CARepeater.ipInt2String(addressInt);

        this.lastBeaconPeriod = this.Number_MIN_VALUE;
        this.lastBeaconTime = this.Number_MIN_VALUE;
        this.count = 0;
        this.lastBeaconID = -1;
        // this.thisBeaconID = Number_MIN_VALUE;
        this.context = contex;
        this.periodStablized = false;
        this.averageBeaconPeriod = this.Number_MIN_VALUE;
        this.tcpTransport = null;

        this.beaconAnomalyDetectionSetTimeout = null;
        this.beaconAnomalyDetectionSetTimeout2 = null;
    }
    //todo: what does it do? vs UDPTransport.ts line 95
    // see Channel.ts
    beaconAnomalyNotify() {
        GlobalMethods.errorLog("beaconAnomalyNotify fired: restart search() for unresolved channels");
        for (let unresolvedChannel of this.context.unresolvedChannelList) {
            GlobalMethods.debugLog(`Searching ${unresolvedChannel.name}`);
            clearTimeout(unresolvedChannel.searchSetTimeout);
            unresolvedChannel.search();
        }
    }

    // In java:
    // it invokes CATransport.timeout(30000) after
    // CA client receives a beacon. It means after 30s the code below is
    // executed. Meanwhile, if the next beacon arrives normally (after 15 seconds)
    // the timeout() task is canceled. However, if the next beacon is 
    // not arrived within 30 seconds, the timeout() task is not canceled, then
    // the timeout() content is executed: it either sends an beacon echo 
    // to the CA server or run "unresponsiveTransport()"
    // this "unresponsiveTransport()" lets all this CATransport's "CAJChannel"
    // to invoke CAJChannel.transportUnresponsive(), which simply set connection
    // state to DISCONNECTED.

    beaconArrivalNotify() {
    }

    // no need:
    // CABeaconHandler.changedTransport() in Java
    // just modify the connectionState to ConnectionState.DISCONNECTED in CAJChannel.java 
    // then initiateSearch() this channel

    //HH CABeaconHandler.java.updateBeaconPeriod()
    //todo: must fire up beaconAnomalyNotify() at 
    // Q: what is the difference of return value and beaconAnomalyNotify??
    beaconAnomalyDetection(thisBeaconID: number) {

        clearTimeout(this.beaconAnomalyDetectionSetTimeout);

        if (this.tcpTransport === null) {
            if (this.context.tcpTransportsByAddressPort[`${this.address}:${this.port}`] !== undefined) {
                this.tcpTransport = this.context.tcpTransportsByAddressPort[`${this.address}:${this.port}`];
                this.tcpTransport.beacon = this;
            }

            // for (let existingTcpTransport of this.context.tcpTransportList) {
            //     if (this.address === existingTcpTransport.serverAddress && this.port === existingTcpTransport.serverPort) {
            //         this.tcpTransport = existingTcpTransport;
            //         this.tcpTransport.beacon = this;
            //         break;
            //     }
            // }
        }

        // handle CA server not responsive: network down, server power loss, CA server TCP quits abruptly
        this.beaconAnomalyDetectionSetTimeout = setTimeout(() => {
            GlobalMethods.errorLog(`CA server ${this.address}:${this.port} has no beacon in 30 seconds`);
            if (this.tcpTransport !== null) {
                // send an echo: CA_PROTO_ECHO, 0x17
                let buffer0x17 = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE);
                Context.generateCAHeader(buffer0x17, 0, 0x17, 0, 0, 0, 0, 0);
                this.tcpTransport.socket.write(buffer0x17);
                this.beaconAnomalyDetectionSetTimeout2 = setTimeout(() => {
                    GlobalMethods.errorLog(`CA server ${this.address}:${this.port} has no response of 0x17 (CA_PROTO_ECHO), reconnect TCP ...`);
                    TCPTransport.removeTCPTransportAndReconnectChannels(this.tcpTransport);
                }, 5000);
            }
        }, 30 * 1000);

        // calculate and handl beacon anomaly

        let thisBeaconTime = Date.now();

        // 1st beacon, returns early
        if (this.lastBeaconTime === this.Number_MIN_VALUE) {
            this.beaconAnomalyNotify();
            if (this.version >= 10) {
                this.lastBeaconID = thisBeaconID;
            }
            this.lastBeaconTime = thisBeaconTime;
            // this.beaconArrivalNotify();
            return false;
        }

        // newer version EPICS server
        if (this.version >= 10) {
            let beaconIDAdvance;
            // normal situation
            if (thisBeaconID >= this.lastBeaconID) {
                beaconIDAdvance = thisBeaconID - this.lastBeaconID;
            }
            else {
                beaconIDAdvance = (0x00000000FFFFFFFF - this.lastBeaconID) + thisBeaconID;
                return false;
            }

            this.lastBeaconID = thisBeaconID;

            //todo: try to understand what is this
            // throw out sequence numbers just prior to, or the same as, the last one received 
            // (this situation is probably caused by a temporary duplicate route )
            if (beaconIDAdvance === 0 || beaconIDAdvance > 0x00000000FFFFFFFF - 256) {
                return false;
            }

            //todo: try to understand what is this
            // throw out sequence numbers that jump forward by only a few numbers 
            // (this situation is probably caused by a duplicate route 
            //  or a beacon due to input queue overun)
            if (beaconIDAdvance > 1 && beaconIDAdvance < 4) {
                this.lastBeaconTime = thisBeaconTime;
                return false;
            }
        }

        let networkChange: boolean = false;
        let thisBeaconPeriod = thisBeaconTime - this.lastBeaconTime;

        // 2nd beacon, the 1st beacon returns early
        if (this.averageBeaconPeriod < 0) {
            this.averageBeaconPeriod = thisBeaconPeriod;
            // this.beaconArrivalNotify();
        }
        // 3rd, 4th, ... beacon
        else {
            //todo: understand this
            if (thisBeaconPeriod >= this.averageBeaconPeriod * 1.25) {
                //todo: understand this
                if (thisBeaconPeriod >= this.averageBeaconPeriod * 3.25) {
                    this.beaconAnomalyNotify();
                    networkChange = true;
                }
                else if (!this.periodStablized) {
                    this.averageBeaconPeriod = thisBeaconPeriod;
                    // this.beaconArrivalNotify();
                }
                else {
                    this.beaconAnomalyNotify();
                }
            }
            else if (this.periodStablized && thisBeaconPeriod <= (this.averageBeaconPeriod * 0.8)) {
                this.beaconAnomalyNotify();
                networkChange = true;
            }
            // all OK, or still stabilizing
            else {
                this.periodStablized = true;
                // this.beaconArrivalNotify();
            }

            if (networkChange) {
                this.periodStablized = false;
                this.averageBeaconPeriod = -1;
            }
            else {
                // update a running average period
                this.averageBeaconPeriod = thisBeaconPeriod * 0.125 + this.averageBeaconPeriod * 0.875;
            }


        }

        this.lastBeaconTime = thisBeaconTime;
        return networkChange;
    }

}
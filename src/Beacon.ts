import { Context } from './Context';
import { Buffer } from 'buffer';
import { CARepeater } from './CARepeater';

export class Beacon {
    port: number;
    address: string;
    lastBeaconPeriod: number; // milli-seconds
    lastBeaconTime: number; // milli-second
    lastBeaconID: number;
    // thisBeaconID: number;
    count: number;
    context: Context;
    periodStablized: boolean;
    averageBeaconPeriod: number;
    version: number;
    readonly Number_MIN_VALUE: number = -3000000000000; // about 100 years
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
    }
    //todo: what does it do?
    beaconAnomalyNotify() {

    }
    beaconArrivalNotify() {

    }

    //HH CABeaconHandler.java.updateBeaconPeriod()
    beaconAnomalyDetection(message: Buffer) {

        let thisBeaconTime = Date.now();
        let thisBeaconID = message.readUInt32BE(8);

        // 1st beacon, returns early
        if (this.lastBeaconTime === this.Number_MIN_VALUE) {
            this.beaconAnomalyNotify();
            if (this.version >= 10) {
                this.lastBeaconID = thisBeaconID;
            }
            this.lastBeaconTime = thisBeaconTime;
            this.beaconArrivalNotify();
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
            this.beaconArrivalNotify();
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
                    this.beaconArrivalNotify();
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
                this.beaconArrivalNotify();
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
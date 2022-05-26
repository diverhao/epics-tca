import { TCPTransport } from "./TCPTransport";
import { isIPaddr } from ".";
import { GlobalMethods } from "./GlobalMethods";
import { Beacon } from "./Beacon";
import { Context } from "./Context";

export class TCPTransports {
    // key: serverIP:serverPort:serverSchedulingPriority
    tcpTransports: Record<string, TCPTransport>;
    beacon: Beacon | null;
    context: Context;

    constructor(context: Context) {
        this.tcpTransports = {};
        this.beacon = null;
        this.context = context;
    }

    async closeSockets() {
        for (let ii in this.tcpTransports) {
            let tcpTransport = this.tcpTransports[ii];
            await tcpTransport.socket.destroy();
        }
    }

    add(tcpTransport: TCPTransport) {
        const key = `${tcpTransport.serverAddress}:${tcpTransport.serverPort}:${tcpTransport.serverSchedulingPriority}`;
        if (!this.tcpTransports[key]) {
            this.tcpTransports[key] = tcpTransport;
        }
    }

    private removeByTCPTransport(tcpTransport: TCPTransport) {
        const key = `${tcpTransport.serverAddress}:${tcpTransport.serverPort}:${tcpTransport.serverSchedulingPriority}`;
        delete this.tcpTransports[key];
    }

    private removeByServerAddress(serverAddress: string) {
        const keys = Object.keys(this.tcpTransports);
        const validKeys = keys.filter((key: string) => {
            if (key.includes(serverAddress)) {
                return true;
            }
            else {
                return false;
            }
        });
        validKeys.forEach((key: string) => {
            delete this.tcpTransports[key];
        });
    }

    async destroy(hard: boolean = true) {
        for (let key in this.tcpTransports) {
            const tcpTransport = this.tcpTransports[key];
            await tcpTransport.destroy(hard);
        }
    }

    remove(item: string | TCPTransport) {
        if (typeof item === "string") {
            if (isIPaddr.test(item)) {
                this.removeByServerAddress(item);
            }
            else {
                GlobalMethods.errorLog("Wrong input for TCPTransports.remove()");
            }
        }
        else if (item instanceof TCPTransport) {
            this.removeByTCPTransport(item);
        }
        else {
            GlobalMethods.errorLog("Wrong input for TCPTransports.remove()");
        }
    }

    processBeacon(beaconPort: number, beaconAddress: string, beaconID: number, version: number) {
        const beaconKey = `${beaconAddress}:${beaconPort}`;
        const keys = Object.keys(this.tcpTransports);
        keys.forEach((key: string) => {
            if (key.includes(beaconKey)) {
                const tcpTransport = this.tcpTransports[key];
                if (this.tcpTransports[key] === null) {
                    // tcpTransport.beacon = new Beacon(this.context, beaconPort, beaconAddress, beaconID, version);
                }
                else {
                    //todo: beacon anomaly determination
                    tcpTransport.beacon?.beaconAnomalyDetection(beaconID);
                }
            }
        });
        //todo: move to processBeacon() function
        // let beaconAnomalyDetected = beacon.beaconAnomalyDetection(thisBeaconID);
        // GlobalMethods.debugLog(`beaconAnomalyDetected = ${beaconAnomalyDetected}`);
        // if (beaconAnomalyDetected) {

        //     GlobalMethods.debugLog(`Beacon anomaly detected from ${info.address}:${info.port}`);
        //     GlobalMethods.debugLog(`Restart search for unresolved ${this.context.unresolvedChannelList.length} channels`);

        //     // remove this beacon from this.beaconList
        //     // this.beaconList.filter(item => item !== beacon);
        //     delete this.context.beaconsByAddressPort[`${address}:${port}`];

        //     // restart all unresolved channel searches, just like Beacon.beaconAnomalyNotify()
        //     for (let unresolvedChannel of this.context.unresolvedChannelList) {
        //         // cancel current search() and start a new search()
        //         clearTimeout(unresolvedChannel.searchPVTimer);
        //         await unresolvedChannel.searchPV();
        //         // unresolvedChannel.beaconAnomalyEmitter.emit("beaconAnomalyDetected");
        //     }

        // }

    }

}
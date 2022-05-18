import { TCPTransport } from "./TCPTransport";
import { isIPaddr } from ".";
import { GlobalMethods } from "./GlobalMethods";
import { Beacon } from "./Beacon";
import { Context } from "./Context";

export class TCPTransports {
    // key: serverIP:serverPort:priority
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
            await tcpTransport.closeSocket();
        }
    }

    add(tcpTransport: TCPTransport) {
        const key = `${tcpTransport.serverAddress}:${tcpTransport.serverPort}:${tcpTransport.serverSchedulingPriority}`;
        this.tcpTransports[key] = tcpTransport;
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
                    tcpTransport.beacon = new Beacon(this.context, beaconPort, beaconAddress, beaconID, version);
                }
                else {
                    //todo: beacon anomaly determination
                    tcpTransport.beacon?.beaconAnomalyDetection(beaconID);
                }
            }
        });
    }

}
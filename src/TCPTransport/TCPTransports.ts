import { TCPTransport } from "./TCPTransport";
import { isIPaddr } from "../Global/GlobalMethods";
import { Beacon } from "../Beacon/Beacon";
import { Context } from "../Context/Context";
import { GlobalMethods } from "../Global/GlobalMethods";

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


    // there is no destroySoft() in TCPTransports
    destroyHard() {
        for (let key in this.tcpTransports) {
            GlobalMethods.infoLog(`TCPTransport ${key} destroyed`);
            const tcpTransport = this.tcpTransports[key];
            tcpTransport.destroyHard();
        }
    }

    remove(item: string | TCPTransport) {
        if (typeof item === "string") {
            if (isIPaddr(item)) {
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

    public getTCPTransport = (key: string) : TCPTransport | undefined => {
        return this.tcpTransports[key];
    }

    // addressAndPort address:port
    public getTCPTransportsByAddressAndPort = (addressAndPort: string) : TCPTransport[] => {
        const result: TCPTransport[] = [];
        for (let key in this.tcpTransports) {
            if (key.split(":").slice(0,2).join(":") === addressAndPort) {
                const tcpTransport = this.tcpTransports[key];
                result.push(tcpTransport);
            }
        }
        return result;
    }

    // processBeacon(message: Buffer, info: Record<string, any>) {

    //     let beaconPort = message.readUInt16BE(CA_MSG_HEADER_OFFSETS.serverPort);
    //     let beaconAddressInt = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter2);
    //     let beaconAddress = ipInt2String(beaconAddressInt);
    //     let beaconID = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter1);
    //     let version = message.readUInt16BE(CA_MSG_HEADER_OFFSETS.dataType);


    //     const beaconKey = `${beaconAddress}:${beaconPort}`;
    //     const tcpTransportKeys = Object.keys(this.tcpTransports);

    //     for (let tcpTransportKey of tcpTransportKeys) {
    //         let tcpTransportKeyReduced = tcpTransportKey.split(":")[0] + ":" + tcpTransportKey.split(":")[1];
    //         if (tcpTransportKeyReduced === beaconKey) {
    //             let tcpTransport = this.tcpTransports[tcpTransportKey];
    //             // empty function
    //             tcpTransport.processBeacon(message, info);
    //         }
    //     }

    //     // keys.forEach((key: string) => {
    //     //     if (key.includes(beaconKey)) {
    //     //         const tcpTransport = this.tcpTransports[key];
    //     //         if (this.tcpTransports[key] === null) {
    //     //             // tcpTransport.beacon = new Beacon(this.context, beaconPort, beaconAddress, beaconID, version);
    //     //         }
    //     //         else {
    //     //             //todo: beacon anomaly determination
    //     //             tcpTransport.beacon?.beaconAnomalyDetection(beaconID);
    //     //         }
    //     //     }
    //     // });
    //     //todo: move to processBeacon() function
    //     // let beaconAnomalyDetected = beacon.beaconAnomalyDetection(thisBeaconID);
    //     // GlobalMethods.debugLog(`beaconAnomalyDetected = ${beaconAnomalyDetected}`);
    //     // if (beaconAnomalyDetected) {

    //     //     GlobalMethods.debugLog(`Beacon anomaly detected from ${info.address}:${info.port}`);
    //     //     GlobalMethods.debugLog(`Restart search for unresolved ${this.context.unresolvedChannelList.length} channels`);

    //     //     // remove this beacon from this.beaconList
    //     //     // this.beaconList.filter(item => item !== beacon);
    //     //     delete this.context.beaconsByAddressPort[`${address}:${port}`];

    //     //     // restart all unresolved channel searches, just like Beacon.beaconAnomalyNotify()
    //     //     for (let unresolvedChannel of this.context.unresolvedChannelList) {
    //     //         // cancel current search() and start a new search()
    //     //         clearTimeout(unresolvedChannel.searchPVTimer);
    //     //         await unresolvedChannel.searchPV();
    //     //         // unresolvedChannel.beaconAnomalyEmitter.emit("beaconAnomalyDetected");
    //     //     }

    //     // }

    // }

}
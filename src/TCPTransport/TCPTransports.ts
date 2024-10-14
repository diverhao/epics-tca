import { TCPTransport } from "./TCPTransport";
import { isIPaddr } from "../Global/GlobalMethods";
import { GlobalMethods } from "../Global/GlobalMethods";

export class TCPTransports {
    tcpTransports: Record<string, TCPTransport>;

    constructor() {
        this.tcpTransports = {};
    }

    add(tcpTransport: TCPTransport) {
        const key = `${tcpTransport.getServerAddress()}:${tcpTransport.getServerPort()}:${tcpTransport.getServerSchedulingPriority()}`;
        if (!this.tcpTransports[key]) {
            this.tcpTransports[key] = tcpTransport;
        }
    }

    private removeByTCPTransport(tcpTransport: TCPTransport) {
        const key = `${tcpTransport.getServerAddress()}:${tcpTransport.getServerPort()}:${tcpTransport.getServerSchedulingPriority()}`;
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

}
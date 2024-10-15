import { TCPTransport } from "./TCPTransport";
import { GlobalMethods } from "../Global/GlobalMethods";

/**
 * Registry for all TCPTransport objects.
 */
export class TCPTransports {

    tcpTransports: Record<string, TCPTransport> = {};

    constructor() {
    }

    // ------------------ add/remove TCPTransoport ------------------

    addTcpTransport = (tcpTransport: TCPTransport) => {
        const key = tcpTransport.getKey();
        if (!this.tcpTransports[key]) {
            this.tcpTransports[key] = tcpTransport;
        }
    }

    removeTcpTransport = (tcpTransport: TCPTransport) => {
        const key = tcpTransport.getKey();
        delete this.tcpTransports[key];
    }

    // -------------------------- getters ---------------------------

    getTCPTransport = (key: string): TCPTransport | undefined => {
        return this.tcpTransports[key];
    }

    /**
     * Get all TCPTransport objects according to the address and port.
     * 
     * The input is the beacon key format.
     */
    getTCPTransportsByAddressAndPort = (addressAndPort: string): TCPTransport[] => {
        const result: TCPTransport[] = [];
        for (let key in this.tcpTransports) {
            if (key.split(":").slice(0, 2).join(":") === addressAndPort) {
                const tcpTransport = this.tcpTransports[key];
                result.push(tcpTransport);
            }
        }
        return result;
    }

    // ----------------------- destroy ------------------------------

    /**
     * Destroy hard this TCPTransoports.
     * 
     * There is no destroySoft for the TCPTransoports, it always comes with Context, whose 
     * destroy type is only destroyHard.
     */
    destroyHard = () => {
        for (let key in this.tcpTransports) {
            GlobalMethods.infoLog(`TCPTransport ${key} destroyed`);
            const tcpTransport = this.tcpTransports[key];
            tcpTransport.destroyHard();
        }
    }


}
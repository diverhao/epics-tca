// declare var exports: Record<string, any> | undefined;


import { Buffer } from "buffer";
import { Socket, createSocket } from "dgram";

import { CA_MSG_HEADER_OFFSETS } from "../Global/Constants";
import { CA_MSG_HEADER_SIZE } from "../Global/Constants";
import { CA_COMMANDS } from "../Global/Constants";
import { printMsg } from "../Global/GlobalMethods";
import { ipString2Int } from "../Global/GlobalMethods";
import { GlobalMethods } from "../Global/GlobalMethods";
import { Environment } from "../Global/Environment";
import os from "os";
import { parentPort } from "worker_threads";

export type type_udp_message_info = {
    address: string,
    family: string,
    port: number,
    size: number,
};

// process.on("uncaughtException", (err: any, origin: any) => {
// 	GlobalMethods.errorLog("uncaughtException caught", err, origin);
// });

/**
 * This thread is attached to the main process. When the main process ends, it is also terminated.
 */
export class CARepeater {
    public socket: Socket | undefined = undefined;
    public clients: CARepeaterClient[] = [];
    private _repeaterPort: number = -1;
    private checkClientsInterval: NodeJS.Timeout | undefined = undefined;

    // default port: 5065
    constructor(port: number = 5065) {
        let showAllInfo = false;
        GlobalMethods.DEBUG = showAllInfo;
        GlobalMethods.SHOWINFO = showAllInfo;
        GlobalMethods.SHOWERROR = showAllInfo;
        this._repeaterPort = port;
        this.clients = [];
    }

    /**
     * Create dgram socket for CA repeater and bind to the designated port
     */
    private createAndBindSocket = (port: number): Socket => {
        const socket = createSocket({
            type: "udp4",
            reuseAddr: true,
        });

        socket.bind(
            {
                // listen to the "port" for all network interfaces
                port: port,
                // bind to wildcard addresses
            },
            () => {
                GlobalMethods.infoLog(`EPICS CARepeater service starting, listening to port ${port} ...`);
            }
        );
        return socket;
    };

    /**
     * Create and bind socket, listen to the messages
     */
    run = async () => {

        const caRepeaterIsRunning = await this.caRepeaterIsRunning();
        if (caRepeaterIsRunning) {
            GlobalMethods.infoLog(`There is already a CA Repeater running. Quit.`);
            this.quit();
            return;
        }

        try {
            const socket = this.createAndBindSocket(this.getRepeaterPort());

            socket.on("listening", () => {
            })

            socket.on("error", (e: Error) => {
                GlobalMethods.errorLog(`Error occurs on CARepeater port ${this.getRepeaterPort()}, closing socket.`);
                GlobalMethods.errorLog(e);
                // close socket, it throws an exception if the socket is already closed
                try {
                    socket.close();
                } catch (e) {
                    GlobalMethods.errorLog(`socket is already closed`);
                }
                // remove all clients
                for (let client of this.clients) {
                    this.removeClient(client);
                }
            });

            socket.on("message", (msg: Buffer, info: type_udp_message_info) => {
                printMsg(msg, info, "Received UDP");
                if (info.size >= CA_MSG_HEADER_SIZE) {
                    const command: number = msg.readInt16BE(CA_MSG_HEADER_OFFSETS.command);
                    if (command === CA_COMMANDS.CA_REPEATER_REGISTER) {
                        // a new CA client wants to register
                        this.handle_CA_REPEATER_REGISTER(msg, info);
                    } else if (command === CA_COMMANDS.CA_PROTO_RSRV_IS_UP) {
                        // server beacon
                        this.handle_CA_PROTO_RSRV_IS_UP(msg, info);
                    } else {
                        GlobalMethods.infoLog(`The above message is neither CA_REPEATER_REGISTER nor CA_PROTO_RSRV_IS_UP, skip.`);
                    }
                }
            });

            this.socket = socket;

            // start interval to check clients
            let period = Environment.getInstance().getEnv("EPICS_CA_REPEATER_CLIENT_CHECK_TIME");
            // Environment.getInstance().printAllEnvPretty();
            if (typeof period !== "number") {
                period = 20;
            }
            this.checkClientsInterval = setInterval(() => {
                this.checkClients();
            }, period * 1000)
        } catch (e) {
            GlobalMethods.errorLog(e);
        }
    }

    checkClients = () => {
        for (let client of this.clients) {
            client.checkClient();
        }
    }

    /**
     * Process the message for client registration
     */
    handle_CA_REPEATER_REGISTER = (msg: Buffer, info: type_udp_message_info) => {
        const clientPort = info.port;
        const clientAddress = info.address;

        // make sure the registration request is from local computer
        let clientIsLocal = false;
        const interfaces = os.networkInterfaces();
        for (let iface of Object.values(interfaces)) {
            if (clientIsLocal) {
                break;
            }
            if (iface !== undefined) {
                for (let alias of iface) {
                    const addr = alias.address;
                    if (addr === clientAddress) {
                        clientIsLocal = true;
                        break;
                    }
                }
            }
        }
        if (clientIsLocal === false) {
            return;
        }

        // check if the client is already registered
        let newClient: CARepeaterClient | undefined = undefined;
        for (let client of this.clients) {
            const clientPortTmp = client.clientPort;
            const clientAddressTmp = client.clientAddress;
            if (clientPort === clientPortTmp && clientAddressTmp === clientAddress) {
                // there is already a client for it
                newClient = client;
                break;
            }
        }

        // register the repeater's client if it is a new client
        if (newClient === undefined) {
            newClient = new CARepeaterClient(clientPort, clientAddress, this);
            // send the CA_REPEATER_CONFIRM upon bind
            newClient.createBindAndConnectSocket();
            this.clients.push(newClient);
        } else {
            // send the CA_REPEATER_CONFIRM even the client already exists
            newClient.send_CA_REPEATER_CONFIRM_msg();
        }
    };

    // practically this forward all received message to its clients
    handle_CA_PROTO_RSRV_IS_UP = (msg: Buffer, info: type_udp_message_info) => {
        let addressInt = ipString2Int(info.address);
        if (addressInt === undefined) {
            GlobalMethods.errorLog(`Error parsing IP address ${addressInt}`);
        } else {
            // in case the incoming beacon does not contain CA server IP
            msg.writeUInt32BE(addressInt, CA_MSG_HEADER_OFFSETS.parameter2);
            // fanout message to all CA clients
            for (let client of this.clients) {
                printMsg(msg, { address: client.clientAddress, port: client.clientPort }, "Sending UDP");
                client.forward_CA_PROTO_RSRV_IS_UP_msg(msg);
            }
        }
    };

    /**
     * Remove a client
     *  (1) close the client's socket
     *  (2) remove the client object from this.clients
     *  (3) if there is no client left, quit CA Repeater
     */
    removeClient = (client: CARepeaterClient) => {
        // (1)
        client.quit();
        // (2)
        for (let ii = 0; ii < this.clients.length; ii++) {
            const clientTmp = this.clients[ii];
            if (clientTmp === client) {
                this.clients.splice(ii, 1);
                break;
            }
        }
        // (3)
        if (this.clients.length === 0) {
            // this.quit();
        }
    };

    /**
     * Check if a port is bound to UDP.
     * 
     * It is done by trying to bind this port using reuseAddr = false option. 
     * 
     * @returns {boolean} true if the port is already bound, false if the port is not bound to any process.
     */
    static portIsBoundInUDP = async (port: number): Promise<boolean> => {
        let resolveFunc: any;
        const promise = new Promise<boolean>((resolve, reject) => {
            resolveFunc = resolve;
        })
        const socket = createSocket({
            type: "udp4",
            reuseAddr: false,
        });
        socket.on("error", () => {
            // this port is bound by udp
            resolveFunc(true);
        })
        socket.on("listening", () => {
            // this port is not bound by udp
            resolveFunc(false);
        })

        socket.bind({
            port: port,
            // bind to wildcard addresses
        });
        try {
            const result = await promise;
            try {
                socket.close();
            } catch (e) {
                GlobalMethods.errorLog(`socket is already closed`);
            }
            return result;
        } catch (e) {
            try {
                socket.close();
            } catch (e) {
                GlobalMethods.errorLog(`socket is already closed`);
            }
            return true;
        }
    }

    quit = () => {
        // close the socket
        try {
            this.socket?.close();
        } catch (e) {
            GlobalMethods.errorLog(`socket is already closed`);
        }
        this.socket = undefined;
        // clear interval
        clearInterval(this.checkClientsInterval);
        // quit all clients
        for (let client of this.clients) {
            client.quit();
        }
        // quit the process, better not use process.exit()
        parentPort?.close();
    }

    caRepeaterIsRunning = async (): Promise<boolean> => {
        return await CARepeater.portIsBoundInUDP(this.getRepeaterPort());
    }

    // ------------------- getters -----------------------

    getRepeaterPort = () => {
        return this._repeaterPort;
    }

}

/**
 * Represent a client of CA repeater
 */
class CARepeaterClient {
    // a socket dedicated to sending messages to client
    socket: Socket | undefined = undefined;
    // remote client's address and port
    clientAddress: string;
    clientPort: number;
    repeater: CARepeater;
    constructor(port: number, address: string, repeater: CARepeater) {
        // client's port and address
        this.clientAddress = address;
        this.clientPort = port;
        this.repeater = repeater;
    }

    /**
     * Check if the client is alive by trying to bind client's UDP port with reuseAddr = false
     * If the binding fails, that means the client is still alive, do nothing
     * If the binding is successful, it means the client is dead, remove this client
     */
    checkClient = async () => {
        const portIsBound = await CARepeater.portIsBoundInUDP(this.clientPort);
        if (portIsBound) {
            // client is alive, do nothing
        } else {
            // client is dead, remove it
            GlobalMethods.infoLog(`CARepeater client ${this.clientAddress}:${this.clientPort} removed.`);
            this.repeater.removeClient(this);
        }
    };

    /**
     * Create a random port UDP socket used for talking to the client's UDP port
     * i.e. forward beacon from IOC to client
     * 
     * This socket is dedicated for this client
     */
    createBindAndConnectSocket = () => {
        const socket = createSocket({
            type: "udp4",
            reuseAddr: false,
        });
        socket.on("error", () => {
            GlobalMethods.errorLog(`CARepeater client ${this.clientAddress}:${this.clientPort} error, closing socket.`);
            this.repeater.removeClient(this);
        });
        socket.on("connect", () => {
            // send out "CA_REPEATER_CONFIRM", bind a random port for this client
            this.send_CA_REPEATER_CONFIRM_msg();
        });

        // associate the socket with the remote port and remote address
        // if fails, the above 'error' event is emitted
        // if succeeds, the above 'connect' event is emitted
        // it binds a random port and with only one network interface
        socket.connect(this.clientPort, this.clientAddress);
        this.socket = socket;
    }

    public send_CA_REPEATER_CONFIRM_msg = () => {
        const msg = Buffer.alloc(CA_MSG_HEADER_SIZE);
        msg.writeUInt16BE(CA_COMMANDS.CA_REPEATER_CONFIRM, CA_MSG_HEADER_OFFSETS.command);
        const clientAddressInt = ipString2Int(this.clientAddress);
        if (clientAddressInt === undefined) {
            GlobalMethods.errorLog(`Error parsing IP address ${this.clientAddress}`);
        } else {
            msg.writeUInt32BE(clientAddressInt, CA_MSG_HEADER_OFFSETS.parameter2);
            printMsg(msg, { address: this.clientAddress, port: this.clientPort }, "Sending UDP: ");
            this.socket?.send(msg);
        }
    };

    public forward_CA_PROTO_RSRV_IS_UP_msg = (msg: Buffer) => {
        printMsg(msg, { address: this.clientAddress, port: this.clientPort }, "Sending UDP: ");
        this.socket?.send(msg);
    };

    send = (msg: Buffer) => {
        try {
            this.socket?.send(msg);
        } catch (e) {
            GlobalMethods.errorLog(`Failed to send out message: socket is closed`);
        }
    }

    quit = () => {
        try {
            this.socket?.close();
        } catch (e) {
            GlobalMethods.errorLog(`socket is already closed`);
        }
        this.socket = undefined;
    }

}

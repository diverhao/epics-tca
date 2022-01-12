import { Buffer } from 'buffer';
import { Socket, createSocket } from "dgram";
import process from 'process';

const MESSAGE_HEADER_SIZE: number = 16;
const CA_REPEATER_REGISTER: number = 0x18;
const CA_PROTO_RSRV_IS_UP: number = 0x0d;
const CA_REPEATER_CONFIRM: number = 0x11;
const CA_PROTO_VERSION: number = 0x00;

process.on('uncaughtException', (err: any, origin: any) => {
    console.log('uncaughtException caught');
});

export class CARepeater {

    public socket: Socket;
    public clients: Record<string, any>[];
    // public clients: this.Client;

    constructor(port: number = 5065) {
        this.socket = createSocket('udp4', () => { console.log(` --- `) });
        this.socket.bind(port);
        this.socket.on('error', () => {
            console.log(`error on socket ${port}, closing socket`);
            this.socket.close();
        });
        this.clients = [];
    }

    run() {
        let isFirst: boolean = true;
        let zeroTime: number = 0;

        try {
            // port 5065 is lisening
            this.socket.on('message',
                async (msg: Buffer, info: Record<string, any>) => {
                    if (isFirst === true) {
                        zeroTime = Date.now();
                        isFirst = false;
                    }
                    console.log(`received a packet at ${Date.now() - zeroTime} ms ${msg.toString('hex')}`);
                    console.log(info);

                    if (info.size >= MESSAGE_HEADER_SIZE) {
                        const command: number = msg.readInt16BE(0);
                        // const version: number = msg.readInt16BE(4);
                        let port: number = msg.readInt16BE(6);
                        // const sid: number = msg.readInt32BE(8);
                        let addressInt: number = msg.readInt32BE(12);
                        let address: string = CARepeater.ipInt2String(addressInt);
                        // The port from 
                        if (port === 0) {
                            port = info.port;
                        }
                        // The packet may contain null address, use info.address
                        if (addressInt === 0) {
                            address = info.address;
                            addressInt = CARepeater.ipString2Int(address);
                        }

                        if (command === CA_REPEATER_REGISTER) {
                            console.log(`CA_REPEATER_REGISTER received from ${address}:${port}.`);
                            await this.registerNewClient(port, address);
                        }
                        else if (command === CA_PROTO_RSRV_IS_UP) {
                            console.log(`CA_PROTO_RSRV_IS_UP received from ${address}:${port}.`);
                            msg.writeInt32BE(addressInt, 12);
                            // route message to all CARepeater clients excluding the incoming address:port
                            // with the correct server address
                            await this.fanOut(port, address, msg);
                        }
                    }
                });
        } catch (e) {
            console.log(e);
        }
    }

    static ipString2Int(ip: string): number {
        return ip.split('.').reduce(function (ipInt, octet) { return (ipInt << 8) + parseInt(octet, 10) }, 0) >>> 0;
    }

    static ipInt2String(ip: number): string {
        let d = `${ip % 256}`;
        for (var i = 3; i > 0; i--) {
            ip = Math.floor(ip / 256);
            d = `${ip % 256}.${d}`;
        }
        return d;
    }

    async registerNewClient(clientPort: number, clientAddress: string) {

        let clientAddressInt: number = CARepeater.ipString2Int(clientAddress);
        //todo what is the type of newClient ??
        let newClient: any = null;

        for (let existingClient of this.clients) {
            if (existingClient.address === clientAddress && existingClient.port === clientPort) {
                console.log(`CARepeater client ${clientAddress}:${clientPort} already exists.`);
                return;
            }
        }

        newClient = new CARepeater.Client(clientPort, clientAddress);

        // When the 'error' emitted, it becomes an exception, which
        // must be caught. Otherwise there is an uncaughtException and the 
        // node.js quits.
        // 'error' can be emitted when the client is down
        newClient.repeaterSocket.on('error', () => {
            console.log(`CARepeater client error, closing socket.`);
            this.removeClient(newClient);
        });

        // if tryConnect() fails, the above 'error' event will be emitted 
        // and the newClient is set to null
        await newClient.repeaterSocket.connect(clientPort, clientAddress);

        // await newClient.tryConnect();
        if (newClient !== null) {
            this.clients.push(newClient);
            await newClient.sendConfirm();
            // send noop message to all clients
            const buffer: Buffer = Buffer.alloc(MESSAGE_HEADER_SIZE);
            buffer.writeInt16BE(CA_PROTO_VERSION, 0);
            this.fanOut(clientPort, clientAddress, buffer);
        }
    }

    removeClient(client: any) {
        let ii = 0;
        for (let existingClient of this.clients) {
            if (client.address === existingClient.address && client.port === existingClient.port) {
                this.clients.splice(ii, 1);
                break;
            }
            ii = ii + 1;
        }
        client.repeaterSocket.close();
        client = null;
    }

    async fanOut(portMasked: number, addressMasked: string, buffer: Buffer) {
        for (let client of this.clients) {
            if (client.port === portMasked && client.address === addressMasked) {
                continue;
            }
            console.log(`fanOut to ${client.address}:${client.port}`);
            await client.repeaterSocket.send(buffer);
        }
    }

    static Client = class {
        repeaterSocket: Socket;
        // client's address and port
        address: string;
        addressInt: number;
        port: number;
        constructor(port: number, address: string) {
            this.address = address;
            this.addressInt = CARepeater.ipString2Int(this.address);
            this.port = port;
            this.repeaterSocket = createSocket('udp4', () => { console.log(` --- `) });
            console.log(`new CARepeater client found: ${this.address}:${this.port}`);
        }

        // non-async function
        async sendConfirm() {
            const buffer = Buffer.alloc(MESSAGE_HEADER_SIZE);
            buffer.writeInt16BE(CA_REPEATER_CONFIRM, 0);
            buffer.writeInt32BE(this.addressInt, 12);
            console.log("sending", buffer.toString("hex"), "to", `${this.address}:${this.port}`);
            await this.repeaterSocket.send(buffer);
        }

        async tryConnect() {
            // this socket is associated to this.address:this.port which are of client's
            // this socket will send packet to this.address:this.port by default
            // and this socket will receive the packet only from this.address:this.port
            // it is different from .bind(port, address), where the socket will
            // listen to the specified port from the specified ip address
            // repeaterSocket is bound to a random local port when .connect()
            // is executed. This port is never exposed to the CARepeater client
            // The CARepeater client only knows the 5065 (CA_REPEATER_PORT) port
            // (1) the CARepeater runs, with a UDP port listening on port 5065
            // (2) the CARepeater starts to listen to network packets via port 5065
            // (3) the CARepeater may receive the network packet from CA server
            //     with "command 0x0d" (CA_PROTO_RSRV_IS_UP) via port 5065. This packet is
            //     also called as "CA server beacon". At this moment, the CARepeater does
            //     nothing upon receiving "CA server beacon"
            //     The "CA server beacon" is from a random port, e.g. 54758, of CA server.
            //     However, when we send data back to CA server, we should send to a 
            //     desganated port 5064.
            // (4) the CARepeater client runs, using a random UDP port, e.g. 53565
            // (5) the CARepeater client sends a packet to 127.0.0.1:5065 in the blind
            //     with "command 0x18" (CA_REPEATER_REGISTER) via port 53565
            // (6) the CARepeater receives the "command 0x18" packet from CARepeater client
            //     It decodes the packet, obtaining the following info:
            //     (a) the CARepeater client's IP address: 127.0.0.1
            //     (b) the CARepeater client's port: 53565
            // (7) Using the above 2 pieces of info, the CARepeater creates a "Client" object
            //     and add this object to an array in CARepeater. This "Client" object 
            //     has its own UDP socket, with a random port, e.g. 127.0.0.1:59614
            //     Now we have a 1-to-1 correspondance: client is 127.0.0.1:53565, and
            //     the corresponding "Client" object is 127.0.0.1:59614
            //     From now on: all the data exchange are this way: 
            //     (a) client --> CARepeater: 53565 --> 5065
            //     (b) CARepeater --> client: 59614 --> 53565
            //     (c) CA server --> CARepeater: 54758 --> 5065
            //     (d) CARepeater --> CA server: no such a thing
            // (8) Then, the CARepeater sends a packet with "command 0x11" (CA_REPEATER_CONFIRM)
            //     back to client's address:port, e.g. 127.0.0.1:53565, via this client's
            //     desgnated "Client" object's port 59614
            // (9) The CARepeater client will response to the CA_REPEATER_CONFIRM command
            // The client sends message to 127.0.0.1:5065, then the CARepeater
            // knows the messages is from 127.0.0.1:53565
            //HH 
            //HH try-catch does not catch the error
            //HH callback function cannot catch the error when the port and address 
            //HH are not available. It throws an uncaughtException, which causes the 
            //HH node to quit. So, the only solutio is using 'error' listener for the
            //HH repeaterSocket, i.e. this.repeaterSocket.on('error', () => {})
            await this.repeaterSocket.connect(this.port, this.address);
        }
    }
}

let a = new CARepeater();
a.run();

setTimeout(() => {
    console.log("CARepeater started.");
}, 5000);

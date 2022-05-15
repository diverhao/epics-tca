import { Buffer } from 'buffer';
import { Socket, createSocket } from "dgram";
import process from 'process';
import { CA_MSG_HEADER_OFFSETS, CA_MSG_HEADER_SIZE, CA_COMMANDS, printMsg } from '..';
import { CA_REPEATER_PORT_DEFAULT, epicsEnv, ipInt2String, ipString2Int } from '../global';
import { parentPort, workerData } from "worker_threads";


process.on('uncaughtException', (err: any, origin: any) => {
    console.log('uncaughtException caught', err, origin);
});

export class CARepeater {

    public socket: Socket; // default port: 5065
    public clients: Record<string, CARepeaterClient>;

    constructor(port?: number) {
        //todo: shall we limit the port?
        if (!(typeof port === "number" && port > 0 && port < 65535)) {
            if (process.env.CA_REPEATER_PORT) {
                if (parseInt(process.env.CA_REPEATER_PORT)) {
                    port = parseInt(process.env.CA_REPEATER_PORT)
                }
                else {
                    port = CA_REPEATER_PORT_DEFAULT;
                }
            }
            else {
                port = CA_REPEATER_PORT_DEFAULT;
            }
        }

        this.socket = createSocket('udp4', () => {
            // each time it receives a packet
            console.log(` --- `);
        });
        this.socket.bind({
            port: port,
        }, () => {
            console.log(`EPICS CARepeater service created. Listening to port ${port} ...`);
        });
        this.socket.on('error', (e: Error) => {
            console.log(`Error occurs on CARepeater port ${port}, closing socket. ${e}`);
            this.socket.close();
        });
        this.clients = {};
    }

    run() {
        let isFirst: boolean = true;
        let zeroTime: number = 0;

        try {
            this.socket.on('message',
                async (msg: Buffer, info: Record<string, any>) => {
                    if (isFirst === true) {
                        zeroTime = Date.now();
                        isFirst = false;
                    }
                    printMsg(msg, info);

                    if (info.size >= CA_MSG_HEADER_SIZE) {

                        const command: number = msg.readInt16BE(CA_MSG_HEADER_OFFSETS.command);

                        // server TCP port number
                        let port: number = msg.readInt16BE(6);
                        if (port === 0) {
                            port = info.port;
                        }

                        let addressInt: number = msg.readInt32BE(12);
                        let address: string = ipInt2String(addressInt);
                        // The packet may contain null address, use info.address
                        if (addressInt === 0) {
                            address = info.address;
                            addressInt = ipString2Int(address);
                        }


                        if (command === CA_COMMANDS.CA_REPEATER_REGISTER) { // upon client startup
                            // register the new client to CARepeater
                            await this.registerClient(port, address);
                        }
                        else if (command === CA_COMMANDS.CA_PROTO_RSRV_IS_UP) { // server beacon
                            // in case the beacon does not contain server's IP address
                            msg.writeInt32BE(addressInt, CA_MSG_HEADER_OFFSETS.parameter2);
                        }
                        else {
                            console.log(`Received an unexpected packet: ${msg.toString('hex')} from ${info}`);
                        }

                        // todo: is this necessary?
                        // send noop message to all clients
                        // buffer.writeInt16BE(CA_PROTO_VERSION, CA_MSG_HEADER_OFFSETS.command);
                        // this.fanOut(clientPort, clientAddress, buffer);

                        // each message received from CARepeater must be forwarded to clients
                        // excluding the incoming address:port
                        console.log("clients = ");
                        console.log(this.clients);
                        await this.fanOut(port, address, msg);
                    }
                }
            );
            parentPort?.postMessage(true);
        } catch (e) {
            console.log(e);
        }
    }

    async registerClient(clientPort: number, clientAddress: string) {
        // no matter if the client has been registered, always re-register when
        // the CARepeater receives a "CA_REPEATER_REGISTER 0x18" packet

        let newClient: CARepeaterClient = new CARepeaterClient(clientPort, clientAddress);

        // When the client becomes offline, an 'error' event is emitted
        newClient.socket.on('error', async () => {
            console.log(`CARepeater client ${newClient.address}:${newClient.port} error, closing socket.`);
            await this.removeClient(newClient);
        });
        // send out "CA_REPEATER_CONFIRM"
        newClient.socket.on('connect', async () => {
            await newClient.sendConfirm();
            // this should be at last
            this.clients[`${clientAddress}:${clientPort}`] = newClient;
        });
        // if tryConnect() fails, the above 'error' event will be emitted 
        await newClient.tryConnect();
    }

    async removeClient(client: any) {
        if (this.clients[`${client.address}:${client.port}`]) {
            await this.clients[`${client.address}:${client.port}`].socket.close();
            delete this.clients[`${client.address}:${client.port}`];
        }
    }

    async fanOut(portMasked: number, addressMasked: string, buffer: Buffer) {
        for (let client in this.clients) {
            if (client === `${addressMasked}:${portMasked}`) {
                continue;
            }
            console.log("------")
            console.log("sending:")
            printMsg(buffer, { address: this.clients[client].address, port: this.clients[client].port });
            await this.clients[client].socket.send(buffer);
        }
    }

}

class CARepeaterClient {
    socket: Socket;
    // client's address and port
    address: string;
    addressInt: number;
    port: number;
    constructor(port: number, address: string) {
        // client's port and address
        this.address = address;
        this.addressInt = ipString2Int(this.address);
        this.port = port;
        // create a socket talking to client, this socket has a random port
        this.socket = createSocket('udp4', () => { console.log(` --- `) });
    }

    // non-async function
    async sendConfirm() {
        const buffer = Buffer.alloc(CA_MSG_HEADER_SIZE);
        buffer.writeInt16BE(CA_COMMANDS.CA_REPEATER_CONFIRM, CA_MSG_HEADER_OFFSETS.command);
        // address must be 127.0.0.1 or 0.0.0.0, we choose 127.0.0.1
        buffer.writeInt32BE(ipString2Int("127.0.0.1"), CA_MSG_HEADER_OFFSETS.parameter2);
        console.log("------")
        console.log("sending:")
        printMsg(buffer, { address: this.address, port: this.port });
        await this.socket.send(buffer);
    }

    async tryConnect() {
        // an "error" event will be emitted upon error
        await this.socket.connect(this.port, this.address);
    }
}

const repeater = new CARepeater(epicsEnv["EPICS_CA_REPEATER_PORT"]);

repeater.run();



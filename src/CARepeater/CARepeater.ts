declare var exports: Record<string, any> | undefined;

// if (typeof exports === "undefined") {
//     exports = {};
// }

import { Buffer } from "buffer";
import { Socket, createSocket } from "dgram";
import { parentPort } from "worker_threads";

import {
	CA_MSG_HEADER_OFFSETS,
	CA_MSG_HEADER_SIZE,
	CA_COMMANDS,
	printMsg,
	CA_REPEATER_PORT_DEFAULT,
	ipInt2String,
	ipString2Int,
    Environment,
	GlobalMethods,
} from "..";

// process.on("uncaughtException", (err: any, origin: any) => {
// 	GlobalMethods.errorLog("uncaughtException caught", err, origin);
// });

export class CARepeater {
	public socket: Socket | undefined = undefined;
	public clients: Record<string, CARepeaterClient>;
	private isInBrowser: boolean;

	// default port: 5065
	constructor(repeaterPort: number = CA_REPEATER_PORT_DEFAULT) {
		let showAllInfo = false;
		GlobalMethods.DEBUG = showAllInfo;
		GlobalMethods.SHOWINFO = showAllInfo;
		GlobalMethods.SHOWERROR = showAllInfo;

		const port = repeaterPort;

		// "self" is valid in browser
		if (typeof self !== "undefined") {
			GlobalMethods.infoLog("CA Repeater runs in webbrowser-like environment");
			this.isInBrowser = true;
		} else {
			GlobalMethods.infoLog("CA Repeater runs in local node.js");
			this.isInBrowser = false;
		}

		try {
			this.socket = this.createUDP(port);
		} catch (e) {
			GlobalMethods.errorLog("Failed to create CA Repeater.");
			GlobalMethods.errorLog(e);
		}
		this.clients = {};
		// this.startTerminateListener();
	}

	// startTerminateListener = () => {
	// 	if (this.isInBrowser) {
	// 		self.addEventListener("message", (msg: any) => {
	// 			if (msg.data === "terminate") {
	// 				this.socket?.close();
	// 				postMessage("terminate");
	// 			}
	// 		});
	// 	} else {
	// 		parentPort?.on("message", (msg: any) => {
	// 			if (msg === "terminate") {
	// 				parentPort?.postMessage("terminate");
	// 			}
	// 		});
	// 	}
	// };

	private createUDP = (port: number): Socket => {
		const socket = createSocket("udp4");
		socket.on("error", (e: Error) => {
			GlobalMethods.errorLog(`Error occurs on CARepeater port ${port}, closing socket.`);
			GlobalMethods.errorLog(e);
			this.socket?.close();
			for (let clientName in this.clients) {
				const client = this.clients[clientName];
				this.removeClient(client);
			}
			if (this.isInBrowser) {
				postMessage("terminate");
			} else {
				parentPort?.postMessage("terminate");
			}
		});

		socket.bind(
			{
				// listen to the "port" for all network interfaces
				port: port,
			},
			() => {
				GlobalMethods.infoLog(`EPICS CARepeater service starting, listening to port ${port} ...`);
			}
		);
		return socket;
	};

	// process the messages
	run() {
		try {
			this.socket?.on("message", async (msg: Buffer, info: Record<string, any>) => {
				printMsg(msg, info, "Received UDP");
				if (info.size >= CA_MSG_HEADER_SIZE) {
					const command: number = msg.readInt16BE(CA_MSG_HEADER_OFFSETS.command);
					if (command === CA_COMMANDS.CA_REPEATER_REGISTER) {
						// upon CA client startup, register the new CA client to CARepeater
						this.handle_CA_REPEATER_REGISTER(msg, info);
						// await this.registerClient(port, address);
					} else if (command === CA_COMMANDS.CA_PROTO_RSRV_IS_UP) {
						// server beacon
						await this.handle_CA_PROTO_RSRV_IS_UP(msg, info);
					} else {
						GlobalMethods.infoLog(`The above message is neither CA_REPEATER_REGISTER nor CA_PROTO_RSRV_IS_UP, skip.`);
					}
				}
			});
			if (this.isInBrowser) {
				postMessage("ready");
			} else {
				parentPort?.postMessage("ready");
			}
		} catch (e) {
			GlobalMethods.errorLog(e);
		}
	}

	handle_CA_REPEATER_REGISTER = (msg: Buffer, info: Record<string, any>) => {
		let clientPort: number = msg.readInt16BE(6);
		if (clientPort === 0) {
			clientPort = info.port;
		}
		// sender's IP address
		let clientAddressInt: number = msg.readInt32BE(12);
		let clientAddress: string = ipInt2String(clientAddressInt);
		// The packet may contain null address, use info.address
		if (clientAddressInt === 0) {
			clientAddress = info.address;
		}

		// no matter if the client has been registered, always re-register when
		// the CARepeater receives a "CA_REPEATER_REGISTER 0x18" packet
		let newClient: CARepeaterClient = new CARepeaterClient(clientPort, clientAddress, this);
		try {
			newClient.createUDP();
		} catch (e) {
            GlobalMethods.errorLog(e);
        }
	};

	// practically this forward all received message to its clients
	handle_CA_PROTO_RSRV_IS_UP = async (msg: Buffer, info: Record<string, any>) => {
		let addressInt: number = msg.readInt32BE(12);
		// The packet may contain null address, use info.address
		if (addressInt === 0) {
			addressInt = ipString2Int(info.address);
		}
		// in case the incoming beacon does not contain source IP
		msg.writeUInt32BE(addressInt, CA_MSG_HEADER_OFFSETS.parameter2);
		// fanout message to all CA clients
		for (let clientName in this.clients) {
			const client = this.clients[clientName];
			printMsg(msg, { address: client.address, port: client.port }, "Sending UDP");
			client.forward_CA_PROTO_RSRV_IS_UP_msg(msg);
		}
	};

	removeClient = (client: any) => {
		if (this.clients[`${client.address}:${client.port}`]) {
			this.clients[`${client.address}:${client.port}`].socket?.close();
			delete this.clients[`${client.address}:${client.port}`];
		}
	};
}

class CARepeaterClient {
	socket: Socket;
	// remote client's address and port
	address: string;
	addressInt: number;
	port: number;
	repeater: CARepeater;
	CA_REPEATER_CONFIRM_msg: Buffer;
	constructor(port: number, address: string, repeater: CARepeater) {
		// client's port and address
		this.address = address;
		this.addressInt = ipString2Int(this.address);
		this.port = port;
		this.repeater = repeater;
		this.CA_REPEATER_CONFIRM_msg = Buffer.alloc(CA_MSG_HEADER_SIZE);
		this.create_CA_REPEATER_CONFIRM_msg();
		// a UDP client, only send data, no "bind()"
		this.socket = createSocket("udp4");
	}

	createUDP = () => {
		// create a socket talking to client, this socket has a random port
		// e.g. when the client becomes offline
		this.socket.on("error", async () => {
			GlobalMethods.errorLog(`CARepeater client ${this.address}:${this.port} error, closing socket.`);
			this.repeater.removeClient(this);
		});
		this.socket.on("connect", async () => {
			// send out "CA_REPEATER_CONFIRM", bind a random port for this client
			this.send_CA_REPEATER_CONFIRM_msg();
			// no response expected
			this.repeater.clients[`${this.address}:${this.port}`] = this;
		});
		// associate the socket with the remote port and remote address
		// if fails, the above 'error' event is emitted
		// if succeeds, the above 'connect' event is emitted
		this.socket.connect(this.port, this.address);
	};

	create_CA_REPEATER_CONFIRM_msg = () => {
		this.CA_REPEATER_CONFIRM_msg.writeUInt16BE(CA_COMMANDS.CA_REPEATER_CONFIRM, CA_MSG_HEADER_OFFSETS.command);
		this.CA_REPEATER_CONFIRM_msg.writeUInt32BE(ipString2Int("127.0.0.1"), CA_MSG_HEADER_OFFSETS.parameter2);
	};

	public send_CA_REPEATER_CONFIRM_msg = () => {
		printMsg(this.CA_REPEATER_CONFIRM_msg, { address: this.address, port: this.port }, "Sending UDP: ");
		this.send(this.CA_REPEATER_CONFIRM_msg);
	};

	public forward_CA_PROTO_RSRV_IS_UP_msg = (msg: Buffer) => {
		printMsg(msg, { address: this.address, port: this.port }, "Sending UDP: ");
		this.send(msg);
	};

	public send = (msg: Buffer) => {
		this.socket.send(msg);
	};
}

const repeater = new CARepeater(Environment.getInstance().getEnv("EPICS_CA_REPEATER_PORT") as number);

repeater.run();

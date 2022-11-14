import { Socket } from "net";
import { Buffer } from "buffer";
import { userInfo, hostname } from "os";

import {
	printMsg,
	Environment,
	CA_COMMANDS,
	CA_MSG_HEADER_OFFSETS,
	CA_MSG_HEADER_SIZE,
	CA_EXT_MSG_HEADER_SIZE,
	CA_EXT_MSG_HEADER_OFFSETS,
	Beacon,
	Channel,
	GlobalMethods,
	Constants,
	Context,
    ChannelMonitor,
    Channel_ACCESS_RIGHTS,
} from "..";
import { TCPTransportPromises } from "./TCPTransportPromises";
import { TCPTransports } from "./TCPTransports";
import { Timeouts } from "../Timeouts/Timeouts";
import { connected } from "process";

// each Beacon object corresponds to a **possible** TCPTransport
// situations for a TCP connection: these behaviors are mostly defined in CATransport.java
//  - beacon anomaly, handled by 0x0d server beacon message in UDPTransport
//    - restart the search() of unresolved channels
//    - handled by 0x0d message handler in UDPTransport
//    - the corresponding TCPTransport is kept
//  - CA server close gracefully, handled by TCPTransport.reconnect() within "close" event
//    - remove all references of this TCPTransport
//      - set Channel.tcpClient to 'null'
//      - remove this TCPTransport from Context.tcpTransportList
//    - add the related channels to Context.unresolvedChannelList
//    - restart the search() of all unresolved channels
//  - CA server close abruptly, no way to detect it immediately
//  - CA server unresponsive, handled by Beacon.beaconAnomalyDetection() invoked in
//    UDPTransport 0x0d server beacon message
//    - detected by the following mechanism:
//      - each time the UDPTransport receives a 0x0d beacon signal, it starts a
//        setTimeout process which will be executed after 30 seconds
//      - if there is a beacon received within 30 seconds, this setTimeout() is canceled
//      - if this setTimeout() is not canceled, it executes, sending a 0x17 CA_PROTO_ECHO
//        to this beacon's TCPTransport CA server
//      - if the echo is not responded, invoke TCPTransport.reconnect(), as if the
//        remote TCP connection is closed gracefully
//  - normal situation

// -------------------------------
// A TCPTransport is referenced in:
//  - Channel.tcpTransport
//  - Beacon.tcpTransport
//  - Context.tcpTransportList <-- change from a pure list to an object, tcpTransportsByAddressPort, key = "address:port", value = TCPTransport
//  - ChannelMonitor.tcpTransport <-- eliminate, no need

// A TCPTransport is referenced in:
//  - Channel.tcpTransport
//  - Beacon.tcpTransport
//  - Context.tcpTransportsByAddressPort, key = "address:port", value = TCPTransport

// -------------------------------
// A Beacon is referenced in:
//  - TCPTransport.beacon
//  - UDPTransport.beaconList <-- change from a pure list to an object Context.beaconsByAddressPort, key = "address:port", value = Beacon

// A Beacon is referenced in:
//  - TCPTransport.beacon
//  - Context.beaconsByAddressPort, key = "address:port", value = Beacon

// -------------------------------
// A Channel is referenced in:
//  - TCPTransport.channelServerIDList <-- change name to channelsByServerID
//  - Context.channelsByName
//  - Context.channelsByChannelClientID
//  - Context.unresolvedChannelList, possibly
//  - ChannelMonitor.channel

// A Channel is referenced in:
//  - TCPTransport.channelsByServerID
//  - Context.channelsByName
//  - Context.channelsByChannelClientID
//  - Context.unresolvedChannelList, possibly
//  - ChannelMonitor.channel

// -------------------------------

// A ChannelMonitor is referenced in:
//  - Context.subscriptionIDList <-- keep as an object, rename it to channelMonitorsBySubscriptionID

// A ChannelMonitor is referenced in:
//  - Context.channelMonitorsBySubscriptionID

// -------------------------------

export enum TCPTransport_STATES {
    DESTROYED,
    INITIALIZED,
    NOT_INITIALIZED,
}

// also see Channel
// When a TCPTransport has a problem caused by others, will re-search all channels --> TCPTransport.destroy() + re-search all channels
//  (1) TCP socket got an "error" event from CA server --> TCPTransport.destroy(false)
//  (2) TCP socket got an "close" event from CA server --> TCPTransport.destroy(false)
//  (3) no TCP packet after 30 seconds, and no reply from CA_PROTO_ECHO
// When a TCPTransport is closed actively by client --> no re-search all channels
//  (1) whole program exits --> --> TCPTransport.destroy(true)
//  (2) no Channel in this TCPTransport

export class TCPTransport {
	socket: Socket;
	serverPort: number;
	serverAddress: string;
	context: Context;
	receiveBufferA: Buffer;
	receiveBufferB: Buffer;
	socketBuffer: Buffer;
	sendBuffer: Buffer;
	serverVersion: number;
	// channelsByServerID: Record<string, any>;
	beacon: Beacon | null;
	isDestroyed: boolean;
	serverSchedulingPriority: number;
	key: string;
	channels: Record<string, Channel>;
    tcpTransports: TCPTransports;
	// promises
	// CA_PROTO_VERSION_Promise: any;
	// CA_PROTO_VERSION_Resolve: any;
	// CA_PROTO_VERSION_Reject: any;

	// time of any TCP message from server
	private lastMsgTime: number;

    timeouts: Timeouts;
    promises: TCPTransportPromises;

    //todo: do it in a more systematic way
    // inactiveTimer1: any;
	// inactiveTimer2: any;
	channelReSearchTimer: any;
	// todo: stich TCP packets, modify splitMessage()
	residualMessage: Buffer;

    state: TCPTransport_STATES;

	constructor(context: Context, serverPort: number, serverAddress: string, serverSchedulingPriority: number) {
        this.state = TCPTransport_STATES.NOT_INITIALIZED;

		this.residualMessage = Buffer.from("");

		this.lastMsgTime = new Date().getTime();

		this.serverSchedulingPriority = serverSchedulingPriority;
		this.context = context;
		// a TCP client
		this.socket = new Socket();
		this.serverPort = serverPort;
		this.serverAddress = serverAddress;
        this.tcpTransports = context.tcpTransports;
		this.tcpTransports.add(this);

		this.receiveBufferA = Buffer.alloc(Constants.CA_EXTENDED_MESSAGE_HEADER_SIZE); // 24 bytes
		this.receiveBufferB = Buffer.alloc(1024); // 1024 bytes
		this.socketBuffer = Buffer.alloc(Constants.MAX_TCP_RECV); // 16408 bytes
		// 16 * 1024 + 24 bytes
		this.sendBuffer = Buffer.alloc(16 * 1024 + Constants.CA_EXTENDED_MESSAGE_HEADER_SIZE);
		this.serverVersion = 0;
		// this.channelsByServerID = {};
		this.beacon = null;
		// so that TCPTransport.removeTCPTransportAndReconnectChannels() does not need to be async
		// Prevent "close" event invoke TCPTransport.removeTCPTransportAndReconnectChannels() twice
		this.isDestroyed = false;
		this.key = `${this.serverAddress}:${this.serverPort}:${this.serverSchedulingPriority}`;
		this.channels = {};
        this.promises = new TCPTransportPromises();
        this.promises.append("initialization_finished");
        this.promises.append("CA_PROTO_VERSION");
		// this.startInactiveTimers();
        this.timeouts = new Timeouts();
        this.timeouts.addTimeout("inactiveTimer1",  ((this.getEnv("EPICS_CA_BEACON_PERIOD") as number) + 1) * 1000, this.send_CA_PROTO_ECHO, []);
        this.timeouts.startTimeout("inactiveTimer1");
        this.timeouts.addTimeout("inactiveTimer2",  ((this.getEnv("EPICS_CA_BEACON_PERIOD") as number) * 2 + 1) * 1000, this.destroy, [false]);
        this.timeouts.startTimeout("inactiveTimer2");
	}

	// initialization_finished_Promise: any;
	// initialization_finished_Resolve: any;
	// initialization_finished_Reject: any;

	// createPromises = () => {
	// 	this.CA_PROTO_VERSION_Promise = new Promise((resolve, reject) => {
	// 		this.CA_PROTO_VERSION_Resolve = resolve;
	// 		this.CA_PROTO_VERSION_Reject = reject;
	// 	});
	// 	this.initialization_finished_Promise = new Promise((resolve, reject) => {
	// 		this.initialization_finished_Resolve = resolve;
	// 		this.initialization_finished_Reject = reject;
	// 	});
	// };

    // must defined in arrow function for the setTimeout() to use up-to-date "this.write()" function
	send_CA_PROTO_ECHO = () => {
		let buffer = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE); // 16 bytes
		GlobalMethods.generateCAHeader(
			buffer,
			0,
			CA_COMMANDS.CA_PROTO_ECHO, // 0x17
			0, // reserved
			0, // reserved
			0, // reserved
			0, // reserved
			0
		); // reserved
		this.write(buffer);
	}

	getEnv = (envName: string) => {
		return this.context.getEnv(envName);
	};

	//todo: destroy() vs reconnect()
	// destroy this TCP transport,
	// "hard===true" --> no re-search of channels;
	// "hard===false" --> re-search channels
	// (1) destroy() all channels in TCPTransport.channels
	// (2) close socket
	// (3) reject all promises
	// (4) remove TCPTransport from TCPTransports.tcpTransports
	// (5) clear all timeout Timer
	destroy = async (hard: boolean = true) => {
		// // (1) destroy() all channels in TCPTransport.channels
		// for (let name in this.channels) {
		// 	let channel = this.channels[name];
		// 	channel.destroy(hard);
		// 	// soft destroy, re-search channels
		// 	if (!hard) {
		// 		this.context.createChannel(name);
		// 	}
		// }
		// // (2) close socket
		// try {
		// 	this.socket.destroy();
		// } catch {
		// 	GlobalMethods.errorLog(`Failed to destroy socket in TCPTransport ${this.key}`);
		// }
		// // (3) reject all promises
		// // this.CA_PROTO_VERSION_Reject("");
        // this.promises.rejectAll();
		// // (4) remove TCPTransport from TCPTransports.tcpTransports
		// let tcpTransports = this.context.tcpTransports.tcpTransports;
		// delete tcpTransports[this.key];
		// // (5) clear all timeout Timers
		// // clearTimeout(this.inactiveTimer1);
		// // clearTimeout(this.inactiveTimer2);
        // this.timeouts.clearAllTimeouts();
	}

	//todo: destroy() vs reconnect()
	// destroy this TCP transport,
	// (1) destroyHard() all channels in TCPTransport.channels
	// (2) close TCP socket
	// (3) reject all promises
	// (4) remove TCPTransport from TCPTransports.tcpTransports
	// (5) clear all timeout Timer
	destroyHard = () => {
        if (this.state === TCPTransport_STATES.DESTROYED) {
            GlobalMethods.errorLog(`TCPTransoprt ${this.key} already destroyed`);
            return;
        }
        this.state = TCPTransport_STATES.DESTROYED;
		// (1)
        this.destroyAllChannelsHard();
		// (2) close socket
        this.socket.destroy();
		// (3) reject all promises
        this.promises.rejectAll();
        // (4) remove TCPTransport from TCPTransports.tcpTransports
        this.tcpTransports.remove(this);
		// (5) clear all timeout Timers
        this.timeouts.clearAllTimeouts();
		// clearTimeout(this.inactiveTimer1);
		// clearTimeout(this.inactiveTimer2);
	}

    // destroy this TCP transport softly (almost hard), the TCPTransoprt must be re-created upon re-connect
	// (1) destroySoft() all channels in TCPTransport.channels, this is the only difference 
    //     between a soft and hard destroy
	// (2) close TCP socket, no matter if it is still available
	// (3) reject all promises
	// (4) remove TCPTransport from TCPTransports.tcpTransports
	// (5) clear all timeout Timer
    // Note: (1) there is not Interval in TCPTransport
	destroySoft = () => {
        if (this.state === TCPTransport_STATES.DESTROYED) {
            GlobalMethods.errorLog(`TCPTransoprt ${this.key} already destroyed softly`);
            return;
        }
        this.state = TCPTransport_STATES.DESTROYED;
		// (1)
        this.destroyAllChannelsSoft();
		// (2) close socket
        this.socket.destroy();
		// (3) reject all promises
        this.promises.rejectAll();
        // (4) remove TCPTransport from TCPTransports.tcpTransports
        this.tcpTransports.remove(this);
		// (5) clear all timeout Timers
        this.timeouts.clearAllTimeouts();
		// clearTimeout(this.inactiveTimer1);
		// clearTimeout(this.inactiveTimer2);
	}

    private destroyAllChannelsSoft = () => {
		for (let name in this.channels) {
			let channel = this.channels[name];
			channel.destroySoft();
		}
    }

    private destroyAllChannelsHard = () => {
		for (let name in this.channels) {
			let channel = this.channels[name];
			channel.destroyHard();
			// // soft destroy, re-search channels
			// if (!hard) {
			// 	this.context.createChannel(name);
			// }
		}
    }

	addChannel(channel: Channel) {
		GlobalMethods.infoLog(
			`Add channel ${channel.getName()} to TCPTransport ${this.serverAddress}:${this.serverPort}:${this.serverSchedulingPriority}`
		);

		const name = channel.getName();
		// connect TCPTransport and Channel
		channel.tcpTransport = this;
		this.channels[name] = channel;
	}

	processBeacon(mesage: Buffer, info: Record<string, any>) {}

	async initialize() {
		this.socket.on("error", () => {
			GlobalMethods.errorLog(`Error on tcpTransport for ${this.serverAddress}:${this.serverPort}`);
			// todo: check if it is a loop
			this.destroy(false);
		});

		this.socket.on("data", (msg: Buffer) => {
			try {
				this.messageHandler(msg);
			} catch (e) {
                GlobalMethods.errorLog(e);
            }
		});

		// emitted when remote TCP socket is closed gracefully, e.g. Ctrl+C
		this.socket.on("close", () => {
			GlobalMethods.infoLog(`TCP connection closed by server, destroy TCPTransport object for ${this.key}`);
			// todo: check if it is a loop
			this.destroy(false);
		});

		try {
			// TCP handshake with CA server, emit "connect" event
			this.socket.connect(this.serverPort, this.serverAddress, () => {
				// seems like not necessarily in a callback function
				this.sendFirstFewMessages();
			});
			// GlobalMethods.infoLog(`TCPTransport connected to ${this.serverAddress}:${this.serverPort}`);
			// GlobalMethods.debugLog("Initializing TCPTransport: tryConnect(), sendFirstFewMessages(), add message/error listeners");

			// lift blocking until we receive CA_PROTO_VERSION reply from CA server
			// await this.CA_PROTO_VERSION_Promise;
            await this.promises.get("CA_PROTO_VERSION");
			// this.initialization_finished_Resolve("");
            this.promises.resolve("initialization_finished", "");
            this.state = TCPTransport_STATES.INITIALIZED;
		} catch {
			GlobalMethods.errorLog(`TCPTransport ${this.key} initialization interrupted.`);
		}
		GlobalMethods.infoLog(`TCPTransport ${this.key} initialization finished`);
	}

	// very first 3 messages: CA_PROTO_VERSION, CA_PROTO_CLIENT_NAME, and CA_PROTO_HOST_NAME
	sendFirstFewMessages() {
		//HH in Connector.connect() invocation in CAJContext.searchResponse().getTransport()
		//HH new VersionRequest(transport, priority).submit();
		// this is a must
		let buffer0x00 = Buffer.alloc(CA_MSG_HEADER_SIZE); // 16 bytes
		GlobalMethods.generateCAHeader(
			buffer0x00,
			0,
			CA_COMMANDS.CA_PROTO_VERSION, // 0x00
			0x00, // payload size
			this.serverSchedulingPriority, // desired priority
			this.context.CA_VERION_MINOR, // version number
			0x00, // reserved
			0x00
		); // reserved
		this.write(buffer0x00);

		//HH new UserNameRequest(transport).submit();
		let username = userInfo().username;
		let payloadSize = GlobalMethods.getStringPaddedSize(username);
		let buffer0x14 = Buffer.alloc(CA_MSG_HEADER_SIZE + payloadSize);
		GlobalMethods.generateCAHeader(buffer0x14, 0, CA_COMMANDS.CA_PROTO_CLIENT_NAME, payloadSize, 0x00, 0x00, 0x00, 0x00); // reserved, 0
		buffer0x14.write(username, CA_MSG_HEADER_SIZE);
		this.write(buffer0x14);

		//HH new HostNameRequest(transport).submit();
		let hostnameString = hostname();
		payloadSize = GlobalMethods.getStringPaddedSize(hostnameString);
		// payloadSize = (hostnameString.length + 1) % 8 === 0 ? hostnameString.length + 1 : Math.ceil((hostnameString.length + 1) / 8) * 8;
		let buffer0x15 = Buffer.alloc(CA_MSG_HEADER_SIZE + payloadSize);
		GlobalMethods.generateCAHeader(buffer0x15, 0, CA_COMMANDS.CA_PROTO_HOST_NAME, payloadSize, 0x00, 0x00, 0x00, 0x00);
		buffer0x15.write(hostnameString, CA_MSG_HEADER_SIZE);
		this.write(buffer0x15);
		GlobalMethods.debugLog(`TCPTransport sent first frew messages to ${this.serverAddress}:${this.serverPort}`);
	}

	write = (buffer: Buffer) => {
		const [messages, tmp] = GlobalMethods.splitMessage(buffer);
		for (let message of messages) {
			printMsg(message, { address: this.serverAddress, port: this.serverPort }, "Sending TCP");
		}
		this.socket.write(buffer);
	}

	// clearInactiveTimers() {
	// 	GlobalMethods.debugLog(`Clear inactive timer of TCP connection ${this.key}`);
	// 	clearTimeout(this.inactiveTimer1);
	// 	clearTimeout(this.inactiveTimer2);
	// 	clearTimeout(this.channelReSearchTimer);
	// }

	// startInactiveTimers() {
	// 	this.inactiveTimer1 = setTimeout(() => {
	// 		// send CA_PROTO_ECHO to server, the CA server must reply it immediately
	// 		GlobalMethods.infoLog(
	// 			`We have not received any TCP packet from ${this.key} for more than ${
	// 				this.getEnv("EPICS_CA_BEACON_PERIOD") as number
	// 			} seconds, sending CA_PROT_ECHO (0x17) to test its status`
	// 		);
	// 		this.send_CA_PROTO_ECHO();
	// 	}, ((this.getEnv("EPICS_CA_BEACON_PERIOD") as number) + 1) * 1000);

	// 	this.inactiveTimer2 = setTimeout(() => {
	// 		// destroy the TCPTransport, re-search all PVs
	// 		const dt = (this.getEnv("EPICS_CA_BEACON_PERIOD") as number) * 2 + 1;
	// 		this.destroy(false);
	// 		GlobalMethods.errorLog(
	// 			`No response for CA_PROTO_ECHO from CA server ${this.serverAddress}:${this.serverPort}, disconnect it, and re-search all PVs from this server`
	// 		);
	// 	}, ((this.getEnv("EPICS_CA_BEACON_PERIOD") as number) * 2 + 1) * 1000);
	// }

	handle_CA_PROTO_VERSION(message: Buffer) {
		// this.CA_PROTO_VERSION_Resolve("TCPTransport initialization finished");
		this.promises.resolve("CA_PROTO_VERSION", "TCPTransport initialization finished");
	}

	handle_CA_PROTO_ACCESS_RIGHTS(message: Buffer) {
		let channelClientID = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter1);
		let accessRight = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter2);
		let channel = this.context.resolvedChannelsByClientID[channelClientID];
		if (channel !== undefined) {
			if (accessRight in Channel_ACCESS_RIGHTS) {
				channel.setAccessRight(accessRight);
				GlobalMethods.infoLog(`Channel "${channel.getName()}" has access right "${channel.getAccessRight()}"`);
			} else {
				GlobalMethods.infoLog(`CA_PROTO_ACCESS_RIGHTS for channel ${channel.getName()} returns an illegal access right value ${accessRight}`);
			}
		} else {
			GlobalMethods.errorLog(`Channel with client ID ${channelClientID} not found`);
		}
	}

	handle_CA_PROTO_CREATE_CHAN(message: Buffer) {
		let dbrType = message.readUInt16BE(CA_MSG_HEADER_OFFSETS.dataType);
		let channelClientID = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter1);
		let channelServerID = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter2);
		let dataCount = message.readUInt16BE(CA_MSG_HEADER_OFFSETS.dataCount);

		let channel = this.context.resolvedChannelsByClientID[channelClientID];
		if (channel !== undefined) {
			channel.setDbrType(dbrType);
			channel.setChannelServerID(channelServerID);
			channel.setValueCount(dataCount);
			// lift blocking in Channel.create() method
			// channel.CA_PROTO_CREATE_CHAN_Resolve(message);
			channel.promises.resolve("CA_PROTO_CREATE_CHAN", message);

			GlobalMethods.infoLog(`Channel "${channel.getName()}" has native DBR type "${channel.getDbrTypeStr()}"`);

			//todo: about the subscription
			// let oldConnectionState = channel.connectionState;
			// if (oldConnectionState !== Channel.CONNECTED) {
			//     for (let subscriptionID in this.context.channelMonitorsBySubscriptionID) {
			//         let channelMonitor = this.context.channelMonitorsBySubscriptionID[subscriptionID];
			//         // the tcpTransport must be updated
			//         channelMonitor.channel.tcpTransport = channel.tcpTransport;
			//         await channelMonitor.runChannelMonitor();
			//     }
			// }
		} else {
			// ignore this message
		}
	}

	handle_CA_PROTO_WRITE_NOTIFY(message: Buffer) {
		let status = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter1);
		let ioID = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter2);
		// let channel = this.context.ioList[ioID.toString()].channel;
		// Channel.put() continues
		// this.context.ioList[ioID.toString()].promiseResolve(1);
        this.context.readWriteIos.getIoResolveFunc(ioID)();
	}

	handle_CA_PROTO_EVENT_ADD(message: Buffer) {
		let HEADER_OFFSETS = CA_MSG_HEADER_OFFSETS;
		let HEADER_SIZE = CA_MSG_HEADER_SIZE;
		if (GlobalMethods.isExtendedMessageHeader(message, 0)) {
			HEADER_OFFSETS = CA_EXT_MSG_HEADER_OFFSETS;
			HEADER_SIZE = CA_EXT_MSG_HEADER_SIZE;
		}
		let subID = message.readUInt32BE(HEADER_OFFSETS.parameter2);
        let monitor = this.getMonitor(subID);
        monitor?.decodeBuffer(message);
	}

	handle_CA_PROTO_CLEAR_CHANNEL(message: Buffer) {
		let channelClientID = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter2);
		let channel = this.context.resolvedChannelsByClientID[channelClientID.toString()];
		if (channel) {
			// channel.CA_PROTO_CLEAR_CHANNEL_Resolve("");
			channel.promises.resolve("CA_PROTO_CLEAR_CHANNEL", "");
		}
	}
	handle_CA_PROTO_ECHO(message: Buffer) {
		// do nothing
	}

	handle_CA_PROTO_ERROR(message: Buffer) {
		let channelClientID = message.readUInt32BE(8);
		let channel = this.context.resolvedChannelsByClientID[channelClientID];
		let name = channel.getName();
		let statusCode = message.readUInt32BE(12);
		let statusCodeHexString = statusCode.toString(16);
		GlobalMethods.errorLog(
			`ECA Code 0x${statusCodeHexString} in TCP tansport for Channel ${name} ${channelClientID} from ${this.serverAddress}:${this.serverPort}`
		);
		//todo: decode statusCode, originalRequest, and errorMessage
		let originalRequest = "";
		let errorMessage = "";
	}

	handle_CA_PROTO_SERVER_DISCONN(message: Buffer) {
		let channelClientID = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter1);
		const channel = this.context.resolvedChannelsByClientID[channelClientID];
		if (channel) {
			channel.destroy(false); // soft
			this.context.createChannel(channel.getName());
		}
	}

	handle_CA_PROTO_CREATE_CH_FAIL(message: Buffer) {
		this.handle_CA_PROTO_SERVER_DISCONN(message);
	}

	handle_CA_PROTO_READ_NOTIFY(message: Buffer) {
		let HEADER_OFFSETS = CA_MSG_HEADER_OFFSETS;
		let HEADER_SIZE = CA_MSG_HEADER_SIZE;
		if (GlobalMethods.isExtendedMessageHeader(message, 0)) {
			HEADER_OFFSETS = CA_EXT_MSG_HEADER_OFFSETS;
			HEADER_SIZE = CA_EXT_MSG_HEADER_SIZE;
		}
		let ioID = message.readUInt32BE(HEADER_OFFSETS.parameter2);
		// let promiseResolve = this.context.ioList[ioID.toString()].promiseResolve;
		this.context.readWriteIos.resolveIo(ioID, message);
        // console.log(this.context.readWriteIos.getIo(ioID))
		// resolve(message);
	}

	// send CA_PROTO_EVENTS_OFF to server, no reply
	pauseEvents() {
		let buffer = Buffer.alloc(CA_MSG_HEADER_SIZE);
		GlobalMethods.generateCAHeader(
			buffer,
			0, // 0 offset
			CA_COMMANDS.CA_PROTO_EVENTS_OFF, // 0x08
			0, // reserved
			0, // reserved
			0, // reserved
			0, // reserved
			0 // reserved
		);
		this.write(buffer);
		for (let name in this.channels) {
			const channel = this.channels[name];
			for (let subID in channel.monitors) {
				const monitor = channel.monitors[subID];
				monitor.status = monitor.PAUSED;
			}
		}
	}

	// send CA_PROTO_EVENTS_ON to server, no reply
	resumeEvents() {
		let buffer = Buffer.alloc(CA_MSG_HEADER_SIZE);
		GlobalMethods.generateCAHeader(
			buffer,
			0, // 0 offset
			CA_COMMANDS.CA_PROTO_EVENTS_ON, // 0x09
			0, // reserved
			0, // reserved
			0, // reserved
			0, // reserved
			0 // reserved
		);
		this.write(buffer);
		for (let name in this.channels) {
			const channel = this.channels[name];
			for (let subID in channel.monitors) {
				const monitor = channel.monitors[subID];
				monitor.status = monitor.SUBSCRIBED;
			}
		}
	}

	//todo: should it be async
	messageHandler(msg: Buffer) {
		// whenever we receive a TCP message, reset the inactive timer
		const thisMsgTime = new Date().getTime();
		if (thisMsgTime - this.lastMsgTime < (this.getEnv("EPICS_CA_TCP_INACTIVE_TIMEOUT") as number) * 1000) {
			this.lastMsgTime = thisMsgTime;
			// stop countdown
			// this.clearInactiveTimers();
            this.timeouts.clearAllTimeouts();
			// restart countdown
			// this.startInactiveTimers();
            this.timeouts.addTimeout("inactiveTimer1",  ((this.getEnv("EPICS_CA_BEACON_PERIOD") as number) + 1) * 1000, this.send_CA_PROTO_ECHO, []);
            this.timeouts.addTimeout("inactiveTimer2",  ((this.getEnv("EPICS_CA_BEACON_PERIOD") as number) * 2 + 1) * 1000, this.destroy, [false]);
            this.timeouts.startTimeout("inactiveTimer1");
            this.timeouts.startTimeout("inactiveTimer2");
		}

		let messages: Buffer[];
		[messages, this.residualMessage] = GlobalMethods.splitMessage(Buffer.concat([this.residualMessage, msg]));

		for (let message of messages) {
			printMsg(message, { address: this.serverAddress, port: this.serverPort }, "Received TCP");
		}

		for (let message of messages) {
			let command = message.readUInt16BE(0);
			if (command === CA_COMMANDS.CA_PROTO_VERSION) {
				// 0x00
				this.handle_CA_PROTO_VERSION(message);
			} else if (command === CA_COMMANDS.CA_PROTO_ACCESS_RIGHTS) {
				// 0x16
				this.handle_CA_PROTO_ACCESS_RIGHTS(message);
			} else if (command === CA_COMMANDS.CA_PROTO_CREATE_CHAN) {
				// reply for 0x12
				this.handle_CA_PROTO_CREATE_CHAN(message);
			}
			//todo: review logic
			else if (command === CA_COMMANDS.CA_PROTO_WRITE_NOTIFY) {
				// 0x13
				this.handle_CA_PROTO_WRITE_NOTIFY(message);
			} else if (command === CA_COMMANDS.CA_PROTO_READ_NOTIFY) {
				// 0x0f
				this.handle_CA_PROTO_READ_NOTIFY(message);
			} else if (command === CA_COMMANDS.CA_PROTO_EVENT_ADD) {
				// 0x01
				this.handle_CA_PROTO_EVENT_ADD(message);
			} else if (command === CA_COMMANDS.CA_PROTO_CLEAR_CHANNEL) {
				// 0x0c
				this.handle_CA_PROTO_CLEAR_CHANNEL(message);
			} else if (command === CA_COMMANDS.CA_PROTO_ECHO) {
				// 0x17
				this.handle_CA_PROTO_ECHO(message);
			} else if (command === CA_COMMANDS.CA_PROTO_ERROR) {
				// 0x0b
				this.handle_CA_PROTO_ERROR(message);
			} else if (command === CA_COMMANDS.CA_PROTO_SERVER_DISCONN) {
				// 0x1b, destroy channel, not TCP
				this.handle_CA_PROTO_SERVER_DISCONN(message);
			} else if (command === CA_COMMANDS.CA_PROTO_CREATE_CH_FAIL) {
				// 0x1a
				this.handle_CA_PROTO_CREATE_CH_FAIL(message);
			}
		}
	}

    removeChannel = (channelName: string) => {
        GlobalMethods.errorLog(`Removing channel "${channelName}" from TCPTransoprt "${this.key}"`)
        delete this.channels[channelName];
    }


    private subscriptionId: number = 0;
    getSubscriptionId = () => {
        return this.subscriptionId;
    }
    setSubscriptionId = (newId: number) => {
        this.subscriptionId = newId;
    }

    getMonitor = (subscriptionId: number): ChannelMonitor | undefined => {
        for (const channelName in this.channels) {
            const channel = this.channels[channelName];
            if (channel.getMonitor(subscriptionId) !== undefined) {
                return channel.getMonitor(subscriptionId);
            }
        }
        return undefined;
    }
}

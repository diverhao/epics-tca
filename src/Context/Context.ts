import { Buffer } from "buffer";
import { createCipheriv } from "crypto";
import { Worker as worker_threads_Worker } from "worker_threads";

import {
	Environment,
	ChannelMonitor,
	Beacon,
	GlobalMethods,
	UDPTransport,
	Channel,
	CA_MSG_HEADER_OFFSETS,
	ipInt2String,
	TCPTransports,
	CA_COMMANDS,
	CA_MSG_HEADER_SIZE,
} from "..";
import { Intervals } from "../Intervals/Intervals";
import { TCPTransport } from "../TCPTransport";
import { UDPTransportState } from "../UDPTransport";
import { ContextPromises } from "./ContextPromises";
import { IO_TYPES, ReadWriteIos } from "./ReadWriteIo";
// import { type_epicsEnv, type_epicsEnvCustom } from "../Global";

export enum Context_STATES {
	NOT_INITIALIZED,
	INITIALIZING,
	INITIALIZED,
	FAILED,
	DESTROYED,
}

export enum RepeaterThread_STATES {
	NOT_INITIALIZED,
	INITIALIZING,
	INITIALIZED,
	FAILED,
	DESTROYED,
}

//todo: update env at runtime

export class Context {
	readonly VERSION_MAJOR: number = 2022;
	readonly VERSION_MINOR: number = 5;
	readonly VERSION_REVISION: number = 0;

	readonly CA_VERION_MAJOR: number = 4;
	readonly CA_VERION_MINOR: number = 13;

	state: Context_STATES;

	intervals: Intervals;

	channelClientID: number;

	// Promise
	contextPromises: ContextPromises;

	// these 4 lists, there is another "resolvedChannelsByName" is TCPTransport.channels
	resolvedChannelsByClientID: Record<string, Channel>;
	resolvedChannelsByName: Record<string, Channel>;
	unresolvedChannelsByClientID: Record<string, Channel>;
	unresolvedChannelsByName: Record<string, Channel>;
    // fast looking for monitor
    monitorsBySubscriptionID: Record<string, ChannelMonitor> = {};

	// CA_PROTO_READ_NOTIFY, CA_PROTO_WRITE_NOTIFY, and CA_PROTO_WRITE
	readWriteIos: ReadWriteIos;

	// possibly multiple TCPTransports for a client
	tcpTransports: TCPTransports;
	// one UDPTransport for a context
	udpTransport: UDPTransport;

	repeaterThread: Worker | worker_threads_Worker | undefined;
	repeaterThreadState: RepeaterThread_STATES;

	// beaconTimeoutTimer: any;

	// 2 structures for monitors
	// for each entry:
	// channelName:  { subID: {
	//     emitEvent: boolean,
	//     dbrType: ...
	//     ...
	// }}
	// unresolvedMonitors: Record<string, Record<string, any>> = {};
	// channelName:  { subID: ChannelMonitor}
	// monitorsBySubID: Record<string, ChannelMonitor> = {};

	// monitorEmitter: EventEmitter;
	// searchPVBuffer: Buffer;
	searchPVsTimer: any;
	// versionBuffer: Buffer;

	envInstance: Environment | undefined;

	searchBulkPVsIntervalID: any = undefined;

	private readonly CA_PROTO_VERSION_msg: Buffer;
	private readonly CA_PROTO_SEARCH_bulk_msg: Buffer;

	// "userEnv"
	constructor(userEnv: Record<string, string> = {}) {
		const showAllInfo = false;
		GlobalMethods.DEBUG = showAllInfo;
		GlobalMethods.SHOWINFO = showAllInfo;
		GlobalMethods.SHOWERROR = true;

		this.envInstance = Environment.getInstance(userEnv);

		// a channel is resolved when the CA server responds to "CA_PROTO_SEARCH" UDP packet
		this.unresolvedChannelsByName = {};
		this.unresolvedChannelsByClientID = {};
		this.resolvedChannelsByClientID = {};
		this.resolvedChannelsByName = {};

		this.repeaterThread = undefined;

		this.channelClientID = 0;

		this.state = Context_STATES.NOT_INITIALIZED;

		this.tcpTransports = new TCPTransports(this);
		this.udpTransport = new UDPTransport(this);

		this.readWriteIos = ReadWriteIos.getInstance();

		// Block at 2 places:
		//   (1) let UDPTransport sending periodic UDP packet CA_REPEATER_REGISTER to CA Repeater
		//       When the Promise is fulfilled or rejected, the setInterval() is canceled
		//   (2) let Context.initialize() continue
		//       If the Promise is fulfilled, the Context.initialize() continues to set Context.state
		//       If the Promise is rejected, return Context.initialize() immediately, which causes
		//       the subsequent functions, like Context.createChannel(), fails or returns "null"
		this.contextPromises = new ContextPromises();
		this.contextPromises.append("CA_REPEATER_CONFIRM");

		this.CA_PROTO_VERSION_msg = Buffer.alloc(CA_MSG_HEADER_SIZE);
		this.CA_PROTO_SEARCH_bulk_msg = Buffer.alloc(this.getEnv("EPICS_CA_MAX_UDP_BUFFER") as number);
		this.intervals = new Intervals();
		this.intervals.addInterval(
			"CA_PROTO_SEARCH_bulk",
			(this.getEnv("EPICS_CA_MIN_SEARCH_PERIOD") as number) * 1000,
			this.send_CA_PROTO_SEARCH_bulk_msg,
			[]
		);

		this.repeaterThreadState = RepeaterThread_STATES.NOT_INITIALIZED;
	}

	// (1) bind UDP socket, start to listen to UDP messages
	// (2) create CA repeater thread
	// (3) register this CA client to CA repeater
	// non-blocking
	initialize = () => {
		if (this.state === Context_STATES.DESTROYED) {
			GlobalMethods.infoLog("Context destroyed, interrupt the context initialization.");
			return;
		} else if (this.state === Context_STATES.INITIALIZED) {
			GlobalMethods.infoLog("Context already initialized, quit.");
			return;
		} else if (this.state === Context_STATES.INITIALIZING) {
			GlobalMethods.infoLog("Context is being initialized, please wait.");
			try {
				// await this.contextPromises.get("CA_REPEATER_CONFIRM");
			} catch (e) {
				// happens when the Context is destroyed
				GlobalMethods.infoLog(`${e}`);
			}
			return;
		}
		GlobalMethods.infoLog("Initializing CA context");
		this.state = Context_STATES.INITIALIZING;

		this.initialize_CA_PROTO_VERSION_msg();
		this.initialize_CA_PROTO_SEARCH_bulk_msg();

		this.startCARepeater();

		this.startUDP();

		// the program can still run without registering to CA repeater
		this.state = Context_STATES.INITIALIZED;

		GlobalMethods.infoLog("CA context initialization succeed!");
	};

	private initialize_CA_PROTO_SEARCH_bulk_msg = () => {
		this.CA_PROTO_VERSION_msg.copy(this.CA_PROTO_SEARCH_bulk_msg);
	};

	private startUDP = async () => {
		this.udpTransport.socket.on("error", (error: any) => {
			GlobalMethods.errorLog(`${this.udpTransport.socket.address()} error: ${error}`);
			//todo what we should do? restart UDPTransport there is an error on client's UDP?
		});

		this.udpTransport.socket.on("message", async (msg: Buffer, info: Record<string, any>) => {
			await this.udpTransport.messageHandler(msg, info);
		});

		try {
			// bind to a random port
			this.udpTransport.socket.bind(() => {
				this.udpTransport.state = UDPTransportState.INITIALIZED;
				// allow sending data to broadcast address
				this.udpTransport.socket.setBroadcast(true);
				this.udpTransport.localPort = this.udpTransport.socket.address().port;
				this.udpTransport.localAddress = this.udpTransport.socket.address().address;
				// send 0x18 to CA repeater every second until replies
				this.udpTransport.registerToCARepeater();
				// start to periodically search PV
				this.searchBulkPVs();
			});
		} catch (e) {
			this.udpTransport.state = UDPTransportState.FAILED;
			this.state = Context_STATES.FAILED;
			GlobalMethods.errorLog(`UDPTransport socket binding failure. ${e}`);
		}

		// block until the UDPTransport is registered to CARepeater (received 0x11 CA_REPEATER_CONFIRM via UDP)
		try {
			GlobalMethods.infoLog("Registering client to CA repeater");
			await this.contextPromises.get("CA_REPEATER_CONFIRM");
			GlobalMethods.infoLog("CA client registered to CA repeater");
		} catch (e) {
			this.state = Context_STATES.FAILED;
			GlobalMethods.infoLog(`${e}`);
			return;
		}
	};

	public getEnv = (
		envName: string = ""
	): string | number | string[] | number[] | Record<string, string | number | string[] | number[]> | undefined => {
		return this.envInstance?.getEnv(envName);
	};

	public getEnvSource = () => {
		return this.envInstance?.getEnvSource();
	};

	startCARepeater = () => {
		GlobalMethods.infoLog("Starting CARepeater on port", this.getEnv("EPICS_CA_REPEATER_PORT"));

		// todo: electron.js runs the epics-tca in node.js main process, not renderer process
		// todo: do we need the isInBrowser() option ??
		// todo: in browser, we always use websocket
		// not exactly in browser, but in browser-like node.js environment, such as Electron.js
		if (GlobalMethods.isInBrowser()) {
			this.repeaterThread = new Worker(__dirname + "/../CARepeater/CARepeater.js", { name: "web worker", type: "module" });
			this.repeaterThread.onerror = (err: any) => {
				GlobalMethods.errorLog(err);
			};

			// when CARepeater worker thread is ready, send CA_REPEATER_REGISTER = 0x18 to CARepeater
			this.repeaterThread.onmessage = async (msg: any) => {
				if (msg.data === "ready") {
				}
				if (msg.data === "terminate") {
					GlobalMethods.infoLog("CA Repeater thread terminated");
					this.repeaterThread?.terminate();
				}
			};
		} else {
			// in node.js
			this.repeaterThread = new worker_threads_Worker(__dirname + "/../CARepeater/CARepeater.js");
			this.repeaterThreadState = RepeaterThread_STATES.INITIALIZING;
			this.repeaterThread.on("error", (err: any) => {
				GlobalMethods.errorLog(err);
			});

			this.repeaterThread.on("message", async (msg: any) => {
				GlobalMethods.infoLog("CARepater", msg);
				switch (msg) {
					case "ready":
						this.repeaterThreadState = RepeaterThread_STATES.INITIALIZED;
						break;
					case "terminate":
						this.repeaterThreadState = RepeaterThread_STATES.DESTROYED;
						await this.repeaterThread?.terminate();
						break;
					case "failed":
						// "error" event on socket, the port may be occupied
						this.repeaterThreadState = RepeaterThread_STATES.FAILED;
						await this.repeaterThread?.terminate();
						break;
				}
			});
		}
	};

	getTCPTransport = (key: string): TCPTransport | undefined => {
		return this.tcpTransports.getTCPTransport(key);
	};

	getChannelByName(
		name: string,
		serverSchedulingPriority: number = this.getEnv("EPICS_CA_SCHEDULING_PRIORITY_DEFAULT") as number
	): Channel | undefined {
		if (this.unresolvedChannelsByName[name] !== undefined) {
			return this.unresolvedChannelsByName[name];
		}
		if (this.resolvedChannelsByName[name] !== undefined) {
			return this.resolvedChannelsByName[name];
		}
		return undefined;
	}

	getChannelByClientID(clientID: number): Channel | undefined {
		if (this.unresolvedChannelsByClientID[clientID.toString()] !== undefined) {
			return this.unresolvedChannelsByClientID[clientID.toString()];
		}
		if (this.resolvedChannelsByClientID[clientID.toString()] !== undefined) {
			return this.resolvedChannelsByClientID[clientID.toString()];
		}
		return undefined;
	}

	createChannel = async (
		name: string,
		creationTimeout: number | undefined = undefined,
		serverSchedulingPriority: number = this.getEnv("EPICS_CA_SCHEDULING_PRIORITY_DEFAULT") as number
	): Promise<Channel | undefined> => {
		if (this.state !== Context_STATES.INITIALIZED) {
			GlobalMethods.errorLog("Context initialization failed, quit creating channel");
			return undefined;
		}
		// if the channel already exists
		let chan = this.getChannelByName(name, serverSchedulingPriority);
		if (chan !== undefined) {
			try {
				// in case multiple "createChannel()" methods are invoked at the same time, but
				// the TCP connection has not been established yet
				await chan.promises.get("CA_PROTO_CREATE_CHAN");
			} catch (e) {
				GlobalMethods.errorLog(`Error creating channel "${name}"`);
				GlobalMethods.errorLog(e);
				return undefined;
			}
			GlobalMethods.infoLog(`Channel "${name} already created.`);
			return chan;
		}

		let newChannel: Channel | undefined = undefined;

		try {
			this.channelClientID++;
			// 2^31, two billion, one hundred forty-seven million, four hundred eighty-three thousand, six hundred forty-eight
			if (this.channelClientID >= 0x80000000) {
				throw new Error(`Error creating channel "${name}", Context.channelClientID overflow`);
			}

			newChannel = new Channel(this, name, serverSchedulingPriority, creationTimeout);

			// blocked until CA_PROTO_SEARCH replies via UDP
			// then send out first few TCP messages and wait for CA_PROTO_VERSION reply
			await newChannel.createTCP();
			// send CA_PROTO_CREATE_CHAN, blocked until server replies
			await newChannel.create();
		} catch (e) {
			GlobalMethods.errorLog(`Error creating channel "${name}"`);
			GlobalMethods.errorLog(e);
			return undefined;
		}
		return newChannel;
	};

	// synchronous function, the returned object is updated after return
	createChannels = (names: string[], serverSchedulingPriority: number = this.getEnv("EPICS_CA_SCHEDULING_PRIORITY_DEFAULT") as number) => {
		const channels: Record<string, Channel | undefined> = {};
		for (let name of names) {
			channels[name] = undefined;
			this.createChannel(name, serverSchedulingPriority).then((channel: Channel | undefined) => {
				channels[name] = channel;
			});
		}
		return channels;
	};

	private send_CA_PROTO_SEARCH_bulk_msg = () => {
		let index = this.CA_PROTO_VERSION_msg.length;
		for (let pvName in this.unresolvedChannelsByName) {
			const channel = this.unresolvedChannelsByName[pvName];
			const doSearchPV = channel.doSearchPV();
			if (doSearchPV) {
                console.log(pvName)
				const CA_PROTO_SEARCH_msg = channel.get_CA_PROTO_SEARCH_msg();
				// msg is full
				if (index + CA_PROTO_SEARCH_msg.length >= this.CA_PROTO_SEARCH_bulk_msg.length) {
                    // create a hard copy buffer, otherwise the dgram may send the same contents
					const tmpBuffer = Buffer.from(this.CA_PROTO_SEARCH_bulk_msg);
					this.udpTransport.sendToBroadcastAddresses(tmpBuffer, 0, index);
					// clear msg
					index = this.CA_PROTO_VERSION_msg.length;
					this.CA_PROTO_SEARCH_bulk_msg.fill(0, index);
				}
				CA_PROTO_SEARCH_msg.copy(this.CA_PROTO_SEARCH_bulk_msg, index);
				index = index + CA_PROTO_SEARCH_msg.length;
			}
		}
		if (index > this.CA_PROTO_VERSION_msg.length) {
			const tmpBuffer = Buffer.from(this.CA_PROTO_SEARCH_bulk_msg);
			this.udpTransport.sendToBroadcastAddresses(tmpBuffer, 0, index);
		}
	};

	private searchBulkPVs = () => {
		// this.searchBulkPVsIntervalID = setInterval(() => {
		// 	this.send_CA_PROTO_SEARCH_bulk_msg();
		// }, (this.getEnv("EPICS_CA_MIN_SEARCH_PERIOD") as number) * 1000);
		this.intervals.startInterval("CA_PROTO_SEARCH_bulk");
	};

	private initialize_CA_PROTO_VERSION_msg() {
		//todo:
		const serverSchedulingPriority = 0;
		// CA_PROTO_VERSION
		GlobalMethods.generateCAHeader(
			this.CA_PROTO_VERSION_msg,
			0x00,
			CA_COMMANDS.CA_PROTO_VERSION, // 0x00
			0x00, // payload size
			serverSchedulingPriority, // desired priority
			this.CA_VERION_MINOR, // version number
			0x00,
			0x00
		);
	}

	// stop the running of Context, different from Context.terminate()
	// (1) reject Promises
	// (2) clear all Timers: no Timeouts in Context
	// (3) destroy all channels, which also stop all unresolved channel searches and reject all read/write IOs
	// (4) terminate CA Repeater thread
	// (5) destroy all Beacons in Context.beacons
	// (6) close all TCP
	// (7) close all UDP
	// (8) clear all Intervals
	// (9) destroy Environment, prepare for next "new Context(...)"
	// Note: there is no destroySoft() in here.
	public destroyHard = () => {
		// (1)
		this.contextPromises.rejectAll();
		// (2)
		// do nothing
		// (3)
		this.destroyAllChannelsHard();
		// (4)
		this.repeaterThread?.postMessage("terminate");
		// (5)
		for (let beaconKey in this.beacons) {
			const beacon = this.beacons[beaconKey];
			beacon.destroy();
		}
		// (6)
		this.tcpTransports.destroyHard();
		// (7)
		this.udpTransport.destroyHard();
		// (8)
		this.intervals.clearAllIntervals();
		// (9)
		Environment.destroyHard();
		this.envInstance = undefined;
	};

	private destroyAllChannelsHard = () => {
		for (const channelName in this.unresolvedChannelsByName) {
			const channel = this.unresolvedChannelsByName[channelName];
			channel.destroyHard();
		}
		for (const channelName in this.resolvedChannelsByName) {
			const channel = this.resolvedChannelsByName[channelName];
			channel.destroyHard();
		}
	};

	appendReadWriteIo = (channel: Channel, type: IO_TYPES, timeout: number | undefined = undefined, callback: undefined | (() => void) = undefined) => {
		return this.readWriteIos.appendIo(channel, type, timeout, callback);
	};

	rejectReadWriteIo = (id: number) => {
		return this.readWriteIos.rejectIo(id);
	};

	beacons: Record<string, Beacon> = {};

	// detect beacon anomaly, remove Beacon object if not received beacon for 2 periods
	processBeacon(message: Buffer, info: Record<string, any>) {
		let serverTcpPort = message.readUInt16BE(CA_MSG_HEADER_OFFSETS.dataCount);
		let serverAddressInt = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter2);
		let serverAddress = ipInt2String(serverAddressInt);
		let beaconID = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter1);
		let serverCaVersion = message.readUInt16BE(CA_MSG_HEADER_OFFSETS.dataType);

		const beaconKey = `${serverAddress}:${serverTcpPort}`;

		if (!this.beacons[beaconKey]) {
			this.beacons[beaconKey] = new Beacon(this, serverTcpPort, serverAddress, serverCaVersion);
		}

		const beacon = this.beacons[beaconKey];
		if (beacon === undefined) {
			return;
		}
		const networkChanged = beacon.updatePeriod(beaconID);
		// todo: test this updatePeriod function
		if (networkChanged === true) {
			const affectedTcpTransports = beacon.getTcpTransports();
			for (let affectedTcpTransport of affectedTcpTransports) {
				affectedTcpTransport.destroySoft();
			}
		}
		// From CA protocol:
		// "Clients wishing to detect new servers should maintain a list of all servers along with
		// the last BeaconID received, and the reception time. Servers SHOULD be removed from this
		// list when no Beacon is received for some time (two beacon periods is RECOMMENDED)."
		// Shall we implement it? What is it used for? The TCPTransoprt already has a mechanism to manage
		// the expired server.
	}
}

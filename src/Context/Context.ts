import { Buffer } from "buffer";
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
import { TCPTransport } from "../TCPTransport";
// import { type_epicsEnv, type_epicsEnvCustom } from "../Global";

export type type_io = {
	channel: Channel;
	promiseResolve: any;
	promiseReject: any;
	promiseFunction: Promise<Buffer>;
};

enum ContextState {
	NOT_INITIALIZED,
	INITIALIZING,
	INITIALIZED,
	DESTROYED,
	FAILED,
}

//todo: update env at runtime

export class Context {
	readonly VERSION_MAJOR: number = 2022;
	readonly VERSION_MINOR: number = 5;
	readonly VERSION_REVISION: number = 0;

	readonly CA_VERION_MAJOR: number = 4;
	readonly CA_VERION_MINOR: number = 13;

	state: ContextState;

	channelClientID: number;

	// monitor
	// subscriptionID: number = 0;
	// channelMonitorsBySubscriptionID: Record<string, ChannelMonitor>;

	// Promise
	CA_REPEATER_CONFIRM_Promise: Promise<string>;
	CA_REPEATER_CONFIRM_Resolve: any;
	CA_REPEATER_CONFIRM_Reject: any;

	// these 3 lists, the "resolvedChannelsByName" is TCPTransport.channels
	resolvedChannelsByClientID: Record<string, Channel>;
	unresolvedChannelsByClientID: Record<string, Channel>;
	unresolvedChannelsByName: Record<string, Channel>;

	// IOID: used by CA_PROTO_READ_NOTIFY, CA_PROTO_WRITE_NOTIFY, and CA_PROTO_WRITE
	ioID: number = 0;
	ioList: Record<string, type_io>;

	// possibly multiple TCPTransports for a client
	tcpTransports: TCPTransports;
	// one UDPTransport for a client
	udpTransport: UDPTransport;

	repeaterThread: Worker | worker_threads_Worker | null;

	// beaconTimeoutTimer: any;

	// 2 structures for monitors
	// for each entry:
	// channelName:  { subID: {
	//     emitEvent: boolean,
	//     dbrType: ...
	//     ...
	// }}
	unresolvedMonitors: Record<string, Record<string, any>> = {};
	// channelName:  { subID: ChannelMonitor}
	monitorsBySubID: Record<string, ChannelMonitor> = {};

	// monitorEmitter: EventEmitter;
	// searchPVBuffer: Buffer;
	searchPVsTimer: any;
	// versionBuffer: Buffer;

	envInstance: Environment;

	searchBulkPVsIntervalID: any = undefined;

	private readonly CA_PROTO_VERSION_msg: Buffer;
	private readonly CA_PROTO_SEARCH_bulk_msg: Buffer;

	constructor(userEnv: Record<string, string> = {}) {
		const showAllInfo = true;
		GlobalMethods.DEBUG = showAllInfo;
		GlobalMethods.SHOWINFO = showAllInfo;
		GlobalMethods.SHOWERROR = showAllInfo;

		this.envInstance = Environment.getInstance(userEnv);

		this.unresolvedChannelsByName = {};
		this.unresolvedChannelsByClientID = {};
		this.resolvedChannelsByClientID = {};

		this.repeaterThread = null;

		this.channelClientID = 0;

		this.state = ContextState.NOT_INITIALIZED;

		this.tcpTransports = new TCPTransports(this);
		this.udpTransport = new UDPTransport(this);

		// todo
		// this.subscriptionIDList = {};

		this.ioList = {};
		// this.channelMonitorsBySubscriptionID = {};

		// Block at 2 places:
		//   (1) let UDPTransport sending periodic UDP packet CA_REPEATER_REGISTER to CA Repeater
		//       When the Promise is fulfilled or rejected, the setInterval() is canceled
		//   (2) let Context.initialize() continue
		//       If the Promise is fulfilled, the Context.initialize() continues to set Context.state
		//       If the Promise is rejected, return Context.initialize() immediately, which causes
		//       the subsequent functions, like Context.createChannel(), fails or returns "null"
		this.CA_REPEATER_CONFIRM_Promise = new Promise((resolve, reject) => {
			this.CA_REPEATER_CONFIRM_Resolve = resolve;
			this.CA_REPEATER_CONFIRM_Reject = reject;
		});

		// One periodic task to check the Beacon's expieration, if expired, remove it
		// this.beaconTimeoutTimer = setInterval(() => {
		//     this.checkBeaconTimeout();
		// }, ((epicsEnv.EPICS_CA_BEACON_PERIOD as number) * 2 + 1) * 1000);
		// this.monitorEmitter = new EventEmitter();

		this.CA_PROTO_VERSION_msg = Buffer.alloc(CA_MSG_HEADER_SIZE);
		this.CA_PROTO_SEARCH_bulk_msg = Buffer.alloc(this.getEnv("EPICS_CA_MAX_UDP_BUFFER") as number);

		// this.searchPVBuffer = Buffer.alloc(CA_MSG_HEADER_SIZE);

		// this.versionBuffer.copy(this.CA_PROTO_SEARCH_bulk_msg, 0);
	}

	// (1) bind UDP socket, start to listen to UDP messages
	// (2) create CA repeater thread
	// (3) register this CA client to CA repeater
	async initialize() {
		if (this.state === ContextState.DESTROYED) {
			GlobalMethods.infoLog("Context destroyed, re-initialize the context.");
		} else if (this.state === ContextState.INITIALIZED) {
			GlobalMethods.infoLog("Context already initialized, quit.");
			return;
		} else if (this.state === ContextState.INITIALIZING) {
			GlobalMethods.infoLog("Context is being initialized, please wait.");
			try {
				await this.CA_REPEATER_CONFIRM_Promise;
			} catch (e) {
				GlobalMethods.errorLog(`${e}`);
			}
			return;
		}
		GlobalMethods.infoLog("Initializing CA context");
		this.state = ContextState.INITIALIZING;

		this.initialize_CA_PROTO_VERSION_msg();
		this.initialize_CA_PROTO_SEARCH_bulk_msg();

		this.startCARepeater();

		// blocked until the registration to CA repeater is successful
		await this.startUDP();

		this.state = ContextState.INITIALIZED;

		GlobalMethods.infoLog("CA context initialization succeed!");
	}

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

		// bind to a random port
		try {
			this.udpTransport.socket.bind({ address: "127.0.0.1" }, () => {
				this.udpTransport.localPort = this.udpTransport.socket.address().port;
				this.udpTransport.localAddress = this.udpTransport.socket.address().address;
                // send 0x18 to CA repeater every second until replies
                this.udpTransport.registerToCARepeater();
				// start to periodically search PV
				this.searchBulkPVs();
			});
		} catch (e) {
			this.state = ContextState.FAILED;
			GlobalMethods.errorLog(`UDPTransport socket binding failure. ${e}`);
		}

		// block until the UDPTransport is registered to CARepeater (received 0x11 CA_REPEATER_CONFIRM via UDP)
		try {
			GlobalMethods.infoLog("Registering client to CA repeater");
			await this.CA_REPEATER_CONFIRM_Promise;
			GlobalMethods.infoLog("CA client registered to CA repeater");
		} catch (e) {
			this.state = ContextState.FAILED;
			GlobalMethods.errorLog(`${e}`);
			return;
		}
	};

	public getEnv = (envName: string = ""): string | number | string[] | number[] | Record<string, string | number | string[] | number[]> => {
		return this.envInstance.getEnv(envName);
	};

	startCARepeater = () => {
		GlobalMethods.infoLog("Starting CARepeater on port", this.getEnv("EPICS_CA_REPEATER_PORT"));

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
			this.repeaterThread.on("error", (err: any) => {
				GlobalMethods.errorLog(err);
			});

			this.repeaterThread.on("message", async (msg: any) => {
				GlobalMethods.infoLog("CARepater", msg);
				switch (msg) {
					case "ready":
						break;
					case "terminate":
						await this.repeaterThread?.terminate();
						break;
				}
			});
		}
	};

	getTCPTransport = (key: string): TCPTransport | undefined => {
		return this.tcpTransports.getTCPTransport(key);
	};

	findChannel(name: string, serverSchedulingPriority: number = this.getEnv("EPICS_CA_SCHEDULING_PRIORITY_DEFAULT") as number) {
		if (this.unresolvedChannelsByName[name]) {
			return this.unresolvedChannelsByName[name];
		}
		for (let ii in this.tcpTransports.tcpTransports) {
			let tcpTransport = this.tcpTransports.tcpTransports[ii];
			if (tcpTransport.serverSchedulingPriority === serverSchedulingPriority) {
				if (tcpTransport.channels[name]) {
					return tcpTransport.channels[name];
				}
			}
		}
		return null;
	}

	async createChannel(name: string, serverSchedulingPriority: number = this.getEnv("EPICS_CA_SCHEDULING_PRIORITY_DEFAULT") as number) {
		if (this.state !== ContextState.INITIALIZED) {
			GlobalMethods.errorLog("Context initialization failed, quit creating channel");
			return null;
		}
		// if the channel already exists
		// let chan = this.findChannel(name, serverSchedulingPriority);
		// if (chan) {
		// 	return chan;
		// }

		//todo: ensure this number does not overflow
		this.channelClientID++;
		let newChannel = new Channel(this, name, serverSchedulingPriority);

        // blocked until CA_PROTO_SEARCH replies via UDP, and CA_PROTO_VERSION replies via TCP
		await newChannel.createTCP();
        // blocked until CA_PROTO_CREATE_CHAN replies
		await newChannel.create();
		return newChannel;
	}

	private send_CA_PROTO_SEARCH_bulk_msg = () => {
		let index = this.CA_PROTO_VERSION_msg.length;
		for (let pvName in this.unresolvedChannelsByName) {
			const channel = this.unresolvedChannelsByName[pvName];
			if (channel.doSearchPV()) {
				const CA_PROTO_SEARCH_msg = channel.get_CA_PROTO_SEARCH_msg();
				// msg is full
				if (index + CA_PROTO_SEARCH_msg.length >= this.CA_PROTO_SEARCH_bulk_msg.length) {
					this.udpTransport.sendToBroadcastAddresses(this.CA_PROTO_SEARCH_bulk_msg, 0, index);
					// clear msg
					index = this.CA_PROTO_VERSION_msg.length;
					this.CA_PROTO_SEARCH_bulk_msg.fill(0, index);
				}
				CA_PROTO_SEARCH_msg.copy(this.CA_PROTO_SEARCH_bulk_msg, index);
				index = index + CA_PROTO_SEARCH_msg.length;
			}
		}
		if (index > this.CA_PROTO_VERSION_msg.length) {
			this.udpTransport.sendToBroadcastAddresses(this.CA_PROTO_SEARCH_bulk_msg, 0, index);
		}
	};

	private searchBulkPVs = () => {
		this.searchBulkPVsIntervalID = setInterval(() => {
			this.send_CA_PROTO_SEARCH_bulk_msg();
		}, (this.getEnv("EPICS_CA_MIN_SEARCH_PERIOD") as number) * 1000);
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
	// (2) cancel all Timers
	// (3) stop all unresolved channel searches, the unresolved channels are managed by Context
	// (4) terminate CA Repeater thread
	// (5) destroy all Beacons in Context.beacons
	private destroy() {
		// (1) reject Promises
		this.CA_REPEATER_CONFIRM_Reject("");
		for (let ii in this.ioList) {
			let io = this.ioList[ii];
			io.promiseReject(`IOID ${ii} CA_PROTO_READ_NOTIFY interrupted`);
		}
		// (2) cancel all Timers
		// clearInterval(this.beaconTimeoutTimer);
		// (3) stop all unresolved channel searches, the unresolved channels are managed by Context
		for (let ii in this.unresolvedChannelsByName) {
			let unresolvedChannel = this.unresolvedChannelsByName[ii];
			unresolvedChannel.stopSearchPV();
		}
		clearInterval(this.searchPVsTimer); // stop broadcasting
		// (4) terminate CA Repeater thread
		this.repeaterThread?.postMessage("terminate");
		// (5) destroy all Beacons in Context.beacons
		for (let key in this.beacons) {
			const beacon = this.beacons[key];
			beacon.destroy();
		}
	}

	async terminate() {
		this.state = ContextState.DESTROYED;
		this.destroy();
		await this.tcpTransports.destroy(true); // no channel re-search
		await this.udpTransport.destroy();
	}

	// used by CA_PROTO_READ_NOTIFY 0x0f, CA_PROTO_WRITE_NOTIFY 0x13, and CA_PROTO_WRITE 0x04
	createIoID(channel: Channel) {
		//todo: a mechanism to recycle ioIDs, 4.3E9 can only handle 10k IOs per second for 5 days
		// 0xFFFFFFFF
		if (this.ioID === 4294967295) {
			this.ioID = 0;
		} else {
			this.ioID++;
		}

		let promiseResolve;
		let promiseReject;
		let promiseFunction = new Promise<any>((resolve, reject) => {
			promiseResolve = resolve;
			promiseReject = reject;
		});

		this.ioList[this.ioID.toString()] = {
			channel: channel,
			promiseResolve: promiseResolve,
			promiseReject: promiseReject,
			promiseFunction: promiseFunction,
		};
		return this.ioID;
	}

	subID: number = 0;

	createSubID() {
		//todo: a mechanism to recycle ioIDs, 4.3E9 can only handle 10k IOs per second for 5 days
		// 0xFFFFFFFF
		if (this.subID === 4294967295) {
			this.subID = 0;
		} else {
			this.subID++;
		}

		// let promiseResolve;
		// let promiseReject;
		// let promiseFunction = new Promise<string>((resolve, reject) => {
		//     promiseResolve = resolve;
		//     promiseReject = reject;
		// });

		// this.ioList[this.ioID.toString()] = {
		//     channel: channel,
		//     promiseResolve: promiseResolve,
		//     promiseReject: promiseReject,
		//     promiseFunction: promiseFunction,
		// };
		return this.subID;
	}

	beacons: Record<string, Beacon> = {};

	// detect beacon anomaly, remove Beacon object if not received beacon for 2 periods
	processBeacon(message: Buffer, info: Record<string, any>) {
		let serverTcpPort = message.readUInt16BE(CA_MSG_HEADER_OFFSETS.dataCount);
		let serverAddressInt = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter2);
		let serverAddress = ipInt2String(serverAddressInt);
		let beaconID = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter1);
		let version = message.readUInt16BE(CA_MSG_HEADER_OFFSETS.dataType);

		const beaconKey = `${serverAddress}:${serverTcpPort}`;

		if (!this.beacons[beaconKey]) {
			this.beacons[beaconKey] = new Beacon(this, serverTcpPort, serverAddress);
		}
		// todo: test this updatePeriod function
		// there is an anomly, re-search all unresolved channels
		if (this.beacons[beaconKey].updatePeriod(beaconID)) {
			for (let name in this.unresolvedChannelsByName) {
				let channel = this.unresolvedChannelsByName[name];
				// todo: test the re-search mechanism!
				// this re-search mechanism only applicable to unresolved channels
				// these channels are un-initialized
				// For a channel that has been working, we must destroy() this channel,
				// create a new Channel object, then searchPV() and create()
				channel.stopSearchPV();
				//HH it was not commented, as of 11/8/2022
				//HH channel.searchPV();
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

import { Buffer } from "buffer";

import {
	Context,
	Constants,
	TCPTransport,
	GlobalMethods,
	UDPTransport,
	ChannelMonitor,
	CA_COMMANDS,
	Environment,
	CA_MSG_HEADER_SIZE,
	CA_MSG_HEADER_OFFSETS,
	CA_EXT_MSG_HEADER_OFFSETS,
	CA_EXT_MSG_HEADER_SIZE,
} from "..";
import { IO_TYPES } from "../Context/ReadWriteIo";
import { ChannelPromises } from "./ChannelPromises";

import { Dbr } from "./Dbr";

// priority is on TCP connection level, not on channel level

// todo:
// from CAJChannel.java
// connectionState, lastConnectionState
// listeners, callback function list when the channel is connected (not updated)
// accessRightListeners, list
// consider all the channel related operations
// (TCP)transportChanged(): initiateSearch(), broadcast 0x06 UDP to search this channel
//   - when there is a beacon anomaly:
//     - a CA server is changed, e.g. reboot, network glitch, the
//     - a new CA server is added
// timeout(), what is this?
// registerMonitor()/unregister/destroy, there are many monitors for each channel
// how to sense the CA server is down? listen 'disconnect' event

// todo: access right change listener

export type type_dbrValue = Required<{
	value: string | string[] | number | number[];
}>;

export enum Channel_STATES {
	UNRESOLVED,
	RESOLVED, // after CA_PROTO_SEARCH
	CREATED, // after CA_PROTO_CREATE_CHAN, registered to CA server
	DISCONNECTED, // unexpected disconnection, recoverable
	DESTROYED, // cannot be recovered at all
	FAILED, // any other
}

export enum Channel_ACCESS_RIGHTS {
	NOT_AVAILABLE = -1,
	NO_ACCESS = 0,
	READ_ONLY,
	WRITE_ONLY,
	READ_WRITE,
}

export enum Channel_DBR_TYPES {
	NOT_AVAILABLE = -1,
	DBR_STRING = 0,
	DBR_INT = 1,
	DBR_SHORT = 1,
	DBR_FLOAT,
	DBR_ENUM,
	DBR_CHAR,
	DBR_LONG,
	DBR_DOUBLE,
	DBR_STS_STRING,
	DBR_STS_INT = 8,
	DBR_STS_SHORT = 8,
	DBR_STS_FLOAT,
	DBR_STS_ENUM,
	DBR_STS_CHAR,
	DBR_STS_LONG,
	DBR_STS_DOUBLE,
	DBR_TIME_STRING,
	DBR_TIME_INT = 15,
	DBR_TIME_SHORT = 15,
	DBR_TIME_FLOAT,
	DBR_TIME_ENUM,
	DBR_TIME_CHAR,
	DBR_TIME_LONG,
	DBR_TIME_DOUBLE,
	DBR_GR_STRING,
	DBR_GR_INT = 22,
	DBR_GR_SHORT = 22,
	DBR_GR_FLOAT,
	DBR_GR_ENUM,
	DBR_GR_CHAR,
	DBR_GR_LONG,
	DBR_GR_DOUBLE,
	DBR_CTRL_STRING,
	DBR_CTRL_INT = 29,
	DBR_CTRL_SHORT = 29,
	DBR_CTRL_FLOAT,
	DBR_CTRL_ENUM,
	DBR_CTRL_CHAR,
	DBR_CTRL_LONG,
	DBR_CTRL_DOUBLE,
	DBR_PUT_ACKT,
	DBR_PUT_ACKS,
	DBR_STSACK_STRING,
	DBR_CLASS_NAME,
}

export class Channel {
	context: Context;
	tcpTransport: TCPTransport | undefined;
	udpTransport: UDPTransport;

	dbr: Dbr;

	//todo: use setter and getters
	// intrinsic data
	private readonly name: string;
	private channelClientID: number;
	private channelServerID: number;
	private readonly serverSchedulingPriority: number;
	private accessRight: Channel_ACCESS_RIGHTS;
	private valueCount: number;
	// default type
	private dbrType: Channel_DBR_TYPES;
	private state: Channel_STATES;

	public getName = (): string => {
		return this.name;
	};

	public setChannelClientID = (id: number) => {
		this.channelClientID = id;
	};
	public getChannelClientID = (): number => {
		return this.channelClientID;
	};

	public setChannelServerID = (id: number) => {
		this.channelServerID = id;
	};
	public getChannelServerID = (): number => {
		return this.channelServerID;
	};

	public getServerSchedulingPriority = (): number => {
		return this.serverSchedulingPriority;
	};

	public getAccessRight = (): string => {
		return Channel_ACCESS_RIGHTS[this.accessRight];
	};

	public setAccessRight = (right: Channel_ACCESS_RIGHTS) => {
		this.accessRight = right;
	};

	public setValueCount = (count: number) => {
		this.valueCount = count;
	};

	public getValueCount = (): number => {
		return this.valueCount;
	};

	public getDbrTypeStr = (): string => {
		return Channel_DBR_TYPES[this.dbrType];
	};
	public getDbrTypeNum = (): Channel_DBR_TYPES => {
		return this.dbrType;
	};

	public setDbrType = (type: Channel_DBR_TYPES) => {
		this.dbrType = type;
	};

	public getStateNum = (): Channel_STATES => {
		return this.state;
	};

	public getStateStr = (): string => {
		return Channel_STATES[this.state];
	};

	public setState = (state: Channel_STATES) => {
		this.state = state;
	};

	private readonly CA_PROTO_SEARCH_msg: Buffer;

	// todo: other types

	// beaconAnomalyEmitter = new EventEmitter();
	readonly monitors: Record<string, ChannelMonitor> = {};

	private searchCounter: number = 0;
	private paddedNameSize: number = 0;

	promises: ChannelPromises;

	//todo listener
	constructor(context: Context, name: string, serverSchedulingPriority: number = -1) {
		// no change upon reconnecting
		this.context = context;
		this.udpTransport = this.context.udpTransport;
		this.name = name;
		this.channelClientID = this.context.channelClientID;
		this.paddedNameSize = GlobalMethods.getStringPaddedSize(this.name);

		//todo beacon anomaly and monitor
		// if the channel search is successful, move it to the proper TCPTransport
		// this.beaconAnomalyEmitter.on("beaconAnomalyDetected", async () => {
		//     // cancel current search() and start a new search()
		//     clearTimeout(this.searchSetTimeout);
		//     await this.search();
		// });
		// this.monitorUpdatedEmitter.on("monitorUpdated", async (data: Record<string, any>) => {
		//     GlobalMethods.debugLog(`CA monitor ${this.name} value updated to`, data);
		//     this.monitorValue = data;
		// })

		// may change between re-connect
		this.tcpTransport = undefined;
		this.serverSchedulingPriority =
			serverSchedulingPriority < 0 ? (this.getEnv("EPICS_CA_SCHEDULING_PRIORITY_DEFAULT") as number) : serverSchedulingPriority;

		this.channelServerID = 0xffffffff;
		this.state = Channel_STATES.UNRESOLVED;
		this.dbrType = Channel_DBR_TYPES.NOT_AVAILABLE;
		this.accessRight = Channel_ACCESS_RIGHTS.NOT_AVAILABLE;
		this.valueCount = -1;

		// this.createPromises();
		this.promises = new ChannelPromises();
		this.createPromises();

		this.dbr = new Dbr(this);

		// once initialized, searchBuffer will not be changed
		this.CA_PROTO_SEARCH_msg = Buffer.alloc(this.calcSearchBufferSize()); // calculate buffer size based on pv name
		this.initialize_CA_PROTO_SEARCH_msg();

		// the PV search automatically starts
		this.context.unresolvedChannelsByName[this.name] = this;
		this.context.unresolvedChannelsByClientID[this.channelClientID.toString()] = this;
	}

	createPromises = () => {
		this.promises.append("CA_PROTO_SEARCH");
		this.promises.append("CA_PROTO_CREATE_CHAN");
		this.promises.append("CA_PROTO_CLEAR_CHANNEL");
	};

	dbrValue: type_dbrValue = { value: -1 };

	setDbrValue = (value: type_dbrValue) => {
		this.dbrValue = value;
	};

	getDbrValue = (): type_dbrValue => {
		return this.dbrValue;
	};

	public getEnv = (envName: string): string | number | string[] | number[] | Record<string, string | number | string[] | number[]> => {
		return Environment.getInstance().getEnv(envName);
	};

	// --------------- search PV --------------------------------
	private calcSearchBufferSize = () => {
		const length = this.name.length;
		if (length % 8 === 0) {
			return CA_MSG_HEADER_SIZE + length + 8;
		}
		return CA_MSG_HEADER_SIZE + Math.floor(length / 8) * 8 + 8;
	};

	// one UDP packet with 2 commands: CA_PROTO_VERSION (0x00) and CA_PROTO_SEARCH (0x06)
	private initialize_CA_PROTO_SEARCH_msg() {
		GlobalMethods.generateCAHeader(
			this.CA_PROTO_SEARCH_msg,
			0,
			CA_COMMANDS.CA_PROTO_SEARCH, // 0x06
			GlobalMethods.getStringPaddedSize(this.name), // padded size of channel name
			0x00, // DO_REPLY flag, do not use it with UDP
			this.context.CA_VERION_MINOR, // version number
			this.channelClientID, // search ID, the channel client ID is used for simplicity
			this.channelClientID // duplicate of search ID
		);
		// payload, 32-byte offset
		this.CA_PROTO_SEARCH_msg.write(this.name, CA_MSG_HEADER_SIZE);
	}

	searchCounterMax: number = Math.floor(
		(this.getEnv("EPICS_CA_MAX_SEARCH_PERIOD") as number) / (this.getEnv("EPICS_CA_MIN_SEARCH_PERIOD") as number)
	);

	private isPowerOfTwo = (n: number) => {
		let cnt = 0;
		while (n > 0) {
			if ((n & 1) == 1) {
				cnt++; // if n&1 == 1 keep incrementing cnt
				// variable
			}
			n = n >> 1; // keep dividing n by 2 using right
			// shift operator
		}
		if (cnt == 1) {
			// if cnt = 1 only then it is power of 2
			return true;
		}
		return false;
	};

	public doSearchPV = (): boolean => {
		// if (this.state !== Channel_STATES.UNRESOLVED && this.state !== Channel_STATES.DISCONNECTED) {
		if (this.state !== Channel_STATES.UNRESOLVED) {
			return false;
		}
		// return this.updateSearchCounter() === 0 ? true : false;
		this.searchCounter++;
		if (this.searchCounter <= this.searchCounterMax) {
			this.searchCounter << 1;
			return this.isPowerOfTwo(this.searchCounter);
		} else {
			this.searchCounter = this.searchCounterMax + (this.searchCounter % this.searchCounterMax);
			if (this.searchCounter === 0) {
				return true;
			} else {
				return false;
			}
		}
	};

	public resetSearchCounter = () => {
		this.searchCounter = 0;
	};

	public get_CA_PROTO_SEARCH_msg = (): Buffer => {
		return this.CA_PROTO_SEARCH_msg;
	};
	public stopSearchAfterResolved = () => {
		// these 3 lists are always together
		delete this.context.unresolvedChannelsByName[this.name];
		delete this.context.unresolvedChannelsByClientID[this.channelClientID.toString()];
		this.context.resolvedChannelsByClientID[this.channelClientID.toString()] = this;
		this.context.resolvedChannelsByName[this.name] = this;
	};

	public resolvePV = () => {
		this.state = Channel_STATES.RESOLVED;
		this.stopSearchAfterResolved();
	};

	// ---------------- TCP -------------------------

	getTcpTransport = (): TCPTransport | undefined => {
		return this.tcpTransport;
	};
	getTcpTransportByKey = (key: string): TCPTransport | undefined => {
		return this.context.getTCPTransport(key);
	};

	// dt unit = milli-second
	async createTCP() {
		try {
			// resolve after receiving CA_PROTO_SEARCH reply via UDP
			const [serverAddress, serverTcpPort] = await this.promises.get("CA_PROTO_SEARCH");

			// stop broadcasting CA_PROTO_VERSION and CA_PROTO_SEARCH
			this.resolvePV();

			const serverSchedulingPriority = this.serverSchedulingPriority;
			const tcpTransportKey = `${serverAddress}:${serverTcpPort}:${serverSchedulingPriority}`;

			let tcpTransport = this.getTcpTransportByKey(tcpTransportKey);
			// Create TCPTransport if not exist yet
			if (tcpTransport === undefined) {
				GlobalMethods.infoLog(`TCPTransport ${tcpTransportKey} does not exist, creating it for ${this.name}`);
				tcpTransport = new TCPTransport(this.context, serverTcpPort, serverAddress, serverSchedulingPriority);
				console.log("");
				// blocks until CA_PROTO_VERSION replies via TCP
				await tcpTransport.initialize();
			}
			// ensure the TCPTransoprt's initialization is finished
			await tcpTransport.promises.get("initialization_finished");
			tcpTransport.addChannel(this);
		} catch (e) {
			GlobalMethods.errorLog(`PV search for ${this.name} interrupted`);
			GlobalMethods.errorLog(e);
		}
	}

	rejectAllIos = () => {
		this.context.readWriteIos.rejectChannelIos(this.name);
	};

	rejectAllPromises = () => {
		this.promises.rejectAll();
	};

	getPromise = (name: string) => {
		return this.promises.get(name);
	};

	// ----------------- senders -----------------------

	private send_CA_PROTO_CREATE_CHAN = () => {
		const payloadSize = this.paddedNameSize;
		let buffer = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE + payloadSize);
		GlobalMethods.generateCAHeader(
			buffer,
			0, // offset
			CA_COMMANDS.CA_PROTO_CREATE_CHAN, // command, 0x12
			payloadSize, //
			0x00, // reserved
			0x00, // reserved
			this.channelClientID, // channel ID
			this.context.CA_VERION_MINOR
		); // 0x0d
		buffer.write(this.name, Constants.CA_MESSAGE_HEADER_SIZE);
		if (this.tcpTransport === undefined) {
			throw new Error(`tcpTransport for ${this.name} not defined.`);
		} else {
			this.tcpTransport.write(buffer);
		}
	};

	private send_CA_PROTO_READ_NOTIFY = (dbrType: Channel_DBR_TYPES, valueCount: number) => {
		let ioID = this.appendIo(this, 0x0f);

		let buffer = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE); // 16 bytes
		//todo what if dataCount > CA server's data count?
		GlobalMethods.generateCAHeader(
			buffer,
			0,
			CA_COMMANDS.CA_PROTO_READ_NOTIFY, // 0x0f
			0, // payload size, must be 0
			dbrType, // desired DBR type
			valueCount, // desired number of elements
			this.channelServerID, // server's channel ID
			ioID
		); // ioID
		this.tcpTransport?.write(buffer);
		return ioID;
	};

	private send_CA_PROTO_CLEAR_CHANNEL = () => {
		let buffer = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE); // 16 bytes
		GlobalMethods.generateCAHeader(
			buffer,
			0,
			CA_COMMANDS.CA_PROTO_CLEAR_CHANNEL, // 0x0c
			0, // reserved
			0, // reserved
			0, // reserved
			this.channelServerID, // server's channel ID
			this.channelClientID
		); // client's channel ID
		this.tcpTransport?.write(buffer);
	};

	// 0x12, CA_PROTO_CREATE_CHAN
	public create = async () => {
		try {
			this.send_CA_PROTO_CREATE_CHAN();
			// lifted upon receiving reply of CA_PROTO_CREATE_CHAN command
			await this.promises.get("CA_PROTO_CREATE_CHAN");
			this.state = Channel_STATES.CREATED;
		} catch (e) {
			this.state = Channel_STATES.FAILED;
			GlobalMethods.errorLog(`Creation of channel ${this.name} interrupted.`, e);
		}
	};

	// ------------------------------- monitor --------------------------

	// todo: camonitor options
	// createMonitor(emitEvent: boolean = true, dbrType: number = this.dbrType, dataCount: number = this.dataCount, mask: number = 1) {
	createMonitor = (
		listener: ((monitor: ChannelMonitor) => void) | undefined,
		dbrType: number = this.dbrType,
		valueCount: number = this.valueCount,
		mask: number = 1
	): ChannelMonitor => {
		// if there is an existing monitor
		let monitorExisted = this.monitorAlreadyExist(dbrType, valueCount, mask);
		if (monitorExisted !== undefined) {
			GlobalMethods.errorLog(`Monitor for "${this.name}" with dbr type ${dbrType}, value count ${valueCount} and mask ${mask} already exists.`);
			return monitorExisted;
		}
		const subscriptionId = this.obtainSubscriptionId();
		GlobalMethods.infoLog(`Creating a monitor for ${this.name} with subscription ID ${subscriptionId}`);
		let monitor = new ChannelMonitor(this, subscriptionId, listener, dbrType, valueCount, mask);
		// not a sync
		monitor.subscribe();
		return monitor;
	};

	private appendIo = (channel: Channel, type: IO_TYPES) => {
		return this.context.appendReadWriteIo(channel, type);
	};

	getSubscriptionId = () => {
		return this.getTcpTransport()?.getSubscriptionId();
	};

	setSubscriptionId = (newId: number) => {
		this.getTcpTransport()?.setSubscriptionId(newId);
	};

	addMonitor = (monitor: ChannelMonitor) => {
		const subscriptionId = monitor.subscriptionId;
		if (this.getMonitor(subscriptionId) === undefined) {
			this.monitors[subscriptionId.toString()] = monitor;
		} else {
			GlobalMethods.infoLog(`Channel monitor ${this.name} already exists`);
		}
	};
	removeMonitor = (monitor: ChannelMonitor) => {
		const subscriptionId = monitor.subscriptionId;
		delete this.monitors[subscriptionId.toString()];
	};

	removeAllMonitors = () => {
		for (let subscriptionIdStr in this.monitors) {
			delete this.monitors[subscriptionIdStr];
		}
	};

	private monitorAlreadyExist = (dbrType: Channel_DBR_TYPES, valueCount: number, mask: number): ChannelMonitor | undefined => {
		for (let subscriptionIdStr in this.monitors) {
			const monitor = this.monitors[subscriptionIdStr];
			if (monitor.dbrType === dbrType && monitor.valueCount === valueCount && monitor.mask === mask) {
				return monitor;
			}
		}
		return undefined;
	};

	private obtainSubscriptionId = (): number => {
		const currentId = this.getSubscriptionId();
		if (currentId === undefined) {
			throw new Error(`TcpTransport has not been defined yet`);
		}
		let id = currentId + 1;
		while (!this.validateSubscriptionId(id)) {
			if (id === 4294967295) {
				id = 0;
			} else {
				id++;
			}
		}
		this.setSubscriptionId(id);
		return id;
	};

	private validateSubscriptionId = (id: number): boolean => {
		// id already used
		if (this.tcpTransport?.getMonitor(id) !== undefined) {
			return false;
		}
		// id out of range
		if (id >= 4294967295 || id < 0) {
			return false;
		}
		return true;
	};

	getMonitor = (subscriptionID: number): ChannelMonitor | undefined => {
		return this.monitors[subscriptionID.toString()];
	};

	// --------------------------- get -------------------------
	// todo: caget() options
	get = async (dbrType: Channel_DBR_TYPES = this.dbrType, valueCount: number = this.valueCount) => {
		if (this.state !== Channel_STATES.CREATED) {
			GlobalMethods.errorLog(`${this.name}'s connection state is ${this.state}, cannot get()`);
		}

		GlobalMethods.infoLog(`Trying to get('${this.name}') from ${this.tcpTransport?.serverAddress}:${this.tcpTransport?.serverPort}`);

		try {
			let ioID = this.send_CA_PROTO_READ_NOTIFY(dbrType, valueCount);

			// lifted after received reply of CA_PROTO_READ_NOTIFY
			let message = await this.getIoPromise(ioID);

			let HEADER_OFFSETS = CA_MSG_HEADER_OFFSETS;
			let HEADER_SIZE = CA_MSG_HEADER_SIZE;
			if (GlobalMethods.isExtendedMessageHeader(message, 0)) {
				HEADER_OFFSETS = CA_EXT_MSG_HEADER_OFFSETS;
				HEADER_SIZE = CA_EXT_MSG_HEADER_SIZE;
			}
			dbrType = message.readUInt16BE(HEADER_OFFSETS.dataType);
			let payloadSize = message.readUInt16BE(HEADER_OFFSETS.payloadSize);
			valueCount = message.readUInt16BE(HEADER_OFFSETS.dataCount);
			ioID = message.readUInt32BE(HEADER_OFFSETS.parameter2);
			let dbrBuffer = message.slice(HEADER_SIZE, HEADER_SIZE + payloadSize);

			this.decodeDBRBuffer(dbrBuffer, dbrType, valueCount);
			return { ...this.dbr.getMeta(), value: this.dbr.getValue() };
		} catch (e) {
			GlobalMethods.errorLog(`Channel ${this.name} get() operation interrupted.`);
			GlobalMethods.errorLog(e);
		}
	};

	getIoPromise = (id: number) => {
		return this.context.readWriteIos.getIoPromise(id);
	};

	rejectIo = (id: number) => {
		this.context.rejectReadWriteIo(id);
	};

	decodeDBRBuffer = (dbrBuffer: Buffer, dbrType: Channel_DBR_TYPES, valueCount: number) => {
		this.dbr.decodeBuffer(dbrBuffer, dbrType, valueCount);
		return { ...this.dbr.getMeta(), value: this.dbr.getValue() };
	};

	encodeDBRBuffer = (value: number | number[] | string | string[]) => {
		return this.dbr.encodeBuffer(value);
	};

	// ------------------------ put ---------------------------
	// todo: caput() options
	async put(dbrValue: any[], dbrType: number = this.dbrType, waitNotify: boolean = false) {
		// let data = null;

		// if (this.state !== Channel_STATES.CREATED) {
		// 	GlobalMethods.errorLog(`${this.name}'s connection state is ${this.state}, cannot get()`);
		// 	return data;
		// }

		// GlobalMethods.infoLog(`put('${this.name}') to ${this.tcpTransport?.serverAddress}:${this.tcpTransport?.serverPort}`);

		// let ioID = this.context.createIoID(this);
		// if (dbrData.length > this.dataCount) {
		// 	GlobalMethods.errorLog(`Channel.put() error: too many elements. ${dbrData.length} > ${this.dataCount}`);
		// 	return -1;
		// }
		// // todo: do we need something like dbr_time as data?? Check Java version
		// let buffer = this.encodeDBRBuffer(dbrData, dbrType, waitNotify);
		// if (this.tcpTransport !== null && buffer !== null) {
		// 	GlobalMethods.debugLog("Sending", buffer?.toString("hex"), "to", this.tcpTransport?.serverAddress, ":", this.tcpTransport?.serverPort);
		// 	await this.tcpTransport?.write(buffer);
		// }
		// if (waitNotify) {
		// 	let ioIdPromise = this.context.ioList[ioID.toString()].promiseFunction;
		// 	try {
		// 		await ioIdPromise;
		// 	} catch (e) {
		// 		GlobalMethods.errorLog(`Error on WRITE_NOTIFY reply for ${this.name}.`, e);
		// 		delete this.context.ioList[ioID.toString()];
		// 		// does not get reply, failed
		// 		return false;
		// 	}
		// }
		// delete this.context.ioList[ioID.toString()];
		// todo: return value
		return true;
	}

	// ---------------------- destroy ---------------------------

	// destroy hard: when we want to shut down the client program
	// (1) remove this channel from arrays in Context, by doing this, the search is also stopped
	// (2) remove this channel from arrays in TCPTransoprt
	// (3) reject all read/write IOs (Promises) in this Channel
	// (4) reject all other Promises in this Channel, e.g. "CA_PROTO_SEARCH"
	// (5) destroy all monitors
	// Note: (1) keep TCPTransoprt, even there is no channel on this TCPTransoprt. The TCPTransoprt
	//           is destroyed only when we specifically do it.
	public destroyHard = () => {
		if (this.state === Channel_STATES.DESTROYED) {
			GlobalMethods.infoLog(`Channel ${this.name} already destroyed`);
			return;
		}
		this.state = Channel_STATES.DESTROYED;
		GlobalMethods.errorLog(`Destroying channel "${this.name}"`);
		// (5) must be the first one
		this.destroyAllMonitorsHard();
		// (1)
		delete this.context.unresolvedChannelsByName[this.name];
		delete this.context.unresolvedChannelsByClientID[this.channelClientID.toString()];
		delete this.context.resolvedChannelsByClientID[this.channelClientID.toString()];
		delete this.context.resolvedChannelsByName[this.name];
		// (2)
		this.tcpTransport?.removeChannel(this.name);
		// (3)
		this.rejectAllIos();
		// (4)
		this.rejectAllPromises();
		GlobalMethods.errorLog(`Channel "${this.name}" destroyed.`);
	};

	// destroy soft: when the TCP/network is broken/problematic, automatically re-connect all channels and monitors
	// (1) move this channel to Context.unresolvedChannelsByClientID and Contex.unresolvedChannelsByName
	// (2) remove this channel from arrays in TCPTransoprt, the TCPTransoprt may have been destroyed
	// (2.1) set this.tcpTansport to undefined
	// (3) reject all read/write IOs (Promises) in this Channel
	// (4) reject all other Promises in this Channel, e.g. "CA_PROTO_SEARCH"
	// (5) destroy all monitors softly
	// (6) re-create all promises
	// (7) re-search and connect the PV, the new TCPTransoprt
	// (8) re-subscribe all monitors, the subscriptionId keeps the same. This is the last step.
	// Note: (1) TCPTransoprt will be destroyed (in another place)
	//       (2) there is no Interveral or Timeout in Channel
	public destroySoft = async () => {
		if (this.state === Channel_STATES.DISCONNECTED) {
			GlobalMethods.infoLog(`Channel ${this.name} is already disconnected`);
			return;
		}
		this.state = Channel_STATES.DISCONNECTED;
		GlobalMethods.errorLog(`Destroying channel "${this.name}" softly`);
		// (5) must be the first one
		this.destroyAllMonitorsSoft();
		// (1)
		this.context.unresolvedChannelsByName[this.name] = this;
		this.context.unresolvedChannelsByClientID[this.channelClientID.toString()] = this;
		delete this.context.resolvedChannelsByClientID[this.channelClientID.toString()];
		delete this.context.resolvedChannelsByName[this.name];
		// (2)
		this.tcpTransport?.removeChannel(this.name);
		// (2.1)
		this.tcpTransport = undefined;
		// (3)
		this.rejectAllIos();
		// (4)
		this.rejectAllPromises();
		// (6)
		// an async function
		await this.reSearchAndConnectInDestroySoft();
		// (7)
		this.reSubscribeAllMonitors();
		// this.reSubscribeAllMonitors();
		GlobalMethods.errorLog(`Channel "${this.name}" destroyed softly. Re-search this PV.`);
	};

	private reSubscribeAllMonitors = () => {
		for (const subscriptionIdStr in this.monitors) {
			GlobalMethods.errorLog(`Re-subscribe monitor ${subscriptionIdStr} for ${this.name}`);
			const monitor = this.monitors[subscriptionIdStr];
			monitor.subscribe();
		}
	};

	// the channel state was "DISCONNECTED"
	private reSearchAndConnectInDestroySoft = async () => {
		if (this.state !== Channel_STATES.DISCONNECTED) {
			GlobalMethods.errorLog(`The channel state must be "DISCONNECTED", but it is ${this.getStateStr()}`);
			return undefined;
		}
		// re-create all promises, they have been destroyed in destroySoft()
		this.createPromises();
		// reset the search counter
		this.state = Channel_STATES.UNRESOLVED;
		this.resetSearchCounter();

		try {
			// blocked until CA_PROTO_SEARCH replies via UDP, and CA_PROTO_VERSION replies via TCP
			await this.createTCP();
			// blocked until CA_PROTO_CREATE_CHAN replies
			await this.create();
		} catch (e) {
			GlobalMethods.errorLog(`Error creating channel "${this.name}"`);
			GlobalMethods.errorLog(e);
			return undefined;
		}
	};

	// the channel state was "UNRESOLVED", that means there is another function waiting to process
	// the connection to CA server, we only need to reset search counter to accelerate the search
	// this happens when a new IOC is online
	public reSearchAndConnect = async () => {
		if (this.state !== Channel_STATES.UNRESOLVED) {
			GlobalMethods.errorLog(`The channel state must be "DISCONNECTED", but it is ${this.getStateStr()}`);
			return undefined;
		}
		// reset the search counter
		this.resetSearchCounter();
	};

	destroyAllMonitorsHard = () => {
		for (let subscriptionId in this.monitors) {
			const monitor = this.getMonitor(parseInt(subscriptionId));
			monitor?.destroyHard();
		}
	};

	destroyAllMonitorsSoft = () => {
		for (let subscriptionId in this.monitors) {
			const monitor = this.getMonitor(parseInt(subscriptionId));
			monitor?.destroySoft();
		}
	};
}

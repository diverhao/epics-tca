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
	CREATED, // after CA_PROTO_CREATE_CHAN
	MONITORED, //
	FAILED, // any exception
    DISCONNECTED, // unexpected disconnection
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

	// todo: define type_dbrTime
	dbrTime: Record<string, any> = {};
	// todo: other types

	// beaconAnomalyEmitter = new EventEmitter();
	//todo: emit event when the monitor updates
	// monitorUpdatedEmitter = new EventEmitter();
	// monitorValue: Record<string, any> = {};
	monitors: Record<string, ChannelMonitor> = {};


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
        this.promises = new ChannelPromises()
        this.promises.append("CA_PROTO_SEARCH");
        this.promises.append("CA_PROTO_CREATE_CHAN");
        this.promises.append("CA_PROTO_CLEAR_CHANNEL");

        this.dbr = new Dbr(this);

		// once initialized, searchBuffer will not be changed
		this.CA_PROTO_SEARCH_msg = Buffer.alloc(this.calcSearchBufferSize()); // calculate buffer size based on pv name
		this.initialize_CA_PROTO_SEARCH_msg();

		this.loadOldMonitors();

		// the PV search automatically starts
		this.context.unresolvedChannelsByName[this.name] = this;
		this.context.unresolvedChannelsByClientID[this.channelClientID.toString()] = this;
	}

	dbrValue: type_dbrValue = {value: -1};

	setDbrValue = (value: type_dbrValue) => {
		this.dbrValue = value;
	};

    getDbrValue = (): type_dbrValue => {
        return this.dbrValue;
    }

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

    // new IOC becomes online
    public reSearchPV = () => {
        this.searchCounter = 0;
    }

	public get_CA_PROTO_SEARCH_msg = (): Buffer => {
		return this.CA_PROTO_SEARCH_msg;
	};
	public stopSearch = () => {
		// these 3 lists are always together
		delete this.context.unresolvedChannelsByName[this.name];
		delete this.context.unresolvedChannelsByClientID[this.channelClientID.toString()];
		this.context.resolvedChannelsByClientID[this.channelClientID.toString()] = this;
		this.context.resolvedChannelsByName[this.name] = this;
	};

	public resolvePV = () => {
		this.state = Channel_STATES.RESOLVED;
		this.stopSearch();
	};

	// ----------------- monitor ----------------------------

	async loadOldMonitors() {
		if (this.context.unresolvedMonitors[this.name]) {
			for (let subIDStr in this.context.unresolvedMonitors[this.name]) {
				const monitorData = this.context.unresolvedMonitors[this.name][subIDStr] as Record<string, any>;
				let monitor = this.createMonitor(monitorData.listener, monitorData.dbrType, monitorData.dataCount, monitorData.mask);
				monitor.subscribe();
			}
		}
		delete this.context.unresolvedMonitors[this.name];
	}

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
			// let [serverAddress, serverTcpPort] = await this.CA_PROTO_SEARCH_Promise;
			let [serverAddress, serverTcpPort] = await this.promises.get("CA_PROTO_SEARCH");

			// stop broadcasting CA_PROTO_VERSION and CA_PROTO_SEARCH
			this.resolvePV();

			const serverSchedulingPriority = this.serverSchedulingPriority;
			const tcpTransportKey = `${serverAddress}:${serverTcpPort}:${serverSchedulingPriority}`;

			let tcpTransport = this.getTcpTransportByKey(tcpTransportKey);
			// Create TCPTransport if not exist yet
			if (tcpTransport === undefined) {
				GlobalMethods.infoLog(`TCPTransport ${tcpTransportKey} does not exist, creating it for ${this.name}`);
				tcpTransport = new TCPTransport(this.context, serverTcpPort, serverAddress, serverSchedulingPriority);
				// blocks until CA_PROTO_VERSION replies via TCP
				await tcpTransport.initialize();
				GlobalMethods.infoLog(`TCPTransport ${tcpTransportKey} initialization finished`);
			}
			// ensure the TCPTransoprt's initialization is finished
			await tcpTransport.initialization_finished_Promise;
			//todo: shall we determine channel exists in this tcpTransport?
			tcpTransport.addChannel(this);
		} catch {
			GlobalMethods.errorLog(`PV search for ${this.name} interrupted`);
		}
	}

	rejectAllIos = () => {
		this.context.readWriteIos.rejectChannelIos(this.name);
	};

    rejectAllPromises = () => {
        this.promises.rejectAll();
    }

    getPromise = (name: string) => {
        return this.promises.get(name);
    }


	// stopSearchPV() {
	// 	if (this.searchPVTimer) {
	// 		clearTimeout(this.searchPVTimer);
	// 	}
	// }

	// todo: implement the following behaviors for all scenarios
	// a channel becomes offline/canceled/removed in following scenarios:
	// (1) passively by others --> will do re-search, by Channel.destroy() + Context.createChannel()
	//     (i) on TCP level, should start from TCPTransport
	//        (a) TCP socket "close" event, it is closed by server gracefully, e.g. server is killed
	//        (b) TCP socket "error" event, it has an error
	//        (e) no TCP packet after 30 seconds, and no reply from CA_PROTO_ECHO
	//     (ii) on channel level
	//        (a) received a CA_PROTO_SERVER_DISCONN from server TCP --> TCPTransport.handle_CA_PROTO_SERVER_DISCONN()
	//        (b) received a CA_PROTO_CREATE_CH_FAIL from server TCP --> TCPTransport.handle_CA_PROTO_SERVER_DISCONN()
	// (2) actively by client itself --> no re-search, by Channel.destroy()
	//     (a) whole program exits
	//     (b) we do not need this channel anymore
	//     (c) after sending out CA_PROTO_CLEAR_CHANNEL and received reply

	// Destroy this Channel, completely wipe it from the program. Does the following:
	// (1) stop search PV: Channel.searchPVTimer
	// (2) remove this channel from Context.unresolvedChannels
	// (3) clear all IOs, this.context.ioList[ioId].channel, .promise, ..., need to find them
	// (4) reject all promises in Channel
	// (5) remove Channel from TCPTransport.channels: Record<string, Channel>
	// (6) cancel all monitor subscriptions
	// todo: (7) shall the TCPTransport be destroyed if there is no channel left?
	public destroy(hard: boolean) {
		GlobalMethods.infoLog("Destroying channel", this.name);

		// (1 and 2) remove from resolved/unresolvedChannels list, which also stops searching PV
		delete this.context.unresolvedChannelsByName[this.name];
		delete this.context.unresolvedChannelsByClientID[this.channelClientID.toString()];
		delete this.context.resolvedChannelsByClientID[this.channelClientID.toString()];
		delete this.context.resolvedChannelsByName[this.name];

		// (5) remove from TCPTransport's channel list
		this.tcpTransport?.removeChannel(this.name);

		// (3) reject and delete all IOs for this channel
		this.rejectAllIos();

		// (4) reject all promises
		this.rejectAllPromises();

		// (6) cancel all monitor subscriptions
		// if it is a hard destroy(), do nothing,
		// if it is a soft destroy, move all ChannelMonitor objects to Context.unresolvedMonitors
		// does the following, for each monitor subscription:
		//  (1) send CA_PROTO_EVENT_CANCEL to server, no need to wait reply
		//  (2) if it is a soft destroy(), move the ChannelMonitor objects to Context.unresolvedMonitors
		for (let subIDStr in this.monitors) {
			let monitor = this.monitors[subIDStr];
			monitor.destroy(hard);
		}

		// destroy() all ChannelMonitor objects,
		// if the TCPTransport.destroy() is soft, re-search all subscriptions, if hard, then just destroy them
		// Q: how to preserve the

		GlobalMethods.infoLog("Channel", this.name, "destroyed");

		// // all channel monitors are canceled autoamtically on server side
		// // only need to delte the references to these channel monitors
		// for (let subscriptionID in this.context.channelMonitorsBySubscriptionID) {
		//     let channelMonitor = this.context.channelMonitorsBySubscriptionID[subscriptionID];
		//     if (channelMonitor.channel === this) {
		//         // channelMonitor.channel = null;
		//         delete this.context.channelMonitorsBySubscriptionID[subscriptionID];
		//     }
		// }

		// if (this.tcpTransport !== null) {
		//     if (Object.keys(this.tcpTransport.channelsByServerID).length === 0) {
		//         // remove this tcpTansport
		//         TCPTransport.removeTCPTransportAndReconnectChannels(this.tcpTransport);
		//     }
		// }

		// GlobalMethods.debugLog(`Channel ${this.name} cleared`);
	}


	// clear the channel, initiated by CA client, so the destroy is "hard"
	public async clear() {
		GlobalMethods.infoLog("Clearing channel", this.name);

		try {
            this.send_CA_PROTO_CLEAR_CHANNEL();
			// wait for the reply
			// await this.CA_PROTO_CLEAR_CHANNEL_Promise;
			await this.promises.get("CA_PROTO_CLEAR_CHANNEL");
		} catch {
			GlobalMethods.errorLog(`Failed to clear channel ${this.name}`);
		}
		// hard destroy
		this.destroy(true); // hard destroy
		GlobalMethods.debugLog(`Channel ${this.name} cleared`);
	}

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
			// await this.CA_PROTO_CREATE_CHAN_Promise;
			await this.promises.get("CA_PROTO_CREATE_CHAN");
			this.state = Channel_STATES.CREATED;
		} catch (e) {
			this.state = Channel_STATES.FAILED;
			GlobalMethods.errorLog(`Creation of channel ${this.name} interrupted.`, e);
		}
	};

	// todo: camonitor options
	// createMonitor(emitEvent: boolean = true, dbrType: number = this.dbrType, dataCount: number = this.dataCount, mask: number = 1) {
	createMonitor(
		listener: ((monitor: ChannelMonitor) => any) | null,
		dbrType: number = this.dbrType,
		valueCount: number = this.valueCount,
		mask: number = 1
	): ChannelMonitor {
		// if there is an existing one
		for (let subID in this.monitors) {
			const monitor = this.monitors[subID];
			if (monitor.dbrType === dbrType && monitor.valueCount == valueCount && monitor.mask === mask) {
				return monitor;
			}
		}
        //todo: should be done in TcpTranport: subscriptionID should be unique for each virtual circuit 
		let subID = this.context.createSubID();
		GlobalMethods.infoLog(`Creating a monitor for ${this.name} with subscription ID ${subID}`);
		// let monitor = new ChannelMonitor(this, subID, dbrType, dataCount, mask, emitEvent);
		let monitor = new ChannelMonitor(this, subID, listener, dbrType, valueCount, mask);
		this.monitors[subID.toString()] = monitor;
		return monitor;
	}

	private appendIo = (channel: Channel, type: IO_TYPES) => {
		return this.context.appendReadWriteIo(channel, type);
	};


	getIoPromise = (id: number) => {
		return this.context.readWriteIos.getIoPromise(id);
	};

	// todo: caget() options
	async get(dbrType: Channel_DBR_TYPES = this.dbrType, valueCount: number = this.valueCount) {
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
            return {...this.dbr.getMeta(), value: this.dbr.getValue()};
		} catch (e) {
			GlobalMethods.errorLog(`Channel ${this.name} get() operation interrupted.`);
			GlobalMethods.errorLog(e);
		}
	}

	rejectIo = (id: number) => {
		this.context.rejectReadWriteIo(id);
	};

	decodeDBRBuffer = (dbrBuffer: Buffer, dbrType: Channel_DBR_TYPES, valueCount: number) => {
		this.dbr.decodeBuffer(dbrBuffer, dbrType, valueCount);
        return {...this.dbr.getMeta(), value: this.dbr.getValue()};
	};

	encodeDBRBuffer = (value: number | number[] | string | string[]) => {
		return this.dbr.encodeBuffer(value);
	};

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

}

import { Buffer } from "buffer";

import {
	Channel,
	Context,
	TCPTransport,
	GlobalMethods,
	Constants,
	CA_COMMANDS,
	Environment,
	CA_MSG_HEADER_OFFSETS,
	CA_MSG_HEADER_SIZE,
	CA_EXT_MSG_HEADER_OFFSETS,
	CA_EXT_MSG_HEADER_SIZE,
} from "..";

import { Channel_DBR_TYPES, Channel_STATES } from "./Channel";

export class ChannelMonitor {
	context: Context;
	channel: Channel;
	// tcpTransport: TCPTransport | undefined;

	// a channel monitor is identified by:
	mask: number;
	valueCount: number;
	dbrType: Channel_DBR_TYPES;

	name: string;
	// channelServerID: number;
	channelClientID: number;
	subscriptionId: number;


	firstDataReceived: boolean;


	// subID: number;
	SUBSCRIBED: number;
	NOT_SUBSCRIBED: number;
	PAUSED: number;

	// emitEvent: boolean;
	// eventName: string;
	// stores the most recent value
	// value: Record<string, any>;

	listener: ((monitor: ChannelMonitor) => void) | undefined;

	status: number;
	constructor(
		channel: Channel,
		subscriptionId: number,
		listener: ((monitor: ChannelMonitor) => void) | undefined,
		dbrType: Channel_DBR_TYPES,
		valueCount: number,
		mask: number
	) {
		this.NOT_SUBSCRIBED = 0;
		this.SUBSCRIBED = 1;
		this.PAUSED = 2;
		this.status = this.NOT_SUBSCRIBED;

		this.channel = channel;
		this.context = this.channel.context;
		// this.tcpTransport = this.channel.tcpTransport;

		// this.dbrType = dbrType;
		// this.valueCount = this.channel.getValueCount();
		// this.mask = mask;

		if (typeof dbrType === "undefined") {
			this.dbrType = channel.getDbrTypeNum();
		} else {
			this.dbrType = dbrType;
		}
		if (typeof valueCount === "undefined") {
			this.valueCount = channel.getValueCount();
		} else {
			this.valueCount = valueCount;
		}
		if (typeof mask === "undefined") {
			this.mask = 0x05;
		} else {
			this.mask = mask;
		}
		if (typeof listener === "undefined") {
			listener = undefined;
		}

		this.listener = listener;
		// this.subID = subID;


		this.name = this.channel.getName();
		this.channelClientID = this.channel.getChannelClientID();

		this.subscriptionId = subscriptionId;

		// this.cancelChannelMonitorPromise = new Promise((resolve, reject) => {
		// 	this.cancelChannelMonitorResolve = resolve;
		// 	this.cancelChannelMonitorReject = reject;
		// });

		this.firstDataReceived = false;

		// this.on("updated", () => {})
		// this.channel.context.monitorsBySubID[this.subID.toString()] = this;

		this.channel.addMonitor(this);

        // updated upon subscription or re-subscription
		// this.tcpTransport = undefined;

        // this.channelServerID = -1;
        // this.value = {};

		let prioritySuffix = "";
		if (this.channel.getServerSchedulingPriority() !== this.getEnv("EPICS_CA_SCHEDULING_PRIORITY_DEFAULT")) {
			prioritySuffix = "_CAPriority" + this.getEnv("serverSchedulingPriority").toString();
		}
		// this.eventName = this.name + prioritySuffix;
	}

    

	public getEnv = (envName: string): string | number | string[] | number[] | Record<string, string | number | string[] | number[]> => {
		return Environment.getInstance().getEnv(envName);
	};


	send_CA_PROTO_EVENT_ADD = () => {
		const payloadSize = 16; // const
		let buffer = Buffer.alloc(CA_MSG_HEADER_SIZE + payloadSize);
		GlobalMethods.generateCAHeader(
			buffer,
			0, // 0 offset
			CA_COMMANDS.CA_PROTO_EVENT_ADD, // 0x01
			payloadSize, // fixed number, 16
			this.dbrType, // desired data type, default is the server provided data type
			this.valueCount, // desired data count
			this.channel.getChannelServerID(), // channel server ID
			this.subscriptionId // subscription ID, unique for each TCP connection
		);
		buffer.writeUInt16BE(this.mask, CA_MSG_HEADER_SIZE + 12);
		this.channel.tcpTransport?.write(buffer);
	};

    subscribe() {
		if (this.status === this.SUBSCRIBED) {
			GlobalMethods.infoLog(`This monitor has been subscribed`);
			return;
		}

		if (this.channel.getStateNum() !== Channel_STATES.CREATED) {
			GlobalMethods.errorLog(`Creation of channel ${this.name} for monitor interrupted.`);
		}

		// this.channelServerID = this.channel.getChannelServerID();
		// this.channel.tcpTransport = this.channel.tcpTransport;
		this.send_CA_PROTO_EVENT_ADD();
	}

	decodeBuffer = (message: Buffer) => {
		let HEADER_OFFSETS = CA_MSG_HEADER_OFFSETS;
		let HEADER_SIZE = CA_MSG_HEADER_SIZE;
		if (GlobalMethods.isExtendedMessageHeader(message, 0)) {
			HEADER_OFFSETS = CA_EXT_MSG_HEADER_OFFSETS;
			HEADER_SIZE = CA_EXT_MSG_HEADER_SIZE;
		}

		let payloadSize = message.readUInt16BE(HEADER_OFFSETS.payloadSize);
		let dbrType = message.readUInt16BE(HEADER_OFFSETS.dataType);
		let valueCount = message.readUInt16BE(HEADER_OFFSETS.dataCount);
		// Note: EPICS CA protocol spec is wrong, CA_PROTO_WRITE_NOTIFY is correct
		// it is "status code", not SID,
		// where there are almost 60 "status code"
		//todo analyze status code, and do the response
		let status = message.readUInt32BE(HEADER_OFFSETS.parameter1);
		let subID = message.readUInt32BE(HEADER_OFFSETS.parameter2);
		let dbrBuffer = message.slice(HEADER_SIZE, HEADER_SIZE + payloadSize);
        // Channel.dbr is updated
		this.channel.decodeDBRBuffer(dbrBuffer, dbrType, valueCount);

		if (this.listener !== undefined) {
			this.listener(this);
		}
	};

	getChannel = (): Channel => {
		return this.channel;
	};

    // ------------------------ cancel/pause/resume --------------------------


	send_CA_PROTO_EVENTS_OFF = () => {
		let buffer0x08 = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE);
		// CA_PROTO_EVENTS_OFF
		GlobalMethods.generateCAHeader(buffer0x08, 0, 0x08, 0, 0, 0, 0, 0);
		this.channel.getTcpTransport()?.write(buffer0x08);
	};

    // pause ALL CA monitors on this CA server
	pauseAllChannelMonitors() {
		this.send_CA_PROTO_EVENTS_OFF();
	}

	// resume ALL CA monitors on this CA server
	async resumeAllChannelMonitors() {
		let buffer0x09 = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE);
		// CA_PROTO_EVENTS_ON
		GlobalMethods.generateCAHeader(buffer0x09, 0, 0x09, 0, 0, 0, 0, 0);
		if (this.channel.tcpTransport !== null) {
			GlobalMethods.debugLog(
				`sending ${buffer0x09.toString("hex")} to ${this.channel.getTcpTransport()?.serverAddress}:${
					this.channel.getTcpTransport()?.serverPort
				}`
			);
			await this.channel.getTcpTransport()?.write(buffer0x09);
		}
	}


	send_CA_PROTO_EVENT_CANCEL = () => {
		let buffer = Buffer.alloc(CA_MSG_HEADER_SIZE);
		GlobalMethods.generateCAHeader(
			buffer,
			0, // 0 offset
			CA_COMMANDS.CA_PROTO_EVENT_CANCEL, // 0x02
			0, // must be 0
			this.dbrType, // identify this subscription
			this.valueCount, // identify this subscription
			this.channel.getChannelServerID(), // identify this subscription
			this.subscriptionId // identify this subscription
		);
		this.channel.tcpTransport?.write(buffer);
	};

	// todo: do we need the reply?
    // (1) send CA_PROTO_EVENT_CANCEL, no need to wait reply
	// destroy(hard: boolean) {
        // this.send_CA_PROTO_EVENT_CANCEL();
        // if (hard) {
        //     this.channel.removeAllMonitors();
        // }
        // else {

        // }
		// if (!hard) {
        //     //todo very bad idea to use this to save the data
		// 	// let monitor = this;
		// 	// let monitorData = {
		// 	// 	// emitEvent: monitor.emitEvent,
		// 	// 	listener: monitor.listener,
		// 	// 	dbrType: monitor.dbrType,
		// 	// 	dataCount: monitor.valueCount,
		// 	// 	mask: monitor.mask,
		// 	// };
		// 	// if (!this.context.unresolvedMonitors[this.name]) {
		// 	// 	this.context.unresolvedMonitors[this.name] = {};
		// 	// }
		// 	// this.context.unresolvedMonitors[this.name][this.subID.toString()] = monitorData;
		// 	// // delete this.context.monitorsBySubID[this.subID.toString()];
		// }
	// }

    // (1) send out "CA_PROTO_EVENT_CANCEL" to CA server, no need to wait for reply
    // (2) remove this monitor from array in Channel
    // Note: there is no Promise in a ChannelMonitor
    destroyHard = () => {
        // (1)
        this.send_CA_PROTO_EVENT_CANCEL();
        // (2)
        this.channel.removeMonitor(this);
    }

    // (1) send out "CA_PROTO_EVENT_CANCEL" to CA server, not expecting a reply
    destroySoft = () => {
        // (1)
        this.send_CA_PROTO_EVENT_CANCEL();
    }
}

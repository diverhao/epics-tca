import { IncomingMessage } from "http";
import { WebSocket, Server, RawData } from "ws";
import { Context, ChannelMonitor, Channel_DBR_TYPES } from "..";
import { ChannelMonitor_MASKS, Channel } from "../Channel";
import { Environment, GlobalMethods, type_environment_options } from "../Global";
import { WSServer, type_channelData } from "./WSServer";

// repesent a client
export class WSClient {
	webSocket: WebSocket;
	id: string;
	context: Context;
	server: WSServer;
	constructor(id: string, webSocket: WebSocket, context: Context, server: WSServer) {
		this.webSocket = webSocket;
		this.id = id;
		this.context = context;
		this.server = server;
		this.webSocket.on("message", (message: RawData) => {
			this.handle_message(message);
		});
		this.webSocket.on("close", (code: number, reason: Buffer) => {
			GlobalMethods.infoLog(`Client ${this.id} is closed, cleaning up all its channels and monitors.`);
			this.handle_CLOSE_ALL_CHANNELS(["CLOSE_ALL_CHANNELS"]);
			this.server.removeWebSocketClient(this.id);
		});
	}

	allowedCommands = [`CLOSE_CHANNEL`, `CLOSE_ALL_CHANNELS`, `GET`, `PUT`, `MONITOR`, `CLOSE_MONITOR`, `CLOSE_ALL_MONITORS`, `help`];

	handle_message = async (message: RawData) => {
		GlobalMethods.debugLog(`Received "${message}" from ${this.id}`);
		const messageStr = message.toString();
		const messageParts = messageStr.split(" ");
		const cmd = messageParts[0];
		if (!this.allowedCommands.includes(cmd)) {
			GlobalMethods.errorLog(`Command "${cmd}" does not exists`);
			return;
		}
		switch (cmd) {
			case "GET":
				this.handle_GET(messageParts);
				break;
			case "MONITOR":
				this.handle_MONITOR(messageParts);
				break;
			case "CLOSE_MONITOR":
				this.handle_CLOSE_MONITOR(messageParts);
				break;
			case "CLOSE_ALL_MONITORS":
				this.handle_CLOSE_ALL_MONITORS(messageParts);
				break;
			case "CLOSE_CHANNEL":
				this.handle_CLOSE_CHANNEL(messageParts);
				break;
			case "CLOSE_ALL_CHANNELS":
				this.handle_CLOSE_ALL_CHANNELS(messageParts);
				break;
			case "PUT":
				this.handle_PUT(messageParts);
				break;
			case "GET_INFO_ALL_MONITORS":
				break;
			case "GET_INFO_MONITOR":
				break;
			case "help":
				this.handle_help();
				break;
		}
	};

	public getEnv = (envName: string = ""): string | number | string[] | number[] | Record<string, string | number | string[] | number[]> | undefined => {
		return Environment.getInstance().getEnv(envName);
	};

	// ------------ help ----------------
	// behaviors:
	// CLOSE_CHANNEL channelName
	//  - try to close all this channel's monitors that are subscribed to this client
	//    if this monitor has no subscriber, then close this monitor
	//  - if all monitors in this channel are closed, then close this channel, no matter
	//    if there are pending IOs
	// CLOSE_ALL_CHANNELS
	//  - run the above CLOSE_CHANNEL command for all the channels that are subscribed by
	//    this client
	// CLOSE_MONITOR subscriptionId
	//  - try to close the specified monitor, if the monitor has no other subscriber, then
	//    close the monitor
	// CLOSE_MONITOR channelName
	//  - try to close all monitors for this channel, if the monitor has no other subscriber,
	//    then close the monitor
	// CLOSE_ALL_MONITORS
	//  - try to close all monitors subscribed by this client, if the monitor has no other subscriber,
	//    then close this monitor

	private helpContents = `CLOSE_CHANNEL channelName \n
	CLOSE_ALL_CHANNELS \n
	GET channelName [-d dbrType] [-c dataCount] [-w timeout (seconds)] [-h] \n
	PUT channelName ?? \n
	MONITOR channelName [-d dbrType] [-c dataCount] [-m mask] [-h] \n
	CLOSE_MONITOR subscriptionId \n
	CLOSE_MONITOR channelName \n
	CLOSE_ALL_MONITORS \n`;

	handle_help = () => {
		this.sendTextToClient("help", this.helpContents);
	};

	// ------------- put -----------------

	handle_PUT = (messageParts: string[]) => {
		//todo
	};

	// -------- close all channels -------
	// close all channels in this client, invoked upon client closing
	handle_CLOSE_ALL_CHANNELS = (messageParts: string[]) => {
		for (let subscriptionIdStr in this.server.getMonitorsSubscribers()) {
			const subscriptionId = parseInt(subscriptionIdStr);
			const monitorSubscribers = this.server.getMonitorSubscribers(subscriptionId);
			if (Object.keys(monitorSubscribers).includes(this.id)) {
				const monitor = this.server.getChannelMonitorBySubscriptionId(subscriptionId);
				const channel = monitor?.channel;
				const channelName = channel?.getName();
				if (channelName !== undefined) {
					this.handle_CLOSE_CHANNEL(["CLOSE_CHANNEL", channelName]);
				}
			}
		}
	};

	// --------- close channel ----------
	handle_CLOSE_CHANNEL = (messageParts: string[]) => {
		let ii = 1;
		// either subscriptionId or pv name
		const channelName = messageParts[ii];
		const channel = this.context.getChannelByName(channelName);
		if (channel === undefined) {
			return;
		}
		for (let subscribeIdStr in channel.monitors) {
			this.handle_CLOSE_MONITOR(["CLOSE_MONITOR", subscribeIdStr]);
		}
		if (Object.keys(channel.monitors).length === 0) {
			console.log("Destroy hard the channel", channelName);
			channel.destroyHard();
		}
	};

	// --------- close all monitors -----------
	// "CLOSE_ALL_MONITORS": close all monitors from this client
	handle_CLOSE_ALL_MONITORS = (messageParts: string[]) => {
		for (let subscriptionIdStr in this.server.getMonitorsSubscribers()) {
			const subscriptionId = parseInt(subscriptionIdStr);
			const monitorSubscribers = this.server.getMonitorSubscribers(subscriptionId);
			if (Object.keys(monitorSubscribers).includes(this.id)) {
				this.handle_CLOSE_MONITOR(["CLOSE_MONITOR", subscriptionIdStr]);
			}
		}
	};

	// ---------- close monitor ---------
	handle_CLOSE_MONITOR = (messageParts: string[]) => {
		let ii = 1;
		// either subscriptionId or pv name
		const parameterStr = messageParts[ii];
		if (isNaN(parseInt(parameterStr))) {
			// pv name
			const monitors = this.server.getChannelMonitorsByChannelName(parameterStr);
			if (monitors === undefined) {
				return;
			}
			for (let monitor of monitors) {
				// monitor is destroyed if there is no other subscriber
				this.server.removeMonitorSubscriber(monitor.subscriptionId, this);
			}
		} else {
			// subscriptionId
			const monitor = this.server.getChannelMonitorBySubscriptionId(parseInt(parameterStr));
			if (monitor === undefined) {
				return;
			}
			// monitor is destroyed if there is no other subscriber
			this.server.removeMonitorSubscriber(monitor.subscriptionId, this);
		}
	};

	// ---------- monitor ------------

	handle_MONITOR = async (messageParts: string[]) => {
		const channelName = messageParts[1];
		let ii = 2;
		let dbrTypeNum: number | undefined = undefined;
		// let timeout: number | undefined = undefined;
		let valueCount: number | undefined = undefined;
		let mask: number | undefined = undefined;
		while (ii < messageParts.length) {
			const messagePart = messageParts[ii];
			switch (messagePart) {
				// dbrType
				case "-d":
					ii = ii + 1;
					const dbrTypeStr = messageParts[ii];
					// "undefined" is allowed
					dbrTypeNum = Channel_DBR_TYPES[dbrTypeStr as keyof typeof Channel_DBR_TYPES];
					break;
				//todo: timeout
				// timeout, seconds
				// case "-w":
				// 	ii = ii + 1;
				// 	let timeoutStr = messageParts[ii];
				// 	// "undefined" is allowed
				// 	timeout = parseInt(timeoutStr);
				// 	if (isNaN(timeout)) {
				// 		// 1000 ms
				// 		timeout = (this.getEnv("READ_WRITE_IO_DEFAULT_TIMEOUT") as number) * 1000;
				// 	}
				// 	break;
				// desired value count
				case "-c":
					ii = ii + 1;
					let dataCountStr = messageParts[ii];
					// "undefined" is allowed
					valueCount = parseInt(dataCountStr);
					if (isNaN(valueCount)) {
						valueCount = undefined;
					}
					break;
				// desired value count
				case "-m":
					ii = ii + 1;
					let maskStr = messageParts[ii];
					// "undefined" is allowed
					mask = parseInt(maskStr);
					if (isNaN(mask) || !Object.values(ChannelMonitor_MASKS).includes(mask)) {
						mask = undefined;
					}
					break;
				case "-h":
					// ignore all other parameters
					//todo:
					const data = "this is the options ... todo ...";
					this.sendTextToClient(" ", data);
					return;
				default:
					break;
			}
			ii = ii + 1;
		}
		this.monitor(channelName, this.monitorListener, dbrTypeNum, valueCount, mask);
	};

	monitor = async (
		channelName: string,
		listener: (monitor: ChannelMonitor) => void,
		dbrType?: Channel_DBR_TYPES,
		valueCount?: number,
		mask?: number
	): Promise<void> => {
		const channel = await this.context.createChannel(channelName);
		const monitor = await channel?.createMonitor(listener, dbrType, valueCount, mask);
		if (monitor == undefined) {
			return;
		}
		this.server.addMonitorSubscriber(monitor.subscriptionId, this);

		// get a value immediately
		const immediateChannelData = await this.get(channelName, dbrType, valueCount);
		if (immediateChannelData !== undefined) {
			this.sendChannelDataToClient(immediateChannelData);
		}
	};

	monitorListener = (monitor: ChannelMonitor) => {
		const channel = monitor.getChannel();
		const subscriptionId = monitor.getSubscriptionId();
		const meta = channel.dbr.getMeta();
		const value = channel.dbr.getValue();
		// this.sendChannelDataToClient({
		this.server.sendChannelMonitorDataToClients(subscriptionId, {
			channelName: channel.getName(),
			...meta,
			value: value,
			subscriptionId: subscriptionId,
			webSocketCommand: "MONITOR",
		});
	};

	// --------------- get -----------
	// timeout is handled in the
	handle_GET = async (messageParts: string[]) => {
		// channel name
		const channelName = messageParts[1];
		let ii = 2;
		let dbrTypeNum: number | undefined = undefined;
		let timeout: number | undefined = undefined;
		let valueCount: number | undefined = undefined;
		while (ii < messageParts.length) {
			const messagePart = messageParts[ii];
			// dbrType
			switch (messagePart) {
				case "-d":
					ii = ii + 1;
					const dbrTypeStr = messageParts[ii];
					// "undefined" is allowed
					dbrTypeNum = Channel_DBR_TYPES[dbrTypeStr as keyof typeof Channel_DBR_TYPES];
					break;
				// timeout, seconds
				case "-w":
					ii = ii + 1;
					let timeoutStr = messageParts[ii];
					// "undefined" is allowed
					timeout = parseInt(timeoutStr);
					if (isNaN(timeout)) {
						// 1000 ms
						timeout = (this.getEnv("READ_WRITE_IO_DEFAULT_TIMEOUT") as number) * 1000;
					}
					break;
				// desired value count
				case "-c":
					ii = ii + 1;
					let dataCountStr = messageParts[ii];
					// "undefined" is allowed
					valueCount = parseInt(dataCountStr);
					if (isNaN(valueCount)) {
						valueCount = undefined;
					}
					break;
				case "-h":
					// ignore all other parameters
					//todo:
					const data = "this is the options ... todo ...";
					this.sendTextToClient("GET help", data);
					return;
				default:
					console.log("--------------->");
					break;
			}
			ii = ii + 1;
		}
		console.log(channelName, dbrTypeNum, valueCount, timeout);
		const data = await this.get(channelName, dbrTypeNum, valueCount, timeout);
		if (data !== undefined) {
			this.sendChannelDataToClient(data);
		} else {
			// do nothing
		}
	};

	get = async (
		channelName: string,
		dbrType?: Channel_DBR_TYPES,
		valueCount?: number,
		timeout?: number
	): Promise<(Record<string, any> & type_channelData) | undefined> => {
		//todo: the await may never return
		const channel = await this.context.createChannel(channelName);
		// this.server.addChannelSubscriber(channelName, this);
		if (typeof timeout === "number") {
			// seconds to milli-seconds
			timeout = timeout * 1000;
		}
		// "result" contains both meta and value, default timeout = 1000 ms
		const result = await channel?.get(dbrType, valueCount, timeout);
		//todo: what should we return if there is an error?
		if (channel === undefined) {
			return undefined;
		} else {
			if (result === undefined) {
				return undefined;
			} else {
				return { channelName: channel.getName(), ...result, webSocketCommand: "GET" };
			}
		}
	};

	// ------------------- send --------------------

	sendTextToClient = (textTitle: string, textContents: string) => {
		const obj: Record<string, string> = {};
		obj[textTitle] = textContents;
		this.webSocket.send(JSON.stringify(obj));
	};

	sendChannelDataToClient = (channelData: Record<string, any> & type_channelData) => {
		this.webSocket.send(JSON.stringify(channelData));
	};
}

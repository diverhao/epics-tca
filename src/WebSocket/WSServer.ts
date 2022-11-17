import { IncomingMessage } from "http";
import { WebSocket, Server, RawData } from "ws";
import { Context, ChannelMonitor, Channel_DBR_TYPES } from "..";
import { ChannelMonitor_MASKS } from "../Channel";
import { Environment, GlobalMethods, type_environment_options } from "../Global";

//todo: how to manage subscriptions for monitors and channels, the closing sequence.

type type_channelData = {
	channelName: string;
	value: string | number | string[] | number[];
	webSocketCommand: "GET" | "MONITOR";
};

export class WSServer {
	// each WebSocket server has a context
	context: Context;
	server: Server | undefined;
	clients: Record<string, WSClient>;
    // key: channelName
    channelsSubscribers: Record<string, Record<string, WSClient>> = {};
    // key: subscriptionId
    monitorsSubscribers: Record<string, Record<string, WSClient>> = {};

	constructor(options: Record<string, any> = {}, userEnv: Record<string, string> = {}) {
		this.context = new Context(userEnv);
		this.clients = {};
		this.context.initialize().then(() => {
			GlobalMethods.infoLog(`Context initialization finished with following settings:`);
			GlobalMethods.infoLog(this.context.getEnv());
			this.createWebSocketServer();
		});
	}

	createWebSocketServer = () => {
		this.server = new WebSocket.Server({
			port: 8080,
		});
		this.server.on("connection", (webSocket: WebSocket, request: IncomingMessage) => {
			GlobalMethods.infoLog(`Connection establised with client ${request.socket.remoteAddress} port ${request.socket.remotePort}`);
			const webSocketId = `${request.socket.remoteAddress}_${request.socket.remotePort?.toString()}`;
			this.clients[webSocketId] = new WSClient(webSocketId, webSocket, this.context, this);
		});
	};

    addChannelSubscriber = (channelName: string, client: WSClient) => {
        const channelSubscribers = this.channelsSubscribers[channelName];
        if (channelSubscribers === undefined) {
            this.channelsSubscribers[channelName] = {};
        }
        this.channelsSubscribers[channelName][client.id] = client;
    }

    removeChannelSubscriber = (channelName: string, client: WSClient) => {
        const channelSubscribers = this.channelsSubscribers[channelName];
        delete channelSubscribers[client.id];
        // if there is no subscriber, then destroyHard this channel 
        if (Object.keys(this.getChannelSubscribers(channelName)).length === 0) {
            const channel = this.context.getChannelByName(channelName);
            channel?.destroyHard();
        }
    }

    addMonitorSubscriber = (subscribeId: number, client: WSClient) => {
        const monitorSubscribers = this.monitorsSubscribers[subscribeId.toString()];
        if (monitorSubscribers === undefined) {
            this.monitorsSubscribers[subscribeId.toString()] = {};
        }
        this.monitorsSubscribers[subscribeId.toString()][client.id] = client;
    }


    removeMonitorSubscriber = (subscriptionId: number, client: WSClient) => {
        const monitorSubscribers = this.monitorsSubscribers[subscriptionId.toString()];
        delete monitorSubscribers[client.id];
        // if there is no subscriber for this monitor, then destroyHard this monitor
        if (Object.keys(this.getMonitorSubscribers(subscriptionId)).length === 0) {
            for (let channelName in this.context.resolvedChannelsByName) {
                const channel = this.context.resolvedChannelsByName[channelName];
                if (Object.keys(channel?.monitors).includes(subscriptionId.toString())) {
                    const monitor = channel?.monitors[subscriptionId.toString()];
                    monitor?.destroyHard();
                    if (Object.keys(channel?.monitors).length === 0) {
                        channel.destroyHard();
                    }
                    return;
                }
            }
        }
    }


    getMonitorSubscribers = (subscriptionId: number): Record<string, WSClient> => {
        const monitorSubscribers = this.monitorsSubscribers[subscriptionId.toString()];
        if (monitorSubscribers === undefined) {
            return {}
        }
        return monitorSubscribers;
    }

    getChannelSubscribers = (channelName: string): Record<string, WSClient> => {
        const channelSubscribers = this.channelsSubscribers[channelName];
        if (channelSubscribers === undefined) {
            return {}
        }
        return channelSubscribers;
    }

    // remove all channels
	removeClient = () => {};
}

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
	}

	allowedCommands = [
		`CREATE_CHANNEL`,
		`CLOSE_CHANNEL`,
		`CLOSE_ALL_CHANNELS`,
		`GET`,
		`PUT`,
		`MONITOR`,
		`CLOSE_MONITOR`,
		`CLOSE_ALL_MONITORS`,
		`PAUSE_MONITOR`,
		`PAUSE_ALL_MONITORS`,
	];


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
			case "CLOSE_CHANNEL":
				this.handle_CLOSE_CHANNEL(messageParts);
				break;
            case "help":
				this.handle_help();
                break;
		}
	};

	public getEnv = (envName: string = ""): string | number | string[] | number[] | Record<string, string | number | string[] | number[]> => {
		return Environment.getInstance().getEnv(envName);
	};

    // ------------ help ----------------


	// messages from client:
	private helpContents = `CREATE_CHANNEL channelName \n
	CLOSE_CHANNEL channelName \n
	CLOSE_ALL_CHANNELS \n
	GET channelName [-d dbrType] [-c dataCount] [-w timeout (seconds)] [-h] \n
	PUT channelName ?? \n
	MONITOR channelName [-d dbrType] [-c dataCount] [-m mask] [-h] \n
	CLOSE_MONITOR subscriptionId \n
	CLOSE_MONITOR channelName \n
	CLOSE_ALL_MONITORS \n
	PAUSE_MONITOR channelName \n
	PAUSE_ALL_MONITORS \n`

    handle_help = () => {
        this.sendTextToClient("help", this.helpContents);
    }

	// --------- close channel ----------
	handle_CLOSE_CHANNEL = (messageParts: string[]) => {
		let ii = 1;
		// either subscriptionId or pv name
		const channelName = messageParts[ii];
        this.server.removeChannelSubscriber(channelName, this);
        if (Object.keys(this.server.getChannelSubscribers(channelName)).length > 0) {
            return;
        }
        const channel = this.context.getChannelByName(channelName);
        if (channel === undefined) {
            return;
        }
        channel.destroyHard();
    };

	// ---------- close monitor ---------
	handle_CLOSE_MONITOR = (messageParts: string[]) => {
		let ii = 1;
		// either subscriptionId or pv name
		const parameterStr = messageParts[ii];
		if (isNaN(parseInt(parameterStr))) {
			// pv name
			const monitors = this.getChannelMonitorsByChannelName(parameterStr);
			if (monitors === undefined) {
				return;
			}
			for (let monitor of monitors) {
				monitor.destroyHard();
			}
		} else {
			// subscriptionId
			const monitor = this.getChannelMonitorBySubscriptionId(parseInt(parameterStr));
			if (monitor === undefined) {
				return;
			}
			monitor.destroyHard();
		}
	};

	getChannelMonitorBySubscriptionId = (subscriptionId: number): ChannelMonitor | undefined => {
		for (let channelName in this.context.resolvedChannelsByName) {
			const channel = this.context.resolvedChannelsByName[channelName];
			if (Object.keys(channel.monitors).includes(subscriptionId.toString())) {
				return channel.getMonitor(subscriptionId);
			}
		}
		return undefined;
	};

	getChannelMonitorsByChannelName = (channelName: string): ChannelMonitor[] | undefined => {
		const channel = this.context.resolvedChannelsByName[channelName];
		if (channel === undefined) {
			return undefined;
		}
		return Object.values(channel.monitors);
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
					this.sendTextToClient("MONITOR help", data);
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
        this.server.addChannelSubscriber(channelName, this);
		const monitor = await channel?.createMonitor(listener, dbrType, valueCount, mask);
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
		this.sendChannelDataToClient({
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
        this.server.addChannelSubscriber(channelName, this);
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
	sendChannelDataToClient = (channelData: Record<string, any> & type_channelData) => {
		this.webSocket.send(JSON.stringify(channelData));
	};

	sendTextToClient = (textTitle: string, textContents: string) => {
		const obj: Record<string, string> = {};
		obj[textTitle] = textContents;
		this.webSocket.send(JSON.stringify(obj));
	};
}

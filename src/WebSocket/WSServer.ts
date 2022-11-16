import { IncomingMessage } from "http";
import { WebSocket, Server, RawData } from "ws";
import { Context, ChannelMonitor, Channel_DBR_TYPES } from "..";
import { Environment, GlobalMethods, type_environment_options } from "../Global";

type type_channelData = {
	channelName: string;
	value: string | number | string[] | number[];
};

export class WSServer {
	// each WebSocket server has a context
	context: Context;

	server: Server | undefined;
	clients: Record<string, WSClient>;

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
			this.clients[webSocketId] = new WSClient(webSocketId, webSocket, this.context);
		});
	};

	removeClient = () => {};
}

// repesent a client
export class WSClient {
	webSocket: WebSocket;
	id: string;
	context: Context;
	constructor(id: string, webSocket: WebSocket, context: Context) {
		this.webSocket = webSocket;
		this.id = id;
		this.context = context;
		this.webSocket.on("message", (message: RawData) => {
			this.handle_message(message);
		});
	}

	allowedCommands = [
		`WS_PROTO_CREATE_CHANNEL`,
		`WS_PROTO_CLOSE_CHANNEL`,
		`WS_PROTO_CLOSE_ALL_CHANNELS`,
		`WS_PROTO_GET`,
		`WS_PROTO_PUT`,
		`WS_PROTO_CREATE_MONITOR`,
		`WS_PROTO_CLOSE_MONITOR`,
		`WS_PROTO_CLOSE_ALL_MONITORS`,
		`WS_PROTO_PAUSE_MONITOR`,
		`WS_PROTO_PAUSE_ALL_MONITORS`,
	];

	// messages from client:
	//  - `WS_PROTO_CREATE_CHANNEL-${channelName}`
	//  - `WS_PROTO_CLOSE_CHANNEL-${channelName}`
	//  - `WS_PROTO_CLOSE_ALL_CHANNELS`
	//  - `WS_PROTO_GET-${channelName}-${dbrType}`
	//  - `WS_PROTO_PUT-${channelName}`
	//  - `WS_PROTO_CREATE_MONITOR-${channelName}-${dbrType}`
	//  - `WS_PROTO_CLOSE_MONITOR-${channelName}-${dbrType}`
	//  - `WS_PROTO_CLOSE_ALL_MONITORS`
	//  - `WS_PROTO_PAUSE_MONITOR-${channelName}-${dbrType}`
	//  - `WS_PROTO_PAUSE_ALL_MONITORS`
    
	handle_message = async (message: RawData) => {
		GlobalMethods.debugLog(`Received "${message}" from ${this.id}`);
		const messageStr = message.toString();
		const messageParts = messageStr.split("-");
		const cmd = messageParts[0];
		if (!(this.allowedCommands.includes(cmd))) {
            GlobalMethods.errorLog(`Command "${cmd}" does not exists`);
			return;
		}
		let channelName: string = "";
		switch (cmd) {
			case "WS_PROTO_GET":
				//todo: set timeout
				channelName = messageParts[1];
				const data = await this.get(channelName);
				if (data !== undefined) {
					this.sendChannelDataToClient(data);
				}
				break;
			case "WS_PROTO_CREATE_MONITOR":
				channelName = messageParts[1];
				let dbrTypeStr: string = messageParts[2];
				let dbrTypeNum = Channel_DBR_TYPES[dbrTypeStr as keyof typeof Channel_DBR_TYPES];
				this.monitor(channelName, this.monitorListener, dbrTypeNum);
				break;
		}
	};

	// ------------------ get -------------------
	get = async (channelName: string): Promise<Required<type_channelData> | undefined> => {
		const channel = await this.context.createChannel(channelName);
		const result = await channel?.get();
		if (channel === undefined) {
			return undefined;
		} else {
			if (result === undefined) {
				return undefined;
			} else {
				return { channelName: channel.getName(), ...result };
			}
		}
	};

	// ------------------ monitor -------------------

	monitor = async (channelName: string, listener: (monitor: ChannelMonitor) => void, dbrType: number | undefined): Promise<void> => {
		const channel = await this.context.createChannel(channelName);
		const monitor = await channel?.createMonitor(listener, dbrType);
		// get a value immediately
		const immediateChannelData = await this.get(channelName);
		if (immediateChannelData !== undefined) {
			this.sendChannelDataToClient(immediateChannelData);
		}
	};

	monitorListener = (monitor: ChannelMonitor) => {
		const channel = monitor.getChannel();
		const meta = channel.dbr.getMeta();
		const value = channel.dbr.getValue();
		this.sendChannelDataToClient({ channelName: channel.getName(), ...meta, value: value });
	};

	// ------------------- send --------------------
	sendChannelDataToClient = (channelData: Required<type_channelData>) => {
		this.webSocket.send(JSON.stringify(channelData));
	};
}

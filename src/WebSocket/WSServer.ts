import { IncomingMessage } from "http";
import { WebSocket, Server, RawData } from "ws";
import { Context } from "../Context/Context";
import { ChannelMonitor } from "../Channel/ChannelMonitor";
import { GlobalMethods } from "../Global/GlobalMethods";
import { WSClient } from "./WSClient";

//todo: how to manage subscriptions for monitors and channels, the closing sequence.

export type type_channelData = {
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
	// private channelsSubscribers: Record<string, Record<string, WSClient>> = {};
	// key: subscriptionId
	private monitorsSubscribers: Record<string, Record<string, WSClient>> = {};

	constructor(port: number = 8080, userEnv: Record<string, string> = {}) {
		this.context = new Context(userEnv);
		this.clients = {};
		this.context.initialize();
		GlobalMethods.infoLog(`Context initialization finished with following settings:`);
		GlobalMethods.infoLog(this.context.getEnv());
		this.createWebSocketServer(port);

		setInterval(() => {
			console.log("-------------------->", this.monitorsSubscribers, Object.keys(this.context.getResolvedChannelsByName()));
		}, 1000);
	}

	createWebSocketServer = (port: number) => {
		this.server = new WebSocket.Server({
			port: port,
		});
		this.server.on("connection", (webSocket: WebSocket, request: IncomingMessage) => {
			GlobalMethods.infoLog(`Connection establised with client ${request.socket.remoteAddress} port ${request.socket.remotePort}`);
			const webSocketId = `${request.socket.remoteAddress}_${request.socket.remotePort?.toString()}`;
			this.clients[webSocketId] = new WSClient(webSocketId, webSocket, this.context, this);
		});
	};

	removeWebSocketClient = (webSocketId: string) => {
		delete this.clients[webSocketId];
	};

	addMonitorSubscriber = (subscribeId: number, client: WSClient) => {
		const monitorSubscribers = this.monitorsSubscribers[subscribeId.toString()];
		if (monitorSubscribers === undefined) {
			this.monitorsSubscribers[subscribeId.toString()] = {};
		}
		this.monitorsSubscribers[subscribeId.toString()][client.id] = client;
	};

	removeMonitorSubscriber = (subscriptionId: number, client: WSClient) => {
		const monitorSubscribers = this.getMonitorSubscribers(subscriptionId);
		delete monitorSubscribers[client.id];
		// if there is no subscriber for this monitor, then destroyHard this monitor
		if (Object.keys(this.getMonitorSubscribers(subscriptionId)).length === 0) {
			delete this.monitorsSubscribers[subscriptionId.toString()];
			for (let channelName in this.context.getResolvedChannelsByName()) {
				const channel = this.context.getResolvedChannelsByName()[channelName];
				if (Object.keys(channel?.monitors).includes(subscriptionId.toString())) {
					const monitor = channel?.monitors[subscriptionId.toString()];
					// do not destroy the channel
					monitor?.destroyHard();
					return;
				}
			}
		}
	};

	getMonitorSubscribers = (subscriptionId: number): Record<string, WSClient> => {
		const monitorSubscribers = this.monitorsSubscribers[subscriptionId.toString()];
		if (monitorSubscribers === undefined) {
			return {};
		}
		return monitorSubscribers;
	};

	getMonitorsSubscribers = (): Record<string, Record<string, WSClient>> => {
		return this.monitorsSubscribers;
	};

	getChannelMonitorBySubscriptionId = (subscriptionId: number): ChannelMonitor | undefined => {
		for (let channelName in this.context.getResolvedChannelsByName()) {
			const channel = this.context.getResolvedChannelsByName()[channelName];
			if (Object.keys(channel.monitors).includes(subscriptionId.toString())) {
				return channel.getMonitor(subscriptionId);
			}
		}
		return undefined;
	};

	getChannelMonitorsByChannelName = (channelName: string): ChannelMonitor[] | undefined => {
		const channel = this.context.getResolvedChannelsByName()[channelName];
		if (channel === undefined) {
			return undefined;
		}
		return Object.values(channel.monitors);
	};

	sendChannelMonitorDataToClients = (subscriptionId: number, channelData: Record<string, any> & type_channelData) => {
		const monitorSubscribers = this.getMonitorSubscribers(subscriptionId);
		for (let client of Object.values(monitorSubscribers)) {
			client.webSocket.send(JSON.stringify(channelData));
		}
	};

	// --------------------- management ----------------

	getAllMonitorStatus = (): Record<string, string | Record<string, string[] | string>> => {
		const data: Record<string, Record<string, string[] | string>> = {};
		for (const subscriptionIdStr in this.getMonitorsSubscribers()) {
			const subscriptionId = parseInt(subscriptionIdStr);
			const monitorResult = this.getMonitorStatusBySubscriptionId(subscriptionId);
			if (monitorResult !== undefined) {
				data[`${monitorResult.name as string}----${subscriptionId.toString()}`] = monitorResult.data as Record<string, string[] | string>;
			}
		}
		return data;
	};

	getMonitorStatusByName = (name: string): Record<string, string | Record<string, string[] | string>> => {
		const monitors = this.getChannelMonitorsByChannelName(name);
		if (monitors === undefined) {
			return {};
		}
		const data: Record<string, Record<string, string[] | string>> = {};
		for (let monitor of monitors) {
			const subscriptionId = monitor.subscriptionId;
			const monitorResult = this.getMonitorStatusBySubscriptionId(subscriptionId);
			if (monitorResult !== undefined) {
				data[`${monitorResult.name as string}----${subscriptionId.toString()}`] = monitorResult.data as Record<string, string[] | string>;
			}
		}
		return data;
	};

	getMonitorStatusBySubscriptionId = (subscriptionId: number): Record<string, string | Record<string, string[] | string>> | undefined => {
		const monitor = this.getChannelMonitorBySubscriptionId(subscriptionId);
		const data: Record<string, string[] | string> = {};
		if (monitor === undefined) {
			return undefined;
		}
		const channel = monitor.getChannel();
		const stateStr = channel.getStateStr();
		data["state"] = stateStr;
		data["clients"] = Object.keys(this.getMonitorSubscribers(subscriptionId));
		const result: Record<string, string | Record<"state" | "clients", string[] | string>> = {};
		result["name"] = monitor.name;
		result["data"] = data;
		return result;
	};

	getAllClientNames = () => {};
}

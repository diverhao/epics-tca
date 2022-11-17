import { IncomingMessage } from "http";
import { WebSocket, Server, RawData } from "ws";
import { Context, ChannelMonitor, Channel_DBR_TYPES } from "..";
import { ChannelMonitor_MASKS, Channel } from "../Channel";
import { Environment, GlobalMethods, type_environment_options } from "../Global";
import {WSClient} from "./WSClient"

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

	constructor(options: Record<string, any> = {}, userEnv: Record<string, string> = {}) {
		this.context = new Context(userEnv);
		this.clients = {};
		this.context.initialize().then(() => {
			GlobalMethods.infoLog(`Context initialization finished with following settings:`);
			GlobalMethods.infoLog(this.context.getEnv());
			this.createWebSocketServer();
		});
		setInterval(() => {
			console.log("-------------------->", this.monitorsSubscribers, Object.keys(this.context.resolvedChannelsByName));
		}, 1000);
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

	// addChannelSubscriber = (channelName: string, client: WSClient) => {
	// 	const channelSubscribers = this.channelsSubscribers[channelName];
	// 	if (channelSubscribers === undefined) {
	// 		this.channelsSubscribers[channelName] = {};
	// 	}
	// 	this.channelsSubscribers[channelName][client.id] = client;
	// };

	// removeChannelSubscriber = (channelName: string, client: WSClient) => {
	// 	const channelSubscribers = this.channelsSubscribers[channelName];
	// 	delete channelSubscribers[client.id];
	// 	// if there is no subscriber, then destroyHard this channel
	// 	if (Object.keys(this.getChannelSubscribers(channelName)).length === 0) {
	// 		const channel = this.context.getChannelByName(channelName);
	// 		channel?.destroyHard();
	// 	}
	// };

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
			for (let channelName in this.context.resolvedChannelsByName) {
				const channel = this.context.resolvedChannelsByName[channelName];
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

	// getChannelSubscribers = (channelName: string): Record<string, WSClient> => {
	// 	const channelSubscribers = this.channelsSubscribers[channelName];
	// 	if (channelSubscribers === undefined) {
	// 		return {};
	// 	}
	// 	return channelSubscribers;
	// };

	// remove all channels
	removeClient = () => {};

	sendChannelMonitorDataToClients = (subscriptionId: number, channelData: Record<string, any> & type_channelData) => {
		const monitorSubscribers = this.getMonitorSubscribers(subscriptionId);
		for (let client of Object.values(monitorSubscribers)) {
			client.webSocket.send(JSON.stringify(channelData));
		}
	};
}
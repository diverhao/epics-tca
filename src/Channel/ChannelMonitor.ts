import { Buffer } from "buffer";

import { CA_MSG_HEADER_OFFSETS } from "../Global/Constants";
import { CA_MSG_HEADER_SIZE } from "../Global/Constants";
import { CA_COMMANDS } from "../Global/Constants";
import { Environment } from "../Global/Environment";
import { Channel } from "./Channel";
import { Context } from "../Context/Context";
import { CA_EXT_MSG_HEADER_OFFSETS } from "../Global/Constants";
import { CA_EXT_MSG_HEADER_SIZE } from "../Global/Constants";
import { generateCAHeader, GlobalMethods, isExtendedMessageHeader } from "../Global/GlobalMethods";


import { ChannelPromises } from "./ChannelPromises";
import { Channel_DBR_TYPES, Channel_STATES, type_dbrData, ChannelMonitor_MASKS } from "./Channel";
import { CA_MESSAGE_HEADER_SIZE } from "../Global/Constants";

export enum ChannelMonitor_STATES {
    NOT_INITIALIZED,
    INITIALIZED,
    SUBSCRIBED,
    PAUSED,
    DESTROYED,
    FAILED,
}

export class ChannelMonitor {
    context: Context;
    channel: Channel;

    // a channel monitor is identified by:
    mask: ChannelMonitor_MASKS;
    valueCount: number;
    dbrType: Channel_DBR_TYPES;
    // or
    subscriptionId: number;

    name: string;
    channelClientID: number;
    listener: ((monitor: ChannelMonitor) => void) | undefined;
    state: ChannelMonitor_STATES;

    promises: ChannelPromises;

    subscribeTimeout: number | undefined;

    constructor(
        channel: Channel,
        subscriptionId: number,
        dbrType: Channel_DBR_TYPES,
        valueCount: number,
        listener: ((monitor: ChannelMonitor) => void) | undefined = undefined,
        mask: ChannelMonitor_MASKS = ChannelMonitor_MASKS.DBE_VALUE_and_DBE_ALARM,
        subscribeTimeout: number | undefined = undefined
    ) {
        this.state = ChannelMonitor_STATES.NOT_INITIALIZED;

        this.channel = channel;
        this.context = this.channel.getContext();

        if (typeof dbrType === "undefined") {
            this.dbrType = channel.getDbrTypeNum();
        } else {
            this.dbrType = dbrType;
        }
        if (typeof valueCount === "undefined") {
            this.valueCount = channel.getDbr().getValueCount();
        } else {
            this.valueCount = valueCount;
        }

        this.listener = listener;
        this.mask = mask;

        this.name = this.channel.getName();
        this.channelClientID = this.channel.getChannelClientID();

        this.subscriptionId = subscriptionId;

        this.channel.addMonitor(this);

        let prioritySuffix = "";
        if (this.channel.getServerSchedulingPriority() !== this.getEnv("EPICS_CA_SCHEDULING_PRIORITY_DEFAULT")) {
            prioritySuffix = "_CAPriority" + this.getEnv("serverSchedulingPriority")?.toString();
        }

        this.subscribeTimeout = subscribeTimeout;
        this.promises = new ChannelPromises();
        // default no timeout
        this.promises.append("CA_PROTO_EVENT_ADD", false, this.subscribeTimeout);
    }

    public getSubscriptionId = (): number => {
        return this.subscriptionId;
    };

    public getEnv = (envName: string): string | number | string[] | number[] | Record<string, string | number | string[] | number[]> | undefined => {
        return Environment.getInstance().getEnv(envName);
    };

    send_CA_PROTO_EVENT_ADD = () => {
        const payloadSize = 16; // const
        let buffer = generateCAHeader(
            CA_COMMANDS.CA_PROTO_EVENT_ADD, // 0x01
            payloadSize, // fixed number, 16
            this.dbrType, // desired data type, default is the server provided data type
            this.valueCount, // desired data count
            this.channel.getChannelServerID(), // channel server ID
            this.subscriptionId // subscription ID, unique for each TCP connection
        );
        buffer.writeUInt16BE(this.mask, CA_MSG_HEADER_SIZE + 12);
        this.channel.getTcpTransport()?.send(buffer);
    };

    // normally should be invoked in non-await version
    subscribe = async () => {

        if (this.channel.getStateStr() !== "CREATED") {
            GlobalMethods.errorLog(`Creation of channel ${this.name} for monitor interrupted.`);
        }

        if (this.state === ChannelMonitor_STATES.SUBSCRIBED) {
            GlobalMethods.infoLog(`This monitor has been subscribed`);
            return;
        }
        this.state = ChannelMonitor_STATES.INITIALIZED;

        this.send_CA_PROTO_EVENT_ADD();
        try {
            // lifted by first CA_PROTO_EVENT_ADD message from server
            await this.promises.get("CA_PROTO_EVENT_ADD");
        } catch (e) {
            GlobalMethods.infoLog(`Subscribing channel monitor ${this.name} failed.`)
            GlobalMethods.infoLog(e);
        }
    };

    decodeBuffer = (message: Buffer) => {
        let HEADER_OFFSETS = CA_MSG_HEADER_OFFSETS;
        let HEADER_SIZE = CA_MSG_HEADER_SIZE;
        if (isExtendedMessageHeader(message, 0)) {
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
        // Update Channel.dbr.value and .meta
        this.channel.getDbr().decodeBuffer(dbrBuffer, dbrType, valueCount);
        // invoke callback function
        if (this.listener !== undefined) {
            this.listener(this);
        }
    };

    getChannel = (): Channel => {
        return this.channel;
    };

    getDbrData = (): type_dbrData => {
        return this.channel.getDbrData();
    };

    // ------------------------ cancel/pause/resume --------------------------

    send_CA_PROTO_EVENTS_OFF = () => {
        if (this.state !== ChannelMonitor_STATES.SUBSCRIBED) {
            GlobalMethods.infoLog(`ChannelMonitor.send_CA_PROTO_EVENTS_OFF(): monitor ${this.channel.getName()} is not subscribed, exit.`);
            return;
        }

        // CA_PROTO_EVENTS_OFF
        let buffer0x08 = generateCAHeader(
            CA_COMMANDS.CA_PROTO_EVENTS_OFF, // 0x08
            0,
            0,
            0,
            0,
            0
        );
        this.channel.getTcpTransport()?.send(buffer0x08);
    };
    send_CA_PROTO_EVENTS_ON = () => {
        if (this.state !== ChannelMonitor_STATES.PAUSED) {
            GlobalMethods.infoLog(`ChannelMonitor.send_CA_PROTO_EVENTS_OFF(): monitor ${this.channel.getName()} is not subscribed, exit.`);
            return;
        }

        // CA_PROTO_EVENTS_OFF
        let buffer0x09 = generateCAHeader(
            CA_COMMANDS.CA_PROTO_EVENTS_ON, // 0x09
            0,
            0,
            0,
            0,
            0
        );
        this.channel.getTcpTransport()?.send(buffer0x09);
    };

    pause = () => {
        this.send_CA_PROTO_EVENTS_OFF();
        // no reply from server, simply set the state to "PAUSED"
        this.state = ChannelMonitor_STATES.PAUSED;
    }

    resume = () => {
        // the ChannelMonitor.state is set to "SUBSCRIBED" upon receiving the 1st "CA_PROTO_EVENT_ADD" message
        this.send_CA_PROTO_EVENTS_ON();
    }

    // pause ALL CA monitors on this CA server
    // pauseAllChannelMonitors() {
    // 	this.send_CA_PROTO_EVENTS_OFF();
    // }

    // resume ALL CA monitors on this CA server
    async resumeAllChannelMonitors() {
        // CA_PROTO_EVENTS_ON
        let buffer0x09 = generateCAHeader(0x09, 0, 0, 0, 0, 0);
        if (this.channel.getTcpTransport() !== null) {
            GlobalMethods.debugLog(
                `sending ${buffer0x09.toString("hex")} to ${this.channel.getTcpTransport()?.getServerAddress()}:${this.channel.getTcpTransport()?.getServerPort()
                }`
            );
            await this.channel.getTcpTransport()?.send(buffer0x09);
        }
    }

    // invoked when we want to destroy this monitor (soft or hard)
    send_CA_PROTO_EVENT_CANCEL = () => {

        // if the channel is destroyedSoft() or destroyedHard(), the channel is always CA_PROTO_CLEAR_CHANNEL first
        // In this case, there is no need to send CA_PROTO_EVENT_CANCEL. It only causes an error message on server
        if (this.channel.getStateStr() === "DESTROYED" || this.channel.getStateStr() === "DISCONNECTED") {
            GlobalMethods.infoLog(`ChannelMonitor.send_CA_PROTO_EVENT_CANCEL(): Channel ${this.name} has been destroyed.`)
            return;
        }

        let buffer = generateCAHeader(
            CA_COMMANDS.CA_PROTO_EVENT_CANCEL, // 0x02
            0, // must be 0
            this.dbrType, // identify this subscription
            this.valueCount, // identify this subscription
            this.channel.getChannelServerID(), // identify this subscription
            this.subscriptionId // identify this subscription
        );
        this.channel.getTcpTransport()?.send(buffer);
    };


    // (1) send out "CA_PROTO_EVENT_CANCEL" to CA server, no need to wait for reply
    // (2) remove this monitor from array in Channel
    // (3) reject all promises
    // Note: there is no Promise in a ChannelMonitor
    destroyHard = () => {
        // (1)
        this.send_CA_PROTO_EVENT_CANCEL();
        // (2)
        this.channel.removeMonitor(this);
        // (3)
        this.rejectAllPromises(`Channel monitor ${this.getChannel().getName()} destroyed hard`);
    };

    rejectAllPromises = (reason: string) => {
        this.promises.rejectAll(reason);
    };

    // (1) send out "CA_PROTO_EVENT_CANCEL" to CA server, not expecting a reply
    // (2) reject all promises
    // (3) change state to "FAILED"
    destroySoft = () => {
        // (1)
        this.send_CA_PROTO_EVENT_CANCEL();
        // (2)
        this.rejectAllPromises(`Channel monitor ${this.getChannel().getName()} destroyed soft`);
        // (3)
        this.state = ChannelMonitor_STATES.FAILED;
    };
}

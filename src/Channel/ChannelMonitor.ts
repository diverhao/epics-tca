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
import { Channel_DBR_TYPES, ChannelMonitor_MASKS } from "./Channel";
import { Timeouts } from "../Timeouts/Timeouts";

export enum ChannelMonitor_STATES {
    NOT_INITIALIZED,
    SUBSCRIBING,
    SUBSCRIBED,
    PAUSED,
    DESTROYED,
    FAILED,
}

export class ChannelMonitor {

    private readonly channel: Channel;

    private readonly subscribeTimeout: number | undefined;

    // desired DBR type for monitoring
    private readonly dbrType: Channel_DBR_TYPES;
    // desired number of values to get from IOC
    private readonly valueCount: number;
    // mask
    private readonly mask: ChannelMonitor_MASKS;


    private readonly subscriptionId: number;

    private listener: ((monitor: ChannelMonitor) => void) | undefined;
    private state: ChannelMonitor_STATES = ChannelMonitor_STATES.NOT_INITIALIZED;

    // asynchronous
    private readonly promises: ChannelPromises = new ChannelPromises();
    private readonly timeouts: Timeouts = new Timeouts();

    constructor(
        channel: Channel,
        subscribeTimeout: number | undefined,
        subscriptionId: number,
        dbrType: Channel_DBR_TYPES,
        valueCount: number,
        listener: ((monitor: ChannelMonitor) => void) | undefined,
        mask: ChannelMonitor_MASKS = ChannelMonitor_MASKS.DBE_VALUE_and_DBE_ALARM,
    ) {
        this.channel = channel;
        this.subscribeTimeout = subscribeTimeout;
        this.subscriptionId = subscriptionId;
        this.dbrType = dbrType;
        this.valueCount = valueCount;
        this.listener = listener;
        this.mask = mask;
    }

    // ------------------------ subscribe ---------------------------


    /**
     * Subscribe the channel monitor.
     * 
     * The Buffer message decoding is done in handler for CA_PROTO_EVENT_ADD.
     * 
     * (1) set channel monitor state to ChannelMonitor_STATES.SUBSCRIBING
     * 
     * (2) send out CA_PROTO_EVENT_ADD message to IOC
     * 
     * (3) wait for the reply of CA_PROTO_EVENT_ADD
     * 
     * (4) set state to ChannelMonitor_STATES.SUBSCRIBED upon success, or to ChannelMonitor_STATES.FAILED upon failure
     * 
     */
    // subscribe = async () => {

    //     if (this.channel.getStateStr() !== "CREATED") {
    //         GlobalMethods.errorLog(`Creation of channel ${this.getChannel().getName()} for monitor interrupted.`);
    //     }

    //     if (this.state === ChannelMonitor_STATES.SUBSCRIBED) {
    //         GlobalMethods.infoLog(`This monitor has been subscribed`);
    //         return;
    //     }

    //     // (1)
    //     this.setState(ChannelMonitor_STATES.SUBSCRIBING);

    //     try {
    //         // if there are more than one CA_PROTO_EVENT_ADD promise added, the latter resolved ones are ignored.
    //         this.getPromises().append("CA_PROTO_EVENT_ADD", false, this.subscribeTimeout);
    //         const promiseObj = this.getPromises().get("CA_PROTO_EVENT_ADD")

    //         // (2)
    //         this.send_CA_PROTO_EVENT_ADD();

    //         // (3)
    //         // lifted by first CA_PROTO_EVENT_ADD reply message from server
    //         const messageBuffer = await promiseObj;

    //         // (4)
    //         this.setState(ChannelMonitor_STATES.SUBSCRIBED);

    //     } catch (e) {
    //         // (4)
    //         this.setState(ChannelMonitor_STATES.FAILED);
    //         GlobalMethods.infoLog(`Subscribing channel monitor ${this.getChannel().getName()} failed.`)
    //         GlobalMethods.infoLog(e);
    //     }
    // };

    /**
     * Decode the Buffer type message of CA_PROTO_EVENT_ADD from IOC
     * 
     * Update the Channel.dbr data.
     */
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
        // todo: analyze status code, and do the response
        let statusCode = message.readUInt32BE(HEADER_OFFSETS.parameter1);
        let subID = message.readUInt32BE(HEADER_OFFSETS.parameter2);

        let dbrBuffer = message.slice(HEADER_SIZE, HEADER_SIZE + payloadSize);

        // Update Channel.dbr.value and .meta
        try {
            this.getChannel().getDbr().decodeBuffer(dbrBuffer, dbrType, valueCount);
        } catch (e) {
            GlobalMethods.errorLog(e);
        }
    };


    send_CA_PROTO_EVENT_ADD = () => {
        const payloadSize = 16; // const
        let bufferHeader = generateCAHeader(
            CA_COMMANDS.CA_PROTO_EVENT_ADD, // 0x01
            payloadSize, // fixed number, 16
            this.getDbrType(), // desired data type, default is the server provided data type
            this.getValueCount(), // desired data count
            this.getChannel().getChannelServerID(), // channel server ID
            this.getSubscriptionId() // subscription ID, unique for each TCP connection
        );

        let bufferPayload = Buffer.alloc(payloadSize);
        bufferPayload.writeUInt16BE(this.getMask(), 12);

        let buffer = Buffer.concat([bufferHeader, bufferPayload]);

        this.getChannel().getTcpTransport()?.send(buffer);
    };

    // -------------- cancel/pause/resume subscription --------------

    /**
     * Pause the monitor by sending CA_PROTO_EVENTS_OFF message to IOC
     */
    pause = () => {
        this.send_CA_PROTO_EVENTS_OFF();
        // no reply from server, simply set the state to "PAUSED"
        this.state = ChannelMonitor_STATES.PAUSED;
    }

    /**
     * Resume the monitor by sending CA_PROTO_EVENTS_OFF message to IOC
     * 
     * the monitor state is set back to "SUBSCRIBED" upon receiving the "CA_PROTO_EVENT_ADD" message
     */
    resume = () => {
        this.send_CA_PROTO_EVENTS_ON();
    }


    /**
     * Cancel the monitor subscription by sending CA_PROTO_EVENT_CANCEL to IOC
     * 
     * No need to wait for reply
     */
    cancel = () => {
        this.send_CA_PROTO_EVENT_CANCEL();
    }

    private send_CA_PROTO_EVENTS_OFF = () => {
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

    private send_CA_PROTO_EVENTS_ON = () => {
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

    private send_CA_PROTO_EVENT_CANCEL = () => {

        // if the channel is destroyedSoft() or destroyedHard(), the channel is always CA_PROTO_CLEAR_CHANNEL first
        // In this case, there is no need to send CA_PROTO_EVENT_CANCEL. It only causes an error message on server
        if (this.channel.getStateStr() === "DESTROYED" || this.channel.getStateStr() === "DISCONNECTED") {
            GlobalMethods.infoLog(`ChannelMonitor.send_CA_PROTO_EVENT_CANCEL(): Channel ${this.getChannel().getName()} has been destroyed.`)
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

    // resume ALL CA monitors on this CA server
    resumeAllChannelMonitors = async () => {
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


    // ------------------------- destroy ----------------------------

    /**
     * Hard destroy this channel monitor.
     * 
     * It happens when we want to completely remove this monitor, or when the EPICS TCA quits.
     */
    destroyHard = () => {
        this.destroy("hard");
    };

    /**
     * Soft destroy the channel monitor.
     * 
     * It happens when the channel or TCP transport has a problem, we want to keep on using this
     * monitor when the channel or TCP connection is recovered.
     */
    destroySoft = () => {
        this.destroy("soft");
    };

    /**
     * (0) update state to ChannelMonitor_STATES.FAILED
     * 
     * (1) send out "CA_PROTO_EVENT_CANCEL" to CA server, not expecting a reply
     * 
     * (2) for hard destroy, remove the association between the monitor and Channel
     * 
     * (3) remove this monitor from TCPTransoport
     * 
     * (4) reject all Promises
     * 
     * (5) clear all Timeouts
     */
    destroy = (option: "soft" | "hard") => {

        // (0)
        if (option === "hard") {
            this.setState(ChannelMonitor_STATES.DESTROYED);
        } else {
            this.state = ChannelMonitor_STATES.FAILED;
        }

        // (1)
        this.cancel();

        // (2)
        if (option === "hard") {
            this.getChannel().removeMonitor(this);
        }

        // (3)
        this.getChannel().getTcpTransport()?.removeMonitor(this.getSubscriptionId());

        // (4)
        this.getPromises().rejectAll(`Channel monitor ${this.getChannel().getName()} destroyed ${option}`);

        // (5)
        this.getTimeouts().clearAllTimeouts();

    }

    // -------------------- getters ---------------------------------

    getSubscriptionId = (): number => {
        return this.subscriptionId;
    };

    getChannel = () => {
        return this.channel;
    }

    getSubscribeTimeout = () => {
        return this.subscribeTimeout;
    }

    getDbrType = () => {
        return this.dbrType;
    }

    getValueCount = () => {
        return this.valueCount;
    }

    getListener = () => {
        return this.listener;
    }

    getMask = () => {
        return this.mask;
    }

    getPromises = () => {
        return this.promises;
    }

    getTimeouts = () => {
        return this.timeouts;
    }

    getState = () => {
        return this.state;
    }

    getStateStr = () => {
        return ChannelMonitor_STATES[this.getState()];
    }

    setState = (newState: ChannelMonitor_STATES) => {
        this.state = newState;
    }

}

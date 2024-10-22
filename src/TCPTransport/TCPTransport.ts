import { Socket } from "net";
import { Buffer } from "buffer";
import { userInfo, hostname } from "os";

import { printMsg } from "../Global/GlobalMethods";
import { ChannelMonitor } from "../Channel/ChannelMonitor";
import { Channel_ACCESS_RIGHTS } from "../Channel/Channel";
import { CA_MINOR_PROTOCOL_REVISION, CA_MSG_HEADER_OFFSETS } from "../Global/Constants";
import { CA_MSG_HEADER_SIZE } from "../Global/Constants";
import { CA_COMMANDS } from "../Global/Constants";
import { Channel } from "../Channel/Channel";
import { Context, type_network_stats } from "../Context/Context";
import { CA_EXTENDED_MESSAGE_HEADER_SIZE, CA_MESSAGE_HEADER_SIZE, MAX_TCP_RECV } from "../Global/Constants";
import { CA_EXT_MSG_HEADER_OFFSETS } from "../Global/Constants";
import { CA_EXT_MSG_HEADER_SIZE } from "../Global/Constants";
import { generateCAHeader, getStringPaddedSize, GlobalMethods, isExtendedMessageHeader, splitMessage } from "../Global/GlobalMethods";

import { ECA, ECA_VALUES, ECA_SEVERITIES } from "../ECA/ECA";
import { TCPTransportPromises } from "./TCPTransportPromises";
import { Timeouts } from "../Timeouts/Timeouts";
import { ChannelMonitor_STATES } from "../Channel/ChannelMonitor";
import { Intervals } from "../Intervals/Intervals";

/** 
 * The next state must be from the previous state
 */
export enum TCPTransport_STATES {
    NOT_CONNECTED, // initial condition
    CONNECTING, // connecting to the IOC tcp port
    CONNECTED, // connected to the IOC tcp port
    HANDSHAKING, // connected and handshaking with IOC
    GREETED, // handshaked with IOC: received access right message 
    DESTROYED, // destroyed
}

// also see Channel
// When a TCPTransport has a problem caused by others, will re-search all channels --> TCPTransport.destroy() + re-search all channels
//  (1) TCP socket got an "error" event from CA server --> TCPTransport.destroy(false)
//  (2) TCP socket got an "close" event from CA server --> TCPTransport.destroy(false)
//  (3) no TCP packet after 30 seconds, and no reply from CA_PROTO_ECHO
// When a TCPTransport is closed actively by client --> no re-search all channels
//  (1) whole program exits --> --> TCPTransport.destroy(true)
//  (2) no Channel in this TCPTransport

// should only be created in Channel.createTCP()
export class TCPTransport {

    // socket
    private socket: Socket = new Socket();;
    private serverPort: number;
    private serverAddress: string;
    private serverSchedulingPriority: number;

    // relationships
    private context: Context;
    private channels: Record<string, Channel> = {};

    // id and state
    private readonly key: string;
    private state: TCPTransport_STATES = TCPTransport_STATES.NOT_CONNECTED;;

    // monitor
    // each channel monitor must have an ID provided by the CA client
    // this ID is unique for each TCP connection
    private monitorSubscriptionId: number = 0;
    // subscriptionId vs ChannelMonitor
    // this object is for quickly finding the ChannelMonitor object from a subscription ID
    // it is useful for CA_PROTO_EVENT_ADD message from IOC, which only carries a subscription ID
    private monitors: Record<string, ChannelMonitor> = {};

    // message
    // todo: stich TCP packets, modify splitMessage()
    private residualMessage: Buffer = Buffer.from("");
    private recentMsgTime: number = Date.now();;

    // asynchronous
    private timeouts: Timeouts = new Timeouts();
    private promises: TCPTransportPromises = new TCPTransportPromises();;
    private intervals: Intervals = new Intervals();;

    // network statistics
    private networkStats: type_network_stats = {
        packetsReceivedInLastSecond: 0,
        bytesReceivedInLastSecond: 0,
        caMessagesReceivedInLastSecond: 0,
        packetsSentInLastSecond: 0,
        bytesSentInLastSecond: 0,
        caMessagesSentInLastSecond: 0,
        startTime: 0,
        endTime: 0,
    };
    private packetsReceivedInLastSecond: number = 0;
    private bytesReceivedInLastSecond: number = 0;
    private caMessagesReceivedInLastSecond: number = 0;
    private packetsSentInLastSecond: number = 0;
    private bytesSentInLastSecond: number = 0;
    private caMessagesSentInLastSecond: number = 0;

    constructor(
        context: Context,
        serverPort: number,
        serverAddress: string,
        serverSchedulingPriority: number,
    ) {
        this.serverSchedulingPriority = serverSchedulingPriority;
        this.context = context;

        this.serverPort = serverPort;
        this.serverAddress = serverAddress;
        this.key = `${this.serverAddress}:${this.serverPort}:${this.serverSchedulingPriority}`;
        // after the key is generated
        context.getTcpTransports().addTcpTransport(this);

        this.startInactiveTimers();


        // network statistics
        this.getIntervals().addInterval("NETWORK_STATS", 1, () => {
            this.getNetworkStats()["packetsReceivedInLastSecond"] = this.packetsReceivedInLastSecond;
            this.getNetworkStats()["bytesReceivedInLastSecond"] = this.bytesReceivedInLastSecond;
            this.getNetworkStats()["caMessagesReceivedInLastSecond"] = this.caMessagesReceivedInLastSecond;
            this.getNetworkStats()["packetsSentInLastSecond"] = this.packetsSentInLastSecond;
            this.getNetworkStats()["bytesSentInLastSecond"] = this.bytesSentInLastSecond;
            this.getNetworkStats()["caMessagesSentInLastSecond"] = this.caMessagesSentInLastSecond;
            this.getNetworkStats()["startTime"] = this.getNetworkStats()["endTime"];
            this.getNetworkStats()["endTime"] = Date.now();
            this.packetsReceivedInLastSecond = 0;
            this.bytesReceivedInLastSecond = 0;
            this.caMessagesReceivedInLastSecond = 0;
            this.packetsSentInLastSecond = 0;
            this.bytesSentInLastSecond = 0;
            this.caMessagesSentInLastSecond = 0;
        },
            []
        );
        this.getIntervals().startInterval("NETWORK_STATS");
    }


    // ----------------------- connection ---------------------------

    /**
     * Connect to IOC's TCP port. 
     * 
     * If anything wrong with the connection process or the connection itself, soft destroy the TCPTransport.
     * 
     * This method is derived from below initialize()
     */
    connectSocket = async () => {

        if (this.getState() === TCPTransport_STATES.NOT_CONNECTED) {
            // normal situation, continue
        } else if (this.getState() === TCPTransport_STATES.CONNECTING) {
            GlobalMethods.infoLog("Connect socket: There is another connectSocket() going on, be patient");
            const promiseObj = this.getPromises().get("TCP_SOCKET_CONNECT");
            // lifted upon TCP connection established
            await promiseObj;
            return;
        } else if (this.getState() === TCPTransport_STATES.CONNECTED) {
            // TCP is already connected, 
            // there is nothing wrong in this case, return immediately
            GlobalMethods.errorLog("Connect socket interrupted: this TCPTransoport is already CONNECTED");
            return;
        } else if (this.getState() === TCPTransport_STATES.HANDSHAKING) {
            // TCP is already connected and in handshaking state,
            // there is nothing wrong in this case, return immediately
            GlobalMethods.errorLog("Connect socket interrupted: this TCPTransoport is HANDSHAKING");
            return;
        } else if (this.getState() === TCPTransport_STATES.DESTROYED) {
            // this is unrecoverable fault, will cause Channel.destoryHard() in Context.createChannel()
            throw new Error("Connect socket interrupted: this TCPTransoport is DESTROYED");
        } else if (this.getState() === TCPTransport_STATES.GREETED) {
            // TCP is already greeted with IOC, 
            // there is nothing wrong in this case, return immediately
            GlobalMethods.errorLog("Connect socket interrupted: this TCPTransoport is already GREETED");
            return;
        } else {
            // this is unrecoverable fault, will cause Channel.destoryHard() in Context.createChannel()
            throw new Error(`Unknown TCPTransport state ${this.getState()}`);
        }

        this.setState(TCPTransport_STATES.CONNECTING);

        // events for TCP socket
        this.getSocket().on("data", (msg: Buffer) => {
            try {
                this.messageHandler(msg);
            } catch (e) {
                GlobalMethods.errorLog(e);
            }
        });

        /**
         * emitted when there is an error, we should soft destroy this TCPTransoport
         * so that its channels continues to re-search
         */
        this.getSocket().on("error", () => {
            GlobalMethods.errorLog(`Error on tcpTransport for ${this.serverAddress}:${this.serverPort}`);
            this.destroySoft();
        });

        /**
         * emitted when remote TCP socket is closed gracefully, e.g. Ctrl+C the IOC, 
         * or this TCP connection is rejected by the IOC. In this case, we should 
         * softly destroy this TCPTransoport to allow channels to re-search
         */
        this.getSocket().on("close", (reason) => {
            GlobalMethods.infoLog(`TCP connection closed by server, destroy TCPTransport object for ${this.key}`);
            this.destroySoft();
        });

        try {
            this.getPromises().append("TCP_SOCKET_CONNECT", true);
            const promiseObj = this.getPromises().get("TCP_SOCKET_CONNECT");

            // TCP handshake with CA server, emit "connect" event
            this.getSocket().connect(this.serverPort, this.serverAddress, () => {
                this.getPromises().resolve("TCP_SOCKET_CONNECT", "");
            });

            // lifted upon TCP connection established
            await promiseObj;

            this.setState(TCPTransport_STATES.CONNECTED);
        } catch (e) {
            // destroy this TCPTransoport object, and re-search all channels
            GlobalMethods.errorLog(`Error connecting to TCP port ${this.serverAddress}:${this.serverPort}.`, e);
            this.destroySoft();
        }
        GlobalMethods.infoLog(`TCPTransport ${this.key} initialization finished`);
    };


    /**
     * send handshake messages to IOC: CA_PROTO_VERSION, CA_PROTO_CLIENT_NAME, and CA_PROTO_HOST_NAME
     * and wait for the reply of CA_PROTO_VERSION
     * the other 2 messages cause a reply of CA_PROTO_ACCESS_RIGHTS, which is handled in its own callback
     * 
     * In old version CA server, the CA_PROTO_VERSION does not come with a reply. So we do not block 
     * this function on the high level function, 
     * i.e. instead of using "await handShakeWithIoc()", we use "handShakeWithIoc()"
     */
    handShakeWithIoc = async () => {

        if (this.getState() === TCPTransport_STATES.CONNECTED) {
            // normal situation, continue
        } else if (this.getState() === TCPTransport_STATES.HANDSHAKING) {
            const promiseObj = this.promises.get("CA_PROTO_VERSION");
            GlobalMethods.errorLog("TCP handshaking: there is already another handshake running, waiting");
            await promiseObj;
            return;
        } else if (this.getState() === TCPTransport_STATES.CONNECTING) {
            // unrecoverable fault
            // this throw will be caught by Context.createChannel(), and this channel will be destroyed hard
            // the TCPTransoport must be at CONNECTED state to handshake
            // unlike above TCPTransport_STATES.HANDSHAKING, we cannot wait for any Promise
            throw new Error("TCP handshaking interrupted: this TCPTransoport must be CONNECTED, but it is CONNECTING");
        } else if (this.getState() === TCPTransport_STATES.DESTROYED) {
            // unrecoverable fault
            throw new Error("TCP handshaking interrupted: this TCPTransoport is DESTROYED");
        } else if (this.getState() === TCPTransport_STATES.GREETED) {
            // this TCPTransoport has handshaked (greeted) with the IOC
            // there is nothing wrong in this case, return immediately
            GlobalMethods.infoLog("TCP handshaking interrupted: this TCPTransoport already GREETED");
            return;
        } else if (this.getState() === TCPTransport_STATES.NOT_CONNECTED) {
            // unrecoverable fault
            // this throw will be caught by Context.createChannel(), and this channel will be destroyed hard
            // the TCPTransoport must be at CONNECTED state to handshake
            // unlike above TCPTransport_STATES.HANDSHAKING, we cannot wait for any Promise
            throw new Error("TCP handshaking interrupted: this TCPTransoport is NOT_CONNECTED");
        } else {
            // unrecoverable fault
            throw new Error(`TCP handshaking interrupted: unknown TCPTransoport state ${this.getState()}`);
        }

        this.setState(TCPTransport_STATES.HANDSHAKING);

        this.promises.append("CA_PROTO_VERSION", false);
        const promiseObj = this.promises.get("CA_PROTO_VERSION");

        this.sendFirstFewMessages();

        // making the whole connection unable to proceed.
        //todo: what is the behavior if rejected
        await promiseObj;
        this.setState(TCPTransport_STATES.GREETED);
    }

    /**
     * Start the TCP connection inactive detection countdowns.
     * 
     * If we have not received any TCP message from an IOC after EPICS_CA_BEACON_PERIOD seconds,
     * we send out a CA_PROTO_ECHO message, hoping to receive a CA_PROTO_ECHO reply (immediately).
     * 
     * These active detection countdowns are reset upon received any TCP message.
     * 
     * If we still have not received any message from this IOC after the last CA_PROTO_ECHO is sent out,
     * we softly destroy this TCPTransoport object and re-search all associated channels.
     * 
     */
    startInactiveTimers = () => {
        const dt1 = ((this.getContext().getEnv("EPICS_CA_BEACON_PERIOD") as number) + 1);
        const dt2 = ((this.getContext().getEnv("EPICS_CA_BEACON_PERIOD") as number) * 2 + 1);

        this.timeouts.addTimeout(
            "inactiveTimer1",
            dt1, // unit: second
            this.send_CA_PROTO_ECHO,
            []
        );
        this.timeouts.addTimeout(
            "inactiveTimer2",
            dt2,
            this.destroySoft,
            []
        );

        this.timeouts.startTimeout("inactiveTimer1");
        this.timeouts.startTimeout("inactiveTimer2");
    }

    // ----------------------- senders ------------------------------

    send = (buffer: Buffer) => {
        const { messages, residualMessage } = splitMessage(buffer);
        for (let message of messages) {
            printMsg(message, { address: this.serverAddress, port: this.serverPort }, "Sending TCP");
        }

        // update network statistics
        this.caMessagesSentInLastSecond = this.caMessagesSentInLastSecond + messages.length;
        this.packetsSentInLastSecond = this.packetsSentInLastSecond + 1;
        this.bytesSentInLastSecond = this.bytesSentInLastSecond + buffer.length;

        try {
            this.getSocket().write(buffer);
        } catch (e) {
            GlobalMethods.errorLog(e);
        }

    };

    /**
     * Send out 3 messages to IOC right after the TCP connection is established.
     * 
     * (1) CA_PROTO_VERSION
     * 
     * (2) CA_PROTO_CLIENT_NAME
     * 
     * (3) CA_PROTO_HOST_NAME
     */
    sendFirstFewMessages = () => {
        // 0x00, CA_PROTO_VERSION
        // verison must be sent out first
        let buffer0x00 = generateCAHeader(
            CA_COMMANDS.CA_PROTO_VERSION, // 0x00
            0x00, // payload size
            this.serverSchedulingPriority, // desired priority
            CA_MINOR_PROTOCOL_REVISION, // version number
            0x00, // reserved
            0x00
        ); // reserved

        // 0x14, CA_PROTO_CLIENT_NAME
        let username = userInfo().username;
        let payloadSize = getStringPaddedSize(username);
        let buffer0x14Header = generateCAHeader(CA_COMMANDS.CA_PROTO_CLIENT_NAME, payloadSize, 0x00, 0x00, 0x00, 0x00); // reserved, 0
        let buffer0x14Payload = Buffer.alloc(payloadSize);
        buffer0x14Payload.write(username);
        const buffer0x14 = Buffer.concat([buffer0x14Header, buffer0x14Payload]);

        // 0x15, CA_PROTO_HOST_NAME
        let hostnameString = hostname();
        payloadSize = getStringPaddedSize(hostnameString);
        let buffer0x15Header = generateCAHeader(CA_COMMANDS.CA_PROTO_HOST_NAME, payloadSize, 0x00, 0x00, 0x00, 0x00);
        let buffer0x15Payload = Buffer.alloc(payloadSize);
        buffer0x15Payload.write(hostnameString);
        const buffer0x15 = Buffer.concat([buffer0x15Header, buffer0x15Payload]);

        // combine and send out
        this.send(Buffer.concat([buffer0x00, buffer0x14, buffer0x15]));

        GlobalMethods.debugLog(`TCPTransport sent first frew messages to ${this.serverAddress}:${this.serverPort}`);
    }

    send_CA_PROTO_ECHO = () => {
        let buffer = generateCAHeader(
            CA_COMMANDS.CA_PROTO_ECHO, // 0x17
            0, // reserved
            0, // reserved
            0, // reserved
            0, // reserved
            0
        ); // reserved
        this.send(buffer);
    };


    // ----------------------- destroy ------------------------------

    /**
     * Destroy the TCPTransoport hard.
     * 
     * It removes this TCPTransoport object from the program. We need to create another
     * object if the program needs a TCP transport object.
     * 
     * It has very little difference from the "soft" destroy.
     * "hard" means the channels are destroyed hard, i.e. they won't try to re-search and connect.
     * "soft" means the channels are destroy softly, they will automatically re-search and connect.
     */
    destroyHard = () => {
        this.destroy("hard");
    };

    /**
     * Destroy the TCPTransoport hard.
     * 
     * It removes this TCPTransoport object from the program. We need to create another
     * object if the program needs a TCP transport object.
     * 
     * It has very little difference from the "soft" destroy.
     * "hard" means the channels are destroyed hard, i.e. they won't try to re-search and connect.
     * "soft" means the channels are destroy softly, they will automatically re-search and connect.
     */
    destroySoft = () => {
        this.destroy("soft")
    };

    /**
     * Destroy a TCPTransport 
     * 
     * (1) set new state to DESTROYED
     * 
     * (2) destroy all channels, soft or hard
     *     This is the only difference between soft and hard destroy of the TCPTransoport
     * 
     * (3) destroy TCP socket, it only emits a "close" event
     * 
     * (4) reject all promises in TCPTransoport.promises()
     * 
     * (5) clear all timeouts in TCPTransoport.timeouts
     * 
     * (6) clear all intervals in TCPTransoport.intervals
     * 
     * (7) remove TCPTransport from TCPTransports
     */
    private destroy = (option: "soft" | "hard") => {

        // (1)
        if (this.getState() === TCPTransport_STATES.DESTROYED) {
            // already destroyed, no need to destroy again
            return;
        } else if (this.getState() === TCPTransport_STATES.CONNECTED) {
            // normal case, continue
        } else if (this.getState() === TCPTransport_STATES.CONNECTING) {
            // normal case, continue
        } else if (this.getState() === TCPTransport_STATES.GREETED) {
            // normal case, continue
        } else if (this.getState() === TCPTransport_STATES.HANDSHAKING) {
            // normal case, continue
        } else if (this.getState() === TCPTransport_STATES.NOT_CONNECTED) {
            // normal case, continue
        }
        this.state = TCPTransport_STATES.DESTROYED;

        // (2)
        if (option === "soft") {
            this.destroyAllChannelsSoft();
        } else {
            this.destroyAllChannelsHard();
        }

        // (3)
        this.getSocket().destroy();

        // (4)
        this.getPromises().rejectAll(`TCPTransoprt destoryed ${option}ly`);

        // (5)
        this.getTimeouts().clearAllTimeouts();

        // (6)
        this.getIntervals().clearAllIntervals();

        // (7)
        this.getContext().getTcpTransports().removeTcpTransport(this);
    }

    private destroyAllChannelsSoft = () => {
        for (let name in this.channels) {
            let channel = this.channels[name];
            channel.destroySoft();
        }
    };

    private destroyAllChannelsHard = () => {
        for (let name in this.channels) {
            let channel = this.channels[name];
            channel.destroyHard();
        }
    };

    // ------------------------ message handlers --------------------


    /**
     * Handle all the TCP messages.
     * 
     * These handlers should only process as little data as possible. 
     * They should not set any state for any object (e.g. TCPTransoport, Channel, or anything else).
     * The state change should be explicitly done 
     * 
     * Most of the time, these handlers should lift up the blocks somewhere, e.g. in the Channel, by
     * using Promises.resolve().
     * 
     */
    messageHandler = (msg: Buffer) => {
        // when we receive a TCP message and the current inactive timers have been running for more than a second , reset the inactive timer
        // it is not necessary to reset the inactive timer everytime when we receive a TCP message
        const previousMsgTime = this.recentMsgTime;
        this.recentMsgTime = Date.now(); // ms
        const tTimeout = (this.getContext().getEnv("EPICS_CA_TCP_INACTIVE_TIMEOUT") as number) * 1000;
        const timeoutStartTime = this.getTimeouts().getStartTime("inactiveTimer1"); // Date.now()
        // if it is not timeout, reset the inactive timers
        if (this.recentMsgTime - timeoutStartTime > 1 * 1000 && this.recentMsgTime - previousMsgTime < tTimeout) {
            this.getTimeouts().resetTimeout("inactiveTimer1");
            this.getTimeouts().resetTimeout("inactiveTimer2");
        }

        const { messages, residualMessage } = splitMessage(Buffer.concat([this.residualMessage, msg]));
        this.residualMessage = residualMessage;

        for (let message of messages) {
            printMsg(message, { address: this.serverAddress, port: this.serverPort }, "Received TCP");
        }

        // update network statistics
        this.caMessagesReceivedInLastSecond = this.caMessagesReceivedInLastSecond + messages.length;
        this.packetsReceivedInLastSecond = this.packetsReceivedInLastSecond + 1;
        this.bytesReceivedInLastSecond = this.bytesReceivedInLastSecond + msg.length;

        for (let message of messages) {
            let command = message.readUInt16BE(0);
            if (command === CA_COMMANDS.CA_PROTO_VERSION) {
                // 0x00
                this.handle_CA_PROTO_VERSION(message);
            } else if (command === CA_COMMANDS.CA_PROTO_ACCESS_RIGHTS) {
                // 0x16
                this.handle_CA_PROTO_ACCESS_RIGHTS(message);
            } else if (command === CA_COMMANDS.CA_PROTO_CREATE_CHAN) {
                // reply for 0x12
                this.handle_CA_PROTO_CREATE_CHAN(message);
            }
            //todo: review logic
            else if (command === CA_COMMANDS.CA_PROTO_WRITE_NOTIFY) {
                // 0x13
                this.handle_CA_PROTO_WRITE_NOTIFY(message);
            } else if (command === CA_COMMANDS.CA_PROTO_READ_NOTIFY) {
                // 0x0f
                this.handle_CA_PROTO_READ_NOTIFY(message);
            } else if (command === CA_COMMANDS.CA_PROTO_EVENT_ADD) {
                // 0x01
                this.handle_CA_PROTO_EVENT_ADD(message);
            } else if (command === CA_COMMANDS.CA_PROTO_CLEAR_CHANNEL) {
                // 0x0c
                this.handle_CA_PROTO_CLEAR_CHANNEL(message);
            } else if (command === CA_COMMANDS.CA_PROTO_ECHO) {
                // 0x17
                this.handle_CA_PROTO_ECHO(message);
            } else if (command === CA_COMMANDS.CA_PROTO_ERROR) {
                // 0x0b
                this.handle_CA_PROTO_ERROR(message);
            } else if (command === CA_COMMANDS.CA_PROTO_SERVER_DISCONN) {
                // 0x1b, destroy channel, not TCP
                this.handle_CA_PROTO_SERVER_DISCONN(message);
            } else if (command === CA_COMMANDS.CA_PROTO_CREATE_CH_FAIL) {
                // 0x1a
                this.handle_CA_PROTO_CREATE_CH_FAIL(message);
            }
        }
    };

    private handle_CA_PROTO_VERSION(message: Buffer) {
        this.promises.resolve("CA_PROTO_VERSION", "TCPTransport initialization finished");
    }

    /**
     * 
     * for old CA protocol (<=11), the server does not respond CA_PROTO_VERSION or send a CA_PROTO_VERSION reply,
     * its first TCP message is CA_PROTO_ACCESS_RIGHTS, which is sent out upon receiving CA_PROTO_CREATE_CHAN
     * So, in here we resolve CA_PROTO_VERSION using this message.
     * See TCPTransoport.handShakeWithIoc() and Context.createChannel() for details
     */
    private handle_CA_PROTO_ACCESS_RIGHTS(message: Buffer) {
        this.promises.resolve("CA_PROTO_VERSION", "TCPTransport initialization finished");

        let channelClientID = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter1);
        let accessRight = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter2);
        let channel = this.context.getResolvedChannelsByClientID()[channelClientID];
        if (channel !== undefined) {
            if (accessRight in Channel_ACCESS_RIGHTS) {
                channel.setAccessRight(accessRight);
                GlobalMethods.infoLog(`Channel "${channel.getName()}" has access right "${channel.getAccessRight()}"`);
            } else {
                GlobalMethods.infoLog(`CA_PROTO_ACCESS_RIGHTS for channel ${channel.getName()} returns an illegal access right value ${accessRight}`);
            }
        } else {
            GlobalMethods.errorLog(`Channel with client ID ${channelClientID} not found`);
        }
    }

    private handle_CA_PROTO_CREATE_CHAN(message: Buffer) {
        let dbrType = message.readUInt16BE(CA_MSG_HEADER_OFFSETS.dataType);
        let channelClientID = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter1);
        let channelServerID = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter2);
        let dataCount = message.readUInt16BE(CA_MSG_HEADER_OFFSETS.dataCount);

        let channel = this.context.getResolvedChannelsByClientID()[channelClientID];
        if (channel !== undefined) {
            channel.setChannelServerID(channelServerID);
            // set the intrinsic DBR value count
            channel.setValueCount(dataCount);
            // set the intrinsic DBR type
            channel.setDbrType(dbrType);
            // lift blocking in Channel.create() method
            channel.getPromises().resolve("CA_PROTO_CREATE_CHAN", message);

            GlobalMethods.infoLog(`Channel "${channel.getName()}" has intrinsic DBR type "${channel.getDbrTypeStr()}"`);
        } else {
            // ignore this message
        }
    }

    private handle_CA_PROTO_WRITE_NOTIFY(message: Buffer) {
        let statusCode = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter1);
        let ioID = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter2);
        this.context.getReadWriteIos().resolveIo(ioID, statusCode);
    }

    private handle_CA_PROTO_EVENT_ADD(message: Buffer) {
        let HEADER_OFFSETS = CA_MSG_HEADER_OFFSETS;
        let HEADER_SIZE = CA_MSG_HEADER_SIZE;
        if (isExtendedMessageHeader(message, 0)) {
            HEADER_OFFSETS = CA_EXT_MSG_HEADER_OFFSETS;
            HEADER_SIZE = CA_EXT_MSG_HEADER_SIZE;
        }
        let ecaCode = message.readUInt32BE(HEADER_OFFSETS.parameter1);
        let subID = message.readUInt32BE(HEADER_OFFSETS.parameter2);
        let payloadSize = message.readUInt16BE(HEADER_OFFSETS.payloadSize);

        if (payloadSize === 0) {
            // this is a reply from CA_PROTO_EVENT_CANCEL
            // we do not need to do anything
            return;
        }
        if (ecaCode !== ECA_VALUES.ECA_NORMAL) {
            console.log(message)
            GlobalMethods.errorLog(`CA_PROTO_EVENT_ADD message from server ${this.key} contains an error`);
            GlobalMethods.errorLog(ECA.decode(ecaCode));
            return;
        }

        let monitor = this.getMonitor(subID);

        if (monitor !== undefined) {

            // set to SUBSCRIBED anyway, used when we resume the monitor
            monitor.setState(ChannelMonitor_STATES.SUBSCRIBED);

            // decode and update the Channe.dbr
            // this should not be done in ChannelMonitor.subscribe(), because that function
            // is invoked only once. We need to decode the buffer everytime when we receive
            // the CA_PROTO_EVENT_ADD
            monitor.decodeBuffer(message);


            // lift blocking in ChannelMonitor.subscribe()
            // it should be done after the message is decoded
            monitor.getPromises().resolve("CA_PROTO_EVENT_ADD", "");

            // invoke callback function
            const listener = monitor.getListener();
            if (listener !== undefined) {
                listener(monitor);
            }
        }
    }

    private handle_CA_PROTO_ECHO(message: Buffer) {
        // do nothing
    }

    private handle_CA_PROTO_ERROR(message: Buffer) {
        let channelClientID = message.readUInt32BE(8);
        let channel = this.context.getChannel(channelClientID);
        let name = channel?.getName();
        let ecaCode = message.readUInt32BE(12);
        GlobalMethods.errorLog("");
        GlobalMethods.errorLog("-------------- Error begins --------------------------");
        GlobalMethods.errorLog(`TCP server: ${this.serverAddress}:${this.serverPort}`);
        GlobalMethods.errorLog(ECA.decode(ecaCode));
        if (channel !== undefined) {
            GlobalMethods.errorLog(`Channel name: ${name}`);
            GlobalMethods.errorLog(`Channel client ID: ${channelClientID}`);
        }
        GlobalMethods.errorLog(``);
        GlobalMethods.errorLog(`Orignal message sent to server:`);

        printMsg(
            message.subarray(CA_MSG_HEADER_SIZE, CA_MSG_HEADER_SIZE * 2),
            { address: this.serverAddress, port: this.serverPort },
            "Sending TCP",
            false,
            true
        );
        GlobalMethods.errorLog(`Error message from server:`);
        GlobalMethods.errorLog(message.subarray(CA_MSG_HEADER_SIZE * 2).toString());
        GlobalMethods.errorLog("--------------- Error ends -------------------------");
        GlobalMethods.errorLog("");
        //todo: decode statusCode, originalRequest, and errorMessage
        let originalRequest = "";
        let errorMessage = "";
    }

    /**
     * CA_PROTO_CLEAR_CHANNEL is sent when the channel is destroyed (soft or hard)
     * The channel state has been updated when this message is sent out,
     * we do not need to do anything for this reply
     */
    private handle_CA_PROTO_CLEAR_CHANNEL(message: Buffer) {
        // let channelClientID = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter2);
        // const channel = this.context.getChannel(channelClientID);
        // if (channel !== undefined) {
        //     channel.destroySoft();
        // }
    }

    private handle_CA_PROTO_SERVER_DISCONN(message: Buffer) {
        // same as failing to create a channel
        this.handle_CA_PROTO_CREATE_CH_FAIL(message);
    }

    /**
     * Creation channel failed, let's destroy hard this channel.
     */
    private handle_CA_PROTO_CREATE_CH_FAIL(message: Buffer) {
        let channelClientID = message.readUInt32BE(CA_MSG_HEADER_OFFSETS.parameter1);
        const channel = this.context.getChannel(channelClientID);
        if (channel !== undefined) {
            channel.destroyHard();
        }
    }

    private handle_CA_PROTO_READ_NOTIFY(message: Buffer) {
        let HEADER_OFFSETS = CA_MSG_HEADER_OFFSETS;
        let HEADER_SIZE = CA_MSG_HEADER_SIZE;
        if (isExtendedMessageHeader(message, 0)) {
            HEADER_OFFSETS = CA_EXT_MSG_HEADER_OFFSETS;
            HEADER_SIZE = CA_EXT_MSG_HEADER_SIZE;
        }
        let ioID = message.readUInt32BE(HEADER_OFFSETS.parameter2);
        // lift the block in Channel.get()
        this.context.getReadWriteIos().resolveIo(ioID, message);
    }


    // -------------------- channel monitor -------------------------

    /**
     * Increase the ChannelMonitor's subscription ID by 1 and return it.
     */
    obtainMonitorSubscriptionId = () => {
        const currentId = this.getMonitorSubscriptionId();
        let newId = currentId + 1;
        if (newId >= 0xffffffff) { // 4 bytes
            newId = 0;
        }
        this.setMonitorSubscriptionId(newId);
        return newId;
    }


    // send CA_PROTO_EVENTS_OFF to server, no reply
    pauseEvents() {
        let buffer = generateCAHeader(
            CA_COMMANDS.CA_PROTO_EVENTS_OFF, // 0x08
            0, // reserved
            0, // reserved
            0, // reserved
            0, // reserved
            0 // reserved
        );
        this.send(buffer);
        for (let name in this.channels) {
            const channel = this.channels[name];
            for (let subID in channel.monitors) {
                const monitor = channel.monitors[subID];
                monitor.setState(ChannelMonitor_STATES.PAUSED);
            }
        }
    }

    // send CA_PROTO_EVENTS_ON to server, no reply
    resumeEvents() {
        let buffer = generateCAHeader(
            CA_COMMANDS.CA_PROTO_EVENTS_ON, // 0x09
            0, // reserved
            0, // reserved
            0, // reserved
            0, // reserved
            0 // reserved
        );
        this.send(buffer);
        for (let name in this.channels) {
            const channel = this.channels[name];
            for (let subID in channel.monitors) {
                const monitor = channel.monitors[subID];
                monitor.setState(ChannelMonitor_STATES.SUBSCRIBED);
            }
        }
    }

    // ---------------------- getters and setters -------------------

    removeChannel = (channelName: string) => {
        GlobalMethods.infoLog(`Removing channel "${channelName}" from TCPTransoprt "${this.key}"`);
        delete this.channels[channelName];
    };

    private getMonitorSubscriptionId = () => {
        return this.monitorSubscriptionId;
    };

    private setMonitorSubscriptionId = (newId: number) => {
        this.monitorSubscriptionId = newId;
    }

    getMonitors = () => {
        return this.monitors;
    }

    /**
     * Get the ChannelMonitor by its subscription ID
     */
    getMonitor = (subscriptionId: number): ChannelMonitor | undefined => {
        return this.getMonitors()[`${subscriptionId}`];
    };

    addMonitor = (newMonitor: ChannelMonitor) => {
        const subscriptionId = newMonitor.getSubscriptionId();
        this.getMonitors()[`${subscriptionId}`] = newMonitor;
    }

    removeMonitor = (subscriptionId: number) => {
        delete this.getMonitors()[`${subscriptionId}`];
    }

    getSocket = () => {
        return this.socket;
    }

    getPromises = () => {
        return this.promises;
    }

    getState = () => {
        return this.state;
    }

    getStateStr = () => {
        return TCPTransport_STATES[this.getState()];
    }

    setState = (newState: TCPTransport_STATES) => {
        this.state = newState;
    }

    getServerAddress = () => {
        return this.serverAddress;
    }

    getServerPort = () => {
        return this.serverPort;
    }

    getServerSchedulingPriority = () => {
        return this.serverSchedulingPriority;
    }

    getChannels = () => {
        return this.channels;
    }

    getChannel = (channelName: string): Channel | undefined => {
        return this.getChannels()[channelName];
    }

    getContext = () => {
        return this.context;
    }

    getTimeouts = () => {
        return this.timeouts;
    }

    getKey = () => {
        return this.key;
    }

    /**
     * Associate a Channel object with this TCPTransoport object.
     * 
     * (1) add this TCPTransoport object to Channel
     * 
     * (2) add the Channel object to TCPTransoport.channels
     */
    associateChannel(channel: Channel) {
        GlobalMethods.infoLog(
            `Add channel ${channel.getName()} to TCPTransport ${this.serverAddress}:${this.serverPort}:${this.serverSchedulingPriority}`
        );

        // (1)
        channel.setTcpTransport(this);

        // (2)
        this.channels[channel.getName()] = channel;
    }

    getIntervals = () => {
        return this.intervals;
    }

    getNetworkStats = () => {
        return this.networkStats;
    }
}

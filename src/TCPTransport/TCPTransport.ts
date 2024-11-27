import { Socket } from "net";
import { Buffer } from "buffer";
import { userInfo, hostname } from "os";

import { generatePvaHeader, printMsg, readPvaCommand, readPvaEndian, readPvaMessageType, setPayloadSizeInPvaHeader } from "../Global/GlobalMethods";
import { ChannelMonitor } from "../Channel/ChannelMonitor";
import { Channel_ACCESS_RIGHTS, PVA_STATUS_TYPE } from "../Channel/Channel";
import { CA_MINOR_PROTOCOL_REVISION, CA_MSG_HEADER_OFFSETS, PVA_COMMANDS, PVA_ENDIAN, PVA_MESSAGE_SEGMENT_TYPE, PVA_MESSAGE_TYPE, PVA_MSG_HEADER_OFFSETS, PVA_MSG_HEADER_SIZE } from "../Global/Constants";
import { CA_MSG_HEADER_SIZE } from "../Global/Constants";
import { CA_COMMANDS } from "../Global/Constants";
import { Channel } from "../Channel/Channel";
import { Context, type_network_stats } from "../Context/Context";
import { CA_EXTENDED_MESSAGE_HEADER_SIZE, CA_MESSAGE_HEADER_SIZE, MAX_TCP_RECV } from "../Global/Constants";
import { CA_EXT_MSG_HEADER_OFFSETS } from "../Global/Constants";
import { CA_EXT_MSG_HEADER_SIZE } from "../Global/Constants";
import { generateCAHeader, getStringPaddedSize, GlobalMethods, isExtendedMessageHeader, splitCaMessage, splitPvaMessage } from "../Global/GlobalMethods";

import { ECA, ECA_VALUES, ECA_SEVERITIES } from "../ECA/ECA";
import { TCPTransportPromises } from "./TCPTransportPromises";
import { Timeouts } from "../Timeouts/Timeouts";
import { ChannelMonitor_STATES } from "../Channel/ChannelMonitor";
import { Intervals } from "../Intervals/Intervals";
import { ENDIAN, readUInt32, readUInt8 } from "../PvaData/PvaMethods";
import { typeIndexEnum } from "../PvaData/PvaData_typeEncoding";
import { decodeBitSets, decodeData, decodeStatus, getDecodingDataNewOffset } from "../PvaData/DataDecoder";
import { encodeData } from "../PvaData/DataEncoder";
import { decodeType, getDecodingTypeNewOffset, reduceStructTypeWithBitSets, setPvaTypesRegistry } from "../PvaData/TypeDecoder";

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
    private protocol: "pva" | "ca";



    // PVA endian from server

    /**
     * This endian is used for 
     * 
     *  (1) **encoding** TCP messages sent to the PVA server, and
     *  
     *  (2) **decoding** the message received from the PVA server **if** the 
     *      PVA_PROTO_SET_BYTE_ORDER (0x02) payload value is 0x00000000. If the payload
     *      value of PVA_PROTO_SET_BYTE_ORDER (0x02) is 0xffffffff, the endian for decoding 
     *      message is from the message itself.
     * 
     */
    private endian: ENDIAN = ENDIAN.LITTLE;
    private useGlobalEndianForDecoding: boolean = false;
    private pvaTypesRegistry: Record<string, any> = {};

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
        protocol: "pva" | "ca",
    ) {
        this.serverSchedulingPriority = serverSchedulingPriority;
        this.context = context;

        this.protocol = protocol;

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
            // this Promise is not blocking at this step, but blocks 
            // at the next step handShakeWithIoc()
            // A race condition *might* (though not seen yet) happen if the PVA_PROTO_CONNECTION_VALIDATION arrives
            // at and processed by the client earlier than the handShakeWithIoc() is invoked.
            // If this happens, the program will be stuck at the handShakeWithIoc() because the 
            // Promise PVA_PROTO_CONNECTION_VALIDATION is never going to be resolved, the PVA_PROTO_CONNECTION_VALIDATION
            // message already "resolved" it even before this Promise is created.
            // So, we create this Promise early in here to prevent this possible race condition.
            this.promises.append("PVA_PROTO_CONNECTION_VALIDATION", false);

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
     * 
     * Handshake with the IOC.
     * 
     * For CA: send handshake messages to IOC: CA_PROTO_VERSION, CA_PROTO_CLIENT_NAME, and CA_PROTO_HOST_NAME
     * and wait for the reply of CA_PROTO_VERSION
     * the other 2 messages cause a reply of CA_PROTO_ACCESS_RIGHTS, which is handled in its own callback
     * 
     *
     * In old version CA server, the CA_PROTO_VERSION does not come with a reply. So we do not block 
     * this function on the high level function, 
     * i.e. instead of using "await handShakeWithIoc()", we use "handShakeWithIoc()"
     * 
     * For PVA: after the TCP connection is established, the IOC immediately sends the PVA_PROTO_CONNECTION_VALIDATION (0x01)
     * message to the client. This message contains some buffer size and authentication info of the server. 
     * After received the validation message, the client sends out the CONNECITON VALIDATION REPONSE 
     * message to server, which includes the buffer sizes and authentication info.
     * 
     * This function is invoked after the TCP connection is established. The IOC immediately sends 
     * the PVA_PROTO_CONNECTION_VALIDATION message back to the client when the TCP connection is 
     * established. 
     * 
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

        if (this.getProtocol() === "ca") {

            this.promises.append("CA_PROTO_VERSION", false);
            const promiseObj = this.promises.get("CA_PROTO_VERSION");

            this.sendFirstFewMessages();

            // making the whole connection unable to proceed.
            //todo: what is the behavior if rejected
            await promiseObj;
        } else {

            // append promises first

            // Promise PVA_PROTO_CONNECTION_VALIDATION is added in this.connectSocket() method 
            // to prevent possible race condition. It is resolved when the client receives
            // the PVA_PROTO_CONNECTION_VALIDATION message from server. This message
            // is immediately sent out when the TCP connectio is established.
            // this.promises.append("PVA_PROTO_CONNECTION_VALIDATION", false);

            this.promises.append("PVA_PROTO_CONNECTION_VALIDATED", false);
            const promiseObj = this.promises.get("PVA_PROTO_CONNECTION_VALIDATION");
            const promiseObj2 = this.promises.get("PVA_PROTO_CONNECTION_VALIDATED");

            await promiseObj;

            //  send out PVA_PROTO_CONNECTION_VALIDATION_RESPONSE to server
            this.send_PVA_PROTO_CONNECTION_VALIDATION_RESPONSE();

            // wait for the PVA_PROTO_CONNECTION_VALIDATED from server
            await promiseObj2;
        }

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

        let beaconPeriod = this.getContext().getEnv("EPICS_CA_BEACON_PERIOD") as number;
        if (this.getProtocol() === "pva") {
            beaconPeriod = this.getContext().getEnv("EPICS_PVA_BEACON_PERIOD") as number;
        }

        const dt1 = (beaconPeriod + 1);
        const dt2 = (beaconPeriod * 2 + 1);

        this.timeouts.addTimeout(
            "inactiveTimer1",
            dt1, // unit: second
            this.getProtocol() === "ca" ? this.send_CA_PROTO_ECHO : this.send_PVA_PROTO_ECHO,
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
        const { messages, residualMessage } = splitCaMessage(buffer);
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


    send_PVA_PROTO_ECHO = () => {
        const type = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelArrayRequestInit",
            fields: {
                somePayload: { typeIndex: typeIndexEnum.integer_variableSizeArray_unsignedByte },
            }
        }

        const data = {
            somePayload: [],
        }

        const endian = this.getEndian(undefined, "encoding");

        const payloadBuffer = encodeData(type, data, endian);
        const headerBuffer = generatePvaHeader(0x02, PVA_MESSAGE_TYPE.APPLICATION, PVA_MESSAGE_SEGMENT_TYPE.NOT_SEGMENT, endian);
        setPayloadSizeInPvaHeader(headerBuffer, payloadBuffer.length, endian);
        this.send(Buffer.concat([headerBuffer, payloadBuffer]));
    }


    send_PVA_PROTO_CONNECTION_VALIDATION_RESPONSE = () => {
        const type = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "connectionValidationResponse",
            fields: {
                clientReceiveBufferSize: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                clientIntrospectionRegistryMaxSize: { typeIndex: typeIndexEnum.integer_scalar_unsignedShort },
                connectionQos: { typeIndex: typeIndexEnum.integer_scalar_unsignedShort },
                authNZ: { typeIndex: typeIndexEnum.string_scalar },
            }
        }

        const data = {
            clientReceiveBufferSize: 16000,
            clientIntrospectionRegistryMaxSize: 16000,
            connectionQos: 0,
            authNZ: "ca",
        }

        const endian = this.getEndian(undefined, "encoding");

        const bufferPayload = encodeData(type, data, endian);
        const bufferHeader = generatePvaHeader(PVA_COMMANDS.PVA_PROTO_CONNECTION_VALIDATION, PVA_MESSAGE_TYPE.APPLICATION, PVA_MESSAGE_SEGMENT_TYPE.NOT_SEGMENT, endian);
        setPayloadSizeInPvaHeader(bufferHeader, bufferPayload.length, endian);
        this.send(Buffer.concat([bufferHeader, bufferPayload]));
    }



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
        if (this.getProtocol() === "pva") {
            try {
                this.pvaMessageHandler(msg);
            } catch (e) {
                GlobalMethods.errorLog(e);
            }
        } else {
            try {
                this.caMessageHandler(msg);
            } catch (e) {
                GlobalMethods.errorLog(e);
            }
        }
    }

    pvaMessageHandler = (msg: Buffer) => {

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

        setPvaTypesRegistry(this);

        /**
         * special treatement for PVA_PROTO_SET_BYTE_ORDER, it
         * 
         *   (1) set the server's endian for this TCP connection
         *       all the messages sent to this server must be encoded with this endian
         * 
         *   (2) set if decoding should use the endian from the message or from TCP-wide
         */
        const firstMessageCommand = readPvaCommand(msg, 0);
        const firstMessageType = readPvaMessageType(msg, 0);
        if (firstMessageType === PVA_MESSAGE_TYPE.CONTROL && firstMessageCommand === PVA_COMMANDS.PVA_PROTO_SET_BYTE_ORDER) {
            this.handle_PVA_PROTO_SET_BYTE_ORDER(msg);
        }

        // the endian for this TCP connection is already set by above handle_PVA_PROTO_SET_BYTE_ORDER()
        const endian = this.getEndian(msg, "decoding");

        // if the first message is PVA_PROTO_SET_BYTE_ORDER, we skip 8 bytes as this message cannot
        // be properly decoded because its payload size does not mean its payload's size
        const { messages, residualMessage } = splitPvaMessage(Buffer.concat([this.residualMessage, msg]), "tcp", endian);
        this.residualMessage = residualMessage;

        for (let message of messages) {
            printMsg(message, { address: this.serverAddress, port: this.serverPort }, "Received TCP");
        }

        // update network statistics
        this.caMessagesReceivedInLastSecond = this.caMessagesReceivedInLastSecond + messages.length;
        this.packetsReceivedInLastSecond = this.packetsReceivedInLastSecond + 1;
        this.bytesReceivedInLastSecond = this.bytesReceivedInLastSecond + msg.length;

        for (let message of messages) {
            let command = readPvaCommand(message, 0);

            const messageType = readPvaMessageType(message, 0);
            if (messageType === PVA_MESSAGE_TYPE.APPLICATION) {

                if (command === PVA_COMMANDS.PVA_PROTO_CONNECTION_VALIDATION) {
                    this.handle_PVA_PROTO_CONNECTION_VALIDATION(message);
                } else if (command === PVA_COMMANDS.PVA_PROTO_CONNECTION_VALIDATED) {
                    this.handle_PVA_PROTO_CONNECTION_VALIDATED(message);
                } else if (command === PVA_COMMANDS.PVA_PROTO_CREATE_CHANNEL) {
                    this.handle_PVA_PROTO_CREATE_CHANNEL(message);
                } else if (command === PVA_COMMANDS.PVA_PROTO_CHANNEL_GET) {
                    this.handle_PVA_PROTO_CHANNEL_GET(message);
                } else if (command === PVA_COMMANDS.PVA_PROTO_CHANNEL_PUT) {
                    this.handle_PVA_PROTO_CHANNEL_PUT(message);
                } else if (command === PVA_COMMANDS.PVA_PROTO_CHANNEL_PUT_GET) {
                    this.handle_PVA_PROTO_CHANNEL_PUT_GET(message);
                } else if (command === PVA_COMMANDS.PVA_PROTO_CHANNEL_MONITOR) {
                    this.handle_PVA_PROTO_CHANNEL_MONITOR(message);
                } else if (command === PVA_COMMANDS.PVA_PROTO_CHANNEL_ARRAY) {
                    this.handle_PVA_PROTO_CHANNEL_ARRAY(message);
                } else if (command === PVA_COMMANDS.PVA_PROTO_CHANNEL_PROCESS) {
                    this.handle_PVA_PROTO_CHANNEL_PROCESS(message);
                } else if (command === PVA_COMMANDS.PVA_PROTO_GET_INTROSPECTION_TYPE) {
                    this.handle_PVA_PROTO_GET_INTROSPECTION_TYPE(message);
                } else if (command === PVA_COMMANDS.PVA_PROTO_MESSAGE) {
                    this.handle_PVA_PROTO_MESSAGE(message);
                } else if (command === PVA_COMMANDS.PVA_PROTO_CHANNEL_RPC) {
                    this.handle_PVA_PROTO_CHANNEL_RPC(message);
                } else if (command === PVA_COMMANDS.PVA_PROTO_DESTROY_CHANNEL) {
                    this.handle_PVA_PROTO_DESTROY_CHANNEL(message);
                }
            } else {
                // control messages
                if (command === PVA_COMMANDS.PVA_PROTO_SET_BYTE_ORDER) {
                    // do nothing, it is done above
                }
            }
        }
    };

    handle_PVA_PROTO_SET_BYTE_ORDER = (message: Buffer) => {
        try {
            const endian = readPvaEndian(message, 0);
            this.setEndian(endian);
            if (readUInt32(message, PVA_MSG_HEADER_OFFSETS.payloadSize, endian) === 0) {
                this.useGlobalEndianForDecoding = true;
            } else {
                this.useGlobalEndianForDecoding = false;
            }
        } catch (e) {
            GlobalMethods.errorLog(e);
        }
    }

    handle_PVA_PROTO_DESTROY_CHANNEL = (message: Buffer) => {

        const type = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelMonitorResponseInit",
            fields: {
                clientChannelID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                serverChannelID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
            }
        }

        try {
            const endian = this.getEndian(message, "decoding");
            const data = decodeData(type, message, 8, endian);
            const channelClientID = data["clientChannelID"];
            // we don't need to do anything
            return;

        } catch (e) {
            // we don't have an IO ID, do nothing
            GlobalMethods.errorLog(e);
            return;
        }
    }

    handle_PVA_PROTO_CHANNEL_RPC = (message: Buffer) => {

        // the type before the status, then the PV structure
        const typeCommon = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelRPCRequest",
            fields: {
                requestID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                subcommand: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
                // "status" is here, we need to manually decode it
            }
        }

        try {
            const endian = this.getEndian(message, "decoding");
            const data = decodeData(typeCommon, message, 8, endian);
            const subcommand = data["subcommand"];
            const ioID = data["requestID"];

            try {
                // decode status manually, 
                // Status is decoded as a data, so we need to getDecodingDataNewOffset()
                let offset = getDecodingDataNewOffset();

                const status = decodeStatus(message, offset, endian);
                offset = getDecodingDataNewOffset(); // position after the status

                if (subcommand === 0x08) { // INIT response
                    if (status["type"] === 0xff || status["type"] === 0x00 || status["type"] === 0x01) {
                        this.getContext().getReadWriteIos().resolveIo(ioID, status);
                        return;
                    }
                } else if (subcommand === 0x00) { // actual response
                    if (status["type"] === 0xff || status["type"] === 0x00 || status["type"] === 0x01) {
                        const typeResult = {
                            typeIndex: typeIndexEnum.complex_scalar_variantUnion,
                        };
                        const result = decodeData(typeResult, message, offset, endian);

                        // result = {value: ..., type: ...}
                        this.getContext().getReadWriteIos().resolveIo(ioID, result);

                        return;
                    }
                }

                this.getContext().getReadWriteIos().rejectIo(ioID, status);
                return;

            } catch (e) {
                GlobalMethods.errorLog(e);
                this.getContext().getReadWriteIos().rejectIo(ioID, "Error handling PVA_PROTO_CHANNEL_RPC message");
                return;
            }
        } catch (e) {
            // we don't have an IO ID, do nothing
            GlobalMethods.errorLog(e);
            return;
        }
    }

    handle_PVA_PROTO_MESSAGE = (message: Buffer) => {

        const type = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelGetFieldResponse",
            fields: {
                requestID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                messageType: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
                message: { typeIndex: typeIndexEnum.string_scalar },
            }
        };

        try {
            const endian = this.getEndian(message, "decoding");
            const data = decodeData(type, message, PVA_MSG_HEADER_SIZE, endian);
            const ioID = data["requestID"];
            // 0 === info, 1 === warning, 2 === error, 3 === fatal error
            const msgType = data["messageType"];
            // human readable string 
            const msg = data["message"];
            // todo: how to handle the data
            GlobalMethods.infoLog("Received message from IOC:", data);
        } catch (e) {
            // do nothing
            GlobalMethods.errorLog(e);
        }

    }

    handle_PVA_PROTO_GET_INTROSPECTION_TYPE = (message: Buffer) => {

        // the type before the status, then the PV structure
        const typeCommon = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelGetFieldResponse",
            fields: {
                requestID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                // "status" is here, we need to manually decode it
            }
        }

        try {
            const endian = this.getEndian(message, "decoding");
            const data = decodeData(typeCommon, message, PVA_MSG_HEADER_SIZE, endian);
            // the subcommand may be 0x08 (INIT) or 0x00 (PROCESS)
            const ioID = data["requestID"];

            try {

                // decode status manually, 
                // Status is decoded as a data, so we need to getDecodingDataNewOffset()
                let offset = getDecodingDataNewOffset();
                const status = decodeStatus(message, offset, endian);

                offset = getDecodingDataNewOffset(); // position after the status

                if (status["type"] === 0xff || status["type"] === 0x00 || status["type"] === 0x01) {
                    const dataType = decodeType(message, offset, endian);
                    this.getContext().getReadWriteIos().resolveIo(ioID, dataType);
                    return;
                }
                this.getContext().getReadWriteIos().rejectIo(ioID, "Failed to parse PVA_PROTO_GET_INSTROPECTION_TYPE message");
            } catch (e) {
                // we already have the IO ID, we can reject this IO ID
                GlobalMethods.errorLog(e);
                this.getContext().getReadWriteIos().rejectIo(ioID, "Failed to parse PVA_PROTO_GET_INSTROPECTION_TYPE message");
                return;
            }
        } catch (e) {
            // we do not have the ioID, do nothing
            GlobalMethods.errorLog(e);
            return;
        }
    }

    handle_PVA_PROTO_CHANNEL_PROCESS = (message: Buffer) => {

        // the type before the status, then the PV structure
        const typeCommon = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelProcessResponseInit",
            fields: {
                requestID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                subcommand: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
                // "status" is here, we need to manually decode it
            }
        }

        try {
            const endian = this.getEndian(message, "decoding");
            const data = decodeData(typeCommon, message, PVA_MSG_HEADER_SIZE, endian);
            // the subcommand may be 0x08 (INIT) or 0x00 (PROCESS)
            const subcommand = data["subcommand"];
            const ioID = data["requestID"];

            try {
                // decode status manually, 
                // Status is decoded as a data, so we need to getDecodingDataNewOffset()
                let offset = getDecodingDataNewOffset();
                const status = decodeStatus(message, offset, endian);

                offset = getDecodingDataNewOffset(); // position after the status

                if (status["type"] === 0xff || status["type"] === 0x00 || status["type"] === 0x01) {
                    this.getContext().getReadWriteIos().resolveIo(ioID, status);
                    return;
                } else {
                    this.getContext().getReadWriteIos().rejectIo(ioID, status);
                }
            } catch (e) {
                // we have an IO ID, reject it
                this.getContext().getReadWriteIos().rejectIo(ioID,
                    {
                        type: PVA_STATUS_TYPE.ERROR,
                        message: "Failed to decode PVA_PROT_CHANNEL_PROCESS message",
                        callTree: "",
                    });
                return;
            }
        } catch (e) {
            // we do not have IO ID, do nothing
            GlobalMethods.errorLog(e);
        }
    }


    /**
     * ! seems like the IOC does not implement the PVA_PROTO_CHANNEL_ARRAY
     * 
     * ! the reply of the INIT says "Not Implemented"
     */
    handle_PVA_PROTO_CHANNEL_ARRAY = (message: Buffer) => {

        // the type before the status, then the PV structure
        const typeCommon = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelMonitorResponseInit",
            fields: {
                requestID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                subcommand: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
                // "status" is here, we need to manually decode it
                // for INIT request (0x08), this is the location of pv structure types for monitor
                // for actual request (0x00), this is the location of (a) changed BitSets and (b) pv structure data (the real data) and (c) overrun bitsets
            }
        }

        try {

            const endian = this.getEndian(message, "decoding");
            const data = decodeData(typeCommon, message, 8, endian);
            const subcommand = data["subcommand"];
            const ioID = data["requestID"];

            try {

                // decode status manually, 
                // Status is decoded as a data, so we need to getDecodingDataNewOffset()
                let offset = getDecodingDataNewOffset();
                const status = decodeStatus(message, offset, endian);

                offset = getDecodingDataNewOffset(); // position after the status

                if (status["type"] === 0xff || status["type"] === 0x00 || status["type"] === 0x01) {
                    if (subcommand === 0x08) { // INIT response

                        // get the type of the pv structure (the type of the data)
                        const pvStructureType = decodeType(message, offset, endian);
                        // here we are decoding a type, we we have to use getDecodingTypeNewOffset()
                        offset = getDecodingTypeNewOffset()

                        const channel = this.getContext().getReadWriteIos().getChannel(ioID);
                        if (channel !== undefined) {
                            // channel.setPvaGETDataStructureType(pvStructureType);
                            // channel.setPvaPUTDataStructureType(pvStructureType);
                        }

                        this.getContext().getReadWriteIos().resolveIo(ioID, pvStructureType);
                        return;
                    } else if (subcommand === 0x40) { // GET response
                        const channel = this.getContext().getReadWriteIos().getChannel(ioID);
                        if (channel !== undefined) {
                            // ! is this the same as the GET data type, or a different data type??
                            // const pvStructureType = channel.getPvaGETDataStructureType();
                            // const pvStructureData = decodeData(pvStructureType, message, offset, endian);
                            // this.getContext().getReadWriteIos().resolveIo(ioID, pvStructureData);
                            return;
                        }
                    }
                }
                this.getContext().getReadWriteIos().rejectIo(ioID, "Failed to parse PVA_PROTO_CHANNEL_ARRAY message");
                return;
            } catch (e) {
                // we have an IO ID, reject it
                GlobalMethods.errorLog(e);
                this.getContext().getReadWriteIos().rejectIo(ioID, "Failed to parse PVA_PROTO_CHANNEL_ARRAY message");
                return;
            }
        } catch (e) {
            // we do not have the ioID, do nothing
            GlobalMethods.errorLog(e);
            return;
        }

    }


    handle_PVA_PROTO_CHANNEL_MONITOR = (message: Buffer) => {

        // the type before the status, then the PV structure
        const typeCommon = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelMonitorResponseInit",
            fields: {
                requestID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                subcommand: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
                // "status" is here, we need to manually decode it
                // for INIT request (0x08), this is the location of pv structure types for monitor
                // for actual request (0x00), this is the location of (a) changed BitSets and (b) pv structure data (the real data) and (c) overrun bitsets
            }
        }

        try {
            const endian = this.getEndian(message, "decoding");
            const data = decodeData(typeCommon, message, 8, endian);
            const subcommand = data["subcommand"];
            const subscriptionId = data["requestID"];

            // decode status manually, 
            // Status is decoded as a data, so we need to getDecodingDataNewOffset()
            let offset = getDecodingDataNewOffset();

            let monitor = this.getMonitor(subscriptionId);

            if (monitor === undefined) {
                return;
            }

            if (subcommand === 0x08) { // INIT
                try {
                    const status = decodeStatus(message, offset, endian);
                    offset = getDecodingDataNewOffset(); // position after the status

                    if (status["type"] === 0xff || status["type"] === 0x00 || status["type"] === 0x01) {

                        try {
                            // get the type of the pv structure (the type of the data)
                            const pvStructureType = decodeType(message, offset, endian);
                            monitor.getPromises().resolve("PVA_PROTO_CHANNEL_MONITOR_INIT", pvStructureType);
                            return;

                        } catch (e) {
                            GlobalMethods.errorLog(e);
                            monitor.getPromises().reject("PVA_PROTO_CHANNEL_MONITOR_INIT", `${e}`);
                            return;
                        }
                    } else {
                        monitor.getPromises().reject("PVA_PROTO_CHANNEL_MONITOR_INIT", status);
                        return;
                    }
                } catch (e) {
                    // failed to decode Status
                    GlobalMethods.errorLog(e);
                    monitor.getPromises().reject("PVA_PROTO_CHANNEL_MONITOR_INIT", "Error decoding PVA_PROTO_CHANNEL_MONITOR INIT message");
                    return;
                }

            } else if (subcommand === 0x00) { // no Status

                try {
                    // changed bitsets
                    const changedBitSets = decodeBitSets(message, offset, endian);
                    offset = getDecodingDataNewOffset(); // position after the bitsets
                    // decode and process data
                    // use the monitor's type, not the channel's type
                    const reducedType = reduceStructTypeWithBitSets(monitor.getPvaType(), changedBitSets, true);
                    const data = decodeData(reducedType, message, offset, endian);
                    // set the pvaData in Channel, the monitor does not keep any data
                    monitor.setPvaData(data);

                    // todo: overrun bitset, what is it?

                    if (monitor.getState() === ChannelMonitor_STATES.SUBSCRIBING) {
                        // this is a subscribe message
                        monitor.getPromises().resolve("PVA_PROTO_CHANNEL_MONITOR", "");
                    }

                    if (monitor.getState() === ChannelMonitor_STATES.PAUSED) {
                        // this is a resume message
                        monitor.setState(ChannelMonitor_STATES.SUBSCRIBED);
                    }

                    const listener = monitor.getListener();
                    if (listener !== undefined) {
                        listener(monitor);
                    }

                    return;
                } catch (e) {
                    if (monitor.getState() === ChannelMonitor_STATES.SUBSCRIBING) {
                        monitor.getPromises().reject("PVA_PROTO_CHANNEL_MONITOR", `${e}`);
                    } else {
                        // do nothing if we are already monitoring
                        GlobalMethods.errorLog(e);
                    }
                }
            }
        } catch (e) {
            // we do not have the ChannelMonitor object, do nothing
            GlobalMethods.errorLog(e);
            return;
        }
    }

    /**
     * ! it always returns "pv requst invalid" error
     */
    handle_PVA_PROTO_CHANNEL_PUT_GET = (message: Buffer) => {

        // the type before the status, then the PV structure
        const typeCommon = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelGetResponse",
            fields: {
                requestID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                subcommand: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
                // "status" is here, we need to manually decode it
                // for INIT request (0x08), this is the location of pv structure types: PUT and GET
                // for actual request (0x00), this is the location of (a) changed BitSets and (b) pv structure data (the real data)
            }
        }

        try {

            const endian = this.getEndian(message, "decoding");
            const data = decodeData(typeCommon, message, 8, endian);
            const subcommand = data["subcommand"];
            const ioID = data["requestID"];

            try {

                // decode status manually, 
                // Status is decoded as a data, so we need to getDecodingDataNewOffset()
                let offset = getDecodingDataNewOffset();
                const status = decodeStatus(message, offset, endian);

                offset = getDecodingDataNewOffset(); // position after the status

                if (status["type"] === 0xff || status["type"] === 0x00 || status["type"] === 0x01) {
                    if (subcommand === 0x08) { // PUT_GET INIT
                        // get the type of the pv structure (the type of the data)
                        const pvStructureType = decodeType(message, offset, endian);
                        this.getContext().getReadWriteIos().resolveIo(ioID, pvStructureType)
                        return;
                    } else if (subcommand === 0x00) {
                        // I don't know what is it for, but seems like it is a size + some data, 
                        // let's simply decode it as a bitsets
                        decodeBitSets(message, offset, endian);
                        offset = getDecodingDataNewOffset(); // position after the status

                        this.getContext().getReadWriteIos().resolveIo(ioID, {
                            message: message,
                            pvStructureDataOffset: offset,
                            endian: endian,
                        });
                        return;

                    } else if (subcommand === 0x40) {
                    }
                } else {
                    this.getContext().getReadWriteIos().rejectIo(ioID, status);
                    return;
                }
                this.getContext().getReadWriteIos().rejectIo(ioID, "Failed to parse PVA_PROTO_CHANNEL_PUT_GET reply message");
                return;

            } catch (e) {
                // we have an IO ID, reject it
                this.getContext().getReadWriteIos().rejectIo(ioID, "Failed to parse PVA_PROTO_CHANNEL_PUT_GET reply message");
                GlobalMethods.errorLog(e);
                return;
            }
        } catch (e) {
            // we do not have an IO ID, do nothing
            GlobalMethods.errorLog(e);
            return;
        }
    }


    handle_PVA_PROTO_CHANNEL_PUT = (message: Buffer) => {
        // the type before the status, then the PV structure
        const typeCommon = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelGetResponse",
            fields: {
                requestID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                subcommand: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
                // "status" is here, we need to manually decode it
                // for INIT request (0x08), this is the location of pv structure type
                // for actual request (0x00), this is the location of (a) changed BitSets and (b) pv structure data (the real data)
                // for get-put request (0x40), this is the location of last PUT value
            }
        }

        try {

            const endian = this.getEndian(message, "decoding");
            const data = decodeData(typeCommon, message, 8, endian);
            const subcommand = data["subcommand"];
            const ioID = data["requestID"];

            try {

                // decode status manually
                let offset = getDecodingDataNewOffset();
                const status = decodeStatus(message, offset, endian);

                offset = getDecodingDataNewOffset(); // position after the status

                if (status["type"] === 0xff || status["type"] === 0x00 || status["type"] === 0x01) {
                    if (subcommand === 0x08) { // PUT INIT
                        // get the type of the pv structure (the type of the data)
                        const pvStructureType = decodeType(message, offset, endian);
                        this.getContext().getReadWriteIos().resolveIo(ioID, pvStructureType)
                        return;
                    } else if (subcommand === 0x00) { // PUT
                        this.getContext().getReadWriteIos().resolveIo(ioID, status);
                        return;
                    } else if (subcommand === 0x40) { // GET-THE-LAST-PUT
                        // I don't know what is it for, but seems like it is a size + some data, 
                        // let's simply decode it as a bitsets
                        decodeBitSets(message, offset, endian);
                        offset = getDecodingDataNewOffset(); // position after the status

                        this.getContext().getReadWriteIos().resolveIo(ioID, {
                            message: message,
                            pvStructureDataOffset: offset,
                            endian: endian,
                        });
                    }
                } else {
                    this.getContext().getReadWriteIos().rejectIo(ioID, status);
                    return;
                }

                GlobalMethods.errorLog("Failed to decode PVA_PROTO_CHANNEL_PUT message");
                this.getContext().getReadWriteIos().rejectIo(ioID, {
                    type: PVA_STATUS_TYPE.ERROR,
                    message: "Failed to decode PVA_PROTO_CHANNEL_PUT message",
                    callTree: "",
                });
                return;

            } catch (e) {
                GlobalMethods.errorLog(e);
                this.getContext().getReadWriteIos().rejectIo(ioID, {
                    type: PVA_STATUS_TYPE.ERROR,
                    message: `${e}`,
                    callTree: "",
                });
                return;
            }
        } catch (e) {
            // we don't have the IO ID, do nothing
            GlobalMethods.errorLog(e);
        }
    }


    handle_PVA_PROTO_CHANNEL_GET = (message: Buffer) => {
        // the type before the status, then the PV structure
        const typeCommon = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelGetResponse",
            fields: {
                requestID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                subcommand: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
                // "status" is manually decoded
                // for init request (0x08), this is the location of pv structure type
                // for actual request (0x40), this is the location of (a) changed BitSets and (b) pv structure data (the real data)
            }
        }

        try {

            const endian = this.getEndian(message, "decoding");
            const data = decodeData(typeCommon, message, 8, endian);
            const subcommand = data["subcommand"];
            const ioID = data["requestID"];

            try {
                // decode status manually
                let offset = getDecodingDataNewOffset();
                const status = decodeStatus(message, offset, endian);

                offset = getDecodingDataNewOffset(); // position after the status
                if (status["type"] === 0xff || status["type"] === 0x00 || status["type"] === 0x01) {
                    if (subcommand === 0x08) { // INIT
                        // get the type of the requrested pv structure (the type of the data)
                        const pvStructureType = decodeType(message, offset, endian);
                        // resolve to pvStructureType 
                        this.getContext().getReadWriteIos().resolveIo(ioID, pvStructureType);
                        return;
                    } else if (subcommand === 0x40) {
                        // get changed BitSets
                        const changedBitSets = decodeBitSets(message, offset, endian);
                        offset = getDecodingDataNewOffset();

                        this.getContext().getReadWriteIos().resolveIo(ioID, {
                            changedBitSets: changedBitSets,
                            message: message,
                            pvStructureDataOffset: offset,
                            endian: endian,
                        });
                        return;


                        // get the pv structure data, this data's type is obtained in above 0x08 subcommand
                        // const channel = this.getContext().getReadWriteIos().getChannel(ioID);
                        // if (channel !== undefined) {
                        //     const pvStructureType = channel.getPvaGETDataStructureType();
                        //     const reducedPvStructureType = reduceStructTypeWithBitSets(pvStructureType, changedBitSets, true);

                        //     const pvStructureData = decodeData(reducedPvStructureType, message, offset, endian);
                        //     this.getContext().getReadWriteIos().resolveIo(ioID, pvStructureData);
                        //     return;
                        // }
                    }
                }

                this.getContext().getReadWriteIos().rejectIo(ioID, "Failed to parse PVA_PROTO_CHANNEL_GET reply message");
            } catch (e) {
                GlobalMethods.errorLog(e);
                // we have the IO ID, reject it
                this.getContext().getReadWriteIos().rejectIo(ioID, "Failed to parse PVA_PROTO_CHANNEL_GET reply message");
                return;
            }
        } catch (e) {
            // we don't have the IO ID, do nothing
            GlobalMethods.errorLog(e);
        }
    }

    handle_PVA_PROTO_CONNECTION_VALIDATION = async (message: Buffer) => {
        const type = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "connectionValidationRequest",
            fields: {
                serverreceiveBufferSize: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                serverIntrospectionRegistryMaxSize: { typeIndex: typeIndexEnum.integer_scalar_unsignedShort },
                authNZ: { typeIndex: typeIndexEnum.string_variableSizeArray },
            }
        }

        try {
            const endian = this.getEndian(message, "decoding");

            const data = decodeData(type, message, PVA_MSG_HEADER_SIZE, endian);

            this.promises.resolve("PVA_PROTO_CONNECTION_VALIDATION", "");
        } catch (e) {
            GlobalMethods.errorLog(e);
            this.promises.reject("PVA_PROTO_CONNECTION_VALIDATION", "Error decoding PVA_PROTO_CONNECTION_VALIDATION message");
            return;
        }
    }

    handle_PVA_PROTO_CONNECTION_VALIDATED = async (message: Buffer) => {

        try {
            const endian = this.getEndian(message, "decoding");

            const status = decodeStatus(message, PVA_MSG_HEADER_SIZE, endian);

            if (status["type"] === 0x00 || status["type"] === 0x01 || status["type"] === 0xff) {
                this.promises.resolve("PVA_PROTO_CONNECTION_VALIDATED", "OK|WARNING");
            } else {
                this.promises.reject("PVA_PROTO_CONNECTION_VALIDATED", status["message"]);
            }
        } catch (e) {
            GlobalMethods.errorLog(e);
            this.promises.reject("PVA_PROTO_CONNECTION_VALIDATED", "Error decoding PVA_PROTO_CONNECTION_VALIDATED message");
        }
    }

    handle_PVA_PROTO_CREATE_CHANNEL = (message: Buffer) => {
        const type = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "createChannelResponse",
            fields: {
                clientChannelID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                serverChannelID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                // "status" is decoded manually
                // there is no access right 
            }
        }

        try {

            const endian = this.getEndian(message, "decoding");
            // const payloadSize = readUInt32(message, 4, endian);
            const data = decodeData(type, message, PVA_MSG_HEADER_SIZE, endian);
            const channelClientID = data["clientChannelID"];
            const channelServerID = data["serverChannelID"];
            const channel = this.getContext().getChannel(channelClientID);
            if (channel === undefined) {
                return;
            }

            try {
                // manually decode status
                let offset = getDecodingDataNewOffset();
                const status = decodeStatus(message, offset, endian);

                channel.setChannelServerID(channelServerID);

                if (status["type"] === 0x00 || status["type"] === 0x01 || status["type"] === 0xff) {
                    channel.getPromises().resolve("PVA_PROTO_CREATE_CHANNEL", "OK|WARNING");
                    return;
                }
                channel.getPromises().reject("PVA_PROTO_CREATE_CHANNEL", "PVA_PROTO_CREATE_CHANNEL status error");
            } catch (e) {
                GlobalMethods.errorLog(e);
                channel.getPromises().reject("PVA_PROTO_CREATE_CHANNEL", "Error decoding PVA_PROTO_CREATE_CHANNEL message");
                return;
            }
        } catch (e) {
            GlobalMethods.errorLog(e);
        }

    }

    caMessageHandler = (msg: Buffer) => {
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

        const { messages, residualMessage } = splitCaMessage(Buffer.concat([this.residualMessage, msg]));
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
        // const currentId = this.getMonitorSubscriptionId();
        // let newId = currentId + 1;
        // if (newId >= 0xffffffff) { // 4 bytes
        //     newId = 0;
        // }
        // this.setMonitorSubscriptionId(newId);
        // return newId;
        const context = this.getContext();
        const newId = context.getReadWriteIos().obtainAnId();
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

    getProtocol = () => {
        return this.protocol;
    }

    /**
     * Get the endian for encoding and decoding a message.
     * 
     * If the messageType is "encoding", the message is ignored.
     * 
     * If the messageType is "decoding", the message must be a Buffer.
     * 
     * @throws if the message is not avaiable when the messageType is encoding
     */
    getEndian = (message: Buffer | undefined, messageType: "encoding" | "decoding") => {
        if (messageType === "encoding") {
            return this.endian;
        } else {
            if (message === undefined) {
                throw new Error("TCPTransport.getEndian() input error: the message must be a Buffer");
            }

            if (this.useGlobalEndianForDecoding === true) {
                return this.endian;
            } else {
                // read the 7th bit of FLAGS byte in the mssage
                const endian = readPvaEndian(message, 0);
                return endian;
            }
        }
    }

    /**
     * It is defined by the 7th bit of flags in PVA_PROTO_SET_BYTE_ORDER message, which
     * is the first message sent from the server.
     */
    setEndian = (newEndian: ENDIAN) => {
        this.endian = newEndian;
    }

    getPvaTypesRegistry = () => {
        return this.pvaTypesRegistry;
    }
}

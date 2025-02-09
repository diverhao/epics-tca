import { Buffer } from "buffer";

import { Context } from "../Context/Context";
import { TCPTransport } from "../TCPTransport/TCPTransport";
import { generateCAHeader, generatePvaHeader, getStringPaddedSize, GlobalMethods, isExtendedMessageHeader, isPowerOfTwo, setPayloadSizeInPvaHeader } from "../Global/GlobalMethods";
import { ChannelMonitor, ChannelMonitor_STATES } from "./ChannelMonitor";
import { CA_COMMANDS, CA_MINOR_PROTOCOL_REVISION, PVA_COMMANDS, PVA_ENDIAN, PVA_MESSAGE_SEGMENT_TYPE, PVA_MESSAGE_TYPE } from "../Global/Constants";
import { CA_MSG_HEADER_SIZE } from "../Global/Constants";
import { CA_MSG_HEADER_OFFSETS } from "../Global/Constants";
import { CA_EXT_MSG_HEADER_OFFSETS } from "../Global/Constants";
import { CA_EXT_MSG_HEADER_SIZE } from "../Global/Constants";
import { IO_TYPES } from "../Context/ReadWriteIos";
import { ChannelPromises } from "./ChannelPromises";

import { Dbr } from "./Dbr";
import { ECA_SEVERITIES } from "../ECA/ECA";
import { encodeBitSets, encodeData } from "../PvaData/DataEncoder";
import { SIZE_TYPE, typeIndexEnum } from "../PvaData/PvaData_typeEncoding";
import { reduceStructTypeWithBitSets } from "../PvaData/TypeDecoder";
import { createSizeBuffer } from "../PvaData/PvaMethods";
import { PvRequest } from "../PvaData/PvRequest";
import { decodeData } from "../PvaData/DataDecoder";

// todo: access right change listener



export type type_dbr_value = number | number[] | string | string[];

type Primitive = number | number[] | bigint | bigint[] | string | string[];
export interface PvaRecord {
    [key: string]: Primitive | PvaRecord;
}
export type type_pva_value = PvaRecord | Primitive;

export enum PVA_STATUS_TYPE {
    OK,
    WARNING,
    ERROR,
    FATAL,
    OKOK = 0xff,
}

export type type_pva_status = {
    type: PVA_STATUS_TYPE,
    message?: string,
    callTree?: string,
}

export type type_dbrData_value = {
    value: type_dbr_value;
}

export type type_dbr_meta_all = {
    // STS, TIME, GR, and CTRL
    status: CA_ALARM_STATUS,
    severity: CA_ALARM_SEVRITY,
    // TIME
    secondsSinceEpoch: number,
    nanoSeconds: number,
    // GR and CTRL numbered type PV (CHAR, INT, SHORT, LONG, FLOAT, and DOUBLE)
    units: "km",
    // GR_FLOAT, GR_DOUBLE, CTRL_FLOAT and CTRL_DOULBE
    padding: number,
    precision: number,
    // GR and CTRL numbered type PV
    upper_display_limit: number,
    lower_display_limit: number,
    upper_alarm_limit: number,
    upper_warning_limit: number,
    lower_warning_limit: number,
    lower_alarm_limit: number,
    // CTRL numbered type PV
    upper_ctrl_limit: number,
    lower_ctrl_limit: number,
    // GR_ENUM and CTRL_ENUM
    number_of_string_used: number,
    strings: string[],
};

export type type_dbr_meta = Partial<type_dbr_meta_all>;

export type type_dbrData = type_dbrData_value & type_dbr_meta;


export enum Channel_STATES {
    UNRESOLVED,
    SEARCHING, // after first CA_PROTO_SEARCH sent
    RESOLVED, // after CA_PROTO_SEARCH reply
    CREATED, // after CA_PROTO_CREATE_CHAN, registered to CA server
    DISCONNECTED, // destroyed softly, or unexpected disconnection, recoverable
    RECREATING, // after the channel destroyed softly, it automatically starts to recate
    DESTROYED, // cannot be recovered at all
    FAILED, // any other
}

export enum Channel_ACCESS_RIGHTS {
    NOT_AVAILABLE = -1,
    NO_ACCESS = 0,
    READ_ONLY,
    WRITE_ONLY,
    READ_WRITE,
}

export enum CA_ALARM_SEVRITY {
    NO_ALARM,
    MINOR,
    MAJOR,
    INVALID,
}

export enum CA_ALARM_STATUS {
    NO_ALARM,
    READ,
    WRITE,
    HIHI,
    HIGH,
    LOLO,
    LOW,
    STATE,
    COS,
    COMM,
    TIMEOUT,
    HWLIMIT,
    CALC,
    SCAN,
    LINK,
    SOFT,
    BAD_SUB,
    UDF,
    DISABLE,
    SIMM,
    READ_ACCESS,
    WRITE_ACCESS,
}

// basic types: 1, 2, 4, 8
export enum ChannelMonitor_MASKS {
    DBE_VALUE = 1, // 0001
    DBE_LOG = 2, // 0010
    // DBE_VALUE_and_DBE_LOG = 3, // 0011
    DBE_ALARM = 4, // 0100
    // DBE_VALUE_and_DBE_ALARM = 5, // 0101
    // DBE_LOG_and_DBE_ALARM = 6, // 0110
    // DBE_VALUE_and_DBE_LOG_and_DBE_ALARM = 7, // 0111
    DBE_PROPERTY = 8, // 1000
    // DBE_VALUE_and_DBE_PROPERTY = 9, // 1001
    // DBE_LOG_and_DBE_PROPERTY = 10, // 1010
    // DBE_VALUE_and_DBE_LOG_and_DBE_PROPERTY = 11, // 1011
    // DBE_ALARM_and_DBE_PROPERTY = 12, // 1100
    // DBE_VALUE_and_DBE_ALARM_and_DBE_PROPERTY = 13, // 1101
    // DBE_LOG_and_DBE_ALARM_and_DBE_PROPERTY = 14, // 1110
    // DBE_VALUE_and_DBE_LOG_and_DBE_ALARM_and_DBE_PROPERTY = 15, // 1111
}

export enum Channel_DBR_TYPES {
    NOT_AVAILABLE = -1,
    DBR_STRING = 0,
    DBR_INT = 1,
    DBR_SHORT = 1,
    DBR_FLOAT,
    DBR_ENUM,
    DBR_CHAR,
    DBR_LONG,
    DBR_DOUBLE,
    DBR_STS_STRING,
    DBR_STS_INT = 8,
    DBR_STS_SHORT = 8,
    DBR_STS_FLOAT,
    DBR_STS_ENUM,
    DBR_STS_CHAR,
    DBR_STS_LONG,
    DBR_STS_DOUBLE,
    DBR_TIME_STRING,
    DBR_TIME_INT = 15,
    DBR_TIME_SHORT = 15,
    DBR_TIME_FLOAT,
    DBR_TIME_ENUM,
    DBR_TIME_CHAR,
    DBR_TIME_LONG,
    DBR_TIME_DOUBLE,
    DBR_GR_STRING,
    DBR_GR_INT = 22,
    DBR_GR_SHORT = 22,
    DBR_GR_FLOAT,
    DBR_GR_ENUM,
    DBR_GR_CHAR,
    DBR_GR_LONG,
    DBR_GR_DOUBLE,
    DBR_CTRL_STRING,
    DBR_CTRL_INT = 29,
    DBR_CTRL_SHORT = 29,
    DBR_CTRL_FLOAT,
    DBR_CTRL_ENUM,
    DBR_CTRL_CHAR,
    DBR_CTRL_LONG,
    DBR_CTRL_DOUBLE,
    DBR_PUT_ACKT,
    DBR_PUT_ACKS,
    DBR_STSACK_STRING,
    DBR_CLASS_NAME,
}


export class Channel {

    // channel
    private readonly name: string;
    private channelClientID: number = -1;
    private channelServerID: number = 0xffffffff;
    private readonly serverSchedulingPriority: number; // this is at TCPTransoport level
    private accessRight: Channel_ACCESS_RIGHTS = Channel_ACCESS_RIGHTS.NOT_AVAILABLE;
    private state: Channel_STATES = Channel_STATES.UNRESOLVED;
    private readonly creationTimeout: number | undefined = undefined; // simply for re-connect the channel
    private protocol: "ca" | "pva";
    private pvaType: any = undefined;

    // server CA minor version, from 3 to 13
    private serverCaMinorVersion: number = -1;

    // monitors
    readonly monitors: ChannelMonitor[] = [];

    // context
    private readonly context: Context;

    // the TCP transport associated with this channel
    // if there is no TCPTransoport for this channel yet, create one after received CA_PROTO_SEARCH reply from IOC
    private tcpTransport: TCPTransport | undefined = undefined;

    // dbr
    private dbr: Dbr = new Dbr();
    // this is different from the Dbr.type 
    // it is the intrinsic DBR type of the channel defined on IOC, 
    // it is obtained only via CA_PROTO_CREATE_CHAN
    private dbrType: Channel_DBR_TYPES = Channel_DBR_TYPES.NOT_AVAILABLE;
    // this is different from the Dbr.valueCount
    // it is the intrinsic value count of this channel defined on IOC
    // it is obtained only via CA_PROTO_CREATE_CHAN
    private valueCount: number = -1;

    // pva data
    // private pvaData: any;
    // private pvaPUTDataStructureType: any;
    // private pvaPUTGETDataStructureType_PUT: any;
    // private pvaPUTGETDataStructureType_GET: any;
    // private pvaMONITORDataStructureType: any;
    private lastPutPvaIoId: number = -1;
    private lastGetPvaIoId: number = -1;
    private ioIntermediateData: Record<string, any> = {};


    // search
    private readonly CA_PROTO_SEARCH_msg: Buffer;
    private searchCounter: number = 0;
    private readonly searchCounterMax: number;
    private readonly searchCounterMaxP2: number;
    private serverAddress = "";
    private serverTcpPort = -1;


    // asynchronous
    private promises: ChannelPromises = new ChannelPromises();

    // callbacks
    destroySoftCallback: (() => void) = () => { };
    destroyHardCallback: (() => void) = () => { };

    constructor(context: Context, name: string, protocol: "pva" | "ca", creationTimeout: number | undefined = undefined, serverSchedulingPriority: number = -1) {
        // no change upon reconnecting
        this.context = context;
        this.name = name;
        this.protocol = protocol;
        this.creationTimeout = creationTimeout;
        this.CA_PROTO_SEARCH_msg = this.create_CA_PROTO_SEARCH_msg();
        this.serverSchedulingPriority =
            serverSchedulingPriority < 0 ? (this.getContext().getEnv("EPICS_CA_SCHEDULING_PRIORITY_DEFAULT") as number) : serverSchedulingPriority;

        if (protocol === "pva") {
            this.searchCounterMax = Math.max(1, Math.round(
                (this.getContext().getEnv("EPICS_PVA_MAX_SEARCH_PERIOD") as number) / (this.getContext().getEnv("EPICS_PVA_MIN_SEARCH_PERIOD") as number)
            ));
            this.searchCounterMaxP2 = (1 << (Math.floor(Math.log2(this.searchCounterMax * 2))));

        } else {
            this.searchCounterMax = Math.max(1, Math.round(
                (this.getContext().getEnv("EPICS_CA_MAX_SEARCH_PERIOD") as number) / (this.getContext().getEnv("EPICS_CA_MIN_SEARCH_PERIOD") as number)
            ));
            this.searchCounterMaxP2 = (1 << (Math.floor(Math.log2(this.searchCounterMax * 2))));

        }
    }

    // ---------------------- search PV -----------------------------

    /**
     * start to search this PV, i.e. sending out CA_PROTO_SEARCH or PVA_PROTO_SEARCH_REQUEST, 
     * in UDP and wait for the reply
     * 
     * This method should be able to handle this possible race condition:
     * 
     *  - If one startSearchPv() is invoked but we got multiple CA_PROTO_SEARCH responses 
     *    for this channel (may be from multiple IOCs), or multiple resolve functions are invoked, 
     *    only the first one is considered, the latter ones are ignored. 
     */
    startSearchPv = async () => {
        if (this.getProtocol() === "pva") {
            await this.startSearchPvaPv();
        } else {
            await this.startSearchCaPv();
        }
    }

    /**
     * Start to search PVA PV
     */
    private startSearchPvaPv = async () => {
        if (this.getState() === Channel_STATES.SEARCHING) {
            GlobalMethods.debugLog(`Channel search for ${this.getName()}: there is another search running, wait here`);
            const promiseObj = this.getPromiseObj("CA_PROTO_SEARCH");
            // exception should be catched in high level
            const [serverAddress, serverTcpPort] = await promiseObj;
            return [serverAddress, serverTcpPort]
        } else if (this.getState() === Channel_STATES.UNRESOLVED) {
            // this channel is freshly created
            // normal situation, continue
        } else if (this.getState() === Channel_STATES.RECREATING) {
            // the channel was destroyed soft, 
            // normal situation, continue
        } else if (this.getState() === Channel_STATES.RESOLVED) {
            // this channel is found on network, but not created from IOC yet, 
            // there is nothing wrong in this case, so return immediately
            GlobalMethods.debugLog(`Channel search for ${this.getName()} interrupted: this channel is RESOLVED`);
            return;
        } else if (this.getState() === Channel_STATES.CREATED) {
            // this channel is found and already created
            // there is nothing wrong in this case, so return immediately
            GlobalMethods.debugLog(`Channel search for ${this.getName()} interrupted: this channel is CREATED`);
            return;
        } else if (this.getState() === Channel_STATES.DESTROYED) {
            // this is unrecoverable fault, this throw will invoke Channel.destroyHard() in Context.createChannel()
            throw new Error(`Channel search for ${this.getName()} interrupted: this channel is DESTROYED`);
        } else if (this.getState() === Channel_STATES.DISCONNECTED) {
            // this is unrecoverable fault, this throw will invoke Channel.destroyHard() in Context.createChannel()
            throw new Error(`Channel search for ${this.getName()} interrupted: this channel is DISCONNECTED`);
        } else if (this.getState() === Channel_STATES.FAILED) {
            // this is unrecoverable fault, this throw will invoke Channel.destroyHard() in Context.createChannel()
            throw new Error(`Channel search for ${this.getName()} interrupted: this channel is FAILED`);
        } else {
            // this is unrecoverable fault, this throw will invoke Channel.destroyHard() in Context.createChannel()
            throw new Error(`Channel search for ${this.getName()} interrupted: unknown channel state ${this.getState()}`);
        }


        this.setState(Channel_STATES.SEARCHING);

        // we may need to initiate new search in case of TCP error, set rejectAndReplaceExisting to true
        this.getPromises().append("PVA_PROTO_SEARCH_RESPONSE", true);
        const promiseObj = this.getPromiseObj("PVA_PROTO_SEARCH_RESPONSE");

        // the PV search automatically starts
        this.moveToUnresolvedChannelsGroup();

        // exception should be catched in high level
        const [serverAddress, serverTcpPort] = await promiseObj;

        this.setState(Channel_STATES.RESOLVED);
        this.setServerTcpPort(serverTcpPort);
        this.setServerAddress(serverAddress);
    }

    /**
     * Start to search CA PV
     */
    private startSearchCaPv = async () => {

        if (this.getState() === Channel_STATES.SEARCHING) {
            GlobalMethods.debugLog("`Channel search for ${this.getName()}: there is another search running, wait here");
            const promiseObj = this.getPromiseObj("CA_PROTO_SEARCH");
            // exception should be catched in high level
            const [serverAddress, serverTcpPort] = await promiseObj;
            return [serverAddress, serverTcpPort]
        } else if (this.getState() === Channel_STATES.UNRESOLVED) {
            // this channel is freshly created
            // normal situation, continue
        } else if (this.getState() === Channel_STATES.RECREATING) {
            // the channel was destroyed soft, 
            // normal situation, continue
        } else if (this.getState() === Channel_STATES.RESOLVED) {
            // this channel is found on network, but not created from IOC yet, 
            // there is nothing wrong in this case, so return immediately
            GlobalMethods.debugLog(`Channel search for ${this.getName()} interrupted: this channel is RESOLVED`);
            return;
        } else if (this.getState() === Channel_STATES.CREATED) {
            // this channel is found and already created
            // there is nothing wrong in this case, so return immediately
            GlobalMethods.debugLog(`Channel search for ${this.getName()} interrupted: this channel is CREATED`);
            return;
        } else if (this.getState() === Channel_STATES.DESTROYED) {
            // this is unrecoverable fault, this throw will invoke Channel.destroyHard() in Context.createChannel()
            throw new Error(`Channel search for ${this.getName()} interrupted: this channel is DESTROYED`);
        } else if (this.getState() === Channel_STATES.DISCONNECTED) {
            // this is unrecoverable fault, this throw will invoke Channel.destroyHard() in Context.createChannel()
            throw new Error(`Channel search for ${this.getName()} interrupted: this channel is DISCONNECTED`);
        } else if (this.getState() === Channel_STATES.FAILED) {
            // this is unrecoverable fault, this throw will invoke Channel.destroyHard() in Context.createChannel()
            throw new Error(`Channel search for ${this.getName()} interrupted: this channel is FAILED`);
        } else {
            // this is unrecoverable fault, this throw will invoke Channel.destroyHard() in Context.createChannel()
            throw new Error(`Channel search for ${this.getName()} interrupted: unknown channel state ${this.getState()}`);
        }


        this.setState(Channel_STATES.SEARCHING);

        // we may need to initiate new search in case of TCP error, set rejectAndReplaceExisting to true
        this.getPromises().append("CA_PROTO_SEARCH", true);
        const promiseObj = this.getPromiseObj("CA_PROTO_SEARCH");

        // the PV search automatically starts
        this.moveToUnresolvedChannelsGroup();

        // exception should be catched in high level
        const [serverAddress, serverTcpPort, serverCaMinorVersion] = await promiseObj;

        this.setState(Channel_STATES.RESOLVED);
        this.setServerTcpPort(serverTcpPort);
        this.setServerAddress(serverAddress);
        this.setServerCaMinorVersion(serverCaMinorVersion);
    }

    /**
     * Stop searching this PV.
     * 
     * It basically moves this Channel to Context.resolvedChannels...
     */
    stopSearchPv = () => {
        // these 3 lists are always together
        this.moveToResolvedChannelsGroup();
    };

    /**
     * Create the Buffer for name search in CA or PVA. This buffer is never changed.
     * 
     */
    private create_CA_PROTO_SEARCH_msg() {
        this.setChannelClientId();

        // CA
        if (this.getProtocol() === "ca") {
            const payloadSize = getStringPaddedSize(this.getName());

            const messageHeader = generateCAHeader(
                CA_COMMANDS.CA_PROTO_SEARCH, // 0x06
                payloadSize, // padded size of channel name
                0x05, // DONT_REPLY 
                CA_MINOR_PROTOCOL_REVISION, // version number
                this.getChannelClientID(), // search ID, the channel client ID is used for simplicity
                this.getChannelClientID() // duplicate of search ID
            );
            const messagePayload = Buffer.alloc(payloadSize);
            messagePayload.write(this.getName(), 0);

            return Buffer.concat([messageHeader, messagePayload], CA_MSG_HEADER_SIZE + payloadSize);
        } else {
            // PVA
            return encodeData(
                {
                    typeIndex: typeIndexEnum.complex_scalar_structure,
                    name: "",
                    fields: {
                        searchInstanceID: {
                            typeIndex: typeIndexEnum.integer_scalar_unsignedInt,
                        },
                        channelName: {
                            typeIndex: typeIndexEnum.string_scalar,
                        }
                    },
                },
                {
                    searchInstanceID: this.getChannelClientID(),
                    channelName: this.getName(),
                },
                PVA_ENDIAN, // this is a UDP message, we can select our own endian
            )
        }
    }


    /**
     * Increase the search counter by one each time. 
     * Returns true if the counter is a power of 2, returns false if not.
     * 
     * It is invoked every clock tick of search in UDPTransport.
     */
    public doSearchPV = (): boolean => {
        // must be in SEARCHING state
        if (this.getState() !== Channel_STATES.SEARCHING) {
            return false;
        }

        this.searchCounter++;
        // used for delay search
        if (this.searchCounter < 0) {
            return false;
        }
        if (this.searchCounter <= this.searchCounterMaxP2) {
            return isPowerOfTwo(this.searchCounter);
        } else {
            // each period is searchCounterMax
            const tmp = (this.searchCounter - this.searchCounterMaxP2) % this.searchCounterMax;
            if (tmp === 0) {
                return true;
            } else {
                return false;
            }
        };
    };

    // ------------------------- TCP transport --------------------------------

    /**
     * Create the TCPTransport object if necessary
     * 
     * @throws when the TCP port and address are invalid.
     * 
     */
    createTcpTransport = (): TCPTransport => {
        const serverTcpPort = this.getServerTcpPort();
        const serverAddress = this.getServerAddress();
        if (serverTcpPort === -1 || serverAddress === "") {
            throw new Error(`Failed to create TCPTransoport for channel ${this.getName()}. The TCP port and address are invalid`);
        }

        const serverSchedulingPriority = this.serverSchedulingPriority;
        const tcpTransportKey = `${serverAddress}:${serverTcpPort}:${serverSchedulingPriority}`;

        let tcpTransport = this.getContext().getTCPTransport(tcpTransportKey);
        if (tcpTransport === undefined) {
            GlobalMethods.debugLog(`TCPTransport ${tcpTransportKey} does not exist, creating it for ${this.name}`);
            tcpTransport = new TCPTransport(this.getContext(), serverTcpPort, serverAddress, serverSchedulingPriority, this.getProtocol());
        }
        // in case there are multiple TcpTransport.initialize() are invoked at the same time
        // timeout is set in TcpTransport.initialize()
        return tcpTransport;
    }


    /**
     * Send out CA_PROTO_CREATE_CHAN and wait for the reply.
     * 
     * The rejectAndReplaceExisting bit in Promises.append() is set to false. It means
     *    if this function is not resolved yet, and it is invoked again,
     *    then all the invocations will be blocked until we receive a first CA_PROTO_CREATE_CHAN reply
     *    the latter replies of CA_PROTO_CREATE_CHAN are ignored
     * 
     * @throws if the Promise is rejected. The exception should be catched in upper level.
     */
    sendAndWait_CA_PVA_PROTO_CREATE_CHAN = async () => {
        // only allow a resolved but not created channel to run this function
        if (this.getState() !== Channel_STATES.RESOLVED) {
            GlobalMethods.debugLog("The channel state must be RESOLVED to create a channel");
            return;
        }

        if (this.getProtocol() === "ca") {

            this.getPromises().append("CA_PROTO_CREATE_CHAN", false);
            this.send_CA_PROTO_CREATE_CHAN();
            await this.getPromiseObj("CA_PROTO_CREATE_CHAN");
            this.setState(Channel_STATES.CREATED);

            if (this.getServerCaMinorVersion() <= 11) {
                const tcpTransport = this.getTcpTransport();
                const promiseObj = tcpTransport?.getPromises().get("CA_PROTO_VERSION");
                await promiseObj;
            }
        } else {
            this.getPromises().append("PVA_PROTO_CREATE_CHANNEL", false);
            const promiseObj = this.getPromiseObj("PVA_PROTO_CREATE_CHANNEL");

            this.send_PVA_PROTO_CREATE_CHANNEL();

            await promiseObj;

            this.setState(Channel_STATES.CREATED);
        }
    }

    // ----------------- senders -----------------------

    /**
     * For all send_PVA_*
     * 
     * @throws when the (1) encodeData()/encodeType() fails; (2) failed to get endian, or (3) send fails.
     */

    send_PVA_PROTO_DESTROY_REQUEST = (ioID: number) => {

        const type = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "destroyRequest",
            fields: {
                serverChannelID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                requestID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
            }
        };
        const data = {
            serverChannelID: this.getChannelServerID(),
            requestID: ioID,
        }

        const endian = this.getEndian(undefined, "encoding");

        const payloadBuffer = encodeData(type, data, endian);

        const headerBuffer = generatePvaHeader(0x0f, PVA_MESSAGE_TYPE.APPLICATION, PVA_MESSAGE_SEGMENT_TYPE.NOT_SEGMENT, endian);
        setPayloadSizeInPvaHeader(headerBuffer, payloadBuffer.length, endian);
        this.getTcpTransport()?.send(Buffer.concat([headerBuffer, payloadBuffer]));
    }

    send_PVA_PROTO_CANCEL_REQUEST = (ioID: number) => {
        const type = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "cancelRequest",
            fields: {
                serverChannelID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                requestID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
            }
        };
        const data = {
            serverChannelID: this.getChannelServerID(),
            requestID: ioID,
        }

        const endian = this.getEndian(undefined, "encoding");

        const payloadBuffer = encodeData(type, data, endian);

        const headerBuffer = generatePvaHeader(0x15, PVA_MESSAGE_TYPE.APPLICATION, PVA_MESSAGE_SEGMENT_TYPE.NOT_SEGMENT, endian);
        setPayloadSizeInPvaHeader(headerBuffer, payloadBuffer.length, endian);
        this.getTcpTransport()?.send(Buffer.concat([headerBuffer, payloadBuffer]));

    }

    send_PVA_PROTO_CHANNEL_PROCESS_INIT = (ioID: number) => {
        const type = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelProcessREquestInit",
            fields: {
                serverChannelID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                requestID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                subcommand: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
            }
        };
        const data = {
            serverChannelID: this.getChannelServerID(),
            requestID: ioID,
            subcommand: 0x08,
        }

        const pvRequestType = {
            typeIndex: typeIndexEnum.complex_scalar_variantUnion,
        }

        const pvRequestData = {
            type: {
                typeIndex: typeIndexEnum.complex_scalar_structure,
                name: "",
                fields: {}
            },
            value: {}
        }


        const endian = this.getEndian(undefined, "encoding");

        const payloadBuffer = encodeData(type, data, endian);
        const pvRequestBuffer = encodeData(pvRequestType, pvRequestData, endian);

        const headerBuffer = generatePvaHeader(0x10, PVA_MESSAGE_TYPE.APPLICATION, PVA_MESSAGE_SEGMENT_TYPE.NOT_SEGMENT, endian);
        setPayloadSizeInPvaHeader(headerBuffer, payloadBuffer.length + pvRequestBuffer.length, endian);
        this.getTcpTransport()?.send(Buffer.concat([headerBuffer, payloadBuffer, pvRequestBuffer]));

    }

    /**
     * @throws when the encodeData()/encodeType() fails or the send fails.
     */
    send_PVA_PROTO_CHANNEL_RPC_INIT = (ioID: number) => {
        const type = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelRPCRequestInit",
            fields: {
                serverChannelID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                requestID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                subcommand: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
            }
        };

        const data = {
            serverChannelID: this.getChannelServerID(),
            requestID: ioID,
            subcommand: 0x08,
        }

        const endian = this.getEndian(undefined, "encoding");

        const payloadBuffer = encodeData(type, data, endian);

        const pvRquestTypeAndValue = PvRequest.decodePvRequest("field()", endian);
        const pvRequestType = pvRquestTypeAndValue["type"]["fields"]["field"];
        const pvRequestValue = pvRquestTypeAndValue["value"]["field"];
        console.log("pvRequestValue ==========", pvRequestType, pvRequestValue)
        const pvRequestBuffer = encodeData(
            { typeIndex: typeIndexEnum.complex_scalar_variantUnion },
            { type: pvRequestType, value: pvRequestValue },
            endian
        );


        const headerBuffer = generatePvaHeader(0x14, PVA_MESSAGE_TYPE.APPLICATION, PVA_MESSAGE_SEGMENT_TYPE.NOT_SEGMENT, endian);
        setPayloadSizeInPvaHeader(headerBuffer, payloadBuffer.length + pvRequestBuffer.length, endian);
        this.getTcpTransport()?.send(Buffer.concat([headerBuffer, payloadBuffer, pvRequestBuffer]));

    }

    send_PVA_PROTO_CHANNEL_RPC = (ioID: number, pvRequest: string) => {
        const type = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelRPCRequestInit",
            fields: {
                serverChannelID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                requestID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                subcommand: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
            }
        };

        const data = {
            serverChannelID: this.getChannelServerID(),
            requestID: ioID,
            subcommand: 0x00,
        }


        const endian = this.getEndian(undefined, "encoding");

        const payloadBuffer = encodeData(type, data, endian);

        // pv request
        if ((!(pvRequest.replace(/\s+/g, "").startsWith("record["))) && (!(pvRequest.replace(/\s+/g, "").startsWith("[")))) {
            pvRequest = "record[" + pvRequest + "]";
        }

        const pvRquestTypeAndValue = PvRequest.decodePvRequest(pvRequest, endian);
        // any error will cause throwing an exception
        const pvRequestType = pvRquestTypeAndValue["type"]["fields"]["record"]["fields"]["_options"];
        const pvRequestValue = pvRquestTypeAndValue["value"]["record"]["_options"];
        const pvRequestBuffer = encodeData(
            { typeIndex: typeIndexEnum.complex_scalar_variantUnion },
            { type: pvRequestType, value: pvRequestValue },
            endian
        );

        const headerBuffer = generatePvaHeader(0x14, PVA_MESSAGE_TYPE.APPLICATION, PVA_MESSAGE_SEGMENT_TYPE.NOT_SEGMENT, endian);
        setPayloadSizeInPvaHeader(headerBuffer, payloadBuffer.length + pvRequestBuffer.length, endian);
        this.getTcpTransport()?.send(Buffer.concat([headerBuffer, payloadBuffer, pvRequestBuffer]));

    }

    send_PVA_PROTO_GET_INTROSPECTION_TYPE = (ioID: number, fieldName: string) => {
        const type = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelProcessREquestInit",
            fields: {
                serverChannelID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                requestID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                subFieldName: { typeIndex: typeIndexEnum.string_scalar },
            }
        };
        const data = {
            serverChannelID: this.getChannelServerID(),
            requestID: ioID,
            subFieldName: fieldName, // empty string means get all fields
        }

        const endian = this.getEndian(undefined, "encoding");

        const payloadBuffer = encodeData(type, data, endian);

        const headerBuffer = generatePvaHeader(0x11, PVA_MESSAGE_TYPE.APPLICATION, PVA_MESSAGE_SEGMENT_TYPE.NOT_SEGMENT, endian);
        setPayloadSizeInPvaHeader(headerBuffer, payloadBuffer.length, endian);
        this.getTcpTransport()?.send(Buffer.concat([headerBuffer, payloadBuffer]));

    }

    send_PVA_PROTO_CHANNEL_PROCESS = (ioID: number) => {
        const type = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelProcessREquestInit",
            fields: {
                serverChannelID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                requestID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                subcommand: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
            }
        };
        const data = {
            serverChannelID: this.getChannelServerID(),
            requestID: ioID,
            subcommand: 0x00,
        }


        const endian = this.getEndian(undefined, "encoding");

        const payloadBuffer = encodeData(type, data, endian);

        const headerBuffer = generatePvaHeader(0x10, PVA_MESSAGE_TYPE.APPLICATION, PVA_MESSAGE_SEGMENT_TYPE.NOT_SEGMENT, endian);
        setPayloadSizeInPvaHeader(headerBuffer, payloadBuffer.length, endian);
        this.getTcpTransport()?.send(Buffer.concat([headerBuffer, payloadBuffer]));

    }

    /**
     * The reply is PVA_PROTO_CHANNEL_PUT (0x0b) with subcommand 0x08
     */
    send_PVA_PROTO_CHANNEL_PUT_INIT = (ioID: number, pvRequest: string) => {
        // before the pvRequestIF
        const type = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelGetRequest",
            fields: {
                serverChannelID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                requestID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                subcommand: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
            }
        }

        const data = {
            serverChannelID: this.getChannelServerID(),
            requestID: ioID,
            subcommand: 0x08,
        }


        const endian = this.getEndian(undefined, "encoding");

        const payloadBuffer = encodeData(type, data, endian);
        const pvRequestBuffer = PvRequest.encodePvRequest(pvRequest, endian);

        const headerBuffer = generatePvaHeader(0x0b, PVA_MESSAGE_TYPE.APPLICATION, PVA_MESSAGE_SEGMENT_TYPE.NOT_SEGMENT, endian);
        setPayloadSizeInPvaHeader(headerBuffer, payloadBuffer.length + pvRequestBuffer.length, endian);
        this.getTcpTransport()?.send(Buffer.concat([headerBuffer, payloadBuffer, pvRequestBuffer]));
    }


    /**
     * The reply is PVA_PROTO_CHANNEL_PUT (0x0b) with subcommand 0x00
     */
    send_PVA_PROTO_CHANNEL_PUT = (ioID: number, newValues: any[], pvRequest: string) => {
        // before the pvRequestIF
        const type = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelPutRequest",
            fields: {
                serverChannelID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                requestID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                subcommand: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
            }
        }

        const data = {
            serverChannelID: this.getChannelServerID(),
            requestID: ioID,
            subcommand: 0x00,
        }

        const endian = this.getEndian(undefined, "encoding");

        // payload buffer
        const payloadBuffer = encodeData(type, data, endian);

        // data buffer: bitsets and the pv request struct with values assigned
        const dataBuffer = PvRequest.encodePvRequestDataWithValue(pvRequest, this.getPvaType(), newValues, endian);

        const headerBuffer = generatePvaHeader(0x0b, PVA_MESSAGE_TYPE.APPLICATION, PVA_MESSAGE_SEGMENT_TYPE.NOT_SEGMENT, endian);
        setPayloadSizeInPvaHeader(headerBuffer, payloadBuffer.length + dataBuffer.length, endian);

        this.getTcpTransport()?.send(Buffer.concat([headerBuffer, payloadBuffer, dataBuffer]));

    }
    send_PVA_PROTO_CHANNEL_PUT_GET = (ioID: number, newValues: any[], pvRequest: string) => {
        // before the pvRequestIF
        const type = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelPutRequest",
            fields: {
                serverChannelID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                requestID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                subcommand: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
            }
        }

        const data = {
            serverChannelID: this.getChannelServerID(),
            requestID: ioID,
            subcommand: 0x00,
        }

        const endian = this.getEndian(undefined, "encoding");

        // payload buffer
        const payloadBuffer = encodeData(type, data, endian);

        // data buffer: bitsets and the pv request struct with values assigned
        const dataBuffer = PvRequest.encodePvRequestDataWithValue(pvRequest, this.getPvaType(), newValues, endian);

        const headerBuffer = generatePvaHeader(0x0c, PVA_MESSAGE_TYPE.APPLICATION, PVA_MESSAGE_SEGMENT_TYPE.NOT_SEGMENT, endian);
        setPayloadSizeInPvaHeader(headerBuffer, payloadBuffer.length + dataBuffer.length, endian);

        this.getTcpTransport()?.send(Buffer.concat([headerBuffer, payloadBuffer, dataBuffer]));

    }


    send_PVA_PROTO_DESTROY_CHANNEL = () => {
        // before the pvRequestIF
        const type = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelGetRequest",
            fields: {
                clientChannelID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                serverChannelID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
            }
        }

        const data = {
            clientChannelID: this.getChannelClientID(),
            serverChannelID: this.getChannelServerID(),
        }

        const endian = this.getEndian(undefined, "encoding");

        const payloadBuffer = encodeData(type, data, endian,);

        const headerBuffer = generatePvaHeader(0x08, PVA_MESSAGE_TYPE.APPLICATION, PVA_MESSAGE_SEGMENT_TYPE.NOT_SEGMENT, endian);
        setPayloadSizeInPvaHeader(headerBuffer, payloadBuffer.length, endian);

        this.getTcpTransport()?.send(Buffer.concat([headerBuffer, payloadBuffer]));
    }

    /**
     * 0x0C, with INIT subcommand
     */

    send_PVA_PROTO_CHANNEL_PUT_GET_INIT = (ioID: number, pvRequest: string) => {
        // before the pvRequestIF
        const type = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelPutGetRequest",
            fields: {
                serverChannelID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                requestID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                subcommand: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
            }
        }

        const data = {
            serverChannelID: this.getChannelServerID(),
            requestID: ioID,
            subcommand: 0x08,
        }


        const endian = this.getEndian(undefined, "encoding");

        const payloadBuffer = encodeData(type, data, endian);
        const pvRequestBuffer = PvRequest.encodePvRequest(pvRequest, endian);

        const headerBuffer = generatePvaHeader(0x0c, PVA_MESSAGE_TYPE.APPLICATION, PVA_MESSAGE_SEGMENT_TYPE.NOT_SEGMENT, endian);
        setPayloadSizeInPvaHeader(headerBuffer, payloadBuffer.length + pvRequestBuffer.length, endian);
        this.getTcpTransport()?.send(Buffer.concat([headerBuffer, payloadBuffer, pvRequestBuffer]));
    }


    /**
     * The reply is PVA_PROTO_CHANNEL_PUT (0x0b) with subcommand 0x40
     * 
     * it retrieves the data last time this client PUT the value
     * 
     * the obtained data should be decoded with this.getPvaPUTDataStructureType()
     */
    send_PVA_PROTO_CHANNEL_GET_PUT = (ioID: number) => {
        // before the pvRequestIF
        const type = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelGetPutRequest",
            fields: {
                serverChannelID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                requestID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                subcommand: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
            }
        }

        const data = {
            serverChannelID: this.getChannelServerID(),
            requestID: ioID,
            subcommand: 0x40,
        }

        const endian = this.getEndian(undefined, "encoding");

        // fixed payload buffer
        const payloadBuffer = encodeData(type, data, endian);

        const headerBuffer = generatePvaHeader(0x0b, PVA_MESSAGE_TYPE.APPLICATION, PVA_MESSAGE_SEGMENT_TYPE.NOT_SEGMENT, endian);
        setPayloadSizeInPvaHeader(headerBuffer, payloadBuffer.length, endian);

        this.getTcpTransport()?.send(Buffer.concat([headerBuffer, payloadBuffer]));
    }


    /**
     * ! the IOC does not respond the message
     */
    send_PVA_PROTO_CHANNEL_GET_GET = (ioID: number) => {
        // before the pvRequestIF
        const type = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelGetGetRequest",
            fields: {
                serverChannelID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                requestID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                subcommand: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
            }
        }

        const data = {
            serverChannelID: this.getChannelServerID(),
            requestID: ioID,
            subcommand: 0x40, // 0x80 is for GET_PUT, but none of them works
        }

        const endian = this.getEndian(undefined, "encoding");

        // fixed payload buffer
        const payloadBuffer = encodeData(type, data, endian);

        const headerBuffer = generatePvaHeader(0x0c, PVA_MESSAGE_TYPE.APPLICATION, PVA_MESSAGE_SEGMENT_TYPE.NOT_SEGMENT, endian);
        setPayloadSizeInPvaHeader(headerBuffer, payloadBuffer.length, endian);

        this.getTcpTransport()?.send(Buffer.concat([headerBuffer, payloadBuffer]));
    }

    send_PVA_PROTO_CHANNEL_GET = (ioID: number) => {
        const type = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelGetRequest",
            fields: {
                serverChannelID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                requestID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                subcommand: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
            }
        }

        const data = {
            serverChannelID: this.getChannelServerID(),
            requestID: ioID,
            subcommand: 0x40,
        }

        const endian = this.getEndian(undefined, "encoding");

        const payloadBuffer = encodeData(type, data, endian);
        const headerBuffer = generatePvaHeader(0x0a, PVA_MESSAGE_TYPE.APPLICATION, PVA_MESSAGE_SEGMENT_TYPE.NOT_SEGMENT, endian);
        setPayloadSizeInPvaHeader(headerBuffer, payloadBuffer.length, endian);
        this.getTcpTransport()?.send(Buffer.concat([headerBuffer, payloadBuffer]));
    }

    send_PVA_PROTO_CHANNEL_ARRAY = (ioID: number, offset: number, count: number) => {
        const type = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelGetArrayRequest",
            fields: {
                serverChannelID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                requestID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                subcommand: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
            }
        }

        const data = {
            serverChannelID: this.getChannelServerID(),
            requestID: ioID,
            subcommand: 0x40,
        }

        const endian = this.getEndian(undefined, "encoding");

        const payloadBuffer = encodeData(type, data, endian);

        const offsetSizeBuffer = createSizeBuffer(offset, endian, SIZE_TYPE.size);
        const countSizeBuffer = createSizeBuffer(count, endian, SIZE_TYPE.size);

        const headerBuffer = generatePvaHeader(0x0e, PVA_MESSAGE_TYPE.APPLICATION, PVA_MESSAGE_SEGMENT_TYPE.NOT_SEGMENT, endian);
        setPayloadSizeInPvaHeader(headerBuffer, payloadBuffer.length + offsetSizeBuffer.length + countSizeBuffer.length, endian);
        this.getTcpTransport()?.send(Buffer.concat([headerBuffer, payloadBuffer, offsetSizeBuffer, countSizeBuffer]));
    }

    send_PVA_PROTO_CHANNEL_ARRAY_INIT = (ioID: number, pvRequestType: Record<string, any>, pvRequestValue: Record<string, any>) => {
        const type = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelArrayRequestInit",
            fields: {
                serverChannelID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                requestID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                subcommand: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
                pvRequestTypeAndData: { typeIndex: typeIndexEnum.complex_scalar_variantUnion },
            }
        }

        const data = {
            serverChannelID: this.getChannelServerID(),
            requestID: ioID,
            subcommand: 0x08,
            pvRequestTypeAndData: {
                type: pvRequestType,
                value: pvRequestValue,
            },
        }

        const endian = this.getEndian(undefined, "encoding");

        const payloadBuffer = encodeData(type, data, endian);
        const headerBuffer = generatePvaHeader(0x0e, PVA_MESSAGE_TYPE.APPLICATION, PVA_MESSAGE_SEGMENT_TYPE.NOT_SEGMENT, endian);
        setPayloadSizeInPvaHeader(headerBuffer, payloadBuffer.length, endian);
        this.getTcpTransport()?.send(Buffer.concat([headerBuffer, payloadBuffer]));
    }


    send_PVA_PROTO_CHANNEL_GET_INIT = (ioID: number, pvRequest: string) => {
        const type = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "channelGetRequestInit",
            fields: {
                serverChannelID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                requestID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                subcommand: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
                // pvRequest is here
            }
        }

        const data = {
            serverChannelID: this.getChannelServerID(),
            requestID: ioID,
            subcommand: 0x08,
            // pvRequest is here
        }

        const endian = this.getEndian(undefined, "encoding");

        const payloadBuffer = encodeData(type, data, endian);
        const headerBuffer = generatePvaHeader(0x0a, PVA_MESSAGE_TYPE.APPLICATION, PVA_MESSAGE_SEGMENT_TYPE.NOT_SEGMENT, endian);
        const pvRequestBuffer = PvRequest.encodePvRequest(pvRequest, endian);

        setPayloadSizeInPvaHeader(headerBuffer, payloadBuffer.length + pvRequestBuffer.length, endian);
        this.getTcpTransport()?.send(Buffer.concat([headerBuffer, payloadBuffer, pvRequestBuffer]));
    }

    send_PVA_PROTO_CREATE_CHANNEL = () => {
        const type = {
            typeIndex: typeIndexEnum.complex_scalar_structure,
            name: "createChannelRequest",
            fields: {
                channels: {
                    typeIndex: typeIndexEnum.complex_variableSizeArray_structure,
                    name: "channels",
                    sizeType: SIZE_TYPE.unsigned_short,
                    fields: {
                        clientChannelID: { typeIndex: typeIndexEnum.integer_scalar_unsignedInt },
                        channelName: { typeIndex: typeIndexEnum.string_scalar },
                    }
                },
            }
        }

        const data = {
            channels: [{
                clientChannelID: this.getChannelClientID(),
                channelName: this.getName(),
            }]
        };

        const endian = this.getEndian(undefined, "encoding");

        const bufferPayload = encodeData(type, data, endian);
        const bufferHeader = generatePvaHeader(PVA_COMMANDS.PVA_PROTO_CREATE_CHANNEL, PVA_MESSAGE_TYPE.APPLICATION, PVA_MESSAGE_SEGMENT_TYPE.NOT_SEGMENT, endian);
        setPayloadSizeInPvaHeader(bufferHeader, bufferPayload.length, endian);
        this.getTcpTransport()?.send(Buffer.concat([bufferHeader, bufferPayload]));
    }

    /**
     * For old CA protocol, the CA_PROTO_CREATE_CHAN is sent together with the first few
     * messages of the TCPTransport if there is no channel created on this TCP transport yet.
     */
    private send_CA_PROTO_CREATE_CHAN = () => {
        const payloadSize = getStringPaddedSize(this.getName());

        let bufferHeader = generateCAHeader(
            CA_COMMANDS.CA_PROTO_CREATE_CHAN, // command, 0x12
            payloadSize, //
            0x00, // reserved
            0x00, // reserved
            this.getChannelClientID(), // channel ID
            CA_MINOR_PROTOCOL_REVISION,
        ); // 0x0d

        const bufferPayload = Buffer.alloc(payloadSize);
        bufferPayload.write(this.name, 0);

        const buffer = Buffer.concat([bufferHeader, bufferPayload]);

        this.getTcpTransport()?.send(buffer);
    };

    private send_CA_PROTO_READ_NOTIFY = (
        dbrType: Channel_DBR_TYPES,
        valueCount: number,
        ioID: number,
    ) => {

        let buffer = generateCAHeader(
            CA_COMMANDS.CA_PROTO_READ_NOTIFY, // 0x0f
            0, // payload size, must be 0
            dbrType, // desired DBR type
            valueCount, // desired number of elements
            this.getChannelServerID(), // server's channel ID
            ioID
        ); // ioID

        this.getTcpTransport()?.send(buffer);
    };

    private send_CA_PROTO_CLEAR_CHANNEL = () => {
        let buffer = generateCAHeader(
            CA_COMMANDS.CA_PROTO_CLEAR_CHANNEL, // 0x0c
            0, // reserved
            0, // reserved
            0, // reserved
            this.getChannelServerID(), // server's channel ID
            this.getChannelClientID()
        );

        this.getTcpTransport()?.send(buffer);
    };


    /**
     * Generate and send out the CA_PROTO_WRITE message.
     * 
     * @throws when the DBR.encodeBuffer() fails
     */
    private send_CA_PROTO_WRITE = (newValue: type_dbr_value, ioID: number) => {
        let newValueCount = 1;
        if (Array.isArray(newValue)) {
            newValueCount = newValue.length;
        }

        // it always sends out in base DBR type
        let bufferPayload: Buffer = Dbr.encodeBuffer(newValue, this.getDbrType());

        const payloadSize = bufferPayload.length;

        const bufferHeader = generateCAHeader(
            CA_COMMANDS.CA_PROTO_WRITE, // 0x04
            payloadSize, // payload size,
            this.getDbrType(), // raw DBR type
            newValueCount, // desired number of elements
            this.getChannelServerID(), // server's channel ID
            ioID
        );

        const buffer = Buffer.concat([bufferHeader, bufferPayload]);

        this.getTcpTransport()?.send(buffer);
    };

    /**
     * Generate and send out the CA_PROTO_WRITE_NOTIFY message.
     * 
     * @throws when the DBR.encodeBuffer() fails
     */
    private send_CA_PROTO_WRITE_NOTIFY = (
        newValue: type_dbr_value,
        ioID: number,
    ) => {

        let newValueCount = 1;
        if (typeof newValue !== "number" && typeof newValue !== "string") {
            newValueCount = newValue.length;
        }
        if (newValueCount > this.getValueCount()) {
            throw new Error(`Value count [${newValueCount}] larger than channel's native value count [${this.getValueCount()}]`);
        }

        const baseDbrType = this.getDbrType();

        // no matter what the user's input value's type, always encode to the base DBR type of this channel
        let bufferPayload: Buffer = Dbr.encodeBuffer(newValue, baseDbrType);
        const payloadSize = bufferPayload.length;

        const bufferHeader = generateCAHeader(
            CA_COMMANDS.CA_PROTO_WRITE_NOTIFY, // 0x0f
            payloadSize, // payload size,
            baseDbrType, // raw DBR type
            newValueCount, // desired number of elements
            this.getChannelServerID(), // server's channel ID
            ioID
        ); // ioID
        const buffer = Buffer.concat([bufferHeader, bufferPayload]);
        this.getTcpTransport()?.send(buffer);
    };



    // ------------------------------- monitor --------------------------

    /**
     * Create and subscribe a channel monitor. 
     * 
     * Resolves when the IOC returns a CA_PROTO_EVENT_ADD reply with the current channel value.
     * 
     * If the "resubscribe" bit is true, re-subscribe the provided ChannelMonitor.
     * 
     * (1) obtain an automatically generated subscription ID
     *     this ID is unique for each TCPTransoport
     *     skip this step if we re-subscribe the ChannelMonitor
     * 
     * (2) create the ChannelMonitor object
     *     no subscription made yet
     *     skip this step if we re-subscribe the ChannelMonitor
     * 
     * (3) add the ChannelMonitor object to list Channel.monitors
     *     skip this step if we re-subscribe the ChannelMonitor
     * 
     * (4) add the ChannelMonitor object to list TCPTransoport.monitors
     * 
     * (5) set monitor state to ChannelMonitor_STATES.SUBSCRIBING
     * 
     * (6) send out CA_PROTO_EVENT_ADD message to IOC
     * 
     * (7) wait for the reply of CA_PROTO_EVENT_ADD
     *     the reply payload contains the value and other data for this channel, the repl
     *     Buffer is decoded and processed at the handler function for CA_PROTO_EVENT_ADD message
     *     in TCPTransoport
     * 
     * (8) set state to ChannelMonitor_STATES.SUBSCRIBED upon success, or to ChannelMonitor_STATES.FAILED upon failure
     * 
     * @param {((monitor: ChannelMonitor) => void) | undefined} listener Whenever there is a new data arrival, call this listener
     * 
     * 
     * @param {boolean} resubscribe If true, we are re-subscribing the ChannelMonitor, all the previous input
     *                              arguments are ignored. We must provide the "resubscribingMonitor"
     * 
     * @param {ChannelMonitor} resubscribingMonitor The channel monitor that is being re-subscribed.
     * 
     * @param {Channel_DBR_TYPES} dbrType The desired DBR type that this monitor wants to get
     *                                    Default value is Channel.getDbrType_TIME(), which should have been known when we create the channel
     *                                    (we don't need to use GET to obtain the channel's DBR type)
     *                                    PVA channel will ignore this
     * 
     * @param {number} valueCount The desired number of values the channel monitor wants to get
     *                            PVA channel will ignore this
     * 
     * @param {ChannelMonitor_MASKS} mask Mask for monitor update
     *                                    PVA channel will ignore this
     * 
     */


    createMonitor = async (
        subscribeTimeout: number | undefined = undefined,
        listener: ((monitor: ChannelMonitor) => void) | undefined = undefined,
        dbrType: Channel_DBR_TYPES = this.getDbrType_TIME(),
        valueCount: number = this.getValueCount(),
        mask: ChannelMonitor_MASKS = ChannelMonitor_MASKS.DBE_VALUE | ChannelMonitor_MASKS.DBE_ALARM,
        resubscribe: boolean = false,
        resubscribingMonitor: ChannelMonitor | undefined = undefined,
    ): Promise<ChannelMonitor | undefined> => {

        if (this.getProtocol() === "pva") {
            return undefined;
        }

        if (this.getState() !== Channel_STATES.CREATED) {
            GlobalMethods.debugLog(`${this.name}'s connection state is ${this.getStateStr()}, cannot monitor.`);
            return undefined;
        }

        if (dbrType === Channel_DBR_TYPES.NOT_AVAILABLE && resubscribe === false) {
            GlobalMethods.debugLog(`Cannot monitor ${this.getName()}: the desired DBR type is NOT_AVAILABLE`);
            return undefined;
        }

        const tcpTransport = this.getTcpTransport();
        if (tcpTransport === undefined) {
            GlobalMethods.debugLog(`No TCPTransport for channel ${this.getName()}, stop creating monitor`);
            return undefined;
        }

        let monitor: ChannelMonitor | undefined = resubscribingMonitor;
        if (resubscribe) {
            if (monitor === undefined) {
                GlobalMethods.debugLog(`Failed to resubscribe monitor for ${this.getName()}, the ChannelMonitor object does not exist`);
                return undefined;
            }
        } else {
            // (1)
            const subscriptionId = tcpTransport.obtainMonitorSubscriptionId();
            GlobalMethods.debugLog(`Creating a monitor for ${this.name} with subscription ID ${subscriptionId}`);

            // (2)
            monitor = new ChannelMonitor(this, subscribeTimeout, subscriptionId, dbrType, "", valueCount, listener, mask);

            // (3)
            this.addMonitor(monitor);
        }

        // (4)
        tcpTransport.addMonitor(monitor);

        // (5)
        monitor.setState(ChannelMonitor_STATES.SUBSCRIBING);

        try {
            // define the Promise as early as possible
            // if there are more than one CA_PROTO_EVENT_ADD promise added, the latter resolved ones are ignored.
            monitor.getPromises().append("CA_PROTO_EVENT_ADD", false, subscribeTimeout);
            const promiseObj = monitor.getPromises().get("CA_PROTO_EVENT_ADD")

            // (6)
            monitor.send_CA_PROTO_EVENT_ADD();

            // (7)
            await promiseObj;

            // (8)
            monitor.setState(ChannelMonitor_STATES.SUBSCRIBED);

        } catch (e) {
            // (8)
            monitor.setState(ChannelMonitor_STATES.FAILED);
            GlobalMethods.debugLog(`Subscribing channel monitor ${this.getName()} failed.`)
            GlobalMethods.debugLog(e);
        }

        return monitor;
    };


    /**
     * Create and subscribe a PVA channel monitor. 
     * 
     * If the "resubscribe" bit is true, re-subscribe the provided ChannelMonitor.
     * 
     * (1) obtain an automatically generated subscription ID
     *     this ID is unique for each TCPTransoport
     *     skip this step if we re-subscribe the ChannelMonitor
     * 
     * (2) create the ChannelMonitor object
     *     no subscription made yet
     *     skip this step if we re-subscribe the ChannelMonitor
     *     for PVA monitor, skip the dbrtype and data count
     * 
     * (3) add the ChannelMonitor object to list Channel.monitors
     *     skip this step if we re-subscribe the ChannelMonitor
     * 
     * (4) add the ChannelMonitor object to list TCPTransoport.monitors
     * 
     * (5) set monitor state to ChannelMonitor_STATES.SUBSCRIBING
     * 
     * (6) send out PVA_PROTO_CHANNEL_MONITOR_INIT message to IOC to ask for data type
     * 
     * (7) wait for the reply of PVA_PROTO_CHANNEL_MONITOR_INIT message
     *     the monitor data type is returned here
     * 
     * (7) set the obtained PVA data type to ChannelMonitor object
     * 
     * (8) send out PVA_PROTO_CHANNEL_MONITOR to start monitoring
     * 
     * (9) wait for the first PVA_PROTO_CHANNEL_MONITOR reply from server
     * 
     * (10) set state to ChannelMonitor_STATES.SUBSCRIBED upon success, or to ChannelMonitor_STATES.FAILED upon failure
     * 
     * (11) if there is anything wrong, i.e. Promise rejcted or any exception thrown, set monitor status to ChannelMonitor_STATES.FAILED
     * 
     * @param {((monitor: ChannelMonitor) => void) | undefined} listener Whenever there is a new data arrival, call this listener
     * 
     * @param {Channel_DBR_TYPES} dbrType The desired DBR type that this monitor wants to get
     *                                    Default value is Channel.getDbrType_TIME(), which should have been known when we create the channel
     *                                    (we don't need to use GET to obtain the channel's DBR type)
     * 
     * @param {number} valueCount The desired number of values the channel monitor wants to get
     * 
     * @param {ChannelMonitor_MASKS} mask Mask for monitor update
     * 
     * @param {boolean} resubscribe If true, we are re-subscribing the ChannelMonitor, all the previous input
     *                              arguments are ignored. We must provide the "resubscribingMonitor"
     * 
     * @param {ChannelMonitor} resubscribingMonitor The channel monitor that is being re-subscribed.
     * 
     */
    createMonitorPva = async (
        subscribeTimeout: number | undefined = undefined,
        pvRequest: string = "",
        listener: ((monitor: ChannelMonitor) => void) | undefined = undefined,
        resubscribe: boolean = false,
        resubscribingMonitor: ChannelMonitor | undefined = undefined,
    ): Promise<ChannelMonitor | undefined> => {

        if (this.getProtocol() === "ca") {
            return undefined;
        }

        if (this.getState() !== Channel_STATES.CREATED) {
            GlobalMethods.debugLog(`${this.name}'s connection state is ${this.getStateStr()}, cannot monitor.`);
            return undefined;
        }

        const tcpTransport = this.getTcpTransport();
        if (tcpTransport === undefined) {
            GlobalMethods.debugLog(`No TCPTransport for channel ${this.getName()}, stop creating monitor`);
            return undefined;
        }

        let monitor: ChannelMonitor | undefined = resubscribingMonitor;
        if (resubscribe) {
            if (monitor === undefined) {
                GlobalMethods.debugLog(`Failed to resubscribe monitor for ${this.getName()}, the ChannelMonitor object does not exist`);
                return undefined;
            }
        } else {
            // (1)
            const subscriptionId = tcpTransport.obtainMonitorSubscriptionId();
            GlobalMethods.debugLog(`Creating a monitor for ${this.name} with subscription ID ${subscriptionId}`);

            // (2)
            monitor = new ChannelMonitor(this, subscribeTimeout, subscriptionId, Channel_DBR_TYPES.NOT_AVAILABLE, pvRequest, -1, listener);

            // (3)
            this.addMonitor(monitor);
        }

        // (4)
        tcpTransport.addMonitor(monitor);

        // (5)
        monitor.setState(ChannelMonitor_STATES.SUBSCRIBING);

        try {
            // define the Promise as early as possible
            // if there are more than one CA_PROTO_EVENT_ADD promise added, the latter resolved ones are ignored.
            monitor.getPromises().append("PVA_PROTO_CHANNEL_MONITOR_INIT", false, subscribeTimeout);
            const promiseObjInit = monitor.getPromises().get("PVA_PROTO_CHANNEL_MONITOR_INIT")

            // (6)
            monitor.send_PVA_PROTO_CHANNEL_MONITOR_INIT(pvRequest);

            // (7)
            const type = await promiseObjInit;

            // (7)
            monitor.setPvaType(type);

            // (8)
            monitor.getPromises().append("PVA_PROTO_CHANNEL_MONITOR", false, subscribeTimeout);
            const promiseObj = monitor.getPromises().get("PVA_PROTO_CHANNEL_MONITOR")
            monitor.send_PVA_PROTO_CHANNEL_MONITOR();

            // (9)
            await promiseObj;

            // (10)
            monitor.setState(ChannelMonitor_STATES.SUBSCRIBED);

        } catch (e) {
            // (11)
            monitor.setState(ChannelMonitor_STATES.FAILED);
            GlobalMethods.debugLog(`Subscribing channel monitor ${this.getName()} failed.`)
            GlobalMethods.debugLog(e);
            return undefined;
        }

        return monitor;
    };

    addMonitor = (newMonitor: ChannelMonitor) => {
        // ensure there is no exisiting monitor
        for (let monitor of this.getMonitors()) {
            if (monitor === newMonitor) {
                GlobalMethods.debugLog(`Channel monitor ${this.name} already exists`);
                return;
            }
        }
        this.getMonitors().push(newMonitor);
    };

    removeMonitor = (toBeRemovedMonitor: ChannelMonitor) => {
        for (let ii = 0; ii < this.getMonitors().length; ii++) {
            const monitor = this.getMonitors()[ii];
            if (monitor === toBeRemovedMonitor) {
                this.getMonitors().splice(ii, 1);
                return;
            }
        }
        GlobalMethods.debugLog(`Channel monitor ${this.name} already exists`);
    };

    // --------------------------- get -------------------------

    /**
     * 
     * GET CA or PVA
     * 
     * @param {number | undefined} ioTimeout The timeout of the GET operation in unit of second. 
     *                                       If undefined, it never times out.
     * 
     * @param {Channel_DBR_TYPES} dbrType The desired DBR type. The PVA channel will ignore this.
     *                                    PVA channel will ignore this
     * @param {number} valueCount The desired number of values to get. The PVA channel will ignore this
     *                            PVA channel will ignore this
     * 
     * @returns {type_dbrData | undefined} type_dbrData contains the value of this channel 
     *                                     and the meta data of the specific requested data type, e.g. time stamp
     *                                     for DBR_TIME, alarm limits for DBR_GR
     *                                     returns undefined if failed to get data
     */

    get = async (
        ioTimeout: number | undefined = undefined, // not this.getEnv("READ_WRITE_IO_DEFAULT_TIMEOUT") as number // 1 second
        dbrType: Channel_DBR_TYPES = this.getDbrType(),
        valueCount: number = this.getValueCount(),
    ): Promise<type_dbrData | undefined> => {
        if (this.getProtocol() === "pva") {
            return undefined;
        }

        if (this.getState() !== Channel_STATES.CREATED) {
            GlobalMethods.debugLog(`${this.name}'s connection state is ${this.getStateStr()}, cannot get()`);
            return undefined;
        }

        if (typeof ioTimeout === "number" && ioTimeout < 0) {
            GlobalMethods.debugLog(`IO timeout is a negative number ${ioTimeout}, set it to 1 second.`);
            ioTimeout = 1;
        }

        if (dbrType < Channel_DBR_TYPES.DBR_STRING && dbrType > Channel_DBR_TYPES.DBR_CTRL_DOUBLE) {
            GlobalMethods.debugLog(`Wrong DBR type ${dbrType}, should be from ${Channel_DBR_TYPES.DBR_STRING} to ${Channel_DBR_TYPES.DBR_CTRL_DOUBLE}`);
            return;
        }

        if (valueCount < 0) {
            valueCount = 0;
        }

        GlobalMethods.debugLog(`Trying to get('${this.name}') from ${this.getTcpTransport()?.getServerAddress()}:${this.getTcpTransport()?.getServerPort()}`);

        try {
            // each such IO is unique, there is no duplicate appendIo(), so the rejectAndReplaceExisting bit is not used
            // the ioTimeout only cancels this operation, it does not destroy this channel
            const ioID = this.getContext().getReadWriteIos().appendIo(this, IO_TYPES.CA_PROTO_READ_NOTIFY, true, ioTimeout);

            this.send_CA_PROTO_READ_NOTIFY(dbrType, valueCount, ioID);

            // lifted after received reply of CA_PROTO_READ_NOTIFY
            const promiseObj = this.getContext().getReadWriteIos().getIoPromise(ioID)
            let message = await promiseObj;

            // extract dbr payload from the above message
            const dbrPayload = Channel.extractDbrPayloadFromReadBuffer(message);

            // decode buffer and update the values and properties in DBR object
            this.getDbr().decodeBuffer(dbrPayload.dbrBuffer, dbrPayload.dbrType, dbrPayload.valueCount);

            // return a deep copy
            return JSON.parse(JSON.stringify(this.getDbrData()));

        } catch (e) {
            GlobalMethods.debugLog(`Channel ${this.name} get() operation interrupted.`);
            GlobalMethods.debugLog(e);
            return undefined;
        }
    };

    getPva = async (
        ioTimeout: number | undefined = undefined,
        pvRequest: string = "",
    ): Promise<type_pva_value | undefined> => {

        if (this.getProtocol() === "ca") {
            return undefined;
        }

        if (this.getState() !== Channel_STATES.CREATED) {
            GlobalMethods.debugLog(`${this.name}'s connection state is ${this.getStateStr()}, cannot get()`);
            return undefined;
        }

        if (typeof ioTimeout === "number" && ioTimeout < 0) {
            GlobalMethods.debugLog(`IO timeout is a negative number ${ioTimeout}, set it to 1 second.`);
            ioTimeout = 1;
        }

        GlobalMethods.debugLog(`Trying to get('${this.name}') from ${this.getTcpTransport()?.getServerAddress()}:${this.getTcpTransport()?.getServerPort()}`);

        try {
            // each such IO is unique, there is no duplicate appendIo(), so the rejectAndReplaceExisting bit is not used
            // the ioTimeout only cancels this operation, it does not destroy this channel
            const ioIDInit = this.getContext().getReadWriteIos().appendIo(this, IO_TYPES.CA_PROTO_READ_NOTIFY, true, ioTimeout);

            // this.send_CA_PROTO_READ_NOTIFY(dbrType, valueCount, ioID);
            this.send_PVA_PROTO_CHANNEL_GET_INIT(ioIDInit, pvRequest);

            // lifted after received reply of CA_PROTO_READ_NOTIFY
            const promiseObjInit = this.getContext().getReadWriteIos().getIoPromise(ioIDInit)
            // this the data type we have requested considering the pv request
            // it will be used to decode the data together with the BitSets
            let requestedStructureType = await promiseObjInit;

            // ioID === ioIDInit
            const ioID = this.getContext().getReadWriteIos().appendIoWithId(this, IO_TYPES.CA_PROTO_READ_NOTIFY, true, ioTimeout, ioIDInit);

            // send PVA_PROTO_CHANNEL_GET
            this.send_PVA_PROTO_CHANNEL_GET(ioID);

            const promiseObj = this.getContext().getReadWriteIos().getIoPromise(ioID)
            const { changedBitSets, message, pvStructureDataOffset, endian } = await promiseObj;
            const reducedPvStructureType = reduceStructTypeWithBitSets(requestedStructureType, changedBitSets, true);
            const pvStructureData = decodeData(reducedPvStructureType, message, pvStructureDataOffset, endian);

            return pvStructureData;

        } catch (e) {
            GlobalMethods.debugLog(`Channel ${this.name} get() operation interrupted.`);
            GlobalMethods.debugLog(e);
            return undefined;
        }
    };

    /**
     * 
     * ! seems like the IOC does not implement the PVA_PROTO_CHANNEL_ARRAY
     * 
     * @param {number} count 0 means from the "offset" to the end of the array
     */
    getPvaArray = async (
        offset: number,
        count: number = 0,
        ioTimeout: number | undefined = undefined,
    ): Promise<type_dbrData | undefined> => {
        if (this.getState() !== Channel_STATES.CREATED) {
            GlobalMethods.debugLog(`${this.name}'s connection state is ${this.getStateStr()}, cannot get()`);
            return undefined;
        }

        if (typeof ioTimeout === "number" && ioTimeout < 0) {
            GlobalMethods.debugLog(`IO timeout is a negative number ${ioTimeout}, set it to 1 second.`);
            ioTimeout = 1;
        }

        GlobalMethods.debugLog(`Trying to get('${this.name}') from ${this.getTcpTransport()?.getServerAddress()}:${this.getTcpTransport()?.getServerPort()}`);

        try {
            // each such IO is unique, there is no duplicate appendIo(), so the rejectAndReplaceExisting bit is not used
            // the ioTimeout only cancels this operation, it does not destroy this channel
            const ioIDInit = this.getContext().getReadWriteIos().appendIo(this, IO_TYPES.CA_PROTO_READ_NOTIFY, true, ioTimeout);

            this.send_PVA_PROTO_CHANNEL_ARRAY_INIT(ioIDInit, { typeIndex: typeIndexEnum.complex_scalar_structure, name: "", fields: {} }, {});

            // lifted after received reply of PVA_PROTO_CHANNEL_ARRAY_INIT
            const promiseObjInit = this.getContext().getReadWriteIos().getIoPromise(ioIDInit)

            // the type of the array, it will be used later
            let pvStructureType = await promiseObjInit;

            // ! is this the data type of this channel??
            // this.setPvaGETDataStructureType(pvStructureType);

            // ioID === ioIDInit
            const ioID = this.getContext().getReadWriteIos().appendIoWithId(this, IO_TYPES.CA_PROTO_READ_NOTIFY, true, ioTimeout, ioIDInit);

            this.send_PVA_PROTO_CHANNEL_ARRAY(ioID, offset, count);

            const promiseObj = this.getContext().getReadWriteIos().getIoPromise(ioID)
            const pvStructureData = await promiseObj;

            // this.setPvaData(pvStructureData);

            // this.getContext().registerGetPvaHistoryChannel(ioID, this);
            // this.setLastGetPvaIoId(ioID);

            return pvStructureData;

        } catch (e) {
            GlobalMethods.debugLog(`Channel ${this.name} get() operation interrupted.`);
            GlobalMethods.debugLog(e);
            return undefined;
        }
    };



    /**
     * Extract DBR payload from buffer for command CA_PROTO_READ_NOTIFY
     * 
     * @throws {Error} when the extraction fails
     */
    static extractDbrPayloadFromReadBuffer = (message: Buffer): {
        dbrType: Channel_DBR_TYPES,
        dbrBuffer: Buffer,
        valueCount: number,
        ioID: number,
    } => {
        let HEADER_OFFSETS = CA_MSG_HEADER_OFFSETS;
        let HEADER_SIZE = CA_MSG_HEADER_SIZE;
        if (isExtendedMessageHeader(message, 0)) {
            HEADER_OFFSETS = CA_EXT_MSG_HEADER_OFFSETS;
            HEADER_SIZE = CA_EXT_MSG_HEADER_SIZE;
        }
        // Buffer.readUIntXXX() does not return NaN
        const dbrType = message.readUInt16BE(HEADER_OFFSETS.dataType);
        let payloadSize = message.readUInt16BE(HEADER_OFFSETS.payloadSize);
        const valueCount = message.readUInt16BE(HEADER_OFFSETS.dataCount);
        const ioID = message.readUInt32BE(HEADER_OFFSETS.parameter2);
        // if the payload's size is not enough, i.e. variable payloadSize and the size of the payload are inconsistent
        // throw an exception. Buffer.slice() does not throw when the end index is oversized
        let dbrBuffer = message.slice(HEADER_SIZE, HEADER_SIZE + payloadSize);
        if (dbrBuffer.length !== payloadSize) {
            throw new Error("Payload size inconsistent");
        }
        return {
            dbrType: dbrType,
            dbrBuffer: dbrBuffer,
            valueCount: valueCount,
            ioID: ioID,
        };
    }

    // ------------------------ put ---------------------------

    /**
     * PUT
     * 
     * No matte what the user's input value's type, always try to encode the value to this channel's base DBR type
     * If the encoding fails, return undefined.
     * 
     * @param {type_dbr_value | type_pva_value} newValue The new value we want to send to the IOC
     * 
     * @param {number | undefined} ioTimeout timeout in unit of second, 
     *                             honored only when waitNotify is true
     *                             if a number, the wait time is finite, if undefined, never expires
     * 
     * @param {boolean} waitNotify use CA_PROTO_WRITE_NOTIFY if true, use CA_PROTO_WRITE if false
     *                  if true, send the command and wait for reply from IOC, returns the status code
     *                  if false, send the command and finish immediately, returns the IO ID
     *                  PVA channel will ignore this
     * 
     * @param {number[]} -- the BitSets using which we only need to set the value
     * 
     * @returns {number | Status | undefined} undefined if the CA operation fails, the IO ID for synchronous version (waitNotify = false), 
     *                                        the ECA status code for asynchronous version (waitNotify = true).
     *                                        PVA always returns a Status
     */

    put = async (
        newValue: type_dbr_value,
        ioTimeout: number | undefined = undefined,
        waitNotify: boolean = false
    ): Promise<number | undefined> => {
        if (this.getProtocol() === "pva") {
            return undefined;
        }

        if (this.getState() !== Channel_STATES.CREATED || this.getDbrType() === Channel_DBR_TYPES.NOT_AVAILABLE) {
            GlobalMethods.debugLog(`${this.name}'s connection state is ${this.getStateStr()}, cannot put()`);
            return undefined;
        }

        GlobalMethods.debugLog(`Trying to put('${this.name}') to ${this.getTcpTransport()?.getServerAddress()}:${this.getTcpTransport()?.getServerPort()}`);

        if (waitNotify) {
            const ioID = this.getContext().getReadWriteIos().appendIo(this, IO_TYPES.CA_PROTO_WRITE_NOTIFY, true, ioTimeout);
            this.send_CA_PROTO_WRITE_NOTIFY(newValue, ioID);

            let statusCode = ECA_SEVERITIES.CA_K_WARNING; // unsuccessful

            const promiseObj = this.getContext().getReadWriteIos().getIoPromise(ioID);

            try {
                // resolved when the CA_PROTO_WRITE_NOTIFY replay arrives
                statusCode = await promiseObj;
            } catch (e) {
                GlobalMethods.debugLog(`Channel ${this.name} put() operation interrupted.`);
                GlobalMethods.debugLog(e);
            }
            return statusCode;
        } else {
            // we only send out the data with a consistent IO ID, there is no need to use Promise
            try {
                const ioID = this.getContext().getReadWriteIos().obtainAnId();
                this.send_CA_PROTO_WRITE(newValue, ioID); // may throw if the Dbr.encodeBuffer() fails
                return ioID;
            } catch (e) {
                return undefined;
            }
        }
    };

    /**
     * PUT one or multiple PVA values
     * 
     * @param {type_pva_value[]} newValues Array of new values
     */
    putPva = async (
        pvRequest: string = "value",
        newValues: type_pva_value[],
        ioTimeout: number | undefined = undefined,
        getReadback: boolean = false,
    ): Promise<type_pva_status> => {
        if (this.getProtocol() === "ca") {
            return {
                type: PVA_STATUS_TYPE.ERROR,
                message: `${this.name}'s is a CA channel, cannot putPva()`,
                callTree: "",
            };
        }

        if (this.getState() !== Channel_STATES.CREATED) {
            GlobalMethods.debugLog(`${this.name}'s connection state is ${this.getStateStr()}, cannot put()`);
            return {
                type: PVA_STATUS_TYPE.ERROR,
                message: `${this.name}'s connection state is ${this.getStateStr()}, cannot put()`,
                callTree: "",
            };
        }

        GlobalMethods.debugLog(`Trying to put('${this.name}') to ${this.getTcpTransport()?.getServerAddress()}:${this.getTcpTransport()?.getServerPort()}`);


        try {

            const ioIDInit = this.getContext().getReadWriteIos().appendIo(this, IO_TYPES.CA_PROTO_WRITE_NOTIFY, true, ioTimeout);
            // INIT message
            const promiseObjInit = this.getContext().getReadWriteIos().getIoPromise(ioIDInit);
            this.send_PVA_PROTO_CHANNEL_PUT_INIT(ioIDInit, pvRequest);
            const pvStructureType = await promiseObjInit;

            // actual message
            // ioID === ioIDInit, reuse this IO ID, the orignal Promise for this IO ID must have been resolved, otherwise we cannot reach here
            const ioID = this.getContext().getReadWriteIos().appendIoWithId(this, IO_TYPES.CA_PROTO_WRITE_NOTIFY, true, ioTimeout, ioIDInit);
            const promiseObj = this.getContext().getReadWriteIos().getIoPromise(ioID);

            // encodeData() will check if the newValue's type, if the type does not match, it thorws
            this.send_PVA_PROTO_CHANNEL_PUT(ioID, newValues, pvRequest);
            const status = await promiseObj;

            if (getReadback === true) {
                const ioID = this.getContext().getReadWriteIos().appendIoWithId(this, IO_TYPES.CA_PROTO_WRITE_NOTIFY, true, ioTimeout, ioIDInit);
                const promiseObj = this.getContext().getReadWriteIos().getIoPromise(ioID);
                this.send_PVA_PROTO_CHANNEL_GET_PUT(ioID)
                // {message: Buffer, pvStructureDataOffset: number, endian: ENDIAN}
                const result = await promiseObj;
                const message = result["message"];
                const offset = result["pvStructureDataOffset"];
                const endian = result["endian"];

                const { bitSets, reducedType, pvRequestData } = PvRequest.decodePvRequestDataWithValue(pvRequest, this.getPvaType(), newValues, endian);
                console.dir(reducedType, { depth: null })
                const pvaData = decodeData(reducedType, message, offset, endian);

                return pvaData;
            }
            return status;

        } catch (e: any) {
            GlobalMethods.debugLog(e);
            if (e["type"] !== undefined) {
                return e as type_pva_status;
            } else {
                return {
                    type: PVA_STATUS_TYPE.ERROR,
                    message: `${e}`,
                    callTree: "",
                }
            }
        }
    };

    /**
     * 0x0c PUT_GET
     * 
     * ! it always returns "invalid pv request" error. Cannot proceed.
     */
    putAndGetPva = async (
        newValues: type_pva_value[],
        ioTimeout: number | undefined = undefined,
        pvRequest: string = "",
    ): Promise<type_pva_status> => {

        if (this.getState() !== Channel_STATES.CREATED) {
            GlobalMethods.debugLog(`${this.name}'s connection state is ${this.getStateStr()}, cannot put()`);
            return {
                type: PVA_STATUS_TYPE.ERROR,
                message: `${this.name}'s connection state is ${this.getStateStr()}, cannot put()`,
                callTree: "",
            };
        }

        GlobalMethods.debugLog(`Trying to put('${this.name}') to ${this.getTcpTransport()?.getServerAddress()}:${this.getTcpTransport()?.getServerPort()}`);


        try {
            // if this.pvaType is not defined, fetch it first
            await this.fetchPvaType();

            const ioIDInit = this.getContext().getReadWriteIos().appendIo(this, IO_TYPES.CA_PROTO_WRITE_NOTIFY, true, ioTimeout);
            // INIT message
            const promiseObjInit = this.getContext().getReadWriteIos().getIoPromise(ioIDInit);
            this.send_PVA_PROTO_CHANNEL_PUT_GET_INIT(ioIDInit, pvRequest);
            const pvStructureType = await promiseObjInit;

            // actual message
            // ioID === ioIDInit, reuse this IO ID, the orignal Promise for this IO ID must have been resolved, otherwise we cannot reach here
            const ioID = this.getContext().getReadWriteIos().appendIoWithId(this, IO_TYPES.CA_PROTO_WRITE_NOTIFY, true, ioTimeout, ioIDInit);
            const promiseObj = this.getContext().getReadWriteIos().getIoPromise(ioID);

            // encodeData() will check if the newValue's type, if the type does not match, it thorws
            this.send_PVA_PROTO_CHANNEL_PUT_GET(ioID, newValues, pvRequest);

            // {message: Buffer, pvStructureDataOffset: number, endian: ENDIAN}
            const result = await promiseObj;
            const message = result["message"];
            const offset = result["pvStructureDataOffset"];
            const endian = result["endian"];

            const { bitSets, reducedType, pvRequestData } = PvRequest.decodePvRequestDataWithValue(pvRequest, this.getPvaType(), newValues, endian);
            console.dir(reducedType, { depth: null })
            const pvaData = decodeData(reducedType, message, offset, endian);

            return pvaData;

        } catch (e: any) {
            GlobalMethods.debugLog(e);
            if (e["type"] !== undefined) {
                return e as type_pva_status;
            } else {
                return {
                    type: PVA_STATUS_TYPE.ERROR,
                    message: `${e}`,
                    callTree: "",
                }
            }
        }
    };


    // --------------------- PVA specific methods ------------------

    /**
     * Manually process PVA channel
     * 
     * @param {number | undefined} ioTimeout timeout of this IO in unit of second, if undefined, it never timeout
     * 
     * @returns {type_pva_status} status of the process request
     */
    processPva = async (
        ioTimeout: number | undefined = undefined,
    ): Promise<type_pva_status> => {


        if (this.getProtocol() !== "pva") {
            return {
                type: PVA_STATUS_TYPE.ERROR,
                message: "Channel.processPva() is only for PVA",
                callTree: "",
            };
        }

        if (this.getState() !== Channel_STATES.CREATED) {
            GlobalMethods.debugLog(`${this.name}'s connection state is ${this.getStateStr()}, cannot process()`);
            return {
                type: PVA_STATUS_TYPE.ERROR,
                message: `Channel must be in CREATED state, but it is at ${this.getState()}`,
                callTree: "",
            };
        }

        GlobalMethods.debugLog(`Trying to put('${this.name}') to ${this.getTcpTransport()?.getServerAddress()}:${this.getTcpTransport()?.getServerPort()}`);

        try {
            // INIT
            const ioID = this.getContext().getReadWriteIos().appendIo(this, IO_TYPES.CA_PROTO_READ_NOTIFY, true, ioTimeout);
            const promiseObjInit = this.getContext().getReadWriteIos().getIoPromise(ioID);
            this.send_PVA_PROTO_CHANNEL_PROCESS_INIT(ioID);
            let status = await promiseObjInit;

            // actual message
            this.getContext().getReadWriteIos().appendIoWithId(this, IO_TYPES.CA_PROTO_READ_NOTIFY, true, ioTimeout, ioID);
            const promiseObj = this.getContext().getReadWriteIos().getIoPromise(ioID);
            this.send_PVA_PROTO_CHANNEL_PROCESS(ioID);
            status = await promiseObj;
            return status;

        } catch (e: any) {
            GlobalMethods.debugLog(e);
            if (e["type"] !== undefined) {
                return e as type_pva_status;
            } else {
                return {
                    type: PVA_STATUS_TYPE.ERROR,
                    message: `${e}`,
                    callTree: "",
                }
            }
        }
    }

    /**
     * There is no reply from server
     */
    cancelPvaRequest = (ioId: number) => {
        try {
            this.send_PVA_PROTO_CANCEL_REQUEST(ioId);
        } catch (e) {
            GlobalMethods.debugLog(e);
        }
    }

    /**
     * There is no reply from server
     */
    destroyPvaRequest = (ioId: number) => {
        try {
            this.send_PVA_PROTO_CANCEL_REQUEST(ioId);
        } catch (e) {
            GlobalMethods.debugLog(e);
        }

    }

    /**
     * ! it always returns the full type regardless the input field name
     * 
     * Get the data type of this channel from IOC (not from the cached value in Channel object).
     * 
     * @param {string} fieldname if it is an empty string "", get all fields
     * 
     * @param {number | undefined} ioTimeout timeout of this IO in unit of second, if undefined, it never timeout
     * 
     * @returns {Record<string, any> | undefined} The type of the data for this channel. undefined if cannot get the type.
     * 
     */
    fetchPvaType = async (
        fieldName: string = "",
        ioTimeout: number | undefined = undefined,
    ) => {

        if (this.getProtocol() !== "pva") {
            return undefined;
        }

        if (this.getState() !== Channel_STATES.CREATED) {
            GlobalMethods.debugLog(`${this.name}'s connection state is ${this.getStateStr()}, cannot put()`);
            return undefined;
        }

        if (this.getPvaType() !== undefined) {
            return this.getPvaType();
        }

        GlobalMethods.debugLog(`Trying to put('${this.name}') to ${this.getTcpTransport()?.getServerAddress()}:${this.getTcpTransport()?.getServerPort()}`);

        try {
            const ioID = this.getContext().getReadWriteIos().appendIo(this, IO_TYPES.CA_PROTO_READ_NOTIFY, true, ioTimeout);
            const promiseObj = this.getContext().getReadWriteIos().getIoPromise(ioID);
            this.send_PVA_PROTO_GET_INTROSPECTION_TYPE(ioID, fieldName);
            const pvStructureType = await promiseObj;
            this.setPvaType(pvStructureType);
            return pvStructureType;

        } catch (e) {
            GlobalMethods.debugLog(e);
            this.setPvaType(undefined);
            return undefined;
        }
    }

    /**
     * Submit an RPC to IOC
     * 
     * @param {any} type the input data's type
     * 
     * @param {any} data the input data
     * 
     * @returns {{type: any, value: any}} the returned type and the value of the RPC
     * 
     */
    submitPvaRpc = async (
        pvRequest: string,
        ioTimeout: number | undefined = undefined,
    ): Promise<{ type: any, data: any } | undefined> => {

        if (this.getProtocol() !== "pva") {
            return undefined;
        }

        if (this.getState() !== Channel_STATES.CREATED) {
            GlobalMethods.debugLog(`${this.name}'s connection state is ${this.getStateStr()}, cannot put()`);
            return undefined;
        }

        GlobalMethods.debugLog(`Trying to put('${this.name}') to ${this.getTcpTransport()?.getServerAddress()}:${this.getTcpTransport()?.getServerPort()}`);

        try {
            // INIT
            const ioID = this.getContext().getReadWriteIos().appendIo(this, IO_TYPES.CA_PROTO_READ_NOTIFY, true, ioTimeout);
            const promiseObjInit = this.getContext().getReadWriteIos().getIoPromise(ioID);
            this.send_PVA_PROTO_CHANNEL_RPC_INIT(ioID);
            const status = await promiseObjInit;

            // RPC
            this.getContext().getReadWriteIos().appendIoWithId(this, IO_TYPES.CA_PROTO_READ_NOTIFY, true, ioTimeout, ioID);
            const promiseObj = this.getContext().getReadWriteIos().getIoPromise(ioID);
            this.send_PVA_PROTO_CHANNEL_RPC(ioID, pvRequest);
            // variant union type: {value: ..., type: ...}
            const result = await promiseObj;

            return result;
        } catch (e) {
            GlobalMethods.debugLog(e);
            return undefined;
        }

    }


    // ---------------------- destroy ---------------------------

    /**
     * Soft destroy the channel.
     * 
     * Clean up all the asynchronous components. Detach with TCPTransoport. Soft destroy all monitors.
     * 
     * This object and its ChannelMonitor objects are kept.
     * 
     * Immediate try to re-connect the channel and re-subscribe the monitors.
     * 
     */
    destroySoft = async (delaySearch: number = 0) => {
        await this.destroy("soft", delaySearch);
    }

    destroyHard = async () => {
        await this.destroy("hard");
    }

    /**
     * we can always destroy the channel, no matter at what state
     * 
     * (1) set new state
     * 
     * (2) resest serverAddress and tcpPort
     * 
     * (3) run callback function 
     * 
     * (4) send CA_PROTO_CLEAR_CHANNEL (CA) or PVA_PROTO_DESTROY_CHANNEL (PVA) to IOC
     *     the server will response PVA_PROTO_DESTROY_CHANNEL, but will be ignored
     *     we don't need to block waiting for the PVA_PROTO_DESTROY_CHANNEL response
     *     Wrap this function call inside 
     * 
     * (5) reset Channel.Dbr by replacing it with a raw one
     * 
     * (6) destroy all monitors
     * 
     * (7) relocate this channel in Context's channels list
     * 
     * (8) remove the channel from Context.putPvaHistory list
     * 
     * (9) clear all read/write IOs in Context
     * 
     * (10) reject all promises in Channel
     * 
     * (11) decouple with TCPTransoport, 
     *      destroy the TCPTransoport if it has no channel left, no difference between hard and soft if it has no channel
     * 
     * (12) reset the channel state to UNRESOLVED and search counter for soft destroy
     * 
     * (13) reconnect channel for soft destroy
     *
     * (14) resubscribe all monitors for soft destroy
     * 
     */
    private destroy = async (option: "soft" | "hard", delaySearch: number | undefined = undefined) => {
        // (1)
        if (option === "soft") {
            if (this.getState() === Channel_STATES.DISCONNECTED) {
                // this channel is already/being soft destroyed
                // there is no need to call it again
                return;
            } else if (this.getState() === Channel_STATES.RECREATING) {
                // this channel is already/being soft destroyed
                // there is no need to call it again
                return;
            } else if (this.getState() === Channel_STATES.DESTROYED) {
                // this channel is already/being hard destroyed
                // we should not destroySoft it
                return;
            } else if (this.getState() === Channel_STATES.CREATED) {
                // normal case, continue
            } else if (this.getState() === Channel_STATES.FAILED) {
                // normal case, continue
            } else if (this.getState() === Channel_STATES.RESOLVED) {
                // normal case, continue
            } else if (this.getState() === Channel_STATES.SEARCHING) {
                // normal case, continue
            } else if (this.getState() === Channel_STATES.UNRESOLVED) {
                // normal case, continue
            }
            this.setState(Channel_STATES.DISCONNECTED);
        } else {
            if (this.getState() === Channel_STATES.DISCONNECTED) {
                // normal case, continue
            } else if (this.getState() === Channel_STATES.RECREATING) {
                // normal case, continue
            } else if (this.getState() === Channel_STATES.DESTROYED) {
                // this channel is already/being hard destroyed
                // we should not hardSoft it again
                return;
            } else if (this.getState() === Channel_STATES.CREATED) {
                // normal case, continue
            } else if (this.getState() === Channel_STATES.FAILED) {
                // normal case, continue
            } else if (this.getState() === Channel_STATES.RESOLVED) {
                // normal case, continue
            } else if (this.getState() === Channel_STATES.SEARCHING) {
                // normal case, continue
            } else if (this.getState() === Channel_STATES.UNRESOLVED) {
                // normal case, continue
            }
            this.setState(Channel_STATES.DESTROYED);
        }

        // (2)
        this.setServerTcpPort(-1);
        this.setServerAddress("");

        // (3)
        if (option === "soft") {
            this.destroySoftCallback();
        } else {
            this.destroyHardCallback();
        }

        // (4)
        if (this.getProtocol() === "pva") {
            try {
                this.send_PVA_PROTO_DESTROY_CHANNEL();
            } catch (e) {
                // GlobalMethods.errorLog(e);
            }
        } else {
            this.send_CA_PROTO_CLEAR_CHANNEL();
        }

        // (5)
        for (let monitor of this.getMonitors()) {
            if (option === "soft") {
                monitor.destroySoft();
            } else {
                monitor.destroyHard();
            }
        }

        // (6)
        this.dbr = new Dbr();

        // (7)
        if (option === "hard") {
            delete this.getContext().getUnresolvedChannelsByName()[this.name];
            delete this.getContext().getUnresolvedChannelsByClientID()[this.getChannelClientID().toString()];
            delete this.getContext().getResolvedChannelsByClientID()[this.getChannelClientID().toString()];
            delete this.getContext().getResolvedChannelsByName()[this.name];
        } else {
            this.moveToUnresolvedChannelsGroup();
        }

        // (8)
        this.getContext().removePutPvaHistoryChannel(this.getLastPutPvaIoId());

        // (9)
        try {
            this.getContext().getReadWriteIos().rejectChannelIos(this.getName());
        } catch (e) {
            GlobalMethods.errorLog(e);
        }

        // (10)
        this.getPromises().rejectAll(`Channel ${this.getName()} destroyed ${option}`);

        // (11)
        this.getTcpTransport()?.removeChannel(this.name);
        const channelsInTcpTransport = this.getTcpTransport()?.getChannels();
        if (channelsInTcpTransport !== undefined) {
            if (Object.keys(channelsInTcpTransport).length === 0) {
                this.getTcpTransport()?.destroyHard();
            }
        }
        this.setTcpTransport(undefined);

        if (option === "soft") {

            // (12) 
            this.setState(Channel_STATES.RECREATING);
            let newCount = 0;
            if (typeof delaySearch === "number") {
                const minSearchPeriod = this.getContext().getEnv("EPICS_CA_MIN_SEARCH_PERIOD");
                if (typeof minSearchPeriod === "number") {
                    newCount = Math.round(delaySearch / minSearchPeriod) * -1;
                }
            }
            this.resetSearchCounter(newCount);

            // (13)
            await this.getContext().createChannel(this.getName(), this.getProtocol(), this.getCreationTimeout(), this.getServerSchedulingPriority());

            // (14)
            for (let monitor of this.getMonitors()) {
                monitor.resubscribe();
            }
        }

        GlobalMethods.debugLog(`Channel "${this.name}" destroyed ${option}ly.`);
    }

    // --------------------- setters and getters --------------------

    public get_CA_PROTO_SEARCH_msg = (): Buffer => {
        return this.CA_PROTO_SEARCH_msg;
    };

    public getName = (): string => {
        return this.name;
    };

    // callbacks

    setDestroySoftCallback = (callback: (() => void)) => {
        this.destroySoftCallback = callback;
    }

    setDestroyHardCallback = (callback: (() => void)) => {
        this.destroyHardCallback = callback;
    }

    // id and priority

    public getChannelClientID = (): number => {
        return this.channelClientID;
    };

    setChannelClientId = () => {
        const newId = this.getContext().getChannelClientID();
        this.channelClientID = newId;
        this.getContext().incrementChannelClientId();
    }

    public setChannelServerID = (id: number) => {
        this.channelServerID = id;
    };
    public getChannelServerID = (): number => {
        return this.channelServerID;
    };

    public getServerSchedulingPriority = (): number => {
        return this.serverSchedulingPriority;
    };

    // access right

    public getAccessRight = (): Channel_ACCESS_RIGHTS => {
        return this.accessRight;
    };

    getAccessRightStr = (): string => {
        return Channel_ACCESS_RIGHTS[this.accessRight];
    }

    public setAccessRight = (right: Channel_ACCESS_RIGHTS) => {
        this.accessRight = right;
    };

    // channel state

    public getStateStr = (): string => {
        return Channel_STATES[this.state];
    };

    public setState = (state: Channel_STATES) => {
        this.state = state;
    };

    getState = () => {
        return this.state;
    }

    // promises and timeouts

    public getPromises = () => {
        return this.promises;
    }

    getPromiseObj = (name: string) => {
        return this.getPromises().get(name);
    };

    getCreationTimeout = () => {
        return this.creationTimeout;
    }

    public resetSearchCounter = (newCount: number = 0) => {
        this.searchCounter = newCount;
    };

    // TCP transport

    getTcpTransport = (): TCPTransport | undefined => {
        return this.tcpTransport;
    };

    setTcpTransport = (newTransport: TCPTransport | undefined) => {
        this.tcpTransport = newTransport;
    }

    // monitor

    getMonitors = () => {
        return this.monitors;
    }

    // context

    getContext = () => {
        return this.context;
    }

    // move this channel around

    moveToUnresolvedChannelsGroup = () => {
        this.getContext().getUnresolvedChannelsByName()[this.name] = this;
        this.getContext().getUnresolvedChannelsByClientID()[this.getChannelClientID().toString()] = this;
        delete this.getContext().getResolvedChannelsByClientID()[this.getChannelClientID().toString()];
        delete this.getContext().getResolvedChannelsByName()[this.name];
    }

    moveToResolvedChannelsGroup = () => {
        this.getContext().getResolvedChannelsByName()[this.name] = this;
        this.getContext().getResolvedChannelsByClientID()[this.getChannelClientID().toString()] = this;
        delete this.getContext().getUnresolvedChannelsByClientID()[this.getChannelClientID().toString()];
        delete this.getContext().getUnresolvedChannelsByName()[this.name];
    }

    // Dbr object

    /**
     * Get the dbr object
     */
    getDbr = () => {
        return this.dbr;
    }

    /**
     * Get the meta data in the current Dbr object
     */
    getDbrMeta = () => {
        return this.getDbr().getMeta();
    }

    /**
     * Get the current value in the Dbr object
     * 
     * It is also the current value of this channel.
     */
    getDbrValue = () => {
        return this.getDbr().getValue();
    }

    /**
     * Get the value count in Dbr object.
     * 
     * Note: it may be different from the intrinsic value count that is defined in IOC.
     */
    getDbrValueCount = () => {
        return this.getDbr().getValueCount();
    }

    /**
     * Get the DBR type of the Dbr object. It comes from the most recent CA_PROTO_READ_NOTIFY or
     * CA_PROTO_EVENT_ADD message.
     * 
     * Note: it may be different from the **intrinsic** DBR type of this channel, which is
     *       defined in the IOC.
     */
    getDbrDbrType = () => {
        return this.getDbr().getType();
    }

    /**
     * Get the most recent buffer in Dbr object. 
     * 
     * It comes from the most recent CA_PROTO_READ_NOTIFY or CA_PROTO_EVENT_ADD message.
     */
    getDbrBuffer = () => {
        return this.getDbr().getBuffer();
    }

    /**
     * Get the meta data and value 
     */
    getDbrData = (): type_dbrData => {
        return { ...this.getDbr().getMeta(), value: this.getDbr().getValue() };
    };

    /**
     * Get the current value of this channel.
     */
    getValue = () => {
        return this.getDbr().getValue();
    }

    // dbr types

    /**
     * Set the **intrinsic** channel DBR type which is defined on IOC.
     * 
     * Note: it is different from the Dbr.type, the current DBR data's type, which can be
     *       any DBR type as request by the user and received from the IOC.
     */
    public setDbrType = (newType: Channel_DBR_TYPES) => {
        this.dbrType = newType;
    };

    /**
     * @returns {Channel_DBR_TYPES} The **base** **intrinsic** DBR type for the channel, i.e. value 0 to 6
     *                              If the channel is not defined, return NOT_AVAILABLE
     * 
     *                              NOT_AVAILABLE = -1,
     *                              DBR_STRING    = 0,
     *                              DBR_INT       = 1,
     *                              DBR_SHORT     = 1,
     *                              DBR_FLOAT     = 2,
     *                              DBR_ENUM      = 3,
     *                              DBR_CHAR      = 4,
     *                              DBR_LONG      = 5,
     *                              DBR_DOUBLE    = 6,
     * 
     * Note: it is different from the Dbr.type, the current DBR data's type, which can be
     *       any DBR type as request by the user and received from the IOC.
     */
    getDbrType = (): Channel_DBR_TYPES => {
        // special type, always NOT_AVAILABLE
        if (this.dbrType === Channel_DBR_TYPES.NOT_AVAILABLE) {
            return Channel_DBR_TYPES.NOT_AVAILABLE;
        }
        return this.dbrType % 7;
    };

    getDbrType_STS = (): Channel_DBR_TYPES => {
        if (this.dbrType === Channel_DBR_TYPES.NOT_AVAILABLE) {
            return Channel_DBR_TYPES.NOT_AVAILABLE;
        }
        return 7 + this.getDbrType();
    }

    getDbrType_TIME = (): Channel_DBR_TYPES => {
        if (this.dbrType === Channel_DBR_TYPES.NOT_AVAILABLE) {
            return Channel_DBR_TYPES.NOT_AVAILABLE;
        }
        return 14 + this.getDbrType();
    }

    getDbrType_GR = (): Channel_DBR_TYPES => {
        if (this.dbrType === Channel_DBR_TYPES.NOT_AVAILABLE) {
            return Channel_DBR_TYPES.NOT_AVAILABLE;
        }
        return 21 + this.getDbrType();
    }

    getDbrType_CTRL = (): Channel_DBR_TYPES => {
        if (this.dbrType === Channel_DBR_TYPES.NOT_AVAILABLE) {
            return Channel_DBR_TYPES.NOT_AVAILABLE;
        }
        return 28 + this.getDbrType();
    }

    /**
     * @returns {string} The **base** DBR type name for the channel, i.e.
     * 
     *                    NOT_AVAILABLE = -1,
     *                    DBR_STRING    = 0,
     *                    DBR_INT       = 1,
     *                    DBR_SHORT     = 1,
     *                    DBR_FLOAT     = 2,
     *                    DBR_ENUM      = 3,
     *                    DBR_CHAR      = 4,
     *                    DBR_LONG      = 5,
     *                    DBR_DOUBLE    = 6,
     */
    getDbrTypeStr = (): string => {
        return Channel_DBR_TYPES[this.getDbrType()];
    };

    getDbrTypeStr_STS = (): string => {
        return Channel_DBR_TYPES[this.getDbrType_STS()];
    };

    getDbrTypeStr_TIME = (): string => {
        return Channel_DBR_TYPES[this.getDbrType_TIME()];
    };

    getDbrTypeStr_GR = (): string => {
        return Channel_DBR_TYPES[this.getDbrType_GR()];
    };

    getDbrTypeStr_CTRL = (): string => {
        return Channel_DBR_TYPES[this.getDbrType_CTRL()];
    };

    /**
     * Get intrinsic value count of this channel as defined on IOC
     */
    getValueCount = () => {
        return this.valueCount;
    }

    /**
     * Set the intrinsic value count of this channel
     */
    setValueCount = (newCount: number) => {
        this.valueCount = newCount;
    }

    getServerAddress = () => {
        return this.serverAddress;
    }

    getServerTcpPort = () => {
        return this.serverTcpPort;
    }

    setServerAddress = (newAddress: string) => {
        this.serverAddress = newAddress;
    }

    setServerTcpPort = (newPort: number) => {
        this.serverTcpPort = newPort;
    }

    getServerCaMinorVersion = () => {
        return this.serverCaMinorVersion;
    }

    setServerCaMinorVersion = (newVersion: number) => {
        this.serverCaMinorVersion = newVersion;
    }

    getProtocol = () => {
        return this.protocol;
    }

    // ---------------------- getter/setter for pva --------------

    getLastPutPvaIoId = () => {
        return this.lastPutPvaIoId;
    }

    setLastPutPvaIoId = (ioId: number) => {
        this.lastPutPvaIoId = ioId;
    }


    getLastGetPvaIoId = () => {
        return this.lastGetPvaIoId;
    }

    setLastGetPvaIoId = (ioId: number) => {
        this.lastGetPvaIoId = ioId;
    }

    /**
     * Obtain endian of the 
     * 
     * @throws when the TCP transport does not exist
     */
    getEndian = (message: Buffer | undefined, messageType: "encoding" | "decoding") => {
        const tcpTransport = this.getTcpTransport();
        if (tcpTransport !== undefined) {
            const endian = tcpTransport.getEndian(message, messageType);
            return endian;
        } else {
            throw new Error("Channel.getEndian(): Cannot find TCP transport");
        }
    }


    getIoIntermediateData = (ioID: number) => {
        return this.ioIntermediateData[`${ioID}`];
    }

    addIoIntermediateData = (ioID: number, data: any) => {
        this.ioIntermediateData[`${ioID}`] = data;
    }

    removeIoIntermediateData = (ioID: number) => {
        delete this.ioIntermediateData[`${ioID}`];
    }

    getPvaType = () => {
        return this.pvaType;
    }

    setPvaType = (newType: any) => {
        this.pvaType = newType;
    }
}

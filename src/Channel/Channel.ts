import { Buffer } from "buffer";

import { Context } from "../Context/Context";
import { TCPTransport } from "../TCPTransport/TCPTransport";
import { generateCAHeader, getStringPaddedSize, GlobalMethods, isExtendedMessageHeader, isPowerOfTwo } from "../Global/GlobalMethods";
import { ChannelMonitor } from "./ChannelMonitor";
import { CA_COMMANDS, CA_MINOR_PROTOCOL_REVISION } from "../Global/Constants";
import { CA_MSG_HEADER_SIZE } from "../Global/Constants";
import { CA_MSG_HEADER_OFFSETS } from "../Global/Constants";
import { CA_EXT_MSG_HEADER_OFFSETS } from "../Global/Constants";
import { CA_EXT_MSG_HEADER_SIZE } from "../Global/Constants";
import { IO_TYPES } from "../Context/ReadWriteIos";
import { ChannelPromises } from "./ChannelPromises";

import { Dbr } from "./Dbr";
import { ECA_SEVERITIES } from "../ECA/ECA";

// todo: access right change listener

// meta and value
export type type_dbrData = Record<string, any> & {
    value: type_dbr_value;
};

export enum Channel_STATES {
    UNRESOLVED,
    SEARCHING, // after first CA_PROTO_SEARCH sent
    RESOLVED, // after CA_PROTO_SEARCH reply
    CREATED, // after CA_PROTO_CREATE_CHAN, registered to CA server
    DISCONNECTED, // destroyed softly, or unexpected disconnection, recoverable
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
    DBE_VALUE_and_DBE_LOG = 3, // 0011
    DBE_ALARM = 4, // 0100
    DBE_VALUE_and_DBE_ALARM = 5, // 0101
    DBE_LOG_and_DBE_ALARM = 6, // 0110
    DBE_VALUE_and_DBE_LOG_and_DBE_ALARM = 7, // 0111
    DBE_PROPERTY = 8, // 1000
    DBE_VALUE_and_DBE_PROPERTY = 9, // 1001
    DBE_LOG_and_DBE_PROPERTY = 10, // 1010
    DBE_VALUE_and_DBE_LOG_and_DBE_PROPERTY = 11, // 1011
    DBE_ALARM_and_DBE_PROPERTY = 12, // 1100
    DBE_VALUE_and_DBE_ALARM_and_DBE_PROPERTY = 13, // 1101
    DBE_LOG_and_DBE_ALARM_and_DBE_PROPERTY = 14, // 1110
    DBE_VALUE_and_DBE_LOG_and_DBE_ALARM_and_DBE_PROPERTY = 15, // 1111
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

export type type_dbr_value = number | number[] | string | string[];

export type type_dbr_meta_all = {
    status: number,
    severity: number,
    secondsSinceEpoch: number,
    nanoSeconds: number,
    units: string,
    upper_display_limit: number,
    lower_display_limit: number,
    upper_alarm_limit: number,
    upper_warning_limit: number,
    lower_warning_limit: number,
    lower_alarm_limit: number,
    upper_ctrl_limit: number,
    lower_ctrl_limit: number,
    precision: number,
    padding: number,
    number_of_string_used: number,
    strings: string[],
};

export type type_dbr_meta = Partial<type_dbr_meta_all>;



export class Channel {

    // channel
    private readonly name: string;
    private channelClientID: number = -1;
    private channelServerID: number = 0xffffffff;
    private readonly serverSchedulingPriority: number; // this is at TCPTransoport level
    private accessRight: Channel_ACCESS_RIGHTS = Channel_ACCESS_RIGHTS.NOT_AVAILABLE;
    private state: Channel_STATES = Channel_STATES.UNRESOLVED;
    private readonly creationTimeout: number | undefined = undefined; // simply for re-connect the channel

    // related objects
    readonly monitors: Record<string, ChannelMonitor> = {};
    private readonly context: Context;
    private tcpTransport: TCPTransport | undefined = undefined;

    // dbr
    private dbr: Dbr = new Dbr(Channel_DBR_TYPES.NOT_AVAILABLE);

    // search
    private readonly CA_PROTO_SEARCH_msg: Buffer;
    private searchCounter: number = 0;
    private readonly searchCounterMax: number;
    private readonly searchCounterMaxP2: number;


    // asynchronous
    private promises: ChannelPromises = new ChannelPromises();

    // callbacks
    destroySoftCallback: (() => void) = () => { };
    destroyHardCallback: (() => void) = () => { };

    constructor(context: Context, name: string, creationTimeout: number | undefined = undefined, serverSchedulingPriority: number = -1) {
        // no change upon reconnecting
        this.context = context;
        this.name = name;
        this.creationTimeout = creationTimeout;
        this.CA_PROTO_SEARCH_msg = this.create_CA_PROTO_SEARCH_msg();
        this.serverSchedulingPriority =
            serverSchedulingPriority < 0 ? (this.getContext().getEnv("EPICS_CA_SCHEDULING_PRIORITY_DEFAULT") as number) : serverSchedulingPriority;

        this.searchCounterMax = Math.max(1, Math.round(
            (this.getContext().getEnv("EPICS_CA_MAX_SEARCH_PERIOD") as number) / (this.getContext().getEnv("EPICS_CA_MIN_SEARCH_PERIOD") as number)
        ));
        this.searchCounterMaxP2 = (1 << (Math.floor(Math.log2(this.searchCounterMax * 2))));
    }

    // ---------------------- search PV -----------------------------

    /**
     * start to search this PV, i.e. sending out CA_PROTO_SEARCH, and wait for the reply
     * 
     * This method should be able to handle this possible race condition:
     * 
     *  - If one startSearchPv() is invoked but we got multiple CA_PROTO_SEARCH responses 
     *    for this channel (may be from multiple IOCs), or multiple resolve functions are invoked, 
     *    only the first one is considered, the latter ones are ignored. 
     */
    startSearchPv = async () => {

        // channel state must be: UNRESOLVED, FAILED, DESTROYED, DISCONNECTED
        if (this.getState() !== Channel_STATES.UNRESOLVED &&
            this.getState() !== Channel_STATES.FAILED &&
            this.getState() !== Channel_STATES.DESTROYED &&
            this.getState() !== Channel_STATES.DISCONNECTED) {
            throw new Error(`Stop searching this channel, its state must be UNRESOLVED, FAILED, DESTROYED, or DISCONNECTED. But the current state is ${this.getState()}`);
        }

        this.setState(Channel_STATES.SEARCHING);

        // we may need to initiate new search in case of TCP error, set rejectAndReplaceExisting to true
        this.getPromises().append("CA_PROTO_SEARCH", true);
        const promiseObj = this.getPromiseObj("CA_PROTO_SEARCH");

        // the PV search automatically starts
        this.moveToUnresolvedChannelsGroup();

        // exception should be catched in high level
        const [serverAddress, serverTcpPort] = await promiseObj;

        this.setState(Channel_STATES.RESOLVED);
        return [serverAddress, serverTcpPort];
    }

    stopSearchPv = () => {
        // these 3 lists are always together
        this.moveToResolvedChannelsGroup();
    };

    /**
     * Create the Buffer for name search. This buffer is never changed.
     */
    private create_CA_PROTO_SEARCH_msg() {
        this.setChannelClientId();
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
    // ------------------------- TCP and search --------------------------------

    /**
     * Create the TCPTransport object if necessary
     */
    createTcpTransport = (serverTcpPort: number, serverAddress: string): TCPTransport => {
        const serverSchedulingPriority = this.serverSchedulingPriority;
        const tcpTransportKey = `${serverAddress}:${serverTcpPort}:${serverSchedulingPriority}`;

        let tcpTransport = this.getContext().getTCPTransport(tcpTransportKey);
        if (tcpTransport === undefined) {
            GlobalMethods.infoLog(`TCPTransport ${tcpTransportKey} does not exist, creating it for ${this.name}`);
            tcpTransport = new TCPTransport(this.getContext(), serverTcpPort, serverAddress, serverSchedulingPriority);
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
     */
    sendAndWait_CA_PROTO_CREATE_CHAN = async () => {
        // only allow a resolved but not created channel to run this function
        if (this.getState() !== Channel_STATES.RESOLVED) {
            GlobalMethods.errorLog("The channel state must be RESOLVED to create a channel");
            return;
        }

        this.getPromises().append("CA_PROTO_CREATE_CHAN", false);
        this.send_CA_PROTO_CREATE_CHAN();
        await this.getPromiseObj("CA_PROTO_CREATE_CHAN");
        this.setState(Channel_STATES.CREATED);
    }

    // ----------------- senders -----------------------

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

    private send_CA_PROTO_WRITE_NOTIFY = (
        newValue: type_dbr_value,
        ioID: number,
    ) => {

        let newValueCount = 1;
        if (typeof newValue !== "number" && typeof newValue !== "string") {
            newValueCount = newValue.length;
        }
        if (newValueCount > this.getDbr().getValueCount()) {
            throw new Error(`Value count [${newValueCount}] larger than channel's native value count [${this.getDbr().getValueCount()}]`);
        }
        let bufferPayload: Buffer = Dbr.encodeBuffer(newValue, this.getDbrTypeNum());

        const payloadSize = bufferPayload.length;
        const rawDbrType = this.getDbrTypeNum() % 7;

        const bufferHeader = generateCAHeader(
            CA_COMMANDS.CA_PROTO_WRITE_NOTIFY, // 0x0f
            payloadSize, // payload size,
            rawDbrType, // raw DBR type
            newValueCount, // desired number of elements
            this.getChannelServerID(), // server's channel ID
            ioID
        ); // ioID
        const buffer = Buffer.concat([bufferHeader, bufferPayload]);
        this.getTcpTransport()?.send(buffer);
    };

    // ------------------------------- monitor --------------------------

    // todo: camonitor options
    // must be invoked after the channel is created
    createMonitor = async (
        listener: ((monitor: ChannelMonitor) => void) | undefined = undefined,
        dbrType: number = this.getDbrTypeNum(),
        valueCount: number = this.getDbr().getValueCount(),
        mask: ChannelMonitor_MASKS = ChannelMonitor_MASKS.DBE_VALUE_and_DBE_ALARM
    ): Promise<ChannelMonitor | undefined> => {
        if (this.getState() !== Channel_STATES.CREATED) {
            GlobalMethods.errorLog(`${this.name}'s connection state is ${this.getState()}, cannot put()`);
            return undefined;
        }

        // if there is an existing monitor
        let monitorExisted = this.monitorAlreadyExist(dbrType, valueCount, mask);
        if (monitorExisted !== undefined) {
            GlobalMethods.infoLog(`Monitor for "${this.name}" with dbr type ${dbrType}, value count ${valueCount} and mask ${mask} already exists.`);
            // todo: if monitor is paused, start it again
            return monitorExisted;
        }
        const subscriptionId = this.obtainSubscriptionId();
        GlobalMethods.infoLog(`Creating a monitor for ${this.name} with subscription ID ${subscriptionId}`);
        let monitor = new ChannelMonitor(this, subscriptionId, dbrType, valueCount, listener, mask);
        // not a sync
        // monitor.subscribe();
        return monitor;
    };

    addMonitor = (monitor: ChannelMonitor) => {
        const subscriptionId = monitor.subscriptionId;
        if (this.getMonitor(subscriptionId) === undefined) {
            this.getMonitors()[subscriptionId.toString()] = monitor;
            this.getContext().getMonitorsBySubscriptionID()[subscriptionId.toString()] = monitor;
        } else {
            GlobalMethods.infoLog(`Channel monitor ${this.name} already exists`);
        }
    };
    removeMonitor = (monitor: ChannelMonitor) => {
        const subscriptionId = monitor.subscriptionId;
        delete this.getMonitors()[subscriptionId.toString()];
        delete this.getContext().getMonitorsBySubscriptionID()[subscriptionId.toString()]
    };

    removeAllMonitors = () => {
        for (let subscriptionIdStr in this.getMonitors()) {
            delete this.getMonitors()[subscriptionIdStr];
            delete this.getContext().getMonitorsBySubscriptionID()[subscriptionIdStr]
        }
    };

    pauseAllMonitors = () => {
        for (let subscriptionIdStr in this.getMonitors()) {
            const monitor = this.getMonitors()[subscriptionIdStr];
            monitor.pause();
        }
    }

    resumeAllMonitors = () => {
        for (let subscriptionIdStr in this.getMonitors()) {
            const monitor = this.getMonitors()[subscriptionIdStr];
            monitor.resume();
        }
    }

    private monitorAlreadyExist = (dbrType: Channel_DBR_TYPES, valueCount: number, mask: number): ChannelMonitor | undefined => {
        for (let subscriptionIdStr in this.getMonitors()) {
            const monitor = this.getMonitors()[subscriptionIdStr];
            if (monitor.dbrType === dbrType && monitor.valueCount === valueCount && monitor.mask === mask) {
                return monitor;
            }
        }
        return undefined;
    };

    private obtainSubscriptionId = (): number => {
        const currentId = this.getSubscriptionId();
        if (currentId === undefined) {
            throw new Error(`TcpTransport has not been defined yet`);
        }
        let id = currentId + 1;
        while (!this.validateSubscriptionId(id)) {
            if (id === 4294967295) {
                id = 0;
            } else {
                id++;
            }
        }
        this.setSubscriptionId(id);
        return id;
    };

    private validateSubscriptionId = (id: number): boolean => {
        // id already used
        if (this.getTcpTransport()?.getMonitor(id) !== undefined) {
            return false;
        }
        // id out of range
        if (id >= 4294967295 || id < 0) {
            return false;
        }
        return true;
    };



    private reSubscribeAllMonitors = () => {
        for (const subscriptionIdStr in this.getMonitors()) {
            GlobalMethods.errorLog(`Re-subscribe monitor ${subscriptionIdStr}`);
            const monitor = this.getMonitors()[subscriptionIdStr];
            monitor.subscribe();
        }
    };


    destroyAllMonitorsHard = () => {
        for (let subscriptionId in this.getMonitors()) {
            const monitor = this.getMonitor(parseInt(subscriptionId));
            monitor?.destroyHard();
        }
    };

    destroyAllMonitorsSoft = () => {
        for (let subscriptionId in this.getMonitors()) {
            const monitor = this.getMonitor(parseInt(subscriptionId));
            monitor?.destroySoft();
        }
    };


    // --------------------------- get -------------------------

    /**
     * 
     * GET
     * 
     * @param {number | undefined} ioTimeout The timeout of the GET operation in unit of second. 
     *                                       If undefined, it never times out.
     * 
     * @param {Channel_DBR_TYPES} dbrType The desired DBR type.
     * 
     * @param {number} valueCount The desired number of values to get.
     * 
     * @returns {type_dbrData | undefined} The type_dbrData contains the value of this channel 
     *                                     and the meta data of the specific requested data type, e.g. time stamp
     *                                     for DBR_TIME, alarm limits for DBR_GR
     */
    get = async (
        ioTimeout: number | undefined = undefined, // not this.getEnv("READ_WRITE_IO_DEFAULT_TIMEOUT") as number // 1 second
        dbrType: Channel_DBR_TYPES = this.getDbrType(),
        valueCount: number = this.getDbr().getValueCount(),
    ): Promise<type_dbrData | undefined> => {
        if (this.getState() !== Channel_STATES.CREATED) {
            GlobalMethods.errorLog(`${this.name}'s connection state is ${this.getState()}, cannot get()`);
            return undefined;
        }

        GlobalMethods.infoLog(`Trying to get('${this.name}') from ${this.getTcpTransport()?.getServerAddress()}:${this.getTcpTransport()?.getServerPort()}`);

        try {
            // each such IO is unique, there is no duplicate appendIo(), so the rejectAndReplaceExisting bit is not used
            // the ioTimeout only cancels this operation, it does not destroy this channel
            const ioID = this.getContext().getReadWriteIos().appendIo(this, IO_TYPES.CA_PROTO_READ_NOTIFY, true, ioTimeout);

            this.send_CA_PROTO_READ_NOTIFY(dbrType, valueCount, ioID);

            // lifted after receiving reply of CA_PROTO_READ_NOTIFY
            const promiseObj = this.getContext().getReadWriteIos().getIoPromise(ioID)
            let message = await promiseObj;

            // extract dbr payload from the above message
            const dbrPayload = Channel.extractDbrPayloadFromReadBuffer(message);

            // decode buffer and update the values and properties in DBR object
            this.getDbr().decodeBuffer(dbrPayload.dbrBuffer, dbrPayload.dbrType, dbrPayload.valueCount);

            return this.getDbrData();

        } catch (e) {
            GlobalMethods.errorLog(`Channel ${this.name} get() operation interrupted.`);
            GlobalMethods.errorLog(e);
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
     * @param {type_dbr_value} newValue The new value we want to send to the IOC
     * 
     * @param {number | undefined} ioTimeout timeout in unit of second, 
     *                             honored only when waitNotify is true
     *                             if a number, the wait time is finite, if undefined, never expires
     * 
     * @param {boolean} waitNotify use CA_PROTO_WRITE_NOTIFY if true, use CA_PROTO_WRITE if false
     *                  if true, send the command and wait for reply from IOC, returns the status code
     *                  if false, send the command and finish immediately, returns the IO ID
     * 
     * @returns {number | undefined}
     */
    put = async (
        newValue: type_dbr_value,
        ioTimeout: number | undefined = undefined,
        waitNotify: boolean = false
    ): Promise<number | undefined> => {

        if (this.getState() !== Channel_STATES.CREATED) {
            GlobalMethods.errorLog(`${this.name}'s connection state is ${this.getState()}, cannot put()`);
            return undefined;
        }

        GlobalMethods.infoLog(`Trying to put('${this.name}') to ${this.getTcpTransport()?.getServerAddress()}:${this.getTcpTransport()?.getServerPort()}`);

        if (waitNotify) {
            const ioID = this.getContext().getReadWriteIos().appendIo(this, IO_TYPES.CA_PROTO_WRITE_NOTIFY, true, ioTimeout);
            this.send_CA_PROTO_WRITE_NOTIFY(newValue, ioID);

            let statusCode = ECA_SEVERITIES.CA_K_WARNING; // unsuccessful

            const promiseObj = this.getContext().getReadWriteIos().getIoPromise(ioID);

            try {
                statusCode = await promiseObj;
            } catch (e) {
                GlobalMethods.errorLog(`Channel ${this.name} put() operation interrupted.`);
                GlobalMethods.errorLog(e);
            }
            return statusCode;
        } else {
            // we only send out the data with a consistent IO ID, there is no need to use Promise
            const ioID = this.getContext().getReadWriteIos().obtainAnId();
            this.send_CA_PROTO_WRITE(newValue, ioID);
            return ioID;
        }
    };


    // ---------------------- destroy ---------------------------

    destroySoft = () => {
        this.destroy("soft");
    }

    destroyHard = () => {
        this.destroy("hard");
    }

    /**
     * we can always destroy the channel, no matter at what state
     * 
     * (1) set new state
     * 
     * (2) run callback function 
     * 
     * (3) send CA_PROTO_CLEAR_CHANNEL to IOC
     * 
     * (4) destroy all monitors
     * 
     * (5) relocate this channel in Context's channels list
     * 
     * (6) clear all read/write IOs in Context
     * 
     * (7) decouple with TCPTransoport, 
     *     destroy the TCPTransoport if it has no channel left, no difference between hard and soft if it has no channel
     * 
     * (8) reject all promises in Channel
     * 
     * (9) reset the channel state and search counter for soft destroy
     * 
     * (10) reconnect channel for soft destroy
     * 
     * (11) resubscribe all monitors for soft destroy
     * 
     */
    private destroy = async (option: "soft" | "hard") => {
        // (1), (2)
        if (option === "soft") {
            this.setState(Channel_STATES.DISCONNECTED);
        } else {
            this.setState(Channel_STATES.DESTROYED);
        }

        // (2)
        if (option === "soft") {
            this.destroySoftCallback();
        } else {
            this.destroyHardCallback();
        }

        // (3)
        this.send_CA_PROTO_CLEAR_CHANNEL();

        // (4)
        if (option === "soft") {
            this.destroyAllMonitorsSoft();
        } else {
            this.destroyAllMonitorsHard();
        }

        // (5)
        if (option === "hard") {
            delete this.getContext().getUnresolvedChannelsByName()[this.name];
            delete this.getContext().getUnresolvedChannelsByClientID()[this.getChannelClientID().toString()];
            delete this.getContext().getResolvedChannelsByClientID()[this.getChannelClientID().toString()];
            delete this.getContext().getResolvedChannelsByName()[this.name];
        } else {
            this.moveToUnresolvedChannelsGroup();
        }

        // (6)
        this.getContext().getReadWriteIos().rejectChannelIos(this.getName());

        // (7)
        this.getTcpTransport()?.removeChannel(this.name);
        this.getTcpTransport()?.destroyHard(); // must in between
        this.setTcpTransport(undefined);

        // (8)
        this.getPromises().rejectAll(`Channel ${this.getName()} destroyed ${option}`);

        if (option === "soft") {
            // (9) 
            this.setState(Channel_STATES.UNRESOLVED);
            this.resetSearchCounter();

            // (10)
            await this.getContext().createChannel(this.getName(), this.getCreationTimeout(), this.getServerSchedulingPriority());

            // (11)
            this.resumeAllMonitors();
        }

        GlobalMethods.infoLog(`Channel "${this.name}" destroyed ${option}ly.`);
    }

    // --------------------- setters and getters --------------------

    setChannelClientId = () => {
        const newId = this.getContext().getChannelClientID();
        this.channelClientID = newId;
        this.getContext().incrementChannelClientId();
    }

    setDestroySoftCallback = (callback: (() => void)) => {
        this.destroySoftCallback = callback;
    }
    setDestroyHardCallback = (callback: (() => void)) => {
        this.destroyHardCallback = callback;
    }

    public getName = (): string => {
        return this.name;
    };

    public getChannelClientID = (): number => {
        return this.channelClientID;
    };

    public setChannelServerID = (id: number) => {
        this.channelServerID = id;
    };
    public getChannelServerID = (): number => {
        return this.channelServerID;
    };

    public getServerSchedulingPriority = (): number => {
        return this.serverSchedulingPriority;
    };

    public getAccessRight = (): string => {
        return Channel_ACCESS_RIGHTS[this.accessRight];
    };

    public setAccessRight = (right: Channel_ACCESS_RIGHTS) => {
        this.accessRight = right;
    };

    public getStateNum = (): Channel_STATES => {
        return this.state;
    };

    public getStateStr = (): string => {
        return Channel_STATES[this.state];
    };

    public setState = (state: Channel_STATES) => {
        this.state = state;
    };

    public getPromises = () => {
        return this.promises;
    }

    getTcpTransport = (): TCPTransport | undefined => {
        return this.tcpTransport;
    };

    setTcpTransport = (newTransport: TCPTransport | undefined) => {
        this.tcpTransport = newTransport;
    }

    getState = () => {
        return this.state;
    }
    getMonitor = (subscriptionID: number): ChannelMonitor | undefined => {
        return this.getContext().getMonitorsBySubscriptionID()[subscriptionID.toString()];
    };

    getMonitors = () => {
        return this.monitors;
    }

    getPromiseObj = (name: string) => {
        return this.getPromises().get(name);
    };

    getContext = () => {
        return this.context;
    }

    getSubscriptionId = () => {
        return this.getTcpTransport()?.getSubscriptionId();
    };

    setSubscriptionId = (newId: number) => {
        this.getTcpTransport()?.setSubscriptionId(newId);
    };


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
    getCreationTimeout = () => {
        return this.creationTimeout;
    }

    public resetSearchCounter = () => {
        this.searchCounter = 0;
    };

    public get_CA_PROTO_SEARCH_msg = (): Buffer => {
        return this.CA_PROTO_SEARCH_msg;
    };

    // dbr

    getDbr = () => {
        return this.dbr;
    }

    getDbrData = (): type_dbrData => {
        return { ...this.getDbr().getMeta(), value: this.getDbr().getValue() };
    };

    public setDbrType = (type: Channel_DBR_TYPES) => {
        this.getDbr().setType(type);
    };

    // dbr types

    /**
     * @returns {Channel_DBR_TYPES} The **base** DBR type for the channel, i.e. value 0 to 6
     *                              If the channel is not defined, return -1
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
     */
    public getDbrType = (): Channel_DBR_TYPES => {
        return this.getDbrTypeNum();
    };

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
    public getDbrTypeStr = (): string => {
        return Channel_DBR_TYPES[this.getDbrTypeNum()];
    };

    public getDbrTypeNum = (): Channel_DBR_TYPES => {
        return this.getDbr().getType() % 7;
    };

    getDbrType_RAW = (): Channel_DBR_TYPES => {
        return this.getDbrTypeNum();
    }

    getDbrType_STS = (): Channel_DBR_TYPES => {
        return 7 + (this.getDbrTypeNum() % 7);
    }

    getDbrType_TIME = (): Channel_DBR_TYPES => {
        return 14 + (this.getDbrTypeNum() % 7);
    }

    getDbrType_GR = (): Channel_DBR_TYPES => {
        return 21 + (this.getDbrTypeNum() % 7);
    }

    getDbrType_CTRL = (): Channel_DBR_TYPES => {
        return 28 + (this.getDbrTypeNum() % 7);
    }


    getDbrTypeNum_RAW = (): Channel_DBR_TYPES => {
        return this.getDbrTypeNum();
    }

    getDbrTypeNum_STS = (): Channel_DBR_TYPES => {
        return 7 + (this.getDbrTypeNum() % 7);
    }

    getDbrTypeNum_TIME = (): Channel_DBR_TYPES => {
        return 14 + (this.getDbrTypeNum() % 7);
    }

    getDbrTypeNum_GR = (): Channel_DBR_TYPES => {
        return 21 + (this.getDbrTypeNum() % 7);
    }

    getDbrTypeNum_CTRL = (): Channel_DBR_TYPES => {
        return 28 + (this.getDbrTypeNum() % 7);
    }

    getDbrTypeStr_RAW = (): string => {
        return Channel_DBR_TYPES[this.getDbrTypeNum_RAW()];
    };

    getDbrTypeStr_STS = (): string => {
        return Channel_DBR_TYPES[this.getDbrTypeNum_STS()];
    };

    getDbrTypeStr_TIME = (): string => {
        return Channel_DBR_TYPES[this.getDbrTypeNum_TIME()];
    };

    getDbrTypeStr_GR = (): string => {
        return Channel_DBR_TYPES[this.getDbrTypeNum_GR()];
    };

    getDbrTypeStr_CTRL = (): string => {
        return Channel_DBR_TYPES[this.getDbrTypeNum_CTRL()];
    };


}

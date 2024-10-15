import { Buffer } from "buffer";

import { Context } from "../Context/Context";
import { TCPTransport } from "../TCPTransport/TCPTransport";
import { generateCAHeader, getStringPaddedSize, GlobalMethods, isExtendedMessageHeader, isPowerOfTwo } from "../Global/GlobalMethods";
import { ChannelMonitor, ChannelMonitor_STATES } from "./ChannelMonitor";
import { CA_COMMANDS, CA_MINOR_PROTOCOL_REVISION } from "../Global/Constants";
import { CA_MSG_HEADER_SIZE } from "../Global/Constants";
import { CA_MSG_HEADER_OFFSETS } from "../Global/Constants";
import { CA_EXT_MSG_HEADER_OFFSETS } from "../Global/Constants";
import { CA_EXT_MSG_HEADER_SIZE } from "../Global/Constants";
import { IO_TYPES } from "../Context/ReadWriteIos";
import { ChannelPromises } from "./ChannelPromises";

import { Dbr } from "./Dbr";
import { ECA_SEVERITIES } from "../ECA/ECA";
import { Timeouts } from "../Timeouts/Timeouts";

// todo: access right change listener


export type type_dbr_value = number | number[] | string | string[];

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
    NOT_AVAILABLE = -1, //todo: hot to handle this?
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
    createMonitor = async (
        subscribeTimeout: number | undefined = undefined,
        listener: ((monitor: ChannelMonitor) => void) | undefined = undefined,
        dbrType: Channel_DBR_TYPES = this.getDbrType_TIME(),
        valueCount: number = this.getValueCount(),
        mask: ChannelMonitor_MASKS = ChannelMonitor_MASKS.DBE_VALUE | ChannelMonitor_MASKS.DBE_ALARM,
        resubscribe: boolean = false,
        resubscribingMonitor: ChannelMonitor | undefined = undefined,
    ): Promise<ChannelMonitor | undefined> => {

        if (this.getState() !== Channel_STATES.CREATED) {
            GlobalMethods.errorLog(`${this.name}'s connection state is ${this.getStateStr()}, cannot monitor.`);
            return undefined;
        }

        if (dbrType === Channel_DBR_TYPES.NOT_AVAILABLE && resubscribe === false) {
            GlobalMethods.errorLog(`Cannot monitor ${this.getName()}: the desired DBR type is NOT_AVAILABLE`);
            return undefined;
        }

        const tcpTransport = this.getTcpTransport();
        if (tcpTransport === undefined) {
            GlobalMethods.errorLog(`No TCPTransport for channel ${this.getName()}, stop creating monitor`);
            return undefined;
        }

        let monitor: ChannelMonitor | undefined = resubscribingMonitor;
        if (resubscribe) {
            if (monitor === undefined) {
                GlobalMethods.errorLog(`Failed to resubscribe monitor for ${this.getName()}, the ChannelMonitor object does not exist`);
                return undefined;
            }
        } else {
            // (1)
            const subscriptionId = tcpTransport.obtainMonitorSubscriptionId();
            GlobalMethods.infoLog(`Creating a monitor for ${this.name} with subscription ID ${subscriptionId}`);

            // (2)
            monitor = new ChannelMonitor(this, subscribeTimeout, subscriptionId, dbrType, valueCount, listener, mask);

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
            GlobalMethods.infoLog(`Subscribing channel monitor ${this.getName()} failed.`)
            GlobalMethods.infoLog(e);
        }

        return monitor;
    };

    addMonitor = (newMonitor: ChannelMonitor) => {
        // ensure there is no exisiting monitor
        for (let monitor of this.getMonitors()) {
            if (monitor === newMonitor) {
                GlobalMethods.infoLog(`Channel monitor ${this.name} already exists`);
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
        GlobalMethods.infoLog(`Channel monitor ${this.name} already exists`);
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
        valueCount: number = this.getValueCount(),
    ): Promise<type_dbrData | undefined> => {
        if (this.getState() !== Channel_STATES.CREATED) {
            GlobalMethods.errorLog(`${this.name}'s connection state is ${this.getState()}, cannot get()`);
            return undefined;
        }

        if (typeof ioTimeout === "number" && ioTimeout < 0) {
            GlobalMethods.infoLog(`IO timeout is a negative number ${ioTimeout}, set it to 0. You may or may not get a value`);
            ioTimeout = 0;
        }

        if (dbrType < Channel_DBR_TYPES.DBR_STRING && dbrType > Channel_DBR_TYPES.DBR_CTRL_DOUBLE) {
            GlobalMethods.errorLog(`Wrong DBR type ${dbrType}, should be from ${Channel_DBR_TYPES.DBR_STRING} to ${Channel_DBR_TYPES.DBR_CTRL_DOUBLE}`);
            return;
        }

        if (valueCount < 0) {
            valueCount = 0;
        }

        GlobalMethods.infoLog(`Trying to get('${this.name}') from ${this.getTcpTransport()?.getServerAddress()}:${this.getTcpTransport()?.getServerPort()}`);

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
     * No matte what the user's input value's type, always try to encode the value to this channel's base DBR type
     * If the encoding fails, return undefined.
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
     * @returns {number | undefined} undefined if the operation fails, the IO ID for synchronous version (waitNotify = false), 
     *                               the ECA status code for asynchronous version (waitNotify = true).
     */
    put = async (
        newValue: type_dbr_value,
        ioTimeout: number | undefined = undefined,
        waitNotify: boolean = false
    ): Promise<number | undefined> => {

        if (this.getState() !== Channel_STATES.CREATED || this.getDbrType() === Channel_DBR_TYPES.NOT_AVAILABLE) {
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
                // resolved when the CA_PROTO_WRITE_NOTIFY replay arrives
                statusCode = await promiseObj;
            } catch (e) {
                GlobalMethods.errorLog(`Channel ${this.name} put() operation interrupted.`);
                GlobalMethods.errorLog(e);
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
    destroySoft = async (delaySearch: number = 1) => {
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
     * (2) run callback function 
     * 
     * (3) send CA_PROTO_CLEAR_CHANNEL to IOC
     * 
     * (4) reset Channel.Dbr by replacing it with a raw one
     * 
     * (5) destroy all monitors
     * 
     * (6) relocate this channel in Context's channels list
     * 
     * (7) clear all read/write IOs in Context
     * 
     * (8) decouple with TCPTransoport, 
     *     destroy the TCPTransoport if it has no channel left, no difference between hard and soft if it has no channel
     * 
     * (9) reject all promises in Channel
     * 
     * (10) reset the channel state to UNRESOLVED and search counter for soft destroy
     * 
     * (11) reconnect channel for soft destroy
     *
     * (12) resubscribe all monitors for soft destroy
     * 
     */
    private destroy = async (option: "soft" | "hard", delaySearch: number | undefined = undefined) => {
        // (1), (2)
        if (option === "soft") {
            if (this.getState() === Channel_STATES.DISCONNECTED) {
                return;
            }
            this.setState(Channel_STATES.DISCONNECTED);
        } else {
            if (this.getState() === Channel_STATES.DESTROYED) {
                return;
            }
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
        for (let monitor of this.getMonitors()) {
            if (option === "soft") {
                monitor.destroySoft();
            } else {
                monitor.destroyHard();
            }
        }

        // (5)
        this.dbr = new Dbr();


        // (6)
        if (option === "hard") {
            delete this.getContext().getUnresolvedChannelsByName()[this.name];
            delete this.getContext().getUnresolvedChannelsByClientID()[this.getChannelClientID().toString()];
            delete this.getContext().getResolvedChannelsByClientID()[this.getChannelClientID().toString()];
            delete this.getContext().getResolvedChannelsByName()[this.name];
        } else {
            this.moveToUnresolvedChannelsGroup();
        }

        // (7)
        this.getContext().getReadWriteIos().rejectChannelIos(this.getName());

        // (8)
        this.getTcpTransport()?.removeChannel(this.name);
        this.getTcpTransport()?.destroyHard(); // must in between
        this.setTcpTransport(undefined);

        // (9)
        this.getPromises().rejectAll(`Channel ${this.getName()} destroyed ${option}`);

        if (option === "soft") {
            
            // (10) 
            this.setState(Channel_STATES.UNRESOLVED);
            let newCount = 0;
            if (typeof delaySearch === "number") {
                const minSearchPeriod = this.getContext().getEnv("EPICS_CA_MIN_SEARCH_PERIOD");
                if (typeof minSearchPeriod === "number") {
                    newCount = Math.round(delaySearch / minSearchPeriod) * -1;
                }
            }
            this.resetSearchCounter(newCount);

            // (11)
            await this.getContext().createChannel(this.getName(), this.getCreationTimeout(), this.getServerSchedulingPriority());

            // (12)
            for (let monitor of this.getMonitors()) {
                monitor.resubscribe();
            }
        }

        GlobalMethods.infoLog(`Channel "${this.name}" destroyed ${option}ly.`);
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

}

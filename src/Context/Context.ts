import { Buffer } from "buffer";
import { Worker as worker_threads_Worker } from "worker_threads";

import { Environment } from "../Global/Environment";
import { GlobalMethods, type_log_levels } from "../Global/GlobalMethods";
import { UDPTransport } from "../UDPTransport/UDPTransport";
import { Channel, Channel_STATES } from "../Channel/Channel";
import { TCPTransports } from "../TCPTransport/TCPTransports";
import { type_environment_name } from "../Global/Environment";
import { type_environment_value } from "../Global/Environment";
import { TCPTransport } from "../TCPTransport/TCPTransport";
import { UDPTransportState } from "../UDPTransport/UDPTransport";
import { ContextPromises } from "./ContextPromises";
import { ReadWriteIos } from "./ReadWriteIos";
import { Intervals } from "../Intervals/Intervals";
import { Timeouts } from "../Timeouts/Timeouts";

/**
 * Life cycle of the context 
 */
export enum Context_STATES {
    NOT_INITIALIZED, // initial state
    INITIALIZING, // when Context.initialize() is running
    INITIALIZED, // Context.initialize() finishes successfully
    FAILED, // when UDP fails
    DESTROYED, // destroyed the whole thing
}


export type type_network_stats = {
    port?: number,
    state?: UDPTransportState,
    // # of packets
    packetsReceivedInLastSecond: number,
    packetsSentInLastSecond: number,
    // # of bytes
    bytesReceivedInLastSecond: number,
    bytesSentInLastSecond: number,
    // # of Channel Accesss messages, each packet may contain multiple of them
    caMessagesReceivedInLastSecond: number,
    caMessagesSentInLastSecond: number,
    // start time
    startTime: number,
    // end time
    endTime: number,
};

(BigInt.prototype as any).toJSON = function () {
    return Number(this);
};


export class Context {

    private state: Context_STATES = Context_STATES.NOT_INITIALIZED;

    private channelClientID: number = 0;

    // these 4 lists, there is another "resolvedChannelsByName" is TCPTransport.channels
    private resolvedChannelsByClientID: Record<string, Channel> = {};
    private resolvedChannelsByName: Record<string, Channel> = {};
    private unresolvedCaChannelsByClientID: Record<string, Channel> = {};
    private unresolvedCaChannelsByName: Record<string, Channel> = {};
    private unresolvedPvaChannelsByClientID: Record<string, Channel> = {};
    private unresolvedPvaChannelsByName: Record<string, Channel> = {};

    // PVA specific: record the PUT of this client.
    // key = `${ioID}`
    // value = Channel
    private putPvaHistory: Record<string, Channel> = {};
    private getPvaHistory: Record<string, Channel> = {};

    // asynchronous
    private contextPromises: ContextPromises = new ContextPromises();
    // CA_PROTO_READ_NOTIFY, CA_PROTO_WRITE_NOTIFY, and CA_PROTO_WRITE
    private readWriteIos: ReadWriteIos = ReadWriteIos.getInstance();
    private intervals: Intervals = new Intervals();
    // timeouts
    private timeouts: Timeouts = new Timeouts();

    // possibly multiple TCPTransports for a client
    private tcpTransports: TCPTransports;
    // one UDPTransport for a context
    private udpTransport: UDPTransport;

    private repeaterThread: Worker | worker_threads_Worker | undefined = undefined;
    private envInstance: Environment;

    constructor(userEnv: Record<string, string> = {},
        logLevel: type_log_levels = type_log_levels.error,
    ) {
        this.setLogLevel(logLevel);

        this.envInstance = Environment.getInstance(userEnv);

        this.tcpTransports = new TCPTransports();

        // only create socket, no binding or listening yet
        this.udpTransport = new UDPTransport(this);
    }

    /**
     * Initialize the Context. The prior state must be NOT_INITIALIZED
     * 
     * (0) set state to INITIALIZING
     * 
     * (1) start CA repeater process
     * 
     * (2) bind 2 UDP ports, one for CA/PVA communication, one for listening to PVA beacon signal
     *     start to listen to UDP messages, process new messages
     *     the program blocks here, it won't be able to run without UDP
     * 
     * (3) register to CA repeater, send 0x18 to CA repeater every second until replies
     * 
     * (4) start to search PVs
     * 
     * (5) start to periodically check if CA repeater exist
     *     if not, create the repeater and register it
     * 
     * (6) set state to INITIALIZED
     * 
     */
    initialize = async () => {

        // (0)
        if (this.getState() === Context_STATES.DESTROYED) {
            GlobalMethods.infoLog("Context destroyed, you cannot re-initialize a CA client context. Stop.");
            return;
        } else if (this.getState() === Context_STATES.INITIALIZED) {
            GlobalMethods.infoLog("Context already initialized.");
            return;
        } else if (this.getState() === Context_STATES.DESTROYED) {
            GlobalMethods.infoLog("Context failed, you cannot re-initialize a failed CA client context. Stop.");
            return;
        } else if (this.getState() === Context_STATES.INITIALIZING) {
            GlobalMethods.infoLog("Context is being initialized, please wait.");
            return;
        } else if (this.getState() === Context_STATES.NOT_INITIALIZED) {
            // normal case, continue
            GlobalMethods.infoLog("Initializing CA context");
        } else {
            return;
        }
        this.setState(Context_STATES.INITIALIZING);

        // (1)
        // do not have to block, the program can still run without CA repeater
        this.startCARepeater();

        // (2)
        // block until the UDP port is bound, we won't be able to do anything before UDP is up and running
        await this.bindAndListenToUdp();

        // (3)
        // do not have to block, the program can still run without registering to CA repeater
        this.getUdpTransport().registerToCARepeater();

        // (4)
        this.getUdpTransport().startToSearchBulkPVs();

        // (5)
        this.checkCaRepeater();

        // (6)
        this.setState(Context_STATES.INITIALIZED);

        GlobalMethods.infoLog("CA context initialization succeed!");
    };


    // ------------------------- UDP --------------------------------

    /**
     * 
     * Bind and start to listen to 2 UDP ports:
     * 
     * (1) a random UDP port for regular communication, start to listen to UDP messages, and to process these messages.
     *     this port is used for both CA and PVA
     * 
     * (2) a UDP port for listening to PVA beacons from IOC. The port number is EPICS_PVA_BROADCAST_PORT (default 5076).
     * 
     * If any error happens, destroy hard the context. The CA/PVA client cannot run without UDP.
     * 
     * The dgram socket is already created but not bound when the UDPTransport object is created.
     * 
     * (1) set state to INITIALIZING
     * 
     * (2) start to listen to "error" "close", and "message" events for general UDP socket
     *     any "error" or "close" event will hard destroy the Context
     *     the "message" event will call the UDP message handlers
     * 
     * (3) start to listen to "error" "close", and "message" events for PVA socket
     *     any "error" or "close" event will hard destroy the Context
     *     the "message" event will call the UDP message handlers
     * 
     * (4) bind the general UDP socket to an arbitrary port
     *     create a Promise that will resolve when the socket is bound
     *     if the binding fails, return this function, and destroy hard the context.
     * 
     * (5) bind the PVA beacon socket to EPICS_PVA_BROADCAST_PORT (default 5076)
     *     create a Promise that will resolve when the socket is bound
     *     if the binding fails, return this function, and destroy hard the context.
     * 
     * (6) wait for two UDP sockets to bind
     *     if any of the binding fails, return this function, and destroy hard the context.
     * 
     * (7) set UDPTransport state to INITIALIZED
     * 
     * (8) configure dgram socket and UDPTransport: 
     *     allow sending data to broadcast address
     *     save the dgram port
     */
    private bindAndListenToUdp = async () => {
        const udpTransport = this.getUdpTransport();

        // (1)
        if (udpTransport.getState() === UDPTransportState.NOT_INITIALIZED) {
            // normal case, continue
        } else if (udpTransport.getState() === UDPTransportState.INITIALIZED) {
            // already initialized
            return;
        } else if (udpTransport.getState() === UDPTransportState.INITIALIZED) {
            // already initialized
            return;
        } else if (udpTransport.getState() === UDPTransportState.DESTROYED) {
            // destroyed, do not re-create
            return;
        } else if (udpTransport.getState() === UDPTransportState.FAILED) {
            // failed, do not re-create
            return;
        }
        udpTransport.setState(UDPTransportState.INITIALIZING);

        // (2)
        udpTransport.getSocket().on("error", (error: any) => {
            udpTransport.handleDgramSocketError(error);
        });

        udpTransport.getSocket().on("close", (error: any) => {
            udpTransport.handleDgramSocketError(error);
        });

        // listen to udp messages
        udpTransport.getSocket().on("message", (msg: Buffer, info: Record<string, any>) => {
            udpTransport.messageHandler(msg, info);
        });

        // (3)
        udpTransport.getPvaBeaconSocket().on("error", (error: any) => {
            udpTransport.handleDgramSocketError(error);
        });

        udpTransport.getPvaBeaconSocket().on("close", (error: any) => {
            udpTransport.handleDgramSocketError(error);
        });

        // listen to udp messages
        udpTransport.getPvaBeaconSocket().on("message", (msg: Buffer, info: Record<string, any>) => {
            udpTransport.messageHandler(msg, info);
        });


        // (4)
        try {
            this.getContextPromises().append("UDP_TRANSPORT_BOUND");
            // bind to a random port
            udpTransport.getSocket().bind(
                () => {
                    GlobalMethods.debugLog("udp transport bound ...");
                    // lift the block below upon bound
                    this.getContextPromises().resolve("UDP_TRANSPORT_BOUND", "");
                }
            );
        } catch (e) {
            udpTransport.handleDgramSocketError(e);
            return;
        }

        // (5)
        let pvaBeaconPort = this.getEnv("EPICS_PVA_BROADCAST_PORT");
        if (typeof pvaBeaconPort !== "number") {
            pvaBeaconPort = 5076;
        }
        try {
            this.getContextPromises().append("UDP_TRANSPORT_BOUND_PVA_BEACON");
            // bind to a random port
            udpTransport.getPvaBeaconSocket().bind(
                pvaBeaconPort,
                () => {
                    GlobalMethods.debugLog("udp transport PVA beacon socket bound ...");
                    // lift the block below upon bound
                    this.getContextPromises().resolve("UDP_TRANSPORT_BOUND_PVA_BEACON", "");
                }
            );
        } catch (e) {
            udpTransport.handleDgramSocketError(e);
            return;
        }

        try {

            // (6)
            const promiseObj = this.getContextPromises().getPromise("UDP_TRANSPORT_BOUND");
            const promiseObjPvaBeacon = this.getContextPromises().getPromise("UDP_TRANSPORT_BOUND_PVA_BEACON");
            // lifted when both UDP sockets are bound
            await promiseObj;
            await promiseObjPvaBeacon;

            // (7)
            udpTransport.setState(UDPTransportState.INITIALIZED);

            // (8)
            udpTransport.getSocket().setBroadcast(true);
            udpTransport.setLocalPort(udpTransport.getSocket().address().port);
            udpTransport.setLocalAddress(udpTransport.getSocket().address().address);
            udpTransport.setPvaBeaconPort(udpTransport.getPvaBeaconSocket().address().port);

            GlobalMethods.infoLog("UDP transport successfully bound to port", udpTransport.getLocalPort());
        } catch (e) {
            udpTransport.handleDgramSocketError(e);
            return;
        }

    };


    // ------------------------ CA repeater -------------------------

    /**
     * Start CA repeater thread
     */
    private startCARepeater = () => {
        const port = this.getEnv("EPICS_CA_REPEATER_PORT");
        GlobalMethods.infoLog("Starting CARepeater on port", port);
        const thread = new worker_threads_Worker(__dirname + "/../CARepeater/runCARepeater.js",
            {
                workerData: {
                    port: port,
                },
            }
        );
        this.setRepeaterThread(thread);
        thread.on("error", (err: any) => {
            GlobalMethods.errorLog(err);
        });
        thread.on("exit", (err: any) => {
            GlobalMethods.errorLog(err);
        });
        thread.on("online", () => {
        })
    };


    /**
     * The lifecycle of CA repeater comes together with EPICS TCA (Context),
     * if the EPICS TCA is terminated from outside (e.g. pkill), then the CA repeater thread
     * is terminated automatically. If the EPICS TCA is destroyed gracefully (i.e. Context.destroyHard()), 
     * then we need to call this function.
     */
    quitCaRepeater = () => {
        this.getRepeaterThread()?.postMessage("quit");
    }

    /**
     * Periodically checks if the CA repeater is running. If not, start the CA repeater and register to it.
     */
    private checkCaRepeater = async () => {
        let period = this.getEnv("EPICS_CA_REPEATER_THREAD_CHECK_TIME");
        if (typeof period !== "number") {
            period = 20;
        }
        this.getIntervals().addInterval("CHECK_CA_REPEATER", period, async () => {
            let port = this.getEnv("CA_REPEATER_PORT");
            if (typeof port !== "number") {
                port = 5065;
            }
            const caRepeaterIsRunning = await UDPTransport.portIsBoundInUDP(port);
            GlobalMethods.debugLog("checking CA repeater", caRepeaterIsRunning, period)
            if (caRepeaterIsRunning === false && this.getUdpTransport().getState() === UDPTransportState.INITIALIZED) {
                this.startCARepeater();
                this.getUdpTransport().registerToCARepeater();
            }
        }, []);
        this.getIntervals().startInterval("CHECK_CA_REPEATER");
    }

    // ----------------------- channel ------------------------------

    /**
     * Create, find, and connect a channel.
     * 
     * (0) Set countdown timer if there is a timeout
     * 
     * (1) create a Channel object if necessary
     *     Channel state: --> UNRESOLVED
     * 
     * (2) start to search the PV, wait for reply of CA_PROTO_SEARCH
     *     Channel state: SEARCHING --> RESOLVED
     * 
     * (3) stop search if found the PV, i.e. stop broadcasting CA_PROTO_SEARCH
     * 
     * (4) create TCPTransport object if necessary
     *     TCPTransoprt state: --> NOT_CONNECTED
     * 
     * (5) connect TCP socket on IOC if necessary
     *     TCPTransoprt state: CONNECTING --> CONNECTED
     * 
     * (6) correlate the channel and TCPTransoprt
     * 
     * (7) send out then wait for handshake Channel Access messages if necessary
     *     this step is not blocked as for lower version (<= 11) CA server, the CA_PROTO_CREATE_CHAN must
     *     be sent together with the handshake messages
     *     TCPTransoprt state: --> GREETED
     * 
     * (8) send out then wait for CA_PROTO_CREATE_CHAN
     *     Channel state: --> CREATED
     * 
     * Any exception in above step will cause this function returning undefined, and causing 
     * hard destroy of this channel.
     * 
     * This function does not throw an exception.
     * 
     * @param {string} name Channel name
     * 
     * @param {"pva" | "ca"}  EPICS protocol to use, "pva" or "ca"
     * 
     * @param {number | undefined} Timeout for creation in unit of second. undefined means never timeout
     * 
     * @returns {Promise<Channel | undefined>} If failed, return undefined.
     * 
     */
    createChannel = async (
        name: string,
        protocol: "ca" | "pva",
        creationTimeout: number | undefined = undefined,
        serverSchedulingPriority: number = this.getEnv("EPICS_CA_SCHEDULING_PRIORITY_DEFAULT") as number,
    ) => {
        if (protocol === "pva") {
            return await this.createPvaChannel(name, creationTimeout, serverSchedulingPriority);
        } else {
            return await this.createCaChannel(name, creationTimeout, serverSchedulingPriority);
        }
    }

    private createPvaChannel = async (
        name: string, // must have a prefix pva://
        creationTimeout: number | undefined = undefined,
        serverSchedulingPriority: number = this.getEnv("EPICS_CA_SCHEDULING_PRIORITY_DEFAULT") as number,
    ): Promise<Channel | undefined> => {
        GlobalMethods.infoLog("Creating channel", name);
        // Context must have been initialized
        if (this.state !== Context_STATES.INITIALIZED) {
            GlobalMethods.errorLog("Context initialization failed, quit creating channel");
            return undefined;
        }

        let chan = this.getChannel(name, "pva");

        // if the channel already exists
        if (chan !== undefined) {
            // if the Context.createChannel() is invoked again before the previous invocation is resolved
            if (
                // the Context.createChannel() is invoked again when the channel is being searched,
                chan.getState() === Channel_STATES.SEARCHING ||
                // the Context.createChannel() is invoked again when this channel is found and being created: 
                // CA_PROTO_CREATE_CHAN is sent out, but we have not received the reply yet (not reached CREATED)
                chan.getState() === Channel_STATES.RESOLVED
            ) {
                try {
                    // in case multiple "createChannel()" methods are invoked at the same time, but
                    // the TCP connection has not been established yet
                    const promiseObj = this.getContextPromises().get(`CREATE_CHANNEL_${name}`);
                    // if the first createChannel() is reolved, "chan" is the same Channel object
                    // if rejected, catch the error and return undefined
                    chan = await promiseObj;
                    return chan;
                } catch (e) {
                    GlobalMethods.errorLog(`Error creating channel "${name}"`);
                    GlobalMethods.errorLog(e);
                    return undefined;
                }
            } else if (chan.getState() === Channel_STATES.CREATED) {
                // channel is already successfully created using Context.creatChannel()
                // it is running normally, just return it
                return chan;
            } else if (
                // error: these cases should never happen

                // channel is just created using "new Channel()", this case should never happen
                chan.getState() === Channel_STATES.UNRESOLVED ||
                // channel soft destroyed, its state should go to UNRESOLVED immediately in synchronous way
                chan.getState() === Channel_STATES.DISCONNECTED ||
                // this state is not set anywhere
                chan.getState() === Channel_STATES.FAILED ||
                // channel is destroyed hard, it should never be found using Context.getChannel()
                chan.getState() === Channel_STATES.DESTROYED
            ) {
                // error conditions, these cases should never happen
                GlobalMethods.errorLog(`Error creating channel ${name}, its current state ${chan.getStateStr()} is wrong.`)
                return chan;
            } else if (
                // the channel was just soft destroyed and this Context.createChannel() is
                // invoked immediately, just continue
                chan.getState() === Channel_STATES.RECREATING
            ) {
                // continue
            } else {
                // unknown case
                return undefined;
            }
        }

        // blocks at 2 places:
        //  - when Context.createChannel() is invoked for the second time
        //  - when Channel.destroySoft() is invoked during Context.creationChannel()
        // it is unique for each channel creation process
        this.getContextPromises().append(`CREATE_CHANNEL_${name}`, false, undefined);
        // in case there is no await
        const promiseTmp = this.getContextPromises().get(`CREATE_CHANNEL_${name}`);
        promiseTmp?.catch((e) => { })

        const creationFunction = async (): Promise<Channel> => {

            // (1)
            GlobalMethods.debugLog("--------------- step 1", name);
            if (chan === undefined) {
                chan = new Channel(this, name, "pva", creationTimeout, serverSchedulingPriority);
            }

            // (2)
            GlobalMethods.debugLog("--------------- step 2", name);
            await chan.startSearchPv();

            // (3)
            GlobalMethods.debugLog("--------------- step 3", name);
            chan.stopSearchPv();

            // (4)
            GlobalMethods.debugLog("--------------- step 4", name);
            const tcpTransport = chan.createTcpTransport();

            // (5)
            GlobalMethods.debugLog("--------------- step 5", name);
            await tcpTransport.connectSocket();

            // (6)
            GlobalMethods.debugLog("--------------- step 6", name);
            tcpTransport.associateChannel(chan);

            // (7)
            GlobalMethods.debugLog("--------------- step 7", name);
            await tcpTransport.handShakeWithIoc();

            // (8)
            GlobalMethods.debugLog("--------------- step 8", name);
            await chan.sendAndWait_CA_PVA_PROTO_CREATE_CHAN();

            // (9)
            GlobalMethods.debugLog("--------------- step 9", name);
            await chan.fetchPvaType();

            return chan;
        }

        try {

            if (creationTimeout === undefined) {
                // block here until the function finishes
                // the assign to "chan" is not necessary, just to let type check shut up
                chan = await creationFunction();
            } else {
                const timeoutPromise = new Promise<undefined>((resolve, reject) => {
                    setTimeout(() => {
                        reject(`Channel ${name} creation timeout, ${creationTimeout} seconds`);
                    }, creationTimeout * 1000);
                })

                // Note: the Promises that is left behind in Promise.race() continues to run
                // 
                //       So, if timeoutPromise rejects first, we must destroy the channel to release
                //       all its resources, and prevent any channel resolution/connection. Otherwise,
                //       it causes a textbook memory leak. The rejection of creationFunction() does not
                //       cause any thrown in this try...catch block, it is just forgotten. This is done
                //       in below destroyHard().
                // 
                //       If the creationFunction() resolves/rejects first, there is nothing specific 
                //       need to be done to clear timeoutPromise. When the timeoutPromise rejects, 
                //       it won't cause any thrown in this try...catch block, it is just forgotten.
                //
                await Promise.race([
                    timeoutPromise, // rejected after creationTimeout seconds
                    creationFunction(), // it is a Promise<void>, this Promise is resolved/rejected upon function finishes
                ]);
            }

        } catch (e) {
            GlobalMethods.errorLog("Error occured during channel creation:", e);
            // the message `Channel ${name} destroyed soft` is emitted when
            // the channel is being soft destroyed
            if (`${e}`.includes(`Channel ${name} destroyed soft`)) {
                // the channel is soft destroyed when it is being created
                // wait until the Promise is rejected or resolved
                const promiseObj = this.getContextPromises().get(`CREATE_CHANNEL_${name}`);
                try {
                    await promiseObj;
                } catch (e) {
                    return undefined;
                }
            } else {
                // there is something really wrong or timeout during channel creation
                // this error is non-recoverable, we should destroy hard this channel 
                // and return undefined
                // We won't even try to re-create the channel

                // if there is another Context.createChannel() running and blocked awaiting this Promise
                // we provide this 
                this.getContextPromises().reject(`CREATE_CHANNEL_${name}`, undefined);

                chan?.destroyHard();
                return undefined;
            }
        }

        this.getContextPromises().resolve(`CREATE_CHANNEL_${name}`, chan);

        return chan;
    };

    private createCaChannel = async (
        name: string,
        creationTimeout: number | undefined = undefined,
        serverSchedulingPriority: number = this.getEnv("EPICS_CA_SCHEDULING_PRIORITY_DEFAULT") as number,
    ): Promise<Channel | undefined> => {
        GlobalMethods.infoLog("Creating channel", name);
        // Context must have been initialized
        if (this.state !== Context_STATES.INITIALIZED) {
            GlobalMethods.errorLog("Context initialization failed, quit creating channel");
            return undefined;
        }

        let chan = this.getChannel(name, "ca");

        // if the channel already exists
        if (chan !== undefined) {
            // if the Context.createChannel() is invoked again before the previous invocation is resolved
            if (
                // the Context.createChannel() is invoked again when the channel is being searched,
                chan.getState() === Channel_STATES.SEARCHING ||
                // the Context.createChannel() is invoked again when this channel is found and being created: 
                // CA_PROTO_CREATE_CHAN is sent out, but we have not received the reply yet (not reached CREATED)
                chan.getState() === Channel_STATES.RESOLVED
            ) {
                try {
                    // in case multiple "createChannel()" methods are invoked at the same time, but
                    // the TCP connection has not been established yet
                    const promiseObj = this.getContextPromises().get(`CREATE_CHANNEL_${name}`);
                    // if the first createChannel() is reolved, "chan" is the same Channel object
                    // if rejected, catch the error and return undefined
                    chan = await promiseObj;
                    return chan;
                } catch (e) {
                    GlobalMethods.errorLog(`Error creating channel "${name}"`);
                    GlobalMethods.errorLog(e);
                    return undefined;
                }
            } else if (chan.getState() === Channel_STATES.CREATED) {
                // channel is already successfully created using Context.creatChannel()
                // it is running normally, just return it
                return chan;
            } else if (
                // error: these cases should never happen

                // channel is just created using "new Channel()", this case should never happen
                chan.getState() === Channel_STATES.UNRESOLVED ||
                // channel soft destroyed, its state should go to UNRESOLVED immediately in synchronous way
                chan.getState() === Channel_STATES.DISCONNECTED ||
                // this state is not set anywhere
                chan.getState() === Channel_STATES.FAILED ||
                // channel is destroyed hard, it should never be found using Context.getChannel()
                chan.getState() === Channel_STATES.DESTROYED
            ) {
                // error conditions, these cases should never happen
                GlobalMethods.errorLog(`Error creating channel ${name}, its current state ${chan.getStateStr()} is wrong.`)
                return chan;
            } else if (
                // the channel was just soft destroyed and this Context.createChannel() is
                // invoked immediately, just continue
                chan.getState() === Channel_STATES.RECREATING
            ) {
                // continue
            } else {
                // unknown case
                return undefined;
            }
        }

        // blocks at 2 places:
        //  - when Context.createChannel() is invoked for the second time
        //  - when Channel.destroySoft() is invoked during Context.creationChannel()
        // it is unique for each channel creation process
        this.getContextPromises().append(`CREATE_CHANNEL_${name}`, false, undefined);
        // in case there is no await
        const promiseTmp = this.getContextPromises().get(`CREATE_CHANNEL_${name}`);
        promiseTmp?.catch((e) => { })

        const creationFunction = async (): Promise<Channel> => {

            // (1)
            GlobalMethods.debugLog("--------------- step 1", name);
            if (chan === undefined) {
                chan = new Channel(this, name, "ca", creationTimeout, serverSchedulingPriority);
            }

            // (2)
            GlobalMethods.debugLog("--------------- step 2", name);
            await chan.startSearchPv();

            // (3)
            GlobalMethods.debugLog("--------------- step 3", name);
            chan.stopSearchPv();

            // (4)
            GlobalMethods.debugLog("--------------- step 4", name);
            const tcpTransport = chan.createTcpTransport();

            // (5)
            GlobalMethods.debugLog("--------------- step 5", name);
            await tcpTransport.connectSocket();

            // (6)
            GlobalMethods.debugLog("--------------- step 6", name);
            tcpTransport.associateChannel(chan);

            // (7)
            GlobalMethods.debugLog("--------------- step 7", name);
            tcpTransport.handShakeWithIoc();

            // (8)
            GlobalMethods.debugLog("--------------- step 8", name);
            await chan.sendAndWait_CA_PVA_PROTO_CREATE_CHAN();

            return chan;
        }

        try {

            if (creationTimeout === undefined) {
                // block here until the function finishes
                // the assign to "chan" is not necessary, just to let type check shut up
                chan = await creationFunction();
            } else {
                const timeoutPromise = new Promise<undefined>((resolve, reject) => {
                    setTimeout(() => {
                        reject(`Channel ${name} creation timeout, ${creationTimeout} seconds`);
                    }, creationTimeout * 1000);
                })

                // Note: the Promises that is left behind in Promise.race() continues to run
                // 
                //       So, if timeoutPromise rejects first, we must destroy the channel to release
                //       all its resources, and prevent any channel resolution/connection. Otherwise,
                //       it causes a textbook memory leak. The rejection of creationFunction() does not
                //       cause any thrown in this try...catch block, it is just forgotten. This is done
                //       in below destroyHard().
                // 
                //       If the creationFunction() resolves/rejects first, there is nothing specific 
                //       need to be done to clear timeoutPromise. When the timeoutPromise rejects, 
                //       it won't cause any thrown in this try...catch block, it is just forgotten.
                //
                await Promise.race([
                    timeoutPromise, // rejected after creationTimeout seconds
                    creationFunction(), // it is a Promise<void>, this Promise is resolved/rejected upon function finishes
                ]);
            }

        } catch (e) {
            GlobalMethods.errorLog("Error occured during channel creation:", e);
            // the message `Channel ${name} destroyed soft` is emitted when
            // the channel is being soft destroyed
            if (`${e}`.includes(`Channel ${name} destroyed soft`)) {
                // the channel is soft destroyed when it is being created
                // wait until the Promise is rejected or resolved
                const promiseObj = this.getContextPromises().get(`CREATE_CHANNEL_${name}`);
                try {
                    await promiseObj;
                } catch (e) {
                    return undefined;
                }
            } else {
                // there is something really wrong or timeout during channel creation
                // this error is non-recoverable, we should destroy hard this channel 
                // and return undefined
                // We won't even try to re-create the channel

                // if there is another Context.createChannel() running and blocked awaiting this Promise
                // we provide this 
                this.getContextPromises().reject(`CREATE_CHANNEL_${name}`, undefined);

                chan?.destroyHard();
                return undefined;
            }
        }

        this.getContextPromises().resolve(`CREATE_CHANNEL_${name}`, chan);

        return chan;
    };

    // ---------------------- beacon ------------------------

    /**
     * Default beacon anomaly callback.
     * 
     * This function is invoked whenever a beacon anomaly is detected.
     * 
     * In CA, this method is invoked in Beacon.updatePeriod()
     * 
     * In PVA, this method is invoked in UDPTransport.handle_PVA_PROTO_BEACON()
     * 
     * We can change the beacon anomaly callback using Context.setBeaconAnomalyCallback()
     */
    beaconAnomalyCallback = () => {
        GlobalMethods.errorLog("beaconAnomalyNotify fired: restart search() for unresolved channels");
        for (let pvName in this.getUnresolvedCaChannelsByName()) {
            const unresolvedChannel = this.getUnresolvedCaChannelsByName()[pvName];
            // speed up unresolved channel search rate
            unresolvedChannel.resetSearchCounter();
        }
        for (let pvName in this.getUnresolvedPvaChannelsByName()) {
            const unresolvedChannel = this.getUnresolvedPvaChannelsByName()[pvName];
            // speed up unresolved channel search rate
            unresolvedChannel.resetSearchCounter();
        }
    }

    /**
     * Change callback function for current and future beacons.
     * 
     * If the beacon anomaly callback is not defined, it will use the default one: boost the PV search
     */
    setBeaconAnomalyCallback = (newCallback: (() => void)) => {
        this.beaconAnomalyCallback = newCallback;
        for (const beacon of Object.values(this.getUdpTransport().getBeacons())) {
            beacon.setBeaconAnomalyCallback(newCallback);
        }
    }

    // -------------------- destroy -------------------------

    /**
     * Destroy hard the Context. 
     * 
     * There is no destroySoft for Context. Once it is destroyed, nothing can be recovered.
     * 
     * (0) set state to Context_STATES.DESTROYED
     * 
     * (1) reject Promises
     * 
     * (2) clear all intervals
     * 
     * (2) clear all timeouts
     * 
     * (3) reject all read/write IO promises
     *     step (5) will destroy all read/write IOs for each channel again,
     *     let's do it in here first to ensure there is no forgotten read/write IO not rejected
     * 
     * (4) quit CA repeater thread
     * 
     * (5) destroy all channels hard
     * 
     * (6) terminate CA Repeater thread
     * 
     * (7) close all TCPTransoport
     * 
     * (8) close all UDPTransport
     * 
     * (9) destroy Environment
     * 
     */
    public destroyHard = () => {
        GlobalMethods.infoLog("destroy hard context ...")

        // (0)
        if (this.getState() === Context_STATES.DESTROYED) {
            // already destroyed, no need to continue
            return;
        } else {
            // normal case, continue
        }
        this.setState(Context_STATES.DESTROYED);

        // (1)
        this.getContextPromises().rejectAll("Context destroyed hard");

        // (2)
        this.getIntervals().clearAllIntervals();

        // (2)
        this.getTimeouts().clearAllTimeouts();

        // (3)
        this.getReadWriteIos().rejectAllIos("Context destroyed hard");

        // (4)
        this.quitCaRepeater();

        // (5)
        this.destroyAllChannelsHard();

        // (6)
        this.repeaterThread?.postMessage("terminate");

        // (7)
        this.getTcpTransports().destroyHard();

        // (8)
        this.getUdpTransport().destroyHard();

        // (9)
        Environment.destroyHard();
    };

    private destroyAllChannelsHard = () => {
        for (const channelName in this.unresolvedCaChannelsByName) {
            const channel = this.unresolvedCaChannelsByName[channelName];
            channel.destroyHard();
        }
        for (const channelName in this.unresolvedPvaChannelsByName) {
            const channel = this.unresolvedPvaChannelsByName[channelName];
            channel.destroyHard();
        }
        for (const channelName in this.resolvedChannelsByName) {
            const channel = this.resolvedChannelsByName[channelName];
            channel.destroyHard();
        }
    };


    // ----------------- getters ---------------------

    getState = () => {
        return this.state;
    }

    setState = (newState: Context_STATES) => {
        this.state = newState;
    }

    getRepeaterThread = () => {
        return this.repeaterThread;
    }

    setRepeaterThread = (newThread: Worker | worker_threads_Worker | undefined) => {
        this.repeaterThread = newThread;
    }


    public getEnv = (envName: string = ""): type_environment_value | Record<type_environment_name, type_environment_value> | undefined => {
        return this.envInstance?.getEnv(envName);
    };

    public getEnvSource = () => {
        return this.envInstance?.getEnvSource();
    };

    public getUdpTransport = () => {
        return this.udpTransport;
    }
    public getContextPromises = () => {
        return this.contextPromises;
    }

    getTCPTransport = (key: string): TCPTransport | undefined => {
        return this.getTcpTransports().getTCPTransport(key);
    };

    getChannel = (nameOrClientID: number | string,
        protocol: "ca" | "pva",
    ) => {
        const nameOrClientIDStr = `${nameOrClientID}`;

        if (this.resolvedChannelsByClientID[nameOrClientIDStr] !== undefined) {
            const channel = this.resolvedChannelsByClientID[nameOrClientIDStr];
            if (channel.getProtocol() === protocol) {
                return channel;
            }
        }

        if (protocol === "ca") {
            if (this.unresolvedCaChannelsByClientID[nameOrClientIDStr] !== undefined) {
                return this.unresolvedCaChannelsByClientID[nameOrClientIDStr];
            }
        }

        if (protocol === "pva") {
            if (this.unresolvedPvaChannelsByClientID[nameOrClientIDStr] !== undefined) {
                return this.unresolvedPvaChannelsByClientID[nameOrClientIDStr];
            }
        }
        return undefined;
    }

    getReadWriteIos = () => {
        return this.readWriteIos;
    }

    getResolvedChannelsByClientID = () => {
        return this.resolvedChannelsByClientID;
    }
    getResolvedChannelsByName = () => {
        return this.resolvedChannelsByName;
    }
    getUnresolvedCaChannelsByClientID = () => {
        return this.unresolvedCaChannelsByClientID;
    }
    getUnresolvedCaChannelsByName = () => {
        return this.unresolvedCaChannelsByName;
    }
    getUnresolvedPvaChannelsByClientID = () => {
        return this.unresolvedPvaChannelsByClientID;
    }
    getUnresolvedPvaChannelsByName = () => {
        return this.unresolvedPvaChannelsByName;
    }

    // getMonitorsBySubscriptionID = () => {
    //     return this.monitorsBySubscriptionID;
    // }

    getChannelClientID = () => {
        return this.channelClientID;
    }

    getTcpTransports = () => {
        return this.tcpTransports;
    }

    getIntervals = () => {
        return this.intervals;
    }

    incrementChannelClientId = () => {
        this.channelClientID++;
    }

    getEnvInstance = () => {
        return this.envInstance;
    }

    getTimeouts = () => {
        return this.timeouts;
    }

    getBeaconAnomalyCallback = () => {
        return this.beaconAnomalyCallback;
    }

    /**
     * Get network statistics for all UDP and TCP application layer data
     * 
     * They update **roughly** every second.
     */
    getNetworkStats = () => {
        const result: {
            udp: type_network_stats,
            tcp: Record<string, type_network_stats>
        } = {
            udp: this.getUdpTransport().getNetworkStats(),
            tcp: this.getTcpTransports().getNetworkStats(),
        }
        return result;
    }

    getPutPvaHistoryChannel = (ioID: number): Channel | undefined => {
        return this.putPvaHistory[`${ioID}`];
    }

    registerPutPvaHistoryChannel = (ioID: number, channel: Channel) => {
        this.putPvaHistory[`${ioID}`] = channel;
    }

    removePutPvaHistoryChannel = (ioID: number | Channel) => {
        return this.putPvaHistory[`${ioID}`];
    }


    getGetPvaHistoryChannel = (ioID: number): Channel | undefined => {
        return this.getPvaHistory[`${ioID}`];
    }

    registerGetPvaHistoryChannel = (ioID: number, channel: Channel) => {
        this.getPvaHistory[`${ioID}`] = channel;
    }

    removeGetPvaHistoryChannel = (ioID: number | Channel) => {
        return this.getPvaHistory[`${ioID}`];
    }

    setLogLevel = (logLevel: type_log_levels) => {
        GlobalMethods.logLevel = logLevel;
    }

}

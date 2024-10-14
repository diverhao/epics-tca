import { Buffer } from "buffer";
import { Worker as worker_threads_Worker } from "worker_threads";

import { Environment } from "../Global/Environment";
import { ChannelMonitor } from "../Channel/ChannelMonitor";
import { GlobalMethods } from "../Global/GlobalMethods";
import { UDPTransport } from "../UDPTransport/UDPTransport";
import { Channel, Channel_STATES } from "../Channel/Channel";
import { TCPTransports } from "../TCPTransport/TCPTransports";
import { type_environment_name } from "../Global/Environment";
import { type_environment_value } from "../Global/Environment";
import { TCPTransport, TCPTransport_STATES } from "../TCPTransport/TCPTransport";
import { UDPTransportState } from "../UDPTransport/UDPTransport";
import { ContextPromises } from "./ContextPromises";
import { ReadWriteIos } from "./ReadWriteIos";
import { Intervals } from "../Intervals/Intervals";

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


export class Context {

    private state: Context_STATES = Context_STATES.NOT_INITIALIZED;

    private channelClientID: number = 0;

    // these 4 lists, there is another "resolvedChannelsByName" is TCPTransport.channels
    private resolvedChannelsByClientID: Record<string, Channel> = {};
    private resolvedChannelsByName: Record<string, Channel> = {};
    private unresolvedChannelsByClientID: Record<string, Channel> = {};
    private unresolvedChannelsByName: Record<string, Channel> = {};

    // Promise
    private contextPromises: ContextPromises = new ContextPromises();
    // CA_PROTO_READ_NOTIFY, CA_PROTO_WRITE_NOTIFY, and CA_PROTO_WRITE
    private readWriteIos: ReadWriteIos = ReadWriteIos.getInstance();
    private intervals: Intervals = new Intervals();

    // possibly multiple TCPTransports for a client
    private tcpTransports: TCPTransports;
    // one UDPTransport for a context
    private udpTransport: UDPTransport;

    private repeaterThread: Worker | worker_threads_Worker | undefined = undefined;
    private envInstance: Environment;

    constructor(userEnv: Record<string, string> = {}) {
        const showAllInfo = false;
        GlobalMethods.DEBUG = showAllInfo;
        GlobalMethods.SHOWINFO = showAllInfo;
        GlobalMethods.SHOWERROR = true;

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
     * (2) bind a UDP port, start to listen to UDP messages, process new messages
     *     the program blocks here, it won't be able to run without UDP
     * 
     * (3) register to CA repeater, send 0x18 to CA repeater every second until replies
     * 
     * (4) start to search PVs
     * 
     * (5) start to periodically check if CA repeater exist
     * 
     * (6) set state to INITIALIZED
     * 
     */
    initialize = async () => {
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
        } else {
            GlobalMethods.infoLog("Initializing CA context");
        }

        // (0)
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
     * Bind a random UDP port, start to listen to UDP messages, and to process these messages.
     */
    private bindAndListenToUdp = async () => {
        const udpTransport = this.getUdpTransport();
        if (udpTransport.getState() !== UDPTransportState.NOT_INITIALIZED) {
            GlobalMethods.errorLog(`Failed to bind UDPTransport socket: the UDPTransport state is ${udpTransport.getState()}. It must be NOT_INITIALIZED.`);
            return;
        }

        udpTransport.setState(UDPTransportState.INITIALIZING);

        udpTransport.getSocket().on("error", (error: any) => {
            GlobalMethods.errorLog(`${this.udpTransport.getSocket().address()} error: ${error}`);
            udpTransport.setState(UDPTransportState.FAILED);
            // we cannot run a CA client without UDP
            this.setState(Context_STATES.FAILED);
            GlobalMethods.errorLog(`UDPTransport socket error: ${error}.`, "This error is non-recoverable, quit runnign this CA client");
        });

        // listen to udp messages
        udpTransport.getSocket().on("message", async (msg: Buffer, info: Record<string, any>) => {
            await this.udpTransport.messageHandler(msg, info);
        });

        try {
            this.getContextPromises().append("UDP_TRANSPORT_BOUND");
            // bind to a random port
            udpTransport.getSocket().bind(
                () => {
                    // lift the block below upon bound
                    this.getContextPromises().resolve("UDP_TRANSPORT_BOUND", "");
                }
            );
        } catch (e) {
            udpTransport.setState(UDPTransportState.FAILED);
            // we cannot run a CA client without UDP
            this.setState(Context_STATES.FAILED);
            GlobalMethods.errorLog(`UDPTransport socket binding failure. ${e}.`, "This error is non-recoverable, quit runnign this CA client");
        }

        try {
            const promiseObj = this.getContextPromises().getPromise("UDP_TRANSPORT_BOUND");
            // lifted when UDP socket binds to a port
            await promiseObj;

            udpTransport.setState(UDPTransportState.INITIALIZED);
            // allow sending data to broadcast address
            udpTransport.getSocket().setBroadcast(true);
            udpTransport.setLocalPort(udpTransport.getSocket().address().port);
            udpTransport.setLocalAddress(udpTransport.getSocket().address().address);
            GlobalMethods.infoLog("UDP transport successfully bound to port", udpTransport.getLocalPort());
        } catch (e) {
            udpTransport.setState(UDPTransportState.FAILED);
            // we cannot run a CA client without UDP
            this.setState(Context_STATES.FAILED);
            GlobalMethods.errorLog(`UDPTransport socket binding failure. ${e}.`, "This error is non-recoverable, quit runnign this CA client");
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
     *     TCPTransoprt state: --> GREETED
     * 
     * (8) send out then wait for CA_PROTO_CREATE_CHAN
     *     Channel state: --> CREATED
     * 
     * Any exception in above step will cause this function returning undefined, and causing 
     * soft destroy of this channel.
     * 
     * This function does not throw an exception.
     * 
     * @param {string} name Channel name
     * 
     * @param {number | undefined} Timeout for creation in unit of second. undefined means never timeout
     * 
     */
    createChannel = async (
        name: string,
        creationTimeout: number | undefined = undefined,
        serverSchedulingPriority: number = this.getEnv("EPICS_CA_SCHEDULING_PRIORITY_DEFAULT") as number
    ): Promise<Channel | undefined> => {
        // Context must have been initialized
        if (this.state !== Context_STATES.INITIALIZED) {
            GlobalMethods.errorLog("Context initialization failed, quit creating channel");
            return undefined;
        }
        // if the channel already exists
        let chan = this.getChannel(name, serverSchedulingPriority);
        if (chan !== undefined) {
            try {
                // in case multiple "createChannel()" methods are invoked at the same time, but
                // the TCP connection has not been established yet
                await chan.getPromises().get("CA_PROTO_CREATE_CHAN");
            } catch (e) {
                GlobalMethods.errorLog(`Error creating channel "${name}"`);
                GlobalMethods.errorLog(e);
                return undefined;
            }
            GlobalMethods.infoLog(`Channel "${name} already created.`);
            return chan;
        }

        const creationFunction = async (): Promise<Channel> => {
            // (1)
            console.log("--------------- step 1");
            chan = new Channel(this, name, creationTimeout, serverSchedulingPriority);

            // (2)
            console.log("--------------- step 2");
            const [serverAddress, serverTcpPort] = await chan.startSearchPv();

            // (3)
            console.log("--------------- step 3", serverAddress, serverTcpPort);
            chan.stopSearchPv();

            // (4)
            console.log("--------------- step 4");
            const tcpTransport = chan.createTcpTransport(serverTcpPort, serverAddress);

            // (5)
            console.log("--------------- step 5");
            await tcpTransport.connectSocket();

            // (6)
            console.log("--------------- step 6");
            const isTcpTransportFirstChannel = Object.keys(tcpTransport.getChannels()).length === 0;
            tcpTransport.associateChannel(chan);

            // (7)
            console.log("--------------- step 7");
            if (isTcpTransportFirstChannel) {
                tcpTransport.handShakeWithIoc();
            } else {
                await tcpTransport.handShakeWithIoc();
            }

            // (8)
            console.log("--------------- step 8");
            await chan.sendAndWait_CA_PROTO_CREATE_CHAN();

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

            // ------- old stuff, don't touch -----
            // await chan.createTCP();
            // await chan.create();
        } catch (e) {
            if (creationTimeout === undefined) {
                // todo: if the channel creation fails, continue to re-create it, how to?
                // todo: it should clean up all the Promises and Intervals upon failure
                // todo: destroy soft of this channel
                GlobalMethods.errorLog(`Error creating channel "${name}"`);
                GlobalMethods.errorLog(e);
            } else {
                chan?.destroyHard();
            }
            return undefined;
        }
        return chan;
    };

    /**
     * Create multiple channels
     * 
     * It is a synchronous function, the returned object is updated after return
     */
    // 
    // if the channel is not created, its value is undefined
    createChannels = (names: string[], serverSchedulingPriority: number = this.getEnv("EPICS_CA_SCHEDULING_PRIORITY_DEFAULT") as number) => {
        const channels: Record<string, Channel | undefined> = {};
        for (let name of names) {
            channels[name] = undefined;
            this.createChannel(name, serverSchedulingPriority).then((channel: Channel | undefined) => {
                channels[name] = channel;
            });
        }
        return channels;
    };



    // -------------------- destroy -------------------------

    // stop the running of Context, different from Context.terminate()
    // (1) reject Promises
    // (1) clear all intervals
    // (2) quit CA repeater thread
    // (3) destroy all channels, which also stop all unresolved channel searches and reject all read/write IOs
    // (4) terminate CA Repeater thread
    // (6) close all TCP
    // (7) close all UDP
    // (9) destroy Environment, prepare for next "new Context(...)"
    // (10) set the state
    // Note: there is no destroySoft() in here.
    public destroyHard = () => {
        // (1)
        this.getContextPromises().rejectAll("Context destroyed hard");
        // (1)
        this.getIntervals().clearAllIntervals();
        // (2)
        this.quitCaRepeater();
        // (3)
        this.destroyAllChannelsHard();
        // (4)
        this.repeaterThread?.postMessage("terminate");
        // (6)
        this.getTcpTransports().destroyHard();
        // (7)
        this.getUdpTransport().destroyHard();
        // (9)
        Environment.destroyHard();
        // (10)
        this.setState(Context_STATES.DESTROYED);
    };

    private destroyAllChannelsHard = () => {
        for (const channelName in this.unresolvedChannelsByName) {
            const channel = this.unresolvedChannelsByName[channelName];
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

    private setState = (newState: Context_STATES) => {
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
        return this.tcpTransports.getTCPTransport(key);
    };

    getChannel = (nameOrClientID: number | string,
        serverSchedulingPriority: number = this.getEnv("EPICS_CA_SCHEDULING_PRIORITY_DEFAULT") as number
    ) => {
        if (typeof nameOrClientID === "number") {
            const clientID = nameOrClientID;
            if (this.unresolvedChannelsByClientID[clientID.toString()] !== undefined) {
                return this.unresolvedChannelsByClientID[clientID.toString()];
            }
            if (this.resolvedChannelsByClientID[clientID.toString()] !== undefined) {
                return this.resolvedChannelsByClientID[clientID.toString()];
            }
            return undefined;

        } else {
            const name = nameOrClientID;
            if (this.unresolvedChannelsByName[name] !== undefined) {
                return this.unresolvedChannelsByName[name];
            }
            if (this.resolvedChannelsByName[name] !== undefined) {
                return this.resolvedChannelsByName[name];
            }
            return undefined;

        }
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
    getUnresolvedChannelsByClientID = () => {
        return this.unresolvedChannelsByClientID;
    }
    getUnresolvedChannelsByName = () => {
        return this.unresolvedChannelsByName;
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
}

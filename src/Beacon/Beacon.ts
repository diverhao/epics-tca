import { GlobalMethods } from "../Global/GlobalMethods";
import { Environment } from "../Global/Environment";
import { Timeouts } from "../Timeouts/Timeouts";

const DEBUG = false;

/**
 * Representing the beacon from a Channel Access server
 * 
 * Beacon object is identified by the CA server address and TCP port
 * 
 */
export class Beacon {
    // TCP server's port and address
    private serverPort: number;
    private serverAddress: string;

    // beacon time/period
    private lastBeaconTime: number; // milli-second
    private lastBeaconId: number;
    private periodStablized: boolean;
    private averageBeaconPeriod: number;

    // unique identifier 
    private beaconKey: string;
    private guid: string = "";

    private caProtocolVersionOrChangeCount: number;
    readonly Number_MIN_VALUE: number = -3000000000000; // about 100 years
    private beaconAnomalyCallback: () => void;
    private timeouts: Timeouts;

    constructor(serverPort: number, serverAddress: string, beaconAnomalyCallback: () => void, serverCaVersionOrChangeCount: number, guid: string = "") {
        this.beaconAnomalyCallback = beaconAnomalyCallback;
        this.caProtocolVersionOrChangeCount = serverCaVersionOrChangeCount;
        this.guid = guid;
        this.serverPort = serverPort;
        this.serverAddress = serverAddress;
        this.lastBeaconTime = this.Number_MIN_VALUE;
        this.lastBeaconId = -1;
        this.periodStablized = false;
        this.averageBeaconPeriod = this.Number_MIN_VALUE;
        this.beaconKey = Beacon.generateBeaconKey(serverPort, serverAddress);
        this.timeouts = new Timeouts();
    }


    beaconArrivalCallback = (thisBeaconID: number) => {
        // does nothing
    };


    updatePeriod = (thisBeaconID: number): boolean => {
        if (DEBUG) {
            console.log("=============++++++++++++++++++ this beacon ID", thisBeaconID);
        }
        // clear old timer
        this.getTimeouts().clearTimeout("Beacon_destroy");
        // add and start new timer
        this.getTimeouts().addTimeout(
            "Beacon_destroy",
            (this.getEnv("EPICS_CA_BEACON_TIMEOUT") as number) * 2,
            this.destroy,
            []
        );
        this.getTimeouts().startTimeout("Beacon_destroy");

        // calculate and handl beacon anomaly
        let thisBeaconTime = Date.now();

        // 1st beacon since this object created, returns early
        if (this.getLastBeaconTime() === this.Number_MIN_VALUE) {
            if (DEBUG) {
                console.log("=============++++++++++++++++++ 1st fresh beacon")
            }
            // 1st beacon is always an anomaly
            this.beaconAnomalyCallback();
            if (this.getCaProtocolVersion() >= 10) {
                this.setLastBeaconId(thisBeaconID);
            }
            this.setLastBeaconTime(thisBeaconTime);
            this.beaconArrivalCallback(thisBeaconID);
            return false;
        }


        // newer version EPICS server
        if (this.getCaProtocolVersion() >= 10) {
            let beaconIDAdvance;
            // normal situation
            if (thisBeaconID >= this.getLastBeaconId()) {
                beaconIDAdvance = thisBeaconID - this.getLastBeaconId();
            } else {
                // beacon id overflow 4-byte space
                beaconIDAdvance = 0xffffffff - this.getLastBeaconId() + thisBeaconID;
            }

            this.setLastBeaconId(thisBeaconID);

            // beacon ID not changing, network is considered as not changed
            if (beaconIDAdvance === 0 || beaconIDAdvance > 0xffffffff - 256) {
                return false;
            }

            // beacon ID leaps
            if (beaconIDAdvance > 1 && beaconIDAdvance < 4) {
                this.setLastBeaconTime(thisBeaconTime);
                return false;
            }
        }


        let networkChange: boolean = false;
        let thisBeaconPeriod = thisBeaconTime - this.getLastBeaconTime();

        // 2nd beacon or 1st beacon after network changed
        // start to calculate the average beacon period
        if (this.averageBeaconPeriod < 0) {
            if (DEBUG) {
                console.log("=============++++++++++++++++++ 2nd fresh beacon, or 1st beacon after network change")
            }
            this.averageBeaconPeriod = thisBeaconPeriod;
            this.beaconArrivalCallback(thisBeaconID);
        }
        // 3rd beacon and after:
        // |current period| current period stablized| behavior |
        // |---|----|----|
        // 1 |>= 3.25 x averagePeriod|true| beaconAnomalyNotify() && networkChange = true|
        // 2 |>= 3.25 x averagePeriod|false| beaconAnomalyNotify() && networkChange = true|
        // 3 |>= 1.25 x averagePeriod && < 3.25 x averagePeriod|true|beaconAnomalyNotify()|
        // 4 |>= 1.25 x averagePeriod && < 3.25 x averagePeriod|false|beaconArrivalNotify() && averagePeriod = currentPeriod|
        // 5 |> 0.8 x averagePeriod && < 1.25 x averagePeriod|true|beaconArrivalNotify() && periodStabilized = true|
        // 6 |> 0.8 x averagePeriod && < 1.25 x averagePeriod|false|beaconArrivalNotify() && periodStabilized = true|
        // 7 |<= 0.8 x averagePeriod|true|beaconAnomalyNotify() && networkChange = true|
        // 8 |<= 0.8 x averagePeriod|false|beaconArrivalNotify() && periodStabilized = true|
        else {
            if (thisBeaconPeriod >= this.averageBeaconPeriod * 1.25) {
                if (thisBeaconPeriod >= this.averageBeaconPeriod * 3.25) {
                    // (1), (2)
                    if (DEBUG) {
                        console.log("=============++++++++++++++++++ (1,2)")
                    }
                    this.beaconAnomalyCallback();
                    networkChange = true;
                } else if (!this.periodStablized) {
                    // (4)
                    if (DEBUG) {
                        console.log("=============++++++++++++++++++ (4)")
                    }
                    this.averageBeaconPeriod = thisBeaconPeriod;
                    this.beaconArrivalCallback(thisBeaconID);
                } else {
                    // (3)
                    if (DEBUG) {
                        console.log("=============++++++++++++++++++ (3)")
                    }
                    this.beaconAnomalyCallback();
                }
            } else if (this.periodStablized && thisBeaconPeriod <= this.averageBeaconPeriod * 0.8) {
                // (7)
                if (DEBUG) {
                    console.log("=============++++++++++++++++++ (7)")
                }
                this.beaconAnomalyCallback();
                networkChange = true;
            }
            // all OK, or still stabilizing
            else {
                // (5), (6), (8)
                if (DEBUG) {
                    console.log("=============++++++++++++++++++ (5,6,8)")
                }
                this.periodStablized = true;
                this.beaconArrivalCallback(thisBeaconID);
            }

            if (networkChange) {
                this.periodStablized = false;
                this.averageBeaconPeriod = -1;
            } else {
                // update a running average period
                this.averageBeaconPeriod = thisBeaconPeriod * 0.125 + this.averageBeaconPeriod * 0.875;
            }
        }


        this.setLastBeaconTime(thisBeaconTime);
        return networkChange;
    }

    public getEnv = (envName: string = ""): string | number | string[] | number[] | Record<string, string | number | string[] | number[]> | undefined => {
        return Environment.getInstance().getEnv(envName);
    };

    // Beacon does not have soft or hard destroy as it is based on UDP
    // When (1) we have not received this beacon in 2 x EPICS_CA_BEACON_TIMEOUT (30) seconds, or
    //      (2) the whole program wants to quit
    // It does the following:
    // (1) clear all Timeouts
    // (2) remove this object from Context.beacons
    destroy = () => {
        GlobalMethods.infoLog(`Beacon ${this.beaconKey} timeout. Remove it.`);
        // (1) clear all Timers
        this.getTimeouts().clearAllTimeouts();
    }

    static generateBeaconKey = (serverPort: number, serverAddress: string) => {
        return `${serverAddress}:${serverPort}`;
    }

    // getters
    getServerPort = () => {
        return this.serverPort;
    }

    getServerAddress = () => {
        return this.serverAddress;
    }
    getBeaconKey = () => {
        return this.beaconKey;
    }

    getLastBeaconTime = () => {
        return this.lastBeaconTime;
    }

    setLastBeaconTime = (newTime: number) => {
        this.lastBeaconTime = newTime;
    }

    getLastBeaconId = () => {
        return this.lastBeaconId;
    }

    setLastBeaconId = (newId: number) => {
        this.lastBeaconId = newId;
    }

    /**
     * the same as the getChangeCount()
     * 
     * In CA, it is CA protocol version
     */
    getCaProtocolVersion = () => {
        return this.caProtocolVersionOrChangeCount;
    }

    getChangeCount = () => {
        return this.caProtocolVersionOrChangeCount;
    }

    setChangeCount = (newCount: number) => {
        this.caProtocolVersionOrChangeCount = newCount;
    }

    getTimeouts = () => {
        return this.timeouts;
    }

    getPeriodStablized = () => {
        return this.periodStablized;
    }

    setBeaconAnomalyCallback = (newCallback: () => void) => {
        this.beaconAnomalyCallback = newCallback;
    }

    getGuid = () => {
        return this.guid;
    }
    
    setGuid = (newGuid: string) => {
        this.guid = newGuid;
    }

    getProtocol = (): "ca" | "pva" => {
        if (this.getGuid() === "") {
            return "ca";
        } else {
            return "pva";
        }
    }
}

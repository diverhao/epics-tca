import { Context } from "../Context/Context";
import { GlobalMethods } from "../Global/GlobalMethods";
import { Constants } from "../Global/Constants";
import { TCPTransport } from "../TCPTransport/TCPTransport";
import { Environment } from "../Global/Environment";
import { Channel } from "../Channel/Channel";
import { Timeouts } from "../Timeouts/Timeouts";

/**
 * Representing the beacon from a Channel Access server
 * 
 * Beacon object is identified by the CA server address and TCP port
 */
export class Beacon {
	context: Context;
	private serverPort: number;
	private serverAddress: string;
	private lastBeaconTime: number; // milli-second
	private lastBeaconId: number;
	private periodStablized: boolean;
	private averageBeaconPeriod: number;
	readonly caProtocolVersion: number;
	readonly Number_MIN_VALUE: number = -3000000000000; // about 100 years

	private beaconKey: string;
    private timeouts: Timeouts;

	// a beacon contains: server IP, server TCP port, beacon ID
	// beacon signal should be managed on TCP transport, not UDP or Context level
	// a 

	constructor(contex: Context, serverPort: number, serverAddress: string, serverCaVersion: number) {
		this.caProtocolVersion = serverCaVersion;
		this.serverPort = serverPort;
		this.serverAddress = serverAddress;
		this.lastBeaconTime = this.Number_MIN_VALUE;
		this.lastBeaconId = -1;
		this.context = contex;
		this.periodStablized = false;
		this.averageBeaconPeriod = this.Number_MIN_VALUE;
		this.beaconKey = Beacon.generateBeaconKey(serverPort, serverAddress);
        this.timeouts = new Timeouts();
	}


    getTcpTransports = (): TCPTransport[] => {
        return this.context.tcpTransports.getTCPTransportsByAddressAndPort(this.beaconKey);
    }

	// re-search all unresolved channels
	beaconAnomalyNotify = () => {
		GlobalMethods.errorLog("beaconAnomalyNotify fired: restart search() for unresolved channels");
		for (let pvName in this.context.unresolvedChannelsByName) {
			const unresolvedChannel: Channel = this.context.unresolvedChannelsByName[pvName];
			// speed up channel search rate
			unresolvedChannel.reSearchAndConnect();
		}
	};
	beaconArrivalNotify = (thisBeaconID: number) => {
        // does nothing
    };

	updatePeriod = (thisBeaconID: number): boolean => {
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

		// 1st beacon, returns early
		if (this.getLastBeaconTime() === this.Number_MIN_VALUE) {
			this.beaconAnomalyNotify();
			if (this.getCaProtocolVersion() >= 10) {
				this.setLastBeaconId(thisBeaconID);
			}
			this.setLastBeaconTime(thisBeaconTime);
			this.beaconArrivalNotify(thisBeaconID);
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
				return false;
			}

			this.setLastBeaconId(thisBeaconID);

			if (beaconIDAdvance === 0 || beaconIDAdvance > 0xffffffff - 256) {
				return false;
			}

			if (beaconIDAdvance > 1 && beaconIDAdvance < 4) {
				this.setLastBeaconTime(thisBeaconTime);
				return false;
			}
		}

		let networkChange: boolean = false;
		let thisBeaconPeriod = thisBeaconTime - this.getLastBeaconTime();

		// 2nd beacon, the 1st beacon returns early
		if (this.averageBeaconPeriod < 0) {
			this.averageBeaconPeriod = thisBeaconPeriod;
			this.beaconArrivalNotify(thisBeaconID);
		}
		// 3rd beacon and after:
		// |current period| period stablized| behavior |
		// |---|----|----|
		// |>= 3.25 x averagePeriod|true| beaconAnomalyNotify() && networkChange = true|
		// |>= 3.25 x averagePeriod|false| beaconAnomalyNotify() && networkChange = true|
		// |>= 1.25 x averagePeriod && < 3.25 x averagePeriod|true|beaconAnomalyNotify()|
		// |>= 1.25 x averagePeriod && < 3.25 x averagePeriod|false|beaconArrivalNotify() && averagePeriod = currentPeriod|
		// |> 0.8 x averagePeriod && < 1.25 x averagePeriod|true|beaconArrivalNotify() && periodStabilized = true|
		// |> 0.8 x averagePeriod && < 1.25 x averagePeriod|false|beaconArrivalNotify() && periodStabilized = true|
		// |<= 0.8 x averagePeriod|true|beaconAnomalyNotify() && networkChange = true|
		// |<= 0.8 x averagePeriod|false|beaconArrivalNotify() && periodStabilized = true|
		else {
			if (thisBeaconPeriod >= this.averageBeaconPeriod * 1.25) {
				if (thisBeaconPeriod >= this.averageBeaconPeriod * 3.25) {
					this.beaconAnomalyNotify();
					networkChange = true;
				} else if (!this.periodStablized) {
					this.averageBeaconPeriod = thisBeaconPeriod;
					this.beaconArrivalNotify(thisBeaconID);
				} else {
					this.beaconAnomalyNotify();
				}
			} else if (this.periodStablized && thisBeaconPeriod <= this.averageBeaconPeriod * 0.8) {
				this.beaconAnomalyNotify();
				networkChange = true;
			}
			// all OK, or still stabilizing
			else {
				this.periodStablized = true;
				this.beaconArrivalNotify(thisBeaconID);
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
		// (2) remove this object from Context.beacons
		delete this.context.beacons[this.beaconKey];
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

    getContext = () => {
        return this.context;
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

    getCaProtocolVersion = () => {
        return this.caProtocolVersion;
    }

    getTimeouts = () => {
        return this.timeouts;
    }

}

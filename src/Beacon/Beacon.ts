import { Context, GlobalMethods, Constants, TCPTransport, Environment, Channel } from "..";
import { Buffer } from "buffer";
import { Intervals } from "../Intervals/Intervals";
import { Timeouts } from "../Timeouts/Timeouts";

// In Java:
// BeaconResponse.internalHandleResponse() is invoked every time beacon arrives
// it invokes  CABeaconHandler.beaconNotify(), where in this beaconNotify()
// it invokes  CABeaconHandler.updateBeaconPeriod(). This method is to calcualate
// beacon signal anomaly. If there is an anomaly, updateBeaconPeriod() returns false
// If there is an anomaly, CABeaconHandler.changedTransport() is invoked:
//  - this CATransport that represents the TCP connection is NOT removed from CAContext.TransportRegistry
//  - CATransport.changedTransport() is invoked, where all its "CAJChannel" clients' method are invoked
//    - CAJChannel.transportChanged() invoked for each of above CATransport's "CAJChannel" clients
//      - if this CAJChannel is DISCONNECTED, CAJChannel.initiateSearch() invoked: send 0x06 UDP packets to EPICS_CA_ADDR_LIST
// when beacon anomaly occurs:

export class Beacon {
	context: Context;
	tcpTransport: TCPTransport | null;

	serverPort: number;
	serverAddress: string;
	lastBeaconPeriod: number; // milli-seconds
	lastBeaconTime: number; // milli-second
	lastBeaconID: number;
	// thisBeaconID: number;
	count: number;
	periodStablized: boolean;
	averageBeaconPeriod: number;
	readonly version: number;
	readonly Number_MIN_VALUE: number = -3000000000000; // about 100 years

	// beaconAnomalyDetectionSetTimeout: any;
	// beaconAnomalyDetectionSetTimeout2: any;

	key: string;

	timeoutTimer: any;

	beaconID: number;
    timeouts: Timeouts;
	// a beacon contains: server IP, server TCP port, beacon ID
	// beacon signal should be managed on TCP transport, not UDP or Context level
	// a Beacon object is identified by: serverAddress and serverTcpPort

	// constructor(contex: Context, message: Buffer) {
	constructor(contex: Context, serverPort: number, serverAddress: string, serverCaVersion: number) {
		this.beaconID = 0;
		this.version = serverCaVersion;
		this.serverPort = serverPort;
		this.serverAddress = serverAddress;
		this.lastBeaconPeriod = this.Number_MIN_VALUE;
		this.lastBeaconTime = this.Number_MIN_VALUE;
		this.count = 0;
		this.lastBeaconID = -1;
		// this.thisBeaconID = Number_MIN_VALUE;
		this.context = contex;
		this.periodStablized = false;
		this.averageBeaconPeriod = this.Number_MIN_VALUE;
		this.tcpTransport = null;

		// this.beaconAnomalyDetectionSetTimeout = null;
		// this.beaconAnomalyDetectionSetTimeout2 = null;

		this.key = `${this.serverAddress}:${this.serverPort}`;

        this.timeouts = new Timeouts();
	}


    getTcpTransports = (): TCPTransport[] => {
        return this.context.tcpTransports.getTCPTransportsByAddressAndPort(this.key);
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

	// In java:
	// it invokes CATransport.timeout(30000) after
	// CA client receives a beacon. It means after 30s the code below is
	// executed. Meanwhile, if the next beacon arrives normally (after 15 seconds)
	// the timeout() task is canceled. However, if the next beacon is
	// not arrived within 30 seconds, the timeout() task is not canceled, then
	// the timeout() content is executed: it either sends an beacon echo
	// to the CA server or run "unresponsiveTransport()"
	// this "unresponsiveTransport()" lets all this CATransport's "CAJChannel"
	// to invoke CAJChannel.transportUnresponsive(), which simply set connection
	// state to DISCONNECTED.

	// no need:
	// CABeaconHandler.changedTransport() in Java
	// just modify the connectionState to ConnectionState.DISCONNECTED in CAJChannel.java
	// then initiateSearch() this channel

	//HH CABeaconHandler.java.updateBeaconPeriod()
	//todo: must fire up beaconAnomalyNotify() at
	// Q: what is the difference of return value and beaconAnomalyNotify??
	updatePeriod(thisBeaconID: number) {
        // clear old timer
        this.timeouts.clearTimeout("Beacon_destroy");
        // add and start new timer
        this.timeouts.addTimeout(
			"Beacon_destroy",
			(this.getEnv("EPICS_CA_BEACON_TIMEOUT") as number) * 1000 * 2,
			this.destroy,
			[]
		);
		this.timeouts.startTimeout("Beacon_destroy");

		// calculate and handl beacon anomaly
		let thisBeaconTime = Date.now();

		// 1st beacon, returns early
		if (this.lastBeaconTime === this.Number_MIN_VALUE) {
			this.beaconAnomalyNotify();
			if (this.version >= 10) {
				this.lastBeaconID = thisBeaconID;
			}
			this.lastBeaconTime = thisBeaconTime;
			this.beaconArrivalNotify(thisBeaconID);
			return false;
		}

		// newer version EPICS server
		if (this.version >= 10) {
			let beaconIDAdvance;
			// normal situation
			if (thisBeaconID >= this.lastBeaconID) {
				beaconIDAdvance = thisBeaconID - this.lastBeaconID;
			} else {
				// beacon id overflow 4-byte space
				beaconIDAdvance = 0xffffffff - this.lastBeaconID + thisBeaconID;
				return false;
			}

			this.lastBeaconID = thisBeaconID;

			if (beaconIDAdvance === 0 || beaconIDAdvance > 0xffffffff - 256) {
				return false;
			}

			if (beaconIDAdvance > 1 && beaconIDAdvance < 4) {
				this.lastBeaconTime = thisBeaconTime;
				return false;
			}
		}

		let networkChange: boolean = false;
		let thisBeaconPeriod = thisBeaconTime - this.lastBeaconTime;

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
		// |<= 0.8 x averagePeriod|true|beaconAnomalyNotify() && networkChange = true|
		// |<= 0.8 x averagePeriod|false|beaconArrivalNotify() && periodStabilized = true|
		// |> 0.8 x averagePeriod && < 1.25 x averagePeriod|true|beaconArrivalNotify() && periodStabilized = true|
		// |> 0.8 x averagePeriod && < 1.25 x averagePeriod|false|beaconArrivalNotify() && periodStabilized = true|
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


		this.lastBeaconTime = thisBeaconTime;
		return networkChange;
	}

	public getEnv = (envName: string = ""): string | number | string[] | number[] | Record<string, string | number | string[] | number[]> => {
		return Environment.getInstance().getEnv(envName);
	};

    // Beacon does not have soft or hard destroy as it is based on UDP
	// When (1) we have not received this beacon in 2 x EPICS_CA_BEACON_TIMEOUT (30) seconds, or
	//      (2) the whole program wants to quit
	// It does the following:
	// (1) clear all Timeouts
	// (2) remove this object from Context.beacons
	destroy = () => {
		GlobalMethods.infoLog(`Beacon ${this.key} timeout. Remove it.`);
		// (1) clear all Timers
		this.timeouts.clearAllTimeouts();
		// (2) remove this object from Context.beacons
		delete this.context.beacons[this.key];
	}
}

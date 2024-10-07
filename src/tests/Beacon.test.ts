import { Buffer } from "buffer";
import { Environment } from "../Global/Environment";
import { Beacon } from "../Beacon/Beacon";
import { ipInt2String, CA_MSG_HEADER_OFFSETS } from "../Global/variables";
import { TaskScheduler } from "../TaskScheduler/TaskScheduler";

/**
 * To reduce the test time, the plateau is set to 1 s (default 15 s)
 */
const env = Environment.getInstance({
    EPICS_CA_BEACON_PERIOD: "1",
});

const generatePeriods = (initPeriod: number) => {
    const periods = [0, initPeriod];
    const EPICS_CA_BEACON_PERIOD = Environment.getInstance().getEnv("EPICS_CA_BEACON_PERIOD");
    while (true) {
        const lastPeriod = periods[periods.length - 1];
        if (lastPeriod * 2 >= (EPICS_CA_BEACON_PERIOD as number)) {
            periods.push(EPICS_CA_BEACON_PERIOD as number);
            break;
        } else {
            periods.push(lastPeriod * 2);
        }
    }
    return periods;
}


describe("Beacon", () => {
    // it("Generate a series of periods for beacon, first period is 0.02 s", () => {
    //     const periods = generatePeriods(0.02);
    //     const EPICS_CA_BEACON_PERIOD = Environment.getInstance().getEnv("EPICS_CA_BEACON_PERIOD");
    //     console.log(periods)
    //     expect(periods).toEqual([0, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64, EPICS_CA_BEACON_PERIOD]);
    // })

    // it("Process normal beacons, networkChange are all false", (done: jest.DoneCallback) => {
    //     const periods = generatePeriods(0.02);
    //     const taskScheduler = new TaskScheduler();
    //     const beacon = new Beacon(9988, "127.0.0.1", () => {
    //     }, 13);
    //     const networkChanges: boolean[] = [];
    //     let beaconId = 0;
    //     taskScheduler.createAndStartSchduler(periods, [() => {
    //         const networkChange = beacon.updatePeriod(beaconId);
    //         networkChanges.push(networkChange);
    //         beaconId++;
    //     }], true);
    //     setTimeout(() => {
    //         taskScheduler.destroy();
    //         // beacon has a timeout
    //         beacon.destroy();
    //         // totally 15 beacons received
    //         expect(networkChanges).toEqual([false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]);
    //         done();
    //     }, 10 * 1000);
    // })

    // it("Process normal beacons, the 1st beacon is an anomaly", (done: jest.DoneCallback) => {
    //     const periods = generatePeriods(0.02);
    //     const taskScheduler = new TaskScheduler();
    //     const anomalies: boolean[] = [];
    //     const beacon = new Beacon(9988, "127.0.0.1", () => {
    //         anomalies[anomalies.length - 1] = true;
    //     }, 13);
    //     let beaconId = 0;
    //     taskScheduler.createAndStartSchduler(periods, [() => {
    //         anomalies.push(false);
    //         beacon.updatePeriod(beaconId);
    //         beaconId++;
    //     }], true);
    //     setTimeout(() => {
    //         taskScheduler.destroy();
    //         // beacon has a timeout
    //         beacon.destroy();
    //         expect(anomalies).toEqual([true, false, false, false, false, false, false, false, false, false, false, false, false, false, false]);
    //         done();
    //     }, 10 * 1000);
    // })


    // it("Process normal beacons, beacon ID not advancing, it does not affect beacon anomaly", (done: jest.DoneCallback) => {
    //     const periods = generatePeriods(0.02);
    //     const taskScheduler = new TaskScheduler();
    //     const anomalies: boolean[] = [];
    //     const beacon = new Beacon(9988, "127.0.0.1", () => {
    //         anomalies[anomalies.length - 1] = true;
    //     }, 13);
    //     let beaconId = 0;
    //     taskScheduler.createAndStartSchduler(periods, [() => {
    //         anomalies.push(false);
    //         beacon.updatePeriod(beaconId);
    //         // beaconId++;
    //     }], true);
    //     setTimeout(() => {
    //         taskScheduler.destroy();
    //         // beacon has a timeout
    //         beacon.destroy();
    //         expect(anomalies).toEqual([true, false, false, false, false, false, false, false, false, false, false, false, false, false, false]);
    //         done();
    //     }, 10 * 1000);
    // })

    // it("Process normal beacons, beacon, period stabilized", (done: jest.DoneCallback) => {
    //     // [0, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64, 1, ...]
    //     const periods = generatePeriods(0.02);
    //     const taskScheduler = new TaskScheduler();
    //     const periodsStablized: boolean[] = [];
    //     const beacon = new Beacon(9988, "127.0.0.1", () => {
    //     }, 13);
    //     let beaconId = 0;
    //     taskScheduler.createAndStartSchduler(periods, [() => {
    //         beacon.updatePeriod(beaconId);
    //         periodsStablized.push(beacon.getPeriodStablized());
    //         beaconId++;
    //     }], true);
    //     setTimeout(() => {
    //         taskScheduler.destroy();
    //         // beacon has a timeout
    //         beacon.destroy();
    //         expect(periodsStablized).toEqual([false, false, false, false, false, false, false, false, true, true, true, true, true, true, true]);
    //         done();
    //     }, 10 * 1000);
    // })


    // it("beacon case #1", (done: jest.DoneCallback) => {
    //     // [0, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64, 1, ...]
    //     const periods = generatePeriods(0.02);
    //     // only 4 and the 1 after are false
    //     periods.push(1, 1, 3.7, 1, 1, 1, 1);
    //     //                 ^
    //     //             this is where it goes wrong
    //     const taskScheduler = new TaskScheduler();
    //     const periodsStablized: boolean[] = [];
    //     const networkChanges: boolean[] = [];
    //     const beaconAnomalies: boolean[] = [];
    //     const beacon = new Beacon(9988, "127.0.0.1", () => {
    //         beaconAnomalies[beaconAnomalies.length - 1] = true;
    //     }, 13);
    //     let beaconId = 0;
    //     taskScheduler.createAndStartSchduler(periods, [() => {
    //         beaconAnomalies.push(false);
    //         networkChanges.push(beacon.updatePeriod(beaconId));
    //         periodsStablized.push(beacon.getPeriodStablized());
    //         beaconId++;
    //     }], false); // no interval
    //     setTimeout(() => {
    //         taskScheduler.destroy();
    //         // beacon has a timeout
    //         beacon.destroy();
    //         expect({
    //             periodsStablized: periodsStablized,
    //             networkChanges: networkChanges,
    //             beaconAnomalies: beaconAnomalies,
    //         }).toEqual(
    //             {
    //                 periodsStablized: [false, false, false, false, false, false, false, false, true, true, false, false, true, true, true],
    //                 networkChanges: [false, false, false, false, false, false, false, false, false, false, true, false, false, false, false],
    //                 beaconAnomalies: [true, false, false, false, false, false, false, false, false, false, true, false, false, false, false],
    //             }
    //         );
    //         done();
    //     }, 13 * 1000); // 3 more seconds
    // })

    it("beacon case #2", (done: jest.DoneCallback) => {
        // [0, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64, 1, ...]
        //                               ^    ^
        //                            to 0.6  to 0.36
        const periods = generatePeriods(0.02);
        // only 4 and the 1 after are false
        periods.push(1, 1, 1, 1, 1, 1, 1);
        periods[5] = 0.6;
        periods[6] = 0.36;
        const taskScheduler = new TaskScheduler();
        const periodsStablized: boolean[] = [];
        const networkChanges: boolean[] = [];
        const beaconAnomalies: boolean[] = [];
        const beacon = new Beacon(9988, "127.0.0.1", () => {
            beaconAnomalies[beaconAnomalies.length - 1] = true;
        }, 13);
        let beaconId = 0;
        taskScheduler.createAndStartSchduler(periods, [() => {
            beaconAnomalies.push(false);
            networkChanges.push(beacon.updatePeriod(beaconId));
            periodsStablized.push(beacon.getPeriodStablized());
            beaconId++;
        }], false); // no interval
        setTimeout(() => {
            taskScheduler.destroy();
            // beacon has a timeout
            beacon.destroy();
            expect({
                periodsStablized: periodsStablized,
                networkChanges: networkChanges,
                beaconAnomalies: beaconAnomalies,
            }).toEqual(
                {
                    periodsStablized: [false, false, false, false, false, false, false, false, true, true, true, true, true, true, true],
                    networkChanges: [false, false, false, false, false, true, false, false, false, false, false, false, false, false, false],
                    beaconAnomalies: [true, false, false, false, false, true, false, false, false, false, false, false, false, false, false],
                }
            );
            done();
        }, 13 * 1000); // 3 more seconds
    })


    // it("beacon case #3", (done: jest.DoneCallback) => {
    //     // [0, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64, 1, ...]
    //     //                               ^    ^
    //     //                            to 0.6  to 0.36
    //     const periods = generatePeriods(0.02);
    //     // only 4 and the 1 after are false
    //     periods.push(1, 1, 1, 1, 1, 1, 1);
    //     periods[5] = 0.6;
    //     periods[6] = 0.36;
    //     const taskScheduler = new TaskScheduler();
    //     const periodsStablized: boolean[] = [];
    //     const networkChanges: boolean[] = [];
    //     const beaconAnomalies: boolean[] = [];
    //     const beacon = new Beacon(9988, "127.0.0.1", () => {
    //         beaconAnomalies[beaconAnomalies.length - 1] = true;
    //     }, 13);
    //     let beaconId = 0;
    //     taskScheduler.createAndStartSchduler(periods, [() => {
    //         beaconAnomalies.push(false);
    //         networkChanges.push(beacon.updatePeriod(beaconId));
    //         periodsStablized.push(beacon.getPeriodStablized());
    //         beaconId++;
    //     }], false); // no interval
    //     setTimeout(() => {
    //         taskScheduler.destroy();
    //         // beacon has a timeout
    //         beacon.destroy();
    //         expect({
    //             periodsStablized: periodsStablized,
    //             // networkChanges: networkChanges,
    //             // beaconAnomalies: beaconAnomalies,
    //         }).toEqual(
    //             {
    //                 periodsStablized: [false, false, false, false, false, false, false, false, true, true, true, true, true, true, true],
    //                 // networkChanges: [false, false, false, false, false, true, false, false, false, false, false, false, false, false, false],
    //                 // beaconAnomalies: [true, false, false, false, false, true, false, false, false, false, false, false, false, false, false],
    //             }
    //         );
    //         done();
    //     }, 13 * 1000); // 3 more seconds
    // })

})
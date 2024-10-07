import { TaskScheduler } from "../TaskScheduler/TaskScheduler";


describe("TaskScheduler", () => {
    it("Create a simple task scheduler with not repeat, it should be destroyed automatically", (done: jest.DoneCallback) => {
        let executionTimes: number[] = [];
        let periods = [0, 0.1, 0.3, 0.7, 1.5, 3.1];
        const callback = () => {
            executionTimes.push(performance.now());
        }
        const taskScheduler = new TaskScheduler();
        taskScheduler.createAndStartSchduler(periods, [callback], false);
        setTimeout(() => {
            const result: number[] = [];
            for (let ii = 1; ii < executionTimes.length; ii++) {
                // round to 10 ms
                result.push(Math.round((executionTimes[ii] - executionTimes[ii - 1]) / 10) * 10 / 1000);
            }
            periods.splice(0, 1);
            expect(result).toEqual(periods);
            done();
        }, 6000)
    })


    it("Create a simple task scheduler with repeat, then manually destroy it after it repeats one time", (done: jest.DoneCallback) => {
        let executionTimes: number[] = [];
        let periods = [0, 0.1, 0.3, 0.7, 1.5, 1.5];
        const callback = () => {
            executionTimes.push(performance.now());
        }
        const taskScheduler = new TaskScheduler();
        taskScheduler.createAndStartSchduler(periods, [callback], true);
        setTimeout(() => {
            taskScheduler.destroy();
            const result: number[] = [];
            for (let ii = 1; ii < executionTimes.length; ii++) {
                // round to 10 ms
                result.push(Math.round((executionTimes[ii] - executionTimes[ii - 1]) / 10) * 10 / 1000);
            }
            periods.splice(0, 1);
            // it repeats one time
            periods.push(periods[periods.length - 1]);
            expect(result).toEqual(periods);
            done();
        }, 6000)
    })

    it("Create a simple task scheduler with repeat, then manually destroy it after it repeats 3 times", (done: jest.DoneCallback) => {
        let executionTimes: number[] = [];
        let periods = [0, 0.1, 0.3, 0.7, 1];
        const callback = () => {
            executionTimes.push(performance.now());
        }
        const taskScheduler = new TaskScheduler();
        taskScheduler.createAndStartSchduler(periods, [callback], true);
        setTimeout(() => {
            taskScheduler.destroy();
            const result: number[] = [];
            for (let ii = 1; ii < executionTimes.length; ii++) {
                // round to 10 ms
                result.push(Math.round((executionTimes[ii] - executionTimes[ii - 1]) / 10) * 10 / 1000);
            }
            periods.splice(0, 1);
            // it repeats 3 times
            periods.push(periods[periods.length - 1]);
            periods.push(periods[periods.length - 1]);
            periods.push(periods[periods.length - 1]);
            expect(result).toEqual(periods);
            done();
        }, 6000)
    })


    it("Create a task scheduler with multiple callbacks with repeat", (done: jest.DoneCallback) => {
        let executionTimes: number[] = [];
        let periods = [0, 0.1, 0.3, 0.7, 1];
        const callback1 = () => {
            executionTimes.push(performance.now());
        }
        const callback2 = () => {
            // add a random offset
            executionTimes.push(performance.now() + 1000);
        }
        const callback3 = () => {
            // add a random offset
            executionTimes.push(performance.now() - 1000);
        }
        const callback4 = () => {
            // add a random offset
            executionTimes.push(performance.now() + 1500);
        }
        const taskScheduler = new TaskScheduler();
        taskScheduler.createAndStartSchduler(periods, [callback1, callback2, callback3, callback4], true);
        setTimeout(() => {
            taskScheduler.destroy();
            const result: number[] = [];
            for (let ii = 1; ii < executionTimes.length; ii++) {
                // round to 10 ms
                result.push(Math.round((executionTimes[ii] - executionTimes[ii - 1]) / 10) * 10 / 1000);
            }
            periods.splice(0, 1);
            // it repeats 3 times
            periods.push(periods[periods.length - 1]);
            periods.push(periods[periods.length - 1]);
            periods.push(periods[periods.length - 1]);
            // random offsets
            periods[0] = periods[0] + 1;
            periods[1] = periods[1] - 2;
            periods[2] = periods[2] + 2.5;
            periods[3] = periods[3];
            periods[4] = periods[4];
            periods[5] = periods[5];
            expect(result).toEqual(periods);
            done();
        }, 6000)
    })
})
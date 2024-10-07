import { TaskScheduler } from "../TaskScheduler/TaskScheduler";


describe("TaskScheduler", () => {
    it("Create a simple task scheduler with not repeat, it should be destroyed automatically", (done: jest.DoneCallback) => {
        let executionTimes: number[] = [];
        let periods = [0, 0.1, 0.3, 0.7, 1.5, 3.1];
        const callback = () => {
            executionTimes.push(performance.now());
        }
        const taskScheduler = new TaskScheduler();
        taskScheduler.createSchduler(periods, [callback], false);
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
        taskScheduler.createSchduler(periods, [callback], true);
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
        taskScheduler.createSchduler(periods, [callback], true);
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
})
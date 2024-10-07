export class TaskScheduler {


    schedulers: (NodeJS.Timeout)[] = [];
    repeatScheduler: NodeJS.Timer | undefined = undefined;

    /**
     * @param {number[]} intervals The separation between each task, Unit is second
     * 
     * @param {(...inputs: any[]) => any} callback Callback functions to be executed at that time
     *                                             If there are less callbacks than intervals, the last callback
     *                                             is executed for the remaining intervals
     * 
     * @param {bolean} repeatForever If we want to repeat the last task forever with the last interval
     */
    createAndStartSchduler = (periods: number[], callbacks: (() => void)[], repeatForever: boolean) => {
        // destroy old schedulers
        this.destroy();

        let accumulatedInterval = 0;
        for (let ii = 0; ii < periods.length; ii++) {
            const interval = periods[ii];
            accumulatedInterval = accumulatedInterval + interval;
            let callback = callbacks[ii];
            if (callback === undefined) {
                // use last callback
                callback = callbacks[callbacks.length - 1];
            }

            if (repeatForever === true && ii === periods.length - 1) {
                // add setInterval to the end
                const scheduler = setTimeout(() => {
                    callback();
                    this.repeatScheduler = setInterval(() => {
                        callback();
                    }, interval * 1000);
                }, accumulatedInterval * 1000);
                this.schedulers.push(scheduler);
            } else if (repeatForever === false && ii === periods.length - 1) {
                // destroy all timeouts if this scheduler does not repeat forever
                const scheduler = setTimeout(() => { callback(); this.destroy(); }, accumulatedInterval * 1000);
                this.schedulers.push(scheduler);
            } else {
                const scheduler = setTimeout(() => { callback() }, accumulatedInterval * 1000);
                this.schedulers.push(scheduler);
            }
        }
    }

    destroy = () => {
        for (let scheduler of this.schedulers) {
            clearTimeout(scheduler);
        }
        clearInterval(this.repeatScheduler);
        this.schedulers = [];
    }
}


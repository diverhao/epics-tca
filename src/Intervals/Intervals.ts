export type type_interval = {
    id: NodeJS.Timer | undefined,
    func: any,
    parameters: any[],
    dt: number, // unit second
    state: IntervalState,
}

export enum IntervalState {
    NOT_STARTED,
    STARTED,
    FINISHED,
}

/**
 * A mechanism using which to periodically run function 
 * 
 * Each interval is identified by a name
 */
export class Intervals {
    intervals: Record<string, type_interval> = {};
    constructor() {}

    // the "func" must be an arrow function
    addInterval = (name: string, dt: number, func: any, parameters: any[]) => {
        // race condition occurs when an interval is added and started, but replaced later.
        // clear the interval first in any situation, it does not have side effect
        this.clearInterval(name);
        const interval: type_interval = {
            id: undefined,
            func: func,
            parameters: parameters,
            dt: dt,
            state: IntervalState.STARTED,
        }
        this.intervals[name] = interval;
    }

    startInterval = (name: string) => {
        const interval = this.intervals[name];
        if (interval === undefined) {
            return;
        }

        const func = interval.func;
        const parameters = interval.parameters;
        const dt = interval.dt;

        // execute immediately
        func(...parameters);
        // then intervals
        const id = setInterval(() => {
            func(...parameters);
        }, dt * 1000);
        interval.id = id;
        interval.state = IntervalState.STARTED;
    }

    clearInterval = (name: string) => {
        const id = this.intervals[name]?.id;
        delete this.intervals[name];
        clearInterval(id);
    }

    clearAllIntervals = () => {
        for (let name in this.intervals) {
            this.clearInterval(name);
        }
    }
}
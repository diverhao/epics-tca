

export type type_interval = {
    id: NodeJS.Timer | undefined,
    func: any,
    parameters: any[],
    dt: number,
}

export class Intervals {
    intervals: Record<string, type_interval> = {};
    constructor() {}

    // the "func" must be an arrow function
    addInterval = (name: string, dt: number, func: any, parameters: any[]) => {

        const interval: type_interval = {
            id: undefined,
            func: func,
            parameters: parameters,
            dt: dt,
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

        const id = setInterval(() => {
            func(...parameters);
        }, dt);
        this.intervals[name].id = id;
    }

    getIntervalId = (name: string): NodeJS.Timer | undefined => {
        return this.intervals[name].id;
    }

    clearInterval = (name: string) => {
        clearInterval(this.getIntervalId(name));
        delete this.intervals[name];
    }

    clearAllIntervals = () => {
        for (let name in this.intervals) {
            this.clearInterval(name);
        }
    }
}
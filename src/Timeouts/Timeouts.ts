export type type_timeout = {
    id: NodeJS.Timeout | undefined,
    func: any,
    parameters: any[],
    dt: number, // unit second
}
/**
 * A mechanism using which to run callback function when timeout
 * 
 * Each timeout is identified by a name
 */
export class Timeouts {
    timeouts: Record<string, type_timeout> = {};
    constructor() { }

    addTimeout = (name: string, dt: number, func: any, parameters: any[]) => {
        // race condition occurs when a timeout is added and started, but replaced later.
        // clear the timeout first in any situation, it does not have side effect
        this.clearTimeout(name);
        const timeout: type_timeout = {
            id: undefined,
            func: func,
            parameters: parameters,
            dt: dt,
        }
        this.timeouts[name] = timeout;
    }

    /**
     * Let the timeout start to count down from beginning, 
     * the old timeout is gone
     */
    resetTimeout = (name: string) => {
        const timeoutData = this.timeouts[name];
        if (timeoutData !== undefined) {
            // remove the old timeout object
            this.clearTimeout(name);
            // add new one
            const dt = timeoutData["dt"];
            const func = timeoutData["func"];
            const parameters = timeoutData["parameters"];
            this.addTimeout(name, dt, func, parameters);
            // start it
            this.startTimeout(name);
        }
    }

    startTimeout = (name: string) => {
        const timeout = this.timeouts[name];
        if (timeout === undefined) {
            return;
        }

        const func = timeout.func;
        const parameters = timeout.parameters;
        const dt = timeout.dt;
        const id = setTimeout(() => {
            func(...parameters);
        }, dt * 1000);
        this.timeouts[name].id = id;
    }

    clearTimeout = (name: string) => {
        const id = this.timeouts[name]?.id;
        delete this.timeouts[name];
        clearTimeout(id);
    }

    clearAllTimeouts = () => {
        for (let name in this.timeouts) {
            this.clearTimeout(name);
        }
    }
}
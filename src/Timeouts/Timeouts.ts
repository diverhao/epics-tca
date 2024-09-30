export type type_timeout = {
    id: NodeJS.Timeout | undefined,
    func: any,
    parameters: any[],
    dt: number,
}
/**
 * A mechanism using which to run callback function when timeout
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
        }, dt);
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

    timeoutStarted = (name: string): boolean => {
        const timeout = this.timeouts[name];
        if (timeout !== undefined) {
            const id = timeout["id"];
            if (id === undefined) {
                return false;
            } else {
                return true;
            }
        } else {
            return false;
        }
    }


}
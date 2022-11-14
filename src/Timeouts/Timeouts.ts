

export type type_timeout = {
    id: NodeJS.Timeout | undefined,
    func: any,
    parameters: any[],
    dt: number,
}

export class Timeouts {
    timeouts: Record<string, type_timeout> = {};
    constructor() {}

     addTimeout = (name: string, dt: number, func: any, parameters: any[]) => {

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

    getTimeoutId = (name: string): NodeJS.Timer | undefined => {
        return this.timeouts[name].id;
    }

    clearTimeout = (name: string) => {
        clearTimeout(this.getTimeoutId(name));
        delete this.timeouts[name];
    }

    clearAllTimeouts = () => {
        for (let name in this.timeouts) {
            this.clearTimeout(name);
        }
    }
}
import { Promises } from "../Promises/Promises";

export class ContextPromises extends Promises{
    constructor() {
        super();
    }

    // no additional property
    append = (name: string, timeout: number | undefined = undefined) => {
        this.appendPromise(name, {}, timeout);
    }

	get = (name: string): Promise<any> | undefined => {
		return this.getPromise(name);
	};

    resolve = (name: string, result: string) => {
        this.resolvePromise(name, result);
    }
    reject = (name: string, reason: string) => {
        this.rejectPromise(name, reason);
    }

    rejectAll = (reason: string) => {
        this.rejectAllPromises(reason);
    }

}
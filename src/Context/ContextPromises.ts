import { Promises } from "../Promises/Promises";

export class ContextPromises extends Promises{
    constructor() {
        super();
    }

    // no additional property
    append = (name: string, rejectAndReplaceExisting: boolean = true, timeout: number | undefined = undefined) => {
        this.appendPromise(name, rejectAndReplaceExisting, {}, timeout);
    }

	get = (name: string): Promise<any> | undefined => {
		return this.getPromise(name);
	};

    resolve = (name: string, result: any) => {
        this.resolvePromise(name, result);
    }
    reject = (name: string, reason: any) => {
        this.rejectPromise(name, reason);
    }

    rejectAll = (reason: string) => {
        this.rejectAllPromises(reason);
    }

}
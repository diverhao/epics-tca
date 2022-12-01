import { Promises } from "../Promises";

export class ContextPromises extends Promises{
    constructor() {
        super();
    }

    append = (name: string, timeout: number | undefined = undefined) => {
        this.appendPromise(name, {}, timeout);
    }

	get = (name: string): Promise<any> => {
		return this.getPromise(name);
	};

    resolve = (name: string, result: string) => {
        this.resolvePromise(name, result);
    }
    reject = (name: string) => {
        this.rejectPromise(name);
    }

    rejectAll = () => {
        this.rejectAllPromises();
    }

}
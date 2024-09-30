import { GlobalMethods } from "../Global/GlobalMethods";
import { Promises } from "../Promises/Promises";


export class ChannelPromises extends Promises {
    constructor() {
        super();
    }

	get = (name: string): Promise<any> | undefined => {
		return this.getPromise(name);
	};

    append = (name: string, timeout: number | undefined = undefined) => {
        this.appendPromise(name, {}, timeout);
    }
    reject = (name: string, reason: string = "") => {
        this.rejectPromise(name, reason);
    }
    resolve = (name: string, result: any) => {
        this.resolvePromise(name, result);
    }
    rejectAll = () => {
        this.rejectAllPromises();
    }
}



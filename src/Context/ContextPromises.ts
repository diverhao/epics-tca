
	// CA_REPEATER_CONFIRM_Promise: Promise<string>;
	// CA_REPEATER_CONFIRM_Resolve: any;
	// CA_REPEATER_CONFIRM_Reject: any;

import { Promises } from "../Promises";


export class ContextPromises extends Promises{
    constructor() {
        super();
    }

    append = (name: string) => {
        this.appendPromise(name, {});
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
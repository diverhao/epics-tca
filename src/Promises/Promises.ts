import { GlobalMethods } from "../Global/GlobalMethods";
import { Environment } from "../Global/Environment";

export type type_promise = {
    resolveFunc: any;
    rejectFunc: any;
    promise: Promise<any>;
    time: number;
    timeout: number | undefined;
    timeoutObj: undefined | NodeJS.Timeout;
};

/**
 * Manage multiple Promise objects
 * 
 * Each Promise is identified by a name (string type)
 * 
 * Programming pattern: 
 *  - block the program: const promiseObj = promises.getPromise("name"); ... await promiseObj;
 *  - lift the block: promise.resolvePromise("name");
 * 
 * Note: always use Promises.resolvePromise()/rejectPromise() to resolve/reject,
 *       do not use the raw Promise object. Use the raw Promise object only when
 *       for "await promiseObject"
 * 
 * Note: use "const promiseObj = Promises.getPromise(); await promiseObj;" 
 *       do not use "await Promises.getPromise()", it may cause race condition
 *       when there are multiple sequential "await Promise.getPromise()". In this case,
 *       if we run "Promises.resolvePromise()"" for these awaits, only the first await
 *       is properly resolved. Other awaits will return undefined. Because the 
 *       "Promises.resolvePromise()" synchronously removes the Promise object from Promises,
 *       the "await Promises.getPromise()" later won't be able to obtain the raw Promise
 *       object, and hence returns undefined.
 */
export class Promises {
    queue: Record<string, Required<type_promise>> = {};

    constructor() {
    }

    /**
     * Add a new promise 
     * 
     * The only identifier for a promise is the its name. 
     * 
     * If a promise already exists, the old one is rejected. We cannot keep the old one waiting for garbage collection, 
     * because the Promise object may have been awaitd. In this case, the Promise object is referenced at somewhere, causing 
     * this Promise object never get garbage collected, leading to memory leak.
     */
    appendPromise = (name: string, customProps: Record<string, any> = {}, timeout: number | undefined = undefined) => {
        // reject old promise
        const oldPromise = this.getPromise(name);
        if (oldPromise !== undefined) {
            this.rejectPromise("replaced by a new one");
        }

        let resolveFunc;
        let rejectFunc;
        // the thrown error must be catched in the promise await, should not in here
        let promise = new Promise<any>((resolve, reject) => {
            resolveFunc = resolve;
            rejectFunc = reject;
        });

        this.queue[name] = {
            ...customProps, // spread at the beginnng in case overriding the below fields
            resolveFunc: resolveFunc,
            rejectFunc: rejectFunc,
            promise: promise,
            time: Date.now(),
            timeout: timeout, // unit: second
            timeoutObj: undefined, // will be created when this promise is first get
        };
        this.dummyAwait(name);
    };

    // to prevent the unhandled rejection error if the promise is never awaited
    dummyAwait = async (name: string) => {
        try {
            // no countdown
            await this.getPromise(name, false);
        } catch (e) {
            // GlobalMethods.infoLog(`Promise ${name} is rejected in dummyAwait(). ${e}`);
        }
    };

    // ---------------- getters -------------------

    getPromiseWrapper = (id: string): Required<type_promise> => {
        return this.queue[id.toString()];
    };

    getAllPromiseWrappers = (): Record<string, Required<type_promise>> => {
        return this.queue;
    };

    /**
     * (1) get the Promise object of this promise
     * 
     * (2) start to count down if this promise has a timeout and the startToCountdown bit is true
     * 
     */
    getPromise = (name: string, startToCountdown: boolean = true): Promise<any> | undefined => {
        const wrapper = this.queue[name];
        if (wrapper !== undefined) {
            if (wrapper.timeout !== undefined && startToCountdown && wrapper.timeoutObj === undefined) {
                wrapper.timeoutObj = setTimeout(() => {
                    this.rejectPromise(name, `Promise ${name} timeout [${wrapper.timeout} s]`);
                }, wrapper.timeout * 1000);
            }
            return wrapper.promise;
        } else {
            return undefined;
        }
    };

    public getAllPromiseNames = (): string[] => {
        return Object.keys(this.queue);
    };

    // ---------------- timeout -------------------

    getPromiseTimeoutObj = (name: string): any => {
        return this.queue[name]?.timeoutObj;
    };

    isTimedPromise = (name: string): boolean => {
        const timeoutObj = this.getPromiseTimeoutObj(name);
        return (timeoutObj === undefined ? false : true);
    };

    getPromiseTimeout = (name: string): number | undefined => {
        return this.queue[name]?.timeout;
    };

    // ---------------- resolve -------------------

    /**
     * Obtain the resolve function of Promise object
     * 
     * Note: do not use this resolve function
     */
    getResolveFunc = (name: string) => {
        return this.queue[name]?.resolveFunc;
    };

    /**
     * Resovle the promise, does not return the result
     * 
     * Note: does not return the result
     * 
     * returns {boolean} true if success, false if failed (rejected)
     */
    resolvePromise = (name: string, result: any): boolean => {
        const promise = this.getPromise(name);
        if (promise === undefined) {
            GlobalMethods.infoLog(`promies ${name} does not exist`);
            return false;
        }
        // might be "undefined"
        const resolveFunc = this.getResolveFunc(name);
        const timeoutObj = this.getPromiseTimeoutObj(name);
        clearTimeout(timeoutObj);
        try {
            resolveFunc(result);
            delete this.queue[name];
            return true;
        } catch (e) {
            GlobalMethods.infoLog(e);
            return false;
        }
    };

    // ---------------- reject -------------------

    getAllRejectFuncs = (): any[] => {
        const result: any[] = [];
        for (let name in this.queue) {
            const wrapper = this.queue[name];
            result.push(wrapper.rejectFunc);
        }
        return result;
    };

    getRejectFunc = (name: string): any => {
        return this.queue[name]?.rejectFunc;
    };

    /**
     * Reject a promise
     * 
     * This function does throw an exception, the "await promise" throws the
     * exception with the reason
     * 
     * We must wrap `await promises.getPromise("name")` with try-catch if
     * we do not want the program to quit.
     */
    rejectPromise = (name: string, reason: string = "") => {
        const rejectFunc = this.getRejectFunc(name);
        const timeoutObj = this.getPromiseTimeoutObj(name);
        // do it as early as possible in synchronous code
        // delete a non-existing property does not throw an exception
        delete this.queue[name];
        clearTimeout(timeoutObj);
        try {
            // may be "undefined"
            rejectFunc(reason);
        } catch (e) {
            GlobalMethods.infoLog(`Rejecting Promise ${name} error:`);
            GlobalMethods.infoLog(e);
        }
    };

    rejectAllPromises = () => {
        for (let name in this.queue) {
            this.rejectPromise(name, "all promises are rejected.");
        }
    };
}

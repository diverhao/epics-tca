import { GlobalMethods } from "../Global";

export type type_promise = {
	resolveFunc: any;
	rejectFunc: any;
	promise: Promise<any>;
	time: number;
	timeout: number | undefined;
	timeoutObj: any;
};

export class Promises {
	queue: Record<string, Required<type_promise>> = {};

	constructor() {}

	protected appendPromise = (name: string, customProps: Record<string, any> = {}, timeout: number | undefined = undefined) => {
		let resolveFunc;
		let rejectFunc;
		// the thrown error must be catched in the promise await, should not in here
		let promise = new Promise<any>((resolve, reject) => {
			resolveFunc = resolve;
			rejectFunc = reject;
		});
		// .catch((err: any) => {
		// 	GlobalMethods.errorLog(`Promise ${name} is rejected.`);
		// });

		this.queue[name] = {
			...customProps,
			resolveFunc: resolveFunc,
			rejectFunc: rejectFunc,
			promise: promise,
			time: Date.now(),
			timeout: timeout,
			timeoutObj: undefined,
		};
		this.dummyAwait(name);
	};

	// to prevent the unhandled rejection error if the promise is never awaited
	dummyAwait = async (name: string) => {
		try {
            // no countdown
			await this.getPromise(name, false);
		} catch (e) {
			GlobalMethods.infoLog(`Promise ${name} is rejected in dummyAwait(). ${e}`);
		}
	};

	// ---------------- promise -------------------

	protected getPromiseWrapper = (id: string): Required<type_promise> => {
		return this.queue[id.toString()];
	};

	protected getAllPromiseWrappers = (): Record<string, Required<type_promise>> => {
		return this.queue;
	};

	protected getPromise = (name: string, startToCountdown: boolean = true): Promise<any> => {
		const wrapper = this.queue[name];
		if (wrapper !== undefined) {
			if (wrapper.timeout !== undefined && startToCountdown && wrapper.timeoutObj === undefined) {
				wrapper.timeoutObj = setTimeout(() => {
					this.rejectPromise(name, `Promise ${name} timeout [${wrapper.timeout} s]`);
				}, wrapper.timeout * 1000);
			}
		}
		return this.queue[name]?.promise;
	};

	public getAllPromiseNames = (): string[] => {
		return Object.keys(this.queue);
	};

	// ---------------- timeout -------------------

	protected getPromiseTimeoutObj = (name: string): any => {
		return this.queue[name]?.timeoutObj;
	};

	isTimedPromise = (name: string): boolean => {
		const timeoutObj = this.getPromiseTimeoutObj(name);
        return (timeoutObj === undefined? false: true);
	};

    getPromiseTimeout = (name: string): number | undefined => {
		return this.queue[name]?.timeout;
	};

	// ---------------- resolve -------------------

	protected getResolveFunc = (name: string) => {
		return this.queue[name]?.resolveFunc;
	};

	protected resolvePromise = (name: string, result: any) => {
		// might be "undefined"
		const resolveFunc = this.getResolveFunc(name);
		const timeoutObj = this.getPromiseTimeoutObj(name);
		clearTimeout(timeoutObj);
		try {
			resolveFunc(result);
			delete this.queue[name];
		} catch (e) {
			GlobalMethods.infoLog(e);
		}
	};

	// ---------------- reject -------------------

	protected getAllRejectFuncs = (): any[] => {
		const result: any[] = [];
		for (let name in this.queue) {
			const wrapper = this.queue[name];
			result.push(wrapper.rejectFunc);
		}
		return result;
	};

	protected getRejectFunc = (name: string): any => {
		return this.queue[name]?.rejectFunc;
	};

	// rejection function is catched here
	protected rejectPromise = (name: string, reason: string = "") => {
		const rejectFunc = this.getRejectFunc(name);
		const timeoutObj = this.getPromiseTimeoutObj(name);
        console.log(`promise ${name} timeout = `, this.getPromiseTimeout(name), timeoutObj);
		clearTimeout(timeoutObj);
		try {
			// may be "undefined"
			rejectFunc(`Promise ${name} is rejected. Reason: ${reason}`);
		} catch (e) {
			GlobalMethods.infoLog(`Rejecting Promise ${name} error:`);
			GlobalMethods.infoLog(e);
		}
		// delete a non-existing property does not throw an exception
		delete this.queue[name];
	};

	protected rejectAllPromises = () => {
		for (let name in this.queue) {
			this.rejectPromise(name, "all promises are rejected.");
		}
	};
}

import { GlobalMethods } from "../Global";

export type type_promise = {
	resolveFunc: any;
	rejectFunc: any;
	promise: Promise<any>;
	time: number;
};

export class Promises {
	queue: Record<string, Required<type_promise>> = {};

	constructor() {}

	protected appendPromise = (name: string, customProps: Record<string, any>) => {
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
		};
		this.dummyAwait(name);
	};

	// to prevent the unhandled rejection error if the promise is never awaited
	dummyAwait = async (name: string) => {
		try {
			await this.getPromise(name);
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

	protected getPromise = (name: string): Promise<any> => {
		return this.queue[name]?.promise;
	};

	protected getAllPromises = (): Promise<any>[] => {
		const result: Promise<any>[] = [];
		for (let name in this.queue) {
			const wrapper = this.queue[name];
			result.push(wrapper.promise);
		}
		return result;
	};

	// ---------------- resolve -------------------

	protected getResolveFunc = (name: string) => {
		return this.queue[name]?.resolveFunc;
	};

	protected resolvePromise = (name: string, result: any) => {
		const resolveFunc = this.getResolveFunc(name);
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

	protected rejectPromise = (name: string, reason: string = "") => {
		const rejectFunc = this.getRejectFunc(name);
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
        console.log("-------------------------<")
		for (let name in this.queue) {
            console.log(name)
			this.rejectPromise(name, "all promises are rejected.");
		}
	};
}

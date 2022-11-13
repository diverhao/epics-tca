import { GlobalMethods } from "../Global";

export type type_promise = {
	resolveFunc: any;
	rejectFunc: any;
	promise: Promise<any>;
	time: number;
};

export class Promises {
	protected queue: Record<string, Required<type_promise>> = {};

	constructor() {}

	// used by CA_PROTO_READ_NOTIFY 0x0f, CA_PROTO_WRITE_NOTIFY 0x13, and CA_PROTO_WRITE 0x04
	protected appendPromise = (name: string, customProps: Record<string, any>) => {
		let resolveFunc;
		let rejectFunc;
		let promise = new Promise<any>((resolve, reject) => {
			resolveFunc = resolve;
			rejectFunc = reject;
		});

		this.queue[name] = {
			...customProps,
			resolveFunc: resolveFunc,
			rejectFunc: rejectFunc,
			promise: promise,
			time: Date.now(),
		};
	};

	// ---------------- promise -------------------

	protected getPromiseWrapper = (id: string): Required<type_promise> => {
		return this.queue[id.toString()];
	};

	protected getAllPromiseWrappers = (): Record<string, Required<type_promise>> => {
		return this.queue;
	};

	protected getPromise = (name: string): Promise<any> => {
		return this.queue[name].promise;
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
		return this.queue[name].resolveFunc;
	};

	protected resolvePromise = (name: string, result: any) => {
		const resolveFunc = this.getResolveFunc(name);
		try {
			resolveFunc(result);
			delete this.queue[name];
		} catch (e) {
            GlobalMethods.errorLog(e);
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
		return this.queue[name].rejectFunc;
	};

	protected rejectPromise = (name: string) => {
		const rejectFunc = this.getRejectFunc(name);
		rejectFunc();
		delete this.queue[name];
	};

	protected rejectAllPromises = () => {
		for (let name in this.queue) {
			const wrapper = this.queue[name];
			wrapper.rejectFunc();
		}
	};
}

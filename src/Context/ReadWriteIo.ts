import { time } from "console";
import { Channel } from "../Channel";
import { Environment, GlobalMethods } from "../Global";
import { Promises, type_promise } from "../Promises";

export enum IO_TYPES {
	CA_PROTO_READ_NOTIFY = 15,
	CA_PROTO_WRITE_NOTIFY = 19,
	CA_PROTO_WRITE = 4,
}

interface type_io extends type_promise {
	channel: Channel;
	type: IO_TYPES;
    callback: any;
}

// used only by Context, singleton
export class ReadWriteIos extends Promises {
	queue: Record<string, type_io> = {};
	// the most recent id
	private id: number = 0;
	private constructor() {
		super();
	}

	public static instance: ReadWriteIos;

	public static getInstance = () => {
		if (ReadWriteIos.instance) {
			return this.instance;
		} else {
			return new ReadWriteIos();
		}
	};

	// used by CA_PROTO_READ_NOTIFY 0x0f, CA_PROTO_WRITE_NOTIFY 0x13, and CA_PROTO_WRITE 0x04
	// timeout = second
	appendIo(channel: Channel, type: IO_TYPES, timeout: number | undefined = undefined, callback: any = undefined) {
		const id = this.obtainAnId();
        this.appendPromise(this.id.toString(), {
			channel: channel,
			type: type,
            callback: callback,
		}, timeout);
		return id;
	}

	private obtainAnId = (): number => {
		let id = this.id + 1;
		while (!this.validateId(id)) {
			if (id === 4294967295) {
				id = 0;
			} else {
				id++;
			}
		}
		this.id = id;
		return id;
	};

	private validateId = (id: number): boolean => {
		if (this.getIo(id) !== undefined) {
			return false;
		}
		if (id >= 4294967295 || id < 0) {
			return false;
		}
		return true;
	};

	public getEnv = (
		envName: string = ""
	): string | number | string[] | number[] | Record<string, string | number | string[] | number[]> | undefined => {
		return Environment.getInstance().getEnv(envName);
	};

	// --------------- promise --------------

	getIo = (id: number) => {
		return this.getPromiseWrapper(id.toString());
	};

	getAllIos = () => {
		return this.queue;
	};

	getIoPromise = (id: number) => {
		return this.getPromise(id.toString());
	};

	// -------------- resolve ---------------

	getIoResolveFunc = (id: number) => {
		return this.getResolveFunc(id.toString());
	};

	resolveIo = (id: number, result: any) => {
        // before the resolvePromise()
        const callback = this.getCallback(id);
		this.resolvePromise(id.toString(), result);
        // run callback
        if (callback !== undefined) {
            callback();
        }
	};

    // --------------- callback ------------

    getCallback = (id: number): any => {
        if (this.queue[id.toString()] === undefined) {
            return undefined;
        }
        return this.queue[id.toString()].callback;
    }

	// --------------- reject --------------

	getIoAllRejectFunc = () => {
		return this.getAllRejectFuncs();
	};

	getIoRejectFunc = (id: number) => {
		return this.getRejectFunc(id.toString());
	};

	rejectAllIos = () => {
		this.rejectAllPromises();
	};

	rejectIo = (id: number, reason: string = "") => {
		this.rejectPromise(id.toString(), reason);
	};

	rejectChannelIos = (channelName: string) => {
		GlobalMethods.infoLog(`Rejecting all Read/Write IOs for channel "${channelName}"`);
		for (let idStr in this.queue) {
			const io = this.queue[idStr];
			if (io.channel.getName() === channelName) {
				GlobalMethods.infoLog(` - Read/Write IO ${idStr} is being rejected.`);
				this.rejectIo(parseInt(idStr), "All read/write IOs are rejected");
			}
		}
	};
}

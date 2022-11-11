import { Channel } from "../Channel";

export enum IO_TYPES {
	CA_PROTO_READ_NOTIFY = 15,
	CA_PROTO_WRITE_NOTIFY = 19,
	CA_PROTO_WRITE = 4,
}

type type_io = {
	channel: Channel;
	type: IO_TYPES;
	resolve: any;
	reject: any;
	promise: Promise<any>;
    time: number;
};

export class ReadWriteIos {
	queue: Record<string, type_io> = {};
	// the most recent id
	id: number = 0;
	private constructor() {}

	private static instance: ReadWriteIos;
	public static getInstance = () => {
		if (this.instance) {
			return this.instance;
		} else {
			return new ReadWriteIos();
		}
	};

	// used by CA_PROTO_READ_NOTIFY 0x0f, CA_PROTO_WRITE_NOTIFY 0x13, and CA_PROTO_WRITE 0x04
	appendIo(channel: Channel, type: IO_TYPES): number {
		//todo: a mechanism to recycle ioIDs, 4.3E9 can only handle 10k IOs per second for 5 days
		// 0xFFFFFFFF
		if (this.id === 4294967295) {
			this.id = 0;
		} else {
			this.id++;
		}


		let resolve;
		let reject;
		let promise = new Promise<any>((resolve, reject) => {
			resolve = resolve;
			reject = reject;
		});

		this.queue[this.id.toString()] = {
			channel: channel,
			type: type,
			resolve: resolve,
			reject: reject,
			promise: promise,
            time: Date.now(),
		};
		return this.id;
	}

    obtainAnId = (): number => {
        this.id++;
        while(this.validateId(this.id))
        if (id === 4294967295) {
			this.id = 0;
		} else {
			this.id++;
		}
    }


    validateId = (id: number): boolean => {
        if (this.getIo(id) !== undefined) {
            return false;
        }
        if (id >= 4294967295 || id < 0) {
            return false;
        }
        return true;
    }

	getIo = (id: number): type_io | undefined => {
		return this.queue[id.toString()];
	};

	getIoReject = (id: number) => {
		return this.getIo(id)?.reject;
	};

	getIoResolve = (id: number) => {
		return this.getIo(id)?.resolve;
	};

	getIoPromise = (id: number) => {
		return this.getIo(id)?.promise;
	};

	removeIo = (id: number) => {
		const reject = this.getIoReject(id);
		reject();
		delete this.queue[id.toString()];
	};

	removeAllIos = () => {
		for (let idStr in this.queue) {
            const io = this.queue[idStr];
            io.reject();
            delete this.queue[idStr];
		}
	};

    removeChannelIos = (channelName: string) => {
		for (let idStr in this.queue) {
            const io = this.queue[idStr];
            if (io.channel.getName() === channelName) {
                io.reject();
                delete this.queue[idStr];
            }
		}
    }
}

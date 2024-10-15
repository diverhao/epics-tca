import { Channel } from "../Channel/Channel";
import { GlobalMethods } from "../Global/GlobalMethods";
import { Promises, type_promise } from "../Promises/Promises";

export enum IO_TYPES {
    CA_PROTO_READ_NOTIFY = 15,
    CA_PROTO_WRITE_NOTIFY = 19,
    CA_PROTO_WRITE = 4,
}

interface type_io extends type_promise {
    channel: Channel;
    type: IO_TYPES;
}

/**
 * Used in Context, a singleton class for read and write commands
 * 
 * Used by
 *  - CA_PROTO_READ_NOTIFY 0x0f
 *  - CA_PROTO_WRITE_NOTIFY 0x13
 *  - CA_PROTO_WRITE 0x04
 * in object Channel.
 * 
 * How to use:
 *  (1) add an IO: const ioID = ReadWriteIos.appendIo(...)
 *  (2) block the function using below pattern
 *      const promiseObj = ReadWriteIos.getPromise(ioID), await promiseObj
 *  (3) at some point, resolve the IO:
 *      ReadWriteIos.resolveIo(...)
 * 
 * The IO ID is unique all cross the Context. If the IO ID is used up, the
 * oldest will be rejected.
 */
export class ReadWriteIos extends Promises {
    queue: Record<string, type_io> = {};
    // the most recent id
    private recentId: number = -1;
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

    /**
     * @param {number | undefined} timeout Timeout time for the IO, unit second
     */
    // timeout = second
    appendIo(channel: Channel, type: IO_TYPES, rejectAndReplaceExisting: boolean = true, timeout: number | undefined = undefined) {
        const newId = this.obtainAnId();
        this.appendPromise(newId.toString(),
            rejectAndReplaceExisting,
            {
                channel: channel,
                type: type,
            }, timeout);
        return newId;
    }

    /**
     * generate an IOID for channel access commands 0x0f, 0x13 and 0x04
     * 
     * 4 bytes, 0xffffffff = 4,294,967,295. Each year has 31,536,000 seconds, assuming each second
     * we issue 100 read/write IOs, it could run 1.38 years.
     */
    obtainAnId = (): number => {
        let newId = this.recentId + 1;
        if (newId >= 0xffffffff || newId < 0) {
            newId = 0;
        }
        // reject it anyway, has minimum side effect
        this.rejectIo(newId, `Used up IO IDs, ${newId} is rejected for new IO`);

        this.recentId = newId;
        return newId;
    };

    getRecentIoId = () => {
        return this.recentId;
    }

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
        this.resolvePromise(id.toString(), result);
    };

    // --------------- reject --------------

    getIoAllRejectFunc = () => {
        return this.getAllRejectFuncs();
    };

    getIoRejectFunc = (id: number) => {
        return this.getRejectFunc(id.toString());
    };

    rejectAllIos = (reason: string) => {
        this.rejectAllPromises(reason);
    };

    rejectIo = (id: number, reason: string) => {
        this.rejectPromise(id.toString(), reason);
    };

    rejectChannelIos = (channelName: string) => {
        const idStrs = Object.keys(this.queue);
        for (let idStr in idStrs) {
            const io = this.queue[idStr];
            if (io.channel.getName() === channelName) {
                this.rejectIo(parseInt(idStr), `All read/write IOs are rejected for channel ${channelName}`);
            }
        }
    };
}

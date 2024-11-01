import { IO_TYPES, ReadWriteIos } from "../Context/ReadWriteIos";
import { Channel } from "../Channel/Channel";
import { Context } from "../Context/Context";
import { PromisesCode } from "../Promises/Promises";

/**
 * This test takes about 9 s
 */

describe("ReadWriteIo", () => {
    describe("resolve", () => {
        it("add an IO, with an automatically generated IO ID", () => {
            const context = new Context();
            const channel = new Channel(context, "pv1","ca");
            const rwIos = ReadWriteIos.getInstance();
            const ioId = rwIos.appendIo(channel, IO_TYPES.CA_PROTO_READ_NOTIFY)
            expect(ioId).toBe(0);
        })

        it("add multiple IO, with automatically generated IO IDs", () => {
            const context = new Context();
            const channel = new Channel(context, "pv1","ca");
            const rwIos = ReadWriteIos.getInstance();
            const ioId0 = rwIos.appendIo(channel, IO_TYPES.CA_PROTO_READ_NOTIFY)
            const ioId1 = rwIos.appendIo(channel, IO_TYPES.CA_PROTO_READ_NOTIFY)
            const ioId2 = rwIos.appendIo(channel, IO_TYPES.CA_PROTO_READ_NOTIFY)
            expect([ioId0, ioId1, ioId2]).toEqual([0, 1, 2]);
        })

        it("add one IO, resolve it after 1 second", async () => {
            const context = new Context();
            const channel = new Channel(context, "pv1","ca");
            const rwIos = ReadWriteIos.getInstance();
            const ioId = rwIos.appendIo(channel, IO_TYPES.CA_PROTO_READ_NOTIFY)
            const promiseObj = rwIos.getIoPromise(ioId);
            setTimeout(() => {
                rwIos.resolveIo(ioId, "ABC");
            }, 1000);
            const result = await promiseObj;
            expect(result).toBe("ABC");
        })

        it("add multiple IOs, resolve them after 1 second", async () => {
            const context = new Context();
            const channel = new Channel(context, "pv1","ca");
            const rwIos = ReadWriteIos.getInstance();
            const ioId1 = rwIos.appendIo(channel, IO_TYPES.CA_PROTO_READ_NOTIFY)
            const promiseObj1 = rwIos.getIoPromise(ioId1);
            const ioId2 = rwIos.appendIo(channel, IO_TYPES.CA_PROTO_READ_NOTIFY)
            const promiseObj2 = rwIos.getIoPromise(ioId2);
            const ioId3 = rwIos.appendIo(channel, IO_TYPES.CA_PROTO_READ_NOTIFY)
            const promiseObj3 = rwIos.getIoPromise(ioId3);
            setTimeout(() => {
                rwIos.resolveIo(ioId1, "ABC");
                rwIos.resolveIo(ioId2, "DEF");
                rwIos.resolveIo(ioId3, "GHI");
            }, 1000);
            const result1 = await promiseObj1;
            const result2 = await promiseObj2;
            const result3 = await promiseObj3;
            expect([result1, result2, result3]).toEqual(["ABC", "DEF", "GHI"]);
        })
    })

    describe("reject", () => {
        it("add an IO, reject it", async () => {
            const context = new Context();
            const channel = new Channel(context, "pv1","ca");
            const rwIos = ReadWriteIos.getInstance();
            const ioId = rwIos.appendIo(channel, IO_TYPES.CA_PROTO_READ_NOTIFY)
            const promiseObj = rwIos.getIoPromise(ioId);
            let errorCode = "";
            setTimeout(() => {
                rwIos.rejectIo(ioId, "not ok");
            }, 1000);
            try {
                await promiseObj;
            } catch (e) {
                errorCode = `${e}`;
            }
            expect(errorCode).toBe("not ok");
        })

        it("add multiple IOs, reject them one by one", async () => {
            const context = new Context();
            const channel = new Channel(context, "pv1","ca");
            const rwIos = ReadWriteIos.getInstance();
            const ioId1 = rwIos.appendIo(channel, IO_TYPES.CA_PROTO_READ_NOTIFY)
            const promiseObj1 = rwIos.getIoPromise(ioId1);
            const ioId2 = rwIos.appendIo(channel, IO_TYPES.CA_PROTO_READ_NOTIFY)
            const promiseObj2 = rwIos.getIoPromise(ioId2);
            const ioId3 = rwIos.appendIo(channel, IO_TYPES.CA_PROTO_READ_NOTIFY)
            const promiseObj3 = rwIos.getIoPromise(ioId3);
            let errorCode1 = "";
            let errorCode2 = "";
            let errorCode3 = "";
            setTimeout(() => {
                rwIos.rejectIo(ioId1, "not ok 1");
                rwIos.rejectIo(ioId2, "not ok 2");
                rwIos.rejectIo(ioId3, "not ok 3");
            }, 1000);
            try {
                await promiseObj1;
            } catch (e) {
                errorCode1 = `${e}`;
            }
            try {
                await promiseObj2;
            } catch (e) {
                errorCode2 = `${e}`;
            }
            try {
                await promiseObj3;
            } catch (e) {
                errorCode3 = `${e}`;
            }
            expect([errorCode1, errorCode2, errorCode3]).toEqual(["not ok 1", "not ok 2", "not ok 3"]);
        })


        it("add multiple IOs, reject them use ReadWriteIos.rejectAllIos()", async () => {
            const context = new Context();
            const channel = new Channel(context, "pv1","ca");
            const rwIos = ReadWriteIos.getInstance();
            const ioId1 = rwIos.appendIo(channel, IO_TYPES.CA_PROTO_READ_NOTIFY)
            const promiseObj1 = rwIos.getIoPromise(ioId1);
            const ioId2 = rwIos.appendIo(channel, IO_TYPES.CA_PROTO_READ_NOTIFY)
            const promiseObj2 = rwIos.getIoPromise(ioId2);
            const ioId3 = rwIos.appendIo(channel, IO_TYPES.CA_PROTO_READ_NOTIFY)
            const promiseObj3 = rwIos.getIoPromise(ioId3);
            let errorCode1 = "";
            let errorCode2 = "";
            let errorCode3 = "";
            setTimeout(() => {
                rwIos.rejectAllIos("not ok all");
            }, 1000);
            try {
                await promiseObj1;
            } catch (e) {
                errorCode1 = `${e}`;
            }
            try {
                await promiseObj2;
            } catch (e) {
                errorCode2 = `${e}`;
            }
            try {
                await promiseObj3;
            } catch (e) {
                errorCode3 = `${e}`;
            }
            expect([errorCode1, errorCode2, errorCode3]).toEqual(["not ok all", "not ok all", "not ok all"]);
        })
    })

    describe("timeout", () => {

        it("add one IO with timeout, reject after timeout", async () => {
            const context = new Context();
            const channel = new Channel(context, "pv1","ca");
            const rwIos = ReadWriteIos.getInstance();
            const ioId = rwIos.appendIo(channel, IO_TYPES.CA_PROTO_READ_NOTIFY, true, 1);
            const promiseObj = rwIos.getIoPromise(ioId);
            let errorCode = "";
            try {
                await promiseObj;
            } catch (e) {
                errorCode = `${e}`;
            }
            expect(errorCode).toBe(PromisesCode["REJECT_TIMEOUT"]);
        })

        it("add one IO with very long timeout, resolve before timeout", async () => {
            const context = new Context();
            const channel = new Channel(context, "pv1","ca");
            const rwIos = ReadWriteIos.getInstance();
            // insanely long time
            const ioId = rwIos.appendIo(channel, IO_TYPES.CA_PROTO_READ_NOTIFY, true, 1000);
            const promiseObj = rwIos.getIoPromise(ioId);
            let result = "";
            setTimeout(() => {
                rwIos.resolveIo(ioId, "ABC")
            }, 500)
            result = await promiseObj;
            expect(result).toBe("ABC");
        })

        it("add multiple IOs, one has timeout, reject after timeout, it rejects before others resolve", async () => {
            const context = new Context();
            const channel = new Channel(context, "pv1","ca");
            const rwIos = ReadWriteIos.getInstance();
            const ioId1 = rwIos.appendIo(channel, IO_TYPES.CA_PROTO_READ_NOTIFY, true, 1);
            const ioId2 = rwIos.appendIo(channel, IO_TYPES.CA_PROTO_READ_NOTIFY);
            const ioId3 = rwIos.appendIo(channel, IO_TYPES.CA_PROTO_READ_NOTIFY);
            const promiseObj1 = rwIos.getIoPromise(ioId1);
            const promiseObj2 = rwIos.getIoPromise(ioId2);
            const promiseObj3 = rwIos.getIoPromise(ioId3);
            let errorCode1 = "";
            let result2 = "";
            let result3 = "";
            setTimeout(() => {
                rwIos.resolveIo(ioId2, "DEF")
                rwIos.resolveIo(ioId3, "GHI")
            }, 1500)

            try {
                await promiseObj1;
            } catch (e) {
                errorCode1 = `${e}`;
            }
            result2 = await promiseObj2;
            result3 = await promiseObj3;

            expect([errorCode1, result2, result3]).toEqual([PromisesCode["REJECT_TIMEOUT"], "DEF", "GHI"]);
        })

        it("add multiple IOs, one has timeout, reject after timeout, it rejects after others resolve", async () => {
            const context = new Context();
            const channel = new Channel(context, "pv1","ca");
            const rwIos = ReadWriteIos.getInstance();
            const ioId1 = rwIos.appendIo(channel, IO_TYPES.CA_PROTO_READ_NOTIFY, true, 1);
            const ioId2 = rwIos.appendIo(channel, IO_TYPES.CA_PROTO_READ_NOTIFY);
            const ioId3 = rwIos.appendIo(channel, IO_TYPES.CA_PROTO_READ_NOTIFY);
            const promiseObj1 = rwIos.getIoPromise(ioId1);
            const promiseObj2 = rwIos.getIoPromise(ioId2);
            const promiseObj3 = rwIos.getIoPromise(ioId3);
            let errorCode1 = "";
            let result2 = "";
            let result3 = "";
            setTimeout(() => {
                rwIos.resolveIo(ioId2, "DEF")
                rwIos.resolveIo(ioId3, "GHI")
            }, 500)

            try {
                await promiseObj1;
            } catch (e) {
                errorCode1 = `${e}`;
            }
            result2 = await promiseObj2;
            result3 = await promiseObj3;

            expect([errorCode1, result2, result3]).toEqual([PromisesCode["REJECT_TIMEOUT"], "DEF", "GHI"]);
        })
    })
})

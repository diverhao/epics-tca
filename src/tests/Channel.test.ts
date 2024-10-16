import { Context, Context_STATES } from "../Context/Context";
import { ChannelMonitor, ChannelMonitor_STATES } from "../Channel/ChannelMonitor";
import { CA_ALARM_SEVRITY, CA_ALARM_STATUS, Channel, Channel_DBR_TYPES, Channel_STATES } from "../Channel/Channel";
import { createServer, Socket } from "net";
import { isPowerOfTwo } from "../Global/GlobalMethods";
import { ECA, ECA_SEVERITIES } from "../ECA/ECA";
import { TCPTransport_STATES } from "../TCPTransport/TCPTransport";

/**
 * Must start the IOC from scratch for this test
 */

let searchCounter = 0;
/**
 * A mockup function for Channel.doSearchPV() for the purpose of test
 */
const doSearchPV = (maxSearchPeriod: number, minSearchPeriod: number): boolean => {
    let searchCounterMax = Math.max(Math.round(maxSearchPeriod / minSearchPeriod), 1);
    let searchCounterMaxP2 = (1 << (Math.floor(Math.log2(searchCounterMax * 2))));

    searchCounter++;
    if (searchCounter <= searchCounterMaxP2) {
        return isPowerOfTwo(searchCounter);
    } else {
        // each period is searchCounterMax
        const tmp = (searchCounter - searchCounterMaxP2) % searchCounterMax;
        if (tmp === 0) {
            return true;
        } else {
            return false;
        }
    }
};


describe("Channel", () => {

    describe("prerequisite test", () => {
        it("Ensure there is an IOC running", (done: jest.DoneCallback) => {
            const server = createServer();
            // an IOC binds 5064 TCP port for all network interfaces
            server.listen(5064, "0.0.0.0");
            let result = false;
            server.on("error", () => {
                result = true;
            })
            setTimeout(() => {
                server.close();
                expect(result).toBe(true);
                done();
            }, 500);
        })
    })

    // describe("Context.createChannel()", () => {

    //     it("Create and initialize context, then quit", (done: jest.DoneCallback) => {
    //         const contex = new Context();
    //         contex.initialize().then(() => {
    //             contex.destroyHard();
    //             setTimeout(() => {
    //                 expect(contex.getState()).toBe(Context_STATES.DESTROYED);
    //                 done();
    //             }, 200)
    //         })
    //     })

    //     it("Connect and create a channel, make sure it exists, then destroy context", (done: jest.DoneCallback) => {
    //         const contex = new Context();
    //         contex.initialize().then(async () => {
    //             const channel = await contex.createChannel("val7");
    //             setTimeout(() => {
    //                 contex.destroyHard();
    //                 expect(channel).not.toBe(undefined);
    //                 done();
    //             }, 500)
    //         })
    //     })


    //     it("Run Context.createChannel() twice synchronously, Context.createChannel() is invoked again before the first invocation resolves/rejects", (done: jest.DoneCallback) => {
    //         const contex = new Context();
    //         contex.initialize().then(async () => {
    //             let channel1: any;
    //             contex.createChannel("val7").then((result) => { channel1 = result });
    //             let channel2: any;
    //             // before the first createChannel() resolves/rejects
    //             contex.createChannel("val7").then((result) => { channel2 = result });
    //             setTimeout(() => {
    //                 contex.destroyHard();
    //                 expect(channel1).toBe(channel2);
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("Run Context.createChannel() twice asynchronously, the 2nd invocation is invoked after the 1st one resolves/rejects", (done: jest.DoneCallback) => {
    //         const contex = new Context();
    //         contex.initialize().then(async () => {
    //             const channel1 = await contex.createChannel("val7");
    //             const channel2 = await contex.createChannel("val7");
    //             setTimeout(() => {
    //                 contex.destroyHard();
    //                 expect(channel1).toBe(channel2);
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("Run Context.createChannel() twice synchronously for an non-existing channel with timeout, returns undefined", (done: jest.DoneCallback) => {
    //         const contex = new Context();
    //         contex.initialize().then(async () => {
    //             let channel1: any;
    //             contex.createChannel("valAAA7", 0.5).then((result) => { channel1 = result });
    //             let channel2: any;
    //             // before the first createChannel() resolves/rejects
    //             contex.createChannel("valAAA7", 0.5).then((result) => { channel2 = result });
    //             setTimeout(() => {
    //                 expect([channel1, channel2]).toEqual([undefined, undefined]);
    //                 contex.destroyHard();
    //                 done();
    //             }, 1000)
    //         })
    //     })

    //     it("Run Context.createChannel() twice synchronously for an non-existing channel with timeout, they are both destoryed hard", (done: jest.DoneCallback) => {
    //         const contex = new Context();
    //         contex.initialize().then(async () => {
    //             let channel1: any;
    //             contex.createChannel("valAAA7", 0.5).then((result) => { channel1 = result });
    //             let channel2: any;
    //             // before the first createChannel() resolves/rejects
    //             contex.createChannel("valAAA7", 0.5).then((result) => { channel2 = result });
    //             setTimeout(() => {
    //                 const chan = contex.getChannel("valAAA7");
    //                 expect(chan).toBe(undefined);
    //                 contex.destroyHard();
    //                 done();
    //             }, 1000)
    //         })
    //     })


    //     it("Run Context.createChannel() twice synchronously for an non-existing channel with timeout, this channel's state is DESTROYED", (done: jest.DoneCallback) => {
    //         const contex = new Context();
    //         contex.initialize().then(async () => {
    //             contex.createChannel("valAAA7", 0.5);
    //             contex.createChannel("valAAA7", 0.5);
    //             const channel = contex.getChannel("valAAA7");
    //             setTimeout(() => {
    //                 expect(channel?.getState()).toBe(Channel_STATES.DESTROYED);
    //                 contex.destroyHard();
    //                 done();
    //             }, 1000)
    //         })
    //     })


    //     it("Creat a channel that is not serviced with a creation timeout, it returns undefined", (done: jest.DoneCallback) => {
    //         const contex = new Context();
    //         contex.initialize().then(async () => {
    //             const channel = await contex.createChannel("valAAA7", 1);
    //             setTimeout(() => {
    //                 contex.destroyHard();
    //                 expect(channel).toBe(undefined);
    //                 done();
    //             }, 1500)
    //         })
    //     })

    //     it("Creat a channel that is not serviced without a creation timeout, the createChannel() never resolves", (done: jest.DoneCallback) => {
    //         const contex = new Context();
    //         contex.initialize().then(async () => {
    //             let created = false;
    //             contex.createChannel("valAAA7").then(() => {
    //                 // the creationCh
    //                 created = true;
    //             })
    //             setTimeout(() => {
    //                 contex.destroyHard();
    //                 expect(created).toBe(false);
    //                 done();
    //             }, 1500)
    //         })
    //     })

    //     it("Creat a channel with a creation timeout, found the channel before timeout", (done: jest.DoneCallback) => {
    //         const contex = new Context();
    //         contex.initialize().then(async () => {
    //             contex.createChannel("val7", 0.5).then((channel: Channel | undefined) => {
    //                 setTimeout(() => {
    //                     contex.destroyHard();
    //                     expect(channel).not.toBe(undefined);
    //                     done();
    //                 }, 500)
    //             })
    //         })
    //     })

    //     it("Create multiple channels", (done: jest.DoneCallback) => {
    //         const contex = new Context();
    //         contex.initialize().then(async () => {
    //             const channel1 = contex.createChannel("val7");
    //             const channel2 = contex.createChannel("val8");
    //             const channel3 = contex.createChannel("val9");
    //             setTimeout(() => {
    //                 expect([channel1, channel2, channel3]).not.toEqual([undefined, undefined, undefined]);
    //                 contex.destroyHard();
    //                 done();
    //             }, 1000)
    //         })
    //     })
    // })

    // describe("Search PV timing sequence", () => {
    //     it("doSearchPV() function, 10000 ticks, max period is 3000 ticks", () => {
    //         // do this for each test
    //         searchCounter = 0;
    //         const result: number[] = [];
    //         for (let ii = 0; ii < 10000; ii++) {
    //             const search = doSearchPV(300, 0.1);
    //             if (search === true) {
    //                 result.push(ii);
    //             }
    //         }
    //         const resultCompare: number[] = [0, 1, 3, 7, 15, 31, 63, 127, 255, 511, 1023, 2047, 4095, 7095];
    //         expect(result).toEqual(resultCompare)
    //     })

    //     it("doSearchPV() function, 2000 ticks, max period is 300 ticks", () => {
    //         // do this for each test
    //         searchCounter = 0;
    //         const result: number[] = [];
    //         for (let ii = 0; ii < 2000; ii++) {
    //             const search = doSearchPV(30, 0.1);
    //             if (search === true) {
    //                 result.push(ii);
    //             }
    //         }
    //         const resultCompare: number[] = [0, 1, 3, 7, 15, 31, 63, 127, 255, 511, 811, 1111, 1411, 1711];
    //         expect(result).toEqual(resultCompare)
    //     })


    //     it("doSearchPV() function, 10 ticks, max period is the same as min period -- flat search rate", () => {
    //         // do this for each test
    //         searchCounter = 0;
    //         const result: number[] = [];
    //         for (let ii = 0; ii < 10; ii++) {
    //             const search = doSearchPV(15, 15);
    //             if (search === true) {
    //                 result.push(ii);
    //             }
    //         }
    //         const resultCompare: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    //         expect(result).toEqual(resultCompare)
    //     })


    //     it("doSearchPV() function, 10 ticks, max period is slightly larger than min period -- flat search rate", () => {
    //         // do this for each test
    //         searchCounter = 0;
    //         const result: number[] = [];
    //         for (let ii = 0; ii < 10; ii++) {
    //             const search = doSearchPV(17, 15);
    //             if (search === true) {
    //                 result.push(ii);
    //             }
    //         }
    //         const resultCompare: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    //         expect(result).toEqual(resultCompare)
    //     })


    //     it("doSearchPV() function, 10 ticks, illegal maxSearchPeriod and minSearchPeriod -- flat search rate", () => {
    //         // do this for each test
    //         searchCounter = 0;
    //         const result: number[] = [];
    //         for (let ii = 0; ii < 10; ii++) {
    //             // maxSearchPeriod is smaller than minimum search period
    //             const search = doSearchPV(15, 150);
    //             if (search === true) {
    //                 result.push(ii);
    //             }
    //         }
    //         const resultCompare: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    //         expect(result).toEqual(resultCompare)
    //     })
    // })

    // describe("get DBR type in Channel", () => {

    //     it("NOT_AVAILABLE type -- EPICS TCA's special type", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             // try to create a non-servicing channel
    //             const channel = new Channel(context, "valAB8888");
    //             setTimeout(() => {
    //                 const dbrTypeStr = channel.getDbrTypeStr();
    //                 const dbrType = channel.getDbrType();
    //                 expect([dbrType, dbrTypeStr]).toEqual([-1, "NOT_AVAILABLE"]);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("Create a servicing channel, check its type", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             // try to create a non-servicing channel
    //             const channel = await context.createChannel("val7");
    //             if (channel !== undefined) {
    //                 const dbrTypeStr = channel.getDbrTypeStr();
    //                 const dbrType = channel.getDbrType();
    //                 expect([dbrType, dbrTypeStr]).toEqual([6, "DBR_DOUBLE"]);
    //             } else {
    //                 expect(true).toBe(false);
    //             }
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("Create a servicing channel, check its type of STS", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             // try to create a non-servicing channel
    //             const channel = await context.createChannel("val7");
    //             if (channel !== undefined) {
    //                 const dbrTypeStr = channel.getDbrTypeStr_STS();
    //                 const dbrType = channel.getDbrType_STS();
    //                 console.log([dbrType, dbrTypeStr])
    //                 expect([dbrType, dbrTypeStr]).toEqual([Channel_DBR_TYPES.DBR_STS_DOUBLE, "DBR_STS_DOUBLE"]);
    //             } else {
    //                 expect(true).toBe(false);
    //             }
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("Create a servicing channel, check its type of TIME", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             // try to create a non-servicing channel
    //             const channel = await context.createChannel("val7");
    //             if (channel !== undefined) {
    //                 const dbrTypeStr = channel.getDbrTypeStr_TIME();
    //                 const dbrType = channel.getDbrType_TIME();
    //                 expect([dbrType, dbrTypeStr]).toEqual([20, "DBR_TIME_DOUBLE"]);
    //             } else {
    //                 expect(true).toBe(false);
    //             }
    //             context.destroyHard();
    //             done();
    //         })
    //     })


    //     it("Create a servicing channel, check its type of GR", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             // try to create a non-servicing channel
    //             const channel = await context.createChannel("val7");
    //             if (channel !== undefined) {
    //                 const dbrTypeStr = channel.getDbrTypeStr_GR();
    //                 const dbrType = channel.getDbrType_GR();
    //                 expect([dbrType, dbrTypeStr]).toEqual([27, "DBR_GR_DOUBLE"]);
    //             } else {
    //                 expect(true).toBe(false);
    //             }
    //             context.destroyHard();
    //             done();
    //         })
    //     })



    //     it("Create a servicing channel, check its type of CTRL", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             // try to create a non-servicing channel
    //             const channel = await context.createChannel("val7");
    //             if (channel !== undefined) {
    //                 const dbrTypeStr = channel.getDbrTypeStr_CTRL();
    //                 const dbrType = channel.getDbrType_CTRL();
    //                 expect([dbrType, dbrTypeStr]).toEqual([34, "DBR_CTRL_DOUBLE"]);
    //             } else {
    //                 expect(true).toBe(false);
    //             }
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    // })

    // describe("GET base DBR type", () => {
    //     it("simple GET", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             await channel?.put(1234.5678901234, undefined, true);
    //             const data = await channel?.get();
    //             expect(data?.value).toBe(1234.5678901234);
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("simple GET with timeout, get the data before timeout", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(1);
    //             expect(data?.value).toBe(1234.5678901234);
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("simple GET DBR_STRING -- round value", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_STRING);
    //             expect(data?.value).toBe("1235");
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("simple GET DBR_INT -- round down", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_INT);
    //             expect(data?.value).toBe(1234);
    //             context.destroyHard();
    //             done();
    //         })
    //     })


    //     it("simple GET DBR_FLOAT", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_FLOAT);
    //             // 1234.5678901234 is deformed to 1234.56787109375, 01000100100110100101001000101100
    //             expect(data?.value).toBe(1234.56787109375);
    //             context.destroyHard();
    //             done();
    //         })
    //     })


    //     it("simple GET DBR_ENUM -- even though there are up to 16 enum choices, we still get a round down integer", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_ENUM);
    //             // 1234.5678901234 is deformed to 1234.56787109375, 01000100100110100101001000101100
    //             expect(data?.value).toBe(1234);
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("simple GET DBR_CHAR -- returns the round down number with range -128 to 127", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_CHAR);
    //             // round down 1234.5678901234 to 1234, then 1234 - 256 * 4 = 210 > 127, so the result is 210 - 256 = -46
    //             expect(data?.value).toBe(-46);
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("simple GET DBR_LONG -- round down to integer", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_LONG);
    //             expect(data?.value).toBe(1234);
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("simple GET DBR_DOUBLE -- accurate value", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_DOUBLE);
    //             expect(data?.value).toBe(1234.5678901234);
    //             context.destroyHard();
    //             done();
    //         })
    //     })
    // })

    // describe("GET STS DBR type", () => {

    //     it("simple GET DBR_STS_STRING -- round value", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_STS_STRING);
    //             expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: "1235" });
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("simple GET DBR_STS_INT -- round down", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_STS_INT);
    //             expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: 1234 });
    //             context.destroyHard();
    //             done();
    //         })
    //     })


    //     it("simple GET DBR_STS_FLOAT", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_STS_FLOAT);
    //             // 1234.5678901234 is deformed to 1234.56787109375, 01000100100110100101001000101100
    //             expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: 1234.56787109375 });
    //             context.destroyHard();
    //             done();
    //         })
    //     })


    //     it("simple GET DBR_STS_ENUM -- even though there are up to 16 enum choices, we still get a round down integer", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_STS_ENUM);
    //             expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: 1234 });
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("simple GET DBR_STS_CHAR -- returns the round down number with range -128 to 127", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_STS_CHAR);
    //             // round down 1234.5678901234 to 1234, then 1234 - 256 * 4 = 210 > 127, so the result is 210 - 256 = -46
    //             expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: -46 });
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("simple GET DBR_STS_LONG -- round down to integer", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_STS_LONG);
    //             expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: 1234 });
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("simple GET DBR_STS_DOUBLE -- accurate value", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_STS_DOUBLE);
    //             expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: 1234.5678901234 });
    //             context.destroyHard();
    //             done();
    //         })
    //     })
    // })

    // describe("GET TIME DBR type", () => {

    //     it("simple GET DBR_TIME_STRING -- round value", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_TIME_STRING);
    //             if (data !== undefined) {
    //                 data["secondsSinceEpoch"] = typeof data["secondsSinceEpoch"] as any;
    //                 data["nanoSeconds"] = typeof data["nanoSeconds"] as any;
    //             }
    //             expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: "1235", secondsSinceEpoch: "number", nanoSeconds: "number" });
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("simple GET DBR_TIME_INT -- round down", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_TIME_INT);
    //             if (data !== undefined) {
    //                 data["secondsSinceEpoch"] = typeof data["secondsSinceEpoch"] as any;
    //                 data["nanoSeconds"] = typeof data["nanoSeconds"] as any;
    //             }
    //             expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: 1234, secondsSinceEpoch: "number", nanoSeconds: "number" });
    //             context.destroyHard();
    //             done();
    //         })
    //     })


    //     it("simple GET DBR_TIME_FLOAT", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_TIME_FLOAT);
    //             if (data !== undefined) {
    //                 data["secondsSinceEpoch"] = typeof data["secondsSinceEpoch"] as any;
    //                 data["nanoSeconds"] = typeof data["nanoSeconds"] as any;
    //             }
    //             // 1234.5678901234 is deformed to 1234.56787109375, 01000100100110100101001000101100
    //             expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: 1234.56787109375, secondsSinceEpoch: "number", nanoSeconds: "number" });
    //             context.destroyHard();
    //             done();
    //         })
    //     })


    //     it("simple GET DBR_TIME_ENUM -- even though there are up to 16 enum choices, we still get a round down integer", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_TIME_ENUM);
    //             if (data !== undefined) {
    //                 data["secondsSinceEpoch"] = typeof data["secondsSinceEpoch"] as any;
    //                 data["nanoSeconds"] = typeof data["nanoSeconds"] as any;
    //             }
    //             expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: 1234, secondsSinceEpoch: "number", nanoSeconds: "number" });
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("simple GET DBR_TIME_CHAR -- returns the round down number with range -128 to 127", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_TIME_CHAR);
    //             if (data !== undefined) {
    //                 data["secondsSinceEpoch"] = typeof data["secondsSinceEpoch"] as any;
    //                 data["nanoSeconds"] = typeof data["nanoSeconds"] as any;
    //             }
    //             // round down 1234.5678901234 to 1234, then 1234 - 256 * 4 = 210 > 127, so the result is 210 - 256 = -46
    //             expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: -46, secondsSinceEpoch: "number", nanoSeconds: "number" });
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("simple GET DBR_TIME_LONG -- round down to integer", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_TIME_LONG);
    //             if (data !== undefined) {
    //                 data["secondsSinceEpoch"] = typeof data["secondsSinceEpoch"] as any;
    //                 data["nanoSeconds"] = typeof data["nanoSeconds"] as any;
    //             }
    //             expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: 1234, secondsSinceEpoch: "number", nanoSeconds: "number" });
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("simple GET DBR_TIME_DOUBLE -- accurate value", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_TIME_DOUBLE);
    //             if (data !== undefined) {
    //                 data["secondsSinceEpoch"] = typeof data["secondsSinceEpoch"] as any;
    //                 data["nanoSeconds"] = typeof data["nanoSeconds"] as any;
    //             }
    //             expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: 1234.5678901234, secondsSinceEpoch: "number", nanoSeconds: "number" });
    //             context.destroyHard();
    //             done();
    //         })
    //     })
    // })

    // describe("GET GR DBR type", () => {

    //     it("simple GET DBR_GR_STRING -- round value", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_GR_STRING);
    //             // there is no "units"
    //             expect(data).toEqual({
    //                 status: CA_ALARM_STATUS.HIHI,
    //                 severity: CA_ALARM_SEVRITY.MAJOR,
    //                 value: "1235",
    //             });
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("simple GET DBR_GR_INT -- round down", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_GR_INT);
    //             expect(data).toEqual({
    //                 status: CA_ALARM_STATUS.HIHI,
    //                 severity: CA_ALARM_SEVRITY.MAJOR,
    //                 value: 1234,
    //                 units: "km",
    //                 upper_display_limit: 8765,
    //                 lower_display_limit: 765,
    //                 upper_alarm_limit: 1000,
    //                 upper_warning_limit: 0,
    //                 lower_warning_limit: 0,
    //                 lower_alarm_limit: 0,
    //             });
    //             context.destroyHard();
    //             done();
    //         })
    //     })


    //     it("simple GET DBR_GR_FLOAT", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_GR_FLOAT);
    //             // 1234.5678901234 is deformed to 1234.56787109375, 01000100100110100101001000101100
    //             expect(data).toEqual({
    //                 status: CA_ALARM_STATUS.HIHI,
    //                 severity: CA_ALARM_SEVRITY.MAJOR,
    //                 value: 1234.56787109375,
    //                 units: "km",
    //                 precision: 0,
    //                 padding: 1,
    //                 upper_display_limit: 8765.431640625,
    //                 lower_display_limit: 765.43212890625,
    //                 upper_alarm_limit: 1000,
    //                 upper_warning_limit: 0,
    //                 lower_warning_limit: 0,
    //                 lower_alarm_limit: 0,
    //             });
    //             context.destroyHard();
    //             done();
    //         })
    //     })


    //     it("simple GET DBR_GR_ENUM", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_GR_ENUM);
    //             expect(data).toEqual({
    //                 status: CA_ALARM_STATUS.HIHI,
    //                 severity: CA_ALARM_SEVRITY.MAJOR,
    //                 value: 1234,
    //                 number_of_string_used: 0,
    //                 strings: ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    //             });
    //             context.destroyHard();
    //             done();
    //         })
    //     })


    //     it("simple GET DBR_GR_CHAR", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_GR_CHAR);
    //             expect(data).toEqual({
    //                 status: CA_ALARM_STATUS.HIHI,
    //                 severity: CA_ALARM_SEVRITY.MAJOR,
    //                 value: -46,
    //                 units: "km",
    //                 upper_display_limit: 61,
    //                 lower_display_limit: -3,
    //                 upper_alarm_limit: -24,
    //                 upper_warning_limit: 0,
    //                 lower_warning_limit: 0,
    //                 lower_alarm_limit: 0,
    //             });
    //             context.destroyHard();
    //             done();
    //         })
    //     })


    //     it("simple GET DBR_GR_LONG", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_GR_LONG);
    //             expect(data).toEqual({
    //                 status: CA_ALARM_STATUS.HIHI,
    //                 severity: CA_ALARM_SEVRITY.MAJOR,
    //                 value: 1234,
    //                 units: "km",
    //                 upper_display_limit: 8765,
    //                 lower_display_limit: 765,
    //                 upper_alarm_limit: 1000,
    //                 upper_warning_limit: 0,
    //                 lower_warning_limit: 0,
    //                 lower_alarm_limit: 0,
    //             });
    //             context.destroyHard();
    //             done();
    //         })
    //     })



    //     it("simple GET DBR_GR_DOUBLE", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_GR_DOUBLE);
    //             expect(data).toEqual({
    //                 status: CA_ALARM_STATUS.HIHI,
    //                 severity: CA_ALARM_SEVRITY.MAJOR,
    //                 value: 1234.5678901234,
    //                 units: "km",
    //                 precision: 0,
    //                 padding: 1,
    //                 upper_display_limit: 8765.4321,
    //                 lower_display_limit: 765.4321,
    //                 upper_alarm_limit: 1000,
    //                 upper_warning_limit: 0,
    //                 lower_warning_limit: 0,
    //                 lower_alarm_limit: 0,
    //             });
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    // })

    // describe("GET CTRL DBR type", () => {

    //     it("simple GET DBR_CTRL_STRING -- round value", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_CTRL_STRING);
    //             // there is no "units"
    //             expect(data).toEqual({
    //                 status: CA_ALARM_STATUS.HIHI,
    //                 severity: CA_ALARM_SEVRITY.MAJOR,
    //                 value: "1235",
    //             });
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("simple GET DBR_CTRL_INT -- round down", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_CTRL_INT);
    //             expect(data).toEqual({
    //                 status: CA_ALARM_STATUS.HIHI,
    //                 severity: CA_ALARM_SEVRITY.MAJOR,
    //                 value: 1234,
    //                 units: "km",
    //                 upper_display_limit: 8765,
    //                 lower_display_limit: 765,
    //                 upper_alarm_limit: 1000,
    //                 upper_warning_limit: 0,
    //                 lower_warning_limit: 0,
    //                 lower_alarm_limit: 0,
    //                 upper_ctrl_limit: 8765,
    //                 lower_ctrl_limit: 765,
    //             });
    //             context.destroyHard();
    //             done();
    //         })
    //     })


    //     it("simple GET DBR_CTRL_FLOAT", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_CTRL_FLOAT);
    //             // 1234.5678901234 is deformed to 1234.56787109375, 01000100100110100101001000101100
    //             expect(data).toEqual({
    //                 status: CA_ALARM_STATUS.HIHI,
    //                 severity: CA_ALARM_SEVRITY.MAJOR,
    //                 value: 1234.56787109375,
    //                 units: "km",
    //                 precision: 0,
    //                 padding: 1,
    //                 upper_display_limit: 8765.431640625,
    //                 lower_display_limit: 765.43212890625,
    //                 upper_alarm_limit: 1000,
    //                 upper_warning_limit: 0,
    //                 lower_warning_limit: 0,
    //                 lower_alarm_limit: 0,
    //                 upper_ctrl_limit: 8765.431640625,
    //                 lower_ctrl_limit: 765.43212890625,
    //             });
    //             context.destroyHard();
    //             done();
    //         })
    //     })


    //     it("simple GET DBR_CTRL_ENUM", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_CTRL_ENUM);
    //             expect(data).toEqual({
    //                 status: CA_ALARM_STATUS.HIHI,
    //                 severity: CA_ALARM_SEVRITY.MAJOR,
    //                 value: 1234,
    //                 number_of_string_used: 0,
    //                 strings: ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    //             });
    //             context.destroyHard();
    //             done();
    //         })
    //     })


    //     it("simple GET DBR_CTRL_CHAR", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_CTRL_CHAR);
    //             expect(data).toEqual({
    //                 status: CA_ALARM_STATUS.HIHI,
    //                 severity: CA_ALARM_SEVRITY.MAJOR,
    //                 value: -46,
    //                 units: "km",
    //                 upper_display_limit: 61,
    //                 lower_display_limit: -3,
    //                 upper_alarm_limit: -24,
    //                 upper_warning_limit: 0,
    //                 lower_warning_limit: 0,
    //                 lower_alarm_limit: 0,
    //                 upper_ctrl_limit: 61,
    //                 lower_ctrl_limit: -3,
    //             });
    //             context.destroyHard();
    //             done();
    //         })
    //     })


    //     it("simple GET DBR_CTRL_LONG", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_CTRL_LONG);
    //             expect(data).toEqual({
    //                 status: CA_ALARM_STATUS.HIHI,
    //                 severity: CA_ALARM_SEVRITY.MAJOR,
    //                 value: 1234,
    //                 units: "km",
    //                 upper_display_limit: 8765,
    //                 lower_display_limit: 765,
    //                 upper_alarm_limit: 1000,
    //                 upper_warning_limit: 0,
    //                 lower_warning_limit: 0,
    //                 lower_alarm_limit: 0,
    //                 upper_ctrl_limit: 8765,
    //                 lower_ctrl_limit: 765,
    //             });
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("simple GET DBR_CTRL_DOUBLE", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_CTRL_DOUBLE);
    //             expect(data).toEqual({
    //                 status: CA_ALARM_STATUS.HIHI,
    //                 severity: CA_ALARM_SEVRITY.MAJOR,
    //                 value: 1234.5678901234,
    //                 units: "km",
    //                 precision: 0,
    //                 padding: 1,
    //                 upper_display_limit: 8765.4321,
    //                 lower_display_limit: 765.4321,
    //                 upper_alarm_limit: 1000,
    //                 upper_warning_limit: 0,
    //                 lower_warning_limit: 0,
    //                 lower_alarm_limit: 0,
    //                 upper_ctrl_limit: 8765.4321,
    //                 lower_ctrl_limit: 765.4321,
    //             });
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    // })

    // describe("GET a stringin type PV -- DBR_STRING", () => {
    //     // we have a stringin record whose value is "This is TCA"

    //     it("the DBR type of stringin record -- DBR_STRING", (done: jest.DoneCallback) => {
    //         const context = new Context;
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2001");
    //             expect(channel?.getDbrType()).toBe(Channel_DBR_TYPES.DBR_STRING);
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("the value count of stringin record -- 1", (done: jest.DoneCallback) => {
    //         const context = new Context;
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2001");
    //             await channel?.get();
    //             expect(channel?.getDbr().getValueCount()).toBe(1);
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("try to get DBR_INT of stringin record -- get value 0", (done: jest.DoneCallback) => {
    //         const context = new Context;
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2001");
    //             const result = await channel?.get(undefined, Channel_DBR_TYPES.DBR_INT);
    //             expect(result?.value).toBe(0);
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("try to get DBR_ENUM of stringin record -- get value 0", (done: jest.DoneCallback) => {
    //         const context = new Context;
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2001");
    //             // this test generates an error on IOC:
    //             // recGblRecSupError: dbPutField missing record support entry table stringin::put_enum_str PV: val2001.VAL
    //             // but it does not affect the test
    //             const result = await channel?.get(undefined, Channel_DBR_TYPES.DBR_ENUM);
    //             expect(result?.value).toBe(0);
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("try to get DBR_GR_ENUM of stringin record -- get value 0", (done: jest.DoneCallback) => {
    //         const context = new Context;
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2001");
    //             // the IOC returns an array full of 0
    //             const result = await channel?.get(undefined, Channel_DBR_TYPES.DBR_GR_ENUM);
    //             expect(result).toEqual({
    //                 value: 0,
    //                 status: 0,
    //                 severity: 0,
    //                 number_of_string_used: 0,
    //                 strings: ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",],
    //             });
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("try to get DBR_DOUBLE of stringin record -- get value 0", (done: jest.DoneCallback) => {
    //         const context = new Context;
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2001");
    //             const result = await channel?.get(undefined, Channel_DBR_TYPES.DBR_DOUBLE);
    //             expect(result?.value).toBe(0);
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("try to get DBR_CHAR of stringin record -- get value 0", (done: jest.DoneCallback) => {
    //         const context = new Context;
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2001");
    //             const result = await channel?.get(undefined, Channel_DBR_TYPES.DBR_CHAR);
    //             expect(result?.value).toBe(0);
    //             context.destroyHard();
    //             done();
    //         })
    //     })
    // })

    // describe("GET a mbbi type pv -- DBR_ENUM", () => {

    //     it("create a mbbi channel, check its type is DBR_ENUM", (done: jest.DoneCallback) => {
    //         const context = new Context()
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2002");
    //             expect(channel?.getDbrType()).toBe(Channel_DBR_TYPES.DBR_ENUM);
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("create a mbbi channel, GET its value, obtain a number", (done: jest.DoneCallback) => {
    //         const context = new Context()
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2002");
    //             const result = await channel?.get();
    //             expect(result?.value).toBe(2);
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("create a mbbi channel, GET its value via DBR_STRING, obtain the string", (done: jest.DoneCallback) => {
    //         const context = new Context()
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2002");
    //             const result = await channel?.get(undefined, Channel_DBR_TYPES.DBR_STRING);
    //             expect(result?.value).toBe("This is two");
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("create a mbbi channel, GET the GR_ENUM, should get number_of_string_used and strings", (done: jest.DoneCallback) => {
    //         const context = new Context()
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2002");
    //             const result = await channel?.get(undefined, channel.getDbrType_GR());
    //             expect(result).toEqual({
    //                 value: 2,
    //                 status: CA_ALARM_STATUS.NO_ALARM,
    //                 severity: CA_ALARM_SEVRITY.NO_ALARM,
    //                 number_of_string_used: 4,
    //                 strings: ["This is zero", "This is one", "This is two", "This is three", "", "", "", "", "", "", "", "", "", "", "", ""],
    //             });
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("create a mbbi channel, GET the GR_FLOAT, the meta data is basically all 0", (done: jest.DoneCallback) => {
    //         const context = new Context()
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2002");
    //             const result = await channel?.get(undefined, Channel_DBR_TYPES.DBR_GR_FLOAT);
    //             // it is a GR_FLOAT type data, no sign that this channel is actually ENUM
    //             // ENUM channel does not have unit
    //             expect(result).toEqual({
    //                 value: 2,
    //                 status: CA_ALARM_STATUS.NO_ALARM,
    //                 severity: CA_ALARM_SEVRITY.NO_ALARM,
    //                 units: "",
    //                 precision: 0,
    //                 padding: 1,
    //                 upper_display_limit: 0,
    //                 lower_display_limit: 0,
    //                 upper_alarm_limit: 0,
    //                 upper_warning_limit: 0,
    //                 lower_warning_limit: 0,
    //                 lower_alarm_limit: 0,
    //             });
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    // })

    // describe("Channel.get() inconsistent inputs", () => {
    //     // if the user input arguments are illegal for Channel.get(), e.g. the ioTimeout is a string, 
    //     // the consequence is unpredictable, this should not be handled by this library
    //     // 
    //     // If the user inputs an inconsistent input, EPICS TCA should be able to handle it
    //     it("ioTimeout is -1 second, we may or may not get a value", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const result = await channel?.get(-1, channel.getDbrType())
    //             expect(result?.value === 1234.5678901234 || result?.value === undefined).toBe(true)
    //             context.destroyHard();
    //             done()
    //         })
    //     })

    //     it("GET requests more values than the channel has, returns the same amount of values with patched 0s", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const result = await channel?.get(5, channel.getDbrType(), 5)
    //             expect(result?.value).toEqual([1234.5678901234, 0, 0, 0, 0]);
    //             context.destroyHard();
    //             done()
    //         })
    //     })

    //     it("GET more values than the channel has, GET DBR_STRING type, returns the same amount of values with patched empty strings", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             // try to get DBR_STRING values
    //             const result = await channel?.get(5, Channel_DBR_TYPES.DBR_STRING, 5)
    //             expect(result?.value).toEqual(["1235", "", "", "", ""]);
    //             context.destroyHard();
    //             done()
    //         })
    //     })


    //     it("GET the value with 0 value count, returns the nominal amount of values", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const result = await channel?.get(5, channel.getDbrType(), 0)
    //             expect(result?.value).toBe(1234.5678901234);
    //             context.destroyHard();
    //             done()
    //         })
    //     })

    //     it("GET the value with -1 value count, returns the nominal amount of values", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const result = await channel?.get(5, channel.getDbrType(), -1)
    //             expect(result?.value).toBe(1234.5678901234);
    //             context.destroyHard();
    //             done()
    //         })
    //     })

    // })

    // describe("Channel.put(), channel type is DBR_STRING, try to PUT string, number, string[] and number[] type data", () => {

    //     it("PUT a string type data", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2001");
    //             // synchronous PUT
    //             const newValueStr = `OKOKOK`;
    //             await channel?.put(newValueStr);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(newValueStr);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT a number type data", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2001");
    //             // synchronous PUT
    //             const newValue = Math.random();
    //             const newValueStr = `${newValue}`;
    //             await channel?.put(newValue);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(newValueStr);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT a number[] type data", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2001");
    //             // synchronous PUT
    //             const newValue = Math.random();
    //             const newValueStr = `${newValue}`;
    //             const newValueArray = [newValue];
    //             await channel?.put(newValueArray);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(newValueStr);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })


    //     it("PUT a number[] type data, but there are more than 1 elements", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2001");
    //             // synchronous PUT
    //             const newValue = Math.random();
    //             const newValueStr = `${newValue}`;
    //             const newValueArray = [newValue, Math.random()];
    //             await channel?.put(newValueArray);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(newValueStr);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })


    //     it("PUT a string[] type data", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2001");
    //             // synchronous PUT
    //             const newValue = Math.random();
    //             const newValueStr = `${newValue}`;
    //             const newValueStrArray = [newValueStr];
    //             await channel?.put(newValueStrArray);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(newValueStr);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT a string[] type data that has more than the channel's value count", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2001");
    //             // synchronous PUT
    //             const newValue = Math.random();
    //             const newValueStr = `${newValue}`;
    //             const newValueStrArray = [newValueStr, `${Math.random()}`];
    //             await channel?.put(newValueStrArray);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(newValueStr);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT an longer-than-40-character string type data, it is cut off to 39 characters", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2001");

    //             // synchronous PUT
    //             const newValueStr = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz`; // cannot be parsed to a number
    //             await channel?.put(newValueStr);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(newValueStr.slice(0, 39));
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    // })

    // describe("Channel.put(), channel type is DBR_SHORT, try to PUT string, number, string[] and number[] type data", () => {
    //     // the ai is DBR_DOUBLE by definition, a channel itself cannot be a DBR_SHORT, but an ai record's PREC field is short
    //     // https://epics.anl.gov/base/R7-0/6-docs/aiRecord.html

    //     it("PUT a string type data", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000.PREC");
    //             // synchronous PUT
    //             const newValue = 6;
    //             const newValueStr = `${newValue}`;
    //             await channel?.put(newValueStr);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(newValue);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT a floating point number type data -- 3.75, IOC accepts 3", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000.PREC");
    //             // synchronous PUT
    //             const newValue = 3.75;
    //             await channel?.put(newValue);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(3);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT a number[] type data", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000.PREC");
    //             // synchronous PUT
    //             const newValue = 5.8;
    //             const newValueArray = [newValue];
    //             await channel?.put(newValueArray);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(5);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })


    //     it("PUT a number[] type data, but there are more than 1 elements", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000.PREC");
    //             // synchronous PUT
    //             const newValue = 6.8;
    //             const newValueArray = [newValue, 7.8];
    //             await channel?.put(newValueArray);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(6);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })


    //     it("PUT a string[] type data", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000.PREC");
    //             // synchronous PUT
    //             const newValue = 8.8;
    //             const newValueStr = `${newValue}`;
    //             const newValueStrArray = [newValueStr];
    //             await channel?.put(newValueStrArray);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(8);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT a string[] type data that has more than the channel's value count", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000.PREC");
    //             // synchronous PUT
    //             const newValue = 9.8;
    //             const newValueStr = `${newValue}`;
    //             const newValueStrArray = [newValueStr, `10.8`];
    //             await channel?.put(newValueStrArray);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(9);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })


    //     it("DBR_SHORT is signed 2-byte, it can only accept up to 32767", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000.PREC");
    //             // synchronous PUT
    //             const newValue = 32767;
    //             await channel?.put(newValue);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(32767);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("DBR_SHORT is signed 2-byte, it can only accept up to 32767, it refuses >= 32768", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000.PREC");
    //             await channel?.get();
    //             const oldValue = channel?.getDbr().getValue();
    //             // synchronous PUT
    //             const newValue = 32768;
    //             await channel?.put(newValue);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(oldValue);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })


    //     it("PUT a way-oversized number, DBR_SHORT is signed 2-byte, the TCA refuses to send it out", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000.PREC");
    //             await channel?.get();
    //             const oldValue = channel?.getDbr().getValue();
    //             // synchronous PUT
    //             const newValue = 12345678901234; // too big to be sent out
    //             await channel?.put(newValue);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(oldValue);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    // })

    // describe("Channel.put(), cannot find a channel whose type is DBR_FLOAT, all of them are DBR_DOUBLE, skip this test", () => { })


    // describe("Channel.put(), channel type is DBR_ENUM, its length is 2-byte, try to PUT string, number, string[] and number[] type data", () => {

    //     it("PUT a string type data", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2002");
    //             // synchronous PUT
    //             const newValue = 3;
    //             const newValueStr = `${newValue}`;
    //             await channel?.put(newValueStr);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(newValue);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT a floating point number type data -- 2.75, IOC accepts 2", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2002");
    //             // synchronous PUT
    //             const newValue = 2.75;
    //             await channel?.put(newValue);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(2);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })


    //     it("PUT a number that is larger than 16, the IOC accepts this value", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2002");
    //             // synchronous PUT
    //             const newValue = 88.75;
    //             await channel?.put(newValue);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(88);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT a number[] type data", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2002");
    //             // synchronous PUT
    //             const newValue = 1.8;
    //             const newValueArray = [newValue];
    //             await channel?.put(newValueArray);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(1);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT a number[] type data, but there are more than 1 elements", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2002");
    //             // synchronous PUT
    //             const newValue = 2.8;
    //             const newValueArray = [newValue, 7.8];
    //             await channel?.put(newValueArray);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(2);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT a string[] type data", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2002");
    //             // synchronous PUT
    //             const newValue = "1.8";
    //             const newValueStr = `${newValue}`;
    //             const newValueStrArray = [newValueStr];
    //             await channel?.put(newValueStrArray);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(1);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT a string[] type data that has more than the channel's value count", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2002");
    //             // synchronous PUT
    //             const newValue = 2.8;
    //             const newValueStr = `${newValue}`;
    //             const newValueStrArray = [newValueStr, `10.8`];
    //             await channel?.put(newValueStrArray);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(2);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })


    //     it("DBR_ENUM is signed 2-byte, it can only accept up to 32767", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2002");
    //             // synchronous PUT
    //             const newValue = 32767;
    //             await channel?.put(newValue);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(32767);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("DBR_ENUM is signed 2-byte, it can only accept up to 32767, EPICS TCA won't put 32768", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2002");
    //             await channel?.get();
    //             const oldValue = channel?.getDbr().getValue();
    //             // synchronous PUT
    //             const newValue = 32768;
    //             await channel?.put(newValue);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(oldValue);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT a number that is way too larger than 2-byte, e.g. 123456789012345, EPICS TCA won't send out this value", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2002");
    //             await channel?.get();
    //             const oldValue = channel?.getDbr().getValue();
    //             // synchronous PUT
    //             const newValue = 123456789012345;
    //             await channel?.put(newValue);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(oldValue);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    // })

    // describe("Channel.put(), channel type is DBR_CHAR, its length is 1-byte and signed, try to PUT string, number, string[] and number[] type data", () => {

    //     it("PUT a string type data", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000.PROC");
    //             // synchronous PUT
    //             const newValue = 3;
    //             const newValueStr = `${newValue}`;
    //             await channel?.put(newValueStr);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(newValue);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT a floating point number type data -- 2.75, IOC accepts 2", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000.PROC");
    //             // synchronous PUT
    //             const newValue = 2.75;
    //             await channel?.put(newValue);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(2);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })


    //     it("PUT a number[] type data", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000.PROC");
    //             // synchronous PUT
    //             const newValue = 1.8;
    //             const newValueArray = [newValue];
    //             await channel?.put(newValueArray);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(1);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT a number[] type data, but there are more than 1 elements", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000.PROC");
    //             // synchronous PUT
    //             const newValue = 2.8;
    //             const newValueArray = [newValue, 7.8];
    //             await channel?.put(newValueArray);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(2);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT a string[] type data", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000.PROC");
    //             // synchronous PUT
    //             const newValue = "1.8";
    //             const newValueStr = `${newValue}`;
    //             const newValueStrArray = [newValueStr];
    //             await channel?.put(newValueStrArray);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(1);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT a string[] type data that has more than the channel's value count", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000.PROC");
    //             // synchronous PUT
    //             const newValue = 2.8;
    //             const newValueStr = `${newValue}`;
    //             const newValueStrArray = [newValueStr, `10.8`];
    //             await channel?.put(newValueStrArray);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(2);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })


    //     it("DBR_CHAR is signed 1-byte, it only accept up to 127", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000.PROC");
    //             // synchronous PUT
    //             const newValue = 127;
    //             await channel?.put(newValue);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(127);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("DBR_CHAR is signed 1-byte, it won't accept 128", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000.PROC");
    //             await channel?.get();
    //             const oldValue = channel?.getDbr().getValue();
    //             // synchronous PUT
    //             const newValue = 127;
    //             await channel?.put(newValue);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(oldValue);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })


    //     it("DBR_CHAR is signed 1-byte, it only accept down to -128", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000.PROC");
    //             // synchronous PUT
    //             const newValue = -128;
    //             await channel?.put(newValue);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(-128);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("DBR_CHAR is signed 1-byte, it won't accept -129", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000.PROC");
    //             await channel?.get();
    //             const oldValue = channel?.getDbr().getValue();
    //             // synchronous PUT
    //             const newValue = -129;
    //             await channel?.put(newValue);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(oldValue);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    // })

    // describe("Channel.put(), channel type is DBR_LONG, its length is 8-byte and signed, try to PUT string, number, string[] and number[] type data", () => {

    //     it("PUT a string type data", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2004");
    //             // synchronous PUT
    //             const newValue = 3;
    //             const newValueStr = `${newValue}`;
    //             await channel?.put(newValueStr);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(newValue);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT a floating point number type data -- 2.75, IOC accepts 2", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2004");
    //             // synchronous PUT
    //             const newValue = 2.75;
    //             await channel?.put(newValue);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(2);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })


    //     it("PUT a number[] type data", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2004");
    //             // synchronous PUT
    //             const newValue = 1.8;
    //             const newValueArray = [newValue];
    //             await channel?.put(newValueArray);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(1);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT a number[] type data, but there are more than 1 elements", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2004");
    //             // synchronous PUT
    //             const newValue = 2.8;
    //             const newValueArray = [newValue, 7.8];
    //             await channel?.put(newValueArray);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(2);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT a string[] type data", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2004");
    //             // synchronous PUT
    //             const newValue = "1.8";
    //             const newValueStr = `${newValue}`;
    //             const newValueStrArray = [newValueStr];
    //             await channel?.put(newValueStrArray);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(1);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT a string[] type data that has more than the channel's value count", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2004");
    //             // synchronous PUT
    //             const newValue = 2.8;
    //             const newValueStr = `${newValue}`;
    //             const newValueStrArray = [newValueStr, `10.8`];
    //             await channel?.put(newValueStrArray);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(2);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })


    //     it("DBR_LONG is signed 4-byte, it ranges from -2,147,483,648 to 2,147,483,647, it accepts 2,147,483,647", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2004");
    //             // synchronous PUT
    //             const newValue = 2147483647;
    //             await channel?.put(newValue);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(2147483647);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("DBR_LONG is signed 4-byte, it ranges from -2,147,483,648 to 2,147,483,647, it won't accept 2,147,483,648", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2004");
    //             await channel?.get();
    //             const oldValue = channel?.getDbr().getValue();
    //             // synchronous PUT
    //             const newValue = 2147483648;
    //             await channel?.put(newValue);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(oldValue);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("DBR_LONG is signed 4-byte, it ranges from -2,147,483,648 to 2,147,483,647, it accepts -2,147,483,648", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2004");
    //             // synchronous PUT
    //             const newValue = -2147483648;
    //             await channel?.put(newValue);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(-2147483648);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("DBR_LONG is signed 4-byte, it ranges from -2,147,483,648 to 2,147,483,647, it won't accept -2,147,483,649", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2004");
    //             await channel?.get();
    //             const oldValue = channel?.getDbr().getValue();
    //             // synchronous PUT
    //             const newValue = -2147483649;
    //             await channel?.put(newValue);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(oldValue);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    // })

    // describe("Channel.put(), channel type is DBR_DOUBLE, try to PUT string, number, string[] and number[] type data", () => {

    //     it("PUT a string type data", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2003");
    //             // synchronous PUT
    //             const newValue = Math.random();
    //             const newValueStr = `${newValue}`;
    //             await channel?.put(newValueStr);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(newValue);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT a number type data", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2003");
    //             // synchronous PUT
    //             const newValue = Math.random();
    //             const newValueStr = `${newValue}`;
    //             await channel?.put(newValueStr);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(newValue);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT a number[] type data", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2003");
    //             // synchronous PUT
    //             const newValue = Math.random();
    //             const newValueArray = [newValue];
    //             await channel?.put(newValueArray);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(newValue);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT a number[] type data that has more than the channel's value count", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2003");
    //             // synchronous PUT
    //             const newValue = Math.random();
    //             const newValueArray = [newValue, Math.random()];
    //             await channel?.put(newValueArray);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(newValue);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT a string[] type data", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2003");
    //             // synchronous PUT
    //             const newValue = Math.random();
    //             const newValueStr = `${newValue}`;
    //             const newValueStrArray = [newValueStr];
    //             await channel?.put(newValueStrArray);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(newValue);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT a string[] type data that has more than the channel's value count", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2003");
    //             // synchronous PUT
    //             const newValue = Math.random();
    //             const newValueStr = `${newValue}`;
    //             const newValueStrArray = [newValueStr, `${Math.random()}`];
    //             await channel?.put(newValueStrArray);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(newValue);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("PUT an non-parsible string type data, it should never PUT", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2003");
    //             await channel?.get();
    //             const oldValue = channel?.getDbr().getValue();

    //             // synchronous PUT
    //             const newValueStr = `AAABBB`; // cannot be parsed to a number
    //             await channel?.put(newValueStr);
    //             setTimeout(async () => {
    //                 const data = await channel?.get();
    //                 expect(data?.value).toBe(oldValue);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })


    // })

    // describe("Field PV, e.g. val2000.HOPR", () => {

    //     it("PUT and GET the value of a field PV, val2000.HOPR", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000.HOPR");
    //             await channel?.put(98765.4321, undefined, true); // async version PUT
    //             await channel?.get();
    //             expect(channel?.getValue()).toBe(98765.4321)
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("PUT and GET the value of a field PV, val2000.HOPR, try to get DBR_GR_DOUBLE", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000.HOPR");
    //             await channel?.put(98765.4321, undefined, true); // async version PUT
    //             await channel?.get(undefined, Channel_DBR_TYPES.DBR_GR_DOUBLE);
    //             expect(channel?.getDbrMeta()).toEqual({
    //                 status: CA_ALARM_STATUS.HIHI,
    //                 severity: CA_ALARM_SEVRITY.MAJOR,
    //                 precision: 15,
    //                 padding: 1,
    //                 units: "km",
    //                 upper_display_limit: 1.0000000000000000525047602552e300,
    //                 lower_display_limit: -1.0000000000000000525047602552E300,
    //                 upper_alarm_limit: 0,
    //                 upper_warning_limit: 0,
    //                 lower_warning_limit: 0,
    //                 lower_alarm_limit: 0,
    //             })
    //             context.destroyHard();
    //             done();
    //         })
    //     })

    //     it("cannot create a channel val2000.HOPR.VAL", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000.HOPR.VAL", 0.5);
    //             setTimeout(() => {
    //                 // we cannot create such a channel
    //                 expect(channel).toBe(undefined);
    //                 context.destroyHard();
    //                 done();
    //             }, 700);
    //         })
    //     })

    // })

    // describe("asynchronous PUT -- waitNotify = true", () => {
    //     it("Channel.put() with writeNotify bit true, this function returns ECA severity code", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const result = await channel?.put(9527, undefined, true);
    //             expect(result).toBe(ECA_SEVERITIES.CA_K_SUCCESS);
    //             context.destroyHard();
    //             done();
    //         })
    //     })
    // })

    // describe("IO ID", () => {
    //     it("check self incresing on each read, asynchronous write, and synchronous write", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             const id1 = context.getReadWriteIos().getRecentIoId();
    //             await channel?.put(9527, undefined, true);
    //             const id2 = context.getReadWriteIos().getRecentIoId();
    //             channel?.put(95288, undefined, false);
    //             const id3 = context.getReadWriteIos().getRecentIoId();
    //             await channel?.get();
    //             const id4 = context.getReadWriteIos().getRecentIoId();
    //             expect([id4 - id3, id2 - id1, id3 - id2]).toEqual([1, 1, 1]);
    //             context.destroyHard();
    //             done();
    //         })
    //     })
    // })

    // describe("destroy soft and hard", () => {

    //     it("destroy soft, automatically re-search", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel = await context.createChannel("val2000");
    //             await channel?.get();
    //             const value1 = channel?.getValue();
    //             // automatically reconnect
    //             channel?.destroySoft();
    //             setTimeout(async () => {
    //                 await channel?.get();
    //                 const value2 = channel?.getValue();
    //                 expect(value1).toEqual(value2);
    //                 context.destroyHard();
    //                 done();
    //             }, 800)
    //         })
    //     })


    //     it("soft destroy multiple channels, each has one monitor, automatically re-search and re-subscribe", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             const channel1 = await context.createChannel("val2000");
    //             const channel2 = await context.createChannel("val2001");
    //             let count = 0;
    //             const monitor1 = await channel1?.createMonitor(undefined, (monitor: ChannelMonitor) => { count++ });
    //             const monitor2 = await channel2?.createMonitor(undefined, (monitor: ChannelMonitor) => { count++ });
    //             channel1?.destroySoft();
    //             channel2?.destroySoft();
    //             setTimeout(async () => {
    //                 expect(count).toBe(4);
    //                 context.destroyHard();
    //                 done();
    //             }, 1000)
    //         })
    //     })

    //     it("soft destroy multiple channels, each has one monitor, automatically re-search and re-subscribe", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             let channel1: any;
    //             let channel2: any;
    //             context.createChannel("val2000").then((result) => { channel1 = result });
    //             context.createChannel("val2001").then((result) => { channel2 = result });

    //             let count = 0;
    //             setTimeout(() => {
    //                 channel1?.createMonitor(undefined, (monitor: ChannelMonitor) => { count++ });
    //                 channel2?.createMonitor(undefined, (monitor: ChannelMonitor) => { count++ });
    //             }, 500)
    //             setTimeout(() => {
    //                 channel1?.destroySoft();
    //                 channel2?.destroySoft();
    //             }, 1000);
    //             setTimeout(async () => {
    //                 expect(count).toEqual(4);
    //                 context.destroyHard();
    //                 done();
    //             }, 1500)
    //         })
    //     })

    //     it("run Context.createChannel() twice asynchronously, destroy soft them, they are still the same", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             let channel1 = await context.createChannel("val2000");
    //             let channel2 = await context.createChannel("val2000");
    //             channel1?.destroySoft();
    //             channel2?.destroySoft();
    //             setTimeout(async () => {
    //                 expect(channel1).toBe(channel2);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("run Context.createChannel() twice synchronously, they are identical, destroy soft one of them, the other one is also destroyed soft", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             let channel1: any;
    //             let channel2: any;
    //             context.createChannel("val2000").then((result) => { channel1 = result });
    //             context.createChannel("val2000").then((result) => { channel2 = result });
    //             setTimeout(() => {
    //                 channel1?.destroySoft();
    //             }, 500)
    //             setTimeout(async () => {
    //                 expect(channel1?.getState()).toBe(channel2?.getState());
    //                 context.destroyHard();
    //                 done();
    //             }, 800)
    //         })
    //     })

    //     it("run Context.createChannel() twice, destroy hard them, they are still the same", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             let channel1 = await context.createChannel("val2000");
    //             let channel2 = await context.createChannel("val2000");
    //             channel1?.destroyHard();
    //             channel2?.destroyHard();
    //             setTimeout(async () => {
    //                 expect(channel1).toBe(channel2);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("destroy hard the channel, it is gone in Context", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             let channel = await context.createChannel("val2000");
    //             channel?.destroyHard();
    //             setTimeout(async () => {
    //                 const channel1 = context.getChannel("val2000");
    //                 expect(channel1).toBe(undefined);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("destroy hard the channel, no channel left for this TCPTransport, so this TCPTransoport is gone", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             let channel = await context.createChannel("val2000");
    //             channel?.destroyHard();
    //             setTimeout(async () => {
    //                 const numTcpTransports = Object.keys(context.getTcpTransports().getTcpTransports()).length;
    //                 expect(numTcpTransports).toBe(0);
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("create 2 channels, destroy hard one, the other one should be running normally", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             let channel1 = await context.createChannel("val2000");
    //             let channel2 = await context.createChannel("val2001");
    //             channel2?.destroyHard();
    //             setTimeout(async () => {
    //                 await channel1?.get();
    //                 const value = await channel1?.getValue();
    //                 expect(typeof value).toBe("number");
    //                 context.destroyHard();
    //                 done();
    //             }, 500)
    //         })
    //     })

    //     it("create 2 channels, destroy soft one, the other one should be running normally", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             let channel1 = await context.createChannel("val2000");
    //             let channel2 = await context.createChannel("val2001");
    //             channel2?.destroySoft();
    //             setTimeout(async () => {
    //                 await channel1?.get();
    //                 await channel2?.get();
    //                 const value1 = channel1?.getValue();
    //                 const value2 = channel2?.getValue();
    //                 expect([typeof value1, typeof value2]).toEqual(["number", "string"]);
    //                 context.destroyHard();
    //                 done();
    //             }, 1000)
    //         })
    //     })

    //     it("destroy hard a channel that has 2 monitors, its monitors won't update", (done: jest.DoneCallback) => {
    //         const context = new Context();
    //         context.initialize().then(async () => {
    //             let channel = await context.createChannel("val1"); // val1 updates every 0.1 s
    //             let count = 0;
    //             await channel?.createMonitor(undefined, (monitor: ChannelMonitor) => { count++ });
    //             await channel?.createMonitor(undefined, (monitor: ChannelMonitor) => { count++ });
    //             channel?.destroyHard();
    //             setTimeout(async () => {
    //                 // stops monitoring
    //                 expect(count).toBeLessThan(5);
    //                 context.destroyHard();
    //                 done();
    //             }, 1000)
    //         })
    //     })

    // })

    describe("Context.createChannel() and Channel.destroySoft()", () => {
        it("Create a channel that does not exist, then soft destroy it, check this channel's state is SEARCHING", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                context.createChannel("valAAA7");
                // this is the only way to obtain the Channel object
                const channel = context.getChannel("valAAA7");
                if (channel !== undefined) {
                    setTimeout(() => {
                        channel.destroySoft();
                    }, 500);

                    setTimeout(() => {
                        const state = channel.getState();
                        expect(state).toBe(Channel_STATES.SEARCHING);
                        context.destroyHard();
                        done();
                    }, 1000)
                }
            })
        })

        it("Create a channel exists synchronously, soft destroy it immediately, 1 s later, check this channel's state is CREATED", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                context.createChannel("val2000");
                // this is the only way to obtain the Channel object
                const channel = context.getChannel("val2000");
                channel?.destroySoft();
                if (channel !== undefined) {
                    setTimeout(() => {
                        const state = channel.getState();
                        expect(state).toBe(Channel_STATES.CREATED);
                        context.destroyHard();
                        done();
                    }, 1000)
                }
            })
        })

        it("Create an existing channel synchronously, soft destroy it immediately for 5 times, 1 s later, check this channel's state is CREATED", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                context.createChannel("val2000");
                // this is the only way to obtain the Channel object
                const channel = context.getChannel("val2000");
                channel?.destroySoft();
                channel?.destroySoft();
                channel?.destroySoft();
                channel?.destroySoft();
                channel?.destroySoft();
                if (channel !== undefined) {
                    setTimeout(() => {
                        const state = channel.getState();
                        // while this is cannot be tested in this framework, we have observed that 
                        // every destroySoft() make every Context.createChannel() to throw and this function falls into
                        // "await CREATE_CHANNEL_val2000". Each destroySoft() invokes a Context.createChannel()
                        // the last Context.createChannel() resolves this Promise and frees all the "await CREATE_CHANNEL_val2000"
                        expect(state).toBe(Channel_STATES.CREATED);
                        context.destroyHard();
                        done();
                    }, 1000)
                }
            })
        })

        it("Create a non-existing channel synchronously, soft destroy it immediately for 5 times, 1 s later, check this channel's state is CREATED", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                context.createChannel("valAAA7");
                // this is the only way to obtain the Channel object
                const channel = context.getChannel("valAAA7");
                channel?.destroySoft();
                channel?.destroySoft();
                channel?.destroySoft();
                channel?.destroySoft();
                channel?.destroySoft();
                if (channel !== undefined) {
                    setTimeout(() => {
                        const state = channel.getState();
                        // while this is cannot be tested in this framework, we have observed that 
                        // every destroySoft() make every Context.createChannel() to throw and this function falls into
                        // "await CREATE_CHANNEL_val2000". Each destroySoft() invokes a Context.createChannel()
                        // the last Context.createChannel() still blocks this Promise until we run the context.destroyHard() below
                        expect(state).toBe(Channel_STATES.SEARCHING);
                        context.destroyHard();
                        done();
                    }, 500)
                }
            })
        })

        it("Create a channel that does not exist synchronously, then hard destroy it, check there is no TCPTransoport in Context", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                context.createChannel("valAAA7");
                // this is the only way to obtain the Channel object
                const channel = context.getChannel("valAAA7");
                channel?.destroyHard();
                if (channel !== undefined) {
                    setTimeout(() => {
                        const numTcpTransports = Object.keys(context.getTcpTransports().getTcpTransports()).length;
                        expect(numTcpTransports).toBe(0);
                        context.destroyHard();
                        done();
                    }, 500)
                }
            })
        })

        it("Create a channel that does not exist synchronously, then hard destroy it, check there is no Channel in Context", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                context.createChannel("valAAA7");
                // this is the only way to obtain the Channel object
                const channel = context.getChannel("valAAA7");
                channel?.destroyHard();
                if (channel !== undefined) {
                    setTimeout(() => {
                        const numTcpTransports = Object.keys(context.getTcpTransports().getTcpTransports()).length;
                        expect(numTcpTransports).toBe(0);
                        context.destroyHard();
                        done();
                    }, 500)
                }
            })
        })

        it("Create a channel that does not exist synchronously, then hard destroy it, check there is no CREATE_CHANNEL_pvName promise in Context.promises", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                context.createChannel("valAAA7");
                // this is the only way to obtain the Channel object
                const channel = context.getChannel("valAAA7");
                channel?.destroyHard();
                if (channel !== undefined) {
                    setTimeout(() => {
                        const promiseObj = context.getContextPromises().get("CREATE_CHANNEL_valAAA7");
                        expect(promiseObj).toBe(undefined);
                        context.destroyHard();
                        done();
                    }, 500)
                }
            })
        })

        it("Create a channel that does not exist asynchronously, then hard destroy it, check if the createChannel() blocks", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                let count = 0;
                // because "await createChannel()" is blocked, we run the commands in a timeout first
                setTimeout(() => {
                    // this is the only way to obtain the Channel object
                    const channel = context.getChannel("valAAA7");
                    channel?.destroyHard();
                    if (channel !== undefined) {
                        setTimeout(() => {
                            expect(count).toBe(1);
                            context.destroyHard();
                            done();
                        }, 500)
                    }
                }, 500);
                await context.createChannel("valAAA7");
                count++;
            })
        })

        it("Create a channel synchronously that does not exist with a timeout, then soft destroy it before timeout, it is still SEARCHING before timeout", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                context.createChannel("valAAA7", 1.5); // we check state at 1 s
                // this is the only way to obtain the Channel object
                const channel = context.getChannel("valAAA7");
                setTimeout(() => {
                    channel?.destroySoft();
                }, 300)
                setTimeout(() => {
                    if (channel !== undefined) {
                        const state = channel.getState();
                        expect(state).toBe(Channel_STATES.SEARCHING);
                    }
                    context.destroyHard();
                    done();
                }, 1000)
            })
        })

        it("Create a channel synchronously that does not exist with a timeout, then soft destroy it before timeout, it is DESTROYED after timeout", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                context.createChannel("valAAA7", 0.5); // we check state at 1 s
                // this is the only way to obtain the Channel object
                const channel = context.getChannel("valAAA7");
                setTimeout(() => {
                    channel?.destroySoft();
                }, 300)
                setTimeout(() => {
                    if (channel !== undefined) {
                        const state = channel.getState();
                        expect(state).toBe(Channel_STATES.DESTROYED);
                    }
                    context.destroyHard();
                    done();
                }, 1000)
            })
        })

        it("Create a channel synchronously that does not exist with a timeout, then soft destroy it after timeout, it is gone", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                context.createChannel("valAAA7", 0.5);
                // this is the only way to obtain the Channel object
                const channel = context.getChannel("valAAA7");
                setTimeout(() => {
                    channel?.destroySoft();
                }, 1000)
                setTimeout(() => {
                    if (channel !== undefined) {
                        const state = channel.getState();
                        expect(state).toBe(Channel_STATES.DESTROYED);
                    }
                    context.destroyHard();
                    done();
                }, 1500)
            })
        })

        it("destroySoft a TCPTransport, a channel and a monitor, then they are recovered", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const monitor = await channel?.createMonitor();
                const tcpTransport = channel?.getTcpTransport();

                setTimeout(() => {
                    tcpTransport?.destroySoft();
                    channel?.destroySoft();
                    monitor?.destroySoft();
                }, 500)

                setTimeout(() => {
                    const channelState = channel?.getState();
                    const tcpTransportState = tcpTransport?.getState();
                    const monitorState = monitor?.getState();
                    expect([channelState, tcpTransportState, monitorState]).toEqual([Channel_STATES.CREATED, TCPTransport_STATES.GREETED, ChannelMonitor_STATES.SUBSCRIBED]);
                    context.destroyHard();
                    done();
                }, 1000)
            })
        })

        it("destroyHard a TCPTransport, a channel and a monitor, make sure they are all DESTROYED", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const monitor = await channel?.createMonitor();
                const tcpTransport = channel?.getTcpTransport();

                setTimeout(() => {
                    tcpTransport?.destroyHard();
                    channel?.destroyHard();
                    monitor?.destroyHard();
                }, 500)

                setTimeout(() => {
                    const channelState = channel?.getState();
                    const tcpTransportState = tcpTransport?.getState();
                    const monitorState = monitor?.getState();
                    expect([channelState, tcpTransportState, monitorState]).toEqual([Channel_STATES.DESTROYED, TCPTransport_STATES.DESTROYED, ChannelMonitor_STATES.DESTROYED]);
                    context.destroyHard();
                    done();
                }, 1000)
            })
        })

    })

    // todo: TCPTransoport liveness check
    // todo: ctrl+c the IOC, the TCP connection is close
    // todo: ctrl+z the IOC, the TCP connection is not closed, we rely on ECHO

    describe.skip("irregular tests: they require special manual interference", () => {
        // ! this is a test that can not be conducted without outside assistance
        // no IOC running, start the test, wait 1+ second, start the IOC, waiting until the test finishes in 5 seconds
        it("Creat a not-servicing channel with a creation timeout, the channel becomes in service after timeout", (done: jest.DoneCallback) => {
            const contex = new Context();
            contex.initialize().then(async () => {
                contex.createChannel("val7", 1).then((channel: Channel | undefined) => {
                    setTimeout(() => {
                        contex.destroyHard();
                        expect(channel).toBe(undefined);
                        done();
                    }, 5000)
                })
            })
        })

        // ! create an IOC using EPICS 3.14.11, it uses old version CA lib
        // ! set system environment to export EPICS_CA_ADDR_LIST="localhost 10.1.20.200"
        it("Connect to a channel on old version epics", (done: jest.DoneCallback) => {
            const context = new Context({
                EPICS_CA_ADDR_LIST: "localhost 10.1.20.200",
            });
            context.initialize().then(async () => {
                const channel = await context.createChannel("vala1");
                expect(channel).not.toBe(undefined);
                context.destroyHard();
                done();
            })
        })
    })

})

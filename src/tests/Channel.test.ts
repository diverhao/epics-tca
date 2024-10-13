import { Context, Context_STATES } from "../Context/Context";
import { ChannelMonitor } from "../Channel/ChannelMonitor";
import { CA_ALARM_SEVRITY, CA_ALARM_STATUS, Channel, Channel_DBR_TYPES } from "../Channel/Channel";
import { createServer, Socket } from "net";
import { isPowerOfTwo } from "../Global/GlobalMethods";
import { Environment } from "../Global/Environment";


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

    describe.skip("Context.createChannel()", () => {
        it("Create and initialize context, then quit", (done: jest.DoneCallback) => {
            const contex = new Context();
            contex.initialize().then(() => {
                contex.destroyHard();
                setTimeout(() => {
                    expect(contex.getState()).toBe(Context_STATES.DESTROYED);
                    done();
                }, 200)
            })
        })

        it("Connect and create a channel, make sure it exists, then destroy context", (done: jest.DoneCallback) => {
            const contex = new Context();
            contex.initialize().then(async () => {
                const channel = await contex.createChannel("val7");
                setTimeout(() => {
                    contex.destroyHard();
                    expect(channel).not.toBe(undefined);
                    done();
                }, 500)
            })
        })


        it("Run Context.createChannel() twice, the 2nd one is the same as 1st one", (done: jest.DoneCallback) => {
            const contex = new Context();
            contex.initialize().then(async () => {
                const channel1 = await contex.createChannel("val7");
                const channel2 = await contex.createChannel("val7");
                setTimeout(() => {
                    contex.destroyHard();
                    expect(channel1).toBe(channel2);
                    done();
                }, 500)
            })
        })

        it("Creat a channel that is not serviced with a creation timeout, it returns undefined", (done: jest.DoneCallback) => {
            const contex = new Context();
            contex.initialize().then(async () => {
                const channel = await contex.createChannel("valAAA7", 1);
                setTimeout(() => {
                    contex.destroyHard();
                    expect(channel).toBe(undefined);
                    done();
                }, 1500)
            })
        })

        it("Creat a channel that is not serviced without a creation timeout, the createChannel() never resolves", (done: jest.DoneCallback) => {
            const contex = new Context();
            contex.initialize().then(async () => {
                let created = false;
                contex.createChannel("valAAA7").then(() => {
                    // the creationCh
                    created = true;
                })
                setTimeout(() => {
                    contex.destroyHard();
                    expect(created).toBe(false);
                    done();
                }, 1500)
            })
        })

        it("Creat a channel with a creation timeout, found the channel before timeout", (done: jest.DoneCallback) => {
            const contex = new Context();
            contex.initialize().then(async () => {
                contex.createChannel("val7", 0.5).then((channel: Channel | undefined) => {
                    setTimeout(() => {
                        contex.destroyHard();
                        expect(channel).not.toBe(undefined);
                        done();
                    }, 500)
                })
            })
        })

        it("Create multiple channels", (done: jest.DoneCallback) => {
            const contex = new Context();
            contex.initialize().then(async () => {
                const channel1 = contex.createChannel("val7");
                const channel2 = contex.createChannel("val8");
                const channel3 = contex.createChannel("val9");
                setTimeout(() => {
                    expect([channel1, channel2, channel3]).not.toEqual([undefined, undefined, undefined]);
                    contex.destroyHard();
                    done();
                }, 1000)
            })
        })
    })

    describe.skip("Search PV timing sequence", () => {
        it("doSearchPV() function, 10000 ticks, max period is 3000 ticks", () => {
            // do this for each test
            searchCounter = 0;
            const result: number[] = [];
            for (let ii = 0; ii < 10000; ii++) {
                const search = doSearchPV(300, 0.1);
                if (search === true) {
                    result.push(ii);
                }
            }
            const resultCompare: number[] = [0, 1, 3, 7, 15, 31, 63, 127, 255, 511, 1023, 2047, 4095, 7095];
            expect(result).toEqual(resultCompare)
        })

        it("doSearchPV() function, 2000 ticks, max period is 300 ticks", () => {
            // do this for each test
            searchCounter = 0;
            const result: number[] = [];
            for (let ii = 0; ii < 2000; ii++) {
                const search = doSearchPV(30, 0.1);
                if (search === true) {
                    result.push(ii);
                }
            }
            const resultCompare: number[] = [0, 1, 3, 7, 15, 31, 63, 127, 255, 511, 811, 1111, 1411, 1711];
            expect(result).toEqual(resultCompare)
        })


        it("doSearchPV() function, 10 ticks, max period is the same as min period -- flat search rate", () => {
            // do this for each test
            searchCounter = 0;
            const result: number[] = [];
            for (let ii = 0; ii < 10; ii++) {
                const search = doSearchPV(15, 15);
                if (search === true) {
                    result.push(ii);
                }
            }
            const resultCompare: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
            expect(result).toEqual(resultCompare)
        })


        it("doSearchPV() function, 10 ticks, max period is slightly larger than min period -- flat search rate", () => {
            // do this for each test
            searchCounter = 0;
            const result: number[] = [];
            for (let ii = 0; ii < 10; ii++) {
                const search = doSearchPV(17, 15);
                if (search === true) {
                    result.push(ii);
                }
            }
            const resultCompare: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
            expect(result).toEqual(resultCompare)
        })


        it("doSearchPV() function, 10 ticks, illegal maxSearchPeriod and minSearchPeriod -- flat search rate", () => {
            // do this for each test
            searchCounter = 0;
            const result: number[] = [];
            for (let ii = 0; ii < 10; ii++) {
                // maxSearchPeriod is smaller than minimum search period
                const search = doSearchPV(15, 150);
                if (search === true) {
                    result.push(ii);
                }
            }
            const resultCompare: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
            expect(result).toEqual(resultCompare)
        })
    })

    describe.skip("get DBR type in Channel", () => {
        it("NOT_AVAILABLE type -- EPICS TCA's special type", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                // try to create a non-servicing channel
                const channel = new Channel(context, "valAB8888");
                setTimeout(() => {
                    const dbrTypeStr = channel.getDbrTypeStr();
                    const dbrType = channel.getDbrType();
                    expect([dbrType, dbrTypeStr]).toEqual([-1, "NOT_AVAILABLE"]);
                    context.destroyHard();
                    done();
                }, 500)
            })
        })

        it("Create a servicing channel, check its type", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                // try to create a non-servicing channel
                const channel = await context.createChannel("val7");
                if (channel !== undefined) {
                    const dbrTypeStr = channel.getDbrTypeStr();
                    const dbrType = channel.getDbrType();
                    expect([dbrType, dbrTypeStr]).toEqual([6, "DBR_DOUBLE"]);
                } else {
                    expect(true).toBe(false);
                }
                context.destroyHard();
                done();
            })
        })

        it("Create a servicing channel, check its type of STS", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                // try to create a non-servicing channel
                const channel = await context.createChannel("val7");
                if (channel !== undefined) {
                    const dbrTypeStr = channel.getDbrTypeStr_STS();
                    const dbrType = channel.getDbrType_STS();
                    expect([dbrType, dbrTypeStr]).toEqual([13, "DBR_STS_DOUBLE"]);
                } else {
                    expect(true).toBe(false);
                }
                context.destroyHard();
                done();
            })
        })

        it("Create a servicing channel, check its type of TIME", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                // try to create a non-servicing channel
                const channel = await context.createChannel("val7");
                if (channel !== undefined) {
                    const dbrTypeStr = channel.getDbrTypeStr_TIME();
                    const dbrType = channel.getDbrType_TIME();
                    expect([dbrType, dbrTypeStr]).toEqual([20, "DBR_TIME_DOUBLE"]);
                } else {
                    expect(true).toBe(false);
                }
                context.destroyHard();
                done();
            })
        })


        it("Create a servicing channel, check its type of GR", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                // try to create a non-servicing channel
                const channel = await context.createChannel("val7");
                if (channel !== undefined) {
                    const dbrTypeStr = channel.getDbrTypeStr_GR();
                    const dbrType = channel.getDbrType_GR();
                    expect([dbrType, dbrTypeStr]).toEqual([27, "DBR_GR_DOUBLE"]);
                } else {
                    expect(true).toBe(false);
                }
                context.destroyHard();
                done();
            })
        })



        it("Create a servicing channel, check its type of CTRL", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                // try to create a non-servicing channel
                const channel = await context.createChannel("val7");
                if (channel !== undefined) {
                    const dbrTypeStr = channel.getDbrTypeStr_CTRL();
                    const dbrType = channel.getDbrType_CTRL();
                    expect([dbrType, dbrTypeStr]).toEqual([34, "DBR_CTRL_DOUBLE"]);
                } else {
                    expect(true).toBe(false);
                }
                context.destroyHard();
                done();
            })
        })

    })

    describe.skip("GET base DBR type", () => {
        it("simple GET", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get();
                expect(data?.value).toBe(1234.5678901234);
                context.destroyHard();
                done();
            })
        })

        it("simple GET with timeout, get the data before timeout", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(1);
                expect(data?.value).toBe(1234.5678901234);
                context.destroyHard();
                done();
            })
        })

        it("simple GET DBR_STRING -- round value", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_STRING);
                expect(data?.value).toBe("1235");
                context.destroyHard();
                done();
            })
        })

        it("simple GET DBR_INT -- round down", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_INT);
                expect(data?.value).toBe(1234);
                context.destroyHard();
                done();
            })
        })


        it("simple GET DBR_FLOAT", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_FLOAT);
                // 1234.5678901234 is deformed to 1234.56787109375, 01000100100110100101001000101100
                expect(data?.value).toBe(1234.56787109375);
                context.destroyHard();
                done();
            })
        })


        it("simple GET DBR_ENUM -- even though there are up to 16 enum choices, we still get a round down integer", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_ENUM);
                // 1234.5678901234 is deformed to 1234.56787109375, 01000100100110100101001000101100
                expect(data?.value).toBe(1234);
                context.destroyHard();
                done();
            })
        })

        it("simple GET DBR_CHAR -- returns the round down number with range -128 to 127", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_CHAR);
                // round down 1234.5678901234 to 1234, then 1234 - 256 * 4 = 210 > 127, so the result is 210 - 256 = -46
                expect(data?.value).toBe(-46);
                context.destroyHard();
                done();
            })
        })

        it("simple GET DBR_LONG -- round down to integer", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_LONG);
                expect(data?.value).toBe(1234);
                context.destroyHard();
                done();
            })
        })

        it("simple GET DBR_DOUBLE -- accurate value", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_DOUBLE);
                expect(data?.value).toBe(1234.5678901234);
                context.destroyHard();
                done();
            })
        })


        // it("GET a specific type of data -- DBR_STS_STRING, round to integer", (done: jest.DoneCallback) => {
        //     const context = new Context();
        //     context.initialize().then(async () => {
        //         const channel = await context.createChannel("val2000");
        //         const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_STS_STRING);
        //         expect(data?.value).toBe("723");
        //         context.destroyHard();
        //         done();
        //     })
        // })


        // it("GET a specific type of data -- DBR_STS_SHORT, round to integer", (done: jest.DoneCallback) => {
        //     const context = new Context();
        //     context.initialize().then(async () => {
        //         const channel = await context.createChannel("val2000");
        //         const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_STS_STRING);
        //         expect(data?.value).toBe("723");
        //         context.destroyHard();
        //         done();
        //     })
        // })

        // it("GET a specific type of data -- DBR_STS_CHAR, round down the value", (done: jest.DoneCallback) => {
        //     const context = new Context();
        //     context.initialize().then(async () => {
        //         const channel = await context.createChannel("val2000");
        //         const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_STS_CHAR);
        //         // round down 722.878 to 722, then 722 - 256 - 256 = 210 > 127, so the result is 210 - 256 = -46
        //         expect(data?.value).toBe(-46);
        //         context.destroyHard();
        //         done();
        //     })
        // })


    })

    describe.skip("GET STS DBR type", () => {

        it("simple GET DBR_STS_STRING -- round value", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_STS_STRING);
                expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: "1235" });
                context.destroyHard();
                done();
            })
        })

        it("simple GET DBR_STS_INT -- round down", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_STS_INT);
                expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: 1234 });
                context.destroyHard();
                done();
            })
        })


        it("simple GET DBR_STS_FLOAT", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_STS_FLOAT);
                // 1234.5678901234 is deformed to 1234.56787109375, 01000100100110100101001000101100
                expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: 1234.56787109375 });
                context.destroyHard();
                done();
            })
        })


        it("simple GET DBR_STS_ENUM -- even though there are up to 16 enum choices, we still get a round down integer", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_STS_ENUM);
                expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: 1234 });
                context.destroyHard();
                done();
            })
        })

        it("simple GET DBR_STS_CHAR -- returns the round down number with range -128 to 127", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_STS_CHAR);
                // round down 1234.5678901234 to 1234, then 1234 - 256 * 4 = 210 > 127, so the result is 210 - 256 = -46
                expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: -46 });
                context.destroyHard();
                done();
            })
        })

        it("simple GET DBR_STS_LONG -- round down to integer", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_STS_LONG);
                expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: 1234 });
                context.destroyHard();
                done();
            })
        })

        it("simple GET DBR_STS_DOUBLE -- accurate value", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_STS_DOUBLE);
                expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: 1234.5678901234 });
                context.destroyHard();
                done();
            })
        })
    })

    describe.skip("GET TIME DBR type", () => {

        it("simple GET DBR_TIME_STRING -- round value", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_TIME_STRING);
                if (data !== undefined) {
                    data["secondsSinceEpoch"] = typeof data["secondsSinceEpoch"] as any;
                    data["nanoSeconds"] = typeof data["nanoSeconds"] as any;
                }
                expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: "1235", secondsSinceEpoch: "number", nanoSeconds: "number" });
                context.destroyHard();
                done();
            })
        })

        it("simple GET DBR_TIME_INT -- round down", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_TIME_INT);
                if (data !== undefined) {
                    data["secondsSinceEpoch"] = typeof data["secondsSinceEpoch"] as any;
                    data["nanoSeconds"] = typeof data["nanoSeconds"] as any;
                }
                expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: 1234, secondsSinceEpoch: "number", nanoSeconds: "number" });
                context.destroyHard();
                done();
            })
        })


        it("simple GET DBR_TIME_FLOAT", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_TIME_FLOAT);
                if (data !== undefined) {
                    data["secondsSinceEpoch"] = typeof data["secondsSinceEpoch"] as any;
                    data["nanoSeconds"] = typeof data["nanoSeconds"] as any;
                }
                // 1234.5678901234 is deformed to 1234.56787109375, 01000100100110100101001000101100
                expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: 1234.56787109375, secondsSinceEpoch: "number", nanoSeconds: "number" });
                context.destroyHard();
                done();
            })
        })


        it("simple GET DBR_TIME_ENUM -- even though there are up to 16 enum choices, we still get a round down integer", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_TIME_ENUM);
                if (data !== undefined) {
                    data["secondsSinceEpoch"] = typeof data["secondsSinceEpoch"] as any;
                    data["nanoSeconds"] = typeof data["nanoSeconds"] as any;
                }
                expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: 1234, secondsSinceEpoch: "number", nanoSeconds: "number" });
                context.destroyHard();
                done();
            })
        })

        it("simple GET DBR_TIME_CHAR -- returns the round down number with range -128 to 127", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_TIME_CHAR);
                if (data !== undefined) {
                    data["secondsSinceEpoch"] = typeof data["secondsSinceEpoch"] as any;
                    data["nanoSeconds"] = typeof data["nanoSeconds"] as any;
                }
                // round down 1234.5678901234 to 1234, then 1234 - 256 * 4 = 210 > 127, so the result is 210 - 256 = -46
                expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: -46, secondsSinceEpoch: "number", nanoSeconds: "number" });
                context.destroyHard();
                done();
            })
        })

        it("simple GET DBR_TIME_LONG -- round down to integer", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_TIME_LONG);
                if (data !== undefined) {
                    data["secondsSinceEpoch"] = typeof data["secondsSinceEpoch"] as any;
                    data["nanoSeconds"] = typeof data["nanoSeconds"] as any;
                }
                expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: 1234, secondsSinceEpoch: "number", nanoSeconds: "number" });
                context.destroyHard();
                done();
            })
        })

        it("simple GET DBR_TIME_DOUBLE -- accurate value", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_TIME_DOUBLE);
                if (data !== undefined) {
                    data["secondsSinceEpoch"] = typeof data["secondsSinceEpoch"] as any;
                    data["nanoSeconds"] = typeof data["nanoSeconds"] as any;
                }
                expect(data).toEqual({ status: CA_ALARM_STATUS.HIHI, severity: CA_ALARM_SEVRITY.MAJOR, value: 1234.5678901234, secondsSinceEpoch: "number", nanoSeconds: "number" });
                context.destroyHard();
                done();
            })
        })
    })

    describe.skip("GET GR DBR type", () => {

        it("simple GET DBR_GR_STRING -- round value", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_GR_STRING);
                // there is no "units"
                expect(data).toEqual({
                    status: CA_ALARM_STATUS.HIHI,
                    severity: CA_ALARM_SEVRITY.MAJOR,
                    value: "1235",
                });
                context.destroyHard();
                done();
            })
        })

        it("simple GET DBR_GR_INT -- round down", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_GR_INT);
                expect(data).toEqual({
                    status: CA_ALARM_STATUS.HIHI,
                    severity: CA_ALARM_SEVRITY.MAJOR,
                    value: 1234,
                    units: "km",
                    upper_display_limit: 8765,
                    lower_display_limit: 765,
                    upper_alarm_limit: 1000,
                    upper_warning_limit: 0,
                    lower_warning_limit: 0,
                    lower_alarm_limit: 0,
                });
                context.destroyHard();
                done();
            })
        })


        it("simple GET DBR_GR_FLOAT", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_GR_FLOAT);
                // 1234.5678901234 is deformed to 1234.56787109375, 01000100100110100101001000101100
                expect(data).toEqual({
                    status: CA_ALARM_STATUS.HIHI,
                    severity: CA_ALARM_SEVRITY.MAJOR,
                    value: 1234.56787109375,
                    units: "km",
                    precision: 0,
                    padding: 1,
                    upper_display_limit: 8765.431640625,
                    lower_display_limit: 765.43212890625,
                    upper_alarm_limit: 1000,
                    upper_warning_limit: 0,
                    lower_warning_limit: 0,
                    lower_alarm_limit: 0,
                });
                context.destroyHard();
                done();
            })
        })


        it("simple GET DBR_GR_ENUM", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_GR_ENUM);
                expect(data).toEqual({
                    status: CA_ALARM_STATUS.HIHI,
                    severity: CA_ALARM_SEVRITY.MAJOR,
                    value: 1234,
                    number_of_string_used: 0,
                    strings: ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
                });
                context.destroyHard();
                done();
            })
        })


        it("simple GET DBR_GR_CHAR", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_GR_CHAR);
                expect(data).toEqual({
                    status: CA_ALARM_STATUS.HIHI,
                    severity: CA_ALARM_SEVRITY.MAJOR,
                    value: -46,
                    units: "km",
                    upper_display_limit: 61,
                    lower_display_limit: -3,
                    upper_alarm_limit: -24,
                    upper_warning_limit: 0,
                    lower_warning_limit: 0,
                    lower_alarm_limit: 0,
                });
                context.destroyHard();
                done();
            })
        })


        it("simple GET DBR_GR_LONG", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_GR_LONG);
                expect(data).toEqual({
                    status: CA_ALARM_STATUS.HIHI,
                    severity: CA_ALARM_SEVRITY.MAJOR,
                    value: 1234,
                    units: "km",
                    upper_display_limit: 8765,
                    lower_display_limit: 765,
                    upper_alarm_limit: 1000,
                    upper_warning_limit: 0,
                    lower_warning_limit: 0,
                    lower_alarm_limit: 0,
                });
                context.destroyHard();
                done();
            })
        })



        it("simple GET DBR_GR_DOUBLE", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_GR_DOUBLE);
                expect(data).toEqual({
                    status: CA_ALARM_STATUS.HIHI,
                    severity: CA_ALARM_SEVRITY.MAJOR,
                    value: 1234.5678901234,
                    units: "km",
                    precision: 0,
                    padding: 1,
                    upper_display_limit: 8765.4321,
                    lower_display_limit: 765.4321,
                    upper_alarm_limit: 1000,
                    upper_warning_limit: 0,
                    lower_warning_limit: 0,
                    lower_alarm_limit: 0,
                });
                context.destroyHard();
                done();
            })
        })

    })

    describe.skip("GET CTRL DBR type", () => {

        it("simple GET DBR_CTRL_STRING -- round value", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_CTRL_STRING);
                // there is no "units"
                expect(data).toEqual({
                    status: CA_ALARM_STATUS.HIHI,
                    severity: CA_ALARM_SEVRITY.MAJOR,
                    value: "1235",
                });
                context.destroyHard();
                done();
            })
        })

        it("simple GET DBR_CTRL_INT -- round down", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_CTRL_INT);
                expect(data).toEqual({
                    status: CA_ALARM_STATUS.HIHI,
                    severity: CA_ALARM_SEVRITY.MAJOR,
                    value: 1234,
                    units: "km",
                    upper_display_limit: 8765,
                    lower_display_limit: 765,
                    upper_alarm_limit: 1000,
                    upper_warning_limit: 0,
                    lower_warning_limit: 0,
                    lower_alarm_limit: 0,
                    upper_ctrl_limit: 8765,
                    lower_ctrl_limit: 765,
                });
                context.destroyHard();
                done();
            })
        })


        it("simple GET DBR_CTRL_FLOAT", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_CTRL_FLOAT);
                // 1234.5678901234 is deformed to 1234.56787109375, 01000100100110100101001000101100
                expect(data).toEqual({
                    status: CA_ALARM_STATUS.HIHI,
                    severity: CA_ALARM_SEVRITY.MAJOR,
                    value: 1234.56787109375,
                    units: "km",
                    precision: 0,
                    padding: 1,
                    upper_display_limit: 8765.431640625,
                    lower_display_limit: 765.43212890625,
                    upper_alarm_limit: 1000,
                    upper_warning_limit: 0,
                    lower_warning_limit: 0,
                    lower_alarm_limit: 0,
                    upper_ctrl_limit: 8765.431640625,
                    lower_ctrl_limit: 765.43212890625,
                });
                context.destroyHard();
                done();
            })
        })


        it("simple GET DBR_CTRL_ENUM", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_CTRL_ENUM);
                expect(data).toEqual({
                    status: CA_ALARM_STATUS.HIHI,
                    severity: CA_ALARM_SEVRITY.MAJOR,
                    value: 1234,
                    number_of_string_used: 0,
                    strings: ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
                });
                context.destroyHard();
                done();
            })
        })


        it("simple GET DBR_CTRL_CHAR", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_CTRL_CHAR);
                expect(data).toEqual({
                    status: CA_ALARM_STATUS.HIHI,
                    severity: CA_ALARM_SEVRITY.MAJOR,
                    value: -46,
                    units: "km",
                    upper_display_limit: 61,
                    lower_display_limit: -3,
                    upper_alarm_limit: -24,
                    upper_warning_limit: 0,
                    lower_warning_limit: 0,
                    lower_alarm_limit: 0,
                    upper_ctrl_limit: 61,
                    lower_ctrl_limit: -3,
                });
                context.destroyHard();
                done();
            })
        })


        it("simple GET DBR_CTRL_LONG", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_CTRL_LONG);
                expect(data).toEqual({
                    status: CA_ALARM_STATUS.HIHI,
                    severity: CA_ALARM_SEVRITY.MAJOR,
                    value: 1234,
                    units: "km",
                    upper_display_limit: 8765,
                    lower_display_limit: 765,
                    upper_alarm_limit: 1000,
                    upper_warning_limit: 0,
                    lower_warning_limit: 0,
                    lower_alarm_limit: 0,
                    upper_ctrl_limit: 8765,
                    lower_ctrl_limit: 765,
                });
                context.destroyHard();
                done();
            })
        })

        it("simple GET DBR_CTRL_DOUBLE", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const data = await channel?.get(undefined, Channel_DBR_TYPES.DBR_CTRL_DOUBLE);
                expect(data).toEqual({
                    status: CA_ALARM_STATUS.HIHI,
                    severity: CA_ALARM_SEVRITY.MAJOR,
                    value: 1234.5678901234,
                    units: "km",
                    precision: 0,
                    padding: 1,
                    upper_display_limit: 8765.4321,
                    lower_display_limit: 765.4321,
                    upper_alarm_limit: 1000,
                    upper_warning_limit: 0,
                    lower_warning_limit: 0,
                    lower_alarm_limit: 0,
                    upper_ctrl_limit: 8765.4321,
                    lower_ctrl_limit: 765.4321,
                });
                context.destroyHard();
                done();
            })
        })

    })

    describe.skip("GET a stringin type PV -- DBR_STRING", () => {
        // we have a stringin record whose value is "This is TCA"

        it("the DBR type of stringin record -- DBR_STRING", (done: jest.DoneCallback) => {
            const context = new Context;
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2001");
                expect(channel?.getDbrType()).toBe(Channel_DBR_TYPES.DBR_STRING);
                context.destroyHard();
                done();
            })
        })

        it("the value count of stringin record -- 1", (done: jest.DoneCallback) => {
            const context = new Context;
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2001");
                expect(channel?.getDbr().getValueCount()).toBe(1);
                context.destroyHard();
                done();
            })
        })

        it("try to get DBR_INT of stringin record -- get value 0", (done: jest.DoneCallback) => {
            const context = new Context;
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2001");
                const result = await channel?.get(undefined, Channel_DBR_TYPES.DBR_INT);
                expect(result?.value).toBe(0);
                context.destroyHard();
                done();
            })
        })

        it("try to get DBR_ENUM of stringin record -- get value 0", (done: jest.DoneCallback) => {
            const context = new Context;
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2001");
                const result = await channel?.get(undefined, Channel_DBR_TYPES.DBR_ENUM);
                expect(result?.value).toBe(0);
                context.destroyHard();
                done();
            })
        })

        it("try to get DBR_GR_ENUM of stringin record -- get value 0", (done: jest.DoneCallback) => {
            const context = new Context;
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2001");
                // the IOC returns an array full of 0
                const result = await channel?.get(undefined, Channel_DBR_TYPES.DBR_GR_ENUM);
                expect(result).toEqual({
                    value: 0,
                    status: 0,
                    severity: 0,
                    number_of_string_used: 0,
                    strings: ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",],
                });
                context.destroyHard();
                done();
            })
        })

        it("try to get DBR_DOUBLE of stringin record -- get value 0", (done: jest.DoneCallback) => {
            const context = new Context;
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2001");
                const result = await channel?.get(undefined, Channel_DBR_TYPES.DBR_DOUBLE);
                expect(result?.value).toBe(0);
                context.destroyHard();
                done();
            })
        })

        it("try to get DBR_CHAR of stringin record -- get value 0", (done: jest.DoneCallback) => {
            const context = new Context;
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2001");
                const result = await channel?.get(undefined, Channel_DBR_TYPES.DBR_CHAR);
                expect(result?.value).toBe(0);
                context.destroyHard();
                done();
            })
        })
    })

    describe.skip("GET a mbbi type pv -- DBR_ENUM", () => {

        it("create a mbbi channel, check its type is DBR_ENUM", (done: jest.DoneCallback) => {
            const context = new Context()
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2002");
                expect(channel?.getDbrType()).toBe(Channel_DBR_TYPES.DBR_ENUM);
                context.destroyHard();
                done();
            })
        })

        it("create a mbbi channel, GET its value, obtain a number", (done: jest.DoneCallback) => {
            const context = new Context()
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2002");
                const result = await channel?.get();
                expect(result?.value).toBe(2);
                context.destroyHard();
                done();
            })
        })

        it("create a mbbi channel, GET the GR_ENUM, should get number_of_string_used and strings", (done: jest.DoneCallback) => {
            const context = new Context()
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2002");
                const result = await channel?.get(undefined, channel.getDbrType_GR());
                expect(result).toEqual({
                    value: 2,
                    status: CA_ALARM_STATUS.NO_ALARM,
                    severity: CA_ALARM_SEVRITY.NO_ALARM,
                    number_of_string_used: 4,
                    strings: ["This is zero", "This is one", "This is two", "This is three", "", "", "", "", "", "", "", "", "", "", "", ""],
                });
                context.destroyHard();
                done();
            })
        })

        it("create a mbbi channel, GET the GR_FLOAT, the meta data is basically all 0", (done: jest.DoneCallback) => {
            const context = new Context()
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2002");
                const result = await channel?.get(undefined, Channel_DBR_TYPES.DBR_GR_FLOAT);
                // it is a GR_FLOAT type data, no sign that this channel is actually ENUM
                // ENUM channel does not have unit
                expect(result).toEqual({
                    value: 2,
                    status: CA_ALARM_STATUS.NO_ALARM,
                    severity: CA_ALARM_SEVRITY.NO_ALARM,
                    units: "",
                    precision: 0,
                    padding: 1,
                    upper_display_limit: 0,
                    lower_display_limit: 0,
                    upper_alarm_limit: 0,
                    upper_warning_limit: 0,
                    lower_warning_limit: 0,
                    lower_alarm_limit: 0,
                });
                context.destroyHard();
                done();
            })
        })

    })

    describe.skip("Channel.get() inconsistent inputs", () => {
        // if the user input arguments are illegal for Channel.get(), e.g. the ioTimeout is a string, 
        // the consequence is unpredictable, this should not be handled by this library
        // 
        // If the user inputs an inconsistent input, EPICS TCA should be able to handle it
        it("ioTimeout is -1 second, we may or may not get a value", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const result = await channel?.get(-1, channel.getDbrType())
                expect(result?.value === 1234.5678901234 || result?.value === undefined).toBe(true)
                context.destroyHard();
                done()
            })
        })

        it("GET requests more values than the channel has, returns the same amount of values with patched 0s", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const result = await channel?.get(5, channel.getDbrType(), 5)
                expect(result?.value).toEqual([1234.5678901234, 0, 0, 0, 0]);
                context.destroyHard();
                done()
            })
        })

        it("GET more values than the channel has, GET DBR_STRING type, returns the same amount of values with patched empty strings", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                // try to get DBR_STRING values
                const result = await channel?.get(5, Channel_DBR_TYPES.DBR_STRING, 5)
                expect(result?.value).toEqual(["1235", "", "", "", ""]);
                context.destroyHard();
                done()
            })
        })


        it("GET the value with 0 value count, returns the nominal amount of values", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const result = await channel?.get(5, channel.getDbrType(), 0)
                expect(result?.value).toBe(1234.5678901234);
                context.destroyHard();
                done()
            })
        })

        it("GET the value with -1 value count, returns the nominal amount of values", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const result = await channel?.get(5, channel.getDbrType(), -1)
                expect(result?.value).toBe(1234.5678901234);
                context.destroyHard();
                done()
            })
        })

    })

    // todo: destroy softly


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

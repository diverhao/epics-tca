import { Context, Context_STATES } from "../Context/Context";
import { ChannelMonitor } from "../Channel/ChannelMonitor";
import { Channel } from "../Channel/Channel";
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

    describe.skip("DBR type in Channel", () => {
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


    // todo: destroy softly

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

// describe("Test Channel", () => {
// test("create channel, but no IOC for this PV, timeout", async () => {
//     const context = new Context();
//     context.initialize();
//     const channel = await context.createChannel("val1", 1.3);
//     expect(channel).toEqual(undefined);
//     context.destroyHard();
// });
// test("create channel -- with a timeout", async () => {
// 	const context = new Context();
// 	context.initialize();
//     // turn off the IOC, should return "undefined" after 1.3 seconds
// 	const channel = await context.createChannel("val1", 1.3);
// 	expect(channel).toEqual(undefined);
// 	context.destroyHard();
// });
// test("create channel, success", async () => {
//     const context = new Context();
//     context.initialize();
//     const channel = await context.createChannel("val1", 0.3);
//     expect(channel?.getStateStr()).toEqual("CREATED");
//     context.destroyHard();
// })
// test("destroy channel softly, will do the re-search, and automatically re-created", async () => {
// 	const context = new Context();
// 	context.initialize();
// 	const channel = await context.createChannel("val1");
// 	await channel?.destroySoft();
// 	await new Promise((resolve, reject) => {
// 		setTimeout(() => {
// 			resolve("");
// 		}, 1000);
// 	});
// 	// channel is re-created
// 	expect(channel?.getStateStr()).toEqual("CREATED");
// 	context.destroyHard();
// });
// test("destroy channel hard, no re-search", async () => {
// 	const context = new Context();
// 	context.initialize();
// 	const channel = await context.createChannel("val1");
// 	await channel?.destroyHard();
// 	await new Promise((resolve, reject) => {
// 		setTimeout(() => {
//             resolve("");
//         }, 1000);
// 	});
//     // no "re-creation"
// 	expect(channel?.getStateStr()).toEqual("DESTROYED");
// 	context.destroyHard();
// });
// test("simple get", async () => {
// 	const context = new Context();
// 	context.initialize();
// 	const channel = await context.createChannel("val1");
//     const result = await channel?.get();
// 	context.destroyHard();
// 	expect(result?.value).not.toEqual(undefined);
// });
// test("simple get -- with a timeout", async () => {
// 	const context = new Context();
// 	context.initialize();
//     // run the IOC
// 	const channel = await context.createChannel("val1");
//     // ctrl-z the IOC
// 	await new Promise((resolve, reject) => {
// 		setTimeout(() => {
// 			resolve("");
// 		}, 2000);
// 	});
//     // should return "undefined" after 1.3 seconds
// 	const result = await channel?.get(1.3);
// 	expect(result).toEqual(undefined);
// 	context.destroyHard();
// });
// test("simple get -- fetch particular type data", async () => {
// 	const context = new Context();
// 	context.initialize();
//     // run the IOC
// 	const channel = await context.createChannel("val1");
//     // no timeout, DBR_CTRL_LONG
// 	const result = await channel?.get(undefined, 33);
// 	expect(typeof result?.upper_ctrl_limit).toEqual("number");
// 	context.destroyHard();
// });
// test("simple get -- fetch particular type data (ENUM) for bi", async () => {
// 	const context = new Context();
// 	context.initialize();
//     // run the IOC
// 	const channel = await context.createChannel("val2");
//     // no timeout, DBR_CTRL_ENUM, should come back as a number
// 	const result = await channel?.get(undefined, 31);
// 	expect(typeof result?.value).toEqual("number");
// 	context.destroyHard();
// });
// test("simple get -- fetch particular type data (STRING) for bi", async () => {
// 	const context = new Context();
// 	context.initialize();
//     // run the IOC
// 	const channel = await context.createChannel("val2");
//     // no timeout, DBR_CTRL_STRING, should come back as a ONAM or ZNAM
// 	const result = await channel?.get(undefined, 28);
// 	expect(typeof result?.value).toEqual("string");
// 	context.destroyHard();
// });
// test("simple get -- fetch property ONAM of a bi PV", async () => {
// 	const context = new Context();
// 	context.initialize();
//     // run the IOC
// 	const channel = await context.createChannel("val2.ONAM");
//     // no timeout, use default type (ONAM is "string")
// 	const result = await channel?.get();
// 	expect(typeof result?.value).toEqual("string");
// 	context.destroyHard();
// });
// test("simple get -- obtain multiple element from waveform", async () => {
// 	const context = new Context();
// 	context.initialize();
//     // run the IOC
// 	const channel = await context.createChannel("val3");
//     // no timeout, should get 5-element data
// 	const result = await channel?.get();
//     // length of the value property of result, should be a "number"
// 	expect(typeof result?.value === "object"? typeof result?.value.length: typeof undefined).toEqual("number");
// 	context.destroyHard();
// });

// // must set "testTimeout" to be 20000 in package.json
// // must run an IOC with PVs from "val0" to "val99999"
// test("create large amount of PVs, test the time used", async () => {
// 	const pvs: string[] = [];
// 	const size = 100000;
// 	let successCount = 0;
// 	for (let ii = 0; ii < size; ii++) {
// 		pvs.push(`val${ii}`);
// 	}
// 	const context = new Context();
// 	context.initialize();
// 	let dt = -100;
// 	let t0 = 0;
// 	const func1 = async () => {
// 		t0 = performance.now();
// 		pvs.forEach((pvname: string) => {
// 			context.createChannel(pvname).then(() => {
// 				successCount++;
// 				if (successCount === size) {
// 					dt = performance.now() - t0;
// 					context.destroyHard();
// 				}
// 			});
// 		});
// 	};
//     func1();
// 	await new Promise((resolve, reject) => {
// 		setTimeout(() => {
// 			resolve("");
// 		}, 13 * 1000);
// 	});
//     console.log(dt)
//     expect(dt).toBeLessThan(13 * 1000);
// });

// // must set "testTimeout" to be 20000 in package.json
// // must run an IOC with PVs from "val0" to "val99999"
// test("create and read large amount of PVs, test the time used", async () => {
// 	const pvs: string[] = [];
// 	const size = 100000;
// 	let successCount = 0;
// 	for (let ii = 0; ii < size; ii++) {
// 		pvs.push(`val${ii}`);
// 	}
// 	const context = new Context();
// 	context.initialize();
// 	let dt = -100;
// 	let t0 = 0;
// 	const func1 = async () => {
// 		t0 = performance.now();
// 		pvs.forEach((pvname: string) => {
// 			context.createChannel(pvname).then((channel: Channel | undefined) => {
// 				channel?.get().then(() => {
// 					successCount++;
// 					if (successCount === size) {
// 						dt = performance.now() - t0;
// 						context.destroyHard();
// 					}
// 				});
// 			});
// 		});
// 	};
// 	func1();
// 	await new Promise((resolve, reject) => {
// 		setTimeout(() => {
// 			resolve("");
// 		}, 15 * 1000);
// 	});
// 	console.log(dt);
//     // should take less than 15 s, usually around 10 s
// 	expect(dt).toBeLessThan(15 * 1000);
// });

// // run IOC all the time
// test("put(), then get(), success", async () => {
// 	const context = new Context();
// 	const newValue = [Math.random() * 100];
// 	context.initialize();
//     // timeout = 0.2 s
// 	const channel = await context.createChannel("val4", 0.2);
//     // timeout = 0.2 s
// 	const status = await channel?.put(newValue, 0.2, undefined, true);
//     // timeout = 0.2 s
// 	const result = await channel?.get(0.2);
//     // we can read the channel
// 	expect(result?.value).toBeLessThan(101);
// 	context.destroyHard();
// });

// test("create channel, pause/kill IOC, then put(), and get(), get undefined result", async () => {
//     // run IOC
//     const context = new Context();
// 	const newValue = [Math.random() * 100];
// 	context.initialize();
//     // pause IOC (ctrl-z), or kill IOC (ctrl-c)
//     await new Promise((resolve, reject) => {
//         setTimeout(() => {
//             resolve("");
//         }, 5000);
//     })
//     // timeout = 0.2 s
// 	const channel = await context.createChannel("val4", 0.2);
//     // timeout = 0.2 s
// 	const status = await channel?.put(newValue, 0.2, undefined, true);
//     // timeout = 0.2 s
// 	const result = await channel?.get(0.2);
//     // all above await results are "undefined"
// 	expect(result).toBe(undefined);
// 	context.destroyHard();
// });
// });

// const context = new Context();
// const func1 = async () => {
// 	const newValue = [Math.random() * 100];
//     // console.log(newValue)
// 	context.initialize();
// 	const channel = await context.createChannel("val0", 0.2);
// 	// const status = await channel?.put(newValue, 0.2);
//     // const result = await channel?.get(0.2);
//     const monitor = await channel?.createMonitor((monitor) => {
//         console.log(monitor.getDbrData());
//     }, channel.getDbrTypeNum_RAW());
//     // console.log(monitor?.state);
//     await monitor?.subscribe();
//     setTimeout(() => {
//         console.log("Pause monitor");
//         monitor?.pause();
//         // monitor?.send_CA_PROTO_EVENT_CANCEL();
//     }, 2000);
//     setTimeout(() => {
//         console.log("Resume monitor");
//         monitor?.resume();
//     }, 4000);
//     // console.log(monitor?.state);
// 	// context.destroyHard();
// };

// func1();

// setTimeout(() => {
// 	context.destroyHard();
// }, 7000);



// const context = new Context();
// const func1 = async () => {
// 	context.initialize();
// 	const channel = await context.createChannel("val2", 0.2);
//     const result = await channel?.get(1, 24);
//     console.log(result)
//     // const monitor = await channel?.createMonitor((monitor) => {
//     //     console.log(monitor.getDbrData());
//     // }, channel.getDbrTypeNum_RAW());
//     // // console.log(monitor?.state);
//     // await monitor?.subscribe();
//     // setTimeout(() => {
//     //     console.log("Pause monitor");
//     //     monitor?.pause();
//     //     // monitor?.send_CA_PROTO_EVENT_CANCEL();
//     // }, 2000);
//     // setTimeout(() => {
//     //     console.log("Resume monitor");
//     //     monitor?.resume();
//     // }, 4000);
//     // // console.log(monitor?.state);
// 	// // context.destroyHard();
// };

// func1();

// setTimeout(() => {
// 	context.destroyHard();
// }, 7000);



// // // must set "testTimeout" to be 20000 in package.json
// // // must run an IOC with PVs from "val0" to "val99999"
// const pvs: string[] = [];
// const size = 50000;
// let successCount = 0;
// for (let ii = 0; ii < size; ii++) {
// 	pvs.push(`val${ii}`);
// }
// const context = new Context();
// context.initialize();
// let dt = -100;
// let t0 = 0;
// const func1 = async () => {
// 	t0 = performance.now();
// 	pvs.forEach((pvname: string) => {
// 		context.createChannel(pvname).then((channel: Channel | undefined) => {
//             // console.log(pvname)
//             channel?.createMonitor(
//                 (monitor: ChannelMonitor) => {
//                 // // console.log(channel.getDbrData())
//                 successCount++;
//                 // if (successCount === size*10) 
//                 //     console.log(performance.now() - t0)
//                 // }
//                 // console.log(successCount)
//             }
//             ).then((monitor: ChannelMonitor | undefined) => {
//                 // console.log(pvname, "--> monitor")
//                 monitor?.subscribe();
//             });
//             // monitor?.subscribe();
// 			// channel?.get().then(() => {
//             //     // console.log(pvname)
// 			// 	successCount++;
// 			// 	if (successCount === size) {
// 			// 		dt = performance.now() - t0;
//             //         console.log(dt)
// 			// 		context.destroyHard();
// 			// 	}
// 			// });
// 		});
// 	});
// };
// func1();

// setInterval(() => {
//     console.log(successCount)
//     successCount = 0;
// }, 1000)
// console.log("-------------->")
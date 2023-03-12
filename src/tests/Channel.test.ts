import { Context } from "../";
import { Context_STATES, RepeaterThread_STATES } from "../Context";
import { Environment } from "../Global";
import { UDPTransportState } from "../UDPTransport";
import { Channel } from "../Channel";

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



const context = new Context();
const func1 = async () => {
	context.initialize();
	const channel = await context.createChannel("val2", 0.2);
    const result = await channel?.get(1, 24);
    console.log(result)
    // const monitor = await channel?.createMonitor((monitor) => {
    //     console.log(monitor.getDbrData());
    // }, channel.getDbrTypeNum_RAW());
    // // console.log(monitor?.state);
    // await monitor?.subscribe();
    // setTimeout(() => {
    //     console.log("Pause monitor");
    //     monitor?.pause();
    //     // monitor?.send_CA_PROTO_EVENT_CANCEL();
    // }, 2000);
    // setTimeout(() => {
    //     console.log("Resume monitor");
    //     monitor?.resume();
    // }, 4000);
    // // console.log(monitor?.state);
	// // context.destroyHard();
};

func1();

setTimeout(() => {
	context.destroyHard();
}, 7000);

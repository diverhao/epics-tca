import { Context } from "../";
import { Context_STATES, RepeaterThread_STATES } from "../Context";
import { Environment } from "../Global";
import { UDPTransportState } from "../UDPTransport";

describe("Test Channel", () => {
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

    //todo: 

});

// const context = new Context();
// const  func1 = async () => {
//     context.initialize();
//     const channel = await context.createChannel("val1");
//     console.log("----------------->< channel created!")
//     await new Promise((resolve, reject) => {
//         setTimeout(() => {
//             resolve("");
//         }, 5000)
//     })
//     console.log("----------------->< try to get()")
//     const result = await channel?.get(500000);
//     console.log("----------------->< io timeout")
// }

// func1()

// setTimeout(() => {context.destroyHard()}, 10000);

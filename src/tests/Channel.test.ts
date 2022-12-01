import { Context } from "../";
import { Context_STATES, RepeaterThread_STATES } from "../Context";
import { Environment } from "../Global";
import { UDPTransportState } from "../UDPTransport";

// describe("Test Channel", () => {
	// test("create channel, but IOC for this PV, timeout", async () => {
	//     const context = new Context();
	//     context.initialize();
	//     const channel = await context.createChannel("val1", 0.3);
	//     expect(channel).toEqual(undefined);
	//     context.destroyHard();
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
    //             resolve("");
    //         }, 1000);
	// 	});
    //  // channel is re-created
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

// });

const context = new Context();
const  func1 = async () => {
    context.initialize();
    const channel = await context.createChannel("val1");
    const result = await channel?.get(5);
}

func1()

setTimeout(() => {context.destroyHard()}, 10000);

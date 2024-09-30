// import { Context } from "../";
// import { Context_STATES, RepeaterThread_STATES } from "../Context";
// import { Environment } from "../Global";
// import { UDPTransportState } from "../UDPTransport";

describe("Load and show environments", () => {
	test("dummy test", () => {
		expect(true).toBe(true);
	});

	// 	test("No user input, use the system environment and defaults", () => {
	// 		const context = new Context();
	// 		expect(Object.values(context.getEnvSource())).toEqual(expect.arrayContaining(["default", "os"]));
	//         // must destroy
	//         Environment.destroy();
	// 	});
	// 	test("Correct user input, all values must be in string", () => {
	// 		const context = new Context({ EPICS_CA_ADDR_LIST: "ics-srv09 localhost"});
	//         expect(context.getEnvSource().EPICS_CA_ADDR_LIST).toMatch("user");
	//         Environment.destroy();
	// 	});
	// 	test("Correct user input, all values must be in string", () => {
	// 		const context = new Context({ EPICS_CA_ADDR_LIST: "ics-srv09, localhost"});
	//         expect(context.getEnvSource().EPICS_CA_ADDR_LIST).toMatch("user");
	//         Environment.destroy();
	// 	});
	// 	test("Correct user input, all values must be in string", () => {
	// 		const context = new Context({ EPICS_CA_ADDR_LIST: "[ics-srv09, localhost]"});
	//         expect(context.getEnvSource().EPICS_CA_ADDR_LIST).toMatch(/os|default/);
	//         Environment.destroy();
	// 	});
	// 	test("Correct user input, all values must be in string", () => {
	// 		const context = new Context({ EPICS_CA_REPEATER_PORT: "9527" });
	//         expect(context.getEnvSource().EPICS_CA_REPEATER_PORT).toMatch("user")
	//         Environment.destroy();
	// 	});
	// 	test("Incorrect user input, the value should be a string in form of a number", () => {
	// 		const context = new Context({ EPICS_CA_REPEATER_PORT: "abc123" });
	//         expect(context.getEnvSource().EPICS_CA_REPEATER_PORT).toMatch(/default|os/)
	//         Environment.destroy();
	// 	});
	// 	test("Illegal IP address, the source of EPICS_CA_ADDR_LIST should be os or default", () => {
	// 		const context = new Context({ EPICS_CA_ADDR_LIST: "1.2.3.4  #_-$ localhost" });
	// 		expect(context.getEnvSource().EPICS_CA_ADDR_LIST).toMatch(/default|os/);
	//         Environment.destroy();
	// 	});
	// });

	// describe("Destroy Context at various stages", () => {
	// 	test("create then destroy, (1) no promise", () => {
	// 		const context = new Context();
	// 		context.destroyHard();
	// 		expect(context.contextPromises.getAllPromiseNames().length).toEqual(0);
	// 	});
	// 	test("create then destroy, (3) no channel", () => {
	// 		const context = new Context();
	// 		context.destroyHard();
	// 		expect(Object.keys(context.unresolvedChannelsByName).length + Object.keys(context.resolvedChannelsByName).length).toEqual(0);
	// 	});
	// 	test("create then destroy, (4) no thread, the thread should not have been created yet", () => {
	// 		const context = new Context();
	// 		context.destroyHard();
	// 		expect(context.repeaterThread === undefined).toEqual(true);
	// 	});
	// 	test("create then destroy, (5) no Beacon", () => {
	// 		const context = new Context();
	// 		context.destroyHard();
	// 		expect(Object.keys(context.beacons).length).toEqual(0);
	// 	});
	// 	test("create then destroy, (6) no TCP", () => {
	// 		const context = new Context();
	// 		context.destroyHard();
	// 		expect(Object.keys(context.tcpTransports.tcpTransports).length).toEqual(0);
	// 	});
	// 	test("create then destroy, (6) no TCP", () => {
	// 		const context = new Context();
	// 		context.destroyHard();
	// 		expect(Object.keys(context.tcpTransports.tcpTransports).length).toEqual(0);
	// 	});
	// 	test("create then destroy, (7) no UDP", () => {
	// 		const context = new Context();
	// 		context.destroyHard();
	// 		expect(context.udpTransport.intervals.getAllIntervalNames().length).toEqual(0);
	// 	});
	// 	test("create then destroy, (8) no interval", () => {
	// 		const context = new Context();
	// 		context.destroyHard();
	// 		expect(context.intervals.getAllIntervalNames().length).toEqual(0);
	// 	});
	// 	test("create then destroy, (9) no Environment", () => {
	// 		const context = new Context();
	// 		context.destroyHard();
	// 		expect(context.envInstance).toEqual(undefined);
	// 	});
	// });

	// describe("Destroy Context after initialize", () => {

	// test("initialize and destroy", () => {
	// 	const context = new Context();
	// 	context.initialize().then(() => {
	//         expect(context.state).toEqual(ContextState.INITIALIZED);
	//         context.destroyHard();
	//     });
	// });

	// test("initialize, when there is another CA Repeater running", async () => {
	// 	const context = new Context();
	// 	context.initialize();
	// 	await new Promise((resolve, reject) => {
	// 		setTimeout(() => {
	// 			resolve("");
	// 		}, 1500);
	// 	});
	// 	expect(context.repeaterThreadState).toEqual(RepeaterThreadState.FAILED);
	// 	context.destroyHard();
	// });

	// test("initialize, when there is no other CA Repeater running", async () => {
	// 	const context = new Context();
	// 	context.initialize();
	// 	await new Promise((resolve, reject) => {
	// 		setTimeout(() => {
	// 			resolve("");
	// 		}, 2500);
	// 	});
	// 	expect(context.repeaterThreadState).toEqual(RepeaterThreadState.INITIALIZED);
	// 	context.destroyHard();
	// });

	// test("initialize, if UDP successfully initialized (bind a random port)", async () => {
	// 	const context = new Context();
	// 	context.initialize();
	// 	await new Promise((resolve, reject) => {
	// 		setTimeout(() => {
	// 			resolve("");
	// 		}, 500);
	// 	});
	// 	expect(context.udpTransport.state).toEqual(UDPTransportState.INITIALIZED);
	// 	context.destroyHard();
	// });
});

//, 0x----------------, 0xContext, 0x---------------------------------

//, 0ximport {Context, Environment} from "..";

// let context = new Context({EPICS_CA_ADDR_LIST: ["ics-srv09", "localhost", "abcd.efg"], EPICS_CA_REPEATER_PORT: "abc"});

// // console.log(Environment)

// context.initialize()

// setTimeout(() => {
//     console.log(";;;;")
// }, 5000)

// ---------------- Environment ---------------------------------

// import { Environment } from "../Global";

// let a = Environment.getInstance({abc: "efg", EPICS_CA_ADDR_LIST: "37 localhost", EPICS_CA_BEACON_PERIOD: "0.2"}, {ignoreOsEnv: true, skipLocalhost: false, ignoreUserEnv: true});

// // let a = Environment.getInstance({EPICS_CA_ADDR_LIST: "38"}, false);

// console.log(a.getEnvSource())
// console.log(a.getEnvOS())
// console.log(a.getEnvUser())
// console.log(a.getEnvDefault())
// console.log(a.getEnv())

// ---------------- CA Repeater ---------------------------------

// import { CARepeater } from "../CARepeater/CARepeater"

// const a = new CARepeater();
// console.log(a.getEnv());
// a.run();

// --------------- Context initialization --------------------

// import { Context } from "../Context";

// let a = new Context();
// a.initialize();
// --------------- Context.createChannel --------------------

// import { Context } from "../Context";

// let a = new Context({EPICS_CA_BEACON_PERIOD: "15"});
// a.initialize().then(() => {
//     a.createChannels(["val1", "val2"]);
// })

// setTimeout(() => {
//     // console.log(a.unresolvedChannelsByName)
//     console.log(a.resolvedChannelsByName['val1'])
//     console.log(a.resolvedChannelsByName['val2'])
// }, 3000)

// --------------- class Dbr --------------------

// import {Dbr} from "../Channel/Dbr"
// let a = new Dbr()

// // dbr type = 0, payload
// let c = Buffer.from([0x35, 0x33, 0x34, 0x00, 0x00, 0x00, 0x00, 0x00]);
// a.decodeBuffer(c, 0, 1)
// console.log(a.getMeta())
// console.log(a.getData())

// // dbr type = 7, payload
// let c = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x32, 0x32, 0x33, 0x00]);
// a.decodeBuffer(c, 7, 1)
// console.log(a.getMeta())
// console.log(a.getData())

// // dbr type = 14, payload
// let c = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x3d, 0xcf, 0x2c, 0x32, 0x03, 0x80, 0x8b, 0xa0, 0x31, 0x36, 0x30, 0x00]);
// a.decodeBuffer(c, 14, 1)
// console.log(a.getMeta())
// console.log(a.getData())

// // dbr type = 21, payload
// let c = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x32, 0x36, 0x35, 0x00]);
// a.decodeBuffer(c, 21, 1)
// console.log(a.getMeta())
// console.log(a.getData())

// // dbr type = 28, payload
// let c = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x32, 0x36, 0x35, 0x00]);
// a.decodeBuffer(c, 28, 1)
// console.log(a.getMeta())
// console.log(a.getData())

// // dbr type = 1, payload
// let c = Buffer.from([0x01, 0x5e, 0x01, 0x2e,0x01, 0x2e,0x01, 0x2e]);
// a.decodeBuffer(c, 1, 4)
// console.log(a.getMeta())
// console.log(a.getData())

// // dbr type = 8, payload
// let c = Buffer.from([0x00, 0x00,0x00, 0x00, 0x01, 0x2e,0x00, 0x00]);
// a.decodeBuffer(c, 8, 1)
// console.log(a.getMeta())
// console.log(a.getData())

// // dbr type = 15, payload
// let c = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x3d, 0xcf, 0x32, 0xb0, 0x2a, 0x15, 0xd1, 0xa8, 0x00, 0x00, 0x02, 0xf2]);
// a.decodeBuffer(c, 15, 1)
// console.log(a.getMeta())
// console.log(a.getData())

// // dbr type = 22, payload
// let c = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x6b, 0x6d, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x14, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x1f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
// a.decodeBuffer(c, 22, 1)
// console.log(a.getMeta())
// console.log(a.getData())

// // dbr type = 33, payload
// let c = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x6b, 0x6d, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x14, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x14, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x01, 0x4f]);
// a.decodeBuffer(c, 33, 1)
// console.log(a.getMeta())
// console.log(a.getData())

// ----------------- Dbr with read --------------------

// import { Context } from "../Context";
// import { Channel } from "../Channel";
// import { GlobalMethods } from "../Global";

// let a = new Context({ EPICS_CA_BEACON_PERIOD: "15" });
// a.initialize().then(() => {
// 	a.createChannel("val1").then((channel: Channel | undefined) => {
//         let offset = 4;
//         let val = [99.8, 35.2];
//         let datacount = 2;
// 		try {
// 			console.log(channel?.dbr.encodeBuffer(val, 0 + 7 * offset, datacount));
// 		} catch (e) {
// 			GlobalMethods.errorLog(e);
// 		}
// 		try {
// 			console.log(channel?.dbr.encodeBuffer(val, 1+ 7 * offset, datacount));
// 		} catch (e) {
// 			GlobalMethods.errorLog(e);
// 		}
// 		try {
// 			console.log(channel?.dbr.encodeBuffer(val, 2+ 7 * offset, datacount));
// 		} catch (e) {
// 			GlobalMethods.errorLog(e);
// 		}
// 		try {
// 			console.log(channel?.dbr.encodeBuffer(val, 3+ 7 * offset, datacount));
// 		} catch (e) {
// 			GlobalMethods.errorLog(e);
// 		}
// 		try {
// 			console.log(channel?.dbr.encodeBuffer(val, 4+ 7 * offset, datacount));
// 		} catch (e) {
// 			GlobalMethods.errorLog(e);
// 		}
// 		try {
// 			console.log(channel?.dbr.encodeBuffer(val, 5+ 7 * offset, datacount));
// 		} catch (e) {
// 			GlobalMethods.errorLog(e);
// 		}
// 		try {
// 			console.log(channel?.dbr.encodeBuffer(val, 6+ 7 * offset, datacount));
// 		} catch (e) {
// 			GlobalMethods.errorLog(e);
// 		}
// 		// channel?.get(0);
// 		// channel?.get(1);
// 		// channel?.get(2);
// 		// channel?.get(3);
// 		// channel?.get(4);
// 		// channel?.get(5);
// 		// channel?.get(6);
// 		// channel?.get(7);
// 		// channel?.get(8);
// 		// channel?.get(9);
// 		// channel?.get(10);
// 		// channel?.get(11);
// 		// channel?.get(12);
// 		// channel?.get(13);
// 		// channel?.get(14);
// 		// channel?.get(15);
// 		// channel?.get(16);
// 		// channel?.get(17);
// 		// channel?.get(18);
// 		// channel?.get(19);
// 		// channel?.get(20);
// 		// channel?.get(21);
// 		// channel?.get(22);
// 		// channel?.get(23);
// 		// channel?.get(24);
// 		// channel?.get(25);
// 		// channel?.get(26);
// 		// channel?.get(27);
// 		// channel?.get(28);
// 		// channel?.get(29);
// 		// channel?.get(30);
// 		// channel?.get(31);
// 		// channel?.get(32);
// 		// channel?.get(33);
// 		// channel?.get(34);
// 	});
// });

// ----------------- Dbr with read --------------------

// import { Context } from "../Context";
// import { Channel } from "../Channel";
// import { GlobalMethods } from "../Global";

// let a = new Context({ EPICS_CA_BEACON_PERIOD: "15" });
// a.initialize().then(() => {
// 	a.createChannel("val1").then((channel: Channel | undefined) => {});
// });

// ----------------- ReadWriteIO.ts --------------------

// import { Context } from "../Context";
// import { Channel } from "../Channel";
// import { GlobalMethods } from "../Global";

// let a = new Context({ EPICS_CA_BEACON_PERIOD: "15" });
// a.initialize().then(() => {
// 	a.createChannels(["val1", "val2"]);
// });
// a.initialize().then(() => {
// 	a.createChannels(["val1", "val2"]).then((channel: Channel | undefined) => {
//         channel?.get().then(() => console.log(channel?.dbr.getValue()))
//     });
// });


// ------------------- destroy ----------------------
// import { Context, ChannelMonitor } from "..";

// let context = new Context({EPICS_CA_BEACON_PERIOD: "5"});

// async function tcaMonitor(name: string) {
//     let channel = await context.createChannel(name);
//     let monitor = await channel?.createMonitor(monitorListener, 17);
// }

// function monitorListener(monitor: ChannelMonitor) {
//     console.log(monitor.name, ":", monitor.getChannel().getDbrValue());
// }

// const pvNames: string[] = [];

// for (let ii = 2; ii < 50; ii++) {
//     pvNames.push(`val${ii.toString()}`);
// }

// context.initialize().then(() => {
//     // tcaMonitor("FE:Scope_1:RMS2");
//     // tcaMonitor("val1");
//     pvNames.forEach((pvName: string) => {
//         tcaMonitor(pvName);
//     })
// });

// setTimeout(() => {
//     // console.log("Terminate program");
//     // context.terminate();
//     // const channel = context.getChannelByName("val1");
//     // channel?.destroyHard();
//     context.destroyHard();
// }, 5 * 1000)

// ------------------- soft destroy ----------------------
import { Context, ChannelMonitor } from "..";

let context = new Context({EPICS_CA_BEACON_PERIOD: "5", EPICS_CA_AUTO_ADDR_LIST: "No"});

let channel: any;

async function tcaMonitor(name: string) {
    channel = await context.createChannel(name);
    let monitor = await channel?.createMonitor(monitorListener);
    await monitor?.subscribe();
    // await channel?.get();
    console.log(channel.getDbrData(), context.getEnv());
}

function monitorListener(monitor: ChannelMonitor) {
    console.log(monitor.name, ":", monitor.getChannel().getDbrData());
}

const pvNames: string[] = [];

for (let ii = 1; ii < 2; ii++) {
    pvNames.push(`val${ii.toString()}`);
}

context.initialize() //.then(() => {
    // tcaMonitor("FE:Scope_1:RMS2");
    tcaMonitor("val1");
    // pvNames.forEach((pvName: string) => {
        // tcaMonitor(pvName);
    // })
// });

// setTimeout(() => {
    // console.log("Terminate program");
    // context.terminate();
    // const channel = context.getChannelByName("val1");
    // pvNames.forEach((pvName: string) => {
    //     const channelTmp = context.getChannelByName(pvName);
    //     console.log(`${pvName} state`, channelTmp?.getStateStr());
    // })
    // channel?.destroySoft();
    // context.destroyHard();
// }, 3 * 1000)

// setTimeout(() => {
//     channel?.get().then((value: any) => console.log(value));
// }, 5*1000)

// todo: timeout for TCPTransoprt that has no channel attached
// todo: destroy TCPTransoprt if the CA_PROTO_ECHO has no response

// ------------------------- websocket -----------------------------


// import { WSServer } from "../WebSocket";

// let a = new WSServer();


// setInterval(() => {
//     // console.log(a.getAllMonitorStatus())
//     console.log(a.getMonitorStatusByName("val1"))
// }, 1000)

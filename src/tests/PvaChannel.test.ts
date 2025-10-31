import { ChannelMonitor } from "../Channel/ChannelMonitor";
import { Context } from "../Context/Context"
import { Environment } from "../Global/Environment";


// describe("PVA channel", () => {
//     it("print env -- inspect the PVA related entries", () => {
//         const context = new Context();
//         context.getEnvInstance().printAllEnvPretty();
//         context.destroyHard();
//     })    

//     it("Context initialize and get", (done: jest.DoneCallback) => {
//         const context = new Context();
//         context.initialize().then(async () => {
//             const channel = await context.createChannel("val1", "pva");
//             await channel?.getPva();
//             console.log(channel?.getPvaData());
//         }).catch((e) => {
//             console.log(e)
//         })

//         setTimeout(() => {
//             context.destroyHard();
//             done();
//         }, 1000);
//     })


//     it("Context initialize and put", (done: jest.DoneCallback) => {
//         const context = new Context();
//         context.initialize().then(async () => {
//             const channel = await context.createChannel("val1", "pva");
//             // await channel?.putPva([100, 101, 105],[1]);
//             // limit high
//             await channel?.putPva({value: 22},[1]);
//             console.log("result", await channel?.getPva());
//         }).catch((e) => {
//             console.log(e)
//         })

//         setTimeout(() => {
//             context.destroyHard();
//             done();
//         }, 1000);
//     })


//     it("PVA server not working -- Context initialize and GET-THE-LAST-PUT", (done: jest.DoneCallback) => {
//         const context = new Context();
//         context.initialize().then(async () => {
//             const channel = await context.createChannel("val1", "pva");
//             await channel?.putPva({value: 27.2});
//             setTimeout(async () => {
//                 const result = await channel?.getLastPutPva();
//                 console.log(result)
//             }, 300)

//         }).catch((e) => {
//             console.log(e)
//         })

//         setTimeout(() => {
//             context.destroyHard();
//             done();
//         }, 1000);
//     })


//     it("PVA server not working -- Context initialize and GET-THE-LAST-GET", (done: jest.DoneCallback) => {
//         const context = new Context();
//         context.initialize().then(async () => {
//             const channel = await context.createChannel("val1", "pva");
//             await channel?.getPva();
//             setTimeout(async () => {
//                 const result = await channel?.getLastGetPva();
//                 console.log(result)
//             }, 200);

//         }).catch((e) => {
//             console.log(e)
//         })

//         setTimeout(() => {
//             context.destroyHard();
//             done();
//         }, 1000);
//     })

//     it("Create a monitor and monitor data", (done: jest.DoneCallback) => {
//         const context = new Context();
//         context.initialize().then(async () => {
//             const channel = await context.createChannel("val1", "pva");
//             const monitor = await channel?.createMonitorPva(undefined, (monitor: ChannelMonitor) => {
//                 console.log("pva monitor", channel.getPvaData())
//             });
//         }).catch((e) => {
//             console.log(e)
//         })

//         setTimeout(() => {
//             context.destroyHard();
//             done();
//         }, 1000);
//     })

//     it("Create a monitor and monitor data, then pause it", (done: jest.DoneCallback) => {
//         const context = new Context();
//         context.initialize().then(async () => {
//             const channel = await context.createChannel("val1", "pva");
//             const monitor = await channel?.createMonitorPva(undefined, (monitor: ChannelMonitor) => {
//                 console.log("pva monitor", channel.getPvaData())
//             });

//             setTimeout(() => {
//                 monitor?.pause();
//             }, 1000)
//         }).catch((e) => {
//             console.log(e)
//         })

//         setTimeout(() => {
//             context.destroyHard();
//             done();
//         }, 3000);
//     })


//     it("Create a monitor and monitor data, then pause and resume it", (done: jest.DoneCallback) => {
//         const context = new Context();
//         context.initialize().then(async () => {
//             const channel = await context.createChannel("val1", "pva");
//             const monitor = await channel?.createMonitorPva(undefined, (monitor: ChannelMonitor) => {
//                 console.log("pva monitor", channel.getPvaData())
//             });

//             setTimeout(() => {
//                 monitor?.pause();
//             }, 1000)

//             setTimeout(() => {
//                 monitor?.resume();
//             }, 2000)
//         }).catch((e) => {
//             console.log(e)
//         })

//         setTimeout(() => {
//             context.destroyHard();
//             done();
//         }, 3000);
//     })


//     it("PVA server not implementd -- Create a monitor and monitor data, then pause and resume it", (done: jest.DoneCallback) => {
//         const context = new Context();
//         context.initialize().then(async () => {
//             const channel = await context.createChannel("valwf1", "pva");
//             const result = await channel?.getPvaArray(0, 2);
//             console.log("------------ result", result);

//         }).catch((e) => {
//             console.log(e)
//         })

//         setTimeout(() => {
//             context.destroyHard();
//             done();
//         }, 1000);
//     })

//     it("pva beacon, list the beacons", (done: jest.DoneCallback) => {
//         const context = new Context();
//         context.setBeaconAnomalyCallback(() => {
//             console.log("we got a new beacon");
//         })
//         context.initialize().then(async () => {
//             // const channel = await context.createChannel("val1", "pva");
//         })

//         setTimeout(() => {
//             context.destroyHard();
//             done();
//         }, 5000)
//     })


//     it("process pva channel", (done: jest.DoneCallback) => {
//         const context = new Context();

//         context.initialize().then(async () => {
//             const channel = await context.createChannel("val9999", "pva");
//             // result1 and result2 are different
//             // val9999 increase by 1 every time it is processed
//             const result1 = await channel?.getPva();
//             console.log(result1);
//             await channel?.processPva();
//             const result2 = await channel?.getPva();
//             console.log(result2);
//         })

//         setTimeout(() => {
//             context.destroyHard();
//             done();
//         }, 1000)
//     })



//     it("get channel instrospection type -- all fields", (done: jest.DoneCallback) => {
//         const context = new Context();

//         context.initialize().then(async () => {
//             const channel = await context.createChannel("val1", "pva");
//             const result = await channel?.getPvaType();
//             console.log(result);
//         })

//         setTimeout(() => {
//             context.destroyHard();
//             done();
//         }, 1000)
//     })


//     it("get channel instrospection type -- timeStamp field, always return the full type", (done: jest.DoneCallback) => {
//         const context = new Context();

//         context.initialize().then(async () => {
//             const channel = await context.createChannel("val1", "pva");
//             const result = await channel?.getPvaType("timeStampaa");
//             console.log(result);
//         })

//         setTimeout(() => {
//             context.destroyHard();
//             done();
//         }, 1000)
//     })


// })

// const context = new Context({}, 0);
// context.initialize().then(async () => {
//     // const channel = await context.createChannel("neutrons", "pva");
//     const channel = await context.createChannel("testNDArray", "pva");
//     // const channel = await context.createChannel("demo:count", "pva");
//     console.log(JSON.stringify(channel?.getPvaType(), null, 4))
//     // await channel?.putPva("display.precision", [3]);
//     setTimeout(async () => {
//         const result = await channel?.getPva(undefined);
//         console.log(result)
//     }, 3000)

// }).catch((e) => {
//     console.log(e)
// })


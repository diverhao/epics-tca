import { Context } from "./Context";
import { Channel } from "./Channel";



// a.createChannel("val2").then((result: Channel|null) => {
//     return result?.get();
// }).then((value: any) => {
//     console.log(value);
//     a.terminate();
// }).catch((e) => {
//     console.log("--------------------------")
// });

// timeout: second
async function tscaGet(name: string, timeout: number = 5) {

    let context = new Context();
    await context.initialize();

    let timeoutCounter = setTimeout(() => {
        context.terminate();
    }, timeout * 1000);

    // let channel = await context.createChannel(name);
    // let channel2 = await context.createChannel("val3");

    let channel = await context.createChannel(name);
    // let channel2 = context.createChannel("val3");

    // let channels = await Promise.all([channel,]);

    let val = await channel?.get();
    // let val2 = channels[1]?.get();

    // let values = await Promise.all([val, ]);
    // return [await channel?.get(), await channel2?.get()];
    // let result = await channel2?.get();
    context.terminate();
    clearTimeout(timeoutCounter);
    return val;
}

tscaGet("val1988").then(console.log);


// a.createChannel("val3").then((channel: Channel) => {
//     return channel.get();
// }).then((value: any) => {
//     console.log(value);
// });

// console.log("++++++++++++++++++++++++++++++++");
// import { Socket, createSocket } from "dgram";

// let socket = createSocket('udp4', () => {
//     console.log(` --- `);
// });

// socket.bind();
// // socket.on("message", () => {
// //     console.log("OK");
// // })


// setTimeout(() => {
//     socket.close();
// }, 2000);






// function fun1(val1: number = 33, val2: number = 34) { 
//     console.log("fun1", val1, val2);
// }

// fun1(undefined, 38);

// import { EventEmitter } from 'events';

// class MyEmitter extends EventEmitter {
//     constructor() {
//         super();
//         this.on("event1", () => {
//             console.log("event1 occured")
//         })
//     }
//  }

// const myEmitter = new MyEmitter();

// myEmitter.on('event', () => {
//     console.log('an event occurred!');
// });


// myEmitter.emit('event1');



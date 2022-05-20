import { Context } from "./Context";
import { Channel } from "./Channel";
import { epicsEnv } from ".";



// default timeout: 1 second
async function tscaGet(name: string, timeout: number = 1) {

    let context = new Context();
    // let timeoutCounter = setTimeout(() => {
    //     context.terminate();
    // }, timeout * 1000);

    await context.initialize();



    // do it sequentically
    // let channel1 = await context.createChannel(name);
    // let val1 = await channel?.get();
    // let channel2 = await context.createChannel("val3");
    // let val1 = await channel1?.get();
    // let val2 = await channel2?.get();

    let val1 = context.createChannel(name).then((channel) => {
        if (channel) {
            return channel.get();
        }
    });
    let val2 = context.createChannel("val3").then((channel) => {
        if (channel) {
            return channel.get();
        }
    });



    // let channel2 = context.createChannel("val3");
    // let vals = await Promise.all([val2, val1]);

    // let val2 = channels[1]?.get();

    let vals = await Promise.all([val1, val2]);
    // return [await channel?.get(), await channel2?.get()];
    // let result = await channel2?.get();
    context.terminate();
    // clearTimeout(timeoutCounter);
    // return [val1, val2];
    return vals;
}

tscaGet("val1988").then(console.log).then(() => console.log("hahahha"));


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



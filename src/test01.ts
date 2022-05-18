import { Context } from "./Context";
import { Channel } from "./Channel";

let a = new Context();

setTimeout(() => {
    a.terminate();
}, 5000);


a.createChannel("val2").then((result: Channel|null) => {
    return result?.get();
}).then((value: any) => {
    console.log(value);
}).catch((e) => {
    console.log("--------------------------")
});

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



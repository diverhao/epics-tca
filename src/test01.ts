import { Context } from "./Context";
import { Channel } from "./Channel";
import { epicsEnv } from ".";


// Usage: caget [options] <PV name> ...

//   -h: Help: Print this message
//   -V: Version: Show EPICS and CA versions
// Channel Access options:
//   -w <sec>: Wait time, specifies CA timeout, default is 1.000000 second(s)
//   -c: Asynchronous get (use ca_get_callback and wait for completion)
//   -p <prio>: CA priority (0-99, default 0=lowest)
// Format options:
//       Default output format is "name value"
//   -t: Terse mode - print only value, without name
//   -a: Wide mode "name timestamp value stat sevr" (read PVs as DBR_TIME_xxx)
//   -d <type>: Request specific dbr type; use string (DBR_ prefix may be omitted)
//       or number of one of the following types:
//  DBR_STRING     0  DBR_STS_FLOAT    9  DBR_TIME_LONG   19  DBR_CTRL_SHORT    29
//  DBR_INT        1  DBR_STS_ENUM    10  DBR_TIME_DOUBLE 20  DBR_CTRL_INT      29
//  DBR_SHORT      1  DBR_STS_CHAR    11  DBR_GR_STRING   21  DBR_CTRL_FLOAT    30
//  DBR_FLOAT      2  DBR_STS_LONG    12  DBR_GR_SHORT    22  DBR_CTRL_ENUM     31
//  DBR_ENUM       3  DBR_STS_DOUBLE  13  DBR_GR_INT      22  DBR_CTRL_CHAR     32
//  DBR_CHAR       4  DBR_TIME_STRING 14  DBR_GR_FLOAT    23  DBR_CTRL_LONG     33
//  DBR_LONG       5  DBR_TIME_INT    15  DBR_GR_ENUM     24  DBR_CTRL_DOUBLE   34
//  DBR_DOUBLE     6  DBR_TIME_SHORT  15  DBR_GR_CHAR     25  DBR_STSACK_STRING 37
//  DBR_STS_STRING 7  DBR_TIME_FLOAT  16  DBR_GR_LONG     26  DBR_CLASS_NAME    38
//  DBR_STS_SHORT  8  DBR_TIME_ENUM   17  DBR_GR_DOUBLE   27
//  DBR_STS_INT    8  DBR_TIME_CHAR   18  DBR_CTRL_STRING 28
// Enum format:
//   -n: Print DBF_ENUM value as number (default is enum string)
// Arrays: Value format: print number of requested values, then list of values
//   Default:    Print all values
//   -# <count>: Print first <count> elements of an array
//   -S:         Print array of char as a string (long string)
// Floating point type format:
//   Default: Use %g format
//   -e <nr>: Use %e format, with a precision of <nr> digits
//   -f <nr>: Use %f format, with a precision of <nr> digits
//   -g <nr>: Use %g format, with a precision of <nr> digits
//   -s:      Get value as string (honors server-side precision)
//   -lx:     Round to long integer and print as hex number
//   -lo:     Round to long integer and print as octal number
//   -lb:     Round to long integer and print as binary number
// Integer number format:
//   Default: Print as decimal number
//   -0x: Print as hex number
//   -0o: Print as octal number
//   -0b: Print as binary number
// Alternate output field separator:
//   -F <ofs>: Use <ofs> as an alternate output field separator

// Example: caget -a -f8 my_channel another_channel
//   (uses wide output format, doubles are printed as %f with precision of 8)

let t0 = Date.now();

const timeout: number = 10;

// default timeout: 1 second
async function tscaGet(...names: string[]) {

    let context = new Context();
    let timeoutCounter = setTimeout(() => {
        context.terminate();
    }, timeout * 1000);

    await context.initialize();


    let values = names.map((name: string) => {
        // return context.createChannel(name);
        return context.createChannel(name).then((channel) => {
            if (channel) {
                return channel.get();
            }
        })
    })
    let vals = await Promise.all(values);

    // let valuePromises: Promise<any>[] = [];
    // let channelPromises = names.map((name: string) => {
    //     return context.createChannel(name);
    // })
    // channelPromises.map((channelPromise: Promise<Channel | null>) => {
    //     channelPromise.then((channel: Channel | null) => {
    //         if (channel) {
    //             valuePromises.push(channel.get());
    //         }
    //     })
    // })
    // let vals = await Promise.all(valuePromises);

    // for (let name of names) {
    //     context.createChannel(name).then((channel: Channel | null) => {
    //         if (channel) {
    //             return channel.get();
    //         }
    //     }).then((result) => console.log(new Date(Date.now()).toISOString(), result));
    // }

    context.terminate();
    clearTimeout(timeoutCounter);
    return 0;
}



const pvNames = [];
for (let ii = 0; ii < 1999; ii++) {
    pvNames.push(`val${ii.toString()}`);
}

console.log(new Date(Date.now()).toISOString());

// tscaGet("val1988", "val1977", "val2").then(console.log);
tscaGet(...pvNames).then((result) => console.log(Date.now() - t0));

const util = require('util')
// console.log(util.inspect(pvNames, { maxArrayLength: null }))

// console.log(pvNames)
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



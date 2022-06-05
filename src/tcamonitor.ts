import { Context } from "./Context";
import { Channel } from "./Channel";
import { epicsEnv, DBR } from ".";
import { EventEmitter } from "events";

import { parentPort, workerData } from "worker_threads";

const npv = 2000;
let npvIdx = npv;

let allData: Record<string, any> = {}
let context = new Context();

console.log("----------------")

async function tcaMonitor(name: string) {
    let channel = await context.createChannel(name);
    // let monitor = await channel?.createMonitor(true, DBR.TIME_DOUBLE);
    // await monitor?.subscribe();
    // if (monitor?.eventName) {
    //     context.monitorEmitter.on(monitor?.eventName, (data: Record<string, any>) => {
    //         allData[monitor?.eventName as string] = data;
    //     });
    // }
    npvIdx = npvIdx - 1;
    if (npvIdx === 1) {
        console.log(name, performance.now());
    }
}


function sendAllData(allData: Record<string, any>) {
    // parentPort?.postMessage(allData);
    console.log(Object.keys(allData).length)
}

context.initialize().then(() => {
    for (let ii = 0; ii < 1; ii++) {
        const name = "val" + ii.toString();
        tcaMonitor(name);
    }
});

setTimeout(() => {
    console.log("A", performance.now());
    for (let ii = 1; ii < npv; ii++) {
        const name = "val" + ii.toString();
        tcaMonitor(name);
    }
}, 5000);

// setInterval(() => {
//     if (Object.keys(allData).length > 0) {
//         sendAllData(allData);
//         allData = {};
//     }
// }, 1 * 1000);



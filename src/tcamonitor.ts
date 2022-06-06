import { Context } from "./Context";
import { Channel } from "./Channel";
import { epicsEnv, DBR } from ".";
import { EventEmitter } from "events";

import { parentPort, workerData } from "worker_threads";

let timeA = -1000000;

const npv = 10000;
let npvIdx = npv;

let allData: Record<string, any> = {}
let context = new Context();

console.log("----------------", npv)

async function tcaMonitor(name: string) {
    let channel = await context.createChannel(name);
    let monitor = await channel?.createMonitor(true, DBR.TIME_DOUBLE);
    await monitor?.subscribe();
    if (monitor?.eventName) {
        context.monitorEmitter.on(monitor?.eventName, (data: Record<string, any>) => {
            allData[monitor?.eventName as string] = data;
        });
    }
    npvIdx = npvIdx - 1;
    if (npvIdx === 1) {
        console.log(name, performance.now() - timeA);
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
    timeA = performance.now();
    console.log("A", timeA);
    for (let ii = 1; ii < npv; ii++) {
        const name = "val" + ii.toString();
        tcaMonitor(name);
    }
}, 4000);

const sendAllDataTimer = setInterval(() => {
    if (Object.keys(allData).length > 0) {
        sendAllData(allData);
        allData = {};
    }
}, 1 * 1000);


setTimeout(() => {
    console.log("Terminate program");
    context.terminate();
    clearInterval(sendAllDataTimer);
}, 15000)

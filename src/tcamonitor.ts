import { Context } from "./Context";
import { Channel } from "./Channel";
import { epicsEnv } from ".";

let t0 = Date.now();

const timeout: number = 1000;

// default timeout: 1 second
async function tcaMonitor(name: string) {

    let context = new Context();

    setTimeout(() => {
        context.terminate();
    }, 1000 * 1000)

    await context.initialize();
    let channel = await context.createChannel(name);
    let monitor = await channel?.createMonitor();
    await monitor?.subscribe();
    let a = await channel?.get();
    console.log("----------", a);

}



// const pvNames = [];
// for (let ii = 0; ii < 1; ii++) {
//     pvNames.push(`valaaaa${ii.toString()}`);
// }
// for (let ii = 0; ii < 1999; ii++) {
//     pvNames.push(`valAA${ii.toString()}`);
// }


tcaMonitor("val1")

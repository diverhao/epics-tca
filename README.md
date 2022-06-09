# TypeScript Realization of EPICS Channel Access Client Liberary


## About

This is the TypeScript version [EPICS](https://epics-controls.org/) [Channale Acceess](https://epics.anl.gov/base/R3-14/12-docs/CAref.html) (CA) client library. It provides a TypeScript/JavaScript interface for an EPICS CA client communicating with CA servers.

This library complies the [CA protocol specifications](https://epics.anl.gov/base/R3-16/0-docs/CAproto/index.html). 


## Install

In your TypeScript/JavaScript project, run

```bash
npm install epics-tca
```


## Usage

### Get

Create a `.ts` file (e.g. `simpleGet.ts`) with following contents:

```typescript
import { Context } from "epics-tca";
async function simpleGet(name: string) {
    let channel = await context.createChannel(name);
    return await channel?.get();
}

let context = new Context();
context.initialize().then(() => {
    simpleGet("FE:Scope_1:RMS2").then((data: any) => {
        console.log("FE:Scope_1:RMS2", data.data);
        context.terminate();
    });
});
```

Run the transpiled `simpleGet.js` file, you will get the following result:

```
$ node simpleGet.js 
FE:Scope_1:RMS2 [ 2.2934632737106067 ]
```

### Put


Create a `.ts` file (e.g. `simplePut.ts`) with following contents:

```typescript
import { Context } from "epics-tca";
async function simplePut(name: string, value: number) {
    let channel = await context.createChannel(name);
    const value0 = await channel?.get();
    console.log("Before:", name, value0?.data);
    await channel?.put([value]);
    return await channel?.get();
}

let context = new Context();
context.initialize().then(() => {
    simplePut("val1", 9527).then((data: any) => {
        console.log("After: ", "val1", data.data);
        context.terminate();
    });
});
```


Run the transpiled `simplePut.js` file, you will get the following result:

```
$ node simplePut.js 
Before: val1 [ 2 ]
After:  val1 [ 9527 ]
```


### Monitor

Create a `.ts` file (e.g. `simpleMonitor.ts`) with following contents:

```typescript
import { Context } from "epics-tca";

async function tcaMonitor(name: string) {
    let channel = await context.createChannel(name);
    let monitor = await channel?.createMonitor(monitorListener);
    await monitor?.subscribe();
}
function monitorListener(monitor: ChannelMonitor) {
    console.log(monitor.name, ":", monitor.data.data);
}

let context = new Context();
context.initialize().then(() => {
    tcaMonitor("FE:Scope_1:RMS2");
});
setTimeout(() => {
    console.log("Terminate program");
    context.terminate();
}, 5 * 1000)
```

Run the transpiled `simpleMonitor.js` file, you will get the following result:

```
$ node simpleMonitor.js
FE:Scope_1:RMS2 : [ 2.296598922566252 ]
FE:Scope_1:RMS2 : [ 2.2929398313489786 ]
FE:Scope_1:RMS2 : [ 2.299754072515923 ]
FE:Scope_1:RMS2 : [ 2.298171626156998 ]
Terminate program
```

## Performance

Benefited from the asynchronous and event driven design of `Node.js`, the `EPICS TCA` can create EPICS channels efficiently. Below is the time used to create a batch of channels:

|Number of PVs| Time [seconds] |
|------|-------------|
|1000 |0.104 |
|2000 | 0.184 |
|5000 | 0.334 |
|10000 | 0.603 |
|15000 | 0.728 |
|20000 | 0.923 |
|25000 | 1.318 |
|30000 | 1.553 |
|35000 | 2.032 |
|40000 | 2.432 |
|45000 | 2.748 |
|50000 | 3.082 |
|60000 | 3.727 |
|80000 | 5.583 |
|100000 | 9.095 |

Each channel updates once every second. During the test, after the channels are created, the test program monitors the updates. For 100000 channels, the memory usage is about 450 MB when they are monitored, and the CPU usage is about 50% on a 2.3 GHz Intel Core i9-9880H processor with MacOS 12.4.

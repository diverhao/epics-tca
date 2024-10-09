/**
 * It should be running in a worker thread. 
 * 
 * If the CA client detects there is no CA repeater running, it should run this CA repeater in a separate thread.
 */

import { CARepeater } from "./CARepeater";
import { workerData, parentPort } from "worker_threads";

let port = workerData["port"];
if (port === undefined) {
    port = 5065;
}

const repeater = new CARepeater(port);
repeater.run();

parentPort?.on("message", (message: string) => {
    if (`${message}` === "quit") {
        repeater.quit();
    }
})
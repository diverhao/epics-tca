import { CARepeater } from "./CARepeater";
import { workerData } from "worker_threads";

let port = workerData["port"];
if (port === undefined) {
    port = 5065;
}

const repeater = new CARepeater(port);
repeater.run();

import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:8080");

ws.on("open", () => {
	console.log("opened");
    // setInterval(() => {
    //     ws.send("GET val1 -d DBR_CTRL_DOUBLE");
    // }, 1000)
	// ws.send("MONITOR val1 -d DBR_CTRL_DOUBLE");
	// ws.send("MONITOR val1");
    // setTimeout(() => {
    //     ws.send("CLOSE_MONITOR 1");
    // }, 5000)
    // setTimeout(() => {
    //     ws.send("MONITOR val1");
    // }, 10* 1000)
    // setTimeout(() => {
    //     ws.send("CLOSE_CHANNEL val1");
    // }, 15*1000)
    ws.send("MONITOR val1");
    // ws.send("MONITOR val3 -d DBR_CTRL_DOUBLE");
    // setTimeout(() => {
    //     ws.send("CLOSE_ALL_MONITORS");
    // }, 10000)
});

ws.on('message', (data) => {
  console.log('received: %s', JSON.parse(data.toString()));
});


import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:8080");

ws.on("open", () => {
	console.log("opened");
	// ws.send("WS_PROTO_GET-val1");
	ws.send("WS_PROTO_CREATE_MONITOR-val1-DBR_TIME_DOUBLE");
});

ws.on('message', (data) => {
  console.log('received: %s', JSON.parse(data.toString()));
});


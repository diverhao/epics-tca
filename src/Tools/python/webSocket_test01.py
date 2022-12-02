import websocket
import rel
import json

def on_message(ws, message):
    data = json.loads(message)
    print(data)

def on_error(ws, error):
    print(error)

def on_close(ws, close_status_code, close_msg):
    ws.send("CLOSE_ALL_MONITORS")
    print("### closed ###")

def on_open(ws):
    print("Opened connection")
    ws.send("MONITOR val1")



if __name__ == "__main__":
    ws = websocket.WebSocketApp("ws://localhost:8080",
                                on_open=on_open,
                                on_message=on_message,
                                on_error=on_error,
                                on_close=on_close)

    ws.run_forever(dispatcher=rel, reconnect=5)  # Set dispatcher to automatic reconnection, 5 second reconnect delay if connection closed unexpectedly
    rel.signal(2, rel.abort)  # Keyboard Interrupt
    rel.dispatch()


import { CARepeater, type_udp_message_info } from "../CARepeater/CARepeater";
import { Environment } from "../Global/Environment";
import { Socket, createSocket } from "dgram";
// import { Constants } from "../Global/Constants";
import { generateCAHeader, GlobalMethods } from "../Global/GlobalMethods";
import { CA_COMMANDS } from "../Global/Constants";
import { ipString2Int } from "../Global/GlobalMethods";
import { CA_MSG_HEADER_SIZE } from "../Global/Constants";
import { CA_MSG_HEADER_OFFSETS } from "../Global/Constants";
import { CA_MESSAGE_HEADER_SIZE } from "../Global/Constants";

/**
 * Set environment variables at the very beginning
 */
Environment.getInstance({
    EPICS_CA_REPEATER_CLIENT_CHECK_TIME: "3",
});

/**
 * A dummy CA repeater client for this test
 */
class CARepeaterClient {
    socket: Socket | undefined = undefined;
    // dummy socket that binds 5065
    socket5065: Socket | undefined = undefined;
    repeaterPort: number;
    CA_REPEATER_CONFIRM_count = 0;
    CA_PROTO_RSRV_IS_UP_msgs: Buffer[] = [];
    constructor(repeaterPort: number = 5065) {
        this.repeaterPort = repeaterPort;
    }

    createAndBindSocket = () => {
        const socket = createSocket({
            type: "udp4",
            reuseAddr: true,
        });
        socket.bind();
        // on bind success
        socket.on("connect", () => {
        });
        socket.on("message", (msg: Buffer, info: type_udp_message_info) => {
            // printMsg(msg, info, "Received UDP");
            if (info.size >= CA_MSG_HEADER_SIZE) {
                const command: number = msg.readInt16BE(CA_MSG_HEADER_OFFSETS.command);
                if (command === CA_COMMANDS.CA_REPEATER_CONFIRM) {
                    this.handle_CA_REPEATER_CONFIRM(msg, info);
                } else if (command === CA_COMMANDS.CA_PROTO_RSRV_IS_UP) {
                    this.handle_CA_PROTO_RSRV_IS_UP(msg, info);
                } else {
                    GlobalMethods.infoLog(`The above message is neither CA_REPEATER_REGISTER nor CA_PROTO_RSRV_IS_UP, skip.`);
                }
            }
        })
        // catch any error in the test
        socket.on("error", () => { })
        this.socket = socket;
    }

    send_CA_REPEATER_REGISTER_msg = () => {

        let msg: Buffer = Buffer.alloc(CA_MESSAGE_HEADER_SIZE);
        const addrInt = ipString2Int("127.0.0.1");
        if (addrInt === undefined) {
            return;
        }
        generateCAHeader(
            msg,
            0,
            CA_COMMANDS.CA_REPEATER_REGISTER, //0x18
            0, // reserved
            0, // reserved
            0, // reserved
            0, // reserved
            addrInt
        ); // 127.0.0.1
        this.socket?.send(msg, this.repeaterPort, "127.0.0.1");
    }

    handle_CA_REPEATER_CONFIRM = (msg: Buffer, info: type_udp_message_info) => {
        this.CA_REPEATER_CONFIRM_count++;
    }

    handle_CA_PROTO_RSRV_IS_UP = (msg: Buffer, info: type_udp_message_info) => {
        this.CA_PROTO_RSRV_IS_UP_msgs.push(msg);
    }

    quit = () => {
        // Socket.close() throws an exception if the socket is already closed
        try {
            this.socket?.close();
        } catch (e) { }
        try {
            this.socket5065?.close();
        } catch (e) { }
        this.socket = undefined;
        this.socket5065 = undefined;
    }

    bind5065 = () => {
        const socket = createSocket({
            type: "udp4",
            reuseAddr: true,
        });
        socket.bind({
            port: this.repeaterPort,
        });
        socket.on("error", () => { })
        this.socket5065 = socket;
    }

    unbind5065 = () => {
        this.socket5065?.close();
    }
}


/**
 * A dummy CA server sending out beacon periodically
 */

class CAServer {
    socket: Socket | undefined = undefined;
    constructor() { }

    createAndBindSocket = () => {
        const socket = createSocket({
            type: "udp4",
            reuseAddr: true,
        });
        socket.bind();
        // on bind success
        socket.on("connect", () => {
        });
        socket.on("message", () => {
        })
        // catch any error in the test
        socket.on("error", () => { })
        this.socket = socket;
    }

    send_CA_PROTO_RSRV_IS_UP = () => {
        let msg: Buffer = Buffer.alloc(CA_MESSAGE_HEADER_SIZE);
        const addrInt = ipString2Int("1.2.3.4");
        if (addrInt === undefined) {
            return;
        }
        generateCAHeader(
            msg,
            0,
            CA_COMMANDS.CA_PROTO_RSRV_IS_UP, //0x0d
            0, // reserved
            0x0d, // CA version
            2288, // tcp port, any number, I don't care
            33, // beacon ID, any number
            addrInt, // IOC IP, but it will be modified by the CA repeater 
        );
        const repeaterPort = Environment.getInstance().getEnv("EPICS_CA_REPEATER_PORT");
        if (typeof repeaterPort === "number") {
            try {
                this.socket?.send(msg, repeaterPort, "127.0.0.1");
            } catch (e) {
                GlobalMethods.errorLog(e);
            }
        }
    }

    quit = () => {
        try {
            this.socket?.close();
        } catch (e) { }
        this.socket = undefined;
    }
}


describe("CA Repeater", () => {

    it("make sure 5065 port is not occupied for this test", (done: jest.DoneCallback) => {
        // note: make sure environment is clean: 5065 port is not used
        CARepeater.portIsBoundInUDP(5065).then((repeaterPortIsBound) => {
            expect(repeaterPortIsBound).toBe(false);
            done();
        })
    })

    it("if 5065 port is occupied", (done: jest.DoneCallback) => {
        const client = new CARepeaterClient();
        client.bind5065();
        setTimeout(() => {
            CARepeater.portIsBoundInUDP(5065).then((repeaterPortIsBound) => {
                expect(repeaterPortIsBound).toBe(true);
                // must clean up
                client.quit();
                done();
            })
        }, 500);
    })


    it("5065 port is occupied, we cannot run CA repeater, repeater's socket is undefined", (done: jest.DoneCallback) => {
        const client = new CARepeaterClient();
        client.bind5065();
        setTimeout(() => {
            // try to start the CA repeater
            const repeater = new CARepeater();
            repeater.run().then(() => {
                const repeaterSocket = repeater.socket;
                expect(repeaterSocket).toBe(undefined);
                // must clean up
                client.quit();
                done();
            });
        }, 500);
    })


    it("should not start a second CA repeater", (done: jest.DoneCallback) => {
        // try to start the CA repeater
        const repeater = new CARepeater();
        repeater.run().then(() => {
            const repeater2 = new CARepeater();
            repeater2.run().then(() => {
                const socket2 = repeater2.socket;
                // socket2 is undefined, it means the repeater2 is not started
                expect(socket2).toBe(undefined);
                // must clean up
                repeater.quit();
                // we don't even need to run quit() for repeater2 as nothing is started in it
                // repeater2.quit();
                done();
            })
        })
    })


    it("start CA repeater normally, repeater's socket is a Socket object", (done: jest.DoneCallback) => {
        // try to start the CA repeater
        const repeater = new CARepeater();
        repeater.run().then(() => {
            const repeaterSocket = repeater.socket;
            expect(repeaterSocket instanceof Socket).toBe(true);
            // must clean up
            repeater.quit();
            done();
        })
    })

    it("start CA repeater normally, CARepater.socket is bound to 0.0.0.0:5065", (done: jest.DoneCallback) => {
        // try to start the CA repeater
        const repeater = new CARepeater();
        repeater.run().then(() => {
            // the bind does not finished immediately, we must wait
            setTimeout(() => {
                const repeaterSocket = repeater.socket;
                if (repeaterSocket !== undefined) {
                    const { address, family, port } = repeaterSocket.address();
                    // binds to all interfaces
                    expect([address, family, port]).toEqual(["0.0.0.0", "IPv4", 5065]);
                    // must clean up
                    repeater.quit();
                    done();
                }
            }, 500)
        })
    })

    it("send CA_REPEATER_REGISTER, register a client CA repeater", (done: jest.DoneCallback) => {
        // try to start the CA repeater
        const repeater = new CARepeater();
        repeater.run().then(() => {
            // the bind of repeater.socket does not finished immediately, we must wait
            setTimeout(() => {
                // a dummy client
                const dummyClient = new CARepeaterClient(5065);
                // bind the socket
                dummyClient.createAndBindSocket();
                // it takes time to bind the socket
                setTimeout(() => {
                    // send out message
                    dummyClient.send_CA_REPEATER_REGISTER_msg();
                    // it takes time to receive the message
                    setTimeout(() => {
                        const numClients = repeater.clients.length;
                        expect(numClients).toBe(1);
                        // must clean up
                        repeater.quit();
                        dummyClient.quit();
                        done();
                    }, 500);
                }, 500);
            }, 500)
        })
    })

    it("the client in CA repeater has address 127.0.0.1 and a random port", (done: jest.DoneCallback) => {
        // try to start the CA repeater
        const repeater = new CARepeater();
        repeater.run().then(() => {
            // the bind of repeater.socket does not finished immediately, we must wait
            setTimeout(() => {
                // a dummy client
                const dummyClient = new CARepeaterClient(5065);
                // bind the socket
                dummyClient.createAndBindSocket();
                // it takes time to bind the socket
                setTimeout(() => {
                    // send out message
                    dummyClient.send_CA_REPEATER_REGISTER_msg();
                    // it takes time to receive the message
                    setTimeout(() => {
                        const client = repeater.clients[0];
                        const clientAddress = client.clientAddress;
                        const clientPort = client.clientPort;
                        expect([clientAddress, typeof clientPort]).toEqual(["127.0.0.1", "number"]);
                        // must clean up
                        repeater.quit();
                        dummyClient.quit();
                        done();
                    }, 500);
                }, 500);
            }, 500)
        })
    })


    it("multiple clients registered", (done: jest.DoneCallback) => {
        // try to start the CA repeater
        const repeater = new CARepeater();
        repeater.run().then(() => {
            // the bind of repeater.socket does not finished immediately, we must wait
            setTimeout(() => {
                // 2 dummy clients
                const dummyClient1 = new CARepeaterClient(5065);
                const dummyClient2 = new CARepeaterClient(5065);
                // bind the sockets
                dummyClient1.createAndBindSocket();
                dummyClient2.createAndBindSocket();
                // it takes time to bind the socket
                setTimeout(() => {
                    // send out message
                    dummyClient1.send_CA_REPEATER_REGISTER_msg();
                    dummyClient2.send_CA_REPEATER_REGISTER_msg();
                    // it takes time to receive the message
                    setTimeout(() => {
                        const client1 = repeater.clients[0];
                        const client2 = repeater.clients[1];
                        const numberOfClients = repeater.clients.length;
                        const client1Address = client1.clientAddress;
                        const client1Port = client1.clientPort;
                        const client2Address = client2.clientAddress;
                        const client2Port = client2.clientPort;
                        expect([numberOfClients, client1Address, typeof client1Port, client2Address, typeof client2Port])
                            .toEqual([2, "127.0.0.1", "number", "127.0.0.1", "number"]);
                        // must clean up
                        repeater.quit();
                        dummyClient1.quit();
                        dummyClient2.quit();
                        done();
                    }, 500);
                }, 500);
            }, 500)
        })
    })

    it("client sends CA_REPEATER_REGISTER, then get CA_REPEATER_CONFIRM", (done: jest.DoneCallback) => {
        // try to start the CA repeater
        const repeater = new CARepeater();
        repeater.run().then(() => {
            // the bind of repeater.socket does not finished immediately, we must wait
            setTimeout(() => {
                // 1 dummy clients
                const dummyClient = new CARepeaterClient(5065);
                // bind the sockets
                dummyClient.createAndBindSocket();
                // it takes time to bind the socket
                setTimeout(() => {
                    // send out message
                    dummyClient.send_CA_REPEATER_REGISTER_msg();
                    // it takes time to receive the message
                    setTimeout(() => {
                        const client = repeater.clients[0];
                        const numberOfClients = repeater.clients.length;
                        const clientAddress = client.clientAddress;
                        const clientPort = client.clientPort;
                        expect([dummyClient.CA_REPEATER_CONFIRM_count, numberOfClients, clientAddress, typeof clientPort])
                            .toEqual([1, 1, "127.0.0.1", "number"]);
                        // must clean up
                        repeater.quit();
                        dummyClient.quit();
                        done();
                    }, 500);
                }, 500);
            }, 500)
        })
    })

    it("the CARepeaterClient.socket is bound to non-wildcard address", (done: jest.DoneCallback) => {
        // try to start the CA repeater
        const repeater = new CARepeater();
        repeater.run().then(() => {
            // the bind does not finished immediately, we must wait
            setTimeout(() => {
                // a dummy client
                const dummyClient = new CARepeaterClient(5065);
                // bind the socket
                dummyClient.createAndBindSocket();
                // it takes time to bind the socket
                setTimeout(() => {
                    // send out message
                    dummyClient.send_CA_REPEATER_REGISTER_msg();
                    // it takes time to receive the message
                    setTimeout(() => {
                        const client = repeater.clients[0];
                        const clientSocket = client.socket;
                        if (clientSocket !== undefined) {
                            const { address, family, port } = clientSocket.address();
                            expect(address).not.toBe("0.0.0.0");
                            // must clean up
                            repeater.quit();
                            dummyClient.quit();
                            done();
                        }
                    }, 500);
                }, 500);
            }, 500)
        })
    })

    it("check client is alive: register a client, then let it survive through the first alive check", (done: jest.DoneCallback) => {
        // try to start the CA repeater
        const repeater = new CARepeater();
        repeater.run().then(() => {
            // the bind of repeater.socket does not finished immediately, we must wait
            setTimeout(() => {
                // a dummy client
                const dummyClient = new CARepeaterClient(5065);
                // bind the socket
                dummyClient.createAndBindSocket();
                // it takes time to bind the socket
                setTimeout(() => {
                    // send out message
                    dummyClient.send_CA_REPEATER_REGISTER_msg();
                    // it takes time to receive the message
                    setTimeout(() => {
                        const numberOfClients = repeater.clients.length;
                        expect(numberOfClients).toBe(1);
                        // must clean up
                        repeater.quit();
                        dummyClient.quit();
                        done();
                    }, 3000)
                }, 500);
            }, 500)
        })
    })


    it("check client is alive: register a client, then remove it before the first alive check", (done: jest.DoneCallback) => {
        // try to start the CA repeater
        const repeater = new CARepeater();
        repeater.run().then(() => {
            // the bind of repeater.socket does not finished immediately, we must wait
            setTimeout(() => {
                // a dummy client
                const dummyClient = new CARepeaterClient(5065);
                // bind the socket
                dummyClient.createAndBindSocket();
                // it takes time to bind the socket
                setTimeout(() => {
                    // send out message
                    dummyClient.send_CA_REPEATER_REGISTER_msg();
                    // it takes time to receive the message
                    setTimeout(() => {
                        dummyClient.quit();
                        setTimeout(() => {
                            const numberOfClients = repeater.clients.length;
                            expect(numberOfClients).toBe(0);
                            // must clean up
                            repeater.quit();
                            dummyClient.quit();
                            done();
                        }, 3000)
                    }, 500);
                }, 500);
            }, 500)
        })
    })

    it("send beacon to 5065 port, the clients should receive the beacon", (done: jest.DoneCallback) => {
        // try to start the CA repeater
        const repeater = new CARepeater();
        repeater.run().then(() => {
            // the bind of repeater.socket does not finished immediately, we must wait
            setTimeout(() => {
                // a dummy IOC
                const dummyIOC = new CAServer();;
                // a dummy client
                const dummyClient = new CARepeaterClient(5065);
                // bind the sockets
                dummyIOC.createAndBindSocket();
                dummyClient.createAndBindSocket();
                // it takes time to bind the socket
                setTimeout(() => {
                    // register the client
                    dummyClient.send_CA_REPEATER_REGISTER_msg();
                    // it takes time to receive the message
                    setTimeout(() => {
                        // dummy IOC sends out the CA_PROTO_RSRV_IS_UP to CA repeater
                        dummyIOC.send_CA_PROTO_RSRV_IS_UP();
                        // it takes time to receive and forward the CA_PROTO_RSRV_IS_UP message
                        setTimeout(() => {
                            const messageReceived = dummyClient.CA_PROTO_RSRV_IS_UP_msgs[0];
                            // the IOC address is modified by the CA repeater
                            expect(messageReceived.toJSON().data).toEqual([0x00, 0x0d, 0x00, 0x00, 0x00, 0x0d, 0x08, 0xf0, 0x00, 0x00, 0x00, 0x21, 0x7f, 0x00, 0x00, 0x01]);
                            // must clean up
                            repeater.quit();
                            dummyClient.quit();
                            dummyIOC.quit();
                            done();
                        }, 500)
                    }, 500);
                }, 500);
            }, 500)
        })
    })
})
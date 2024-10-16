import { Context } from "../Context/Context";
import { Context_STATES } from "../Context/Context";
import { createSocket } from "dgram";
import { UDPTransport } from "../UDPTransport/UDPTransport";

/**
 * 5065 port must not be used before this test
 * 
 * no IOC should be running
 * 
 * This test takes about 10 s
 */

describe("Context", () => {

    describe("prepare", () => {
        it("5065 port must not be used before this test", (done: jest.DoneCallback) => {
            UDPTransport.portIsBoundInUDP(5065).then((portIsBound: boolean) => {
                expect(portIsBound).toBe(false);
                done();
            })
        })
    
    })

    describe("initialize", () => {
        it("Create context without initization, no destroyHard() needed, check context state", () => {
            const context = new Context();
            expect(context.getState()).toBe(Context_STATES.NOT_INITIALIZED);
        })

        it("Create context with initization, then destroyHard()", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(() => {
                setTimeout(() => {
                    context.destroyHard();
                }, 500)
                setTimeout(() => {
                    expect(context.getState()).toBe(Context_STATES.DESTROYED);
                    done();
                }, 1000)
            })
        })
    })

    describe("CA repeater", () => {


        it("Create context and initialize normally, check if port 5065 is occupied", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(() => {
                setTimeout(async () => {
                    const portIsBound = await UDPTransport.portIsBoundInUDP(5065);
                    expect(portIsBound).toBe(true);
                    context.destroyHard();
                    setTimeout(() => {
                        done();
                    }, 500)
                }, 1000)
            })
        })

        it("Bind 5065 first, then create context and initialize normally, the CA repeater process should not start before EPICS_CA_REPEATER_THREAD_CHECK_TIME", (done: jest.DoneCallback) => {
            const socket = createSocket({
                type: "udp4",
            });
            socket.bind(5065);
            const context = new Context(
                {
                    EPICS_CA_REPEATER_THREAD_CHECK_TIME: "20", // a long time
                }
            );
            setTimeout(async () => {
                // ca repeater thread should not start
                await context.initialize();
            }, 1000);

            // close the socket
            setTimeout(() => {
                socket.close();
            }, 1500);

            setTimeout(async () => {
                // 5065 port is not bound
                const portIsBound = await UDPTransport.portIsBoundInUDP(5065);
                context.destroyHard();
                expect(portIsBound).toBe(false);
                setTimeout(() => {
                    done();
                }, 500)
            }, 2000)
        })

        it("Bind 5065 first, then create context and initialize normally, the CA repeater process should start after EPICS_CA_REPEATER_THREAD_CHECK_TIME", (done: jest.DoneCallback) => {
            const socket = createSocket({
                type: "udp4",
            });
            socket.bind(5065);
            const context = new Context({
                EPICS_CA_REPEATER_THREAD_CHECK_TIME: "1", // a short time
            });
            setTimeout(async () => {
                // ca repeater thread should not start at this time
                await context.initialize();
            }, 1000);

            setTimeout(() => {
                // close the socket
                socket.close();
            }, 1500);

            // 1.5 s after the socket is close, the CA repeater thread should run
            setTimeout(async () => {
                // 5065 port is not bound
                const portIsBound = await UDPTransport.portIsBoundInUDP(5065);
                context.destroyHard();
                expect(portIsBound).toBe(true);
                setTimeout(() => {
                    done();
                }, 500)
            }, 3000)
        })


        it("after received CA_REPEATER_CONFIRM message, the interval register_to_CA_repeater in UDPTransport is cleared", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(() => {
                setTimeout(async () => {
                    // we should have received the CA_REPEATER_CONFIRM message
                    const intervals = context.getUdpTransport().getIntervals().intervals;
                    // interval is cleared
                    const interval = intervals["register_to_CA_repeater"];
                    expect(interval).toBe(undefined);
                    context.destroyHard();
                    setTimeout(() => {
                        done();
                    }, 500)
                }, 1200)
            })
        })

        // todo: check CA repeater

    })
}
);

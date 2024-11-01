
import { Context } from "../Context/Context";
import { UDPTransport, UDPTransportState } from "../UDPTransport/UDPTransport";


/**
 * Prepare: there should be an IOC running
 */

describe("UDPTransport", () => {

    it("create a UDPTransport object", (done: jest.DoneCallback) => {
        const context = new Context();
        context.initialize().then(() => {
            setTimeout(() => {
                const udpTransport = context.getUdpTransport();
                const state = udpTransport.getState();
                expect(state).toBe(UDPTransportState.INITIALIZED);
                context.destroyHard();
                done();
            }, 500)
        })
    })

    describe("network traffic statistics", () => {

        it("no channel, only CA repeater registration UDP packets", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(() => {
                setTimeout(() => {
                    const stats = context.getNetworkStats();
                    // no UDP or TCP traffic
                    expect(stats["udp"]["bytesReceivedInLastSecond"]).not.toBe(0);
                    expect(stats["udp"]["caMessagesReceivedInLastSecond"]).not.toBe(0);
                    expect(stats["udp"]["packetsReceivedInLastSecond"]).not.toBe(0);
                    expect(stats["udp"]["bytesSentInLastSecond"]).not.toBe(0);
                    expect(stats["udp"]["caMessagesSentInLastSecond"]).not.toBe(0);
                    expect(stats["udp"]["packetsSentInLastSecond"]).not.toBe(0);
                    expect(stats["udp"]["startTime"]).toBe(0); // first statistics
                    expect(stats["udp"]["endTime"]).not.toBe(0);
                    expect(Object.keys(stats["tcp"]).length).toBe(0); // no TCP
                    context.destroyHard();
                    done();
                }, 1100); // do it slightly after 1000 ms
            })
        })

        it("create non-existing channel, no TCP", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(() => {
                const channel = context.createChannel("valAAA7", "ca");
                setTimeout(() => {
                    const stats = context.getNetworkStats();
                    // no UDP or TCP traffic
                    expect(Object.keys(stats["tcp"]).length).toBe(0); // no TCP
                    context.destroyHard();
                    done();
                }, 1100); // do it slightly after 1000 ms
            })
        })

        it("create non-existing channel, several outgoing UDP search messages", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(() => {
                const channel = context.createChannel("valAAA7", "ca");
                setTimeout(() => {
                    const stats = context.getNetworkStats();
                    // no UDP or TCP traffic
                    expect(stats["udp"]["bytesSentInLastSecond"]).toBeGreaterThan(16);
                    expect(stats["udp"]["caMessagesSentInLastSecond"]).toBeGreaterThan(1);
                    expect(stats["udp"]["packetsSentInLastSecond"]).toBeGreaterThan(1);
                    expect(stats["udp"]["startTime"]).toBe(0); // first statistics
                    expect(stats["udp"]["endTime"]).not.toBe(0);
                    context.destroyHard();
                    done();
                }, 1100); // do it slightly after 1000 ms
            })
        })


        it("create and monitor existing 10 Hz channel, has TCP", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val1", "ca");
                channel?.createMonitor();
                setTimeout(() => {
                    const stats = context.getNetworkStats();
                    expect(Object.keys(stats["tcp"]).length).not.toBe(0);
                    context.destroyHard();
                    done();
                }, 2200); // do it slightly after 2000 ms
            })
        })

        it("create and monitor existing 10 Hz channel, has TCP", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val1", "ca");
                channel?.createMonitor();
                setTimeout(() => {
                    const stats = context.getNetworkStats();
                    expect(Object.values(stats["tcp"])[0]["caMessagesReceivedInLastSecond"]).toBeGreaterThan(5);
                    context.destroyHard();
                    done();
                }, 2200); // do it slightly after 2000 ms
            })
        })



    })



    // todo: calculate broadcast addresses

    // ! ----------- below tests are done only with human supervision ---------------

    it.skip("create a non-existing channel, then start an IOC to see if the channel re-search", (done: jest.DoneCallback) => {
        const context = new Context({}, "WARN");
        context.initialize().then(() => {
            context.createChannel("valAAA1", "ca");
            context.createChannel("valAAA2", "ca");
            context.createChannel("valAAA3", "ca");
            context.createChannel("valAAA4", "ca");
            context.createChannel("valAAA5", "ca");
            context.createChannel("valAAA6", "ca");
            context.createChannel("valAAA7", "ca");
            context.createChannel("valAAA8", "ca");
            context.createChannel("valAAA9", "ca");
            context.createChannel("valAAA10", "ca");
            setTimeout(() => {
                context.destroyHard();
                done();
            }, 19 * 1000)
        })
    })

    describe.skip("user-defined beacon anomaly callback", () => {

        it("there is no channel search restart", (done: jest.DoneCallback) => {
            const context = new Context();
            let count = 0;
            // user-defined beacon anomaly callback
            context.setBeaconAnomalyCallback(() => { count++ });
            context.initialize().then(() => {
                //! put an IOC online/offline couple of times, and observe the wireshark's 
                //! udp messages, filter: udp.port==5064 && not icmp && ip.addr == 127.0.0.1
                const channel = context.createChannel("valAAA7", "ca");
                setTimeout(() => {
                    expect(count).toBeGreaterThan(0);
                    context.destroyHard();
                    done();
                }, 10000)
            })
        })

        it("we can change the beacon anomaly callback after the Beacon is created", (done: jest.DoneCallback) => {
            const context = new Context();
            let count = 0;
            context.initialize().then(() => {
                //! put an IOC online/offline couple of times, and observe the wireshark's 
                //! udp messages, filter: udp.port==5064 && not icmp && ip.addr == 127.0.0.1
                const channel = context.createChannel("valAAA7", "ca");
                setTimeout(() => {
                    // user-defined beacon anomaly callback
                    context.setBeaconAnomalyCallback(() => { count++ });

                }, 5000)
                setTimeout(() => {
                    expect(count).toBeGreaterThan(0);
                    context.destroyHard();
                    done();
                }, 10000)
            })
        })

    })


}) 
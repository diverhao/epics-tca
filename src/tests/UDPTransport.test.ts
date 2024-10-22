
import { Context } from "../Context/Context";
import { UDPTransport, UDPTransportState } from "../UDPTransport/UDPTransport";


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


    // todo: calculate broadcast addresses

    // ! ----------- below tests are done only with human supervision ---------------

    it.skip("create a non-existing channel, then start an IOC to see if the channel re-search", (done: jest.DoneCallback) => {
        const context = new Context({}, "WARN");
        context.initialize().then(() => {
            context.createChannel("valAAA1");
            context.createChannel("valAAA2");
            context.createChannel("valAAA3");
            context.createChannel("valAAA4");
            context.createChannel("valAAA5");
            context.createChannel("valAAA6");
            context.createChannel("valAAA7");
            context.createChannel("valAAA8");
            context.createChannel("valAAA9");
            context.createChannel("valAAA10");
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
                const channel = context.createChannel("valAAA7");
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
                const channel = context.createChannel("valAAA7");
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
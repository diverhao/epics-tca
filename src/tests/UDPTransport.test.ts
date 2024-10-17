
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

}) 
import { Context, Context_STATES } from "../Context/Context";
import { ChannelMonitor } from "../Channel/ChannelMonitor";
import { CA_ALARM_SEVRITY, CA_ALARM_STATUS, Channel, Channel_DBR_TYPES } from "../Channel/Channel";
import { createServer, Socket } from "net";
import { isPowerOfTwo } from "../Global/GlobalMethods";
import { Environment } from "../Global/Environment";



describe("ChannelMonitor", () => {

    describe("prerequisite test", () => {
        it("Ensure there is an IOC running", (done: jest.DoneCallback) => {
            const server = createServer();
            // an IOC binds 5064 TCP port for all network interfaces
            server.listen(5064, "0.0.0.0");
            let result = false;
            server.on("error", () => {
                result = true;
            })
            setTimeout(() => {
                server.close();
                expect(result).toBe(true);
                done();
            }, 500);
        })
    })

    describe("Create and monitor", () => {
        it("create and subscribe a monitor", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val7");
                const monitor = await channel?.createMonitor();
                expect(monitor?.getStateStr()).toBe("SUBSCRIBED");
                context.destroyHard();
                done();
            })
        })
    })
})
import { Context, Context_STATES } from "../Context/Context";
import { ChannelMonitor } from "../Channel/ChannelMonitor";
import { CA_ALARM_SEVRITY, CA_ALARM_STATUS, Channel, Channel_DBR_TYPES, type_dbr_value, type_dbrData } from "../Channel/Channel";
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
        it("create and subscribe a monitor, check monitor state", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const monitor = await channel?.createMonitor();
                expect(monitor?.getStateStr()).toBe("SUBSCRIBED");
                context.destroyHard();
                done();
            })
        })

        it("create and subscribe a monitor, check the obtained value type", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const monitor = await channel?.createMonitor();
                const value = channel?.getValue();
                expect(typeof value).toBe("number");
                context.destroyHard();
                done();
            })
        })

        it("create and subscribe a monitor, change value, check the monitored value", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                // synchronous PUT, manually wait
                channel?.put(38.8);
                setTimeout(async () => {
                    const monitor = await channel?.createMonitor();
                    const value = channel?.getValue();
                    expect(value).toBe(38.8);
                    context.destroyHard();
                    done();
                }, 500)
            })
        })

        it("create and subscribe a monitor, change value twice, check the monitored values", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                // synchronous PUT, manually wait
                channel?.put(38.8);
                const values: (type_dbr_value | undefined)[] = [];
                setTimeout(async () => {
                    const monitor = await channel?.createMonitor();
                    const value = channel?.getValue();
                    values.push(value);
                    channel?.put(8.25);
                }, 500)

                setTimeout(() => {
                    const value = channel?.getValue();
                    values.push(value);
                    expect(values).toEqual([38.8, 8.25]);
                    context.destroyHard();
                    done();
                }, 1000)
            })
        })

        // todo: monitor different types, check types
        // todo: cancel monitor
        // todo: pause monitor
        // todo: resume monitor
        // todo: destroy soft
        // todo: re-subscribe
        
    })


})
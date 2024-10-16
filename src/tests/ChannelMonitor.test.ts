import { Context, Context_STATES } from "../Context/Context";
import { ChannelMonitor } from "../Channel/ChannelMonitor";
import { CA_ALARM_SEVRITY, CA_ALARM_STATUS, Channel, Channel_DBR_TYPES, ChannelMonitor_MASKS, type_dbr_value, type_dbrData } from "../Channel/Channel";
import { createServer, Socket } from "net";

/**
 * Must start the IOC from scratch for this test
 * 
 * This test takes about 11 s
 */

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

        it("monitor value changes -- use asynchronous PUT", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const values: (type_dbr_value | undefined)[] = [];
                // waitNotify = true
                await channel?.put(33.3, 1, true);
                await channel?.createMonitor()
                values.push(channel?.getValue());
                await channel?.put(44.4, 1, true);
                values.push(channel?.getValue());
                await channel?.put(-23.4, 1, true);
                values.push(channel?.getValue());
                expect(values).toEqual([33.3, 44.4, -23.4]);
                context.destroyHard();
                done();
            })

        })


        it("monitor value changes -- listener", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const values: (type_dbr_value | undefined)[] = [];
                // waitNotify = true
                await channel?.put(33.3, 1, true);
                await channel?.createMonitor(undefined,
                    // listener
                    (monitor: ChannelMonitor) => {
                        values.push(monitor.getChannel().getValue());
                    })
                await channel?.put(44.4, 1, true);
                await channel?.put(-23.4, 1, true);
                expect(values).toEqual([33.3, 44.4, -23.4]);
                context.destroyHard();
                done();
            })
        })

        it("monitor requests a different DBR type -- request DBR_STRING for DBR_DOUBLE", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const values: (type_dbr_value | undefined)[] = [];
                // waitNotify = true
                await channel?.put(33.3, 1, true);
                await channel?.createMonitor(undefined,
                    // listener
                    (monitor: ChannelMonitor) => {
                        values.push(monitor.getChannel().getValue());
                    },
                    Channel_DBR_TYPES.DBR_STRING,
                )
                await channel?.put(44.4, 1, true);
                await channel?.put(-23.4, 1, true);
                expect(values).toEqual(["33", "44", "-23"]); // round down
                context.destroyHard();
                done();
            })
        })

        it("monitor requests a different DBR type -- request DBR_CHAR for DBR_DOUBLE", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const values: (type_dbr_value | undefined)[] = [];
                // waitNotify = true
                await channel?.put(3333.3, 1, true);
                await channel?.createMonitor(undefined,
                    // listener
                    (monitor: ChannelMonitor) => {
                        values.push(monitor.getChannel().getValue());
                    },
                    Channel_DBR_TYPES.DBR_CHAR,
                )
                await channel?.put(4444.4, 1, true);
                await channel?.put(-2333.4, 1, true);
                expect(values).toEqual([5, 92, -29]); // round down
                context.destroyHard();
                done();
            })
        })

        it("monitor requests a different DBR type -- request DBR_GR_CHAR for DBR_DOUBLE", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const values: (type_dbr_value | undefined)[] = [];
                // waitNotify = true
                await channel?.put(3333.3, 1, true);
                await channel?.createMonitor(undefined,
                    undefined,
                    Channel_DBR_TYPES.DBR_GR_CHAR,
                )
                const lower_display_limit = channel?.getDbrMeta()["lower_display_limit"];
                expect(lower_display_limit).toEqual(-3); // round down
                context.destroyHard();
                done();
            })
        })
    })

    describe("ChannelMonitor lifecycle: pause/resume/soft destroy monitor", () => {
        it("pause monitor, we will not see the data change", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const monitor = await channel?.createMonitor();
                const value1 = channel?.getValue();
                monitor?.pause();
                await channel?.put(value1 as number + 20, undefined, true);
                // manual dealy so that the monitor can send the data back
                setTimeout(async () => {
                    const value2 = await channel?.getValue(); // does not receive the above PUT value
                    await channel?.get();
                    const value3 = channel?.getValue(); // the new value
                    expect(value1 === value2 && (value1 as number) + 20 === (value3 as number)).toBe(true);
                    context.destroyHard();
                    done();
                }, 300)
            })
        })

        it("pause and then resume monitor, we will see the data change", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const monitor = await channel?.createMonitor();
                const value1 = channel?.getValue();
                monitor?.pause();
                await channel?.put(value1 as number + 20, undefined, true);
                // manual dealy so that the monitor can send the data back
                setTimeout(async () => {
                    const value2 = await channel?.getValue(); // does not receive the above PUT value
                    monitor?.resume(); // after resume, IOC automatically sends the value
                    setTimeout(() => {
                        const value3 = channel?.getValue(); // the new value
                        expect(value1 === value2 && (value1 as number) + 20 === (value3 as number)).toBe(true);
                        context.destroyHard();
                        done();
                    }, 300);
                }, 300)
            })
        })

        it("pause once and then resume the monitor, PV is not changed during pause, no message sent from server", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                let count = 0;
                const monitor = await channel?.createMonitor(undefined, (monitor: ChannelMonitor) => {
                    count++;
                });
                monitor?.pause();
                // manual dealy so that the monitor can send the data back
                setTimeout(async () => {
                    // channel value is not change, IOC does not send a message
                    monitor?.resume();
                    setTimeout(() => {
                        expect(count).toBe(1);
                        context.destroyHard();
                        done();
                    }, 300);
                }, 300)
            })
        })

        it("pause once and then resume the monitor twice, PV is not changed during pause, no message sent from server", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                let count = 0;
                const monitor = await channel?.createMonitor(undefined, (monitor: ChannelMonitor) => {
                    count++;
                });
                monitor?.pause();
                // manual dealy so that the monitor can send the data back
                setTimeout(async () => {
                    // channel value is not change, IOC does not send a message
                    monitor?.resume();
                    monitor?.resume();
                    setTimeout(() => {
                        expect(count).toBe(1);
                        context.destroyHard();
                        done();
                    }, 300);
                }, 300)
            })
        })

        it("soft destroy the monitor, we will not see data change", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const monitor = await channel?.createMonitor();
                const value1 = channel?.getValue();
                monitor?.destroySoft();
                await channel?.put(value1 as number + 20, undefined, true);
                // manual dealy so that the monitor can send the data back
                setTimeout(async () => {
                    const value2 = channel?.getValue(); // does not receive the above PUT value
                    setTimeout(() => {
                        expect(value1 === value2).toBe(true);
                        context.destroyHard();
                        done();
                    }, 300);
                }, 300)
            })
        })

        it("soft destroy the monitor, then re-subscribe, we will not see data change", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const monitor = await channel?.createMonitor();
                const value1 = channel?.getValue();
                monitor?.destroySoft();
                await channel?.put(value1 as number + 20, undefined, true);
                // manual dealy so that the monitor can send the data back
                setTimeout(async () => {
                    // resubscribe
                    await monitor?.resubscribe();
                    const value2 = channel?.getValue(); // does not receive the above PUT value
                    setTimeout(() => {
                        expect(value1 as number + 20 === value2 as number).toBe(true);
                        context.destroyHard();
                        done();
                    }, 300);
                }, 300)
            })
        })

        it("hard destroy the monitor, we won't see any update", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const monitor = await channel?.createMonitor();
                const value1 = channel?.getValue();
                monitor?.destroyHard();
                await channel?.put(value1 as number + 20, undefined, true);
                // manual dealy so that the monitor can send the data back
                setTimeout(async () => {
                    const value2 = channel?.getValue(); // does not receive the above PUT value
                    setTimeout(() => {
                        expect(value1 === value2).toBe(true);
                        context.destroyHard();
                        done();
                    }, 300);
                }, 300)
            })
        })

        it("hard destroy the monitor, ChannelMonitor.resubscribe() does not re-subscribe", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const monitor = await channel?.createMonitor();
                const value1 = channel?.getValue();
                monitor?.destroyHard();
                await channel?.put(value1 as number + 20, undefined, true);
                // manual dealy so that the monitor can send the data back
                setTimeout(async () => {
                    // resubscribe
                    await monitor?.resubscribe();
                    const value2 = channel?.getValue(); // does not receive the above PUT value
                    setTimeout(() => {
                        expect(value1 === value2).toBe(true);
                        context.destroyHard();
                        done();
                    }, 300);
                }, 300)
            })
        })


        it("2 channels, each has 2 monitors, destory hard 1 monitor, all other monitors are not affected", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel1 = await context.createChannel("val2000");
                const channel2 = await context.createChannel("val2003");
                const monitor1A = await channel1?.createMonitor();
                const monitor1B = await channel1?.createMonitor();
                const monitor2A = await channel2?.createMonitor();
                const monitor2B = await channel2?.createMonitor();
                monitor1A?.destroyHard();

                const newVal1 = Math.random();
                const newVal2 = Math.random();
                channel1?.put(newVal1);
                channel2?.put(newVal2);

                setTimeout(async () => {
                    const val1 = channel1?.getValue();
                    const val2 = channel2?.getValue();
                    expect([val1, val2]).toEqual([newVal1, newVal2])
                    context.destroyHard();
                    done();
                }, 500)
            })
        })

        //todo: synchronously create 2 monitors at the same time
        //todo: 
        //todo: 2 channels, each has 2 monitors, destory soft 1 monitor for each channel
        //todo: 2 channels, each has 2 monitors, destory soft 2 monitors for one channel
        //todo: 2 channels, each has 2 monitors, destory soft 2 monitors for one channel, and 1 monitor for the other
        //todo: 2 channels, each has 2 monitors, destory soft all monitors

    })

    describe("monitor mask", () => {

        it("DBE_VALUE -- monitor when value changed", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                const monitor = await channel?.createMonitor(undefined, undefined, channel?.getDbrType_TIME(), channel?.getValueCount(), ChannelMonitor_MASKS.DBE_VALUE);
                const value1 = channel?.getValue();
                await channel?.put(value1 as number + 20, undefined, true);
                // manual dealy so that the monitor can send the data back
                setTimeout(async () => {
                    const value2 = channel?.getValue(); // does not receive the above PUT value
                    expect((value1 as number) + 20 === (value2 as number)).toBe(true);
                    context.destroyHard();
                    done();
                }, 300)
            })
        })

        it("DBE_VALUE -- monitor when PV property changed, we only change value, alarm not changed", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                await channel?.put(5000, undefined, true); // HIHI, MAJOR
                const monitor = await channel?.createMonitor(undefined, undefined, channel?.getDbrType_TIME(), channel?.getValueCount(), ChannelMonitor_MASKS.DBE_ALARM);
                const value1 = channel?.getValue();
                await channel?.put(value1 as number + 20, undefined, true); // still HIHI, MAJOR
                // manual dealy so that the monitor can send the data back
                setTimeout(async () => {
                    const value2 = channel?.getValue(); // alarm does not change
                    expect((value1 as number) === (value2 as number)).toBe(true);
                    context.destroyHard();
                    done();
                }, 300)
            })
        })

        it("DBE_ALARM -- monitor when PV alarm changed", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000");
                await channel?.put(5000, undefined, true); // HIHI, MAJOR
                const monitor = await channel?.createMonitor(undefined, undefined, channel?.getDbrType_TIME(), channel?.getValueCount(), ChannelMonitor_MASKS.DBE_ALARM);
                const value1 = channel?.getValue();
                await channel?.put(20, undefined, true); // NO_ALARM, NO_ALARM
                // manual delay so that the monitor can send the data back
                setTimeout(async () => {
                    const value2 = channel?.getValue(); // alarm changed to NO_ALARM/NO_ALARM
                    expect(value2).toBe(20);
                    context.destroyHard();
                    done();
                }, 300)
            })
        })

        it("DBE_PROPERTY -- monitor when HOPR is modified", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                let count = 0;
                const channel = await context.createChannel("val2000");
                const channelProp = await context.createChannel("val2000.HOPR");
                await channelProp?.get();
                const valueProp1 = channelProp?.getValue();
                // await channel?.put(5000, undefined, true); // HIHI, MAJOR
                const monitor = await channel?.createMonitor(undefined, (monitor: ChannelMonitor) => {
                    count++;
                }, channel?.getDbrType_TIME(), channel?.getValueCount(), ChannelMonitor_MASKS.DBE_ALARM);
                // const value1 = channel?.getValue();
                // await channel?.put(20, undefined, true); // NO_ALARM, NO_ALARM
                await channelProp?.put(valueProp1 as number + 20);
                // manual delay so that the monitor can send the data back
                setTimeout(async () => {
                    expect(count).toBe(1);
                    context.destroyHard();
                    done();
                }, 300)
            })
        })
    })


    // todo: creationTimeout
    // todo: ECA code
})
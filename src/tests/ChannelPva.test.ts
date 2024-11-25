import { Channel_STATES, PVA_STATUS_TYPE } from "../Channel/Channel";
import { ChannelMonitor } from "../Channel/ChannelMonitor";
import { Context } from "../Context/Context";
import { ENDIAN } from "../PvaData/PvaMethods";
import { PvRequest } from "../PvaData/PvRequest";


describe("ChannelPva.test", () => {
    describe.skip("Create a PVA channel", () => {
        it("create a channel, then destroy it", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val1", "pva", undefined);
                expect(channel?.getState()).toBe(Channel_STATES.CREATED)
            })

            setTimeout(() => {
                context.destroyHard();
                done();
            }, 1000)
        })

        it("create a non-existing channel, then destroy it", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = context.createChannel("val1aaa", "pva", undefined);
                setTimeout(() => {
                    const channel = context.getChannel("val1aaa");
                    expect(channel?.getState()).toBe(Channel_STATES.SEARCHING)
                    context.destroyHard();
                    done();
                }, 1000)
            })
        })


        it("create 1 channel twice synchronously, 2 channels should be the same", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                let channel1: any;
                let channel2: any;
                context.createChannel("val1", "pva", undefined).then((channel) => channel1 = channel);
                context.createChannel("val1", "pva", undefined).then((channel) => channel2 = channel);
                setTimeout(() => {
                    expect(channel1).toBe(channel2);
                    context.destroyHard();
                    done();
                }, 1000)
            })
        })


        it("create 1 channel twice asynchronously, 2 channels should be the same", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel1 = await context.createChannel("val1", "pva", undefined);
                const channel2 = await context.createChannel("val1", "pva", undefined);
                setTimeout(() => {
                    expect(channel1).toBe(channel2);
                    context.destroyHard();
                    done();
                }, 1000)
            })
        })


        it("PVA channel -- Run Context.createChannel() twice synchronously, Context.createChannel() is invoked again before the first invocation resolves/rejects", (done: jest.DoneCallback) => {
            const contex = new Context();
            contex.initialize().then(async () => {
                let channel1: any;
                contex.createChannel("val7", "pva").then((result) => { channel1 = result });
                let channel2: any;
                // before the first createChannel() resolves/rejects
                contex.createChannel("val7", "pva").then((result) => { channel2 = result });
                setTimeout(() => {
                    contex.destroyHard();
                    expect(channel1).toBe(channel2);
                    done();
                }, 500)
            })
        })



        it("PVA channel -- Run Context.createChannel() twice asynchronously, the 2nd invocation is invoked after the 1st one resolves/rejects", (done: jest.DoneCallback) => {
            const contex = new Context();
            contex.initialize().then(async () => {
                const channel1 = await contex.createChannel("val7", "pva");
                const channel2 = await contex.createChannel("val7", "pva");
                setTimeout(() => {
                    contex.destroyHard();
                    expect(channel1).toBe(channel2);
                    done();
                }, 500)
            })
        })


        it("create non-exisiting pva channel with timeout", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                context.createChannel("val1aaa", "pva", 1).then((result) => {
                    expect(result).toBe(undefined);
                    context.destroyHard();
                    done();
                });
            })
        })

        it("PVA Channel -- Run Context.createChannel() twice synchronously for an non-existing channel with timeout, returns undefined", (done: jest.DoneCallback) => {
            const contex = new Context();
            contex.initialize().then(async () => {
                let channel1: any;
                contex.createChannel("valAAA7", "pva", 0.5).then((result) => { channel1 = result });
                let channel2: any;
                // before the first createChannel() resolves/rejects
                contex.createChannel("valAAA7", "pva", 0.5).then((result) => { channel2 = result });
                setTimeout(() => {
                    expect([channel1, channel2]).toEqual([undefined, undefined]);
                    contex.destroyHard();
                    done();
                }, 1000)
            })
        })


        it("PVA Channel -- Run Context.createChannel() twice synchronously for an non-existing channel with timeout, this channel's state is DESTROYED", (done: jest.DoneCallback) => {
            const contex = new Context();
            contex.initialize().then(async () => {
                contex.createChannel("valAAA7", "pva", 0.5);
                contex.createChannel("valAAA7", "pva", 0.5);
                const channel = contex.getChannel("valAAA7");
                setTimeout(() => {
                    expect(channel?.getState()).toBe(Channel_STATES.DESTROYED);
                    contex.destroyHard();
                    done();
                }, 1000)
            })
        })

        it("PVA Channel -- Run Context.createChannel() twice synchronously for an non-existing channel with timeout, they are both destoryed hard", (done: jest.DoneCallback) => {
            const contex = new Context();
            contex.initialize().then(async () => {
                let channel1: any;
                contex.createChannel("valAAA7", "pva", 0.5).then((result) => { channel1 = result });
                let channel2: any;
                // before the first createChannel() resolves/rejects
                contex.createChannel("valAAA7", "pva", 0.5).then((result) => { channel2 = result });
                setTimeout(() => {
                    const chan = contex.getChannel("valAAA7");
                    expect(chan).toBe(undefined);
                    contex.destroyHard();
                    done();
                }, 1000)
            })
        })


        it("PVA Channel -- Creat a channel that is not serviced without a creation timeout, the createChannel() never resolves", (done: jest.DoneCallback) => {
            const contex = new Context();
            contex.initialize().then(async () => {
                let created = false;
                contex.createChannel("valAAA7", "pva").then(() => {
                    // the creationCh
                    created = true;
                })
                setTimeout(() => {
                    contex.destroyHard();
                    expect(created).toBe(false);
                    done();
                }, 1500)
            })
        })

        it("PVA Channel -- Create multiple channels", (done: jest.DoneCallback) => {
            const contex = new Context();
            contex.initialize().then(async () => {
                const channel1 = contex.createChannel("val7", "pva");
                const channel2 = contex.createChannel("val8", "pva");
                const channel3 = contex.createChannel("val9", "pva");
                setTimeout(() => {
                    expect([channel1, channel2, channel3]).not.toEqual([undefined, undefined, undefined]);
                    contex.destroyHard();
                    done();
                }, 1000)
            })
        })

    })

    describe.skip("PVA GET", () => {

        it("simple case -- get from a soft PVA IOC, no timeout, get all fields", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000", "pva");
                const result = await channel?.getPva(undefined, "");
                expect(result).toEqual(
                    expect.objectContaining(
                        {
                            value: 1234.5678901234,
                            alarm: { severity: 2, status: 1, message: 'HIHI' },
                            // timeStamp: { secondsPastEpoch: 1732398875n, nanoseconds: 179003000, userTag: 0 },
                            display: {
                                limitLow: 765.4321,
                                limitHigh: 8765.4321,
                                description: '',
                                units: 'km',
                                precision: 0,
                                form: {
                                    index: 0,
                                    choices: [
                                        'Default',
                                        'String',
                                        'Binary',
                                        'Decimal',
                                        'Hex',
                                        'Exponential',
                                        'Engineering'
                                    ]
                                }
                            },
                            control: { limitLow: 765.4321, limitHigh: 8765.4321, minStep: 0 },
                            valueAlarm: {
                                active: false,
                                lowAlarmLimit: 0,
                                lowWarningLimit: 0,
                                highWarningLimit: 0,
                                highAlarmLimit: 1000,
                                lowAlarmSeverity: 0,
                                lowWarningSeverity: 0,
                                highWarningSeverity: 0,
                                highAlarmSeverity: 0,
                                hysteresis: 0
                            }
                        }
                    )
                )
                context.destroyHard();
                done();
            })
        })

        it("simple case -- get from a soft PVA IOC, no timeout, get `value` field, but get all fields", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000", "pva");
                const result = await channel?.getPva(undefined, "value");
                console.dir(result, { depth: null })
                expect(result).toEqual(
                    expect.objectContaining(
                        {
                            value: 1234.5678901234,
                            alarm: { severity: 2, status: 1, message: 'HIHI' },
                            // timeStamp: { secondsPastEpoch: 1732398875n, nanoseconds: 179003000, userTag: 0 },
                            display: {
                                limitLow: 765.4321,
                                limitHigh: 8765.4321,
                                description: '',
                                units: 'km',
                                precision: 0,
                                form: {
                                    index: 0,
                                    choices: [
                                        'Default',
                                        'String',
                                        'Binary',
                                        'Decimal',
                                        'Hex',
                                        'Exponential',
                                        'Engineering'
                                    ]
                                }
                            },
                            control: { limitLow: 765.4321, limitHigh: 8765.4321, minStep: 0 },
                            valueAlarm: {
                                active: false,
                                lowAlarmLimit: 0,
                                lowWarningLimit: 0,
                                highWarningLimit: 0,
                                highAlarmLimit: 1000,
                                lowAlarmSeverity: 0,
                                lowWarningSeverity: 0,
                                highWarningSeverity: 0,
                                highAlarmSeverity: 0,
                                hysteresis: 0
                            }
                        }
                    )
                )
                context.destroyHard();
                done();
            })
        })

        it("simple case -- demo:version, db file running in a full PVA IOC", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("demo:version", "pva");
                const result = await channel?.getPva(undefined, "");
                expect(result).toEqual(
                    expect.objectContaining(
                        {
                            value: '0.1',
                            alarm: { severity: 0, status: 2, message: 'UDF' },
                            // timeStamp: { secondsPastEpoch: 631152000n, nanoseconds: 0, userTag: 0 },
                            display: {
                                limitLow: 0,
                                limitHigh: 0,
                                description: '',
                                units: '',
                                precision: 0,
                                form: {
                                    index: 0,
                                    choices: [
                                        'Default',
                                        'String',
                                        'Binary',
                                        'Decimal',
                                        'Hex',
                                        'Exponential',
                                        'Engineering'
                                    ]
                                }
                            },
                            control: { limitLow: 0, limitHigh: 0, minStep: 0 }
                        })
                )
                context.destroyHard();
                done();
            })
        })

        it("simple case -- demo:version, db file running in a full PVA IOC, try to get `value` field, but get all", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("demo:version", "pva");
                const result = await channel?.getPva(undefined, "value");
                expect(result).toEqual(
                    expect.objectContaining(
                        {
                            value: '0.1',
                            alarm: { severity: 0, status: 2, message: 'UDF' },
                            // timeStamp: { secondsPastEpoch: 631152000n, nanoseconds: 0, userTag: 0 },
                            display: {
                                limitLow: 0,
                                limitHigh: 0,
                                description: '',
                                units: '',
                                precision: 0,
                                form: {
                                    index: 0,
                                    choices: [
                                        'Default',
                                        'String',
                                        'Binary',
                                        'Decimal',
                                        'Hex',
                                        'Exponential',
                                        'Engineering'
                                    ]
                                }
                            },
                            control: { limitLow: 0, limitHigh: 0, minStep: 0 }
                        })
                )
                context.destroyHard();
                done();
            })
        })

        it("simple case -- try to get a non-existing field from a pv in PVA IOC, obtain all fields", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000", "pva");
                const result = await channel?.getPva(undefined, "valueAAAA");
                console.dir(result, { depth: null })
                expect(result).toEqual(
                    expect.objectContaining(
                        {
                            value: 1234.5678901234,
                            alarm: { severity: 2, status: 1, message: 'HIHI' },
                            // timeStamp: { secondsPastEpoch: 1732398875n, nanoseconds: 179003000, userTag: 0 },
                            display: {
                                limitLow: 765.4321,
                                limitHigh: 8765.4321,
                                description: '',
                                units: 'km',
                                precision: 0,
                                form: {
                                    index: 0,
                                    choices: [
                                        'Default',
                                        'String',
                                        'Binary',
                                        'Decimal',
                                        'Hex',
                                        'Exponential',
                                        'Engineering'
                                    ]
                                }
                            },
                            control: { limitLow: 765.4321, limitHigh: 8765.4321, minStep: 0 },
                            valueAlarm: {
                                active: false,
                                lowAlarmLimit: 0,
                                lowWarningLimit: 0,
                                highWarningLimit: 0,
                                highAlarmLimit: 1000,
                                lowAlarmSeverity: 0,
                                lowWarningSeverity: 0,
                                highWarningSeverity: 0,
                                highAlarmSeverity: 0,
                                hysteresis: 0
                            }
                        }

                    )
                )
                context.destroyHard();
                done();
            })
        })

        it("complex case -- `neutrons`, get all fields", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("neutrons", "pva");
                const result = await channel?.getPva(undefined, "");
                expect(result).toEqual(
                    expect.objectContaining(
                        {
                            // timeStamp: { secondsPastEpoch: 0n, nanoseconds: 0, userTag: 0 },
                            proton_charge: { value: 0, value2: 0, time_of_flight2: { value: [] } },
                            proton_charge1: 0,
                            time_of_flight: {
                                value: [],
                                timeStamp: { secondsPastEpoch: 0n, nanoseconds: 0, userTag: 0 }
                            },
                            pixel: { value: [] }
                        }
                    )
                );
                context.destroyHard();
                done();
            })
        })

        it("complex case -- `neutrons`, get one top field", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("neutrons", "pva");
                // change value, actually we are also testing Channel.putPva
                await channel?.putPva("proton_charge1", [22]);
                const result = await channel?.getPva(undefined, "proton_charge1");
                // reset value
                await channel?.putPva("proton_charge1", [0]);
                expect(result).toEqual(
                    {
                        proton_charge1: 22,
                    }
                );
                context.destroyHard();
                done();
            })
        })


        it("complex case -- `neutrons`, get one sub field", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("neutrons", "pva");
                // change value, actually we are also testing Channel.putPva
                await channel?.putPva("time_of_flight.timeStamp.nanoseconds", [22]);
                const result = await channel?.getPva(undefined, "time_of_flight.timeStamp.nanoseconds");
                // reset value
                await channel?.putPva("time_of_flight.timeStamp.nanoseconds", [0]);
                expect(result).toEqual(
                    {
                        time_of_flight: {
                            timeStamp: {
                                nanoseconds: 22
                            }
                        }
                    }
                );
                context.destroyHard();
                done();
            })
        })


        it("complex case -- `neutrons`, get several top-level fields", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("neutrons", "pva");
                const result = await channel?.getPva(undefined, "proton_charge1,time_of_flight");
                expect(result).toEqual(
                    {
                        proton_charge1: 0,
                        time_of_flight: {
                            value: [],
                            timeStamp: {
                                secondsPastEpoch: 0n,
                                nanoseconds: 0,
                                userTag: 0,
                            }
                        }
                    }
                );
                context.destroyHard();
                done();
            })
        })

        it("complex case -- `neutrons`, get several top-level fields, change pvrequest sequence", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("neutrons", "pva");
                const result = await channel?.getPva(undefined, "time_of_flight.timeStamp,proton_charge1");
                expect(result).toEqual(
                    {
                        proton_charge1: 0,
                        time_of_flight: {
                            timeStamp: {
                                secondsPastEpoch: 0n,
                                nanoseconds: 0,
                                userTag: 0,
                            }
                        }
                    }
                );
                context.destroyHard();
                done();
            })
        })

        it("complex case -- `neutrons`, get several top-level fields, change pvrequest sequence", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("neutrons", "pva");
                const result = await channel?.getPva(undefined, "time_of_flight.timeStamp,time_of_flight.value,proton_charge1");
                expect(result).toEqual(
                    {
                        proton_charge1: 0,
                        time_of_flight: {
                            value: [],
                            timeStamp: {
                                secondsPastEpoch: 0n,
                                nanoseconds: 0,
                                userTag: 0,
                            }
                        }
                    }
                );
                context.destroyHard();
                done();
            })
        })

        it("complex case -- `neutrons`, get several top-level fields, change pvrequest sequence", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("neutrons", "pva");
                const result = await channel?.getPva(undefined, "time_of_flight.timeStamp,proton_charge1,time_of_flight.value");
                expect(result).toEqual(
                    {
                        proton_charge1: 0,
                        time_of_flight: {
                            value: [],
                            timeStamp: {
                                secondsPastEpoch: 0n,
                                nanoseconds: 0,
                                userTag: 0,
                            }
                        }
                    }
                );
                context.destroyHard();
                done();
            })
        })

        it("complex case -- `neutrons`, get parent field and its child field, failed to get", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("neutrons", "pva");
                const result = await channel?.getPva(undefined, "time_of_flight,proton_charge1,time_of_flight.value");
                expect(result).toEqual(undefined);
                context.destroyHard();
                done();
            })
        })

        it("complex case -- `neutrons`, duplicated fields, get one", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("neutrons", "pva");
                const result = await channel?.getPva(undefined, "time_of_flight.value,time_of_flight.value");
                expect(result).toEqual(undefined);
                context.destroyHard();
                done();
            })
        })

        it("complex case -- `neutrons`, additional commas in pv request, failed to GET", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("neutrons", "pva");
                const result = await channel?.getPva(undefined, "time_of_flight,,");
                console.log(result)
                expect(result).toEqual(undefined);
                context.destroyHard();
                done();
            })
        })

        it("complex case -- `neutrons`, non-existing pv request, returns undefined", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("neutrons", "pva");
                const result = await channel?.getPva(undefined, "abc");
                console.log(result)
                expect(result).toEqual(undefined);
                context.destroyHard();
                done();
            })
        })


        it("complex case -- `neutrons`, non-existing and existing pv request, returns existing one", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("neutrons", "pva");
                const result = await channel?.getPva(undefined, "abc,time_of_flight");
                expect(result).toEqual(
                    {
                        time_of_flight: {
                            value: [],
                            timeStamp: { secondsPastEpoch: 0n, nanoseconds: 0, userTag: 0 }
                        }
                    }
                );
                context.destroyHard();
                done();
            })
        })

        it("complex case -- `neutrons`, non-existing and existing pv request, returns existing one", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("neutrons", "pva");
                const result = await channel?.getPva(undefined, "abc,time_of_flight");
                expect(result).toEqual(
                    {
                        time_of_flight: {
                            value: [],
                            timeStamp: { secondsPastEpoch: 0n, nanoseconds: 0, userTag: 0 }
                        }
                    }
                );
                context.destroyHard();
                done();
            })
        })


    })


    describe.skip("GET instropection type", () => {
        it("simple case -- NTScalar ", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000", "pva");
                const type = await channel?.fetchPvaType();
                expect(type).toEqual(
                    {
                        typeIndex: '0x80',
                        id: 1,
                        name: 'epics:nt/NTScalar:1.0',
                        fields: {
                            value: { typeIndex: '0x43' },
                            alarm: {
                                typeIndex: '0x80',
                                id: 2,
                                name: 'alarm_t',
                                fields: {
                                    severity: { typeIndex: '0x22' },
                                    status: { typeIndex: '0x22' },
                                    message: { typeIndex: '0x60' }
                                }
                            },
                            timeStamp: {
                                typeIndex: '0x80',
                                id: 3,
                                name: '',
                                fields: {
                                    secondsPastEpoch: { typeIndex: '0x23' },
                                    nanoseconds: { typeIndex: '0x22' },
                                    userTag: { typeIndex: '0x22' }
                                }
                            },
                            display: {
                                typeIndex: '0x80',
                                id: 4,
                                name: '',
                                fields: {
                                    limitLow: { typeIndex: '0x43' },
                                    limitHigh: { typeIndex: '0x43' },
                                    description: { typeIndex: '0x60' },
                                    units: { typeIndex: '0x60' },
                                    precision: { typeIndex: '0x22' },
                                    form: {
                                        typeIndex: '0x80',
                                        id: 5,
                                        name: 'enum_t',
                                        fields: {
                                            index: { typeIndex: '0x22' },
                                            choices: { typeIndex: '0x68' }
                                        }
                                    }
                                }
                            },
                            control: {
                                typeIndex: '0x80',
                                id: 6,
                                name: 'control_t',
                                fields: {
                                    limitLow: { typeIndex: '0x43' },
                                    limitHigh: { typeIndex: '0x43' },
                                    minStep: { typeIndex: '0x43' }
                                }
                            },
                            valueAlarm: {
                                typeIndex: '0x80',
                                id: 7,
                                name: 'valueAlarm_t',
                                fields: {
                                    active: { typeIndex: '0x0' },
                                    lowAlarmLimit: { typeIndex: '0x43' },
                                    lowWarningLimit: { typeIndex: '0x43' },
                                    highWarningLimit: { typeIndex: '0x43' },
                                    highAlarmLimit: { typeIndex: '0x43' },
                                    lowAlarmSeverity: { typeIndex: '0x22' },
                                    lowWarningSeverity: { typeIndex: '0x22' },
                                    highWarningSeverity: { typeIndex: '0x22' },
                                    highAlarmSeverity: { typeIndex: '0x22' },
                                    hysteresis: { typeIndex: '0x20' }
                                }
                            }
                        }
                    }
                )
                context.destroyHard();
                done();


            })
        })

        it("complex case -- neutron ", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("neutrons", "pva");
                const type = await channel?.fetchPvaType();
                console.dir(type, { depth: null })
                expect(type).toEqual(
                    {
                        typeIndex: '0x80',
                        id: 1,
                        name: '',
                        fields: {
                            timeStamp: {
                                typeIndex: '0x80',
                                id: 2,
                                name: 'time_t',
                                fields: {
                                    secondsPastEpoch: { typeIndex: '0x23' },
                                    nanoseconds: { typeIndex: '0x22' },
                                    userTag: { typeIndex: '0x22' }
                                }
                            },
                            proton_charge: {
                                typeIndex: '0x80',
                                id: 3,
                                name: 'epics:nt/NTScalar:1.0xxx',
                                fields: {
                                    value: { typeIndex: '0x43' },
                                    value2: { typeIndex: '0x43' },
                                    time_of_flight2: {
                                        typeIndex: '0x80',
                                        id: 4,
                                        name: 'epics:nt/NTScalarArray:1.0',
                                        fields: { value: { typeIndex: '0x2e' } }
                                    }
                                }
                            },
                            proton_charge1: { typeIndex: '0x43' },
                            time_of_flight: {
                                typeIndex: '0x80',
                                id: 5,
                                name: 'epics:nt/NTScalarArray:1.0',
                                fields: {
                                    value: { typeIndex: '0x2e' },
                                    timeStamp: {
                                        typeIndex: '0x80',
                                        id: 2,
                                        name: 'time_t',
                                        fields: {
                                            secondsPastEpoch: { typeIndex: '0x23' },
                                            nanoseconds: { typeIndex: '0x22' },
                                            userTag: { typeIndex: '0x22' }
                                        }
                                    }
                                }
                            },
                            pixel: {
                                typeIndex: '0x80',
                                id: 4,
                                name: 'epics:nt/NTScalarArray:1.0',
                                fields: { value: { typeIndex: '0x2e' } }
                            }
                        }
                    }
                )
                context.destroyHard();
                done();


            })
        })
    })


    describe.skip("PVA MONITOR", () => {

        it("simple case -- monitor all fields", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val7", "pva");
                let count = 0;
                const monitor = channel?.createMonitorPva(undefined, "", (mon: ChannelMonitor) => {
                    count++;
                })
                setTimeout(() => {
                    expect(count >= 1 && count <= 2).toBe(true);
                    context.destroyHard();
                    done();
                }, 1000)
            })
        })


        it("simple case -- monitor `valueAlarm` field of soft IOC, but get all fields", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("val2000", "pva");
                let count = 0;
                let result: any;
                const monitor = channel?.createMonitorPva(undefined, "valueAlarm", (mon: ChannelMonitor) => {
                    count++;
                    result = mon.getPvaData();
                })
                setTimeout(() => {
                    expect(count >= 1 && count <= 2).toBe(true);
                    expect(result).toEqual(
                        expect.objectContaining(
                            {
                                value: 1234.5678901234,
                                alarm: { severity: 2, status: 1, message: 'HIHI' },
                                // timeStamp: { secondsPastEpoch: 1732398875n, nanoseconds: 179003000, userTag: 0 },
                                display: {
                                    limitLow: 765.4321,
                                    limitHigh: 8765.4321,
                                    description: '',
                                    units: 'km',
                                    precision: 0,
                                    form: {
                                        index: 0,
                                        choices: [
                                            'Default',
                                            'String',
                                            'Binary',
                                            'Decimal',
                                            'Hex',
                                            'Exponential',
                                            'Engineering'
                                        ]
                                    }
                                },
                                control: { limitLow: 765.4321, limitHigh: 8765.4321, minStep: 0 },
                                valueAlarm: {
                                    active: false,
                                    lowAlarmLimit: 0,
                                    lowWarningLimit: 0,
                                    highWarningLimit: 0,
                                    highAlarmLimit: 1000,
                                    lowAlarmSeverity: 0,
                                    lowWarningSeverity: 0,
                                    highWarningSeverity: 0,
                                    highAlarmSeverity: 0,
                                    hysteresis: 0
                                }
                            }

                        )
                    )
                    context.destroyHard();
                    done();
                }, 1000)
            })
        })


        it("complext case -- monitor all fields", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("neutrons", "pva");
                let count = 0;
                const monitor = channel?.createMonitorPva(undefined, "", (mon: ChannelMonitor) => {
                    count++;
                })
                setTimeout(() => {
                    expect(count).toBe(1);
                    context.destroyHard();
                    done();
                }, 1000)
            })
        })
        it("complext case -- create 2 monitors, they both monitor", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("neutrons", "pva");
                let count1 = 0;
                let count2 = 0;
                const monitor1 = channel?.createMonitorPva(undefined, "", (mon: ChannelMonitor) => {
                    count1++;
                })
                const monitor2 = channel?.createMonitorPva(undefined, "", (mon: ChannelMonitor) => {
                    count2++;
                })
                setTimeout(() => {
                    expect(count1 >= 1 && count1 <= 2 && count2 >= 1 && count2 <= 2).toBe(true);
                    context.destroyHard();
                    done();
                }, 1000)
            })
        })


        it("complext case -- create 2 monitors, they are different", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("neutrons", "pva");
                let count1 = 0;
                let count2 = 0;
                const monitor1 = await channel?.createMonitorPva(undefined, "", (mon: ChannelMonitor) => {
                    count1++;
                })
                const monitor2 = await channel?.createMonitorPva(undefined, "", (mon: ChannelMonitor) => {
                    count2++;
                })

                expect(monitor1 !== monitor2).toBe(true)
                context.destroyHard();
                done();
            })
        })

        it("complext case -- create monitor, compare its value with getPva()", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("neutrons", "pva");
                let value: any;
                await channel?.createMonitorPva(undefined, "", (mon: ChannelMonitor) => {
                    value = mon.getPvaData();
                })
                const value1 = await channel?.getPva(undefined, "");
                expect(value).toEqual(value1);
                context.destroyHard();
                done();

            })
        })


        it("complext case -- monitor one field, compare its value with get one field", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("neutrons", "pva");
                let value: any;
                await channel?.createMonitorPva(undefined, "time_of_flight", (mon: ChannelMonitor) => {
                    value = mon.getPvaData();
                })
                const value1 = await channel?.getPva(undefined, "time_of_flight");
                expect(value).toEqual(value1);
                context.destroyHard();
                done();
            })
        })

        it("complext case -- monitor one field", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("neutrons", "pva");
                let value: any;
                await channel?.createMonitorPva(undefined, "time_of_flight", (mon: ChannelMonitor) => {
                    value = mon.getPvaData();
                })
                expect(value).toEqual(
                    {
                        time_of_flight: {
                            value: [],
                            timeStamp: { secondsPastEpoch: 0n, nanoseconds: 0, userTag: 0 }
                        }
                    }
                );
                context.destroyHard();
                done();
            })
        })

        it("complext case -- monitor a non-existing field, createMonitor returns `undefined`", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("neutrons", "pva");
                const monitor = await channel?.createMonitorPva(undefined, "time_of_flightAAA", (mon: ChannelMonitor) => {
                })
                setTimeout(() => {
                    expect(monitor).toBe(undefined);
                    context.destroyHard();
                    done();
                }, 1000)
            })
        })


        it("complext case -- monitor multiple fields", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("neutrons", "pva");
                const monitor = await channel?.createMonitorPva(undefined, "time_of_flight,proton_charge,", (mon: ChannelMonitor) => {
                })
                setTimeout(() => {
                    expect(monitor?.getPvaData()).toEqual(
                        {
                            time_of_flight: {
                                value: [],
                                timeStamp: { secondsPastEpoch: 0n, nanoseconds: 0, userTag: 0 }
                            },
                            proton_charge: { value: 0, value2: 0, time_of_flight2: { value: [] } }
                        }
                    );
                    context.destroyHard();
                    done();
                }, 1000)
            })
        })

        it("complext case -- monitor multiple fields with parent and child fields, will not monitor", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("neutrons", "pva");
                const monitor = await channel?.createMonitorPva(undefined, "time_of_flight, time_of_flight.value", (mon: ChannelMonitor) => {
                })
                setTimeout(() => {
                    expect(monitor).toBe(undefined);
                    context.destroyHard();
                    done();
                }, 1000)
            })
        })


        it("complext case -- monitor multiple differnt fields, ", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                const channel = await context.createChannel("neutrons", "pva");
                const monitor = await channel?.createMonitorPva(undefined, "time_of_flight.value, proton_charge", (mon: ChannelMonitor) => {
                })
                setTimeout(() => {

                    expect(monitor?.getPvaData()).toEqual(
                        {
                            time_of_flight: { value: [] },
                            proton_charge: { value: 0, value2: 0, time_of_flight2: { value: [] } }
                        }
                    );
                    context.destroyHard();
                    done();
                }, 1000)
            })
        })

    })

    describe("PVA PUT", () => {
        it("simple case -- put the default `value` field to a soft PVA IOC channel", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                // original value: 1234.5678901234
                const rand = Math.random() + 1234;
                const channel = await context.createChannel("val2000", "pva");
                await channel?.putPva("value", [rand]);
                const result = await channel?.getPva();
                await channel?.putPva("value", [1234.5678901234]); // put value back
                setTimeout(() => {
                    expect(result).toEqual(
                        expect.objectContaining(
                            {
                                value: rand,
                                alarm: { severity: 2, status: 1, message: 'HIHI' },
                                // timeStamp: { secondsPastEpoch: 1732505294n, nanoseconds: 214749000, userTag: 0 },
                                display: {
                                    limitLow: 765.4321,
                                    limitHigh: 8765.4321,
                                    description: '',
                                    units: 'km',
                                    precision: 0,
                                    form: {
                                        index: 0,
                                        choices: [
                                            'Default',
                                            'String',
                                            'Binary',
                                            'Decimal',
                                            'Hex',
                                            'Exponential',
                                            'Engineering'
                                        ]
                                    }
                                },
                                control: { limitLow: 765.4321, limitHigh: 8765.4321, minStep: 0 },
                                valueAlarm: {
                                    active: false,
                                    lowAlarmLimit: 0,
                                    lowWarningLimit: 0,
                                    highWarningLimit: 0,
                                    highAlarmLimit: 1000,
                                    lowAlarmSeverity: 0,
                                    lowWarningSeverity: 0,
                                    highWarningSeverity: 0,
                                    highAlarmSeverity: 0,
                                    hysteresis: 0
                                }
                            }
                        )
                    );
                    context.destroyHard();
                    done();
                }, 1000)
            })

        })

        it("simple case -- put the a non-existing field to a soft PVA IOC channel, returns PVA-STATUS_TYPE.ERROR", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                // original value: 1234.5678901234
                const rand = Math.random() + 1234;
                const channel = await context.createChannel("val2000", "pva");
                const result = await channel?.putPva("valueAAA", [rand]);
                setTimeout(() => {
                    expect(result?.type).toEqual(
                        PVA_STATUS_TYPE.ERROR
                    );
                    context.destroyHard();
                    done();
                }, 1000)
            })
        })

        it("simple case -- put the a non-existing and an existing fields to a soft PVA IOC channel, returns PVA-STATUS_TYPE.ERROR", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                // original value: 1234.5678901234
                const rand = Math.random() + 1234;
                const channel = await context.createChannel("val2000", "pva");
                const result = await channel?.putPva("valueAAA,value", [rand, rand]);
                setTimeout(() => {
                    expect(result?.type).toEqual(
                        PVA_STATUS_TYPE.ERROR
                    );
                    context.destroyHard();
                    done();
                }, 1000)
            })
        })

        it("complex case -- put 2 fields to `neutrons`", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                // original value: 0
                const rand1 = Math.random();
                const channel = await context.createChannel("neutrons", "pva");
                await channel?.putPva("proton_charge.value,time_of_flight.value", [rand1, [1, 2, 4]]);
                const result = await channel?.getPva(undefined, "proton_charge.value,time_of_flight.value");
                await channel?.putPva("proton_charge.value,time_of_flight.value", [0, []]);
                setTimeout(() => {
                    expect(result).toEqual(
                        {
                            proton_charge: { value: rand1 },
                            time_of_flight: { value: [1, 2, 4] }
                        }
                    );
                    context.destroyHard();
                    done();
                }, 1000)
            })
        })

        it("complex case -- put 2 fields to `neutrons`", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                // original value: 0
                const rand1 = Math.random();
                const channel = await context.createChannel("neutrons", "pva");
                await channel?.putPva("proton_charge.value,time_of_flight", [rand1, { value: [1, 2, 3], timeStamp: { secondsPastEpoch: 1, nanoseconds: 2, userTag: 3 } }]);
                const result = await channel?.getPva(undefined, "proton_charge.value,time_of_flight");
                await channel?.putPva("proton_charge.value,time_of_flight", [0, { value: [], timeStamp: { secondsPastEpoch: 0, nanoseconds: 0, userTag: 0 } }]);
                setTimeout(() => {
                    expect(result).toEqual(
                        {
                            proton_charge: { value: rand1 },
                            time_of_flight: { value: [1, 2, 3], timeStamp: { secondsPastEpoch: 1n, nanoseconds: 2, userTag: 3 } }
                        }
                    );
                    context.destroyHard();
                    done();
                }, 1000)
            })
        })

        it("complex case -- put 1 non-exisiting and 1 existing fields to `neutrons`, will not set", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                // original value: 0
                const rand1 = Math.random();
                const channel = await context.createChannel("neutrons", "pva");
                await channel?.putPva("proton_charge.valueAAA,time_of_flight", [rand1, { value: [1, 2, 3], timeStamp: { secondsPastEpoch: 1, nanoseconds: 2, userTag: 3 } }]);
                const result = await channel?.getPva(undefined, "proton_charge.value,time_of_flight");
                setTimeout(() => {
                    expect(result).toEqual(
                        {
                            proton_charge: { value: 0 },
                            time_of_flight: { value: [], timeStamp: { secondsPastEpoch: 0n, nanoseconds: 0, userTag: 0 } }
                        }
                    );
                    context.destroyHard();
                    done();
                }, 1000)
            })
        })

        it("complex case -- one parent field and its child field `neutrons`, refuse to PUT", (done: jest.DoneCallback) => {
            const context = new Context();
            context.initialize().then(async () => {
                // original value: 0
                const channel = await context.createChannel("neutrons", "pva");
                await channel?.putPva("time_of_flight.value,time_of_flight", [[4, 5, 6], { value: [1, 2, 3], timeStamp: { secondsPastEpoch: 1, nanoseconds: 2, userTag: 3 } }]);
                const result = await channel?.getPva(undefined, "time_of_flight");
                setTimeout(() => {
                    expect(result).toEqual(
                        {
                            time_of_flight: { value: [], timeStamp: { secondsPastEpoch: 0n, nanoseconds: 0, userTag: 0 } }
                        }
                    );
                    context.destroyHard();
                    done();
                }, 1000)
            })
        })

    })

    // todo:
    describe("PVA RPC", () => {
    })


})
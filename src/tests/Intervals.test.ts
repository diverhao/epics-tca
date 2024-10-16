import { Intervals } from "../Intervals/Intervals";

/**
 * This test takes about 18 s
 */

describe("Intervals", () => {

    describe("add, start, then clear one or multiple intervals", () => {
        it("add and start an interval, wait for first call, then clear it", (done: jest.DoneCallback) => {
            const intervals = new Intervals();
            let count = 0;
            intervals.addInterval("int1", 1, () => {
                count++;
            }, []);
            intervals.startInterval("int1");
            setTimeout(() => {
                intervals.clearInterval("int1");
            }, 1500);
            setTimeout(() => {
                expect(count).toBe(1);
                done();
            }, 1500)
        })

        it("add and start an interval, then clear it before the first call", (done: jest.DoneCallback) => {
            const intervals = new Intervals();
            let count = 0;
            intervals.addInterval("int1", 1, () => {
                count++;
            }, []);
            intervals.startInterval("int1");
            setTimeout(() => {
                intervals.clearInterval("int1");
            }, 500);
            setTimeout(() => {
                expect(count).toBe(0);
                done();
            }, 1500)
        })

        it("add and start multiple intervals, then clear two before their first call, clear 3rd one after its first call", (done: jest.DoneCallback) => {
            const intervals = new Intervals();
            let count1 = 0;
            let count2 = 0;
            let count3 = 0;
            intervals.addInterval("int1", 1, () => {
                count1++;
            }, []);
            intervals.addInterval("int2", 1, () => {
                count2++;
            }, []);
            intervals.addInterval("int3", 1, () => {
                count3++;
            }, []);
            intervals.startInterval("int1");
            intervals.startInterval("int2");
            intervals.startInterval("int3");
            setTimeout(() => {
                intervals.clearInterval("int2");
                intervals.clearInterval("int3");
            }, 500);
            setTimeout(() => {
                intervals.clearInterval("int1");
            }, 1500);
            setTimeout(() => {
                expect([count1, count2, count3]).toEqual([1, 0, 0]);
                done();
            }, 2000)
        })

        it("add and start multiple intervals, then clear all before their first call", (done: jest.DoneCallback) => {
            const intervals = new Intervals();
            let count1 = 0;
            let count2 = 0;
            let count3 = 0;
            intervals.addInterval("int1", 1, () => {
                count1++;
            }, []);
            intervals.addInterval("int2", 1, () => {
                count2++;
            }, []);
            intervals.addInterval("int3", 1, () => {
                count3++;
            }, []);
            intervals.startInterval("int1");
            intervals.startInterval("int2");
            intervals.startInterval("int3");
            setTimeout(() => {
                intervals.clearAllIntervals();
            }, 500);
            setTimeout(() => {
                expect([count1, count2, count3]).toEqual([0, 0, 0]);
                done();
            }, 2000)
        })

        it("add and start multiple intervals, then clear all after their first call", (done: jest.DoneCallback) => {
            const intervals = new Intervals();
            let count1 = 0;
            let count2 = 0;
            let count3 = 0;
            intervals.addInterval("int1", 1, () => {
                count1++;
            }, []);
            intervals.addInterval("int2", 1, () => {
                count2++;
            }, []);
            intervals.addInterval("int3", 1, () => {
                count3++;
            }, []);
            intervals.startInterval("int1");
            intervals.startInterval("int2");
            intervals.startInterval("int3");
            setTimeout(() => {
                intervals.clearAllIntervals();
            }, 1500);
            setTimeout(() => {
                expect([count1, count2, count3]).toEqual([1, 1, 1]);
                done();
            }, 2000)
        })
    })
    
    describe("replace an interval", () => {
        it("add and start one interval, then replace it before its first call, clear the 2nd interval before its first call", (done: jest.DoneCallback) => {
            const intervals = new Intervals();
            let count = 0;
            intervals.addInterval("int", 1, () => {
                count++;
            }, []);
            intervals.startInterval("int");
            setTimeout(() => {
                intervals.addInterval("int", 1, () => {
                    count++;
                }, []);
                intervals.startInterval("int");
            }, 500);
            setTimeout(() => {
                intervals.clearInterval("int");
            }, 1250);
            setTimeout(() => {
                expect(count).toEqual(0);
                done();
            }, 1250)
        })


        it("add and start one interval, then replace it after its first call, clear the 2nd interval before its first call", (done: jest.DoneCallback) => {
            const intervals = new Intervals();
            let count = 0;
            intervals.addInterval("int", 0.5, () => {
                count++;
            }, []);
            intervals.startInterval("int");
            setTimeout(() => {
                intervals.addInterval("int", 1, () => {
                    count++;
                }, []);
                intervals.startInterval("int");
            }, 750);
            setTimeout(() => {
                intervals.clearInterval("int");
            }, 1500);
            setTimeout(() => {
                expect(count).toEqual(1);
                done();
            }, 1500)
        })


        it("add and start one interval, then replace it before its first call, clear the 2nd interval after its first call", (done: jest.DoneCallback) => {
            const intervals = new Intervals();
            let count = 0;
            intervals.addInterval("int", 1, () => {
                count++;
            }, []);
            intervals.startInterval("int");
            setTimeout(() => {
                intervals.addInterval("int", 1, () => {
                    count++;
                }, []);
                intervals.startInterval("int");
            }, 500);
            setTimeout(() => {
                intervals.clearInterval("int");
            }, 2000);
            setTimeout(() => {
                expect(count).toEqual(1);
                done();
            }, 2000)
        })
        it("add and start one interval, then replace it after its first call, clear the 2nd interval after its first call", (done: jest.DoneCallback) => {
            const intervals = new Intervals();
            let count = 0;
            intervals.addInterval("int", 0.5, () => {
                count++;
            }, []);
            intervals.startInterval("int");
            setTimeout(() => {
                intervals.addInterval("int", 1, () => {
                    count++;
                }, []);
                intervals.startInterval("int");
            }, 750);
            setTimeout(() => {
                intervals.clearInterval("int");
            }, 2000);
            setTimeout(() => {
                expect(count).toEqual(2);
                done();
            }, 2000)
        })

        it("add and not-start one interval, then replace it after its supposed first call, clear the 2nd interval after its first call", (done: jest.DoneCallback) => {
            const intervals = new Intervals();
            let count = 0;
            intervals.addInterval("int", 0.5, () => {
                count++;
            }, []);
            setTimeout(() => {
                intervals.addInterval("int", 1, () => {
                    count++;
                }, []);
                intervals.startInterval("int");
            }, 750);
            setTimeout(() => {
                intervals.clearInterval("int");
            }, 2000);
            setTimeout(() => {
                expect(count).toEqual(1);
                done();
            }, 2000)
        })
    })

})
import { Timeouts } from "../Timeouts/Timeouts";

describe("Timeouts", () => {
    it("add a timeout, wait until timeout", (done: jest.DoneCallback) => {
        const timeouts = new Timeouts();
        let result = "";
        timeouts.addTimeout("timeout", 0.5, () => {
            result = "ABC"
        }, []);
        timeouts.startTimeout("timeout");
        setTimeout(() => {
            // it must be checked after the timeout
            expect(result).toBe("ABC");
            done();
        }, 1000)
    })

    it("add a timeout, clear the timeout before timeout", (done: jest.DoneCallback) => {
        const timeouts = new Timeouts();
        let result = "";
        // timeout is insanely long
        timeouts.addTimeout("timeout", 1000, () => {
            result = "ABC"
        }, []);
        timeouts.startTimeout("timeout");
        setTimeout(() => {
            timeouts.clearTimeout("timeout");
        }, 500)
        setTimeout(() => {
            // it must be checked after the timeout
            expect(result).toBe("");
            done();
        }, 1500)
    })

    it("add a timeout, clear the timeout after timeout", (done: jest.DoneCallback) => {
        const timeouts = new Timeouts();
        let result = "";
        // 0.5 s
        timeouts.addTimeout("timeout", 0.5, () => {
            result = "ABC"
        }, []);
        timeouts.startTimeout("timeout");
        setTimeout(() => {
            timeouts.clearTimeout("timeout");
        }, 1000)
        setTimeout(() => {
            // it must be checked after the timeout
            expect(result).toBe("ABC");
            done();
        }, 1500)
    })

    it("add and start multiple timeout, clear two timeout before timeout", (done: jest.DoneCallback) => {
        const timeouts = new Timeouts();
        let result1 = "";
        let result2 = "";
        let result3 = "";
        timeouts.addTimeout("timeout1", 1, () => {
            result1 = "ABC"
        }, []);
        timeouts.addTimeout("timeout2", 1, () => {
            result2 = "DEF"
        }, []);
        timeouts.addTimeout("timeout3", 1, () => {
            result3 = "GHI"
        }, []);
        timeouts.startTimeout("timeout1");
        timeouts.startTimeout("timeout2");
        timeouts.startTimeout("timeout3");
        setTimeout(() => {
            timeouts.clearTimeout("timeout1");
            timeouts.clearTimeout("timeout2");
        }, 500)

        setTimeout(() => {
            // it must be checked after the timeout
            expect([result1, result2, result3]).toEqual(["", "", "GHI"]);
            done();
        }, 1500)
    })

    it("add and start multiple timeout, clear two timeout after timeout", (done: jest.DoneCallback) => {
        const timeouts = new Timeouts();
        let result1 = "";
        let result2 = "";
        let result3 = "";
        // timeout is insanely long
        timeouts.addTimeout("timeout1", 0.5, () => {
            result1 = "ABC"
        }, []);
        timeouts.addTimeout("timeout2", 0.5, () => {
            result2 = "DEF"
        }, []);
        timeouts.addTimeout("timeout3", 0.5, () => {
            result3 = "GHI"
        }, []);
        timeouts.startTimeout("timeout1");
        timeouts.startTimeout("timeout2");
        timeouts.startTimeout("timeout3");
        setTimeout(() => {
            timeouts.clearTimeout("timeout1");
            timeouts.clearTimeout("timeout2");
        }, 1000)

        setTimeout(() => {
            // it must be checked after the timeout
            expect([result1, result2, result3]).toEqual(["ABC", "DEF", "GHI"]);
            done();
        }, 1500)
    })

    it("add and start multiple timeout, clear all after timeout", (done: jest.DoneCallback) => {
        const timeouts = new Timeouts();
        let result1 = "";
        let result2 = "";
        let result3 = "";
        timeouts.addTimeout("timeout1", 0.5, () => {
            result1 = "ABC"
        }, []);
        timeouts.addTimeout("timeout2", 0.5, () => {
            result2 = "DEF"
        }, []);
        timeouts.addTimeout("timeout3", 0.5, () => {
            result3 = "GHI"
        }, []);
        timeouts.startTimeout("timeout1");
        timeouts.startTimeout("timeout2");
        timeouts.startTimeout("timeout3");
        setTimeout(() => {
            timeouts.clearAllTimeouts();
        }, 1000)

        setTimeout(() => {
            // it must be checked after the timeout
            expect([result1, result2, result3]).toEqual(["ABC", "DEF", "GHI"]);
            done();
        }, 1500)
    })

    it("add multiple timeout, clear all before timeout", (done: jest.DoneCallback) => {
        const timeouts = new Timeouts();
        let result1 = "";
        let result2 = "";
        let result3 = "";
        // timeout is insanely long
        timeouts.addTimeout("timeout1", 1000, () => {
            result1 = "ABC"
        }, []);
        timeouts.addTimeout("timeout2", 1000, () => {
            result2 = "DEF"
        }, []);
        timeouts.addTimeout("timeout3", 1000, () => {
            result3 = "GHI"
        }, []);
        timeouts.startTimeout("timeout1");
        timeouts.startTimeout("timeout2");
        timeouts.startTimeout("timeout3");
        setTimeout(() => {
            timeouts.clearAllTimeouts();
        }, 500)

        setTimeout(() => {
            // it must be checked after the timeout
            expect([result1, result2, result3]).toEqual(["", "", ""]);
            done();
        }, 1500)
    })


    it("add multiple timeout, never start one, clear all after timeout", (done: jest.DoneCallback) => {
        const timeouts = new Timeouts();
        let result1 = "";
        let result2 = "";
        let result3 = "";
        timeouts.addTimeout("timeout1", 0.5, () => {
            result1 = "ABC"
        }, []);
        timeouts.addTimeout("timeout2", 0.5, () => {
            result2 = "DEF"
        }, []);
        timeouts.addTimeout("timeout3", 0.5, () => {
            result3 = "GHI"
        }, []);
        timeouts.startTimeout("timeout2");
        timeouts.startTimeout("timeout3");
        setTimeout(() => {
            timeouts.clearAllTimeouts();
        }, 1000)

        setTimeout(() => {
            // it must be checked after the timeout
            expect([result1, result2, result3]).toEqual(["", "DEF", "GHI"]);
            done();
        }, 1500)
    })

    it("add multiple timeout, never start one, clear all before timeout", (done: jest.DoneCallback) => {
        const timeouts = new Timeouts();
        let result1 = "";
        let result2 = "";
        let result3 = "";
        timeouts.addTimeout("timeout1", 1, () => {
            result1 = "ABC"
        }, []);
        timeouts.addTimeout("timeout2", 1, () => {
            result2 = "DEF"
        }, []);
        timeouts.addTimeout("timeout3", 1, () => {
            result3 = "GHI"
        }, []);
        timeouts.startTimeout("timeout2");
        timeouts.startTimeout("timeout3");
        setTimeout(() => {
            timeouts.clearAllTimeouts();
        }, 500)

        setTimeout(() => {
            // it must be checked after the timeout
            expect([result1, result2, result3]).toEqual(["", "", ""]);
            done();
        }, 1500)
    })

    it("add one timeout, start it, then replace it before timeout", (done: jest.DoneCallback) => {
        const timeouts = new Timeouts();
        let result = "";
        timeouts.addTimeout("timeout", 1, () => {
            result = "ABC"
        }, []);
        timeouts.startTimeout("timeout");
        setTimeout(() => {
            // the old one is cleared
            timeouts.addTimeout("timeout", 1, () => {
                result = "DEF"
            }, []);
            timeouts.startTimeout("timeout");
        }, 500)

        setTimeout(() => {
            // it must be checked after the timeout
            expect(result).toBe("DEF");
            done();
        }, 2000)
    })

    it("add one timeout, start it, then replace it after timeout", (done: jest.DoneCallback) => {
        const timeouts = new Timeouts();
        let result = "";
        timeouts.addTimeout("timeout", 0.5, () => {
            result = "ABC"
        }, []);
        timeouts.startTimeout("timeout");
        setTimeout(() => {
            // the old one is cleared
            timeouts.addTimeout("timeout", 0.5, () => {
                result = "DEF"
            }, []);
            timeouts.startTimeout("timeout");
        }, 1000)

        setTimeout(() => {
            // it must be checked after the timeout
            expect(result).toBe("DEF");
            done();
        }, 2000)
    })
})
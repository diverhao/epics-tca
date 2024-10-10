import { Promises, PromisesCode } from "../Promises/Promises.js";


describe("Promises -- high-level manager for Promise", () => {
    describe("resolve", () => {

        it("init", () => {
            const promises = new Promises();
            const names = promises.getAllPromiseNames();
            expect(names.length).toBe(0);
        })
        it("add a new one", () => {
            const promises = new Promises();
            promises.appendPromise("p1",true,{}, undefined);
            const names = promises.getAllPromiseNames();
            expect(names).toEqual(["p1"]);
        })
        it("resolve a promise, resolvePromise returns true", () => {
            const promises = new Promises();
            promises.appendPromise("p1",true,{}, undefined);
            const success = promises.resolvePromise("p1", "ABC");
            expect(success).toBe(true);
        })

        it("resolve a non-awaiting promise, resolvePromise() returns false, nothing bad happens", () => {
            const promises = new Promises();
            promises.appendPromise("p1",true,{}, undefined);
            const success = promises.resolvePromise("p2", "ABC");
            expect(success).toBe(false);
        })

        it("await a promsie, resolve it after 1 seconds directly using Promises.resolvePromise()", async () => {
            const promises = new Promises();
            promises.appendPromise("p1",true,{}, undefined);
            const promiseObj = promises.getPromise("p1");
            setTimeout(() => {
                promises.resolvePromise("p1", "ABC");
            }, 1000)
            const result = await promiseObj;
            expect(result).toBe("ABC");
        })

        it("await a promsie, resolve it after 1 seconds directly using Promises.resolvePromise(). The promise is cleaned from promises", async () => {
            const promises = new Promises();
            promises.appendPromise("p1",true,{}, undefined);
            const promiseObj = promises.getPromise("p1");
            setTimeout(() => {
                promises.resolvePromise("p1", "ABC");
            }, 1000)
            const result = await promiseObj;
            const promiseObj2 = promises.getPromise("p1");
            expect(promiseObj2).toBeUndefined();
        })

        it("await a promsie, resolve it after 1 seconds directly using resolve function", async () => {
            const promises = new Promises();
            promises.appendPromise("p1",true,{}, undefined);
            const promiseObj = promises.getPromise("p1");
            setTimeout(() => {
                const promiesResolveFunc = promises.getResolveFunc("p1");
                promiesResolveFunc("ABC")
            }, 1000)
            const result = await promiseObj;
            expect(result).toBe("ABC");
        })

        it("await a promsie, resolve it after 1 seconds directly using resolve function", async () => {
            const promises = new Promises();
            promises.appendPromise("p1",true,{}, undefined);
            const promiseObj = promises.getPromise("p1");
            setTimeout(() => {
                const promiesResolveFunc = promises.getResolveFunc("p1");
                promiesResolveFunc("ABC")
            }, 1000)
            const result = await promiseObj;
            expect(result).toBe("ABC");
        })

        it("await a promsie, resolve it after 1 seconds directly using resolve function, the promise is not cleaned from promises", async () => {
            const promises = new Promises();
            promises.appendPromise("p1",true,{}, undefined);
            const promiseObj = promises.getPromise("p1");
            setTimeout(() => {
                const promiesResolveFunc = promises.getResolveFunc("p1");
                promiesResolveFunc("ABC")
            }, 1000)
            const result = await promiseObj;
            const promiseObj2 = promises.getPromise("p1");
            expect(promiseObj2).not.toBeUndefined();
        })

        it("add 3 promsies, resolve all of them using Promises.resolvePromise(), race condition occurs", async () => {
            const promises = new Promises();
            promises.appendPromise("p1",true,{}, undefined);
            promises.appendPromise("p2",true,{}, undefined);
            promises.appendPromise("p3",true,{}, undefined);
            setTimeout(() => {
                promises.resolvePromise("p1", "ABC");
                promises.resolvePromise("p2", "DEF");
                promises.resolvePromise("p3", "GHI");
            }, 1000)
            const result1 = await promises.getPromise("p1");
            // because the above is blocked, the below won't be able to get Promise object after 
            // the timeout is due. Instead, promises.getPromise("p2") returns undefined
            const result2 = await promises.getPromise("p2");
            const result3 = await promises.getPromise("p3");
            expect([result1, result2, result3]).toEqual(["ABC", undefined, undefined]);
        })


        it("add 3 promsies, resolve all of them using Promises.resolvePromise(), no race condition if we await RawPromiseObject", async () => {
            const promises = new Promises();
            promises.appendPromise("p1",true,{}, undefined);
            promises.appendPromise("p2",true,{}, undefined);
            promises.appendPromise("p3",true,{}, undefined);
            // obtain the raw Promise object ahead of await
            const promiseObj1 = promises.getPromise("p1");
            const promiseObj2 = promises.getPromise("p2");
            const promiseObj3 = promises.getPromise("p3");
            setTimeout(() => {
                promises.resolvePromise("p1", "ABC");
                promises.resolvePromise("p2", "DEF");
                promises.resolvePromise("p3", "GHI");
            }, 1000)
            // await raw Promise object, not await Promises.getPromise()
            // this is correct pattern
            const result1 = await promiseObj1;
            const result2 = await promiseObj2;
            const result3 = await promiseObj3;
            expect([result1, result2, result3]).toEqual(["ABC", "DEF", "GHI"]);
        })

        it("add 3 promsies, resolve all of them using Promises.resolvePromise(), use Promise.all()", async () => {
            const promises = new Promises();
            promises.appendPromise("p1",true,{}, undefined);
            promises.appendPromise("p2",true,{}, undefined);
            promises.appendPromise("p3",true,{}, undefined);
            // the raw Promise object are obtained here, no race condition occurs
            const promiseAll = Promise.all([promises.getPromise("p1"), promises.getPromise("p2"), promises.getPromise("p3")]);
            setTimeout(() => {
                promises.resolvePromise("p1", "ABC");
                promises.resolvePromise("p2", "DEF");
                promises.resolvePromise("p3", "GHI");
            }, 1000)
            const [result1, result2, result3] = await promiseAll;
            expect([result1, result2, result3]).toEqual(["ABC", "DEF", "GHI"]);
        })
    })

    describe("reject", () => {
        it("await a promsie, reject it after 1 second using Promises.rejectPromise()", async () => {
            const promises = new Promises();
            promises.appendPromise("p1",true,{}, undefined);
            const promiseObj = promises.getPromise("p1");
            setTimeout(() => {
                promises.rejectPromise("p1", "not ok");
            }, 1000)
            let errorCode = "";
            try {
                const result = await promiseObj;
                // the above expression never finishes, the "result" is never assigned
                console.log(result)
            } catch (e) {
                console.log(e);
                errorCode = `${e}`;
            }
            expect(errorCode).toBe("not ok");
        })

        it("await a promsie, reject it after 1 second directlyusing rejectFunc()", async () => {
            const promises = new Promises();
            promises.appendPromise("p1",true,{}, undefined);
            const promiseObj = promises.getPromise("p1");
            setTimeout(() => {
                const rejectFunc = promises.getRejectFunc("p1");
                rejectFunc("not ok");
            }, 1000)
            let errorCode = "";
            try {
                const result = await promiseObj;
                // the above expression never finishes, the "result" is never assigned
                console.log(result)
            } catch (e) {
                console.log(e);
                errorCode = `${e}`;
            }
            expect(errorCode).toBe("not ok");
        })

        it("await a promsie, reject it after 1 second directly using rejectFunc(), promise is not cleaned from promises", async () => {
            const promises = new Promises();
            promises.appendPromise("p1",true,{}, undefined);
            const promiseObj = promises.getPromise("p1");
            setTimeout(() => {
                const rejectFunc = promises.getRejectFunc("p1");
                rejectFunc("not ok");
            }, 1000)
            let errorCode = "";
            try {
                const result = await promiseObj;
                // the above expression never finishes, the "result" is never assigned
                console.log(result)
            } catch (e) {
                console.log(e);
                errorCode = `${e}`;
            }
            const promiseObj2 = promises.getPromise("p1");
            expect(promiseObj2).not.toBeUndefined();
        })

        it("add 3 promsies, resolve all of them using Promises.resolvePromise(), use Promise.all()", async () => {
            const promises = new Promises();
            promises.appendPromise("p1",true,{}, undefined);
            promises.appendPromise("p2",true,{}, undefined);
            promises.appendPromise("p3",true,{}, undefined);
            // the raw Promise object are obtained here, no race condition occurs
            const promiseAll = Promise.all([promises.getPromise("p1"), promises.getPromise("p2"), promises.getPromise("p3")]);
            setTimeout(() => {
                promises.resolvePromise("p1", "ABC");
                promises.resolvePromise("p2", "DEF");
                promises.resolvePromise("p3", "GHI");
            }, 1000)
            const [result1, result2, result3] = await promiseAll;
            expect([result1, result2, result3]).toEqual(["ABC", "DEF", "GHI"]);
        })


        it("replace an unresolved promise, the old one is rejected at the same time", async () => {
            const promises = new Promises();
            promises.appendPromise("p1",true,{}, undefined);
            const oldPromiseObj = promises.getPromise("p1");
            setTimeout(() => {
                // replace the old promise
                promises.appendPromise("p1",true,{}, undefined);
                // resolve new promise to let this test quit
                setTimeout(() => {
                    promises.resolvePromise("p1", "OKOKOK");
                })
            }, 1000)
            let errorCode = "";
            try {
                // await the old promise
                await oldPromiseObj;
            } catch (e) {
                errorCode = `${e}`;
            }
            expect(errorCode).toBe(PromisesCode["REJECT_REPLACED"]);
        })
    })

    describe("reject all", () => {
        it("add 3 promises, reject all", async () => {
            const promises = new Promises();
            promises.appendPromise("p1",true,{}, undefined);
            promises.appendPromise("p2",true,{}, undefined);
            promises.appendPromise("p3",true,{}, undefined);
            const promiseObj1 = promises.getPromise("p1");
            const promiseObj2 = promises.getPromise("p2");
            const promiseObj3 = promises.getPromise("p3");
            setTimeout(() => {
                promises.rejectAllPromises(PromisesCode["REJECT_ALL_REJECTED"]);
            }, 1000)
            let errorCode1 = "";
            let errorCode2 = "";
            let errorCode3 = "";
            // one await in each try-catch block
            try {
                await promiseObj1;
            } catch (e) {
                errorCode1 = `${e}`;
            }
            try {
                await promiseObj2;
            } catch (e) {
                errorCode2 = `${e}`;
            }
            try {
                await promiseObj3;
            } catch (e) {
                errorCode3 = `${e}`;
            }
            expect([errorCode1, errorCode2, errorCode3]).toEqual([PromisesCode["REJECT_ALL_REJECTED"], PromisesCode["REJECT_ALL_REJECTED"], PromisesCode["REJECT_ALL_REJECTED"]]);
        })

        it("add 3 promises, await in one try-catch, reject all: the 2nd and 3rd awaits are never awiated", async () => {
            const promises = new Promises();
            promises.appendPromise("p1",true,{}, undefined);
            promises.appendPromise("p2",true,{}, undefined);
            promises.appendPromise("p3",true,{}, undefined);
            const promiseObj1 = promises.getPromise("p1");
            const promiseObj2 = promises.getPromise("p2");
            const promiseObj3 = promises.getPromise("p3");
            setTimeout(() => {
                promises.rejectAllPromises(PromisesCode["REJECT_ALL_REJECTED"]);
            }, 1000)
            let errorCode = "";
            let errorCode1 = "";
            // multiple await in each try-catch block: inconsistency
            // promise 2 and 3 are never awaited
            try {
                await promiseObj1;
                // code below in this try-catch is never executed
                errorCode1 = "ABC";
                await promiseObj2;
                await promiseObj3;
            } catch (e) {
                errorCode = `${e}`;
            }
            expect([errorCode, errorCode1]).toEqual([PromisesCode["REJECT_ALL_REJECTED"], ""]);
        })
    })

    describe("timeout", () => {
        it("add a promise with countdown timeout, it is rejected after timeout", async () => {
            const promises = new Promises();
            promises.appendPromise("p1",true,{}, 1); // unit second
            const promiseObj = promises.getPromise("p1");
            let errorCode = "";
            try {
                await promiseObj;
            } catch (e) {
                errorCode = `${e}`;
            }
            expect(errorCode).toBe(PromisesCode["REJECT_TIMEOUT"]);
        })

        it("add a promise with countdown timeout, it is resolved before timeout", async () => {
            const promises = new Promises();
            promises.appendPromise("p1",true,{}, 1); // unit second
            const promiseObj = promises.getPromise("p1");
            setTimeout(() => {
                promises.resolvePromise("p1", "ok");
            }, 500);
            const result = await promiseObj;
            expect(result).toBe("ok");
        })


        it("add a promise with countdown timeout, it is rejected after timeout", async () => {
            const promises = new Promises();
            promises.appendPromise("p1",true,{}, 1); // unit second
            const promiseObj = promises.getPromise("p1");
            let errorCode = "";
            let result = "";
            setTimeout(() => {
                promises.resolvePromise("p1", "ok");
            }, 1500);
            try {
                result = await promiseObj;
            } catch (e) {
                errorCode = `${e}`;
            }
            expect([errorCode, result]).toEqual([PromisesCode["REJECT_TIMEOUT"], ""]);
        })

        it("add multiple promises, one has countdown timeout, it is rejected after timeout, but before others resolve", async () => {
            const promises = new Promises();
            promises.appendPromise("p1",true,{}, 1); // unit second
            promises.appendPromise("p2",true,{}, undefined);
            promises.appendPromise("p3",true,{}, undefined);
            const promiseObj1 = promises.getPromise("p1");
            const promiseObj2 = promises.getPromise("p2");
            const promiseObj3 = promises.getPromise("p3");
            let errorCode1 = "";
            let result2 = "";
            let result3 = "";
            setTimeout(() => {
                promises.resolvePromise("p2", "ok2");
                promises.resolvePromise("p3", "ok3");
            }, 1500);
            try {
                await promiseObj1;
            } catch (e) {
                errorCode1 = `${e}`;
            }
            result2 = await promiseObj2;
            result3 = await promiseObj3;
            expect([errorCode1, result2, result3]).toEqual([PromisesCode["REJECT_TIMEOUT"], "ok2", "ok3"]);
        })
        
        it("add multiple promises, one has countdown timeout, it is rejected after timeout, and after others resolve", async () => {
            const promises = new Promises();
            promises.appendPromise("p1",true,{}, 1); // unit second
            promises.appendPromise("p2",true,{}, undefined);
            promises.appendPromise("p3",true,{}, undefined);
            const promiseObj1 = promises.getPromise("p1");
            const promiseObj2 = promises.getPromise("p2");
            const promiseObj3 = promises.getPromise("p3");
            let errorCode1 = "";
            let result2 = "";
            let result3 = "";
            setTimeout(() => {
                promises.resolvePromise("p2", "ok2");
                promises.resolvePromise("p3", "ok3");
            }, 500);
            try {
                await promiseObj1;
            } catch (e) {
                errorCode1 = `${e}`;
            }
            result2 = await promiseObj2;
            result3 = await promiseObj3;
            expect([errorCode1, result2, result3]).toEqual([PromisesCode["REJECT_TIMEOUT"], "ok2", "ok3"]);
        })

    })
})
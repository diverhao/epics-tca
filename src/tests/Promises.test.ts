import { Promises } from "../Promises/Promises.js";


describe("Promises -- high-level manager for Promise", () => {
    describe("resolve", () => {

        it("init", () => {
            const promises = new Promises();
            const names = promises.getAllPromiseNames();
            expect(names.length).toBe(0);
        })
        it("add a new one", () => {
            const promises = new Promises();
            promises.appendPromise("p1", {}, undefined);
            const names = promises.getAllPromiseNames();
            expect(names).toEqual(["p1"]);
        })
        it("resolve a promise, resolvePromise returns true", () => {
            const promises = new Promises();
            promises.appendPromise("p1", {}, undefined);
            const success = promises.resolvePromise("p1", "ABC");
            expect(success).toBe(true);
        })
        it("resolve a non-existing promise, resolvePromise() returns false, nothing bad happens", () => {
            const promises = new Promises();
            promises.appendPromise("p1", {}, undefined);
            const success = promises.resolvePromise("p2", "ABC");
            expect(success).toBe(false);
        })

        it("await a promsie, resolve it after 1 seconds directly using Promises.resolvePromise()", async () => {
            const promises = new Promises();
            promises.appendPromise("p1", {}, undefined);
            const promiseObj = promises.getPromise("p1");
            setTimeout(() => {
                promises.resolvePromise("p1", "ABC");
            }, 1000)
            const result = await promiseObj;
            expect(result).toBe("ABC");
        })

        it("await a promsie, resolve it after 1 seconds directly using Promises.resolvePromise(). The promise is cleaned from promises", async () => {
            const promises = new Promises();
            promises.appendPromise("p1", {}, undefined);
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
            promises.appendPromise("p1", {}, undefined);
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
            promises.appendPromise("p1", {}, undefined);
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
            promises.appendPromise("p1", {}, undefined);
            const promiseObj = promises.getPromise("p1");
            setTimeout(() => {
                const promiesResolveFunc = promises.getResolveFunc("p1");
                promiesResolveFunc("ABC")
            }, 1000)
            const result = await promiseObj;
            const promiseObj2 = promises.getPromise("p1");
            expect(promiseObj2).not.toBeUndefined();
        })

        it("await a promsie, reject it after 1 second using Promises.rejectPromise()", async () => {
            const promises = new Promises();
            promises.appendPromise("p1", {}, undefined);
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
            promises.appendPromise("p1", {}, undefined);
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

        it("await a promsie, reject it after 1 second directlyusing rejectFunc(), but promise is not cleaned from promises", async () => {
            const promises = new Promises();
            promises.appendPromise("p1", {}, undefined);
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


        it("add 3 promsies, resolve all of them using Promises.resolvePromise(), race condition occurs", async () => {
            const promises = new Promises();
            promises.appendPromise("p1", {}, undefined);
            promises.appendPromise("p2", {}, undefined);
            promises.appendPromise("p3", {}, undefined);
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
            promises.appendPromise("p1", {}, undefined);
            promises.appendPromise("p2", {}, undefined);
            promises.appendPromise("p3", {}, undefined);
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
            promises.appendPromise("p1", {}, undefined);
            promises.appendPromise("p2", {}, undefined);
            promises.appendPromise("p3", {}, undefined);
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

        it("add 3 promsies, resolve all of them using Promises.resolvePromise(), use Promise.all()", async () => {
            const promises = new Promises();
            promises.appendPromise("p1", {}, undefined);
            promises.appendPromise("p2", {}, undefined);
            promises.appendPromise("p3", {}, undefined);
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
    //todo: timeout
})
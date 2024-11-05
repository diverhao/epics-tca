import { Context } from "../Context/Context"
import { Environment } from "../Global/Environment";


describe("PVA channel", () => {
    // it("print env -- inspect the PVA related entries", () => {
    //     const context = new Context();
    //     context.getEnvInstance().printAllEnvPretty();
    //     context.destroyHard();
    // })    

    // it("Context initialize and get", (done: jest.DoneCallback) => {
    //     const context = new Context();
    //     context.initialize().then(async () => {
    //         const channel = await context.createChannel("val1", "pva");
    //         await channel?.getPva();
    //         console.log(channel?.getPvaData());
    //     }).catch((e) => {
    //         console.log(e)
    //     })

    //     setTimeout(() => {
    //         context.destroyHard();
    //         done();
    //     }, 1000);
    // })


    // it("Context initialize and put", (done: jest.DoneCallback) => {
    //     const context = new Context();
    //     context.initialize().then(async () => {
    //         const channel = await context.createChannel("val1", "pva");
    //         // await channel?.putPva([100, 101, 105],[1]);
    //         // limit high
    //         await channel?.putPva({value: 22},[1]);
    //         console.log("result", await channel?.getPva());
    //     }).catch((e) => {
    //         console.log(e)
    //     })

    //     setTimeout(() => {
    //         context.destroyHard();
    //         done();
    //     }, 1000);
    // })


    // it("Context initialize and GET-THE-LAST-PUT", (done: jest.DoneCallback) => {
    //     const context = new Context();
    //     context.initialize().then(async () => {
    //         const channel = await context.createChannel("val1", "pva");
    //         await channel?.putPva({value: 27.2});
    //         setTimeout(async () => {
    //             const result = await channel?.getLastPutPva();
    //             console.log(result)
    //         }, 300)

    //     }).catch((e) => {
    //         console.log(e)
    //     })

    //     setTimeout(() => {
    //         context.destroyHard();
    //         done();
    //     }, 1000);
    // })


    it("Context initialize and GET-THE-LAST-GET", (done: jest.DoneCallback) => {
        const context = new Context();
        context.initialize().then(async () => {
            const channel = await context.createChannel("val1", "pva");
            await channel?.getPva();
            setTimeout(async () => {
                const result = await channel?.getLastGetPva();
                console.log(result)
            }, 200);

        }).catch((e) => {
            console.log(e)
        })

        setTimeout(() => {
            context.destroyHard();
            done();
        }, 1000);
    })




})
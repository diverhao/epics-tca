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


    it("Context initialize and put", (done: jest.DoneCallback) => {
        const context = new Context();
        context.initialize().then(async () => {
            const channel = await context.createChannel("val1", "pva");
            await channel?.putPva(22);
            // console.log(channel?.getPvaData());
        }).catch((e) => {
            console.log(e)
        })

        setTimeout(() => {
            // context.destroyHard();
            done();
        }, 10000);
    })


})
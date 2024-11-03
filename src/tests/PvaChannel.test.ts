import { Context } from "../Context/Context"
import { Environment } from "../Global/Environment";


describe("PVA channel", () => {
    // it("print env -- inspect the PVA related entries", () => {
    //     const context = new Context();
    //     context.getEnvInstance().printAllEnvPretty();
    //     context.destroyHard();
    // })    

    it("Context initialize", (done: jest.DoneCallback) => {
        const context = new Context();
        context.initialize().then(async () => {
            const channel = await context.createChannel("val1", "pva");
            channel?.getPva();
        }).catch((e) => {
            console.log(e)
        })

        setTimeout(() => {
            context.destroyHard();
            done();
        }, 15000);
    })


})
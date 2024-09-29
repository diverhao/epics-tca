import { Environment } from "../Global/Environment";


describe("Environment", () => {
    it("Environment should be a singleton", () => {
        const environment1 = Environment.getInstance();
        const environment2 = Environment.getInstance();
        expect(environment1).toBe(environment2);
    });

    describe("EPICS_CA_ADDR_LIST -- string[] type", () => {

        it("EPICS_CA_ADDR_LIST -- single element", () => {
            // must destroy first
            Environment.destroyHard();
            const environment = Environment.getInstance({
                EPICS_CA_ADDR_LIST: "10.1.20.200"
            });
            const result = environment.getEnv("EPICS_CA_ADDR_LIST");
            expect(result).toEqual(["10.1.20.200"]);
        });

        it("EPICS_CA_ADDR_LIST -- multiple elements", () => {
            // must destroy first
            Environment.destroyHard();
            const environment = Environment.getInstance({
                EPICS_CA_ADDR_LIST: "10.1.20.200, 1.2.3.4 5.6.7.8"
            });
            const result = environment.getEnv("EPICS_CA_ADDR_LIST");
            expect(result).toEqual(["10.1.20.200", "1.2.3.4", "5.6.7.8"]);
        })


        it("EPICS_CA_ADDR_LIST, invalid input with [], fallback to default", () => {
            // must destroy first
            Environment.destroyHard();
            const environment = Environment.getInstance({
                EPICS_CA_ADDR_LIST: "[10.1.20.200, 1.2.3.4 5.6.7.8]"
            });
            const result1 = environment.getEnv("EPICS_CA_ADDR_LIST");
            expect(result1).toEqual(["localhost"]);
            const result2 = environment.getEnvSource("EPICS_CA_ADDR_LIST");
            expect(result2).toEqual("default");
        })

        it("EPICS_CA_ADDR_LIST -- ignore user-defined variable", () => {
            // must destroy first
            Environment.destroyHard();
            process.env.EPICS_CA_ADDR_LIST = "192.168.0.1 192.168.0.2"
            const environment = Environment.getInstance({
                EPICS_CA_ADDR_LIST: "10.1.20.200, 1.2.3.4 5.6.7.8"
            }, {
                ignoreUserEnv: true,
            });
            const result = environment.getEnv("EPICS_CA_ADDR_LIST");
            expect(result).toEqual(["192.168.0.1", "192.168.0.2"]);
        })

        it("EPICS_CA_ADDR_LIST -- ignore os-defined variable, user-defined is present", () => {
            // must destroy first
            Environment.destroyHard();
            process.env.EPICS_CA_ADDR_LIST = "192.168.0.1 192.168.0.2"
            const environment = Environment.getInstance({
                EPICS_CA_ADDR_LIST: "10.1.20.200, 1.2.3.4 5.6.7.8"
            }, {
                ignoreOsEnv: true,
            });
            const result = environment.getEnv("EPICS_CA_ADDR_LIST");
            expect(result).toEqual(["10.1.20.200", "1.2.3.4", "5.6.7.8"]);
        })

        it("EPICS_CA_ADDR_LIST -- ignore os-defined variable, no user-defined variable", () => {
            // must destroy first
            Environment.destroyHard();
            process.env.EPICS_CA_ADDR_LIST = "192.168.0.1 192.168.0.2"
            const environment = Environment.getInstance({}, {
                ignoreOsEnv: true,
            });
            const result = environment.getEnv("EPICS_CA_ADDR_LIST");
            expect(result).toEqual(["localhost"]);
        })

        it("EPICS_CA_ADDR_LIST -- ignore os- and user-defined variable", () => {
            // must destroy first
            Environment.destroyHard();
            process.env.EPICS_CA_ADDR_LIST = "192.168.0.1 192.168.0.2"
            const environment = Environment.getInstance({
                EPICS_CA_ADDR_LIST: "10.1.20.200, 1.2.3.4 5.6.7.8"
            }, {
                ignoreOsEnv: true,
                ignoreUserEnv: true,
            });
            const result = environment.getEnv("EPICS_CA_ADDR_LIST");
            expect(result).toEqual(["localhost"]);
        })

        it("EPICS_CA_ADDR_LIST -- invalid user-defined IPs, fallback to default IPs", () => {
            // must destroy first
            Environment.destroyHard();
            // unset OS definition
            delete process.env.EPICS_CA_ADDR_LIST;
            const environment = Environment.getInstance({
                EPICS_CA_ADDR_LIST: "1.2.3.4.5"
            });
            const result1 = environment.getEnv("EPICS_CA_ADDR_LIST");
            expect(result1).toEqual(["localhost"]);
            const result2 = environment.getEnvSource("EPICS_CA_ADDR_LIST");
            expect(result2).toBe("default");
        })

        it("EPICS_CA_ADDR_LIST -- invalid os-defined IPs, fallback to default IPs", () => {
            // must destroy first
            Environment.destroyHard();
            // unset OS definition
            process.env.EPICS_CA_ADDR_LIST = "1.2.3.4.5";
            const environment = Environment.getInstance({
                EPICS_CA_ADDR_LIST: "1.2.3.4.5"
            }, {
                ignoreUserEnv: true,
            });
            const result1 = environment.getEnv("EPICS_CA_ADDR_LIST");
            expect(result1).toEqual(["localhost"]);
            const result2 = environment.getEnvSource("EPICS_CA_ADDR_LIST");
            expect(result2).toBe("default");
        })

        it("EPICS_CA_ADDR_LIST -- invalid user-defined array", () => {
            // must destroy first
            Environment.destroyHard();
            // unset OS definition
            delete process.env.EPICS_CA_ADDR_LIST;
            const environment = Environment.getInstance({
                EPICS_CA_ADDR_LIST: "1.2.3.4; 5.6.7.8"
            });
            const result1 = environment.getEnv("EPICS_CA_ADDR_LIST");
            expect(result1).toEqual(["localhost"]);
            const result2 = environment.getEnvSource("EPICS_CA_ADDR_LIST");
            expect(result2).toBe("default");
        })
    })

    describe("EPICS_CA_AUTO_ADDR_LIST -- string type", () => {
        it("result is always Yes or No, with proper capitalization", () => {
            // must destroy first
            Environment.destroyHard();
            const environment = Environment.getInstance({
                EPICS_CA_AUTO_ADDR_LIST: "yEs"
            });
            const result1 = environment.getEnv("EPICS_CA_AUTO_ADDR_LIST");
            expect(result1).toBe("Yes");
        })

        it("invalid user input -- fall back to default", () => {
            // must destroy first
            Environment.destroyHard();
            const environment = Environment.getInstance({
                EPICS_CA_AUTO_ADDR_LIST: "abc"
            });
            const result1 = environment.getEnv("EPICS_CA_AUTO_ADDR_LIST");
            expect(result1).toBe("Yes");
            const result2 = environment.getEnvSource("EPICS_CA_AUTO_ADDR_LIST");
            expect(result2).toBe("default");
        })

        it("invalid user input -- fall back to os", () => {
            // must destroy first
            Environment.destroyHard();
            process.env.EPICS_CA_AUTO_ADDR_LIST = "no";
            const environment = Environment.getInstance({
                EPICS_CA_AUTO_ADDR_LIST: "abc"
            });
            const result1 = environment.getEnv("EPICS_CA_AUTO_ADDR_LIST");
            expect(result1).toBe("No");
            const result2 = environment.getEnvSource("EPICS_CA_AUTO_ADDR_LIST");
            expect(result2).toBe("os");
        })

        it("invalid user and os input -- fall back to default", () => {
            // must destroy first
            Environment.destroyHard();
            process.env.EPICS_CA_AUTO_ADDR_LIST = "nono";
            const environment = Environment.getInstance({
                EPICS_CA_AUTO_ADDR_LIST: "yesyes"
            });
            const result1 = environment.getEnv("EPICS_CA_AUTO_ADDR_LIST");
            expect(result1).toBe("Yes");
            const result2 = environment.getEnvSource("EPICS_CA_AUTO_ADDR_LIST");
            expect(result2).toBe("default");
        })


        it("ignore user-defined, and invalid os-defined -- fallback to default", () => {
            // must destroy first
            Environment.destroyHard();
            process.env.EPICS_CA_AUTO_ADDR_LIST = "nono";
            const environment = Environment.getInstance({
                EPICS_CA_AUTO_ADDR_LIST: "no"
            }, {
                ignoreUserEnv: true,
            });
            const result1 = environment.getEnv("EPICS_CA_AUTO_ADDR_LIST");
            expect(result1).toBe("Yes");
            const result2 = environment.getEnvSource("EPICS_CA_AUTO_ADDR_LIST");
            expect(result2).toBe("default");
        })

        it("no user-defined, has a valid os-defined -- fallback to os", () => {
            // must destroy first
            Environment.destroyHard();
            process.env.EPICS_CA_AUTO_ADDR_LIST = "nO";
            const environment = Environment.getInstance({
            });
            const result1 = environment.getEnv("EPICS_CA_AUTO_ADDR_LIST");
            expect(result1).toBe("No");
            const result2 = environment.getEnvSource("EPICS_CA_AUTO_ADDR_LIST");
            expect(result2).toBe("os");
        })

        it("no user-defined, and invalid os-defined -- fallback to default", () => {
            // must destroy first
            Environment.destroyHard();
            process.env.EPICS_CA_AUTO_ADDR_LIST = "nono";
            const environment = Environment.getInstance({
            });
            const result1 = environment.getEnv("EPICS_CA_AUTO_ADDR_LIST");
            expect(result1).toBe("Yes");
            const result2 = environment.getEnvSource("EPICS_CA_AUTO_ADDR_LIST");
            expect(result2).toBe("default");
        })

        it("no user-defined, and ignore os-defined -- fallback to default", () => {
            // must destroy first
            Environment.destroyHard();
            process.env.EPICS_CA_AUTO_ADDR_LIST = "nono";
            const environment = Environment.getInstance({
            }, {
                ignoreOsEnv: true,
            });
            const result1 = environment.getEnv("EPICS_CA_AUTO_ADDR_LIST");
            expect(result1).toBe("Yes");
            const result2 = environment.getEnvSource("EPICS_CA_AUTO_ADDR_LIST");
            expect(result2).toBe("default");
        })
    })

    describe("EPICS_CA_CONN_TMO -- number type", () => {
        it("default value", () => {
            // must destroy first
            Environment.destroyHard();
            delete process.env.EPICS_CA_CONN_TMO;
            const environment = Environment.getInstance({
            });
            const result1 = environment.getEnv("EPICS_CA_CONN_TMO");
            expect(result1).toBe(30);
            const result2 = environment.getEnvSource("EPICS_CA_CONN_TMO");
            expect(result2).toBe("default");
        })

        it("user-defined value", () => {
            // must destroy first
            Environment.destroyHard();
            delete process.env.EPICS_CA_CONN_TMO;
            const environment = Environment.getInstance({
                EPICS_CA_CONN_TMO: "31", // must be a string!
            });
            const result1 = environment.getEnv("EPICS_CA_CONN_TMO");
            expect(result1).toBe(31);
            const result2 = environment.getEnvSource("EPICS_CA_CONN_TMO");
            expect(result2).toBe("user");
        })

        it("invalid user-defined value, cannot parse float -- fallback to default", () => {
            // must destroy first
            Environment.destroyHard();
            delete process.env.EPICS_CA_CONN_TMO;
            const environment = Environment.getInstance({
                EPICS_CA_CONN_TMO: "aldk", // must be a string!
            });
            const result1 = environment.getEnv("EPICS_CA_CONN_TMO");
            expect(result1).toBe(30);
            const result2 = environment.getEnvSource("EPICS_CA_CONN_TMO");
            expect(result2).toBe("default");
        })

        it("invalid user-defined value, cannot parse float -- fallback to os", () => {
            // must destroy first
            Environment.destroyHard();
            process.env.EPICS_CA_CONN_TMO = "55";
            const environment = Environment.getInstance({
                EPICS_CA_CONN_TMO: "aldk", // must be a string!
            });
            const result1 = environment.getEnv("EPICS_CA_CONN_TMO");
            expect(result1).toBe(55);
            const result2 = environment.getEnvSource("EPICS_CA_CONN_TMO");
            expect(result2).toBe("os");
        })

        it("invalid os- and user-defined value -- fallback to default", () => {
            // must destroy first
            Environment.destroyHard();
            process.env.EPICS_CA_CONN_TMO = "aaaa";
            const environment = Environment.getInstance({
                EPICS_CA_CONN_TMO: "aldk", // must be a string!
            });
            const result1 = environment.getEnv("EPICS_CA_CONN_TMO");
            expect(result1).toBe(30);
            const result2 = environment.getEnvSource("EPICS_CA_CONN_TMO");
            expect(result2).toBe("default");
        })

        it("valid but not good user-defined value", () => {
            // must destroy first
            Environment.destroyHard();
            delete process.env.EPICS_CA_CONN_TMO;
            const environment = Environment.getInstance({
                EPICS_CA_CONN_TMO: "37a",
            });
            const result1 = environment.getEnv("EPICS_CA_CONN_TMO");
            expect(result1).toBe(37);
            const result2 = environment.getEnvSource("EPICS_CA_CONN_TMO");
            expect(result2).toBe("user");
        })

    })

    describe("multiple user-defined variables", () => {
        it("3 user-defined variables", () => {
            // must destroy first
            Environment.destroyHard();
            const environment = Environment.getInstance({
                EPICS_CA_ADDR_LIST: "1.2.3.4, 5.6.7.8,",
                EPICS_CA_AUTO_ADDR_LIST: "NO",
                EPICS_CA_CONN_TMO: "37",
            });
            const result1 = environment.getEnv("EPICS_CA_ADDR_LIST");
            expect(result1).toEqual(["1.2.3.4", "5.6.7.8"]);
            const result2 = environment.getEnv("EPICS_CA_CONN_TMO");
            expect(result2).toBe(37);
            const result3 = environment.getEnv("EPICS_CA_AUTO_ADDR_LIST");
            expect(result3).toBe("No");
        })

        it("3 user-defined variables, one is invalid, it falls back to default", () => {
            // must destroy first
            Environment.destroyHard();
            const environment = Environment.getInstance({
                EPICS_CA_ADDR_LIST: "1.2.3.4, 5.6.7.8,",
                EPICS_CA_AUTO_ADDR_LIST: "nono",
                EPICS_CA_CONN_TMO: "37",
            });
            const result1 = environment.getEnv("EPICS_CA_ADDR_LIST");
            expect(result1).toEqual(["1.2.3.4", "5.6.7.8"]);
            const result2 = environment.getEnv("EPICS_CA_CONN_TMO");
            expect(result2).toBe(37);
            const result3 = environment.getEnv("EPICS_CA_AUTO_ADDR_LIST");
            expect(result3).toBe("Yes");
            const result4 = environment.getEnvSource("EPICS_CA_AUTO_ADDR_LIST");
            expect(result4).toBe("default");
        })
        
        it("3 user-defined variables, 1 os-defined variable, ignore user-defined", () => {
            // must destroy first
            Environment.destroyHard();
            process.env.EPICS_CA_CONN_TMO = "99";
            const environment = Environment.getInstance({
                EPICS_CA_ADDR_LIST: "1.2.3.4, 5.6.7.8,",
                EPICS_CA_AUTO_ADDR_LIST: "Yes",
                EPICS_CA_CONN_TMO: "37",
            }, {
                ignoreUserEnv: true,
            });
            const result1 = environment.getEnv("EPICS_CA_ADDR_LIST");
            expect(result1).toEqual(["localhost"]);
            const result2 = environment.getEnv("EPICS_CA_CONN_TMO");
            expect(result2).toBe(99);
            const result3 = environment.getEnv("EPICS_CA_AUTO_ADDR_LIST");
            expect(result3).toBe("Yes");
            const result4 = environment.getEnvSource("EPICS_CA_CONN_TMO");
            expect(result4).toBe("os");
            const result5 = environment.getEnvSource("EPICS_CA_AUTO_ADDR_LIST");
            expect(result5).toBe("default");
        })

        
        it("3 user-defined variables, 1 os-defined variable, ignore user- and os-defined", () => {
            // must destroy first
            Environment.destroyHard();
            process.env.EPICS_CA_CONN_TMO = "99";
            const environment = Environment.getInstance({
                EPICS_CA_ADDR_LIST: "1.2.3.4, 5.6.7.8,",
                EPICS_CA_AUTO_ADDR_LIST: "Yes",
                EPICS_CA_CONN_TMO: "37",
            }, {
                ignoreUserEnv: true,
                ignoreOsEnv: true,
            });
            const result1 = environment.getEnv("EPICS_CA_ADDR_LIST");
            expect(result1).toEqual(["localhost"]);
            const result2 = environment.getEnv("EPICS_CA_CONN_TMO");
            expect(result2).toBe(30);
            const result3 = environment.getEnv("EPICS_CA_AUTO_ADDR_LIST");
            expect(result3).toBe("Yes");
            const result4 = environment.getEnvSource("EPICS_CA_CONN_TMO");
            expect(result4).toBe("default");
            const result5 = environment.getEnvSource("EPICS_CA_AUTO_ADDR_LIST");
            expect(result5).toBe("default");
        })

        it("3 user-defined variables, 1 os-defined variable, ignore user- and os-defined", () => {
            // must destroy first
            Environment.destroyHard();
            process.env.EPICS_CA_CONN_TMO = "99";
            const environment = Environment.getInstance({
                EPICS_CA_ADDR_LIST: "1.2.3.4, 5.6.7.8,",
                EPICS_CA_AUTO_ADDR_LIST: "Yes",
                EPICS_CA_CONN_TMO: "37",
            }, {
                ignoreUserEnv: true,
                ignoreOsEnv: true,
            });
            const result1 = environment.getEnv("EPICS_CA_ADDR_LIST");
            expect(result1).toEqual(["localhost"]);
            const result2 = environment.getEnv("EPICS_CA_CONN_TMO");
            expect(result2).toBe(30);
            const result3 = environment.getEnv("EPICS_CA_AUTO_ADDR_LIST");
            expect(result3).toBe("Yes");
            const result4 = environment.getEnvSource("EPICS_CA_CONN_TMO");
            expect(result4).toBe("default");
            const result5 = environment.getEnvSource("EPICS_CA_AUTO_ADDR_LIST");
            expect(result5).toBe("default");
        })

    })


})




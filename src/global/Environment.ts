import { GlobalMethods } from "./GlobalMethods";

export interface type_environment_options extends Record<string, any> {
    ignoreOsEnv: boolean;
    ignoreUserEnv: boolean;
    skipLocalhost: boolean;
}

/**
 * Allowed environment names
 */
export const environmentNames =
    [
        // epics
        "EPICS_CA_ADDR_LIST",
        "EPICS_CA_AUTO_ADDR_LIST",
        "EPICS_CA_NAME_SERVERS",
        "EPICS_CA_CONN_TMO",
        "EPICS_CA_BEACON_PERIOD",
        "EPICS_CA_REPEATER_PORT",
        "EPICS_CA_SERVER_PORT",
        "EPICS_CA_MAX_ARRAY_BYTES",
        "EPICS_CA_MAX_SEARCH_PERIOD",
        "EPICS_TS_MIN_WEST",
        // tca
        "EPICS_CA_MIN_SEARCH_PERIOD",
        "EPICS_CA_GET_TIMEOUT_DEFAUTL",
        "EPICS_CA_SCHEDULING_PRIORITY_DEFAULT",
        "EPICS_CA_TCP_RE_SEARCH_CHAN_TIMESPAN",
        "EPICS_CA_TCP_RE_SEARCH_CHAN_TIMEOUT",
        "EPICS_CA_REPEATER_REGISTER_TIMEOUT",
        "EPICS_CA_TCP_INACTIVE_TIMEOUT",
        "EPICS_CA_BEACON_TIMEOUT",
        "EPICS_CA_MAX_UDP_BUFFER",
        "EPICS_CA_REPEATER_CLIENT_CHECK_TIME",
    ];

export type type_environment_name = typeof environmentNames[number];

export type type_environment_value = string | number | string[] | number[];

/**
 * Singleton class, crate by Environment.getInstance()
 * 
 * 3 levels of environment variables from low to high: default -- OS -- user
 * 
 * It defines the default environment values and reads OS- and user-defined environment variables.
 * 
 * If the environment variable is not explicitly defined, then its value is undefined.
 * Then this variable goes back to the lower level one, until the default value.
 * 
 * If the environment variable is explicitly defined, but the value is illegal, e.g. EPICS_CA_CONN_TMO = "abcd"
 * this value should be ignored, as if it is not defined.
 * 
 * @param {Record<string, string>} userEnv The user defined environment. Note the array type must be like "123, 456" or
 *                                         "abc, def", without square brackets
 * 
 */
export class Environment {
    // raw input from user's env
    private readonly envUserRaw: Record<string, string>;
    private readonly envOsRaw: Record<string, string> = {};
    // envOs, envUser, and envDefault
    private readonly envOs: Partial<Record<type_environment_name, type_environment_value>> = {};
    private readonly envUser: Partial<Record<type_environment_name, type_environment_value>> = {};
    /**
     * default environment values
     * 
     * These values must match the above type_env
     */
    private readonly envDefault: Record<type_environment_name, type_environment_value> = {
        // epics environment, defined in https://epics.anl.gov/base/R3-14/12-docs/CAref.html
        EPICS_CA_ADDR_LIST: ["localhost"],
        EPICS_CA_AUTO_ADDR_LIST: "Yes",
        EPICS_CA_NAME_SERVERS: [],
        EPICS_CA_CONN_TMO: 30, // if the client has not seen beacon from server after this time, sends out an echo
        EPICS_CA_BEACON_PERIOD: 15, // used by server
        EPICS_CA_REPEATER_PORT: 5065, // CA repeater listens to this port for server beacon
        EPICS_CA_SERVER_PORT: 5064, // used by server
        EPICS_CA_MAX_ARRAY_BYTES: 16384, // not important
        EPICS_CA_MAX_SEARCH_PERIOD: 300, // name search plateau rate
        EPICS_TS_MIN_WEST: 360,
        // custom epics-related environments in epics-tca
        EPICS_CA_MIN_SEARCH_PERIOD: 0.1, // second, counter part of EPICS_CA_MAX_SEARCH_PERIOD
        EPICS_CA_GET_TIMEOUT_DEFAUTL: 2, // second
        EPICS_CA_SCHEDULING_PRIORITY_DEFAULT: 1,
        EPICS_CA_TCP_RE_SEARCH_CHAN_TIMESPAN: 2, // 2 second, 2 seconds span * random(0,1)
        EPICS_CA_TCP_RE_SEARCH_CHAN_TIMEOUT: 0.2, // when TCPTransport is destroyed, wait until re-search a channel
        EPICS_CA_REPEATER_REGISTER_TIMEOUT: 1, // send CA_REPEATER every second
        EPICS_CA_TCP_INACTIVE_TIMEOUT: 30, // > twice of EPICS_CA_BEACON_PERIOD
        EPICS_CA_BEACON_TIMEOUT: 30, // > twice of EPICS_CA_BEACON_PERIOD
        EPICS_CA_MAX_UDP_BUFFER: 1024,
        EPICS_CA_REPEATER_CLIENT_CHECK_TIME: 20, // 20 seconds
    };

    options: type_environment_options = {
        ignoreOsEnv: false,
        ignoreUserEnv: false,
        skipLocalhost: false,
    };
    // the final environment variables including all above 
    env: Record<string, type_environment_value> = {};

    private constructor(envUserRaw: Record<string, string>, options: Partial<type_environment_options>) {

        for (const optionName in this.options) {
            if (options[optionName] !== undefined && typeof options[optionName] === typeof this.options[optionName]) {
                this.options[optionName] = options[optionName];
            }
        }
        if (this.options.ignoreOsEnv) {
            GlobalMethods.infoLog("Operating system defined environments are ignored.");
        }
        if (this.options.ignoreUserEnv) {
            GlobalMethods.infoLog("User-defined environments are ignored.");
        }
        if (this.options.skipLocalhost) {
            GlobalMethods.infoLog("The localhost is skipped in EPICS_CA_ADDR_LIST.");
        }

        // get envUserRaw and envOsRaw
        this.envUserRaw = envUserRaw;
        for (let envName of environmentNames) {
            const envValueRaw = process.env[envName];
            if (envValueRaw !== undefined) {
                this.envOsRaw[envName] = envValueRaw;
            }
        }

        for (let envName of environmentNames) {
            try {
                // read user-defined environment variables
                let valueFromUser = this.readOneEnv(envName, "user");
                if (valueFromUser !== undefined) {
                    this.envUser[envName] = valueFromUser;
                }
                // read os-defined environment variables
                let valueFromOS = this.readOneEnv(envName, "os");
                if (valueFromOS !== undefined) {
                    this.envOs[envName] = valueFromOS;
                }
            } catch (e) {
                GlobalMethods.infoLog(e);
            }
        }

        this.generateEnv();
    }
    // -------------------------- singleton class -------------------

    private static instance: Environment | undefined;

    public static getInstance = (userEnv: Record<string, string> = {}, options: Partial<type_environment_options> = {}) => {
        if (!Environment.instance) {
            Environment.instance = new Environment(userEnv, options);
        }
        return Environment.instance;
    };

    // ----------------------- types value --------------------------------
    /**
     * environment types
     */
    private type_env: Record<type_environment_name, "number" | "number[]" | "string" | "string[]"> = {
        // epics 
        EPICS_CA_ADDR_LIST: "string[]",
        EPICS_CA_AUTO_ADDR_LIST: "string",
        EPICS_CA_NAME_SERVERS: "string[]",
        EPICS_CA_CONN_TMO: "number",
        EPICS_CA_BEACON_PERIOD: "number",
        EPICS_CA_REPEATER_PORT: "number",
        EPICS_CA_SERVER_PORT: "number",
        EPICS_CA_MAX_ARRAY_BYTES: "number",
        EPICS_CA_MAX_SEARCH_PERIOD: "number",
        EPICS_TS_MIN_WEST: "number",
        // epics-tca specific
        EPICS_CA_MIN_SEARCH_PERIOD: "number",
        EPICS_CA_GET_TIMEOUT_DEFAUTL: "number", // second
        EPICS_CA_SCHEDULING_PRIORITY_DEFAULT: "number",
        EPICS_CA_TCP_RE_SEARCH_CHAN_TIMESPAN: "number", // 2 second, 2 seconds span * random(0,1)
        EPICS_CA_TCP_RE_SEARCH_CHAN_TIMEOUT: "number", // when TCPTransport is destroyed, wait until re-search a channel
        EPICS_CA_REPEATER_REGISTER_TIMEOUT: "number", // send CA_REPEATER every second
        EPICS_CA_TCP_INACTIVE_TIMEOUT: "number", // > twice of EPICS_CA_BEACON_PERIOD
        EPICS_CA_BEACON_TIMEOUT: "number", // > twice of EPICS_CA_BEACON_PERIOD
        EPICS_CA_MAX_UDP_BUFFER: "number",
        EPICS_CA_REPEATER_CLIENT_CHECK_TIME: "number",
    };


    /**
     * default source of environment
     */
    private envSource: Record<type_environment_name, "user" | "os" | "default"> = {
        // epics environments
        EPICS_CA_ADDR_LIST: "default",
        EPICS_CA_AUTO_ADDR_LIST: "default",
        EPICS_CA_NAME_SERVERS: "default",
        EPICS_CA_CONN_TMO: "default",
        EPICS_CA_BEACON_PERIOD: "default",
        EPICS_CA_REPEATER_PORT: "default",
        EPICS_CA_SERVER_PORT: "default",
        EPICS_CA_MAX_ARRAY_BYTES: "default",
        EPICS_CA_MAX_SEARCH_PERIOD: "default",
        EPICS_TS_MIN_WEST: "default",
        // custom environments specifically in epics-tca
        EPICS_CA_MIN_SEARCH_PERIOD: "default",
        EPICS_CA_GET_TIMEOUT_DEFAUTL: "default",
        EPICS_CA_SCHEDULING_PRIORITY_DEFAULT: "default",
        EPICS_CA_TCP_RE_SEARCH_CHAN_TIMESPAN: "default",
        EPICS_CA_TCP_RE_SEARCH_CHAN_TIMEOUT: "default",
        EPICS_CA_REPEATER_REGISTER_TIMEOUT: "default",
        EPICS_CA_TCP_INACTIVE_TIMEOUT: "default",
        EPICS_CA_BEACON_TIMEOUT: "default",
        EPICS_CA_MAX_UDP_BUFFER: "default",
        EPICS_CA_REPEATER_CLIENT_CHECK_TIME: "default",
    };

    // --------------- validate and read one environment variable -----------------
    private validateIPaddress(ipaddress: string) {
        if (
            /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
                ipaddress
            )
        ) {
            return true;
        }
        return false;
    }

    private validateDomain(domain: string) {
        const regexp = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
        // dealing with "ics-srv-softioc9", "localhost"
        const regexp2 = /^[a-zA-Z0-9-]+$/;
        if (regexp.test(domain)) {
            return true;
        } else if (regexp2.test(domain)) {
            return true;
        }
        return false;
    }

    // private addOptionToEnvValue = (envName: string): void => {
    //     switch (envName) {
    //         case "EPICS_CA_ADDR_LIST":
    //             // if the "localhost" is skipped
    //             if (this.options.skipLocalhost) {
    //                 const index = (this.env[envName] as string[]).indexOf("localhost");
    //                 if (index > -1) {
    //                     (this.env[envName] as string[]).splice(index, 1);
    //                 }
    //             }

    //             break;
    //     }
    // };

    isStringArray = (value: any): boolean => {
        return Array.isArray(value) && value.every(item => typeof item === 'string');
    }

    isNumberArray = (value: any): boolean => {
        return Array.isArray(value) && value.every(item => typeof item === 'number');
    }

    isValidEnvironmentName = (name: string) => {
        return environmentNames.includes(name);
    }

    /**
     * check if an environment variable is valid for EPICS or TCA to use
     * 
     * returns true if the value is valid
     */
    private validateEnvValue = (envName: type_environment_name, envValue: string | number | string[] | number[] | undefined): boolean => {
        if (envValue === undefined) {
            GlobalMethods.infoLog(`Invalid value ${envValue} for environment variable ${envName}`);
            return false;
        }
        if (!this.isValidEnvironmentName(envName)) {
            GlobalMethods.infoLog(`Invalid environment name ${envName}`);
            return false;
        }

        let errorMessage: string = "";
        switch (envName) {
            case "EPICS_CA_ADDR_LIST": // epics
            case "EPICS_CA_NAME_SERVERS": // epics
                if (this.isStringArray(envValue)) {
                    for (const ipAddress of envValue as string[]) {
                        if (!this.validateIPaddress(ipAddress) && !this.validateDomain(ipAddress)) {
                            errorMessage = "must be a valid IP address or host name separated by space or comma.";
                        }
                    }
                } else {
                    errorMessage = "must be a string array";
                }
                break;
            case "EPICS_CA_AUTO_ADDR_LIST": // epics
                if (typeof envValue === "string") {
                    if (envValue.toUpperCase() !== "YES" && envValue.toUpperCase() !== "NO") {
                        errorMessage = "must be Yes or No.";
                    }
                } else {
                    errorMessage = "must be a string.";
                }
                break;
            case "EPICS_CA_CONN_TMO": // epics, server beacon timeout, nominal value is 30 s
            case "EPICS_CA_BEACON_PERIOD": // epics, max server beacon period
                if (typeof envValue === "number") {
                    if (envValue < 0.1 || Number.isNaN(envValue)) {
                        errorMessage = "must be > 0.1 s";
                    }
                } else {
                    errorMessage = "must be a number that > 0.1 s"
                }
                break;
            case "EPICS_CA_REPEATER_PORT": // epics
            case "EPICS_CA_SERVER_PORT": // epics
                // must be an integer between 5000 and 65535
                if (typeof envValue === "number") {
                    if (
                        envValue <= 5000 ||
                        envValue > 65535 ||
                        envValue - Math.floor(envValue) > 0.00001 ||
                        Number.isNaN(envValue)
                    ) {
                        errorMessage = "must be > 5000 and < 65535";
                    }
                } else {
                    errorMessage = "must be a number > 5000 and < 65535"
                }
                break;
            case "EPICS_CA_MAX_ARRAY_BYTES": // epics
                // must be an integer >= 16384
                if (typeof envValue === "number") {
                    if (
                        envValue < 1 ||
                        envValue - Math.floor(envValue) > 0.00001 ||
                        Number.isNaN(envValue as number)
                    ) {
                        errorMessage = "must be an integer > 0";
                    }
                } else {
                    errorMessage = "must be an integer";
                }
                break;
            case "EPICS_CA_MAX_SEARCH_PERIOD": // tca 
                // must be an integer larger than 60 seconds
                if (typeof envValue === "number") {
                    if (
                        envValue < 60 ||
                        envValue - Math.floor(envValue) > 0.00001 ||
                        Number.isNaN(envValue)
                    ) {
                        errorMessage = "must be > 60 s";
                    }
                } else {
                    errorMessage = "must be a number > 60 s";
                }
                break;
            case "EPICS_TS_MIN_WEST":
                // must be an integer between -720 and 720 minutes
                if (typeof envValue === "number") {
                    if (
                        envValue < -720 ||
                        envValue > 720 ||
                        envValue - Math.floor(envValue) > 0.00001 ||
                        Number.isNaN(envValue)
                    ) {
                        errorMessage = "must be between -720 and 720";
                    }
                } else {
                    errorMessage = "must be between a number -720 and 720";
                }
                break;
            case "EPICS_CA_MIN_SEARCH_PERIOD": // tca
            case "EPICS_CA_GET_TIMEOUT_DEFAUTL": // tca
            case "EPICS_CA_TCP_RE_SEARCH_CHAN_TIMESPAN": // tca
            case "EPICS_CA_TCP_RE_SEARCH_CHAN_TIMEOUT": // tca
            case "EPICS_CA_REPEATER_REGISTER_TIMEOUT": // tca
            case "EPICS_CA_TCP_INACTIVE_TIMEOUT": // tca
            case "EPICS_CA_BEACON_TIMEOUT": // tca
            case "EPICS_CA_REPEATER_CLIENT_CHECK_TIME": // tca
                if (typeof envValue === "number") {
                    if (envValue < 0.05 || envValue > 60 || Number.isNaN(envValue)) {
                        errorMessage = "must be between 0.05 and 60";
                    }
                } else {
                    errorMessage = "must be between a number 0.05 and 60";
                }
                break;
            case "EPICS_CA_SCHEDULING_PRIORITY_DEFAULT": // tca
                if (typeof envValue === "number") {
                    if (
                        envValue < 0 ||
                        envValue > 100 ||
                        envValue - Math.floor(envValue) > 0.00001 ||
                        Number.isNaN(envValue)
                    ) {
                        errorMessage = "must be between 0 and 100";
                    }
                } else {
                    errorMessage = "must be a number between 0 and 100";
                }
                break;
            case "EPICS_CA_MAX_UDP_BUFFER": // tca
                if (typeof envValue === "number") {
                    if (
                        envValue < 1024 ||
                        envValue > 2048 ||
                        envValue - Math.floor(envValue) > 0.00001 ||
                        Number.isNaN(envValue)
                    ) {
                        errorMessage = "must be between 1024 and 2048";
                    }
                } else {
                    errorMessage = "must be between 1024 and 2048";

                }
                break;
            default:
                errorMessage = "no such environment variable, only the following variable names are allowed"
        }
        if (errorMessage !== "") {
            // unrecovered fault
            GlobalMethods.infoLog(`Invalid value ${envValue} for environment variable ${envName}, ${errorMessage}`);
            return false;
        }
        return true;
    };

    private getEnvType = (envName: string): string | undefined => {
        if (this.type_env[envName] !== undefined) {
            return this.type_env[envName];
        }
        return undefined;
    };

    private envRegistered = (envName: string): boolean => {
        return this.getEnvType(envName) !== "" ? true : false;
    };

    /**
     * obtain the environment value from either user or os
     * 
     * the raw value is always string, this function parses the string to the corresponding type
     * e.g. "5064" to 5064, "[A, B, C]" to ["A", "B", "C"]
     * 
     * returns undedefined if
     *  - the environment name is invalid, or 
     *  - the environment value is not defined by OS or user, or
     *  - the environment value exists but failed to parse
     * 
     * If In this way, this environment variable is like not exist if there's anything wrong.
     */
    private readOneEnv = (envName: string, source: "user" | "os"): number | number[] | string | string[] | undefined => {

        // the environment name is invalid
        if (!this.isValidEnvironmentName(envName)) {
            GlobalMethods.infoLog(`${envName} is not a valid EPICS or TCA environment variable. Ignore it`);
            return undefined;
        }

        let envValueRaw: string = "";

        if (source === "os") {
            // process.env[envName] = string | undefined
            const envValueRaw0 = this.envOsRaw[envName];
            if (typeof envValueRaw0 !== "string") {
                GlobalMethods.infoLog(`${envName} is not defined by the operating system. Ignore it`);
                return undefined;
            } else {
                envValueRaw = envValueRaw0;
            }
        } else if (source === "user") {
            // string, at least should be
            const envValueRaw0 = this.envUserRaw[envName];
            if (typeof envValueRaw0 !== "string") {
                // environment variable is undefined undefined by user
                GlobalMethods.infoLog(`${envName} is not defined by the user. Ignore it`);
                return undefined;
            } else {
                envValueRaw = envValueRaw0;
            }
        } else {
            GlobalMethods.infoLog(`Wrong source, it must be either "user" or "os"`);
            return undefined;
        }

        let envValue: number | number[] | string | string[] | undefined = undefined;

        const type = this.getEnvType(envName);
        let errorMessage = "";

        try {
            // convert string to corresponding type
            switch (type) {
                case "number":
                    // parseFloat() does not throw exception, it only returns NaN if fails
                    envValue = parseFloat(envValueRaw);
                    if (Number.isNaN(envValue)) {
                        errorMessage = "it must be a number";
                    }
                    break;
                case "string":
                    if (envName === "EPICS_CA_AUTO_ADDR_LIST") {
                        // "Yes", "No"
                        envValue = envValueRaw.toLowerCase().charAt(0).toUpperCase() + envValueRaw.toLowerCase().slice(1);
                    } else {
                        envValue = envValueRaw;
                    }
                    break;
                case "number[]":
                    // input string must be like "37,22,   88,", without square bracket
                    envValue = [];
                    const valueTmpArray = envValueRaw
                        .trim()
                        .split(/[\s,]+/);
                    for (let elementStr of valueTmpArray) {
                        // it is ok the element is ""
                        if (elementStr.trim() !== "") {
                            const elementNumber = parseFloat(elementStr.trim());
                            if (Number.isNaN(elementNumber)) {
                                errorMessage = "it must be a number";
                                break;
                            } else {
                                (envValue as number[]).push(elementNumber);
                            }
                        }
                    }
                    // remove duplicate items
                    envValue = Array.from(new Set(envValue as number[]));
                    break;
                case "string[]":
                    // separated by space or comma
                    envValue = [];
                    envValueRaw
                        .trim()
                        .split(/[\s,]+/)
                        .forEach((element: string) => {
                            // remove empty string
                            if (element.trim() !== "") {
                                (envValue as string[]).push(element.trim());
                            }
                        });
                    // remove duplicate items
                    envValue = Array.from(new Set(envValue as string[]));
                    break;
            }
        } catch (e) {
            GlobalMethods.infoLog(e);
            errorMessage = `${e}`;
        }
        // determine whether the converted value is legal
        if (errorMessage === "") {
            const valid = this.validateEnvValue(envName, envValue);
            if (!valid) {
                errorMessage = "value is not valid for this type";
            }
        }
        if (errorMessage !== "") {
            GlobalMethods.infoLog(`Failed to read ${envName} from ${source}, ${errorMessage}`);
            return undefined;
        } else {
            return envValue;
        }
    };
    /**
     * combine default, OS, and user inputs, together with the ignoreOsEnv and ignoreUserEnv bits,
     * generate the final environment variables 
     */
    generateEnv = () => {
        for (let envName of environmentNames) {

            const envValueOs = this.envOs[envName];
            const envValueUser = this.envUser[envName];
            const envValueDefault = this.envDefault[envName];

            if (this.options.ignoreOsEnv && this.options.ignoreUserEnv) {
                this.env[envName] = envValueDefault;
                this.envSource[envName] = "default";
            } else if (this.options.ignoreOsEnv && !this.options.ignoreUserEnv) {
                if (envValueUser !== undefined) {
                    this.env[envName] = envValueUser;
                    this.envSource[envName] = "user";
                } else {
                    this.env[envName] = envValueDefault;
                    this.envSource[envName] = "default";
                }
            } else if (!this.options.ignoreOsEnv && this.options.ignoreUserEnv) {
                if (envValueOs !== undefined) {
                    this.env[envName] = envValueOs;
                    this.envSource[envName] = "os";
                } else {
                    this.env[envName] = envValueDefault;
                    this.envSource[envName] = "default";
                }
            } else if (!this.options.ignoreOsEnv && !this.options.ignoreUserEnv) {
                if (envValueUser !== undefined) {
                    this.env[envName] = envValueUser;
                    this.envSource[envName] = "user";
                } else if (envValueOs !== undefined) {
                    this.env[envName] = envValueOs;
                    this.envSource[envName] = "os";
                } else {
                    this.env[envName] = envValueDefault;
                    this.envSource[envName] = "default";
                }
            }
        }
    }

    // --------------- public getters ------------------------
    public getEnv = (envName: string = ""): type_environment_value | Record<type_environment_name, type_environment_value> | undefined => {
        if (envName === "") {
            return this.env;
        } else {
            // might be undefined
            return this.env[envName];
        }
    }

    public getEnvObj = () => {
        return this.env;
    }

    public getEnvSource = (envName: string = ""): "user" | "os" | "default" | undefined | Record<type_environment_name, "user" | "os" | "default"> => {
        if (envName === "") {
            return this.envSource;
        } else {
            return this.envSource[envName];
        }
    };

    public getEnvDefault = (envName: string = ""): type_environment_value | Partial<Record<type_environment_name, type_environment_value>> | undefined => {
        if (envName === "") {
            return this.envDefault;
        } else {
            return this.envDefault[envName];
        }
    };
    public getEnvOs = (envName: string = ""): type_environment_value | Partial<Record<type_environment_name, type_environment_value>> | undefined => {
        if (envName === "") {
            return this.envOs;
        } else {
            return this.envOs[envName];
        }
    };
    public getEnvUser = (envName: string = ""): type_environment_value | Partial<Record<type_environment_name, type_environment_value>> | undefined => {
        if (envName === "") {
            return this.envUser;
        } else {
            return this.envUser[envName];
        }
    };


    public getEnvOsRaw = (envName: string = ""): undefined | string | Record<string, string> | undefined => {
        if (envName === "") {
            return this.envOsRaw;
        } else {
            return this.envOsRaw[envName];
        }
    };

    public getEnvUserRaw = (envName: string = ""): undefined | string | Record<string, string> | undefined => {
        if (envName === "") {
            return this.envUserRaw;
        } else {
            return this.envUserRaw[envName];
        }
    };

    /**
     * print all environment variables from 3 different sources in pretty format
     */
    public printAllEnvPretty = () => {
        // -----------------------
        const result: Record<string, any>[] = [];
        for (let envName of environmentNames) {
            const envValueDefault = this.getEnvDefault(envName);
            let envValueOs = this.getEnvOs(envName);
            let envValueOsRaw = this.getEnvOsRaw(envName);
            let envValueUser = this.getEnvUser(envName);
            let envValueUserRaw = this.getEnvUserRaw(envName);
            let envValue = this.getEnv(envName);
            envValueOs = envValueOs === undefined ? undefined : envValueOs;
            envValueOsRaw = envValueOsRaw === undefined ? undefined : envValueOsRaw;
            envValueUser = envValueUser === undefined ? undefined : envValueUser;
            envValueUserRaw = envValueUserRaw === undefined ? undefined : envValueUserRaw;
            envValue = envValue === undefined ? undefined : envValue;
            if (Array.isArray(envValueDefault)) {
                let maxSize = envValueDefault.length;
                if (Array.isArray(envValueOs)) {
                    maxSize = Math.max(maxSize, envValueOs.length);
                }
                if (Array.isArray(envValueUser)) {
                    maxSize = Math.max(maxSize, envValueUser.length);
                }
                for (let ii = 0; ii < maxSize; ii++) {
                    const envValueDefaultElement = envValueDefault[ii];
                    let envValueOsElement = undefined;
                    if (Array.isArray(envValueOs)) {
                        envValueOsElement = envValueOs[ii];
                    }
                    let envValueUserElement = undefined;
                    if (Array.isArray(envValueUser)) {
                        envValueUserElement = envValueUser[ii];
                    }
                    let envValueElement = undefined;
                    if (Array.isArray(envValue)) {
                        envValueElement = envValue[ii];
                    }
                    const element = {
                        Name: ii === 0 ? `${envName} #${ii}` : `${" ".repeat(envName.length)} #${ii}`,
                        Default: envValueDefaultElement,
                        [`OS${this.options["ignoreOsEnv"]? " (Ignored)": ""}`]: envValueOsElement,
                        "OS Raw": ii === 0 ? envValueOsRaw : undefined,
                        [`User${this.options["ignoreUserEnv"]? " (Ignored)": ""}`]: envValueUserElement,
                        "User Raw": ii === 0 ? envValueUserRaw : undefined,
                        Value: envValueElement,
                    };
                    result.push(element);
                }

            } else {
                const element = {
                    Name: envName,
                    Default: envValueDefault,
                    [`OS${this.options["ignoreOsEnv"]? " (Ignored)": ""}`]: envValueOs,
                    // OS: envValueOs,
                    "OS Raw": envValueOsRaw,
                    [`User${this.options["ignoreUserEnv"]? " (Ignored)": ""}`]: envValueUser,
                    "User Raw": envValueUserRaw,
                    Value: envValue,
                };
                result.push(element);
            }
        }
        // -----------------------
        // print out
        console.table(result);
        return result;
    }

    public static destroyHard = () => {
        const instance = Environment.instance;
        if (instance !== undefined) {
            instance.env = {};
            Environment.instance = undefined;
        }
    };
}

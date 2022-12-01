import { GlobalMethods } from "./GlobalMethods";

export interface type_environment_options extends Record<string, any> {
	ignoreOsEnv: boolean;
	ignoreUserEnv: boolean;
	skipLocalhost: boolean;
}

// singleton class
export class Environment {
	readonly userEnv: Record<string, string>;
	env: Record<string, number | number[] | string | string[]>;

	options: type_environment_options = {
		ignoreOsEnv: false,
		ignoreUserEnv: false,
		skipLocalhost: false,
	};
	private constructor(userEnv: Record<string, string>, options: Partial<type_environment_options>) {
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

		this.userEnv = userEnv;
		this.env = JSON.parse(JSON.stringify(this.envDefault));

		// for (let envName of Object.keys(this.envDefault)) {
		for (let envName of this.generateEnvNames()) {
			try {
				// this.env[envName] = this.readOneEnv(envName);
				let valueFromUser = this.readOneEnv(envName, "user");
				if (valueFromUser !== undefined && !this.options["ignoreUserEnv"]) {
					this.env[envName] = valueFromUser;
					// post-process the environment variables
					this.addOptionToEnvValue(envName);
					this.envSource[envName] = "user";
					continue;
				}
				let valueFromOS = this.readOneEnv(envName, "os");
				if (valueFromOS !== undefined && !this.options["ignoreOsEnv"]) {
					this.env[envName] = valueFromOS;
					this.addOptionToEnvValue(envName);
					this.envSource[envName] = "os";
					continue;
				}
				// default
				this.addOptionToEnvValue(envName);
			} catch (e) {
				GlobalMethods.errorLog(e);
			}
		}
	}
	private static instance: Environment | undefined;
	public static getInstance = (userEnv: Record<string, string> = {}, options: Partial<type_environment_options> = {}) => {
		if (!Environment.instance) {
			Environment.instance = new Environment(userEnv, options);
		}
		return Environment.instance;
	};
	public static destroyHard = () => {
		const instance = Environment.instance;
		if (instance !== undefined) {
			instance.env = {};
            Environment.instance = undefined;
		}
	};

	private type_env: Record<string, string> = {
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
		// tca-specific
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

	private readonly envDefault: Record<string, number | number[] | string | string[]> = {
		// default epics environments, https://epics.anl.gov/base/R3-14/12-docs/CAref.html
		EPICS_CA_ADDR_LIST: ["localhost"],
		EPICS_CA_AUTO_ADDR_LIST: "Yes",
		EPICS_CA_NAME_SERVERS: [],
		EPICS_CA_CONN_TMO: 30,
		EPICS_CA_BEACON_PERIOD: 15,
		EPICS_CA_REPEATER_PORT: 5065,
		EPICS_CA_SERVER_PORT: 5064,
		EPICS_CA_MAX_ARRAY_BYTES: 16384,
		EPICS_CA_MAX_SEARCH_PERIOD: 300,
		EPICS_TS_MIN_WEST: 360,
		// custom epics-related environments in epics-tca
		EPICS_CA_MIN_SEARCH_PERIOD: 0.1, // second, counter part of EPICS_CA_MAX_SEARCH_PERIOD
		EPICS_CA_GET_TIMEOUT_DEFAUTL: 2, // second
		EPICS_CA_SCHEDULING_PRIORITY_DEFAULT: 0,
		EPICS_CA_TCP_RE_SEARCH_CHAN_TIMESPAN: 2, // 2 second, 2 seconds span * random(0,1)
		EPICS_CA_TCP_RE_SEARCH_CHAN_TIMEOUT: 0.2, // when TCPTransport is destroyed, wait until re-search a channel
		EPICS_CA_REPEATER_REGISTER_TIMEOUT: 1, // send CA_REPEATER every second
		EPICS_CA_TCP_INACTIVE_TIMEOUT: 30, // > twice of EPICS_CA_BEACON_PERIOD
		EPICS_CA_BEACON_TIMEOUT: 30, // > twice of EPICS_CA_BEACON_PERIOD
		EPICS_CA_MAX_UDP_BUFFER: 1024,
		EPICS_CA_REPEATER_CLIENT_CHECK_TIME: 20, // 20 seconds
	};

	private envSource: Record<string, "user" | "os" | "default"> = {
		// default epics environments
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
		// custom epics-related environments in epics-tca
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

	// --------------- read environment variables -----------------
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

	private addOptionToEnvValue = (envName: string): void => {
		switch (envName) {
			case "EPICS_CA_ADDR_LIST":
				// if the "localhost" is skipped
				if (this.options.skipLocalhost) {
					const index = (this.env[envName] as string[]).indexOf("localhost");
					if (index > -1) {
						(this.env[envName] as string[]).splice(index, 1);
					}
				}

				break;
		}
	};

	// check if the environment variable is valid for EPICS to use
	private validateEnvValue = (envName: string, envValue: string | number | string[] | number[] | undefined): boolean => {
		if (envValue === undefined) {
			throw new Error(`Invalid value ${envValue} for environment variable ${envName}`);
		}

		let valid: boolean = true;
		let errorMessage: string = "";
		switch (envName) {
			case "EPICS_CA_ADDR_LIST":
			case "EPICS_CA_NAME_SERVERS":
				for (const ipAddress of envValue as string[]) {
					if (!this.validateIPaddress(ipAddress) && !this.validateDomain(ipAddress)) {
						errorMessage = "must be a valid IP address or host name separated by space or comma.";
						valid = false;
					}
				}
				break;
			case "EPICS_CA_AUTO_ADDR_LIST":
				if ((envValue as string).toUpperCase() !== "YES" && (envValue as string).toUpperCase() !== "NO") {
					errorMessage = "must be Yes or No.";
					valid = false;
				}
				break;
			case "EPICS_CA_CONN_TMO":
			case "EPICS_CA_BEACON_PERIOD":
				if ((envValue as number) < 0.1 || Number.isNaN(envValue as number)) {
					errorMessage = "must be > 0.1";
					valid = false;
				}
				break;
			case "EPICS_CA_REPEATER_PORT":
			case "EPICS_CA_SERVER_PORT":
				// must be an integer between 5000 and 65530
				if (
					(envValue as number) <= 5000 ||
					(envValue as number) > 65535 ||
					(envValue as number) - Math.floor(envValue as number) > 0.00001 ||
					Number.isNaN(envValue as number)
				) {
					errorMessage = "must be > 5000 and < 65535";
					valid = false;
				}
				break;
			case "EPICS_CA_MAX_ARRAY_BYTES":
				// must be an integer >= 16384
				if (
					(envValue as number) < 16384 ||
					(envValue as number) - Math.floor(envValue as number) > 0.00001 ||
					Number.isNaN(envValue as number)
				) {
					errorMessage = "must be >= 16384";
					valid = false;
				}
				break;
			case "EPICS_CA_MAX_SEARCH_PERIOD":
				// must be an integer larger than 60 seconds
				if (
					(envValue as number) < 60 ||
					(envValue as number) - Math.floor(envValue as number) > 0.00001 ||
					Number.isNaN(envValue as number)
				) {
					errorMessage = "must be < 60";
					valid = false;
				}
				break;
			case "EPICS_TS_MIN_WEST":
				// must be an integer between -720 and 720 minutes
				if (
					(envValue as number) < -720 ||
					(envValue as number) > 720 ||
					(envValue as number) - Math.floor(envValue as number) > 0.00001 ||
					Number.isNaN(envValue as number)
				) {
					errorMessage = "must be between -720 and 720";
					valid = false;
				}
				break;
			// epics-tca specific variables
			case "EPICS_CA_MIN_SEARCH_PERIOD":
			case "EPICS_CA_GET_TIMEOUT_DEFAUTL":
			case "EPICS_CA_TCP_RE_SEARCH_CHAN_TIMESPAN":
			case "EPICS_CA_TCP_RE_SEARCH_CHAN_TIMEOUT":
			case "EPICS_CA_REPEATER_REGISTER_TIMEOUT":
			case "EPICS_CA_TCP_INACTIVE_TIMEOUT":
			case "EPICS_CA_BEACON_TIMEOUT":
			case "EPICS_CA_REPEATER_CLIENT_CHECK_TIME":
				if ((envValue as number) < 0.05 || (envValue as number) > 60 || Number.isNaN(envValue as number)) {
					errorMessage = "must be between 0.05 and 60";
					valid = false;
				}
				break;
			case "EPICS_CA_SCHEDULING_PRIORITY_DEFAULT":
				if (
					(envValue as number) < 0 ||
					(envValue as number) > 100 ||
					(envValue as number) - Math.floor(envValue as number) > 0.00001 ||
					Number.isNaN(envValue as number)
				) {
					errorMessage = "must be between 0 and 100";
					valid = false;
				}
				break;
			case "EPICS_CA_MAX_UDP_BUFFER":
				if (
					(envValue as number) < 1024 ||
					(envValue as number) > 2048 ||
					(envValue as number) - Math.floor(envValue as number) > 0.00001 ||
					Number.isNaN(envValue as number)
				) {
					errorMessage = "must be between 1024 and 2048";
					valid = false;
				}
				break;
		}
		if (!valid) {
			throw new Error(`Invalid value ${envValue} for environment variable ${envName}, ${errorMessage}`);
		}
		return true;
	};

	private getEnvType = (envName: string): string => {
		if (this.type_env[envName] !== undefined) {
			return this.type_env[envName];
		}
		return "";
	};

	private envRegistered = (envName: string): boolean => {
		return this.getEnvType(envName) !== "" ? true : false;
	};

	private readOneEnv = (envName: string, source: "user" | "os"): number | number[] | string | string[] | undefined => {
		if (!this.envRegistered(envName)) {
			throw new Error(`Environment variable ${envName} not registered. Ignore it.`);
		}
		let envValueRaw: string;

		if (source === "os") {
			if (process.env[envName] === undefined) {
				return undefined;
			}
			envValueRaw = process.env[envName] as string;
		}
		// "user"
		else {
			if (this.userEnv[envName] === undefined) {
				return undefined;
			}
			envValueRaw = this.userEnv[envName] as string;
		}

		let envValue: number | number[] | string | string[] | undefined = undefined;

		const type = this.getEnvType(envName);

		try {
			// convert string to corresponding type
			switch (type) {
				case "number":
					envValue = parseFloat(envValueRaw);
					break;
				case "string":
					envValue = envValueRaw;
					break;
				case "number[]":
					envValue = [];
					envValueRaw
						.trim()
						.split(/[\s,]+/)
						.forEach((element: string) => {
							// remove empty string
							if (element !== "") {
								(envValue as number[]).push(parseInt(element));
							}
						});
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
							if (element !== "") {
								(envValue as string[]).push(element);
							}
						});
					// remove duplicate items
					envValue = Array.from(new Set(envValue as string[]));
					break;
			}
			// determine whether the converted value is legal
			this.validateEnvValue(envName, envValue);
		} catch (e: any) {
			GlobalMethods.errorLog(e);
			return undefined;
		}
		return envValue;
	};

	private generateEnvNames = (): string[] => {
		return Array.from(new Set([...Object.keys(this.userEnv), ...Object.keys(this.envDefault)]));
	};

	// --------------- public getters ------------------------

	public getEnv = (
		envName: string = ""
	): Record<string, string | number | string[] | number[]> | string | number | string[] | number[] | undefined => {
		if (envName === "") {
			return this.env;
		} else {
			const envType = this.getEnvType(envName);
			switch (envType) {
				case "string":
					return this.env[envName] as string;
				case "string[]":
					return this.env[envName] as string[];
				case "number":
					return this.env[envName] as number;
				case "number[]":
					return this.env[envName] as number[];
				default:
					// might be "undefined"
					return this.env[envName];
			}
		}
	};

	public getEnvSource = (): Record<string, "user" | "os" | "default"> => {
		return this.envSource;
	};
	public getEnvDefault = (): Record<string, number | number[] | string | string[]> => {
		return this.envDefault;
	};
	public getEnvOS = (): Record<string, string | undefined> => {
		let env: Record<string, string | undefined> = {};
		for (let envName in this.envDefault) {
			env[envName] = process.env[envName];
		}
		return env;
	};
	public getEnvUser = (): Record<string, string | undefined> => {
		let env: Record<string, string | undefined> = {};
		for (let envName in this.envDefault) {
			env[envName] = this.userEnv[envName];
		}
		return env;
	};
}

import { Channel, Channel_DBR_TYPES } from "./Channel";

type type_DBR_meta_struct_props = {
	type: "int" | "uint" | "float" | "double" | "string" | "string[]";
	size: number;
	offset: number;
};

// assigned after the CA_PROTO_CREATE_CHAN
export class Dbr {
	channel: Channel;
	private buffer: Buffer;
	// never change
	private type: Channel_DBR_TYPES;
	private valueCount: number;
	private meta: Record<string, any> = {};
	private value: number | number[] | string | string[] = [];

	constructor(channel: Channel) {
		this.channel = channel;
		this.buffer = Buffer.alloc(1);
		this.type = this.channel.getDbrTypeNum();
		this.valueCount = -1;
	}
    // //todo: only for test
	// constructor() {
	// 	this.channel = undefined;
	// 	this.buffer = Buffer.alloc(1);
	// 	this.type = 1;
	// 	this.dataCount = -1;
	// }

	getMeta = () => {
		return this.meta;
	};
	getValue = () => {
		return this.value;
	};

	// they are provided by CA_PROTO_READ_*
	public decodeBuffer = (buffer: Buffer, dbrType: Channel_DBR_TYPES, valueCount: number) => {
		if (buffer.length !== this.buffer.length) {
			this.buffer = Buffer.alloc(buffer.length);
		}
		// use copy, do not transfer reference
		buffer.copy(this.buffer);
		this.type = dbrType;
		this.valueCount = valueCount;
		// decode buffer -- meta
		const meta_struct = this.DBR_meta_struct_table[this.type];
		this.meta = {};
		for (const fieldName in meta_struct) {
			const fieldType = meta_struct[fieldName].type;
			const fieldOffset = meta_struct[fieldName].offset;
			const fieldSize = meta_struct[fieldName].size;
			switch (fieldType) {
				case "int":
					this.meta[fieldName] = buffer.readIntBE(fieldOffset, fieldSize);
					break;
				case "uint":
					this.meta[fieldName] = buffer.readUIntBE(fieldOffset, fieldSize);
					break;
				case "float":
					this.meta[fieldName] = buffer.readFloatBE(fieldOffset);
					break;
				case "double":
					this.meta[fieldName] = buffer.readDoubleBE(fieldOffset);
					break;
				case "string":
					this.meta[fieldName] = buffer.toString("utf8", fieldOffset, fieldOffset + fieldSize).split("\0")[0];
					break;
				// only for enum 16 x 26 string array
				case "string[]":
					let strs: string[] = [];
					for (let i = 0; i < 16; i++) {
						let ptr = i * 26 + 6;
						strs.push(
							buffer
								.slice(ptr, ptr + 25)
								.toString("utf8")
								.replaceAll("\0", "")
						);
					}
					this.meta[fieldName] = strs;
					break;
				default:
					throw new Error(`Error meta in ${buffer}`);
			}
		}
		// decode buffer -- payload data
		const bufferSizes = this.bufferSizes_table[dbrType];
		const metaSize = bufferSizes[0];
		const paddingSize = bufferSizes[1];
		const elementSize = bufferSizes[2];
		const valueOffset = metaSize + paddingSize;
		const valueType = this.valueType_table[this.type];
		//todo: any??
		let value: any = [];

		switch (valueType) {
			case "int":
				for (let count = 0; count < valueCount; count++) {
					const elementOffset = valueOffset + count * elementSize;
					value.push(buffer.readIntBE(elementOffset, elementSize));
				}
				break;
			case "char":
				for (let count = 0; count < valueCount; count++) {
					const elementOffset = valueOffset + count * elementSize;
					value.push(buffer.readUIntBE(elementOffset, elementSize));
				}
				break;
			case "float":
				for (let count = 0; count < valueCount; count++) {
					const elementOffset = valueOffset + count * elementSize;
					value.push(buffer.readFloatBE(elementOffset));
				}
				break;
			case "double":
				for (let count = 0; count < valueCount; count++) {
					const elementOffset = valueOffset + count * elementSize;
					value.push(buffer.readDoubleBE(elementOffset));
				}
				break;
			case "string":
				for (let count = 0; count < valueCount; count++) {
					const elementOffset = valueOffset + count * elementSize;
					value.push(buffer.toString("utf8", elementOffset, elementOffset + elementSize).split("\0")[0]);
				}
				break;
			default:
				throw new Error(`Error value in ${buffer}`);
		}

		if (valueCount === 1) {
			this.value = value[0];
		} else {
			this.value = value;
		}
        this.channel.setDbrValue({...this.meta, value: this.value});
	};


	public encodeBuffer = (value: number | number[] | string | string[]): Buffer => {
        // must encode with the default type
        let dbrType = this.channel.getDbrTypeNum();
        let valueCount = this.channel.getValueCount();
		const bufferSizes = this.bufferSizes_table[dbrType];
		const elementSize = bufferSizes[2];
		// padded to multiple of 8
		let buffer = Buffer.alloc(
			(elementSize * valueCount) % 8 < 0.0001 ? elementSize * valueCount : Math.floor((elementSize * valueCount) / 8) * 8 + 8
		);
		const valueType = this.valueType_table[dbrType];
        let inputValueType = "";
        let valueCopy = value;
        if (typeof value === "number") {
            valueCopy = [value];
            inputValueType = "number";
        }
        else if (typeof value === "string") {
            valueCopy = [value];
            inputValueType = "string";
        }
        else {
            if (typeof value[0] === "number") {
                inputValueType = "number";
            }
            else if (typeof value[0] === "string") {
                inputValueType = "string";
            }
            else {

            }
        }

		switch (valueType) {
			case "int":
                if (inputValueType !== "number") {
                    throw new Error(`Cannot encode a "int" value`);
                }
				for (let count = 0; count < (valueCopy as number[]).length && count < valueCount; count++) {
					const offset = count * elementSize;
					const value = (valueCopy as number[])[count];
					buffer.writeIntBE(Math.round(value), offset, elementSize);
				}
				break;
			case "float":
                if (inputValueType !== "number") {
                    throw new Error(`Cannot encode a "float" value`);
                }
				for (let count = 0; count < (valueCopy as number[]).length && count < valueCount; count++) {
					const offset = count * elementSize;
					const value = (valueCopy as number[])[count];
					buffer.writeFloatBE(value, offset);
				}
				break;
			case "double":
                if (inputValueType !== "number") {
                    throw new Error(`Cannot encode a "double" value`);
                }
				for (let count = 0; count < (valueCopy as number[]).length && count < valueCount; count++) {
					const offset = count * elementSize;
					const value = (valueCopy as number[])[count];
					buffer.writeDoubleBE(value, offset);
				}
				break;
			case "char":
				// allow number or string
				if (typeof (valueCopy as any)[0] === "string") {
                    let valueCopy2 = [];
                    for (let count = 0; count < (valueCopy as any).length; count++) {
                        valueCopy2.push((valueCopy as any)[count].charCodeAt(0));
                    }
                    valueCopy = valueCopy2;
				}

				for (let count = 0; count < (valueCopy as number[]).length && count < valueCount; count++) {
					const offset = count * elementSize;
					const value = (valueCopy as number[])[count];
					buffer.writeUIntBE(Math.round(value), offset, elementSize);
				}
				break;
			case "string":
                if (inputValueType !== "string") {
                    throw new Error(`Cannot encode a "string" value`);
                }
				for (let count = 0; count < (valueCopy as string[]).length && count < valueCount; count++) {
					const offset = count * elementSize;
					const value = (valueCopy as string[])[count];
					Buffer.from(value).copy(buffer, offset);
				}
				break;
			default:
				throw new Error(`Cannot encode ${value} to buffer`);
		}
		return buffer;
	};

	public getBuffer = (): Buffer => {
		return this.buffer;
	};

	public getTypeNum = (): Channel_DBR_TYPES => {
		return this.type;
	};
	public getTypeStr = (): string => {
		return Channel_DBR_TYPES[`${this.type}`];
	};

	public getValueCount = (): number => {
		return this.valueCount;
	};

	private DBR_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		// empty
	};

	private DBR_STS_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		status: {
			type: "int",
			size: 2, // byte
			offset: 0, // byte
		},
		severity: {
			type: "int",
			size: 2,
			offset: 2,
		},
	};

	private DBR_TIME_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		...this.DBR_STS_meta_struct,
		secondsSinceEpoch: {
			type: "int",
			size: 4,
			offset: 4,
		},
		nanoSeconds: {
			type: "uint",
			size: 4,
			offset: 8,
		},
	};

	private DBR_GR_SHORT_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		...this.DBR_STS_meta_struct,
		units: {
			type: "string",
			size: 8,
			offset: 4,
		},
		upper_display_limit: {
			type: "int",
			size: 2,
			offset: 12,
		},
		lower_display_limit: {
			type: "int",
			size: 2,
			offset: 14,
		},
		upper_alarm_limit: {
			type: "int",
			size: 2,
			offset: 16,
		},
		upper_warning_limit: {
			type: "int",
			size: 2,
			offset: 18,
		},
		lower_warning_limit: {
			type: "int",
			size: 2,
			offset: 20,
		},
		lower_alarm_limit: {
			type: "int",
			size: 2,
			offset: 22,
		},
	};

	private DBR_GR_CHAR_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		...this.DBR_STS_meta_struct,
		units: {
			type: "string",
			size: 8,
			offset: 4,
		},
		upper_display_limit: {
			type: "uint",
			size: 1,
			offset: 12,
		},
		lower_display_limit: {
			type: "uint",
			size: 1,
			offset: 13,
		},
		upper_alarm_limit: {
			type: "uint",
			size: 1,
			offset: 14,
		},
		upper_warning_limit: {
			type: "uint",
			size: 1,
			offset: 15,
		},
		lower_warning_limit: {
			type: "uint",
			size: 1,
			offset: 16,
		},
		lower_alarm_limit: {
			type: "uint",
			size: 1,
			offset: 17,
		},
	};

	private DBR_GR_LONG_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		...this.DBR_STS_meta_struct,
		units: {
			type: "string",
			size: 8,
			offset: 4,
		},
		upper_display_limit: {
			type: "int",
			size: 4,
			offset: 12,
		},
		lower_display_limit: {
			type: "int",
			size: 4,
			offset: 16,
		},
		upper_alarm_limit: {
			type: "int",
			size: 4,
			offset: 20,
		},
		upper_warning_limit: {
			type: "int",
			size: 4,
			offset: 24,
		},
		lower_warning_limit: {
			type: "int",
			size: 4,
			offset: 28,
		},
		lower_alarm_limit: {
			type: "int",
			size: 4,
			offset: 32,
		},
	};

	private DBR_GR_FLOAT_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		...this.DBR_STS_meta_struct,
		precision: {
			type: "int",
			size: 2,
			offset: 4,
		},
		padding: {
			type: "int",
			size: 2,
			offset: 6,
		},
		units: {
			type: "string",
			size: 8,
			offset: 8,
		},
		upper_display_limit: {
			type: "float",
			size: 4,
			offset: 16,
		},
		lower_display_limit: {
			type: "float",
			size: 4,
			offset: 20,
		},
		upper_alarm_limit: {
			type: "float",
			size: 4,
			offset: 24,
		},
		upper_warning_limit: {
			type: "float",
			size: 4,
			offset: 28,
		},
		lower_warning_limit: {
			type: "float",
			size: 4,
			offset: 32,
		},
		lower_alarm_limit: {
			type: "float",
			size: 4,
			offset: 36,
		},
	};

	private DBR_GR_DOUBLE_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		...this.DBR_STS_meta_struct,
		precision: {
			type: "int",
			size: 2,
			offset: 4,
		},
		padding: {
			type: "int",
			size: 2,
			offset: 6,
		},
		units: {
			type: "string",
			size: 8,
			offset: 8,
		},
		upper_display_limit: {
			type: "double",
			size: 8,
			offset: 16,
		},
		lower_display_limit: {
			type: "double",
			size: 8,
			offset: 24,
		},
		upper_alarm_limit: {
			type: "double",
			size: 8,
			offset: 32,
		},
		upper_warning_limit: {
			type: "double",
			size: 8,
			offset: 40,
		},
		lower_warning_limit: {
			type: "double",
			size: 8,
			offset: 48,
		},
		lower_alarm_limit: {
			type: "double",
			size: 8,
			offset: 56,
		},
	};

	private DBR_GR_ENUM_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		...this.DBR_STS_meta_struct,
		number_of_string_used: {
			type: "int",
			size: 2,
			offset: 2,
		},
		strings: {
			type: "string[]",
			size: 416, // 16 x 26
			offset: 4,
		},
	};

	private DBR_CTRL_SHORT_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		...this.DBR_STS_meta_struct,
		units: {
			type: "string",
			size: 8,
			offset: 4,
		},
		upper_display_limit: {
			type: "int",
			size: 2,
			offset: 12,
		},
		lower_display_limit: {
			type: "int",
			size: 2,
			offset: 14,
		},
		upper_alarm_limit: {
			type: "int",
			size: 2,
			offset: 16,
		},
		upper_warning_limit: {
			type: "int",
			size: 2,
			offset: 18,
		},
		lower_warning_limit: {
			type: "int",
			size: 2,
			offset: 20,
		},
		lower_alarm_limit: {
			type: "int",
			size: 2,
			offset: 22,
		},
		upper_ctrl_limit: {
			type: "int",
			size: 2,
			offset: 24,
		},
		lower_ctrl_limit: {
			type: "int",
			size: 2,
			offset: 26,
		},
	};

	private DBR_CTRL_CHAR_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		...this.DBR_STS_meta_struct,
		units: {
			type: "string",
			size: 8,
			offset: 4,
		},
		upper_display_limit: {
			type: "uint",
			size: 1,
			offset: 12,
		},
		lower_display_limit: {
			type: "uint",
			size: 1,
			offset: 13,
		},
		upper_alarm_limit: {
			type: "uint",
			size: 1,
			offset: 14,
		},
		upper_warning_limit: {
			type: "uint",
			size: 1,
			offset: 15,
		},
		lower_warning_limit: {
			type: "uint",
			size: 1,
			offset: 16,
		},
		lower_alarm_limit: {
			type: "uint",
			size: 1,
			offset: 17,
		},
		upper_ctrl_limit: {
			type: "uint",
			size: 1,
			offset: 18,
		},
		lower_ctrl_limit: {
			type: "uint",
			size: 1,
			offset: 19,
		},
	};

	private DBR_CTRL_LONG_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		...this.DBR_STS_meta_struct,
		units: {
			type: "string",
			size: 8,
			offset: 4,
		},
		upper_display_limit: {
			type: "int",
			size: 4,
			offset: 12,
		},
		lower_display_limit: {
			type: "int",
			size: 4,
			offset: 16,
		},
		upper_alarm_limit: {
			type: "int",
			size: 4,
			offset: 20,
		},
		upper_warning_limit: {
			type: "int",
			size: 4,
			offset: 24,
		},
		lower_warning_limit: {
			type: "int",
			size: 4,
			offset: 28,
		},
		lower_alarm_limit: {
			type: "int",
			size: 4,
			offset: 32,
		},
		upper_ctrl_limit: {
			type: "int",
			size: 4,
			offset: 36,
		},
		lower_ctrl_limit: {
			type: "int",
			size: 4,
			offset: 40,
		},
	};

	private DBR_CTRL_FLOAT_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		...this.DBR_STS_meta_struct,
		precision: {
			type: "int",
			size: 2,
			offset: 4,
		},
		padding: {
			type: "int",
			size: 2,
			offset: 6,
		},
		units: {
			type: "string",
			size: 8,
			offset: 8,
		},
		upper_display_limit: {
			type: "float",
			size: 4,
			offset: 16,
		},
		lower_display_limit: {
			type: "float",
			size: 4,
			offset: 20,
		},
		upper_alarm_limit: {
			type: "float",
			size: 4,
			offset: 24,
		},
		upper_warning_limit: {
			type: "float",
			size: 4,
			offset: 28,
		},
		lower_warning_limit: {
			type: "float",
			size: 4,
			offset: 32,
		},
		lower_alarm_limit: {
			type: "float",
			size: 4,
			offset: 36,
		},
		upper_ctrl_limit: {
			type: "float",
			size: 4,
			offset: 40,
		},
		lower_ctrl_limit: {
			type: "float",
			size: 4,
			offset: 44,
		},
	};

	private DBR_CTRL_DOUBLE_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		...this.DBR_STS_meta_struct,
		precision: {
			type: "int",
			size: 2,
			offset: 4,
		},
		padding: {
			type: "int",
			size: 2,
			offset: 6,
		},
		units: {
			type: "string",
			size: 8,
			offset: 8,
		},
		upper_display_limit: {
			type: "double",
			size: 8,
			offset: 16,
		},
		lower_display_limit: {
			type: "double",
			size: 8,
			offset: 24,
		},
		upper_alarm_limit: {
			type: "double",
			size: 8,
			offset: 32,
		},
		upper_warning_limit: {
			type: "double",
			size: 8,
			offset: 40,
		},
		lower_warning_limit: {
			type: "double",
			size: 8,
			offset: 48,
		},
		lower_alarm_limit: {
			type: "double",
			size: 8,
			offset: 56,
		},
		upper_ctrl_limit: {
			type: "double",
			size: 8,
			offset: 64,
		},
		lower_ctrl_limit: {
			type: "double",
			size: 8,
			offset: 72,
		},
	};

	// https://epics.anl.gov/base/R3-16/0-docs/CAproto/index.html#payload-data-types
	// [Meta size, padding size, Element size]
	bufferSizes_table = [
		[0, 0, 40], // DBR_STRING
		[0, 0, 2], // DBR_INT, DBR_SHORT
		[0, 0, 4], // DBR_FLOAT
		[0, 0, 2], // DBR_ENUM
		[0, 0, 1], // DBR_CHAR
		[0, 0, 4], // DBR_LONG
		[0, 0, 8], // DBR_DOUBLE
		[4, 0, 40], // DBR_STS_STRING
		[4, 0, 2], // DBR_STS_INT, DBR_STS_SHORT
		[4, 0, 4], // DBR_STS_FLOAT
		[4, 0, 2], // DBR_STS_ENUM
		[4, 0, 1], // DBR_STS_CHAR // padding is 1 in webpage
		[4, 0, 4], // DBR_STS_LONG
		[4, 4, 8], // DBR_STS_DOUBLE
		[12, 0, 40], // DBR_TIME_STRING
		[12, 2, 2], // DBR_TIME_INT, DBR_TIME_SHORT
		[12, 0, 4], // DBR_TIME_FLOAT
		[12, 2, 2], // DBR_TIME_ENUM
		[12, 2, 1], // DBR_TIME_CHAR // padding is 3 in webpage
		[12, 0, 4], // DBR_TIME_LONG
		[12, 4, 8], // DBR_TIME_DOUBLE
		[4, 0, 40], // DBR_GR_STRING
		[24, 0, 2], // DBR_GR_INT, DBR_GR_SHORT
		[40, 0, 4], // DBR_GR_FLOAT // padding is 2 in webpage
		[422, 0, 2], // DBR_GR_ENUM
		[18, 1, 1], // DBR_GR_CHAR // meat size is 24
		[36, 0, 4], // DBR_GR_LONG // meat size is 24
		[64, 0, 8], // DBR_GR_DOUBLE
		[4, 0, 40], // DBR_CTRL_STRING
		[28, 0, 2], // DBR_CTRL_INT, DBR_CTRL_SHORT
		[48, 0, 4], // DBR_CTRL_FLOAT
		[422, 0, 2], // DBR_CTRL_ENUM
		[20, 1, 1], // DBR_CTRL_CHAR
		[44, 0, 4], // DBR_CTRL_LONG
		[80, 0, 8], // DBR_CTRL_DOUBLE
	];

	valueType_table = [
		"string", // DBR_STRING
		"int", // DBR_INT, DBR_SHORT
		"float", // DBR_FLOAT
		"int", // DBR_ENUM
		"char", // DBR_CHAR
		"int", // DBR_LONG
		"double", // DBR_DOUBLE
		"string", // DBR_STS_STRING
		"int", // DBR_STS_INT, DBR_STS_SHORT
		"float", // DBR_STS_FLOAT
		"int", // DBR_STS_ENUM
		"char", // DBR_STS_CHAR
		"int", // DBR_STS_LONG
		"double", // DBR_STS_DOUBLE
		"string", // DBR_TIME_STRING
		"int", // DBR_TIME_INT, DBR_TIME_SHORT
		"float", // DBR_TIME_FLOAT
		"int", // DBR_TIME_ENUM
		"char", // DBR_TIME_CHAR
		"int", // DBR_TIME_LONG
		"double", // DBR_TIME_DOUBLE
		"string", // DBR_GR_STRING
		"int", // DBR_GR_INT, DBR_GR_SHORT
		"float", // DBR_GR_FLOAT
		"int", // DBR_GR_ENUM
		"char", // DBR_GR_CHAR
		"int", // DBR_GR_LONG
		"double", // DBR_GR_DOUBLE
		"string", // DBR_CTRL_STRING
		"int", // DBR_CTRL_INT, DBR_CTRL_SHORT
		"float", // DBR_CTRL_FLOAT
		"int", // DBR_CTRL_ENUM
		"char", // DBR_CTRL_CHAR
		"int", // DBR_CTRL_LONG
		"double", // DBR_CTRL_DOUBLE
	];

	DBR_meta_struct_table = [
		this.DBR_meta_struct, // DBR_STRING
		this.DBR_meta_struct, // DBR_INT, DBR_SHORT
		this.DBR_meta_struct, // DBR_FLOAT
		this.DBR_meta_struct, // DBR_ENUM
		this.DBR_meta_struct, // DBR_CHAR
		this.DBR_meta_struct, // DBR_LONG
		this.DBR_meta_struct, // DBR_DOUBLE
		this.DBR_STS_meta_struct, // DBR_STS_STRING
		this.DBR_STS_meta_struct, // DBR_STS_INT, DBR_STS_SHORT
		this.DBR_STS_meta_struct, // DBR_STS_FLOAT
		this.DBR_STS_meta_struct, // DBR_STS_ENUM
		this.DBR_STS_meta_struct, // DBR_STS_CHAR
		this.DBR_STS_meta_struct, // DBR_STS_LONG
		this.DBR_STS_meta_struct, // DBR_STS_DOUBLE
		this.DBR_TIME_meta_struct, // DBR_TIME_STRING
		this.DBR_TIME_meta_struct, // DBR_TIME_INT, DBR_TIME_SHORT
		this.DBR_TIME_meta_struct, // DBR_TIME_FLOAT
		this.DBR_TIME_meta_struct, // DBR_TIME_ENUM
		this.DBR_TIME_meta_struct, // DBR_TIME_CHAR
		this.DBR_TIME_meta_struct, // DBR_TIME_LONG
		this.DBR_TIME_meta_struct, // DBR_TIME_DOUBLE
		this.DBR_STS_meta_struct, // DBR_GR_STRING
		this.DBR_GR_SHORT_meta_struct, // DBR_GR_INT, DBR_GR_SHORT
		this.DBR_GR_FLOAT_meta_struct, // DBR_GR_FLOAT
		this.DBR_GR_ENUM_meta_struct, // DBR_GR_ENUM
		this.DBR_GR_CHAR_meta_struct, // DBR_GR_CHAR
		this.DBR_GR_LONG_meta_struct, // DBR_GR_LONG
		this.DBR_GR_DOUBLE_meta_struct, // DBR_GR_DOUBLE
		this.DBR_STS_meta_struct, // DBR_CTRL_STRING
		this.DBR_CTRL_SHORT_meta_struct, // DBR_CTRL_INT, DBR_CTRL_SHORT
		this.DBR_CTRL_FLOAT_meta_struct, // DBR_CTRL_FLOAT
		this.DBR_GR_ENUM_meta_struct, // DBR_CTRL_ENUM
		this.DBR_CTRL_CHAR_meta_struct, // DBR_CTRL_CHAR
		this.DBR_CTRL_LONG_meta_struct, // DBR_CTRL_LONG
		this.DBR_CTRL_DOUBLE_meta_struct, // DBR_CTRL_DOUBLE
	];
}

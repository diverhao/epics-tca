import { Channel, Channel_DBR_TYPES } from "./Channel";
import { DbrStruct, type_DBR_meta_struct_props } from "./DbrStruct";

// assigned after the CA_PROTO_CREATE_CHAN
export class Dbr {
	channel: Channel;
	private buffer: Buffer;
	// never change
	private type: Channel_DBR_TYPES;
	private valueCount: number;
    // only contains value and meta, does not contain dbrData
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
		const meta_struct = DbrStruct.DBR_meta_struct_table[this.type];
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
		const bufferSizes = DbrStruct.bufferSizes_table[dbrType];
		const metaSize = bufferSizes[0];
		const paddingSize = bufferSizes[1];
		const elementSize = bufferSizes[2];
		const valueOffset = metaSize + paddingSize;
		const valueType = DbrStruct.valueType_table[this.type];
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
	};


	public encodeBuffer = (value: number | number[] | string | string[]): Buffer => {
        // must encode with the default type
        let dbrType = this.channel.getDbrTypeNum();

        // should use "value"'s count, not channel's valueCount
        // let valueCount = this.channel.getValueCount();
		let valueCount = 1;
		if (typeof value !== "number" && typeof value !== "string") {
			valueCount = value.length;
		}

		const bufferSizes = DbrStruct.bufferSizes_table[dbrType];
		const elementSize = bufferSizes[2];
		// padded to multiple of 8
		let buffer = Buffer.alloc(
			(elementSize * valueCount) % 8 < 0.0001 ? elementSize * valueCount : Math.floor((elementSize * valueCount) / 8) * 8 + 8
		);
		const valueType = DbrStruct.valueType_table[dbrType];
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
                // do nothing
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
}

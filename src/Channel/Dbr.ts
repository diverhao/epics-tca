import { Channel_DBR_TYPES, type_dbr_meta, type_dbr_meta_all, type_dbr_value } from "./Channel";
import { DbrStruct, type_DBR_meta_struct_props } from "./DbrStruct";


/**
 * Represent the DBR type data defined in
 * https://epics.anl.gov/base/R3-16/0-docs/CAproto/index.html#payload-data-types
 * 
 * Each Channel object has one such object representing the **most recent** DBR type data for
 * this Channel that comes from caget and camonitor.
 * 
 * assigned after the CA_PROTO_CREATE_CHAN
 */
export class Dbr {
    // channel: Channel;
    private buffer: Buffer;
    // never change
    private type: Channel_DBR_TYPES;
    private valueCount: number;
    // meta data, dbr type dependent
    // e.g. DBR_SHORT has no meta data, 
    //      DBR_TIME_CHAR has status, severity, secondsSinceEpoch, and nanoSeconds
    //      DBR_GR_SHORT has status, severity, units, upper_display_limit, and more
    //      DBR_GR_ENUM has status, severity, number_of_string_used and strings
    private meta: type_dbr_meta = {};
    // channel value, cannot be undefined
    private value: type_dbr_value = [];

    constructor(dbrType: Channel_DBR_TYPES) {
        this.buffer = Buffer.alloc(1);
        this.type = dbrType;
        this.valueCount = -1;
    }

    /**
     * Convert the **payload** buffer data from CA server to local type data
     * 
     * Buffer is the following message's payload from the CA server
     *  (1) CA_PROTO_READ, 
     *  (2) CA_PROTO_READ_NOTIFY, or 
     *  (3) CA_PROTO_EVENT_ADD
     * 
     * @param {Buffer} buffer The payload part of the buffer that comes from the above Channel Access message
     *                        It contains the meta data and value data
     * 
     * @param {Channel_DBR_TYPES} dbrType The DBR type of the payload buffer
     *                                    
     * @param {number} valueCount The number of values
     * 
     * @returns {void} It updates Dbr.buffer, Dbr.type, Dbr.valueCount, Dbr.meta and Dbr.value
     * 
     * @throws when the data cannot be decoded
     */
    public decodeBuffer = (buffer: Buffer, dbrType: Channel_DBR_TYPES, valueCount: number) => {
        // if buffer size is not 8 times, throw an exception
        if (buffer.length % 8 !== 0) {
            throw new Error(`Payload size must be multiple of 8`);
        }

        // -------------------- decode buffer -- meta data -----------------
        const meta_struct = DbrStruct.DBR_meta_struct_table[dbrType];
        if (meta_struct === undefined) {
            throw new Error(`No such DBR type ${dbrType}`);
        }

        const meta: type_dbr_meta = {};
        for (let ii = 0; ii < Object.keys(meta_struct).length; ii++) {
            const fieldName = Object.keys(meta_struct)[ii] as keyof type_dbr_meta_all;
            const propsData = Object.values(meta_struct)[ii];

            const fieldType = propsData.type;
            const fieldOffset = propsData.offset;
            const fieldSize = propsData.size;
            if (fieldType === "int") {
                const numberRaw = buffer.readIntBE(fieldOffset, fieldSize);
                meta[fieldName] = Number.isNaN(numberRaw) ? 0 : numberRaw as any;
            } else if (fieldType === "uint") {
                const numberRaw = buffer.readUIntBE(fieldOffset, fieldSize);
                meta[fieldName] = Number.isNaN(numberRaw) ? 0 : numberRaw as any;
            } else if (fieldType === "float") {
                const numberRaw = buffer.readFloatBE(fieldOffset);
                meta[fieldName] = Number.isNaN(numberRaw) ? 0 : numberRaw as any;
            } else if (fieldType === "double") {
                const numberRaw = buffer.readDoubleBE(fieldOffset);
                meta[fieldName] = Number.isNaN(numberRaw) ? 0 : numberRaw as any;
            } else if (fieldType === "string") {
                meta[fieldName] = buffer.toString("utf8", fieldOffset, fieldOffset + fieldSize).split("\0")[0] as any;
            } else if (fieldType === "string[]") {
                // only for enum 16 x 26 string array
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
                meta[fieldName] = strs as any;
            } else {
                throw new Error(`Error meta in ${buffer}`);
            }
        }
        // --------------- decode buffer -- value data -------------------
        const bufferSizes = DbrStruct.bufferSizes_table[dbrType];
        const metaSize = bufferSizes[0];
        const paddingSize = bufferSizes[1];
        const elementSize = bufferSizes[2];
        const valueOffset = metaSize + paddingSize;
        const valueType = DbrStruct.valueType_table[dbrType];

        // an array
        let value: (number | string)[] = [];
        if (valueType === "int") {
            for (let count = 0; count < valueCount; count++) {
                const elementOffset = valueOffset + count * elementSize;
                value.push(buffer.readIntBE(elementOffset, elementSize));
            }
        } else if (valueType === "char") {
            for (let count = 0; count < valueCount; count++) {
                const elementOffset = valueOffset + count * elementSize;
                // "char", not "uchar", range is -128 to 127
                value.push(buffer.readIntBE(elementOffset, elementSize));
            }
        } else if (valueType === "float") {
            for (let count = 0; count < valueCount; count++) {
                const elementOffset = valueOffset + count * elementSize;
                value.push(buffer.readFloatBE(elementOffset));
            }
        } else if (valueType === "double") {
            for (let count = 0; count < valueCount; count++) {
                const elementOffset = valueOffset + count * elementSize;
                value.push(buffer.readDoubleBE(elementOffset));
            }
        } else if (valueType === "string") {
            for (let count = 0; count < valueCount; count++) {
                const elementOffset = valueOffset + count * elementSize;
                value.push(buffer.toString("utf8", elementOffset, elementOffset + elementSize).split("\0")[0]);
            }
        } else {
            throw new Error(`Error value in ${buffer}`);
        }

        if (valueCount !== value.length) {
            throw new Error(`Failed to decode data: value count in message header does not match the number of values in payload`);
        } else {
            if (valueCount === 1 && value.length === 1) {
                this.value = value[0];
            } else {
                this.value = value as type_dbr_value;
            }
        }

        // --------------- if the decoding is success, update the data in Dbr ------------
        if (buffer.length !== this.buffer.length) {
            this.buffer = Buffer.alloc(buffer.length);
        }
        // copy the buffer to this.buffer, do not use reference
        buffer.copy(this.buffer);
        this.type = dbrType;
        this.valueCount = valueCount;
        this.meta = meta;
    };

    /**
     * Conver the local type data to buffer data which is sent to CA server
     */
    public encodeBuffer = (value: number | number[] | string | string[], dbrType: Channel_DBR_TYPES): Buffer => {
        // must encode with the default type
        // let dbrType = this.channel.getDbrTypeNum();

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

    // ------------------ getters -------------------

    public getBuffer = (): Buffer => {
        return this.buffer;
    };

    public getType = () => {
        return this.type;
    }

    public getValueCount = () => {
        return this.valueCount;
    }

    public getMeta = () => {
        return this.meta;
    }

    public getValue = () => {
        return this.value;
    }

}

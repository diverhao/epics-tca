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
    private buffer: Buffer;

    // may be changed when receiving
    // (1) CA_PROTO_CREATE_CHAN, or
    // (2) CA_PROTO_READ_NOTIFY
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
    public decodeBuffer = (payloadBuffer: Buffer, dbrType: Channel_DBR_TYPES, valueCount: number) => {
        // if buffer size is not 8 times, throw an exception
        if (payloadBuffer.length % 8 !== 0) {
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
                const numberRaw = payloadBuffer.readIntBE(fieldOffset, fieldSize);
                meta[fieldName] = Number.isNaN(numberRaw) ? 0 : numberRaw as any;
            } else if (fieldType === "uint") {
                const numberRaw = payloadBuffer.readUIntBE(fieldOffset, fieldSize);
                meta[fieldName] = Number.isNaN(numberRaw) ? 0 : numberRaw as any;
            } else if (fieldType === "float") {
                const numberRaw = payloadBuffer.readFloatBE(fieldOffset);
                meta[fieldName] = Number.isNaN(numberRaw) ? 0 : numberRaw as any;
            } else if (fieldType === "double") {
                const numberRaw = payloadBuffer.readDoubleBE(fieldOffset);
                meta[fieldName] = Number.isNaN(numberRaw) ? 0 : numberRaw as any;
            } else if (fieldType === "string") {
                meta[fieldName] = payloadBuffer.toString("utf8", fieldOffset, fieldOffset + fieldSize).split("\0")[0] as any;
            } else if (fieldType === "string[]") {
                // only for enum 16 x 26 string array
                let strs: string[] = [];
                for (let i = 0; i < 16; i++) {
                    let ptr = i * 26 + 6;
                    strs.push(
                        payloadBuffer
                            .slice(ptr, ptr + 25)
                            .toString("utf8")
                            .replaceAll("\0", "")
                    );
                }
                meta[fieldName] = strs as any;
            } else {
                throw new Error(`Error meta in ${payloadBuffer}`);
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
                value.push(payloadBuffer.readIntBE(elementOffset, elementSize));
            }
        } else if (valueType === "char") {
            for (let count = 0; count < valueCount; count++) {
                const elementOffset = valueOffset + count * elementSize;
                // "char", not "uchar", range is -128 to 127
                value.push(payloadBuffer.readIntBE(elementOffset, elementSize));
            }
        } else if (valueType === "float") {
            for (let count = 0; count < valueCount; count++) {
                const elementOffset = valueOffset + count * elementSize;
                value.push(payloadBuffer.readFloatBE(elementOffset));
            }
        } else if (valueType === "double") {
            for (let count = 0; count < valueCount; count++) {
                const elementOffset = valueOffset + count * elementSize;
                value.push(payloadBuffer.readDoubleBE(elementOffset));
            }
        } else if (valueType === "string") {
            for (let count = 0; count < valueCount; count++) {
                const elementOffset = valueOffset + count * elementSize;
                value.push(payloadBuffer.toString("utf8", elementOffset, elementOffset + elementSize).split("\0")[0]);
            }
        } else {
            throw new Error(`Error value in ${payloadBuffer}`);
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
        if (payloadBuffer.length !== this.buffer.length) {
            this.buffer = Buffer.alloc(payloadBuffer.length);
        }
        // copy the buffer to this.buffer, do not use reference
        payloadBuffer.copy(this.buffer);
        this.setType(dbrType);
        this.setValueCount(valueCount);
        this.meta = meta;
    };

    /**
     * A static method to create payload buffer for CA_PROTO_WRITE and CA_PROTO_WRITE_NOTIFY
     * 
     * The payload is encoded to the basic type, i.e. dbrType always falls back to 0 - 6
     * 
     * Each input element may be 
     *  - string
     *  - number
     * an encoded element in payload might be
     *  - DBR_STRING: a 40-byte data chunk, each byte is a character
     *  - DBR_INT: a 2-byte number
     *  - DBR_FLOAT: a 4-byte number represented by IEEE-754
     *  - DBR_ENUM: a 2-byte number
     *  - DBR_CHAR: a 1-byte number
     *  - DBR_LONG: a 4-byte number
     *  - DBR_DOUBLE: an 8-byte number represented by IEEE-754
     * 
     * @param {type_dbr_value} value Value we want to write
     * 
     * @param {Channel_DBR_TYPES} dbrType The DBR type we want to send out
     * 
     * @returns {Buffer} The payload buffer
     * 
     * @throws when the provided value does not fit into the available buffer space.
     *         when the input value array is not consistent through all its elements.
     *         when input array is empty.
     *         when input array element is not string type or number type
     *         when provided DBR type is invalid
     *         when the provided value cannot be parsed, e.g. parseInt("abcd")
     */
    static encodeBuffer = (value: type_dbr_value, dbrType: Channel_DBR_TYPES): Buffer => {
        // ------------- determine the user input element's type -------
        let inputElementType = "";
        if (Array.isArray(value)) {
            if (value.length === 0) {
                // array should be non-empty
                throw new Error(`Array type value should be a non-empty`);
            } else {
                // make sure all elements in value array are the same type
                inputElementType = typeof value[0];
                for (let element of value) {
                    const nthElementType = typeof element;
                    if (inputElementType !== nthElementType) {
                        throw new Error("Input value array must be in same type");
                    }
                }
            }
        } else {
            inputElementType = typeof value;
        }

        if (inputElementType !== "number" && inputElementType !== "string") {
            throw new Error(`Input value's element must be number or string`);
        }

        // -------------- prepare empty buffer ---------------
        // value count
        let valueCount = 1;
        if (Array.isArray(value)) {
            valueCount = value.length;
        }
        // one element's size in unit of byte
        const bufferSizes = DbrStruct.bufferSizes_table[dbrType];
        if (bufferSizes === undefined) {
            throw new Error(`DBR type ${dbrType} is invalid`);
        }
        const elementSize = bufferSizes[2];
        // create empty buffer, padded to multiple of 8
        const usefulBufferSize = elementSize * valueCount;
        let payloadBuffer = Buffer.alloc(
            usefulBufferSize % 8 < 0.0001 ? elementSize * valueCount : Math.floor(usefulBufferSize / 8) * 8 + 8
        );


        // --------------- fill in buffer ----------------

        // the type of he value in buffer
        const valueType = DbrStruct.valueType_table[dbrType];
        // array of value, if the value is one element, put it to an array
        let valueArray: string[] | number[] = [];
        if (typeof value === "number") {
            valueArray = [value];
        } else if (typeof value === "string") {
            valueArray = [value];
        }
        else if (Array.isArray(value)) {
            valueArray = value;
        } else {
            throw new Error("Wrong value type, input value must be number | string | number[] | string[]");
        }

        // inputElementType vs valueType
        // if the Buffer.writeIntBE() has an error, it throws an exception
        if (valueType === "int" || valueType === "char") {
            // 2-, or 4-byte number, for DBR_INT, DBR_ENUM, and DBR_LONG
            for (let count = 0; count < valueArray.length; count++) {
                const offset = count * elementSize;
                const elementRaw = valueArray[count];
                let element = elementRaw;
                if (typeof elementRaw === "number") {
                    // round down
                    element = Math.floor(elementRaw);
                } else if (typeof elementRaw === "string") {
                    // round down
                    element = parseInt(elementRaw); // might be NaN
                    // throws if failed to parse
                    if (Number.isNaN(element) || !Number.isFinite(element)) {
                        throw new Error(`Fail to parse ${elementRaw} to integer.`)
                    }
                } else {
                    throw new Error(`Fail to parse ${value} to integer or array of integers.`)
                }

                // throws if the element is too large for the elementSize
                payloadBuffer.writeIntBE(element, offset, elementSize);
            }
        } else if (valueType === "float" || valueType === "double") {
            // each element is 4- or 8-byte number, for DBR_FLOAT
            for (let count = 0; count < valueArray.length; count++) {
                const offset = count * elementSize;
                const elementRaw = valueArray[count];
                let element = elementRaw;
                if (typeof elementRaw === "number") {
                    element = elementRaw;
                } else if (typeof elementRaw === "string") {
                    element = parseFloat(elementRaw);
                    // throws if failed to parse
                    if (Number.isNaN(element) || !Number.isFinite(element)) {
                        throw new Error(`Fail to parse ${elementRaw} to integer.`)
                    }
                } else {
                    throw new Error(`Fail to parse ${value} to integer or array of integers.`)
                }
                if (valueType === "float") {
                    // it writes Infinity (0x7f800000) if the element overflows
                    payloadBuffer.writeFloatBE(element, offset);
                } else if (valueType === "double") {
                    payloadBuffer.writeDoubleBE(element, offset);
                }
            }
        } else if (valueType === "string") {
            // each element is a 40-byte data chunk
            // longer input will be cut off to 39 bytes
            for (let count = 0; count < valueArray.length; count++) {
                for (let count = 0; count < valueArray.length; count++) {
                    const offset = count * elementSize;
                    // convert the number to string literally according to its ASCII, e.g. 3.14 --> 0x33 0x2e 0x31 0x34
                    // convert the string to string
                    const elementRaw = valueArray[count];
                    let element = "";
                    if (typeof elementRaw === "number" || typeof elementRaw === "string") {
                        element = `${elementRaw}`;
                    } else {
                        throw new Error(`Element type must be string | number | number[] | string[]`);
                    }
                    // Buffer.copy() does not throw an exception when the src is longer than destination
                    // manually throw
                    if (element.length > elementSize - 1) {
                        element = element.slice(0, elementSize - 1);
                    }
                    Buffer.from(element).copy(payloadBuffer, offset);
                }
            }
        } else {
            throw new Error(`Wrong data`);
        }

        return payloadBuffer;
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

    public setValueCount = (newCount: number) => {
        this.valueCount = newCount;
    }

    public setType = (newType: Channel_DBR_TYPES) => {
        this.type = newType;
    }
}

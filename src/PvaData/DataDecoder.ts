import { checkDataAndType, checkType, SIZE_TYPE, type_typeIndex, typeIndexEnum } from "./PvaData_typeEncoding";
import { readDouble, readFloat, readInt16, readInt32, readInt64, readInt8, readUInt16, readUInt32, readUInt64, readUInt8 } from "./PvaMethods";
import { ENDIAN } from "./PvaMethods"
import { decodeType, getDecodingTypeNewOffset } from "./TypeDecoder";

// ---------------------- offset of decoding -----------------------

/**
 * Internal variable for decoding a data buffer. It saves the current location of decoding.
 */
let decodingNewOffset = 0;

/**
 * Obtain the current offset in the data Buffer during this data decoding process.
 * 
 * This offset automatically increases after a Buffer chunk is decoded. It is reset
 * to 0 when the decodeData() is invoked. It cannot be manually modified.
 */
export const getDecodingDataNewOffset = () => {
    return decodingNewOffset;
}

// ------------------------- size data decoding ---------------------

/**
 * Obtain a size from Buffer.
 * 
 * It is internally used for data decoding. It updates the decodingNewOffset variable.
 * 
 * @param {Buffer} buffer The input buffer
 * 
 * @param {number} offset The beginning byte in the buffer
 * 
 * @param {Endian} endian The endian that is used to decode the number
 * 
 * @param {SIZE_TYPE | undefined} sizeType The type of size. In PVA protocol, nomally a size should be encoded to a "size". 
 *                                         However, some sizes are encoded as "unsigned short".
 *                                         If undefined, it is decoded as a "size"
 * 
 * @returns {{size: number | bigint}} the size value
 * 
 * @throws when the buffer cannot be correctly decoded
 */
export const decodeSize = (buffer: Buffer, offset: number, endian: ENDIAN, sizeType: SIZE_TYPE | undefined): number | bigint => {

    if (sizeType === SIZE_TYPE.unsigned_short) {
        const size = readUInt16(buffer, offset, endian);
        decodingNewOffset = offset + 2;
        return size;
    } else { // undefined or SIZE_TYPE.size

        const byte1: number = readUInt8(buffer, offset, endian);
        if (byte1 < 0xff) {
            // [0, 255)
            decodingNewOffset = offset + 1;
            return byte1;
        } else if (byte1 === 0xff) {
            // >= 255
            const byte2to5 = readUInt32(buffer, offset + 1, endian);
            if (byte2to5 >= 0xff && byte2to5 < 0x7fffffff) { // >=255 and < 2^31 -1
                decodingNewOffset = offset + 5;
                return byte2to5;
            } else if (byte2to5 === 0x7fffffff) {
                // >= 2^31  -1 && < 2^64 - 1
                const byte6to13 = readUInt64(buffer, offset + 5, endian);
                if (byte6to13 >= 0x7fffffff && byte6to13 < 0x7fffffffffffffffn) {
                    decodingNewOffset = offset + 13;                
                    return byte6to13;
                } else {
                    throw new Error("");
                }
            } else {
                throw new Error("");
            }
        } else {
            // we should not have this case
            throw new Error("");
        }

    }
};

// ---------------------- Status data decoding ----------------------

const type_statusSimplified = {
    typeIndex: typeIndexEnum.complex_scalar_structure,
    name: "Status",
    fields: {
        type: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
    }
}

const type_statusFull = {
    typeIndex: typeIndexEnum.complex_scalar_structure,
    name: "Status",
    fields: {
        type: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
        message: { typeIndex: typeIndexEnum.string_scalar },
        callTree: { typeIndex: typeIndexEnum.string_scalar },
    }
}

export const decodeStatus = (buffer: Buffer, offset: number, endian: ENDIAN) => {
    const dataSimplified = decodeData(type_statusSimplified, buffer, offset, endian);
    if (dataSimplified["type"] === 0xff) {
        return dataSimplified;
    } else {
        const dataFull = decodeData(type_statusFull, buffer, offset, endian);
        return dataFull;
    }
}

// ------------------------ BitSets data decoding -------------------

export const decodeBitSets = (buffer: Buffer, offset: number, endian: ENDIAN) => {

    const size = decodeSize(buffer, offset, endian, SIZE_TYPE.size);
    if (size < 255) {
        offset = offset + 1;
    } else if (size >= 255 && size < 0x7fffffff) {
        offset = offset + 1 + 4;
    } else {
        offset = offset + 1 + 4 + 8;
    }
    const result: number[] = [];
    for (let ii = offset; ii < offset + Number(size); ii++) {
        const byteValue = readUInt8(buffer, ii, endian);
        for (let jj = 0; jj < 8; jj++) {
            const bitValue = (byteValue >> jj) & 0x01;
            if (bitValue === 1) {
                result.push((ii - offset) * 8 + jj);
            }
        }
    }
    decodingNewOffset = offset + Number(size);
    return result;
}



/**
 * Decode PVA a Buffer data using the provided type.
 * 
 * @param {any} type The type of the data, it is an object in form of {typeIndex: "0x81", fields: {...}}
 * 
 * @param {Buffer} buffer The Buffer object that contains the data that will be decoded
 *                        It must match the provided type
 * 
 * @param {number} offset The beginning location in the Buffer for decoding
 * 
 * @param {ENDIAN} endian The endian used for decoding the Buffer
 * 
 * @returns {any} The object or data that contains the data, e.g. 37, ["ab", "cd"], {value: 22, timeStamp: {...}}
 * 
 * @throws if the decoding fails.
 *         There are variety of reason that the decoding could fail. For example, the type and Buffer are not matched,
 *         cannot find the decoder function for this type, format error in Buffer or type.
 */
export const decodeData = (
    type: any,
    buffer: Buffer,
    offset: number,
    endian: ENDIAN) => {

    checkType(type);

    const typeIndex = type["typeIndex"];
    const decoder = DataDecoder[typeIndex as type_typeIndex]; // for typescript
    if (decoder === undefined) {
        throw new Error(`Cannot find data decoder for type index ${typeIndex}`);
    }
    // the "type as any" is safe guarded by the above decoder() finding process
    // in the DataDecoder object definition, we have gauranteed that the type["typeIndex"] matches the its key in DataDecoder object
    const result: any = decoder(type, buffer, offset, endian);

    checkDataAndType(result, type);

    return result;
}

const DataDecoder = {

    // complex_variableSizeArray_variantUnion 
    "0x8a": (type: { typeIndex: "0x8a", id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        const result: any[] = [];

        const decoder = DataDecoder["0x82"];

        for (let ii = 0; ii < size; ii++) {
            const union = decoder({ typeIndex: "0x82" }, buffer, decodingNewOffset, endian);
            result.push(union);
        }
        return result;
    },

    // complex_variableSizeArray_union 
    "0x89": (type: { typeIndex: "0x89", name: string, id?: number, tag?: number, elementId?: number, elementTag?: number, sizeType?: SIZE_TYPE, elementSizeType?: SIZE_TYPE, fields: Record<string, any> }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        const result: any[] = [];

        const decoder = DataDecoder["0x81"];

        for (let ii = 0; ii < size; ii++) {
            const union = decoder({ ...type, id: type["elementId"], tag: type["elementTag"], sizeType: type["elementSizeType"], typeIndex: "0x81" }, buffer, decodingNewOffset, endian);
            result.push(union);
        }
        return result;
    },

    // complex_variableSizeArray_structure 
    "0x88": (type: { typeIndex: "0x88", name: string, id?: number, tag?: number, elementId?: number, elementTag?: number, sizeType?: SIZE_TYPE, elementSizeType?: SIZE_TYPE, fields: Record<string, any> }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        const result: any[] = [];

        const decoder = DataDecoder["0x80"];

        for (let ii = 0; ii < size; ii++) {
            const struct = decoder({ ...type, id: type["elementId"], tag: type["elementTag"], sizeType: type["elementSizeType"], typeIndex: "0x80" }, buffer, decodingNewOffset, endian);
            result.push(struct);
        }
        return result;
    },

    // complex_scalar_boundedString 
    "0x83": (type: { typeIndex: "0x83", size: number, id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        // bounded size
        const size = type["size"];

        // actual size
        const actualSize = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        // size could be bigint, but I don't think a string size can exceed 2^31
        const str = buffer.toString("utf-8", decodingNewOffset, decodingNewOffset + Number(actualSize));
        decodingNewOffset = decodingNewOffset + Number(actualSize);

        return str;
    },

    // complex_scalar_variantUnion 
    "0x82": (type: { typeIndex: "0x82", id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN): any => {

        decodingNewOffset = offset;

        // decode type
        const dataType = decodeType(buffer, decodingNewOffset, endian);
        if (Object.keys(dataType).length === 0) {
            throw new Error(`Variant union type cannot be empty`);
        }
        // get the offset from TypeDecoder
        decodingNewOffset = getDecodingTypeNewOffset();

        // decode data
        const dataValue = decodeData(dataType, buffer, decodingNewOffset, endian);
        return { type: dataType, value: dataValue }
    },

    // complex_scalar_union 
    "0x81": (type: { typeIndex: "0x81", name: string, id?: number, tag?: number, sizeType?: SIZE_TYPE, fields: Record<string, any> }, buffer: Buffer, offset: number, endian: ENDIAN): any => {
        decodingNewOffset = offset;

        const index = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        const fieldTypes = Object.values(type["fields"]);
        const selectedType = fieldTypes[Number(index)];

        const value = decodeData(selectedType, buffer, decodingNewOffset, endian);

        // return must include the index, we don't want to lose any information
        return { index: Number(index), value: value };
    },

    // complex_scalar_structure 
    "0x80": (type: { typeIndex: "0x80", name: string, id?: number, tag?: number, sizeType?: SIZE_TYPE, fields: Record<string, any> }, buffer: Buffer, offset: number, endian: ENDIAN): any => {
        decodingNewOffset = offset;

        const result: any = {};

        const fieldNames = Object.keys(type["fields"]);
        const fieldTypes = Object.values(type["fields"]);
        for (let ii = 0; ii < fieldNames.length; ii++) {
            const fieldName = fieldNames[ii];
            const fieldType = fieldTypes[ii];

            const fieldValue = decodeData(fieldType, buffer, decodingNewOffset, endian);

            result[fieldName] = fieldValue;
        }

        return result;
    },

    // string_fixedSizeArray 
    "0x78": (type: { typeIndex: "0x78", size: number, id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];

        const result: string[] = [];

        for (let ii = 0; ii < size; ii++) {
            const str = decodeData({ typeIndex: "0x60" }, buffer, decodingNewOffset, endian);
            result.push(str);
        }
        return result;
    },

    // string_boundedSizeArray 
    "0x70": (type: { typeIndex: "0x70", size: number, id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];

        const actualSize = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        const result: string[] = [];

        for (let ii = 0; ii < actualSize; ii++) {
            const str = decodeData({ typeIndex: "0x60" }, buffer, decodingNewOffset, endian);
            result.push(str);
        }

        return result;
    },

    // string_variableSizeArray 
    "0x68": (type: { typeIndex: "0x68", id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const actualSize = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        const result: string[] = [];

        for (let ii = 0; ii < actualSize; ii++) {
            const str = decodeData({ typeIndex: "0x60" }, buffer, decodingNewOffset, endian);
            result.push(str);
        }

        return result;
    },

    // string_scalar 
    "0x60": (type: { typeIndex: "0x60", id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN): string => {
        decodingNewOffset = offset;
        const size = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);
        const str = buffer.toString("utf-8", decodingNewOffset, decodingNewOffset + Number(size));
        decodingNewOffset = decodingNewOffset + Number(size);
        return str;
    },

    // floatingPoint_fixedSizeArray_binary64 
    "0x5b": (type: { typeIndex: "0x5b", size: number, id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];

        const result: number[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x43" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // floatingPoint_fixedSizeArray_binary32 
    "0x5a": (type: { typeIndex: "0x5a", size: number, id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];

        const result: number[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x42" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // floatingPoint_boundedSizeArray_binary64 
    "0x53": (type: { typeIndex: "0x53", size: number, id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];

        const result: number[] = [];

        const actualSize = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        for (let ii = 0; ii < actualSize; ii++) {
            const num = decodeData({ typeIndex: "0x43" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // floatingPoint_boundedSizeArray_binary32 
    "0x52": (type: { typeIndex: "0x52", size: number, id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];

        const result: number[] = [];

        const actualSize = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        for (let ii = 0; ii < actualSize; ii++) {
            const num = decodeData({ typeIndex: "0x42" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // floatingPoint_variableSizeArray_binary64 
    "0x4b": (type: { typeIndex: "0x4b", id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        const result: number[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x43" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // floatingPoint_variableSizeArray_binary32 
    "0x4a": (type: { typeIndex: "0x4a", id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        const result: number[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x42" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // floatingPoint_scalar_binary64 
    "0x43": (type: { typeIndex: "0x43", id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readDouble(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 8;
        return result;
    },

    // floatingPoint_scalar_binary32 
    "0x42": (type: { typeIndex: "0x42", id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readFloat(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 4;
        return result;
    },

    // integer_fixedSizeArray_unsignedLong 
    "0x3f": (type: { typeIndex: "0x3f", size: number, id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];

        const result: bigint[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x27" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }

        return result;
    },

    // integer_fixedSizeArray_unsignedInt 
    "0x3e": (type: { typeIndex: "0x3e", size: number, id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];

        const result: number[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x26" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }

        return result;
    },

    // integer_fixedSizeArray_unsignedShort 
    "0x3d": (type: { typeIndex: "0x3d", size: number, id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];

        const result: number[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x25" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_fixedSizeArray_unsignedByte 
    "0x3c": (type: { typeIndex: "0x3c", size: number, id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];

        const result: number[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x24" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }

        return result;
    },

    // integer_fixedSizeArray_signedLong 
    "0x3b": (type: { typeIndex: "0x3b", size: number, id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];

        const result: bigint[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x23" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }

        return result;
    },

    // integer_fixedSizeArray_signedInt 
    "0x3a": (type: { typeIndex: "0x3a", size: number, id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];

        const result: number[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x22" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }

        return result;
    },

    // integer_fixedSizeArray_signedShort 
    "0x39": (type: { typeIndex: "0x39", size: number, id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];

        const result: number[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x21" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_fixedSizeArray_signedByte 
    "0x38": (type: { typeIndex: "0x38", size: number, id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];

        const result: number[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x20" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_boundedSizeArray_unsignedLong 
    "0x37": (type: { typeIndex: "0x37", size: number, id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];

        const actualSize = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        const result: bigint[] = [];

        for (let ii = 0; ii < actualSize; ii++) {
            const num = decodeData({ typeIndex: "0x27" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_boundedSizeArray_unsignedInt 
    "0x36": (type: { typeIndex: "0x36", size: number, id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];
        const actualSize = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        const result: number[] = [];

        for (let ii = 0; ii < actualSize; ii++) {
            const num = decodeData({ typeIndex: "0x26" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_boundedSizeArray_unsignedShort 
    "0x35": (type: { typeIndex: "0x35", size: number, id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];
        const actualSize = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        const result: number[] = [];

        for (let ii = 0; ii < actualSize; ii++) {
            const num = decodeData({ typeIndex: "0x25" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }

        return result;
    },

    // integer_boundedSizeArray_unsignedByte 
    "0x34": (type: { typeIndex: "0x34", size: number, id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];
        const actualSize = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        const result: number[] = [];

        for (let ii = 0; ii < actualSize; ii++) {
            const num = decodeData({ typeIndex: "0x24" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }

        return result;
    },

    // integer_boundedSizeArray_signedLong 
    "0x33": (type: { typeIndex: "0x33", size: number, id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];
        const actualSize = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        const result: bigint[] = [];

        for (let ii = 0; ii < actualSize; ii++) {
            const num = decodeData({ typeIndex: "0x23" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_boundedSizeArray_signedInt 
    "0x32": (type: { typeIndex: "0x32", size: number, id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];
        const actualSize = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        const result: number[] = [];

        for (let ii = 0; ii < actualSize; ii++) {
            const num = decodeData({ typeIndex: "0x22" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;

    },
    // integer_boundedSizeArray_signedShort 
    "0x31": (type: { typeIndex: "0x31", size: number, id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];
        const actualSize = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        const result: number[] = [];

        for (let ii = 0; ii < actualSize; ii++) {
            const num = decodeData({ typeIndex: "0x21" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_boundedSizeArray_signedByte 
    "0x30": (type: { typeIndex: "0x30", size: number, id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];
        const actualSize = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        const result: number[] = [];

        for (let ii = 0; ii < actualSize; ii++) {
            const num = decodeData({ typeIndex: "0x20" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_variableSizeArray_unsignedLong 
    "0x2f": (type: { typeIndex: "0x2f", id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        const result: bigint[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x27" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_variableSizeArray_unsignedInt 
    "0x2e": (type: { typeIndex: "0x2e", id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        const result: number[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x26" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_variableSizeArray_unsignedShort 
    "0x2d": (type: { typeIndex: "0x2d", id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        const result: number[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x25" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_variableSizeArray_unsignedByte 
    "0x2c": (type: { typeIndex: "0x2c", id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        const result: number[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x24" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_variableSizeArray_signedLong 
    "0x2b": (type: { typeIndex: "0x2b", id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        const result: bigint[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x23" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_variableSizeArray_signedInt 
    "0x2a": (type: { typeIndex: "0x2a", id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        const result: number[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x22" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_variableSizeArray_signedShort 
    "0x29": (type: { typeIndex: "0x29", id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        const result: number[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x21" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_variableSizeArray_signedByte 
    "0x28": (type: { typeIndex: "0x28", id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        const result: number[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x20" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_scalar_unsignedLong 
    "0x27": (type: { typeIndex: "0x27", id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readUInt64(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 8;
        return result;
    },

    // integer_scalar_unsignedInt 
    "0x26": (type: { typeIndex: "0x26", id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readUInt32(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 4;
        return result;
    },

    // integer_scalar_unsignedShort 
    "0x25": (type: { typeIndex: "0x25", id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readUInt16(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 2;
        return result;
    },

    // integer_scalar_unsignedByte 
    "0x24": (type: { typeIndex: "0x24", id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readUInt8(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 1;
        return result;
    },

    // integer_scalar_signedLong 
    "0x23": (type: { typeIndex: "0x23", id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readInt64(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 8;
        return result;
    },

    // integer_scalar_signedInt 
    "0x22": (type: { typeIndex: "0x22", id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readInt32(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 4;
        return result;
    },

    // integer_scalar_signedShort 
    "0x21": (type: { typeIndex: "0x21", id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readInt16(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 2;
        return result;
    },

    // integer_scalar_signedByte 
    "0x20": (type: { typeIndex: "0x20", id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readInt8(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 1;
        return result;
    },

    // boolean_fixedSizeArray 
    "0x18": (type: { typeIndex: "0x18", size: number, id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];

        const result: boolean[] = [];

        for (let ii = 0; ii < size; ii++) {
            const element = decodeData({ typeIndex: "0x0" }, buffer, decodingNewOffset, endian);
            result.push(element);
        }
        return result;
    },

    // boolean_boundedSizeArray 
    "0x10": (type: { typeIndex: "0x10", size: number, id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];
        const actualSize = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        const result: boolean[] = [];

        for (let ii = 0; ii < actualSize; ii++) {
            const element = decodeData({ typeIndex: "0x0" }, buffer, decodingNewOffset, endian);
            result.push(element);
        }
        return result;
    },

    // boolean_variableSizeArray 
    "0x8": (type: { typeIndex: "0x8", id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = decodeSize(buffer, decodingNewOffset, endian, type["sizeType"]);

        const result: boolean[] = [];

        for (let ii = 0; ii < size; ii++) {
            const element = decodeData({ typeIndex: "0x0" }, buffer, decodingNewOffset, endian);
            result.push(element);
        }
        return result;
    },

    // boolean_scalar 
    "0x0": (type: { typeIndex: "0x0", id?: number, tag?: number, sizeType?: SIZE_TYPE }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readUInt8(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 1;
        return result === 0 ? false : true;
    },
}
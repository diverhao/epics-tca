import { readDouble, readFloat, readInt16, readInt32, readInt64, readInt8, readUInt16, readUInt32, readUInt64, readUInt8 } from "./PvaMethods";
import { ENDIAN } from "./PvaMethods"
import { decodeType, getDecodingTypeNewOffset } from "./TypeDecoders";

let decodingNewOffset = 0;


export const getDecodingDataNewOffset = () => {
    return decodingNewOffset;
}

export type type_DataDecoder = (typeof DataDecoder)[keyof typeof DataDecoder];

/**
 * Decode a size, the size is not affected by endian, but the 4- or 8-byte integer inside of it follows the endian.
 * 
 * It is internally used for decoding a data buffer.
 * 
 * @returns {{size: number | bigint}} the new offset in buffer and size
 * 
 * @throws when the buffer cannot be correctly decoded
 */
const decodeSize = (buffer: Buffer, offset: number, endian: ENDIAN): {
    size: number | bigint,
} => {

    const byte1: number = readUInt8(buffer, offset, endian);
    if (byte1 === 0xff) {
        // >= 255
        const byte2to5 = readInt32(buffer, 1, endian);
        if (byte2to5 === 0x7fffffff) {
            // >= 2^31  - 1
            const byte6to13 = readInt64(buffer, offset + 5, endian);
            if (byte6to13 < 0x7fffffff) {
                throw new Error("decodeSize: wrong format");
            }
            // [2^31 - 1, 2^63 - 1)
            decodingNewOffset = offset + 13;
            return {
                size: byte6to13,
            }
        } else {
            if (byte2to5 < 0xff) {
                throw new Error("decodeSize: wrong format");
            }
            // [255, 2^31 - 1)
            decodingNewOffset = offset + 5;
            return {
                size: byte2to5,
            }
        }
    } else {
        // [0, 255)
        decodingNewOffset = offset + 1;
        return {
            size: byte1,
        };
    }
};

export const decodeData = (
    type: { typeIndex: type_typeIndex }
        | { typeIndex: type_typeIndex, size: number }
        | { typeIndex: type_typeIndex, name: string, id?: number, tag?: number, fields: Record<string, any> },
    buffer: Buffer,
    offset: number,
    endian: ENDIAN) => {

    const typeIndex = type["typeIndex"];
    const decoder = DataDecoder[typeIndex] as any; // for typescript
    if (decoder === undefined) {
        throw new Error(`Cannot find data decoder for type index ${typeIndex}`);
    }
    const result = decoder(type, buffer, offset, endian);
    return result;
}

/**
 * "0x8a" | "0x89" | "0x88" | "0x83" | "0x82" | "0x81" | "0x80" | ... | "0x0"
 */
export type type_typeIndex = keyof typeof DataDecoder;

const DataDecoder = {

    // complex_variableSizeArray_variantUnion 
    "0x8a": (type: { typeIndex: "0x8a" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: Record<string, any>[] = [];

        for (let ii = 0; ii < size; ii++) {
            const union = decodeData({ typeIndex: "0x82" }, buffer, decodingNewOffset, endian);
            result.push(union);
        }
        return result;
    },

    // complex_variableSizeArray_union 
    "0x89": (type: { typeIndex: "0x89", name: string, id?: number, tag?: number, fields: Record<string, any> }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: Record<string, any>[] = [];

        for (let ii = 0; ii < size; ii++) {
            const union = decodeData({ ...type, typeIndex: "0x81" }, buffer, decodingNewOffset, endian);
            result.push(union);
        }
        return result;
    },

    // complex_variableSizeArray_structure 
    "0x88": (type: { typeIndex: "0x88", name: string, id?: number, tag?: number, fields: Record<string, any> }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: Record<string, any>[] = [];

        for (let ii = 0; ii < size; ii++) {
            const struct = decodeData({ ...type, typeIndex: "0x80" }, buffer, decodingNewOffset, endian);
            result.push(struct);
        }
        return result;
    },

    // complex_scalar_boundedString 
    "0x83": (type: { typeIndex: "0x83", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        // bounded size
        const size = type["size"];

        // actual size
        const actualSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const actualSize = actualSizeResult["size"];
        if (actualSize > size) {
            throw new Error(`Bounded string actual size ${actualSize} larger than bounded size ${size}`);
        }

        // size could be bigint, but I don't think a string size can exceed 2^31
        const str = buffer.toString("utf-8", decodingNewOffset, decodingNewOffset + Number(actualSize));
        decodingNewOffset = decodingNewOffset + Number(actualSize);

        return str;
    },

    // complex_scalar_variantUnion 
    "0x82": (type: { typeIndex: "0x82" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        // variant union type has nothing but typeIndex: "0x82"
        // the type of the data that is inside the variant union is encoded in the data buffer
        // the data itself then follows the data's type info in data buffer

        decodingNewOffset = offset;

        // decode the type
        const dataType = decodeType(buffer, decodingNewOffset, endian);
        console.log(dataType, decodingNewOffset, buffer[decodingNewOffset])
        decodingNewOffset = getDecodingTypeNewOffset();
        console.log(dataType, decodingNewOffset, buffer[decodingNewOffset])

        // decode data
        const result = decodeData(dataType, buffer, decodingNewOffset, endian);

        return result;
    },

    // complex_scalar_union 
    "0x81": (type: { typeIndex: "0x81", name: string, id?: number, tag?: number, fields: Record<string, any> }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const indexResult = decodeSize(buffer, decodingNewOffset, endian);
        const index = indexResult["size"];

        const fieldTypes = Object.values(type["fields"]);
        const selectedType = fieldTypes[Number(index)];

        const value = decodeData(selectedType, buffer, decodingNewOffset, endian) as any;

        // return must include the index, we don't want to lose any information
        return {index: index, value: value};
    },

    // complex_scalar_structure 
    "0x80": (type: { typeIndex: "0x80", name: string, id?: number, tag?: number, fields: Record<string, any> }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const result: Record<string, any> = {};

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
    "0x78": (type: { typeIndex: "0x78", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
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
    "0x70": (type: { typeIndex: "0x70", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];

        const actualSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const actualSize = actualSizeResult["size"];
        if (actualSize > size) {
            throw new Error(`Bounded size array actual size ${actualSize} larger than bound size ${size}`);
        }

        const result: string[] = [];

        for (let ii = 0; ii < actualSize; ii++) {
            const str = decodeData({ typeIndex: "0x60" }, buffer, decodingNewOffset, endian);
            result.push(str);
        }

        return result;
    },

    // string_variableSizeArray 
    "0x68": (type: { typeIndex: "0x68" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const actualSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const actualSize = actualSizeResult["size"];

        const result: string[] = [];

        for (let ii = 0; ii < actualSize; ii++) {
            const str = decodeData({ typeIndex: "0x60" }, buffer, decodingNewOffset, endian);
            result.push(str);
        }

        return result;
    },

    // string_scalar 
    "0x60": (type: { typeIndex: "0x60" }, buffer: Buffer, offset: number, endian: ENDIAN): string => {
        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        // size could be bigint, but I don't think a string size can exceed 2^31
        if (decodingNewOffset + Number(size) > buffer.length) {
            throw new Error(`Buffer size ${buffer.length} smaller than string end location ${decodingNewOffset + Number(size)}`);
        }
        const str = buffer.toString("utf-8", decodingNewOffset, decodingNewOffset + Number(size));
        decodingNewOffset = decodingNewOffset + Number(size);
        return str;
    },

    // floatingPoint_fixedSizeArray_binary64 
    "0x5b": (type: { typeIndex: "0x5b", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
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
    "0x5a": (type: { typeIndex: "0x5a", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
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
    "0x53": (type: { typeIndex: "0x53", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];

        const result: number[] = [];

        const actualSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const actualSize = actualSizeResult["size"];
        if (actualSize > size) {
            throw new Error(`Bounded array actual size ${actualSize} larger than bounded size ${size}`);
        }

        for (let ii = 0; ii < actualSize; ii++) {
            const num = decodeData({ typeIndex: "0x43" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // floatingPoint_boundedSizeArray_binary32 
    "0x52": (type: { typeIndex: "0x52", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];

        const result: number[] = [];

        const actualSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const actualSize = actualSizeResult["size"];
        if (actualSize > size) {
            throw new Error(`Bounded array actual size ${actualSize} larger than bound size ${size}`);
        }

        for (let ii = 0; ii < actualSize; ii++) {
            const num = decodeData({ typeIndex: "0x42" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // floatingPoint_variableSizeArray_binary64 
    "0x4b": (type: { typeIndex: "0x4b" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: number[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x43" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // floatingPoint_variableSizeArray_binary32 
    "0x4a": (type: { typeIndex: "0x4a" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: number[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x42" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // floatingPoint_scalar_binary64 
    "0x43": (type: { typeIndex: "0x43" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readDouble(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 8;
        return result;
    },

    // floatingPoint_scalar_binary32 
    "0x42": (type: { typeIndex: "0x42" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readFloat(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 4;
        return result;
    },

    // integer_fixedSizeArray_unsignedLong 
    "0x3f": (type: { typeIndex: "0x3f", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
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
    "0x3e": (type: { typeIndex: "0x3e", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
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
    "0x3d": (type: { typeIndex: "0x3d", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
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
    "0x3c": (type: { typeIndex: "0x3c", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
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
    "0x3b": (type: { typeIndex: "0x3b", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
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
    "0x3a": (type: { typeIndex: "0x3a", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
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
    "0x39": (type: { typeIndex: "0x39", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
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
    "0x38": (type: { typeIndex: "0x38", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
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
    "0x37": (type: { typeIndex: "0x37", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];

        const actualSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const actualSize = actualSizeResult["size"];
        if (actualSize > size) {
            throw new Error(`Bounded size array actual size ${actualSize} larger than bound size ${size}`);
        }

        const result: bigint[] = [];

        for (let ii = 0; ii < actualSize; ii++) {
            const num = decodeData({ typeIndex: "0x27" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_boundedSizeArray_unsignedInt 
    "0x36": (type: { typeIndex: "0x36", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];
        const actualSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const actualSize = actualSizeResult["size"];
        if (actualSize > size) {
            throw new Error(`Bound size array actual size ${actualSize} larger than bound size ${size}`);
        }

        const result: number[] = [];

        for (let ii = 0; ii < actualSize; ii++) {
            const num = decodeData({ typeIndex: "0x26" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_boundedSizeArray_unsignedShort 
    "0x35": (type: { typeIndex: "0x35", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];
        const actualSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const actualSize = actualSizeResult["size"];
        if (actualSize > size) {
            throw new Error(`Bounded size array actual size ${actualSize} larger than bound size ${size}`);
        }

        const result: number[] = [];

        for (let ii = 0; ii < actualSize; ii++) {
            const num = decodeData({ typeIndex: "0x25" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }

        return result;
    },

    // integer_boundedSizeArray_unsignedByte 
    "0x34": (type: { typeIndex: "0x34", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];
        const actualSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const actualSize = actualSizeResult["size"];
        if (actualSize > size) {
            throw new Error(`Bounded size array actual size ${actualSize} larger than bound size ${size}`);
        }

        const result: number[] = [];

        for (let ii = 0; ii < actualSize; ii++) {
            const num = decodeData({ typeIndex: "0x24" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }

        return result;
    },

    // integer_boundedSizeArray_signedLong 
    "0x33": (type: { typeIndex: "0x33", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];
        const actualSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const actualSize = actualSizeResult["size"];

        if (actualSize > size) {
            throw new Error(`Bounded size array actual size ${actualSize} larger than bound size ${size}`);
        }

        const result: bigint[] = [];

        for (let ii = 0; ii < actualSize; ii++) {
            const num = decodeData({ typeIndex: "0x23" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_boundedSizeArray_signedInt 
    "0x32": (type: { typeIndex: "0x32", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];
        const actualSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const actualSize = actualSizeResult["size"];
        if (actualSize > size) {
            throw new Error(`Bounded size array actual size ${actualSize} larger than bound size ${size}`);
        }

        const result: number[] = [];

        for (let ii = 0; ii < actualSize; ii++) {
            const num = decodeData({ typeIndex: "0x22" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;

    },
    // integer_boundedSizeArray_signedShort 
    "0x31": (type: { typeIndex: "0x31", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];
        const actualSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const actualSize = actualSizeResult["size"];
        if (actualSize > size) {
            throw new Error(`Bound size array actual size ${actualSize} larger than bound size ${size}`);
        }

        const result: number[] = [];

        for (let ii = 0; ii < actualSize; ii++) {
            const num = decodeData({ typeIndex: "0x21" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_boundedSizeArray_signedByte 
    "0x30": (type: { typeIndex: "0x30", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];
        const actualSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const actualSize = actualSizeResult["size"];
        if (actualSize > size) {
            throw new Error(`bound size array actual size ${actualSize} larger than bound size ${size}`);
        }

        const result: number[] = [];

        for (let ii = 0; ii < actualSize; ii++) {
            const num = decodeData({ typeIndex: "0x20" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_variableSizeArray_unsignedLong 
    "0x2f": (type: { typeIndex: "0x2f" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: bigint[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x27" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_variableSizeArray_unsignedInt 
    "0x2e": (type: { typeIndex: "0x2e" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: number[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x26" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_variableSizeArray_unsignedShort 
    "0x2d": (type: { typeIndex: "0x2d" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: number[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x25" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_variableSizeArray_unsignedByte 
    "0x2c": (type: { typeIndex: "0x2c" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: number[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x24" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_variableSizeArray_signedLong 
    "0x2b": (type: { typeIndex: "0x2b" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: bigint[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x23" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_variableSizeArray_signedInt 
    "0x2a": (type: { typeIndex: "0x2a" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: number[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x22" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_variableSizeArray_signedShort 
    "0x29": (type: { typeIndex: "0x29" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: number[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x21" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_variableSizeArray_signedByte 
    "0x28": (type: { typeIndex: "0x28" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: number[] = [];

        for (let ii = 0; ii < size; ii++) {
            const num = decodeData({ typeIndex: "0x20" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_scalar_unsignedLong 
    "0x27": (type: { typeIndex: "0x27" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readUInt64(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 8;
        return result;
    },

    // integer_scalar_unsignedInt 
    "0x26": (type: { typeIndex: "0x26" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readUInt32(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 4;
        return result;
    },

    // integer_scalar_unsignedShort 
    "0x25": (type: { typeIndex: "0x25" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readUInt16(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 2;
        return result;
    },

    // integer_scalar_unsignedByte 
    "0x24": (type: { typeIndex: "0x24" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readUInt8(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 1;
        return result;
    },

    // integer_scalar_signedLong 
    "0x23": (type: { typeIndex: "0x23" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readInt64(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 8;
        return result;
    },

    // integer_scalar_signedInt 
    "0x22": (type: { typeIndex: "0x22" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readInt32(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 4;
        return result;
    },

    // integer_scalar_signedShort 
    "0x21": (type: { typeIndex: "0x21" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readInt16(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 2;
        return result;
    },

    // integer_scalar_signedByte 
    "0x20": (type: { typeIndex: "0x20" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readInt8(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 1;
        return result;
    },

    // boolean_fixedSizeArray 
    "0x18": (type: { typeIndex: "0x18", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
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
    "0x10": (type: { typeIndex: "0x10", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];
        const actualSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const actualSize = actualSizeResult["size"];
        if (actualSize > size) {
            throw new Error(`Bound size array actual size ${actualSize} larger than bounded size ${size}`);
        }

        const result: boolean[] = [];

        for (let ii = 0; ii < actualSize; ii++) {
            const element = decodeData({ typeIndex: "0x0" }, buffer, decodingNewOffset, endian);
            result.push(element);
        }
        return result;
    },

    // boolean_variableSizeArray 
    "0x8": (type: { typeIndex: "0x8" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: boolean[] = [];

        for (let ii = 0; ii < size; ii++) {
            const element = decodeData({ typeIndex: "0x0" }, buffer, decodingNewOffset, endian);
            result.push(element);
        }
        return result;
    },

    // boolean_scalar 
    "0x0": (type: { typeIndex: "0x0" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readUInt8(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 1;
        return result === 0 ? false : true;
    },
}
import { readDouble, readFloat, readInt16, readInt32, readInt64, readInt8, readUInt16, readUInt32, readUInt64, readUInt8 } from "./PvaMethods";
import { ENDIAN } from "./PvaMethods"

let decodingNewOffset = 0;

export type type_DataDecoder = (typeof DataDecoder)[keyof typeof DataDecoder];


/**
 * Decode a size, the size is not affected by endian, but the integer in it follows the endian.
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

// export const DataDecoder: Record<string, (type: Record<string, any>, buffer: Buffer, offset: number, endian: ENDIAN) => any> = {
export const DataDecoder = {

    // complex_fixedSizeArray_boundedString 
    //! seems like there is no such a data type
    "0x9b": (type: Record<string, any>, buffer: Buffer, offset: number, endian: ENDIAN) => {
    },

    // complex_fixedSizeArray_variantUnion 
    "0x9a": (type: Record<string, any>, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const result: any[] = [];
        const variantUnionDecoder = DataDecoder["0x82"];

        if (variantUnionDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x82)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each string 0x82
            const element = variantUnionDecoder({ type: "0x82" }, buffer, decodingNewOffset, endian);
            result.push(element);
        }
        return result;
    },

    // complex_fixedSizeArray_union 
    "0x99": (type: Record<string, any>, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const result: Record<string, any> = [];
        const unionDecoder = DataDecoder["0x81"];

        if (unionDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x81)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each string 0x81
            const element = unionDecoder({ type: "0x81" }, buffer, decodingNewOffset, endian);
            result.push(element);
        }
        return result;
    },

    // complex_fixedSizeArray_structure 
    "0x98": (type: Record<string, any>, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const result: Record<string, any>[] = [];
        const structDecoder = DataDecoder["0x80"];

        if (structDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x80)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each string 0x80
            const str = structDecoder({ type: "0x80" }, buffer, decodingNewOffset, endian);
            result.push(str);
        }
        return result;
    },

    // complex_boundedSizeArray_boundedString 
    "0x93": (type: Record<string, any>, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const realSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const realSize = realSizeResult["size"];
        if (realSize > size) {
            throw new Error(`bound size array actual size ${realSize} larger than bound size ${size}`);
        }

        const result: string[] = [];
        const stringDecoder = DataDecoder["0x83"];

        if (stringDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x83)");
        }
        for (let ii = 0; ii < realSize; ii++) {
            // read each string 0x60
            const str = stringDecoder({ type: "0x83" }, buffer, decodingNewOffset, endian);
            result.push(str);
        }
        return result;
    },

    // complex_boundedSizeArray_variantUnion 
    "0x92": (type: Record<string, any>, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const realSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const realSize = realSizeResult["size"];
        if (realSize > size) {
            throw new Error(`bound size array actual size ${realSize} larger than bound size ${size}`);
        }

        const result: Record<string, any>[] = [];
        const unionDecoder = DataDecoder["0x82"];

        if (unionDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x82)");
        }
        for (let ii = 0; ii < realSize; ii++) {
            // read each string 0x82
            const union = unionDecoder({ type: "0x82" }, buffer, decodingNewOffset, endian);
            result.push(union);
        }
        return result;
    },

    // complex_boundedSizeArray_union 
    "0x91": (type: Record<string, any>, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const realSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const realSize = realSizeResult["size"];
        if (realSize > size) {
            throw new Error(`bound size array actual size ${realSize} larger than bound size ${size}`);
        }

        const result: Record<string, any>[] = [];
        const unionDecoder = DataDecoder["0x81"];

        if (unionDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x81)");
        }
        for (let ii = 0; ii < realSize; ii++) {
            // read each string 0x81
            const union = unionDecoder({ type: "0x81" }, buffer, decodingNewOffset, endian);
            result.push(union);
        }
        return result;
    },

    // complex_boundedSizeArray_structure 
    "0x90": (type: Record<string, any>, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const realSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const realSize = realSizeResult["size"];
        if (realSize > size) {
            throw new Error(`bound size array actual size ${realSize} larger than bound size ${size}`);
        }

        const result: Record<string, any>[] = [];
        const structDecoder = DataDecoder["0x80"];

        if (structDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x80)");
        }
        for (let ii = 0; ii < realSize; ii++) {
            // read each string 0x80
            const struct = structDecoder({ type: "0x80" }, buffer, decodingNewOffset, endian);
            result.push(struct);
        }
        return result;
    },

    // complex_variableSizeArray_boundedString 
    "0x8b": (type: {type: "0x8b"}, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: string[] = [];
        const stringDecoder = DataDecoder["0x83"];

        if (stringDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x83)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each string 0x83
            const str = stringDecoder({ type: "0x83" }, buffer, decodingNewOffset, endian);
            result.push(str);
        }
        return result;
    },

    // complex_variableSizeArray_variantUnion 
    "0x8a": (type: Record<string, any>, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: Record<string, any>[] = [];
        const variantUnionDecoder = DataDecoder["0x82"];

        if (variantUnionDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x82)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each string 0x82
            const union = variantUnionDecoder({ type: "0x82" }, buffer, decodingNewOffset, endian);
            result.push(union);
        }
        return result;
    },

    // complex_variableSizeArray_union 
    "0x89": (type: { type: "0x89", elementType: any }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: Record<string, any>[] = [];
        const unionDecoder = DataDecoder["0x81"];

        if (unionDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x81)");
        }

        const elementType = type["elementType"] as {
            type: "0x81";
            name: string;
            fields: Record<string, any>;
        };

        for (let ii = 0; ii < size; ii++) {
            // read each string 0x81
            const union = unionDecoder(elementType, buffer, decodingNewOffset, endian);
            result.push(union);
        }
        return result;
    },

    // complex_variableSizeArray_structure 
    "0x88": (type: { type: "0x88", elementType: any }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: Record<string, any>[] = [];
        const structDecoder = DataDecoder["0x80"];

        if (structDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x80)");
        }

        const elementType = type["elementType"] as {
            type: "0x80";
            name: string;
            fields: Record<string, any>;
        };

        for (let ii = 0; ii < size; ii++) {
            const struct = structDecoder(elementType, buffer, decodingNewOffset, endian);
            result.push(struct);
        }
        return result;
    },

    // complex_scalar_boundedString 
    "0x83": (type: { type: "0x83", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        // bound size
        const size = type["size"];

        // real size
        const realSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const realSize = realSizeResult["size"];

        if (realSize > size) {
            throw new Error(`Real size ${realSize} too large for bound string whose limit is ${size}`);
        }

        // size could be bigint, but I don't think a string size can exceed 2^31
        const str = buffer.toString("utf-8", decodingNewOffset, decodingNewOffset + Number(realSize));
        decodingNewOffset = decodingNewOffset + Number(realSize);
        return str;
    },

    // complex_scalar_variantUnion 
    "0x82": (type: { type: "0x82" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        // ! todo
        return {};
    },

    // complex_scalar_union 
    "0x81": (type: { type: "0x81", name: string, fields: Record<string, any> }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        const result: Record<string, any> = {};
        decodingNewOffset = offset;

        const selectorValue = decodeSize(buffer, decodingNewOffset, endian);

        for (const fieldName of Object.keys(type["fields"])) {
            // type definition of this field
            const fieldType = type["fields"][fieldName];
            // type index, e.g. "0x60" for string, "0x80" for struct
            const typeIndex: keyof typeof DataDecoder = fieldType["type"];
            const decoder = DataDecoder[typeIndex];
            const fieldValue = decoder(fieldType, buffer, decodingNewOffset, endian);
            result[fieldName] = fieldValue;
        }
        return { selectorValue: selectorValue, ...result };

    },

    // complex_scalar_structure 
    "0x80": (type: { type: "0x80", name: string, fields: Record<string, any> }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        const result: Record<string, any> = {};
        decodingNewOffset = offset;
        for (const fieldName of Object.keys(type["fields"])) {
            // type definition of this field
            const fieldType = type["fields"][fieldName];
            // type index, e.g. 0x60 for string, 0x80 for struct
            const typeIndex: keyof typeof DataDecoder = fieldType["type"];
            const decoder = DataDecoder[typeIndex];
            const fieldValue = decoder(fieldType, buffer, decodingNewOffset, endian);
            result[fieldName] = fieldValue;
        }
        return result;
    },

    // string_fixedSizeArray 
    "0x78": (type: { type: "0x78", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const result: string[] = [];
        const stringDecoder = DataDecoder["0x60"];

        if (stringDecoder === undefined) {
            throw new Error("Cannot find decoder for string (0x60)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each string 0x60
            const str = stringDecoder({ type: "0x60" }, buffer, decodingNewOffset, endian);
            result.push(str);
        }
        return result;
    },

    // string_boundedSizeArray 
    "0x70": (type: { type: "0x70", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const realSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const realSize = realSizeResult["size"];
        if (realSizeResult["size"] > size) {
            throw new Error("Bounded size array: real size larger than bound size");
        }

        const result: string[] = [];
        const stringDecoder = DataDecoder["0x60"];

        if (stringDecoder === undefined) {
            throw new Error("Cannot find decoder for string (0x60)");
        }
        for (let ii = 0; ii < realSize; ii++) {
            // read each string 0x60
            const str = stringDecoder({ type: "0x60" }, buffer, decodingNewOffset, endian);
            result.push(str);
        }
        return result;
    },

    // string_variableSizeArray 
    "0x68": (type: { type: "0x68" }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const realSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const realSize = realSizeResult["size"];

        const result: string[] = [];
        const stringDecoder = DataDecoder["0x60"];

        if (stringDecoder === undefined) {
            throw new Error("Cannot find decoder for string (0x60)");
        }
        for (let ii = 0; ii < realSize; ii++) {
            // read each string 0x60
            const str = stringDecoder({ type: "0x60" }, buffer, decodingNewOffset, endian);
            result.push(str);
        }
        return result;

    },

    // string_scalar 
    "0x60": (type: { type: "0x60" }, buffer: Buffer, offset: number, endian: ENDIAN): string => {

        decodingNewOffset = offset;

        // number of characters (size) + characters
        const { size } = decodeSize(buffer, decodingNewOffset, endian);

        // size could be bigint, but I don't think a string size can exceed 2^31
        const str = buffer.toString("utf-8", decodingNewOffset, decodingNewOffset + Number(size));
        decodingNewOffset = decodingNewOffset + Number(size);
        return str;
    },

    // floatingPoint_fixedSizeArray_binary128 
    "0x5c": (type: { type: "0x5c", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const result: number[] = [];
        const floatingPointDecoder = DataDecoder["0x44"];

        if (floatingPointDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x44)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each 128-bit floating point number 0x44
            const num = floatingPointDecoder({ type: "0x44" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // floatingPoint_fixedSizeArray_binary64 
    "0x5b": (type: { type: "0x5b", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const result: number[] = [];
        const floatingPointDecoder = DataDecoder["0x43"];

        if (floatingPointDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x43)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each 64-bit floating point number 0x43
            const num = floatingPointDecoder({ type: "0x43" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // floatingPoint_fixedSizeArray_binary32 
    "0x5a": (type: { type: "0x5a", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const result: number[] = [];
        const floatingPointDecoder = DataDecoder["0x42"];

        if (floatingPointDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x42)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each 64-bit floating point number 0x42
            const num = floatingPointDecoder({ type: "0x42" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // floatingPoint_boundedSizeArray_binary128 
    "0x54": (type: { type: "0x54", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const realSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const realSize = realSizeResult["size"];
        if (realSize > size) {
            throw new Error(`Bounded array actual size ${realSize} larger than bound size ${size}`);
        }

        const result: number[] = [];
        const floatingPointDecoder = DataDecoder["0x44"];

        if (floatingPointDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x44)");
        }
        for (let ii = 0; ii < realSize; ii++) {
            // read each 128-bit floating point number 0x44
            const str = floatingPointDecoder({ type: "0x44" }, buffer, decodingNewOffset, endian);
            result.push(str);
        }
        return result;
    },

    // floatingPoint_boundedSizeArray_binary64 
    "0x53": (type: { type: "0x53", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const realSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const realSize = realSizeResult["size"];
        if (realSize > size) {
            throw new Error(`Bounded array actual size ${realSize} larger than bound size ${size}`);
        }

        const result: number[] = [];
        const floatingPointDecoder = DataDecoder["0x43"];

        if (floatingPointDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x43)");
        }
        for (let ii = 0; ii < realSize; ii++) {
            // read each 128-bit floating point number 0x44
            const num = floatingPointDecoder({ type: "0x43" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // floatingPoint_boundedSizeArray_binary32 
    "0x52": (type: { type: "0x52", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const realSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const realSize = realSizeResult["size"];
        if (realSize > size) {
            throw new Error(`Bounded array actual size ${realSize} larger than bound size ${size}`);
        }

        const result: number[] = [];
        const floatingPointDecoder = DataDecoder["0x42"];

        if (floatingPointDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x42)");
        }
        for (let ii = 0; ii < realSize; ii++) {
            // read each 32-bit floating point number 0x42
            const num = floatingPointDecoder({ type: "0x42" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // floatingPoint_variableSizeArray_binary128 
    "0x4c": (type: { type: "0x4c" }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: number[] = [];
        const floatingPointDecoder = DataDecoder["0x44"];

        if (floatingPointDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x44)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each 128-bit floating point number 0x44
            const num = floatingPointDecoder({ type: "0x44" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // floatingPoint_variableSizeArray_binary64 
    "0x4b": (type: { type: "0x4b" }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: number[] = [];
        const floatingPointDecoder = DataDecoder["0x43"];

        if (floatingPointDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x43)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each 64-bit floating point number 0x43
            const num = floatingPointDecoder({ type: "0x43" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // floatingPoint_variableSizeArray_binary32 
    "0x4a": (type: { type: "0x4a" }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: number[] = [];
        const floatingPointDecoder = DataDecoder["0x42"];

        if (floatingPointDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x42)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each 32-bit floating point number 0x42
            const num = floatingPointDecoder({ type: "0x42" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // floatingPoint_scalar_binary128 
    "0x44": (type: { type: "0x44" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        //! todo: no such data type, remove it
        return 0;
    },

    // floatingPoint_scalar_binary64 
    "0x43": (type: { type: "0x43" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readDouble(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 8;
        return result;
    },

    // floatingPoint_scalar_binary32 
    "0x42": (type: { type: "0x42" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readFloat(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 4;
        return result;
    },

    // integer_fixedSizeArray_unsignedLong 
    "0x3f": (type: { type: "0x3f", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const result: bigint[] = [];
        const integerDecoder = DataDecoder["0x27"];

        if (integerDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x27)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each 0x27
            const num = integerDecoder({ type: "0x27" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_fixedSizeArray_unsignedInt 
    "0x3e": (type: { type: "0x3e", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const result: number[] = [];
        const integerDecoder = DataDecoder["0x26"];

        if (integerDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x26)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each 0x26
            const num = integerDecoder({ type: "0x26" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_fixedSizeArray_unsignedShort 
    "0x3d": (type: { type: "0x3d", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const result: number[] = [];
        const integerDecoder = DataDecoder["0x25"];

        if (integerDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x25)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each 0x25
            const num = integerDecoder({ type: "0x25" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_fixedSizeArray_unsignedByte 
    "0x3c": (type: { type: "0x3c", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const result: number[] = [];
        const integerDecoder = DataDecoder["0x24"];

        if (integerDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x24)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each 0x24
            const num = integerDecoder({ type: "0x24" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_fixedSizeArray_signedLong 
    "0x3b": (type: { type: "0x3b", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const result: bigint[] = [];
        const integerDecoder = DataDecoder["0x23"];

        if (integerDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x23)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each 0x23
            const num = integerDecoder({ type: "0x23" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },
    // integer_fixedSizeArray_signedInt 
    "0x3a": (type: { type: "0x3a", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const result: number[] = [];
        const integerDecoder = DataDecoder["0x22"];

        if (integerDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x22)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each 0x22
            const num = integerDecoder({ type: "0x22" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_fixedSizeArray_signedShort 
    "0x39": (type: { type: "0x39", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const result: number[] = [];
        const integerDecoder = DataDecoder["0x21"];

        if (integerDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x21)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each 0x21
            const num = integerDecoder({ type: "0x21" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_fixedSizeArray_signedByte 
    "0x38": (type: { type: "0x38", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const result: number[] = [];
        const integerDecoder = DataDecoder["0x20"];

        if (integerDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x20)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each 0x20
            const num = integerDecoder({ type: "0x20" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_boundedSizeArray_unsignedLong 
    "0x37": (type: { type: "0x37", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const realSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const realSize = realSizeResult["size"];

        if (realSize > size) {
            throw new Error(`bound size array actual size ${realSize} larger than bound size ${size}`);
        }

        const result: bigint[] = [];
        const integerDecoder = DataDecoder["0x27"];

        if (integerDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x27)");
        }
        for (let ii = 0; ii < realSize; ii++) {
            // read each 0x27
            const num = integerDecoder({ type: "0x27" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_boundedSizeArray_unsignedInt 
    "0x36": (type: { type: "0x36", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const realSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const realSize = realSizeResult["size"];

        if (realSize > size) {
            throw new Error(`bound size array actual size ${realSize} larger than bound size ${size}`);
        }

        const result: number[] = [];
        const integerDecoder = DataDecoder["0x26"];

        if (integerDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x26)");
        }
        for (let ii = 0; ii < realSize; ii++) {
            // read each 0x26
            const num = integerDecoder({ type: "0x26" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_boundedSizeArray_unsignedShort 
    "0x35": (type: { type: "0x35", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const realSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const realSize = realSizeResult["size"];

        if (realSize > size) {
            throw new Error(`bound size array actual size ${realSize} larger than bound size ${size}`);
        }

        const result: number[] = [];
        const integerDecoder = DataDecoder["0x25"];

        if (integerDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x25)");
        }
        for (let ii = 0; ii < realSize; ii++) {
            // read each 0x25
            const num = integerDecoder({ type: "0x25" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_boundedSizeArray_unsignedByte 
    "0x34": (type: { type: "0x34", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const realSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const realSize = realSizeResult["size"];

        if (realSize > size) {
            throw new Error(`bound size array actual size ${realSize} larger than bound size ${size}`);
        }

        const result: number[] = [];
        const integerDecoder = DataDecoder["0x24"];

        if (integerDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x24)");
        }
        for (let ii = 0; ii < realSize; ii++) {
            // read each 0x24
            const num = integerDecoder({ type: "0x24" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_boundedSizeArray_signedLong 
    "0x33": (type: { type: "0x33", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];

        const realSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const realSize = realSizeResult["size"];

        if (realSize > size) {
            throw new Error(`bound size array actual size ${realSize} larger than bound size ${size}`);
        }

        const result: bigint[] = [];
        const integerDecoder = DataDecoder["0x23"];

        if (integerDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x23)");
        }
        for (let ii = 0; ii < realSize; ii++) {
            // read each 0x23
            const num = integerDecoder({ type: "0x23" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_boundedSizeArray_signedInt 
    "0x32": (type: { type: "0x32", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];

        const realSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const realSize = realSizeResult["size"];

        if (realSize > size) {
            throw new Error(`bound size array actual size ${realSize} larger than bound size ${size}`);
        }

        const result: number[] = [];
        const integerDecoder = DataDecoder["0x22"];

        if (integerDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x22)");
        }
        for (let ii = 0; ii < realSize; ii++) {
            // read each 0x22
            const num = integerDecoder({ type: "0x22" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;

    },
    // integer_boundedSizeArray_signedShort 
    "0x31": (type: { type: "0x31", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];

        const realSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const realSize = realSizeResult["size"];

        if (realSize > size) {
            throw new Error(`bound size array actual size ${realSize} larger than bound size ${size}`);
        }

        const result: number[] = [];
        const integerDecoder = DataDecoder["0x21"];

        if (integerDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x21)");
        }
        for (let ii = 0; ii < realSize; ii++) {
            // read each 0x21
            const num = integerDecoder({ type: "0x21" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_boundedSizeArray_signedByte 
    "0x30": (type: { type: "0x30", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];

        const realSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const realSize = realSizeResult["size"];

        if (realSize > size) {
            throw new Error(`bound size array actual size ${realSize} larger than bound size ${size}`);
        }

        const result: number[] = [];
        const integerDecoder = DataDecoder["0x20"];

        if (integerDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x20)");
        }
        for (let ii = 0; ii < realSize; ii++) {
            // read each 0x20
            const num = integerDecoder({ type: "0x20" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_variableSizeArray_unsignedLong 
    "0x2f": (type: { type: "0x2f" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: bigint[] = [];
        const integerDecoder = DataDecoder["0x27"];

        if (integerDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x27)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each 0x27
            const num = integerDecoder({ type: "0x27" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_variableSizeArray_unsignedInt 
    "0x2e": (type: { type: "0x2e" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: number[] = [];
        const integerDecoder = DataDecoder["0x26"];

        if (integerDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x26)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each 0x26
            const num = integerDecoder({ type: "0x26" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_variableSizeArray_unsignedShort 
    "0x2d": (type: { type: "0x2d" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: number[] = [];
        const integerDecoder = DataDecoder["0x25"];

        if (integerDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x25)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each 0x25
            const num = integerDecoder({ type: "0x25" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_variableSizeArray_unsignedByte 
    "0x2c": (type: { type: "0x2c" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: number[] = [];
        const integerDecoder = DataDecoder["0x24"];

        if (integerDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x24)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each 0x24
            const num = integerDecoder({ type: "0x24" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_variableSizeArray_signedLong 
    "0x2b": (type: { type: "0x2b" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: bigint[] = [];
        const integerDecoder = DataDecoder["0x23"];

        if (integerDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x23)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each 0x23
            const num = integerDecoder({ type: "0x23" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_variableSizeArray_signedInt 
    "0x2a": (type: { type: "0x2a" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: number[] = [];
        const integerDecoder = DataDecoder["0x22"];

        if (integerDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x22)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each 0x22
            const num = integerDecoder({ type: "0x22" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_variableSizeArray_signedShort 
    "0x29": (type: { type: "0x29" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: number[] = [];
        const integerDecoder = DataDecoder["0x21"];

        if (integerDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x21)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each 0x21
            const num = integerDecoder({ type: "0x21" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_variableSizeArray_signedByte 
    "0x28": (type: { type: "0x28" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: number[] = [];
        const integerDecoder = DataDecoder["0x20"];

        if (integerDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x20)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each 0x20
            const num = integerDecoder({ type: "0x20" }, buffer, decodingNewOffset, endian);
            result.push(num);
        }
        return result;
    },

    // integer_scalar_unsignedLong 
    "0x27": (type: { type: "0x27" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readUInt64(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 8;
        return result;
    },

    // integer_scalar_unsignedInt 
    "0x26": (type: { type: "0x26" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readUInt32(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 4;
        return result;
    },

    // integer_scalar_unsignedShort 
    "0x25": (type: { type: "0x25" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readUInt16(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 2;
        return result;
    },

    // integer_scalar_unsignedByte 
    "0x24": (type: { type: "0x24" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readUInt8(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 1;
        return result;
    },

    // integer_scalar_signedLong 
    "0x23": (type: { type: "0x23" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readInt64(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 8;
        return result;
    },

    // integer_scalar_signedInt 
    "0x22": (type: { type: "0x22" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readInt32(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 4;
        return result;
    },

    // integer_scalar_signedShort 
    "0x21": (type: { type: "0x21" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readInt16(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 2;
        return result;
    },

    // integer_scalar_signedByte 
    "0x20": (type: { type: "0x20" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readInt8(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 1;
        return result;
    },

    // boolean_fixedSizeArray 
    "0x18": (type: { type: "0x18", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {

        decodingNewOffset = offset;

        const size = type["size"];

        const result: boolean[] = [];
        const booleanDecoder = DataDecoder["0x0"];

        if (booleanDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x0)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each 0x0
            const element = booleanDecoder({ type: "0x0" }, buffer, decodingNewOffset, endian);
            result.push(element);
        }
        return result;
    },

    // boolean_boundedSizeArray 
    "0x10": (type: { type: "0x10", size: number }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const size = type["size"];

        const realSizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const realSize = realSizeResult["size"];

        if (realSize > size) {
            throw new Error(`bound size array actual size ${realSize} larger than bound size ${size}`);
        }

        const result: boolean[] = [];
        const booleanDecoder = DataDecoder["0x0"];

        if (booleanDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x0)");
        }
        for (let ii = 0; ii < realSize; ii++) {
            // read each 0x0
            const element = booleanDecoder({ type: "0x0" }, buffer, decodingNewOffset, endian);
            result.push(element);
        }
        return result;
    },

    // boolean_variableSizeArray 
    "0x8": (type: { type: "0x8" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;

        const sizeResult = decodeSize(buffer, decodingNewOffset, endian);
        const size = sizeResult["size"];

        const result: boolean[] = [];
        const booleanDecoder = DataDecoder["0x0"];

        if (booleanDecoder === undefined) {
            throw new Error("Cannot find decoder for bound string (0x0)");
        }
        for (let ii = 0; ii < size; ii++) {
            // read each 0x0
            const element = booleanDecoder({ type: "0x0" }, buffer, decodingNewOffset, endian);
            result.push(element);
        }
        return result;
    },

    // boolean_scalar 
    "0x0": (type: { type: "0x0" }, buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset;
        const result = readUInt8(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 1;
        return result === 0 ? false : true;
    },
}
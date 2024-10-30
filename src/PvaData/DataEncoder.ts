// import { type_data, type_struct_data, type_type, type_typeIndex, type_union_data, type_variant_union_data } from "../PvaData/PvaData_typeEncoding"
import { type_typeIndex } from "./PvaData_typeEncoding";
import { createSizeBuffer, encodeSize, ENDIAN, writeDouble, writeFloat, writeInt16, writeInt32, writeInt64, writeInt8, writeUInt16, writeUInt32, writeUInt64, writeUInt8 } from "./PvaMethods";
import { encodeType } from "./TypeEncoder";


export const encodeData = (
    type: any,
    data: any,
    endian: ENDIAN) => {

    // type guard
    checkDataAndType(data, type);

    const typeIndex = type["typeIndex"];

    const encoder = DataEncoder[typeIndex as type_typeIndex];
    if (encoder === undefined) {
        throw new Error(`Cannot find data decoder for type index ${typeIndex}`);
    }
    const result: Buffer = encoder(data, type, endian);
    return result;
}

const compareArrays = (arr1: any[], arr2: any[]) => {
    const sortedArr1 = [...arr1].sort();
    const sortedArr2 = [...arr2].sort();
    return sortedArr1.every((value, index) => value === sortedArr2[index]);
}


/**
 * Check if the primitive data and their arrays are legitimate for the provided type.
 * 
 * The union/struct/variant union and their arrays are not checked by this function.
 * 
 * @returns {void} if everything is fine.
 * 
 * @throws when the type and data are not consistent.
 */

export const checkDataAndType = (data: any, type: any) => {
    const errMsg = "";

    // guards that "type" is an object
    const typeIndex = type["typeIndex"];
    const typeOfData = typeof data;

    // complex_variableSizeArray_variantUnion
    if (typeIndex === "0x8a") {
        // ! I still don't know how to encode/decode a variant union array
        return;
    }

    // complex_variableSizeArray_union
    if (typeIndex === "0x89") {
        if (
            Array.isArray(data)
        ) {
            for (const element of data) {
                checkDataAndType(element, { ...type, typeIndex: "0x81" });
            }
            return;
        }
        throw new Error(errMsg);
    }

    // complex_variableSizeArray_structure
    if (typeIndex === "0x88") {
        if (
            Array.isArray(data)
        ) {
            for (const element of data) {
                checkDataAndType(element, { ...type, typeIndex: "0x80" });
            }
            return;
        }
        throw new Error(errMsg);
    }

    // complex_scalar_variantUnion
    if (typeIndex === "0x82") {
        if (
            typeof data === "object" &&
            checkDataAndType(data["value"], data["type"]) === undefined
        ) { return; }
        throw new Error(errMsg);
    }

    // complex_scalar_union
    if (typeIndex === "0x81") {
        if (
            typeof type["fields"] === "object" &&
            typeof type["name"] === "string" &&
            typeof data === "object" &&
            typeof data["index"] === "number" &&
            data["index"] < Object.keys(type["fields"]).length &&
            checkDataAndType(data["value"], type["fields"][Object.keys(type["fields"])[data["index"]]]) === undefined 
        ) { return; }
        throw new Error(errMsg);
    }

    // complex_scalar_structure
    if (typeIndex === "0x80") {
        if (
            typeof type["fields"] === "object" &&
            typeof type["name"] === "string" &&
            typeof data === "object" &&
            Object.keys(data).length === Object.keys(type["fields"]).length &&
            compareArrays(Object.keys(data), Object.keys(type["fields"])) === true
        ) { return; }
        throw new Error(errMsg);
    }

    // complex_scalar_boundedString
    if (typeIndex === "0x83") {
        if (
            typeOfData === "string" &&
            typeof type["size"] === "number" &&
            data.length <= type["size"]
        ) {
            return;
        }
        throw new Error(errMsg)
    }

    // string_fixedSizeArray
    if (typeIndex === "0x78") {
        if (
            Array.isArray(data) &&
            typeof type["size"] === "number" &&
            data.length === type["size"] &&
            arrayElementsSameType(data, "string") === true
        ) {
            return;
        }
        throw new Error(errMsg)
    }

    // string_boundedSizeArray
    if (typeIndex === "0x70") {
        if (
            Array.isArray(data) &&
            typeof type["size"] === "number" &&
            data.length <= type["size"] &&
            arrayElementsSameType(data, "string") === true
        ) {
            return;
        }
        throw new Error(errMsg)
    }

    // string_variableSizeArray
    if (typeIndex === "0x68") {
        if (
            Array.isArray(data) &&
            arrayElementsSameType(data, "string") === true
        ) {
            return;
        }
        throw new Error(errMsg)
    }

    // string_scalar
    if (typeIndex === "0x60") {
        if (
            typeOfData === "string"
        ) {
            return;
        }
        throw new Error(errMsg)
    }

    // floatingPoint_fixedSizeArray_binary64
    // floatingPoint_fixedSizeArray_binary32
    // integer_fixedSizeArray_unsignedLong
    // integer_fixedSizeArray_unsignedInt
    // integer_fixedSizeArray_unsignedShort
    // integer_fixedSizeArray_unsignedByte
    // integer_fixedSizeArray_signedLong
    // integer_fixedSizeArray_signedInt
    // integer_fixedSizeArray_signedShort
    // integer_fixedSizeArray_signedByte
    if (
        typeIndex === "0x5b" ||
        typeIndex === "0x5a" ||
        typeIndex === "0x3f" ||
        typeIndex === "0x3e" ||
        typeIndex === "0x3d" ||
        typeIndex === "0x3c" ||
        typeIndex === "0x3b" ||
        typeIndex === "0x3a" ||
        typeIndex === "0x39" ||
        typeIndex === "0x38"
    ) {
        if (
            Array.isArray(data) &&
            typeof type["size"] === "number" &&
            data.length === type["size"] &&
            arrayElementsSameType(data, "number") === true
        ) {
            return;
        }
        throw new Error(errMsg)
    }

    // floatingPoint_boundedSizeArray_binary64
    // floatingPoint_boundedSizeArray_binary32
    // integer_boundedSizeArray_unsignedLong
    // integer_boundedSizeArray_unsignedInt
    // integer_boundedSizeArray_unsignedShort
    // integer_boundedSizeArray_unsignedByte
    // integer_boundedSizeArray_signedLong
    // integer_boundedSizeArray_signedInt
    // integer_boundedSizeArray_signedShort
    // integer_boundedSizeArray_signedByte
    if (
        typeIndex === "0x53" ||
        typeIndex === "0x52" ||
        typeIndex === "0x37" ||
        typeIndex === "0x36" ||
        typeIndex === "0x35" ||
        typeIndex === "0x34" ||
        typeIndex === "0x33" ||
        typeIndex === "0x32" ||
        typeIndex === "0x31" ||
        typeIndex === "0x30"
    ) {
        if (
            Array.isArray(data) &&
            typeof type["size"] === "number" &&
            data.length <= type["size"] &&
            arrayElementsSameType(data, "number") === true
        ) {
            return;
        }
        throw new Error(errMsg)
    }

    // floatingPoint_variableSizeArray_binary64
    // floatingPoint_variableSizeArray_binary32
    // integer_variableSizeArray_unsignedLong
    // integer_variableSizeArray_unsignedInt
    // integer_variableSizeArray_unsignedShort
    // integer_variableSizeArray_unsignedByte
    // integer_variableSizeArray_signedLong
    // integer_variableSizeArray_signedInt
    // integer_variableSizeArray_signedShort
    // integer_variableSizeArray_signedByte
    if (
        typeIndex === "0x4b" ||
        typeIndex === "0x4a" ||
        typeIndex === "0x2f" ||
        typeIndex === "0x2e" ||
        typeIndex === "0x2d" ||
        typeIndex === "0x2c" ||
        typeIndex === "0x2b" ||
        typeIndex === "0x2a" ||
        typeIndex === "0x29" ||
        typeIndex === "0x28"
    ) {
        if (
            Array.isArray(data) &&
            arrayElementsSameType(data, "number") === true
        ) {
            return;
        }
        throw new Error(errMsg)
    }

    // floatingPoint_scalar_binary64
    // floatingPoint_scalar_binary32
    // integer_scalar_unsignedLong
    // integer_scalar_unsignedInt
    // integer_scalar_unsignedShort
    // integer_scalar_unsignedByte
    // integer_scalar_signedLong
    // integer_scalar_signedInt
    // integer_scalar_signedShort
    // integer_scalar_signedByte
    if (
        typeIndex === "0x43" ||
        typeIndex === "0x42" ||
        typeIndex === "0x27" ||
        typeIndex === "0x26" ||
        typeIndex === "0x25" ||
        typeIndex === "0x24" ||
        typeIndex === "0x23" ||
        typeIndex === "0x22" ||
        typeIndex === "0x21" ||
        typeIndex === "0x20"
    ) {
        if (
            typeOfData === "number" ||
            typeOfData === "bigint"
        ) {
            return;
        }
        throw new Error(errMsg)
    }

    // boolean_fixedSizeArray
    if (typeIndex === "0x18") {
        if (
            Array.isArray(data) &&
            typeof type["size"] === "number" &&
            data.length === type["size"] &&
            arrayElementsSameType(data, "boolean") === true
        ) {
            return;
        }
        throw new Error(errMsg)
    }

    // boolean_boundedSizeArray
    if (typeIndex === "0x10") {
        if (
            Array.isArray(data) &&
            typeof type["size"] === "number" &&
            data.length <= type["size"] &&
            arrayElementsSameType(data, "boolean") === true
        ) {
            return;
        }
        throw new Error(errMsg)
    }

    // boolean_variableSizeArray
    if (typeIndex === "0x8") {
        if (
            Array.isArray(data) &&
            arrayElementsSameType(data, "boolean") === true
        ) {
            return;
        }
        throw new Error(errMsg)
    }

    // boolean_scalar
    if (typeIndex === "0x0") {
        if (typeOfData === "boolean") {
            return;
        }
        throw new Error(errMsg)
    }

    throw new Error(errMsg);
}

const arrayElementsSameType = (data: any[], elementType: "number" | "string" | "boolean") => {
    // all elements in array must be of the same type

    if (data.length === 0) {
        return true;
    }

    const firstElementType = typeof data[0];
    if (elementType === "number") {
        if (firstElementType !== "number" && firstElementType !== "bigint") {
            return false;
        }
    } else {
        if (firstElementType !== elementType) {
            return false;
        }
    }

    for (let element of data) {
        if (typeof element !== firstElementType) {
            return false;
        }
    }
    return true;
}


export const DataEncoder = {

    // ! todo: complex_variableSizeArray_variantUnion, what does it look like
    // "0x8a": (data: { dataType: { typeIndex: type_typeIndex, id?: number, tag?: number } & Record<string, any>, dataValue: any[] }, type: { typeIndex: "0x8a", id?: number, tag?: number }, endian: ENDIAN) => {
    "0x8a": (data: any, type: { typeIndex: "0x8a", id?: number, tag?: number }, endian: ENDIAN) => {
        // const value = data["dataValue"];
        // const dataType = data["dataType"];

        // const sizeBuffer = createSizeBuffer(value.length, endian);
        // const resultArray: Buffer[] = [sizeBuffer];

        // for (const valueElement of value) {
        //     const elementBuffer = encodeData(valueElement, dataType, endian);
        //     resultArray.push(elementBuffer);
        // }
        // return (Buffer.concat(resultArray));
        return Buffer.alloc(1);
    },

    // complex_variableSizeArray_union
    "0x89": (data: any, type: { typeIndex: "0x89", name: string, id?: number, tag?: number, elementId?: number, elementTag?: number, fields: Record<string, any> }, endian: ENDIAN) => {

        const sizeBuffer = createSizeBuffer(data.length, endian);
        const resultArray: Buffer[] = [sizeBuffer];

        for (const element of data) {
            const elementBuffer = encodeData({ ...type, id: type["elementId"], tag: type["elementTag"], typeIndex: "0x81" }, element, endian);
            resultArray.push(elementBuffer);
        }
        return (Buffer.concat(resultArray));
    },

    // complex_variableSizeArray_structure
    "0x88": (data: any, type: { typeIndex: "0x88", name: string, id?: number, tag?: number, elementId?: number, elementTag?: number, fields: Record<string, any> }, endian: ENDIAN) => {

        const sizeBuffer = createSizeBuffer(data.length, endian);
        const resultArray: Buffer[] = [sizeBuffer];

        for (const element of data) {
            const elementBuffer = encodeData({ ...type, id: type["elementId"], tag: type["elementTag"], typeIndex: "0x80" }, element, endian);
            resultArray.push(elementBuffer);
        }
        return (Buffer.concat(resultArray));
    },

    // complex_scalar_boundedString
    "0x83": (data: string, type: { typeIndex: "0x83", size: number, id?: number, tag?: number }, endian: ENDIAN) => {

        return encodeData({ typeIndex: "0x60" }, data, endian);
    },

    // complex_scalar_variantUnion
    "0x82": (data: any, type: { typeIndex: "0x82", id?: number, tag?: number }, endian: ENDIAN) => {

        const dataTypeBuffer = encodeType(data["type"], endian);

        const dataValueBuffer = encodeData(data["type"], data["value"], endian);

        return Buffer.concat([dataTypeBuffer, dataValueBuffer]);

    },

    // complex_scalar_union
    "0x81": (data: any, type: { typeIndex: "0x81", name: string, id?: number, tag?: number, fields: Record<string, any> }, endian: ENDIAN) => {

        const index = data["index"];
        const indexBuffer = createSizeBuffer(index, endian);

        const fieldTypes = Object.values(type["fields"]);
        const selectedType = fieldTypes[index];
        const valueBuffer = encodeData(selectedType, data["value"], endian);

        return Buffer.concat([indexBuffer, valueBuffer]);
    },

    // complex_scalar_structure
    "0x80": (data: any, type: { typeIndex: "0x80", name: string, id?: number, tag?: number, fields: Record<string, any> }, endian: ENDIAN) => {

        const fieldTypes = type["fields"];
        const typeFieldNames = Object.keys(fieldTypes);
        const resultArray: Buffer[] = [];

        for (let dataFieldName of typeFieldNames) {

            const fieldType = fieldTypes[dataFieldName];
            const fieldData = data[dataFieldName];

            // each field's data vs type is checked here
            // for structure/union, the field's data vs type is only check at the highest level
            // the next level is checked here
            const fieldBuffer = encodeData(fieldType, fieldData, endian);

            resultArray.push(fieldBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // string_fixedSizeArray
    "0x78": (data: string[], type: { typeIndex: "0x78", size: number, id?: number, tag?: number }, endian: ENDIAN) => {


        const resultArray: Buffer[] = [];

        for (let ii = 0; ii < data.length; ii++) {
            const str = data[ii];

            const strBuffer = encodeData({ typeIndex: "0x60" }, str, endian);

            resultArray.push(strBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // string_boundedSizeArray
    "0x70": (data: string[], type: { typeIndex: "0x70", size: number, id?: number, tag?: number }, endian: ENDIAN) => {


        const sizeBuffer = createSizeBuffer(data.length, endian);
        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const str = data[ii];

            const strBuffer = encodeData({ typeIndex: "0x60" }, str, endian);

            resultArray.push(strBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // string_variableSizeArray
    "0x68": (data: string[], type: { typeIndex: "0x68", id?: number, tag?: number }, endian: ENDIAN) => {


        const sizeBuffer = createSizeBuffer(data.length, endian);
        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const str = data[ii];

            const strBuffer = encodeData({ typeIndex: "0x60" }, str, endian);

            resultArray.push(strBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // string_scalar
    "0x60": (data: string, type: { typeIndex: "0x60", id?: number, tag?: number }, endian: ENDIAN) => {


        const sizeBuffer = createSizeBuffer(data.length, endian);

        const stringBuffer = Buffer.from(data, "utf-8");

        const buffer = Buffer.concat([sizeBuffer, stringBuffer]);

        return buffer;
    },

    // floatingPoint_fixedSizeArray_binary64
    "0x5b": (data: number[], type: { typeIndex: "0x5b", size: number, id?: number, tag?: number }, endian: ENDIAN) => {


        const resultArray: Buffer[] = [];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x43" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // floatingPoint_fixedSizeArray_binary32
    "0x5a": (data: number[], type: { typeIndex: "0x5a", size: number, id?: number, tag?: number }, endian: ENDIAN) => {


        const resultArray: Buffer[] = [];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x42" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // floatingPoint_boundedSizeArray_binary64
    "0x53": (data: number[], type: { typeIndex: "0x53", size: number, id?: number, tag?: number }, endian: ENDIAN) => {


        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x43" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // floatingPoint_boundedSizeArray_binary32
    "0x52": (data: number[], type: { typeIndex: "0x52", size: number, id?: number, tag?: number }, endian: ENDIAN) => {


        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x42" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // floatingPoint_variableSizeArray_binary64
    "0x4b": (data: number[], type: { typeIndex: "0x4b", size: number, id?: number, tag?: number }, endian: ENDIAN) => {


        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x43" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // floatingPoint_variableSizeArray_binary32
    "0x4a": (data: number[], type: { typeIndex: "0x4a", size: number, id?: number, tag?: number }, endian: ENDIAN) => {


        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x42" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // floatingPoint_scalar_binary64
    "0x43": (data: number, type: { typeIndex: "0x43", id?: number, tag?: number }, endian: ENDIAN) => {


        const buffer = Buffer.alloc(8);
        writeDouble(data, buffer, 0, endian);
        return buffer;
    },

    // floatingPoint_scalar_binary32
    "0x42": (data: number, type: { typeIndex: "0x42", id?: number, tag?: number }, endian: ENDIAN) => {


        const buffer = Buffer.alloc(4);
        writeFloat(data, buffer, 0, endian);
        return buffer;
    },

    // integer_fixedSizeArray_unsignedLong
    "0x3f": (data: number[], type: { typeIndex: "0x3f", size: number, id?: number, tag?: number }, endian: ENDIAN) => {


        const resultArray: Buffer[] = [];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x27" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_fixedSizeArray_unsignedInt
    "0x3e": (data: number[], type: { typeIndex: "0x3e", size: number, id?: number, tag?: number }, endian: ENDIAN) => {


        if (data.length !== type["size"]) {
            throw new Error(`Fixed size array data size ${data.length} and type size ${type["size"]} do not match`);
        }

        const resultArray: Buffer[] = [];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x26" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_fixedSizeArray_unsignedShort
    "0x3d": (data: number[], type: { typeIndex: "0x3d", size: number, id?: number, tag?: number }, endian: ENDIAN) => {


        const resultArray: Buffer[] = [];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x25" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_fixedSizeArray_unsignedByte
    "0x3c": (data: number[], type: { typeIndex: "0x3c", size: number, id?: number, tag?: number }, endian: ENDIAN) => {


        const resultArray: Buffer[] = [];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x24" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_fixedSizeArray_signedLong
    "0x3b": (data: number[], type: { typeIndex: "0x3b", size: number, id?: number, tag?: number }, endian: ENDIAN) => {


        const resultArray: Buffer[] = [];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x23" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_fixedSizeArray_signedInt
    "0x3a": (data: number[], type: { typeIndex: "0x3a", size: number, id?: number, tag?: number }, endian: ENDIAN) => {


        const resultArray: Buffer[] = [];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x22" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_fixedSizeArray_signedShort
    "0x39": (data: number[], type: { typeIndex: "0x39", size: number, id?: number, tag?: number }, endian: ENDIAN) => {


        const resultArray: Buffer[] = [];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x21" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_fixedSizeArray_signedByte
    "0x38": (data: number[], type: { typeIndex: "0x38", size: number, id?: number, tag?: number }, endian: ENDIAN) => {


        const resultArray: Buffer[] = [];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x20" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_boundedSizeArray_unsignedLong
    "0x37": (data: number[], type: { typeIndex: "0x37", size: number, id?: number, tag?: number }, endian: ENDIAN) => {


        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x27" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_boundedSizeArray_unsignedInt
    "0x36": (data: number[], type: { typeIndex: "0x36", size: number, id?: number, tag?: number }, endian: ENDIAN) => {


        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x26" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_boundedSizeArray_unsignedShort
    "0x35": (data: number[], type: { typeIndex: "0x35", size: number, id?: number, tag?: number }, endian: ENDIAN) => {


        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x25" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_boundedSizeArray_unsignedByte
    "0x34": (data: number[], type: { typeIndex: "0x34", size: number, id?: number, tag?: number }, endian: ENDIAN) => {


        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x24" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_boundedSizeArray_signedLong
    "0x33": (data: number[], type: { typeIndex: "0x33", size: number, id?: number, tag?: number }, endian: ENDIAN) => {


        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x23" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_boundedSizeArray_signedInt
    "0x32": (data: number[], type: { typeIndex: "0x32", size: number, id?: number, tag?: number }, endian: ENDIAN) => {


        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x22" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_boundedSizeArray_signedShort
    "0x31": (data: number[], type: { typeIndex: "0x31", size: number, id?: number, tag?: number }, endian: ENDIAN) => {


        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x21" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_boundedSizeArray_signedByte
    "0x30": (data: number[], type: { typeIndex: "0x30", size: number, id?: number, tag?: number }, endian: ENDIAN) => {


        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x20" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_variableSizeArray_unsignedLong
    "0x2f": (data: number[], type: { typeIndex: "0x2f", id?: number, tag?: number }, endian: ENDIAN) => {


        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x27" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_variableSizeArray_unsignedInt
    "0x2e": (data: number[], type: { typeIndex: "0x2e", id?: number, tag?: number }, endian: ENDIAN) => {


        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x26" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_variableSizeArray_unsignedShort
    "0x2d": (data: number[], type: { typeIndex: "0x2d", id?: number, tag?: number }, endian: ENDIAN) => {


        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x25" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_variableSizeArray_unsignedByte
    "0x2c": (data: number[], type: { typeIndex: "0x2c", id?: number, tag?: number }, endian: ENDIAN) => {


        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x24" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_variableSizeArray_signedLong
    "0x2b": (data: number[], type: { typeIndex: "0x2b", id?: number, tag?: number }, endian: ENDIAN) => {


        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x23" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_variableSizeArray_signedInt
    "0x2a": (data: number[], type: { typeIndex: "0x2a", id?: number, tag?: number }, endian: ENDIAN) => {


        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x22" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_variableSizeArray_signedShort
    "0x29": (data: number[], type: { typeIndex: "0x29", id?: number, tag?: number }, endian: ENDIAN) => {


        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x21" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_variableSizeArray_signedByte
    "0x28": (data: number[], type: { typeIndex: "0x28", id?: number, tag?: number }, endian: ENDIAN) => {


        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData({ typeIndex: "0x20" }, num, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_scalar_unsignedLong
    "0x27": (data: number, type: { typeIndex: "0x27", id?: number, tag?: number }, endian: ENDIAN) => {


        const buffer = Buffer.alloc(8);
        writeUInt64(data, buffer, 0, endian);
        return buffer;
    },

    // integer_scalar_unsignedInt
    "0x26": (data: number, type: { typeIndex: "0x26", id?: number, tag?: number }, endian: ENDIAN) => {


        const buffer = Buffer.alloc(4);
        writeUInt32(data, buffer, 0, endian);
        return buffer;
    },

    // integer_scalar_unsignedShort
    "0x25": (data: number, type: { typeIndex: "0x25", id?: number, tag?: number }, endian: ENDIAN) => {


        const buffer = Buffer.alloc(2);
        writeUInt16(data, buffer, 0, endian);
        return buffer;
    },

    // integer_scalar_unsignedByte
    "0x24": (data: number, type: { typeIndex: "0x24", id?: number, tag?: number }, endian: ENDIAN) => {


        const buffer = Buffer.alloc(1);
        writeUInt8(data, buffer, 0, endian);
        return buffer;
    },

    // integer_scalar_signedLong
    "0x23": (data: number, type: { typeIndex: "0x23", id?: number, tag?: number }, endian: ENDIAN) => {


        const buffer = Buffer.alloc(8);
        writeInt64(data, buffer, 0, endian);
        return buffer;
    },

    // integer_scalar_signedInt
    "0x22": (data: number, type: { typeIndex: "0x22", id?: number, tag?: number }, endian: ENDIAN) => {


        const buffer = Buffer.alloc(4);
        writeInt32(data, buffer, 0, endian);
        return buffer;
    },

    // integer_scalar_signedShort
    "0x21": (data: number, type: { typeIndex: "0x21", id?: number, tag?: number }, endian: ENDIAN) => {


        const buffer = Buffer.alloc(2);
        writeInt16(data, buffer, 0, endian);
        return buffer;
    },

    // integer_scalar_signedByte
    "0x20": (data: number, type: { typeIndex: "0x20", id?: number, tag?: number }, endian: ENDIAN) => {


        const buffer = Buffer.alloc(1);
        writeInt8(data, buffer, 0, endian);
        return buffer;
    },

    // boolean_fixedSizeArray
    "0x18": (data: boolean[], type: { typeIndex: "0x18", size: number, id?: number, tag?: number }, endian: ENDIAN) => {


        const resultArray: Buffer[] = [];

        for (let ii = 0; ii < data.length; ii++) {
            const bool = data[ii];
            const boolBuffer = encodeData({ typeIndex: "0x0" }, bool, endian);
            resultArray.push(boolBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // boolean_boundedSizeArray
    "0x10": (data: boolean[], type: { typeIndex: "0x18", size: number, id?: number, tag?: number }, endian: ENDIAN) => {


        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const bool = data[ii];
            const boolBuffer = encodeData({ typeIndex: "0x0" }, bool, endian);
            resultArray.push(boolBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // boolean_variableSizeArray
    "0x8": (data: boolean[], type: { typeIndex: "0x18", id?: number, tag?: number }, endian: ENDIAN) => {


        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const bool = data[ii];
            const boolBuffer = encodeData({ typeIndex: "0x0" }, bool, endian);
            resultArray.push(boolBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // boolean_scalar
    "0x0": (data: boolean, type: { typeIndex: "0x0", id?: number, tag?: number }, endian: ENDIAN) => {


        const result = Buffer.alloc(1);
        data === true ? writeUInt8(1, result, 0, endian) : writeUInt8(0, result, 0, endian);
        return Buffer.from(result);
    },

}


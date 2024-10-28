import { type_data, type_struct_data, type_type, type_typeIndex, type_union_data, type_variant_union_data } from "../PvaData/PvaData_typeEncoding"
import { createSizeBuffer, encodeSize, ENDIAN, writeDouble, writeFloat, writeInt16, writeInt32, writeInt64, writeInt8, writeUInt16, writeUInt32, writeUInt64, writeUInt8 } from "./PvaMethods";
import { encodeType } from "./TypeEncoder";


export const encodeData = (
    data: type_data,
    // type: { typeIndex: type_typeIndex, id?: number, tag?: number }
    //     | { typeIndex: type_typeIndex, size: number, id?: number, tag?: number }
    //     | { typeIndex: type_typeIndex, name: string, id?: number, tag?: number, fields: Record<string, any> }
    //     | { typeIndex: type_typeIndex, name: string, id?: number, tag?: number, elementId?: number, elementTag?: number, fields: Record<string, any> },
    type: type_type,
    endian: ENDIAN): Buffer => {

    const typeIndex = type["typeIndex"];
    // the type safe is guarded by each function
    const encoder = DataEncoder[typeIndex] as any;
    if (encoder === undefined) {
        throw new Error(`Cannot find data decoder for type index ${typeIndex}`);
    }
    const result = encoder(data, type, endian);
    return result;
}



export const DataEncoder = {

    // ! todo: complex_variableSizeArray_variantUnion, what does it look like
    // "0x8a": (data: { dataType: { typeIndex: type_typeIndex, id?: number, tag?: number } & Record<string, any>, dataValue: any[] }, type: { typeIndex: "0x8a", id?: number, tag?: number }, endian: ENDIAN) => {
    "0x8a": (data: type_variant_union_data[], type: { typeIndex: "0x8a", id?: number, tag?: number }, endian: ENDIAN) => {
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
    "0x89": (data: type_union_data[], type: { typeIndex: "0x89", name: string, id?: number, tag?: number, elementId?: number, elementTag?: number, fields: Record<string, any> }, endian: ENDIAN) => {
        const sizeBuffer = createSizeBuffer(data.length, endian);
        const resultArray: Buffer[] = [sizeBuffer];

        for (const element of data) {
            const elementBuffer = encodeData(element, { ...type, id: type["elementId"], tag: type["elementTag"], typeIndex: "0x81" }, endian);
            resultArray.push(elementBuffer);
        }
        return (Buffer.concat(resultArray));
    },

    // complex_variableSizeArray_structure
    "0x88": (data: type_struct_data[], type: { typeIndex: "0x88", name: string, id?: number, tag?: number, elementId?: number, elementTag?: number, fields: Record<string, any> }, endian: ENDIAN) => {
        const sizeBuffer = createSizeBuffer(data.length, endian);
        const resultArray: Buffer[] = [sizeBuffer];

        for (const element of data) {
            const elementBuffer = encodeData(element, { ...type, id: type["elementId"], tag: type["elementTag"], typeIndex: "0x80" }, endian);
            resultArray.push(elementBuffer);
        }
        return (Buffer.concat(resultArray));
    },

    // complex_scalar_boundedString
    "0x83": (data: string, type: { typeIndex: "0x83", size: number, id?: number, tag?: number }, endian: ENDIAN) => {
        if (data.length > type["size"]) {
            throw new Error(`Bound string size ${data.length} larger type size ${type["size"]}`);
        }
        return encodeData(data, { typeIndex: "0x60" }, endian);
    },

    // complex_scalar_variantUnion
    "0x82": (data: type_variant_union_data, type: { typeIndex: "0x82", id?: number, tag?: number }, endian: ENDIAN) => {
        const dataTypeBuffer = encodeType(data["type"], endian);

        const dataValueBuffer = encodeData(data["value"], data["type"], endian);

        return Buffer.concat([dataTypeBuffer, dataValueBuffer]);

    },

    // complex_scalar_union
    "0x81": (data: type_union_data, type: { typeIndex: "0x81", name: string, id?: number, tag?: number, fields: Record<string, any> }, endian: ENDIAN) => {

        const index = data["index"];
        const indexBuffer = createSizeBuffer(index, endian);

        const fieldTypes = Object.values(type["fields"]);
        const selectedType = fieldTypes[index];
        const valueBuffer = encodeData(data["value"], selectedType, endian);

        return Buffer.concat([indexBuffer, valueBuffer]);
    },

    // complex_scalar_structure
    "0x80": (data: type_struct_data, type: { typeIndex: "0x80", name: string, id?: number, tag?: number, fields: Record<string, any> }, endian: ENDIAN) => {
        const fieldTypes = type["fields"];
        const typeFieldNames = Object.keys(fieldTypes);
        const resultArray: Buffer[] = [];

        for (let dataFieldName of Object.keys(data)) {
            if (!typeFieldNames.includes(dataFieldName)) {
                throw new Error(`Cannot find field name ${dataFieldName} in type`);
            }

            const fieldType = fieldTypes[dataFieldName];
            const fieldData = data[dataFieldName];

            const fieldBuffer = encodeData(fieldData, fieldType, endian);

            resultArray.push(fieldBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // string_fixedSizeArray
    "0x78": (data: string[], type: { typeIndex: "0x78", size: number, id?: number, tag?: number }, endian: ENDIAN) => {
        if (data.length !== type["size"]) {
            throw new Error(`Fixed size array data size ${data.length} and type size ${type["size"]} do not match`);
        }

        const resultArray: Buffer[] = [];

        for (let ii = 0; ii < data.length; ii++) {
            const str = data[ii];

            const strBuffer = encodeData(str, { typeIndex: "0x60" }, endian);

            resultArray.push(strBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // string_boundedSizeArray
    "0x70": (data: string[], type: { typeIndex: "0x70", size: number, id?: number, tag?: number }, endian: ENDIAN) => {
        if (data.length > type["size"]) {
            throw new Error(`Bounded size array data size ${data.length} larger type size ${type["size"]}`);
        }

        const sizeBuffer = createSizeBuffer(data.length, endian);
        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const str = data[ii];

            const strBuffer = encodeData(str, { typeIndex: "0x60" }, endian);

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

            const strBuffer = encodeData(str, { typeIndex: "0x60" }, endian);

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
        if (data.length !== type["size"]) {
            throw new Error(`Fixed size array data size ${data.length} and type size ${type["size"]} do not match`);
        }

        const resultArray: Buffer[] = [];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData(num, { typeIndex: "0x43" }, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // floatingPoint_fixedSizeArray_binary32
    "0x5a": (data: number[], type: { typeIndex: "0x5a", size: number, id?: number, tag?: number }, endian: ENDIAN) => {
        if (data.length !== type["size"]) {
            throw new Error(`Fixed size array data size ${data.length} and type size ${type["size"]} do not match`);
        }

        const resultArray: Buffer[] = [];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData(num, { typeIndex: "0x42" }, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // floatingPoint_boundedSizeArray_binary64
    "0x53": (data: number[], type: { typeIndex: "0x53", size: number, id?: number, tag?: number }, endian: ENDIAN) => {
        if (data.length > type["size"]) {
            throw new Error(`Bounded size array data size ${data.length} larger type size ${type["size"]}`);
        }

        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData(num, { typeIndex: "0x43" }, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // floatingPoint_boundedSizeArray_binary32
    "0x52": (data: number[], type: { typeIndex: "0x52", size: number, id?: number, tag?: number }, endian: ENDIAN) => {
        if (data.length > type["size"]) {
            throw new Error(`Bounded size array data size ${data.length} larger type size ${type["size"]}`);
        }

        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData(num, { typeIndex: "0x42" }, endian);
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
            const numBuffer = encodeData(num, { typeIndex: "0x43" }, endian);
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
            const numBuffer = encodeData(num, { typeIndex: "0x42" }, endian);
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
        if (data.length !== type["size"]) {
            throw new Error(`Fixed size array data size ${data.length} and type size ${type["size"]} do not match`);
        }

        const resultArray: Buffer[] = [];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData(num, { typeIndex: "0x27" }, endian);
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
            const numBuffer = encodeData(num, { typeIndex: "0x26" }, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_fixedSizeArray_unsignedShort
    "0x3d": (data: number[], type: { typeIndex: "0x3d", size: number, id?: number, tag?: number }, endian: ENDIAN) => {
        if (data.length !== type["size"]) {
            throw new Error(`Fixed size array data size ${data.length} and type size ${type["size"]} do not match`);
        }

        const resultArray: Buffer[] = [];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData(num, { typeIndex: "0x25" }, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_fixedSizeArray_unsignedByte
    "0x3c": (data: number[], type: { typeIndex: "0x3c", size: number, id?: number, tag?: number }, endian: ENDIAN) => {
        if (data.length !== type["size"]) {
            throw new Error(`Fixed size array data size ${data.length} and type size ${type["size"]} do not match`);
        }

        const resultArray: Buffer[] = [];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData(num, { typeIndex: "0x24" }, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_fixedSizeArray_signedLong
    "0x3b": (data: number[], type: { typeIndex: "0x3b", size: number, id?: number, tag?: number }, endian: ENDIAN) => {
        if (data.length !== type["size"]) {
            throw new Error(`Fixed size array data size ${data.length} and type size ${type["size"]} do not match`);
        }

        const resultArray: Buffer[] = [];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData(num, { typeIndex: "0x23" }, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_fixedSizeArray_signedInt
    "0x3a": (data: number[], type: { typeIndex: "0x3a", size: number, id?: number, tag?: number }, endian: ENDIAN) => {
        if (data.length !== type["size"]) {
            throw new Error(`Fixed size array data size ${data.length} and type size ${type["size"]} do not match`);
        }

        const resultArray: Buffer[] = [];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData(num, { typeIndex: "0x22" }, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_fixedSizeArray_signedShort
    "0x39": (data: number[], type: { typeIndex: "0x39", size: number, id?: number, tag?: number }, endian: ENDIAN) => {
        if (data.length !== type["size"]) {
            throw new Error(`Fixed size array data size ${data.length} and type size ${type["size"]} do not match`);
        }

        const resultArray: Buffer[] = [];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData(num, { typeIndex: "0x21" }, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_fixedSizeArray_signedByte
    "0x38": (data: number[], type: { typeIndex: "0x38", size: number, id?: number, tag?: number }, endian: ENDIAN) => {
        if (data.length !== type["size"]) {
            throw new Error(`Fixed size array data size ${data.length} and type size ${type["size"]} do not match`);
        }

        const resultArray: Buffer[] = [];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData(num, { typeIndex: "0x20" }, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_boundedSizeArray_unsignedLong
    "0x37": (data: number[], type: { typeIndex: "0x37", size: number, id?: number, tag?: number }, endian: ENDIAN) => {
        if (data.length > type["size"]) {
            throw new Error(`Bounded size array data size ${data.length} larger type size ${type["size"]}`);
        }

        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData(num, { typeIndex: "0x27" }, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_boundedSizeArray_unsignedInt
    "0x36": (data: number[], type: { typeIndex: "0x36", size: number, id?: number, tag?: number }, endian: ENDIAN) => {
        if (data.length > type["size"]) {
            throw new Error(`Bounded size array data size ${data.length} larger type size ${type["size"]}`);
        }

        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData(num, { typeIndex: "0x26" }, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_boundedSizeArray_unsignedShort
    "0x35": (data: number[], type: { typeIndex: "0x35", size: number, id?: number, tag?: number }, endian: ENDIAN) => {
        if (data.length > type["size"]) {
            throw new Error(`Bounded size array data size ${data.length} larger type size ${type["size"]}`);
        }

        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData(num, { typeIndex: "0x25" }, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_boundedSizeArray_unsignedByte
    "0x34": (data: number[], type: { typeIndex: "0x34", size: number, id?: number, tag?: number }, endian: ENDIAN) => {
        if (data.length > type["size"]) {
            throw new Error(`Bounded size array data size ${data.length} larger type size ${type["size"]}`);
        }

        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData(num, { typeIndex: "0x24" }, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_boundedSizeArray_signedLong
    "0x33": (data: number[], type: { typeIndex: "0x33", size: number, id?: number, tag?: number }, endian: ENDIAN) => {
        if (data.length > type["size"]) {
            throw new Error(`Bounded size array data size ${data.length} larger type size ${type["size"]}`);
        }

        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData(num, { typeIndex: "0x23" }, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_boundedSizeArray_signedInt
    "0x32": (data: number[], type: { typeIndex: "0x32", size: number, id?: number, tag?: number }, endian: ENDIAN) => {
        if (data.length > type["size"]) {
            throw new Error(`Bounded size array data size ${data.length} larger type size ${type["size"]}`);
        }

        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData(num, { typeIndex: "0x22" }, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_boundedSizeArray_signedShort
    "0x31": (data: number[], type: { typeIndex: "0x31", size: number, id?: number, tag?: number }, endian: ENDIAN) => {
        if (data.length > type["size"]) {
            throw new Error(`Bounded size array data size ${data.length} larger type size ${type["size"]}`);
        }

        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData(num, { typeIndex: "0x21" }, endian);
            resultArray.push(numBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // integer_boundedSizeArray_signedByte
    "0x30": (data: number[], type: { typeIndex: "0x30", size: number, id?: number, tag?: number }, endian: ENDIAN) => {
        if (data.length > type["size"]) {
            throw new Error(`Bounded size array data size ${data.length} larger type size ${type["size"]}`);
        }

        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const num = data[ii];
            const numBuffer = encodeData(num, { typeIndex: "0x20" }, endian);
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
            const numBuffer = encodeData(num, { typeIndex: "0x27" }, endian);
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
            const numBuffer = encodeData(num, { typeIndex: "0x26" }, endian);
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
            const numBuffer = encodeData(num, { typeIndex: "0x25" }, endian);
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
            const numBuffer = encodeData(num, { typeIndex: "0x24" }, endian);
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
            const numBuffer = encodeData(num, { typeIndex: "0x23" }, endian);
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
            const numBuffer = encodeData(num, { typeIndex: "0x22" }, endian);
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
            const numBuffer = encodeData(num, { typeIndex: "0x21" }, endian);
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
            const numBuffer = encodeData(num, { typeIndex: "0x20" }, endian);
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
        if (data.length !== type["size"]) {
            throw new Error(`Fixed size array data size ${data.length} and type size ${type["size"]} do not match`);
        }

        const resultArray: Buffer[] = [];

        for (let ii = 0; ii < data.length; ii++) {
            const bool = data[ii];
            const boolBuffer = encodeData(bool, { typeIndex: "0x0" }, endian);
            resultArray.push(boolBuffer);
        }
        return Buffer.concat(resultArray);
    },

    // boolean_boundedSizeArray
    "0x10": (data: boolean[], type: { typeIndex: "0x18", size: number, id?: number, tag?: number }, endian: ENDIAN) => {
        if (data.length > type["size"]) {
            throw new Error(`Bounded size array data size ${data.length} larger type size ${type["size"]}`);
        }

        const sizeBuffer = createSizeBuffer(data.length, endian);

        const resultArray: Buffer[] = [sizeBuffer];

        for (let ii = 0; ii < data.length; ii++) {
            const bool = data[ii];
            const boolBuffer = encodeData(bool, { typeIndex: "0x0" }, endian);
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
            const boolBuffer = encodeData(bool, { typeIndex: "0x0" }, endian);
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


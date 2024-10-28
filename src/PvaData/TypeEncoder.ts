import { type_typeIndex } from "./DataDecoder";
import { encodeData } from "./DataEncoder";
import { createSizeBuffer, ENDIAN, writeInt16, writeInt32, writeUInt8 } from "./PvaMethods";


const createIdTagBuffer = (type: { typeIndex: type_typeIndex, id?: number, tag?: number, elementId?: number, elementTag?: number } & Record<string, any>, endian: ENDIAN): Buffer => {
    if (type["id"] === undefined) {
        return Buffer.alloc(0);
    } else {
        if (type["tag"] === undefined) {
            const buffer = Buffer.alloc(3);
            writeUInt8(0xfd, buffer, 0, endian);
            writeInt16(type["id"], buffer, 1, endian);
            return buffer;
        } else {
            const buffer = Buffer.alloc(7);
            writeUInt8(0xfc, buffer, 0, endian);
            writeInt16(type["id"], buffer, 1, endian); // signed short
            writeInt32(type["tag"], buffer, 3, endian); // signed integer
            return buffer;
        }
    }
}


export const encodeType = (
    type: { typeIndex: type_typeIndex, id?: number, tag?: number }
        | { typeIndex: type_typeIndex, size: number, id?: number, tag?: number }
        | { typeIndex: type_typeIndex, name: string, id?: number, tag?: number, fields: Record<string, any> }
        | { typeIndex: type_typeIndex, name: string, id?: number, tag?: number, elementId?: number, elementTag?: number, fields: Record<string, any> },
    endian: ENDIAN): Buffer => {

    const typeIndexStr = type["typeIndex"];
    const encoder = TypeEncoder[typeIndexStr] as any; // for typescript
    if (encoder === undefined) {
        throw new Error(`Cannot find type encoder function for type index ${typeIndexStr}`);
    }
    const result = encoder(type, endian);
    return result;
}

const TypeEncoder = {

    // complex_variableSizeArray_variantUnion, 0x8a
    "0x8a": (type: { typeIndex: "0x8a", id?: number, tag?: number }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        return Buffer.concat([idTagBuffer, typeIndexBuffer]);
    },

    // complex_variableSizeArray_union, 0x89
    "0x89": (type: { typeIndex: "0x88", name: string, id?: number, tag?: number, elementId?: number, elementTag: number, fields: Record<string, any> }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        // encode element type
        const elementTypeBuffer = encodeType({ ...type, id: type["elementId"], tag: type["elementTag"], typeIndex: "0x81" }, endian);
        return Buffer.concat([idTagBuffer, typeIndexBuffer, elementTypeBuffer]);
    },

    // complex_variableSizeArray_structure, 0x88
    "0x88": (type: { typeIndex: "0x88", name: string, id?: number, tag?: number, elementId?: number, elementTag: number, fields: Record<string, any> }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        // encode element type
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        const elementTypeBuffer = encodeType({ ...type, id: type["elementId"], tag: type["elementTag"], typeIndex: "0x80" }, endian);
        return Buffer.concat([idTagBuffer, typeIndexBuffer, elementTypeBuffer]);
    },

    // complex_scalar_boundedString, 0x83
    "0x83": (type: { typeIndex: "0x83", size: number }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idTagBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // complex_scalar_variantUnion, 0x82
    "0x82": (type: { typeIndex: "0x82" }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        return Buffer.concat([idTagBuffer, typeIndexBuffer]);
    },

    // complex_scalar_union, 0x81
    "0x81": (type: { typeIndex: "0x81", name: string, id?: number, tag?: number, fields: Record<string, any> }, endian: ENDIAN) => {
        // the type["id"] is ignored, we may want a different id from existing type
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        // struct name is encoded as a variable size string
        const nameBuffer = encodeData(type["name"], { typeIndex: "0x60" }, endian);
        // number of fields
        const sizeBuffer = createSizeBuffer(Object.keys(type["fields"]).length, endian);

        const fieldsTypeBuffer: Buffer[] = [];
        for (let fieldName of Object.keys(type["fields"])) {
            // field name is encoded as a variable size string
            const fieldNameBuffer = encodeData(fieldName, { typeIndex: "0x60" }, endian);

            // each field's type
            const fieldType = type["fields"][fieldName];
            const fieldTypeBuffer = encodeType(fieldType, endian);

            fieldsTypeBuffer.push(fieldNameBuffer, fieldTypeBuffer);
        }

        return Buffer.concat([idTagBuffer, typeIndexBuffer, nameBuffer, sizeBuffer, ...fieldsTypeBuffer]);
    },

    // complex_scalar_structure, 0x80
    "0x80": (type: { typeIndex: "0x80", name: string, id?: number, tag?: number, fields: Record<string, any> }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        // struct name is encoded as a variable size string
        const nameBuffer = encodeData(type["name"], { typeIndex: "0x60" }, endian);
        // number of fields
        const sizeBuffer = createSizeBuffer(Object.keys(type["fields"]).length, endian);

        const fieldsTypeBuffer: Buffer[] = [];
        for (let fieldName of Object.keys(type["fields"])) {
            // field name is encoded as a variable size string
            const fieldNameBuffer = encodeData(fieldName, { typeIndex: "0x60" }, endian);

            // each field's type
            const fieldType = type["fields"][fieldName];
            const fieldTypeBuffer = encodeType(fieldType, endian);
            console.log("field", fieldType, fieldTypeBuffer)
            fieldsTypeBuffer.push(fieldNameBuffer, fieldTypeBuffer);
        }

        // console.log("sizeBuffer", idTagBuffer,sizeBuffer)
        return Buffer.concat([idTagBuffer, typeIndexBuffer, nameBuffer, sizeBuffer, ...fieldsTypeBuffer]);
    },

    // string_fixedSizeArray, 0x78
    "0x78": (type: { typeIndex: "0x78", size: number }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idTagBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // string_boundedSizeArray, 0x70
    "0x70": (type: { typeIndex: "0x70", size: number }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idTagBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // string_variableSizeArray, 0x68
    "0x68": (type: { typeIndex: "0x68" }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));

        return Buffer.concat([idTagBuffer, typeIndexBuffer]);
    },

    // string_scalar, 0x60
    "0x60": (type: { typeIndex: "0x60" }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));

        return Buffer.concat([idTagBuffer, typeIndexBuffer]);
    },

    // floatingPoint_fixedSizeArray_binary64, 0x5b
    "0x5b": (type: { typeIndex: "0x5b", size: number }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idTagBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // floatingPoint_fixedSizeArray_binary32, 0x5a
    "0x5a": (type: { typeIndex: "0x5a", size: number }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idTagBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // floatingPoint_boundedSizeArray_binary64, 0x53
    "0x53": (type: { typeIndex: "0x53", size: number }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idTagBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // floatingPoint_boundedSizeArray_binary32, 0x52
    "0x52": (type: { typeIndex: "0x52", size: number }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idTagBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // floatingPoint_variableSizeArray_binary64, 0x4b
    "0x4b": (type: { typeIndex: "0x4b" }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));

        return Buffer.concat([idTagBuffer, typeIndexBuffer]);
    },

    // floatingPoint_variableSizeArray_binary32, 0x4a
    "0x4a": (type: { typeIndex: "0x4a" }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));

        return Buffer.concat([idTagBuffer, typeIndexBuffer]);
    },

    // floatingPoint_scalar_binary64, 0x43
    "0x43": (type: { typeIndex: "0x43" }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));

        return Buffer.concat([idTagBuffer, typeIndexBuffer]);
    },

    // floatingPoint_scalar_binary32, 0x42
    "0x42": (type: { typeIndex: "0x42" }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));

        return Buffer.concat([idTagBuffer, typeIndexBuffer]);
    },

    // integer_fixedSizeArray_unsignedLong, 0x3f
    "0x3f": (type: { typeIndex: "0x3f", size: number }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idTagBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_fixedSizeArray_unsignedInt, 0x3e
    "0x3e": (type: { typeIndex: "0x3e", size: number }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idTagBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_fixedSizeArray_unsignedShort, 0x3d
    "0x3d": (type: { typeIndex: "0x3d", size: number }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idTagBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_fixedSizeArray_unsignedByte, 0x3c
    "0x3c": (type: { typeIndex: "0x3c", size: number }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idTagBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_fixedSizeArray_signedLong, 0x3b
    "0x3b": (type: { typeIndex: "0x3b", size: number }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idTagBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_fixedSizeArray_signedInt, 0x3a
    "0x3a": (type: { typeIndex: "0x3a", size: number }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idTagBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_fixedSizeArray_signedShort, 0x39
    "0x39": (type: { typeIndex: "0x39", size: number }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idTagBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_fixedSizeArray_signedByte, 0x38
    "0x38": (type: { typeIndex: "0x38", size: number }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idTagBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_boundedSizeArray_unsignedLong, 0x37
    "0x37": (type: { typeIndex: "0x37", size: number }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idTagBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_boundedSizeArray_unsignedInt, 0x36
    "0x36": (type: { typeIndex: "0x36", size: number }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idTagBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_boundedSizeArray_unsignedShort, 0x35
    "0x35": (type: { typeIndex: "0x35", size: number }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idTagBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_boundedSizeArray_unsignedByte, 0x34
    "0x34": (type: { typeIndex: "0x34", size: number }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idTagBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_boundedSizeArray_signedLong, 0x33
    "0x33": (type: { typeIndex: "0x33", size: number }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idTagBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_boundedSizeArray_signedInt, 0x32
    "0x32": (type: { typeIndex: "0x32", size: number }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idTagBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_boundedSizeArray_signedShort, 0x31
    "0x31": (type: { typeIndex: "0x31", size: number }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idTagBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_boundedSizeArray_signedByte, 0x30
    "0x30": (type: { typeIndex: "0x30", size: number }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idTagBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_variableSizeArray_unsignedLong, 0x2f
    "0x2f": (type: { typeIndex: "0x2f" }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));

        return Buffer.concat([idTagBuffer, typeIndexBuffer]);
    },

    // integer_variableSizeArray_unsignedInt, 0x2e
    "0x2e": (type: { typeIndex: "0x2e" }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));

        return Buffer.concat([idTagBuffer, typeIndexBuffer]);
    },

    // integer_variableSizeArray_unsignedShort, 0x2d
    "0x2d": (type: { typeIndex: "0x2d" }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));

        return Buffer.concat([idTagBuffer, typeIndexBuffer]);
    },

    // integer_variableSizeArray_unsignedByte, 0x2c
    "0x2c": (type: { typeIndex: "0x2c" }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));

        return Buffer.concat([idTagBuffer, typeIndexBuffer]);
    },

    // integer_variableSizeArray_signedLong, 0x2b
    "0x2b": (type: { typeIndex: "0x2b" }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));

        return Buffer.concat([idTagBuffer, typeIndexBuffer]);
    },

    // integer_variableSizeArray_signedInt, 0x2a
    "0x2a": (type: { typeIndex: "0x2a" }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));

        return Buffer.concat([idTagBuffer, typeIndexBuffer]);
    },

    // integer_variableSizeArray_signedShort, 0x29
    "0x29": (type: { typeIndex: "0x29" }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));

        return Buffer.concat([idTagBuffer, typeIndexBuffer]);
    },

    // integer_variableSizeArray_signedByte, 0x28
    "0x28": (type: { typeIndex: "0x28" }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));

        return Buffer.concat([idTagBuffer, typeIndexBuffer]);
    },

    // integer_scalar_unsignedLong, 0x27
    "0x27": (type: { typeIndex: "0x27" }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));

        return Buffer.concat([idTagBuffer, typeIndexBuffer]);
    },

    // integer_scalar_unsignedInt, 0x26
    "0x26": (type: { typeIndex: "0x26" }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));

        return Buffer.concat([idTagBuffer, typeIndexBuffer]);
    },

    // integer_scalar_unsignedShort, 0x25
    "0x25": (type: { typeIndex: "0x25" }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));

        return Buffer.concat([idTagBuffer, typeIndexBuffer]);
    },

    // integer_scalar_unsignedByte, 0x24
    "0x24": (type: { typeIndex: "0x24" }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));

        return Buffer.concat([idTagBuffer, typeIndexBuffer]);
    },

    // integer_scalar_signedLong, 0x23
    "0x23": (type: { typeIndex: "0x23" }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));

        return Buffer.concat([idTagBuffer, typeIndexBuffer]);
    },

    // integer_scalar_signedInt, 0x22
    "0x22": (type: { typeIndex: "0x22" }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));

        return Buffer.concat([idTagBuffer, typeIndexBuffer]);
    },

    // integer_scalar_signedShort, 0x21
    "0x21": (type: { typeIndex: "0x21" }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));

        return Buffer.concat([idTagBuffer, typeIndexBuffer]);
    },

    // integer_scalar_signedByte, 0x20
    "0x20": (type: { typeIndex: "0x20" }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));

        return Buffer.concat([idTagBuffer, typeIndexBuffer]);
    },

    // boolean_fixedSizeArray, 0x18
    "0x18": (type: { typeIndex: "0x18", size: number }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idTagBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // boolean_boundedSizeArray, 0x10
    "0x10": (type: { typeIndex: "0x10", size: number }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idTagBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // boolean_variableSizeArray, 0x8
    "0x8": (type: { typeIndex: "0x8" }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));

        return Buffer.concat([idTagBuffer, typeIndexBuffer]);
    },

    // boolean_scalar, 0x0
    "0x0": (type: { typeIndex: "0x0" }, endian: ENDIAN) => {
        const idTagBuffer = createIdTagBuffer(type, endian);
        const typeIndexBuffer = Buffer.alloc(1, parseInt(type["typeIndex"], 16));

        return Buffer.concat([idTagBuffer, typeIndexBuffer]);
    },

}
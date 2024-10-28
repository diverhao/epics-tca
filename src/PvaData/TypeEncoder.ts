import { type_typeIndex } from "./DataDecoder";
import { encodeData } from "./DataEncoder";
import { createSizeBuffer, ENDIAN, writeInt16 } from "./PvaMethods";


const createIdBuffer = (id: number | undefined, endian: ENDIAN): Buffer => {
    if (id === undefined) {
        return Buffer.alloc(0);
    } else {
        const buffer = Buffer.alloc(2);
        writeInt16(id, buffer, 0, endian);
        return Buffer.concat([Buffer.alloc(1, 0xfd), buffer]);
    }
}


const encodeType = (
    type: { typeIndex: type_typeIndex }
        | { typeIndex: type_typeIndex, size: number }
        | { typeIndex: type_typeIndex, name: string, id?: number, tag?: number, fields: Record<string, any> },
    id: number | undefined,
    endian: ENDIAN): Buffer => {

    const typeIndex = type["typeIndex"];
    const encoder = TypeEncoder[typeIndex] as any; // for typescript
    if (encoder === undefined) {
        throw new Error(`Cannot find type encoder function for type index ${typeIndex}`);
    }
    const result = encoder(type, id, endian);
    return result;
}

const TypeEncoder = {

    // complex_variableSizeArray_variantUnion, 0x8a
    "0x8a": (type: {typeIndex: "0x8a"}, id: number | undefined, endian: ENDIAN) => {
        return Buffer.alloc(1, 0x8a);
    },

    // complex_variableSizeArray_union, 0x89
    "0x89": (type: { typeIndex: "0x89", name: string, id?: number, tag?: number, fields: Record<string, any> }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        // encode element type
        const elementTypeBuffer = encodeType({...type, typeIndex: "0x81"}, id, endian);
        return Buffer.concat([idBuffer, elementTypeBuffer]);
    },

    // complex_variableSizeArray_structure, 0x88
    "0x88": (type: { typeIndex: "0x88", name: string, id?: number, tag?: number, fields: Record<string, any> }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        // encode element type
        const elementTypeBuffer = encodeType({...type, typeIndex: "0x80"}, id, endian);
        return Buffer.concat([idBuffer, elementTypeBuffer]);
    },

    // complex_scalar_boundedString, 0x83
    "0x83": (type: { typeIndex: "0x83", size: number }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // complex_scalar_variantUnion, 0x82
    "0x82": (type: { typeIndex: "0x82"}, id: number | undefined, endian: ENDIAN) => {
        return Buffer.alloc(1, 0x82);
    },

    // complex_scalar_union, 0x81
    "0x81": (type: { typeIndex: "0x81", name: string, id?: number, tag?: number, fields: Record<string, any> }, id: number | undefined, endian: ENDIAN) => {
        // the type["id"] is ignored, we may want a different id from existing type
        const idBuffer = createIdBuffer(id, endian);
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
            const fieldTypeBuffer = encodeType(fieldType, fieldType["id"], endian);

            fieldsTypeBuffer.push(fieldNameBuffer, fieldTypeBuffer);
        }

        return Buffer.concat([idBuffer, nameBuffer, sizeBuffer, ...fieldsTypeBuffer]);
    },

    // complex_scalar_structure, 0x80
    "0x80": (type: { typeIndex: "0x80", name: string, id?: number, tag?: number, fields: Record<string, any> }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
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
            const fieldTypeBuffer = encodeType(fieldType, fieldType["id"], endian);

            fieldsTypeBuffer.push(fieldNameBuffer, fieldTypeBuffer);
        }

        return Buffer.concat([idBuffer, nameBuffer, sizeBuffer, ...fieldsTypeBuffer]);
    },

    // string_fixedSizeArray, 0x78
    "0x78": (type: { typeIndex: "0x78", size: number }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // string_boundedSizeArray, 0x70
    "0x70": (type: { typeIndex: "0x70", size: number }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // string_variableSizeArray, 0x68
    "0x68": (type: { typeIndex: "0x68" }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);

        return Buffer.concat([idBuffer, typeIndexBuffer]);
    },

    // string_scalar, 0x60
    "0x60": (type: { typeIndex: "0x60" }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);

        return Buffer.concat([idBuffer, typeIndexBuffer]);
    },

    // floatingPoint_fixedSizeArray_binary64, 0x5b
    "0x5b": (type: { typeIndex: "0x5b", size: number }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // floatingPoint_fixedSizeArray_binary32, 0x5a
    "0x5a": (type: { typeIndex: "0x5a", size: number }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // floatingPoint_boundedSizeArray_binary64, 0x53
    "0x53": (type: { typeIndex: "0x53", size: number }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // floatingPoint_boundedSizeArray_binary32, 0x52
    "0x52": (type: { typeIndex: "0x52", size: number }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // floatingPoint_variableSizeArray_binary64, 0x4b
    "0x4b": (type: { typeIndex: "0x4b" }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);

        return Buffer.concat([idBuffer, typeIndexBuffer]);
    },

    // floatingPoint_variableSizeArray_binary32, 0x4a
    "0x4a": (type: { typeIndex: "0x4a" }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);

        return Buffer.concat([idBuffer, typeIndexBuffer]);
    },

    // floatingPoint_scalar_binary64, 0x43
    "0x43": (type: { typeIndex: "0x43" }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);

        return Buffer.concat([idBuffer, typeIndexBuffer]);
    },

    // floatingPoint_scalar_binary32, 0x42
    "0x42": (type: { typeIndex: "0x42" }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);

        return Buffer.concat([idBuffer, typeIndexBuffer]);
    },

    // integer_fixedSizeArray_unsignedLong, 0x3f
    "0x3f": (type: { typeIndex: "0x3f", size: number }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_fixedSizeArray_unsignedInt, 0x3e
    "0x3e": (type: { typeIndex: "0x3e", size: number }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_fixedSizeArray_unsignedShort, 0x3d
    "0x3d": (type: { typeIndex: "0x3d", size: number }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_fixedSizeArray_unsignedByte, 0x3c
    "0x3c": (type: { typeIndex: "0x3c", size: number }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_fixedSizeArray_signedLong, 0x3b
    "0x3b": (type: { typeIndex: "0x3b", size: number }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_fixedSizeArray_signedInt, 0x3a
    "0x3a": (type: { typeIndex: "0x3a", size: number }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_fixedSizeArray_signedShort, 0x39
    "0x39": (type: { typeIndex: "0x39", size: number }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_fixedSizeArray_signedByte, 0x38
    "0x38": (type: { typeIndex: "0x38", size: number }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_boundedSizeArray_unsignedLong, 0x37
    "0x37": (type: { typeIndex: "0x37", size: number }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_boundedSizeArray_unsignedInt, 0x36
    "0x36": (type: { typeIndex: "0x36", size: number }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_boundedSizeArray_unsignedShort, 0x35
    "0x35": (type: { typeIndex: "0x35", size: number }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_boundedSizeArray_unsignedByte, 0x34
    "0x34": (type: { typeIndex: "0x34", size: number }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_boundedSizeArray_signedLong, 0x33
    "0x33": (type: { typeIndex: "0x33", size: number }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_boundedSizeArray_signedInt, 0x32
    "0x32": (type: { typeIndex: "0x32", size: number }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_boundedSizeArray_signedShort, 0x31
    "0x31": (type: { typeIndex: "0x31", size: number }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_boundedSizeArray_signedByte, 0x30
    "0x30": (type: { typeIndex: "0x30", size: number }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // integer_variableSizeArray_unsignedLong, 0x2f
    "0x2f": (type: { typeIndex: "0x2f" }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);

        return Buffer.concat([idBuffer, typeIndexBuffer]);
    },

    // integer_variableSizeArray_unsignedInt, 0x2e
    "0x2e": (type: { typeIndex: "0x2e" }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);

        return Buffer.concat([idBuffer, typeIndexBuffer]);
    },

    // integer_variableSizeArray_unsignedShort, 0x2d
    "0x2d": (type: { typeIndex: "0x2d" }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);

        return Buffer.concat([idBuffer, typeIndexBuffer]);
    },

    // integer_variableSizeArray_unsignedByte, 0x2c
    "0x2c": (type: { typeIndex: "0x2c" }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);

        return Buffer.concat([idBuffer, typeIndexBuffer]);
    },

    // integer_variableSizeArray_signedLong, 0x2b
    "0x2b": (type: { typeIndex: "0x2b" }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);

        return Buffer.concat([idBuffer, typeIndexBuffer]);
    },

    // integer_variableSizeArray_signedInt, 0x2a
    "0x2a": (type: { typeIndex: "0x2a" }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);

        return Buffer.concat([idBuffer, typeIndexBuffer]);
    },

    // integer_variableSizeArray_signedShort, 0x29
    "0x29": (type: { typeIndex: "0x29" }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);

        return Buffer.concat([idBuffer, typeIndexBuffer]);
    },

    // integer_variableSizeArray_signedByte, 0x28
    "0x28": (type: { typeIndex: "0x28" }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);

        return Buffer.concat([idBuffer, typeIndexBuffer]);
    },

    // integer_scalar_unsignedLong, 0x27
    "0x27": (type: { typeIndex: "0x27" }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);

        return Buffer.concat([idBuffer, typeIndexBuffer]);
    },

    // integer_scalar_unsignedInt, 0x26
    "0x26": (type: { typeIndex: "0x26" }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);

        return Buffer.concat([idBuffer, typeIndexBuffer]);
    },

    // integer_scalar_unsignedShort, 0x25
    "0x25": (type: { typeIndex: "0x25" }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);

        return Buffer.concat([idBuffer, typeIndexBuffer]);
    },

    // integer_scalar_unsignedByte, 0x24
    "0x24": (type: { typeIndex: "0x24" }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);

        return Buffer.concat([idBuffer, typeIndexBuffer]);
    },

    // integer_scalar_signedLong, 0x23
    "0x23": (type: { typeIndex: "0x23" }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);

        return Buffer.concat([idBuffer, typeIndexBuffer]);
    },

    // integer_scalar_signedInt, 0x22
    "0x22": (type: { typeIndex: "0x22" }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);

        return Buffer.concat([idBuffer, typeIndexBuffer]);
    },

    // integer_scalar_signedShort, 0x21
    "0x21": (type: { typeIndex: "0x21" }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);

        return Buffer.concat([idBuffer, typeIndexBuffer]);
    },

    // integer_scalar_signedByte, 0x20
    "0x20": (type: { typeIndex: "0x20" }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);

        return Buffer.concat([idBuffer, typeIndexBuffer]);
    },

    // boolean_fixedSizeArray, 0x18
    "0x18": (type: { typeIndex: "0x18", size: number }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // boolean_boundedSizeArray, 0x10
    "0x10": (type: { typeIndex: "0x10", size: number }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);
        const sizeBuffer = createSizeBuffer(type["size"], endian);

        return Buffer.concat([idBuffer, typeIndexBuffer, sizeBuffer]);
    },

    // boolean_variableSizeArray, 0x8
    "0x8": (type: { typeIndex: "0x8" }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);

        return Buffer.concat([idBuffer, typeIndexBuffer]);
    },

    // boolean_scalar, 0x0
    "0x0": (type: { typeIndex: "0x0" }, id: number | undefined, endian: ENDIAN) => {
        const idBuffer = createIdBuffer(id, endian);
        const typeIndexBuffer = Buffer.alloc(1, type["typeIndex"]);

        return Buffer.concat([idBuffer, typeIndexBuffer]);
    },

}
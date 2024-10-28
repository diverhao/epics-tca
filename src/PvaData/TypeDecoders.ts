import { GlobalMethods } from "../Global/GlobalMethods";
import { readInt16, readInt32, readInt64, readUInt8 } from "./PvaMethods";
import { ENDIAN } from "./PvaMethods"

/**
 * Internal variable for decoding a type buffer. It saves the current location of decoding.
 */
let decodingNewOffset = 0;

export const getDecodingTypeNewOffset = () => {
    return decodingNewOffset;
}

/**
 * 
 */
const typesRegistry: Record<string, any> = {};

// ------------------------- decode size and string ---------------------

/**
 * Decode a size, the size is not affected by endian, but the 4- or 8-byte integer inside of it follows the endian.
 * 
 * It is internally used for decoding a type buffer.
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

/**
 * Decode a string. Intervally used for type decoding. It updates the decodingNewOffset variable.
 */
const decodeString = (buffer: Buffer, offset: number, endian: ENDIAN) => {
    // number of characters (encoded as size) + characters (no ending 0x0)
    const { size } = decodeSize(buffer, offset, endian);

    // size could be bigint, but I don't think a string size can exceed 2^31
    const str = buffer.toString("utf-8", decodingNewOffset, decodingNewOffset + Number(size));
    decodingNewOffset = decodingNewOffset + Number(size);
    return {
        string: str,
    }
}

// ---------------------- decode a type ----------------------------

/**
 * Decode a type buffer.
 * 
 * @returns Fully expanded type respresented by an object.
 * 
 * The type may be in 3 forms
 *  - {typeIndex: "0xXX", id?: number, tag?: number}
 *  - {typeIndex: "0xXX", size: number, id?: number, tag?: number}
 *  - {typeIndex: "0xXX", name: string, id?: number, tag?: number, elementId?: number, elementTag?: number, fields: Record<string, any>}
 * 
 * Any type may hae id (and tag).
 * 
 * "size" is available for fixed size array, bounded size array, and bounded size string. 
 * The variable size array's size is encoded in the data, not in the type.
 * 
 * "elementId" (and "elementTag") are only for complex_variableSizeArray_union (0x89) and complex_variableSizeArray_struct (0x88). 
 * These two properties represent the id and tag of the element's type in the array.
 * "id" and "tag" are for the array itself.
 * 
 * @throws when the decoding fails.
 * 
 */
export const decodeType = (buffer: Buffer, offset: number, endian: ENDIAN) => {

    decodingNewOffset = offset;

    let result: Record<string, any> = {};

    const firstByte = readUInt8(buffer, offset, endian);
    if (firstByte === 0xff) {
        // nothing happens
        return {
        }
    } else if (firstByte === 0xfe) {
        // 0xfe + ID (encoded as signed short)
        decodingNewOffset = decodingNewOffset + 1
        const id = readInt16(buffer, decodingNewOffset, endian);
        decodingNewOffset = decodingNewOffset + 2;

        const idStr = id.toString();
        const result = typesRegistry[idStr];
        if (result === undefined) {
            throw new Error(`"Failed to decode the type with 0xFE type ${id}`);
        } else {
            // update newOffset: offset + 0xfe (1 byte) + ID length (2 bytes)
            // the purpose of newOffset is only for the next field, it is ok to change it anytime
            decodingNewOffset = offset + 3;
            return result;
        }
    } else if (firstByte === 0xfd) {
        // 0xfe + ID (encoded as signed short) + FieldDesc
        decodingNewOffset = decodingNewOffset + 1
        const id = readInt16(buffer, decodingNewOffset, endian);
        result["id"] = id;
        decodingNewOffset = decodingNewOffset + 2;
    } else if (firstByte === 0xfc) {
        // 0xfc + ID (encoded as signed short) + tag (encoded as a signed int) + FieldDesc
        decodingNewOffset = decodingNewOffset + 1
        const id = readInt16(buffer, decodingNewOffset, endian);
        result["id"] = id;
        decodingNewOffset = decodingNewOffset + 2;
        const tag = readInt32(buffer, decodingNewOffset, endian);
        result["tag"] = tag;
        decodingNewOffset = decodingNewOffset + 4;
    }

    const typeIndexStr = "0x" + readUInt8(buffer, decodingNewOffset, endian).toString(16) as keyof typeof TypeDecoder;
    const typeDecoder = TypeDecoder[typeIndexStr];

    if (typeDecoder !== undefined) {
        try {
            // newOffset is the type index, 0xXX's location
            // ...result is in the end to keep id and tag
            result = { ...typeDecoder(buffer, decodingNewOffset, endian), ...result };
        } catch (e) {
            GlobalMethods.errorLog(`Failed to decode type from buffer`, buffer);
            throw e;
        }
    } else {
        GlobalMethods.errorLog(`Failed to decode type from buffer`, buffer);
        throw new Error(`Failed to find decoder function for type index ${typeIndexStr}. Quit decoding.`);
    }

    // add to type registry if it is a newly arrived type with ID
    if ((firstByte === 0xfd || firstByte === 0xfc) && result["id"] !== undefined) {
        // register this type
        const idStr = result["id"].toString();
        typesRegistry[idStr] = result;
    }

    return result;
}

/**
 * Functions to decode a type buffer for various type indices. Totally 55 types are decoded.
 * 
 * 12 primitive types: 
 *  - boolean
 *  - variable size string
 *  - signed byte 
 *  - unsigned byte 
 *  - signed  short
 *  - unsigned short
 *  - signed int
 *  - unsigned int
 *  - signed long
 *  - unsigned long
 *  - float
 *  - double
 * 
 * Each primitive type has 4 forms:
 *  - scalar, {typeIndex: "0xXX"}
 *  - variable size array, {typeIndex: "0xXX"}
 *  - bounded size array, {typeIndex: "0xXX", size: number}
 *  - fixed size array, {typeIndex: "0xXX", size: number}
 * 
 * 2 compound types:
 *  - struct
 *  - union
 * 
 * Each compound type has 2 forms:
 *  - scalar, {typeIndex: "0xXX", name: string, id?: number, tag?: number, fields: Record<string, any>}
 *  - variable size array, {typeIndex: "0xXX", name: string, id?: number, tag?: number, fields: Record<string, any>}
 * 
 * 1 any type, 
 *  - variant union
 * 
 * this type has 2 forms:
 *  - scalar, {typeIndex: "0x82"}
 *  - variable size array, {typeIndex: "0x8a"}
 * 
 * 1 speical complex type, this type only has scalar form
 *  - bounded string, {typeIndex: "0x83", size: number}
 * 
 * All methods have input argument
 * 
 * @param {Buffer} buffer The buffer containing the type definition
 * 
 * @param {number} offset The beginning location of the type definition in buffer
 * 
 * @param {ENDIAN} endian The endian of the buffer
 * 
 * The return value is an object, which could in form:
 * 
 * @returns {object} {typeIndex: "0xXX"}
 * 
 * @return {object} {typeIndex: "0xXX", size: number}
 * 
 * @returns {object} {typeIndex: "0xXX", name: string, id?: number, tag?: number, fields: Record<string, any>}
 * 
 */
const TypeDecoder = {

    // complex_variableSizeArray_variantUnion 
    "0x8a": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            typeIndex: "0x8a",
        };
    },

    // complex_variableSizeArray_union 
    "0x89": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        const elementType = decodeType(buffer, decodingNewOffset, endian);

        // the element type may have its own id or tag
        if (elementType["id"] !== undefined) {
            elementType["elementId"] = elementType["id"];
        }
        if (elementType["tag"] !== undefined) {
            elementType["elementTag"] = elementType["tag"];
        }
        delete elementType["id"];
        delete elementType["tag"];
        
        return {
            ...elementType,
            typeIndex: "0x89",
        };
    },

    // complex_variableSizeArray_structure 
    "0x88": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        const elementType = decodeType(buffer, decodingNewOffset, endian);

        // the element type may have its own id or tag
        if (elementType["id"] !== undefined) {
            elementType["elementId"] = elementType["id"];
        }
        if (elementType["tag"] !== undefined) {
            elementType["elementTag"] = elementType["tag"];
        }
        delete elementType["id"];
        delete elementType["tag"];

        return {
            ...elementType,
            typeIndex: "0x88",
        };
    },

    // complex_scalar_boundedString 
    "0x83": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        const size = sizeResult["size"];
        return {
            typeIndex: "0x83",
            size: size,
        };
    },

    // complex_scalar_variantUnion 
    "0x82": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            typeIndex: "0x82",
        };
    },

    // complex_scalar_union 
    /**
     * Decoder for type union. It is same as decoding a struct type, except the type index is different.
     * 
     * The buffer is composed of 
     * 
     *  - "0x81" (type index for union)
     *  - name of this union type (encoded as a variable size string "0x60", may be 0-length)
     *  - number of fields (encodeds as a size)
     *  - 0th field name (encoded as a varaible size string)
     *  - 0th field type (starting from type index "0xXX")
     *  - 1st field name
     *  - 1st field type
     *  - ...
     */
    "0x81": (buffer: Buffer, offset: number, endian: ENDIAN) => {

        // skip "0x81"
        decodingNewOffset = offset + 1;

        // name of the union type, read a variable size string ("0x60")
        const nameResult = decodeString(buffer, decodingNewOffset, endian);
        const name = nameResult["string"];

        // number of fields, read a size
        const numFieldsResult = decodeSize(buffer, decodingNewOffset, endian);
        const numFields = numFieldsResult["size"];

        const fields: Record<string, any> = {};

        // decode each "Field": "field name" + "FieldDesc"
        for (let ii = 0; ii < numFields; ii++) {

            // "field name", a variable size string ("0x60")
            const fieldNameResult = decodeString(buffer, decodingNewOffset, endian);
            const fieldName = fieldNameResult["string"];

            // field type "FieldDesc", a type
            const field = decodeType(buffer, decodingNewOffset, endian);

            fields[fieldName] = field;
        }
        return {
            typeIndex: "0x81",
            name: name,
            fields: fields,
        }
    },

    // complex_scalar_structure 
    /**
     * Decoder for type struct. It is same as decoding a union type, except the type index is different.
     * 
     * The buffer is composed of 
     * 
     *  - "0x80" (type index for struct)
     *  - name of this struct type (encoded as a variable size string "0x60", may be 0-length)
     *  - number of fields (encodeds as a size)
     *  - 0th field name (encoded as a varaible size string)
     *  - 0th field type (starting from type index "0xXX")
     *  - 1st field name
     *  - 1st field type
     *  - ...
     */
    "0x80": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        // skip "0x80"
        decodingNewOffset = offset + 1;

        // name of the struct type, read a variable size string ("0x60")
        const nameResult = decodeString(buffer, decodingNewOffset, endian);
        const name = nameResult["string"];

        // number of fields, read a size
        const numFieldsResult = decodeSize(buffer, decodingNewOffset, endian);
        const numFields = numFieldsResult["size"];

        const fields: Record<string, any> = {};

        // decode each "Field": "field name" + "FieldDesc"
        for (let ii = 0; ii < numFields; ii++) {

            // "field name", a variable size string ("0x60")
            const fieldNameResult = decodeString(buffer, decodingNewOffset, endian);
            const fieldName = fieldNameResult["string"];

            // field type "FieldDesc", a type
            const field = decodeType(buffer, decodingNewOffset, endian);

            fields[fieldName] = field;
        }
        return {
            typeIndex: "0x80",
            name: name,
            fields: fields,
        }
    },

    // string_fixedSizeArray 
    "0x78": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        const size = sizeResult["size"];
        return {
            typeIndex: "0x78",
            size: size,
        };
    },

    // string_boundedSizeArray 
    "0x70": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        const size = sizeResult["size"];
        return {
            typeIndex: "0x70",
            size: size,
        };
    },

    // string_variableSizeArray 
    "0x68": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            typeIndex: "0x68",
        };
    },

    // string_scalar 
    "0x60": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            typeIndex: "0x60",
        };
    },

    // floatingPoint_fixedSizeArray_binary64 
    "0x5b": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        const size = sizeResult["size"];
        return {
            typeIndex: "0x5b",
            size: size,
        };
    },

    // floatingPoint_fixedSizeArray_binary32 
    "0x5a": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        const size = sizeResult["size"];
        return {
            typeIndex: "0x5a",
            size: size,
        };
    },

    // floatingPoint_boundedSizeArray_binary64 
    "0x53": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        const size = sizeResult["size"];
        return {
            typeIndex: "0x53",
            size: size,
        };
    },

    // floatingPoint_boundedSizeArray_binary32 
    "0x52": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        const size = sizeResult["size"];
        return {
            typeIndex: "0x52",
            size: size,
        };
    },

    // floatingPoint_variableSizeArray_binary64 
    "0x4b": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            typeIndex: "0x4b",
        };
    },

    // floatingPoint_variableSizeArray_binary32 
    "0x4a": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            typeIndex: "0x4a",
        };
    },

    // floatingPoint_scalar_binary64 
    "0x43": (buffer: Buffer, offset: number, endian: ENDIAN): any => {
        decodingNewOffset = offset + 1;
        return {
            typeIndex: "0x43",
        };
    },

    // floatingPoint_scalar_binary32 
    "0x42": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            typeIndex: "0x42",
        };
    },

    // integer_fixedSizeArray_unsignedLong 
    "0x3f": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        const size = sizeResult["size"];
        return {
            typeIndex: "0x3f",
            size: size,
        };
    },

    // integer_fixedSizeArray_unsignedInt 
    "0x3e": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        const size = sizeResult["size"];
        return {
            typeIndex: "0x3e",
            size: size,
        };
    },

    // integer_fixedSizeArray_unsignedShort 
    "0x3d": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        const size = sizeResult["size"];
        return {
            typeIndex: "0x3d",
            size: size,
        };
    },

    // integer_fixedSizeArray_unsignedByte 
    "0x3c": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        const size = sizeResult["size"];
        return {
            typeIndex: "0x3c",
            size: size,
        };
    },

    // integer_fixedSizeArray_signedLong 
    "0x3b": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        const size = sizeResult["size"];
        return {
            typeIndex: "0x3b",
            size: size,
        };
    },

    // integer_fixedSizeArray_signedInt 
    "0x3a": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        const size = sizeResult["size"];
        return {
            typeIndex: "0x3a",
            size: size,
        };
    },

    // integer_fixedSizeArray_signedShort 
    "0x39": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        const size = sizeResult["size"];
        return {
            typeIndex: "0x39",
            size: size,
        };
    },

    // integer_fixedSizeArray_signedByte 
    "0x38": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        const size = sizeResult["size"];
        return {
            typeIndex: "0x38",
            size: size,
        };
    },

    // integer_boundedSizeArray_unsignedLong 
    "0x37": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        const size = sizeResult["size"];
        return {
            typeIndex: "0x37",
            size: size,
        };
    },

    // integer_boundedSizeArray_unsignedInt 
    "0x36": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        const size = sizeResult["size"];
        return {
            typeIndex: "0x36",
            size: size,
        };
    },

    // integer_boundedSizeArray_unsignedShort 
    "0x35": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        const size = sizeResult["size"];
        return {
            typeIndex: "0x35",
            size: size,
        };
    },

    // integer_boundedSizeArray_unsignedByte 
    "0x34": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        const size = sizeResult["size"];
        return {
            typeIndex: "0x34",
            size: size,
        };
    },

    // integer_boundedSizeArray_signedLong 
    "0x33": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        const size = sizeResult["size"];
        return {
            typeIndex: "0x33",
            size: size
        };
    },

    // integer_boundedSizeArray_signedInt 
    "0x32": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        const size = sizeResult["size"];
        return {
            typeIndex: "0x32",
            size: size
        };
    },

    // integer_boundedSizeArray_signedShort 
    "0x31": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        const size = sizeResult["size"];
        return {
            typeIndex: "0x31",
            size: size,
        };
    },

    // integer_boundedSizeArray_signedByte 
    "0x30": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        const size = sizeResult["size"];
        return {
            typeIndex: "0x30",
            size: size,
        };
    },

    // integer_variableSizeArray_unsignedLong 
    "0x2f": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            typeIndex: "0x2f",
        };
    },

    // integer_variableSizeArray_unsignedInt 
    "0x2e": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            typeIndex: "0x2e",
        };
    },

    // integer_variableSizeArray_unsignedShort 
    "0x2d": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            typeIndex: "0x2d",
        };
    },

    // integer_variableSizeArray_unsignedByte 
    "0x2c": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            typeIndex: "0x2c",
        };
    },

    // integer_variableSizeArray_signedLong 
    "0x2b": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            typeIndex: "0x2b",
        };
    },

    // integer_variableSizeArray_signedInt 
    "0x2a": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            typeIndex: "0x2a",
        };
    },

    // integer_variableSizeArray_signedShort 
    "0x29": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            typeIndex: "0x29",
        };
    },

    // integer_variableSizeArray_signedByte 
    "0x28": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            typeIndex: "0x28",
        };
    },

    // integer_scalar_unsignedLong 
    "0x27": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            typeIndex: "0x27",
        };
    },

    // integer_scalar_unsignedInt 
    "0x26": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            typeIndex: "0x26",
        };
    },

    // integer_scalar_unsignedShort 
    "0x25": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            typeIndex: "0x25",
        };
    },

    // integer_scalar_unsignedByte 
    "0x24": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            typeIndex: "0x24",
        };
    },

    // integer_scalar_signedLong 
    "0x23": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            typeIndex: "0x23",
        };
    },

    // integer_scalar_signedInt 
    "0x22": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            typeIndex: "0x22",
        };
    },

    // integer_scalar_signedShort 
    "0x21": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            typeIndex: "0x21",
        };
    },

    // integer_scalar_signedByte 
    "0x20": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            typeIndex: "0x20",
        };
    },

    // boolean_fixedSizeArray 
    "0x18": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        const size = sizeResult["size"];
        return {
            typeIndex: "0x18",
            size: size,
        };
    },

    // boolean_boundedSizeArray 
    "0x10": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        const size = sizeResult["size"];
        return {
            typeIndex: "0x10",
            size: size,
        };
    },

    // boolean_variableSizeArray 
    "0x8": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            typeIndex: "0x8",
        };
    },

    // boolean_scalar 
    "0x0": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            typeIndex: "0x0",
        };
    },
}



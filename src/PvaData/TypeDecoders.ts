import { readInt16, readInt32, readInt64, readUInt8 } from "./PvaMethods";
import { ENDIAN } from "./PvaMethods"

let decodingNewOffset = 0;

const typesRegistry: Record<string, any> = {};

// ------------------------- decode size and string ---------------------

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


const decodeString = (buffer: Buffer, offset: number, endian: ENDIAN) => {
    // number of characters (size) + characters
    const { size } = decodeSize(buffer, offset, endian);

    // size could be bigint, but I don't think a string size can exceed 2^31
    const str = buffer.toString("utf-8", decodingNewOffset, decodingNewOffset + Number(size));
    decodingNewOffset = decodingNewOffset + Number(size);
    return {
        string: str,
    }
}

// ---------------------- decode a type ----------------------------

export const decodeType = (buffer: Buffer, offset: number, endian: ENDIAN) => {
    const firstByte = readUInt8(buffer, offset, endian);
    // let newOffset = offset;
    decodingNewOffset = offset;
    let result: Record<string, any> = {
    };

    if (firstByte === 0xff) {
        // nothing happens
        return {
        }
    } else if (firstByte === 0xfe) {
        // 0xfe + ID
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
        // 0xfe + ID + FieldDesc
        decodingNewOffset = decodingNewOffset + 1
        const id = readInt16(buffer, decodingNewOffset, endian);
        result["id"] = id;
        decodingNewOffset = decodingNewOffset + 2;

    } else if (firstByte === 0xfc) {
        // 0xfc + ID + tag + FieldDesc
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
        // newOffset is the type index, 0xXX's location
        result = { ...result, ...typeDecoder(buffer, decodingNewOffset, endian) };
    } else {
        throw new Error("Cannot decode this type");
    }

    if (result["id"] !== undefined) {
        // register this type
        const idStr = result["id"].toString();
        typesRegistry[idStr] = result;
    }

    return result;
}

/**
 * Decode a type buffer
 */
export const TypeDecoder = {

    // complex_fixedSizeArray_boundedString 
    //! seems like there is no such a data type
    "0x9b": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x9b",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // complex_fixedSizeArray_variantUnion 
    "0x9a": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x9a",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // complex_fixedSizeArray_union 
    "0x99": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x99",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // complex_fixedSizeArray_structure 
    "0x98": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x98",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // complex_boundedSizeArray_boundedString 
    "0x93": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x93",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // complex_boundedSizeArray_variantUnion 
    "0x92": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x92",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // complex_boundedSizeArray_union 
    "0x91": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x91",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // complex_boundedSizeArray_structure 
    "0x90": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x90",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // complex_variableSizeArray_boundedString 
    "0x8b": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x8b",
        };
    },

    // complex_variableSizeArray_variantUnion 
    "0x8a": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x8a",
        };
    },

    // complex_variableSizeArray_union 
    "0x89": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        const elementType = decodeType(buffer, decodingNewOffset, endian);
        return {
            type: "0x89",
            elementType: elementType,
        };
    },

    // complex_variableSizeArray_structure 
    "0x88": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        // decode element
        decodingNewOffset = offset + 1;
        const elementType = decodeType(buffer, decodingNewOffset, endian);
        return {
            type: "0x88",
            elementType: elementType,
        };
    },

    // complex_scalar_boundedString 
    "0x83": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x83",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // complex_scalar_variantUnion 
    "0x82": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x82",
        };
    },

    // complex_scalar_union 
    "0x81": (buffer: Buffer, offset: number, endian: ENDIAN) => {

        // after 0x81, we have an "identification string" + number of fields +
        // "field name 1" + "FieldDesc 1" + "field name 2" + "FieldDesc 2" + ... + "field name N" + "FieldDesc N"

        // offset is for "0x81"
        decodingNewOffset = offset + 1;

        // decode "identification string": read a string (0x60)
        const nameResult = decodeString(buffer, decodingNewOffset, endian);
        const name = nameResult["string"]; // structure type name


        // number of fields
        const numFieldsResult = decodeSize(buffer, decodingNewOffset, endian);
        const numFields = numFieldsResult["size"];

        const fields: Record<string, any> = {};

        // decode each "Field": "field name" + "FieldDesc"
        for (let ii = 0; ii < numFields; ii++) {

            // "field name", a string
            const fieldNameResult = decodeString(buffer, decodingNewOffset, endian);
            const fieldName = fieldNameResult["string"];

            // "fieldDesc"
            const field = decodeType(buffer, decodingNewOffset, endian);

            fields[fieldName] = field;
        }
        return {
            type: "0x81",
            name: name, // only for struct
            fields: fields, // only for struct
        }
    },

    // complex_scalar_structure 
    "0x80": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        // after 0x80, we have an "identification string" + number of fields +
        // "field name 1" + "FieldDesc 1" + "field name 2" + "FieldDesc 2" + ... + "field name N" + "FieldDesc N"

        // offset is for "0x80"
        decodingNewOffset = offset + 1;

        // decode "identification string": read a string (0x60)
        const nameResult = decodeString(buffer, decodingNewOffset, endian);
        const name = nameResult["string"]; // structure type name


        // number of fields
        const numFieldsResult = decodeSize(buffer, decodingNewOffset, endian);
        const numFields = numFieldsResult["size"];

        const fields: Record<string, any> = {};

        // decode each "Field": "field name" + "FieldDesc"
        for (let ii = 0; ii < numFields; ii++) {

            // "field name", a string
            const fieldNameResult = decodeString(buffer, decodingNewOffset, endian);
            const fieldName = fieldNameResult["string"];

            // "fieldDesc"
            const field = decodeType(buffer, decodingNewOffset, endian);

            fields[fieldName] = field;
        }
        return {
            type: "0x80",
            name: name, // only for struct
            fields: fields, // only for struct
        }
    },

    // string_fixedSizeArray 
    "0x78": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x78",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // string_boundedSizeArray 
    "0x70": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x70",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // string_variableSizeArray 
    "0x68": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x68",
        };
    },

    // string_scalar 
    "0x60": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x60",
        };
    },

    // floatingPoint_fixedSizeArray_binary128 
    "0x5c": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x5c",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // floatingPoint_fixedSizeArray_binary64 
    "0x5b": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x5b",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // floatingPoint_fixedSizeArray_binary32 
    "0x5a": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x5a",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // floatingPoint_boundedSizeArray_binary128 
    "0x54": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x54",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // floatingPoint_boundedSizeArray_binary64 
    "0x53": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x53",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // floatingPoint_boundedSizeArray_binary32 
    "0x52": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x52",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // floatingPoint_variableSizeArray_binary128 
    "0x4c": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x4c",
        };
    },

    // floatingPoint_variableSizeArray_binary64 
    "0x4b": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x4b",
        };
    },

    // floatingPoint_variableSizeArray_binary32 
    "0x4a": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x4a",
        };
    },

    // floatingPoint_scalar_binary128 
    "0x44": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x44",
        };
    },

    // floatingPoint_scalar_binary64 
    "0x43": (buffer: Buffer, offset: number, endian: ENDIAN): any => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x43",
        };
    },

    // floatingPoint_scalar_binary32 
    "0x42": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x42",
        };
    },

    // integer_fixedSizeArray_unsignedLong 
    "0x3f": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x3f",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // integer_fixedSizeArray_unsignedInt 
    "0x3e": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x3e",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // integer_fixedSizeArray_unsignedShort 
    "0x3d": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x3d",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // integer_fixedSizeArray_unsignedByte 
    "0x3c": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x3c",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // integer_fixedSizeArray_signedLong 
    "0x3b": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x3b",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // integer_fixedSizeArray_signedInt 
    "0x3a": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x3a",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // integer_fixedSizeArray_signedShort 
    "0x39": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x39",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // integer_fixedSizeArray_signedByte 
    "0x38": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x38",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // integer_boundedSizeArray_unsignedLong 
    "0x37": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x37",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // integer_boundedSizeArray_unsignedInt 
    "0x36": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x36",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // integer_boundedSizeArray_unsignedShort 
    "0x35": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x35",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // integer_boundedSizeArray_unsignedByte 
    "0x34": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x34",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // integer_boundedSizeArray_signedLong 
    "0x33": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x33",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // integer_boundedSizeArray_signedInt 
    "0x32": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x32",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // integer_boundedSizeArray_signedShort 
    "0x31": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x31",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // integer_boundedSizeArray_signedByte 
    "0x30": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x30",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // integer_variableSizeArray_unsignedLong 
    "0x2f": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x2f",
        };
    },

    // integer_variableSizeArray_unsignedInt 
    "0x2e": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x2e",
        };
    },

    // integer_variableSizeArray_unsignedShort 
    "0x2d": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x2d",
        };
    },

    // integer_variableSizeArray_unsignedByte 
    "0x2c": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x2c",
        };
    },

    // integer_variableSizeArray_signedLong 
    "0x2b": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x2b",
        };
    },

    // integer_variableSizeArray_signedInt 
    "0x2a": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x2a",
        };
    },

    // integer_variableSizeArray_signedShort 
    "0x29": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x29",
        };
    },

    // integer_variableSizeArray_signedByte 
    "0x28": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x28",
        };
    },

    // integer_scalar_unsignedLong 
    "0x27": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x27",
        };
    },

    // integer_scalar_unsignedInt 
    "0x26": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x26",
        };
    },

    // integer_scalar_unsignedShort 
    "0x25": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x25",
        };
    },

    // integer_scalar_unsignedByte 
    "0x24": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x24",
        };
    },

    // integer_scalar_signedLong 
    "0x23": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x23",
        };
    },

    // integer_scalar_signedInt 
    "0x22": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x22",
        };
    },

    // integer_scalar_signedShort 
    "0x21": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x21",
        };
    },

    // integer_scalar_signedByte 
    "0x20": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x20",
        };
    },

    // boolean_fixedSizeArray 
    "0x18": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x18",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // boolean_boundedSizeArray 
    "0x10": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const sizeResult = decodeSize(buffer, newOffset, endian);
        return {
            type: "0x10",
            size: sizeResult["size"], // only for bounded size array
        };
    },

    // boolean_variableSizeArray 
    "0x8": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x0",
        };
    },

    // boolean_scalar 
    "0x0": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;
        return {
            type: "0x0",
        };
    },
}



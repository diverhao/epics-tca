import { GlobalMethods } from "../Global/GlobalMethods";
import { TCPTransport } from "../TCPTransport/TCPTransport";
import { type_typeIndex, checkType, SIZE_TYPE } from "./PvaData_typeEncoding";
import { readInt16, readInt32, readInt64, readUInt16, readUInt32, readUInt64, readUInt8 } from "./PvaMethods";
import { ENDIAN } from "./PvaMethods"
import { PvRequest } from "./PvRequest";


// ---------------------- offset of decoding -----------------------

/**
 * Internal variable for decoding a type buffer. It saves the current location of decoding.
 */
let decodingNewOffset = 0;

/**
 * Obtain the current offset in the data Buffer during this data decoding process.
 * 
 * This offset automatically increases after a Buffer chunk is decoded. It is reset
 * to 0 when the decodeData() is invoked. It cannot be manually modified.
 */
export const getDecodingTypeNewOffset = () => {
    return decodingNewOffset;
}

/**
 * The key-value table that contains 
 * 
 * key: `${ID}`, where the ID is defined in FULL_WITH_ID_TYPE_CODE or FULL_TAGGED_ID_TYPE_CODE.
 * 
 * value: a PVA type. It is an object 
 */
let typesRegistry: Record<string, any> = {};
export const setPvaTypesRegistry = (tcpTransport: TCPTransport) => {
    typesRegistry = tcpTransport.getPvaTypesRegistry();
}

// --------------------------- decode size  -------------------------

/**
 * Obtain a size from Buffer.
 * 
 * It is internally used for type decoding. It updates the decodingNewOffset variable.
 * 
 * It is exactly the same as the decodeSize function in DataDecoder. 
 * It is redefined because it needs to modify the decodingNewOffset varaible in this file.
 */
export const decodeSizeB = (buffer: Buffer, offset: number, endian: ENDIAN, sizeType: SIZE_TYPE | undefined): number | bigint => {

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
            console.log("byte2to5", byte2to5)
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

const decodeSize = decodeSizeB;

/**
 * Obtain a string from Buffer. It is primarily to read the field names.
 * 
 * Internally used for type decoding. 
 * 
 * Technically it is the same as decodeData({typeIndex: "0x60"}). But it updates the decodingNewOffset variable.
 */
export const decodeString = (buffer: Buffer, offset: number, endian: ENDIAN) => {
    // number of characters (encoded as size) + characters (no ending 0x0)
    const size = decodeSize(buffer, offset, endian, undefined);

    // size could be bigint, but I don't think a string size can exceed 2^31
    const str = buffer.toString("utf-8", decodingNewOffset, decodingNewOffset + Number(size));
    decodingNewOffset = decodingNewOffset + Number(size);
    return str;
}

// ---------------------- reduce struct type ------------------------

let reduceStructTypeWithBitSetsCount = -1;

const countFieldsInStructType = (type: Record<string, any>) => {
    let count = 0; // does not count itself, only count fields and sub-fields

    const fields = type["fields"];
    if (typeof fields === "object") {
        for (let field of Object.values(fields)) {
            count = count + 1;
            if ((field as any)["typeIndex"] === "0x80") {
                count = count + countFieldsInStructType(field as any);
            }
        }
    }
    return count;
}

/**
 * Reduce the type based on a BitSets array. Only the fields appear in the BitSets array
 * are kept. 
 * 
 * @param {Record<string, any>} typeRaw The input type, it must be a struct scalar
 * 
 * @param {number[]} bitSets The BitSets array
 * 
 * @param {boolean} isTopLevelStruct Is this struct the top-level data type? 
 *                                   The user should always set it to true.
 * 
 * @returns {any} The reduced type. The type is a hard copy of the input type.
 * 
 * @throws when the input is wrong, or there is any error during the reduction
 */
export const reduceStructTypeWithBitSets = (typeRaw: Record<string, any>, bitSetsRaw: number[], isTopLevelStruct: boolean) => {
    let type = typeRaw;

    const bitSets = bitSetsRaw.sort();

    if (isTopLevelStruct) {
        // input type must be struct scalar
        if (type["typeIndex"] !== "0x80") {
            throw new Error("");
        }
        // if the input type is not a valid type, throw an exception
        checkType(typeRaw);
        reduceStructTypeWithBitSetsCount = 0;
        // make a hard copy
        type = JSON.parse(JSON.stringify(typeRaw));
    } else {
        reduceStructTypeWithBitSetsCount++;
    }

    if (type["typeIndex"] === "0x80") {
        if (bitSets.includes(reduceStructTypeWithBitSetsCount)) {
            // fast forward reduceStructTypeWithBitSetsCount
            reduceStructTypeWithBitSetsCount = reduceStructTypeWithBitSetsCount + countFieldsInStructType(type);
            return type;
        } else {
            if (isTopLevelStruct === false) {
                type["canBeDeleted"] = true;
            }
        }
    }

    const fields = type["fields"]
    const fieldNames = Object.keys(fields);
    for (let fieldName of fieldNames) {
        const fieldType = fields[fieldName];
        const fieldTypeIndex = fieldType["typeIndex"];
        if (
            // todo: move commonly used types to the front
            fieldTypeIndex === "0x8a" ||
            fieldTypeIndex === "0x89" ||
            fieldTypeIndex === "0x88" ||
            fieldTypeIndex === "0x83" ||
            fieldTypeIndex === "0x78" ||
            fieldTypeIndex === "0x70" ||
            fieldTypeIndex === "0x68" ||
            fieldTypeIndex === "0x60" ||
            fieldTypeIndex === "0x5b" ||
            fieldTypeIndex === "0x5a" ||
            fieldTypeIndex === "0x53" ||
            fieldTypeIndex === "0x52" ||
            fieldTypeIndex === "0x4b" ||
            fieldTypeIndex === "0x4a" ||
            fieldTypeIndex === "0x43" ||
            fieldTypeIndex === "0x42" ||
            fieldTypeIndex === "0x3f" ||
            fieldTypeIndex === "0x3e" ||
            fieldTypeIndex === "0x3d" ||
            fieldTypeIndex === "0x3c" ||
            fieldTypeIndex === "0x3b" ||
            fieldTypeIndex === "0x3a" ||
            fieldTypeIndex === "0x39" ||
            fieldTypeIndex === "0x38" ||
            fieldTypeIndex === "0x37" ||
            fieldTypeIndex === "0x36" ||
            fieldTypeIndex === "0x35" ||
            fieldTypeIndex === "0x34" ||
            fieldTypeIndex === "0x33" ||
            fieldTypeIndex === "0x32" ||
            fieldTypeIndex === "0x31" ||
            fieldTypeIndex === "0x30" ||
            fieldTypeIndex === "0x2f" ||
            fieldTypeIndex === "0x2e" ||
            fieldTypeIndex === "0x2d" ||
            fieldTypeIndex === "0x2c" ||
            fieldTypeIndex === "0x2b" ||
            fieldTypeIndex === "0x2a" ||
            fieldTypeIndex === "0x29" ||
            fieldTypeIndex === "0x28" ||
            fieldTypeIndex === "0x27" ||
            fieldTypeIndex === "0x26" ||
            fieldTypeIndex === "0x25" ||
            fieldTypeIndex === "0x24" ||
            fieldTypeIndex === "0x23" ||
            fieldTypeIndex === "0x22" ||
            fieldTypeIndex === "0x21" ||
            fieldTypeIndex === "0x20" ||
            fieldTypeIndex === "0x18" ||
            fieldTypeIndex === "0x10" ||
            fieldTypeIndex === "0x8" ||
            fieldTypeIndex === "0x0"
        ) {
            reduceStructTypeWithBitSetsCount = reduceStructTypeWithBitSetsCount + 1;
            if (!bitSets.includes(reduceStructTypeWithBitSetsCount)) {
                delete fields[fieldName];
            }
        } else if (
            fieldTypeIndex === "0x80"
        ) {
            const structType = reduceStructTypeWithBitSets(fieldType, bitSets, false);
            if (structType["shouldBeDeleted"] === true) {
                delete fields[fieldName];
            }
        } else {
            // complex_scalar_variantUnion = "0x82",
            // complex_scalar_union = "0x81",
            // todo what to do?
        }
    }

    if (type["typeIndex"] === "0x80") {
        if (type["canBeDeleted"] === true && Object.keys(type["fields"]).length === 0 && isTopLevelStruct === false) {
            type["shouldBeDeleted"] = true;
        }
        delete type["canBeDeleted"];
    }

    return type;

}


/**
 * Obtain a PVA type from provided Buffer.
 * 
 * @param {Buffer} buffer The Buffer object that contains the type that will be decoded
 *                        It follows the definition in PV Access protocol
 * 
 * @param {number} offset The beginning location in the Buffer for decoding
 * 
 * @param {ENDIAN} endian The endian used for decoding the Buffer
 * 
 * @returns {any} The object that represents a type. It should look like {typeIndex: "0x80", name: "NTScalar", fields: {...}}
 *                or simply {typeIndex: "0x43"}
 *                If the provided Buffer is an ONLY_ID_TYPE_CODE (0xfe), this method will find the corresponding type according
 *                to the provided ID and return it.
 *                If the provide Buffer is an FULL_WITH_ID_TYPE_CODE (0xfd), this method will register this type with the provided
 *                ID. If this ID is already used by another type, then override it.
 * 
 * @throws if the decoding fails.
 *         There are variety of reason that the decoding could fail. For example, the Buffer is incorrectly encoded,
 *         the offset is wrong.
 * 
 * todo: how to handle NULL_TYPE_CODE (0xff) and FULL_TAGGED_ID_TYPE_CODE (0xfc)
 */
export const decodeType = (
    buffer: Buffer,
    offset: number,
    endian: ENDIAN): any => {

    decodingNewOffset = offset;

    let result: any = { typeIndex: "0x0" };

    const firstByte = readUInt8(buffer, offset, endian);
    if (firstByte === 0xff) {
        // nothing happens
        return {};
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

    // the typeIndexStr type is guarded by the below if (typeDecoder !== undefined)
    const typeIndexStr = "0x" + readUInt8(buffer, decodingNewOffset, endian).toString(16) as type_typeIndex;
    const typeDecoder = TypeDecoder[typeIndexStr];

    if (typeDecoder !== undefined) {
        try {
            // newOffset is the type index, 0xXX's location
            // ...result must in the front to let typeIndex get overridden
            // the reutrn type of typeDecoder(buffer, decodingNewOffset, endian) is guarded by functions' return type in TypeDecoders
            result = { ...result, ...typeDecoder(buffer, decodingNewOffset, endian) };
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

    checkType(result);

    return result;
}

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

        // the type of elementType is guarded by the below if (elementType["typeIndex"] !== "0x81") {
        const elementType = decodeType(buffer, decodingNewOffset, endian);

        if (elementType["typeIndex"] !== "0x81") {
            throw new Error(`Error decoding type 0x89`);
        }

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

    // complex_variableSizeArray_union_no_null
    "0x89a": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;

        // the type of elementType is guarded by the below if (elementType["typeIndex"] !== "0x81") {
        const elementType = decodeType(buffer, decodingNewOffset, endian);

        if (elementType["typeIndex"] !== "0x81") {
            throw new Error(`Error decoding type 0x89a`);
        }

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
            typeIndex: "0x89a",
        };
    },

    // complex_variableSizeArray_structure 
    "0x88a": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;

        // the type of elementType is guarded by the below if (elementType["typeIndex"] !== "0x80") {
        const elementType = decodeType(buffer, decodingNewOffset, endian);

        if (elementType["typeIndex"] !== "0x80") {
            throw new Error(`Error decoding type 0x88a`);
        }

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
            typeIndex: "0x88a",
        };
    },

    // complex_variableSizeArray_structure 
    "0x88": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        decodingNewOffset = offset + 1;

        // the type of elementType is guarded by the below if (elementType["typeIndex"] !== "0x80") {
        const elementType = decodeType(buffer, decodingNewOffset, endian);

        if (elementType["typeIndex"] !== "0x80") {
            throw new Error(`Error decoding type 0x88`);
        }

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
        const size = decodeSize(buffer, newOffset, endian, undefined);
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
        const name = decodeString(buffer, decodingNewOffset, endian);

        // number of fields, read a size
        const numFields = decodeSize(buffer, decodingNewOffset, endian, undefined);

        const fields: Record<string, any> = {};

        // decode each "Field": "field name" + "FieldDesc"
        for (let ii = 0; ii < numFields; ii++) {

            const fieldName = decodeString(buffer, decodingNewOffset, endian);

            // field type "FieldDesc", a type
            // the type of field is guarded by the below if (Object.keys(field).length > 0)
            const field = decodeType(buffer, decodingNewOffset, endian);

            if (Object.keys(field).length > 0) {
                fields[fieldName] = field;
            }
        }
        return {
            typeIndex: "0x81",
            name: name,
            fields: fields,
        };
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
        const name = decodeString(buffer, decodingNewOffset, endian);

        // number of fields, read a size
        const numFields = decodeSize(buffer, decodingNewOffset, endian, undefined);

        const fields: Record<string, any> = {};

        // decode each "Field": "field name" + "FieldDesc"
        for (let ii = 0; ii < numFields; ii++) {

            const fieldName = decodeString(buffer, decodingNewOffset, endian);

            // field type "FieldDesc", a type
            // the type of field is guarded by the below if (Object.keys(field).length > 0)
            const field = decodeType(buffer, decodingNewOffset, endian);

            if (Object.keys(field).length > 0) {
                fields[fieldName] = field;
            }
        }
        return {
            typeIndex: "0x80",
            name: name,
            fields: fields,
        };
    },

    // string_fixedSizeArray 
    "0x78": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const size = decodeSize(buffer, newOffset, endian, undefined);
        return {
            typeIndex: "0x78",
            size: size,
        };
    },

    // string_boundedSizeArray 
    "0x70": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const size = decodeSize(buffer, newOffset, endian, undefined);
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
        const size = decodeSize(buffer, newOffset, endian, undefined);
        return {
            typeIndex: "0x5b",
            size: size,
        };
    },

    // floatingPoint_fixedSizeArray_binary32 
    "0x5a": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const size = decodeSize(buffer, newOffset, endian, undefined);
        return {
            typeIndex: "0x5a",
            size: size,
        };
    },

    // floatingPoint_boundedSizeArray_binary64 
    "0x53": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const size = decodeSize(buffer, newOffset, endian, undefined);
        return {
            typeIndex: "0x53",
            size: size,
        };
    },

    // floatingPoint_boundedSizeArray_binary32 
    "0x52": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const size = decodeSize(buffer, newOffset, endian, undefined);
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
    "0x43": (buffer: Buffer, offset: number, endian: ENDIAN) => {
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
        const size = decodeSize(buffer, newOffset, endian, undefined);
        return {
            typeIndex: "0x3f",
            size: size,
        };
    },

    // integer_fixedSizeArray_unsignedInt 
    "0x3e": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const size = decodeSize(buffer, newOffset, endian, undefined);
        return {
            typeIndex: "0x3e",
            size: size,
        };
    },

    // integer_fixedSizeArray_unsignedShort 
    "0x3d": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const size = decodeSize(buffer, newOffset, endian, undefined);
        return {
            typeIndex: "0x3d",
            size: size,
        };
    },

    // integer_fixedSizeArray_unsignedByte 
    "0x3c": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const size = decodeSize(buffer, newOffset, endian, undefined);
        return {
            typeIndex: "0x3c",
            size: size,
        };
    },

    // integer_fixedSizeArray_signedLong 
    "0x3b": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const size = decodeSize(buffer, newOffset, endian, undefined);
        return {
            typeIndex: "0x3b",
            size: size,
        };
    },

    // integer_fixedSizeArray_signedInt 
    "0x3a": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const size = decodeSize(buffer, newOffset, endian, undefined);
        return {
            typeIndex: "0x3a",
            size: size,
        };
    },

    // integer_fixedSizeArray_signedShort 
    "0x39": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const size = decodeSize(buffer, newOffset, endian, undefined);
        return {
            typeIndex: "0x39",
            size: size,
        };
    },

    // integer_fixedSizeArray_signedByte 
    "0x38": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const size = decodeSize(buffer, newOffset, endian, undefined);
        return {
            typeIndex: "0x38",
            size: size,
        };
    },

    // integer_boundedSizeArray_unsignedLong 
    "0x37": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const size = decodeSize(buffer, newOffset, endian, undefined);
        return {
            typeIndex: "0x37",
            size: size,
        };
    },

    // integer_boundedSizeArray_unsignedInt 
    "0x36": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const size = decodeSize(buffer, newOffset, endian, undefined);
        return {
            typeIndex: "0x36",
            size: size,
        };
    },

    // integer_boundedSizeArray_unsignedShort 
    "0x35": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const size = decodeSize(buffer, newOffset, endian, undefined);
        return {
            typeIndex: "0x35",
            size: size,
        };
    },

    // integer_boundedSizeArray_unsignedByte 
    "0x34": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const size = decodeSize(buffer, newOffset, endian, undefined);
        return {
            typeIndex: "0x34",
            size: size,
        };
    },

    // integer_boundedSizeArray_signedLong 
    "0x33": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const size = decodeSize(buffer, newOffset, endian, undefined);
        return {
            typeIndex: "0x33",
            size: size
        };
    },

    // integer_boundedSizeArray_signedInt 
    "0x32": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const size = decodeSize(buffer, newOffset, endian, undefined);
        return {
            typeIndex: "0x32",
            size: size
        };
    },

    // integer_boundedSizeArray_signedShort 
    "0x31": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const size = decodeSize(buffer, newOffset, endian, undefined);
        return {
            typeIndex: "0x31",
            size: size,
        };
    },

    // integer_boundedSizeArray_signedByte 
    "0x30": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const size = decodeSize(buffer, newOffset, endian, undefined);
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
        const size = decodeSize(buffer, newOffset, endian, undefined);
        return {
            typeIndex: "0x18",
            size: size,
        };
    },

    // boolean_boundedSizeArray 
    "0x10": (buffer: Buffer, offset: number, endian: ENDIAN) => {
        let newOffset = offset + 1;
        const size = decodeSize(buffer, newOffset, endian, undefined);
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



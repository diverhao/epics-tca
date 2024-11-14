
export enum SIZE_TYPE {
    size,
    unsigned_short,
}


// -------------------------- type guards ---------------------------
/**
 * Check if a data belongs to a type.
 * 
 * @returns {void} if the data and type match.
 * 
 * @throws when the type and data do not match.
 */
export const checkDataAndType = (data: any, type: any) => {
    const errMsg = "";

    // guards that "type" is an object
    const typeIndex = type["typeIndex"];
    const typeOfData = typeof data;

    // mandatory "typeIndex" field
    if (typeof typeIndex !== "string") {
        throw new Error(errMsg);
    }

    // optional "id" field
    if (
        typeof type["id"] !== "number" &&
        type["id"] !== undefined) {
        throw new Error(errMsg);
    }

    // optional "tag" field
    if (
        typeof type["tag"] !== "number" &&
        type["tag"] !== undefined) {
        throw new Error(errMsg);
    }

    // optional "sizeType" field
    if (
        type["sizeType"] !== SIZE_TYPE.size &&
        type["sizeType"] !== SIZE_TYPE.unsigned_short &&
        type["sizeType"] !== undefined) {
        throw new Error(errMsg);
    }

    // complex_variableSizeArray_variantUnion
    if (typeIndex === "0x8a") {
        // ! I still don't know how to encode/decode a variant union array
        return;
    }

    // complex_variableSizeArray_union
    if (typeIndex === "0x89") {
        if (
            Array.isArray(data) &&
            (
                typeof type["elementId"] === "number" ||
                typeof type["elementId"] === "undefined"
            ) &&
            (
                typeof type["elementTag"] === "number" ||
                typeof type["elementTag"] === "undefined"
            )
        ) {
            for (const element of data) {
                checkDataAndType(element, { ...type, typeIndex: "0x81", id: type["elementId"], tag: type["elementTag"], elementId: undefined, elementTag: undefined });
            }
            return;
        }
        throw new Error(errMsg);
    }

    // complex_variableSizeArray_structure
    if (typeIndex === "0x88") {
        if (
            Array.isArray(data) &&
            (
                typeof type["elementId"] === "number" ||
                typeof type["elementId"] === "undefined"
            ) &&
            (
                typeof type["elementTag"] === "number" ||
                typeof type["elementTag"] === "undefined"
            )
        ) {
            for (const element of data) {
                checkDataAndType(element, { ...type, typeIndex: "0x80", id: type["elementId"], tag: type["elementTag"], elementId: undefined, elementTag: undefined });
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
            data["index"] < Object.keys(type["fields"]).length
        ) {
            // only check the selected data and its type
            const selectedData = data["value"];
            const fieldTypes = Object.values(type["fields"]);
            const selectedType = fieldTypes[data["index"]];
            const selectedResult = checkDataAndType(selectedData, selectedType);
            if (selectedResult !== undefined) {
                throw new Error(errMsg);
            }
            return;
        }
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
        ) {
            // go over all fields
            for (let ii = 0; ii < Object.values(type["fields"]).length; ii++) {
                const fieldType = Object.values(type["fields"])[ii];
                const fieldData = Object.values(data)[ii];
                const fieldResult = checkDataAndType(fieldData, fieldType);
                if (fieldResult !== undefined) {
                    throw new Error(errMsg);
                }
            }
            return;
        }
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

    // if not catched in above "if" 
    throw new Error(errMsg);
}

/**
 * Compare 2 arrays. If all their elements are exactly the same, return true, else return false.
 * 
 * This function is only used once in checkDataAndType() for comparing field names in a struct.
 * It is not meant to compare 2 large arrays.
 * 
 */
const compareArrays = (arr1: any[], arr2: any[]) => {
    const sortedArr1 = [...arr1].sort();
    const sortedArr2 = [...arr2].sort();
    return sortedArr1.every((value, index) => value === sortedArr2[index]);
}

/**
 * Go over all or randomly selected elements in an array, check if they belong to the provided type.
 * 
 * If the array is large, this function may be time consuming. So it is limited to do at most
 * 10 elements.
 */
const arrayElementsSameType = (data: any[], elementType: "number" | "bigint" | "string" | "boolean") => {
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

    const len = data.length;
    if (len > 10) {
        for (let ii = 0; ii < 10; ii++) {
            const randomIndex = Math.round(Math.random() * (len - 1));
            const elementType = typeof data[randomIndex];
            if (elementType !== firstElementType) {
                return false;
            }
        }
    } else {
        for (let element of data) {
            if (typeof element !== firstElementType) {
                return false;
            }
        }
    }
    return true;
}

/**
 * Check if a type is legitimit.
 * 
 * @returns {void} if type is legal
 * 
 * @throws if the type is incorrect.
 */
export const checkType = (type: any) => {
    // guards that "type" is an object
    const typeIndex = type["typeIndex"];
    const errMsg = "";

    // mandatory "typeIndex"
    if (typeof typeIndex !== "string") {
        throw new Error(errMsg);
    }

    // optional "id" field
    if (
        typeof type["id"] !== "number" &&
        type["id"] !== undefined) {
        throw new Error(errMsg);
    }

    // optional "tag" field
    if (
        typeof type["tag"] !== "number" &&
        type["tag"] !== undefined) {
        throw new Error(errMsg);
    }

    // optional "sizeType" field
    if (
        type["sizeType"] !== SIZE_TYPE.size &&
        type["sizeType"] !== SIZE_TYPE.unsigned_short &&
        type["sizeType"] !== undefined) {
        throw new Error(errMsg);
    }

    // for each specific type:

    // complex_variableSizeArray_variantUnion
    if (typeIndex === "0x8a") {
        // ! I still don't know how to encode/decode a variant union array
        return;
    }

    // complex_variableSizeArray_union
    if (typeIndex === "0x89") {
        if (
            typeof type["name"] === "string" &&
            typeof type["fields"] === "object" &&
            (
                typeof type["elementId"] === "number" ||
                typeof type["elementId"] === "undefined"
            ) &&
            (
                typeof type["elementTag"] === "number" ||
                typeof type["elementTag"] === "undefined"
            )
        ) { return; }
        throw new Error(errMsg);
    }

    // complex_variableSizeArray_structure
    if (typeIndex === "0x88") {
        if (
            typeof type["name"] === "string" &&
            typeof type["fields"] === "object" &&
            (
                typeof type["elementId"] === "number" ||
                typeof type["elementId"] === "undefined"
            ) &&
            (
                typeof type["elementTag"] === "number" ||
                typeof type["elementTag"] === "undefined"
            )
        ) { return; }
        throw new Error(errMsg);
    }

    // complex_scalar_variantUnion
    if (typeIndex === "0x82") {
        return;
    }

    // complex_scalar_union
    if (typeIndex === "0x81") {
        if (
            typeof type["name"] === "string" &&
            typeof type["fields"] === "object"
        ) {
            // check all fields
            for (let fieldType of Object.values(type["fields"])) {
                const fieldResult = checkType(fieldType);
                if (fieldResult !== undefined) {
                    throw new Error(errMsg);
                }
            }
            return;
        }
        throw new Error(errMsg);
    }

    // complex_scalar_structure
    if (typeIndex === "0x80") {
        if (
            typeof type["name"] === "string" &&
            typeof type["fields"] === "object"
        ) {
            // check all fields
            for (let fieldType of Object.values(type["fields"])) {
                const fieldResult = checkType(fieldType);
                if (fieldResult !== undefined) {
                    throw new Error(errMsg);
                }
            }
            return;
        }
        throw new Error(errMsg);
    }


    // string_variableSizeArray
    // string_scalar
    // floatingPoint_variableSizeArray_binary64
    // floatingPoint_variableSizeArray_binary32
    // floatingPoint_scalar_binary64
    // floatingPoint_scalar_binary32
    // integer_variableSizeArray_unsignedLong
    // integer_variableSizeArray_unsignedInt
    // integer_variableSizeArray_unsignedShort
    // integer_variableSizeArray_unsignedByte
    // integer_variableSizeArray_signedLong
    // integer_variableSizeArray_signedInt
    // integer_variableSizeArray_signedShort
    // integer_variableSizeArray_signedByte
    // integer_scalar_unsignedLong
    // integer_scalar_unsignedInt
    // integer_scalar_unsignedShort
    // integer_scalar_unsignedByte
    // integer_scalar_signedLong
    // integer_scalar_signedInt
    // integer_scalar_signedShort
    // integer_scalar_signedByte
    // boolean_variableSizeArray
    // boolean_scalar
    if (
        typeIndex === "0x68" ||
        typeIndex === "0x60" ||
        typeIndex === "0x4b" ||
        typeIndex === "0x4a" ||
        typeIndex === "0x43" ||
        typeIndex === "0x42" ||
        typeIndex === "0x2f" ||
        typeIndex === "0x2e" ||
        typeIndex === "0x2d" ||
        typeIndex === "0x2c" ||
        typeIndex === "0x2b" ||
        typeIndex === "0x2a" ||
        typeIndex === "0x29" ||
        typeIndex === "0x28" ||
        typeIndex === "0x27" ||
        typeIndex === "0x26" ||
        typeIndex === "0x25" ||
        typeIndex === "0x24" ||
        typeIndex === "0x23" ||
        typeIndex === "0x22" ||
        typeIndex === "0x21" ||
        typeIndex === "0x20" ||
        typeIndex === "0x8" ||
        typeIndex === "0x0"
    ) {
        return;
    }

    // complex_scalar_boundedString
    // string_fixedSizeArray
    // string_boundedSizeArray
    // floatingPoint_fixedSizeArray_binary64
    // floatingPoint_fixedSizeArray_binary32
    // floatingPoint_boundedSizeArray_binary64
    // floatingPoint_boundedSizeArray_binary32
    // integer_fixedSizeArray_unsignedLong
    // integer_fixedSizeArray_unsignedInt
    // integer_fixedSizeArray_unsignedShort
    // integer_fixedSizeArray_unsignedByte
    // integer_fixedSizeArray_signedLong
    // integer_fixedSizeArray_signedInt
    // integer_fixedSizeArray_signedShort
    // integer_fixedSizeArray_signedByte
    // integer_boundedSizeArray_unsignedLong
    // integer_boundedSizeArray_unsignedInt
    // integer_boundedSizeArray_unsignedShort
    // integer_boundedSizeArray_unsignedByte
    // integer_boundedSizeArray_signedLong
    // integer_boundedSizeArray_signedInt
    // integer_boundedSizeArray_signedShort
    // integer_boundedSizeArray_signedByte
    // boolean_fixedSizeArray
    // boolean_boundedSizeArray
    if (
        typeIndex === "0x83" ||
        typeIndex === "0x78" ||
        typeIndex === "0x70" ||
        typeIndex === "0x5b" ||
        typeIndex === "0x5a" ||
        typeIndex === "0x53" ||
        typeIndex === "0x52" ||
        typeIndex === "0x3f" ||
        typeIndex === "0x3e" ||
        typeIndex === "0x3d" ||
        typeIndex === "0x3c" ||
        typeIndex === "0x3b" ||
        typeIndex === "0x3a" ||
        typeIndex === "0x39" ||
        typeIndex === "0x38" ||
        typeIndex === "0x37" ||
        typeIndex === "0x36" ||
        typeIndex === "0x35" ||
        typeIndex === "0x34" ||
        typeIndex === "0x33" ||
        typeIndex === "0x32" ||
        typeIndex === "0x31" ||
        typeIndex === "0x30" ||
        typeIndex === "0x18" ||
        typeIndex === "0x10"
    ) {
        if (typeof type["size"] === "number" ||
            typeof type["size"] === "bigint"
        ) {
            return;
        }
        throw new Error(errMsg);
    }

    // if not catched in above "if" 
    throw new Error(errMsg);
}


// ------------------------- type index -----------------------------

export type type_typeIndex = `${typeIndexEnum}`;

// manually produced by PvData_typeEncoding.obtain_PvaData_TYPES()
export enum typeIndexEnum {
    // complex_fixedSizeArray_boundedString = "0x9b",
    // complex_fixedSizeArray_variantUnion = "0x9a",
    // complex_fixedSizeArray_union = "0x99",
    // complex_fixedSizeArray_structure = "0x98",
    // complex_boundedSizeArray_boundedString = "0x93",
    // complex_boundedSizeArray_variantUnion = "0x92",
    // complex_boundedSizeArray_union = "0x91",
    // complex_boundedSizeArray_structure = "0x90",
    // complex_variableSizeArray_boundedString = "0x8b",
    complex_variableSizeArray_variantUnion = "0x8a",
    complex_variableSizeArray_union = "0x89",
    complex_variableSizeArray_structure = "0x88",
    complex_scalar_boundedString = "0x83",
    complex_scalar_variantUnion = "0x82",
    complex_scalar_union = "0x81",
    complex_scalar_structure = "0x80",
    string_fixedSizeArray = "0x78",
    string_boundedSizeArray = "0x70",
    string_variableSizeArray = "0x68",
    string_scalar = "0x60",
    // floatingPoint_fixedSizeArray_binary128 = "0x5c",
    floatingPoint_fixedSizeArray_binary64 = "0x5b",
    floatingPoint_fixedSizeArray_binary32 = "0x5a",
    // floatingPoint_boundedSizeArray_binary128 = "0x54",
    floatingPoint_boundedSizeArray_binary64 = "0x53",
    floatingPoint_boundedSizeArray_binary32 = "0x52",
    // floatingPoint_variableSizeArray_binary128 = "0x4c",
    floatingPoint_variableSizeArray_binary64 = "0x4b",
    floatingPoint_variableSizeArray_binary32 = "0x4a",
    // floatingPoint_scalar_binary128 = "0x44",
    floatingPoint_scalar_binary64 = "0x43",
    floatingPoint_scalar_binary32 = "0x42",
    integer_fixedSizeArray_unsignedLong = "0x3f",
    integer_fixedSizeArray_unsignedInt = "0x3e",
    integer_fixedSizeArray_unsignedShort = "0x3d",
    integer_fixedSizeArray_unsignedByte = "0x3c",
    integer_fixedSizeArray_signedLong = "0x3b",
    integer_fixedSizeArray_signedInt = "0x3a",
    integer_fixedSizeArray_signedShort = "0x39",
    integer_fixedSizeArray_signedByte = "0x38",
    integer_boundedSizeArray_unsignedLong = "0x37",
    integer_boundedSizeArray_unsignedInt = "0x36",
    integer_boundedSizeArray_unsignedShort = "0x35",
    integer_boundedSizeArray_unsignedByte = "0x34",
    integer_boundedSizeArray_signedLong = "0x33",
    integer_boundedSizeArray_signedInt = "0x32",
    integer_boundedSizeArray_signedShort = "0x31",
    integer_boundedSizeArray_signedByte = "0x30",
    integer_variableSizeArray_unsignedLong = "0x2f",
    integer_variableSizeArray_unsignedInt = "0x2e",
    integer_variableSizeArray_unsignedShort = "0x2d",
    integer_variableSizeArray_unsignedByte = "0x2c",
    integer_variableSizeArray_signedLong = "0x2b",
    integer_variableSizeArray_signedInt = "0x2a",
    integer_variableSizeArray_signedShort = "0x29",
    integer_variableSizeArray_signedByte = "0x28",
    integer_scalar_unsignedLong = "0x27",
    integer_scalar_unsignedInt = "0x26",
    integer_scalar_unsignedShort = "0x25",
    integer_scalar_unsignedByte = "0x24",
    integer_scalar_signedLong = "0x23",
    integer_scalar_signedInt = "0x22",
    integer_scalar_signedShort = "0x21",
    integer_scalar_signedByte = "0x20",
    boolean_fixedSizeArray = "0x18",
    boolean_boundedSizeArray = "0x10",
    boolean_variableSizeArray = "0x8",
    boolean_scalar = "0x0",
}


enum Bit7to5_TYPES {
    complex = 0b100,
    string = 0b011,
    floatingPoint = 0b010,
    integer = 0b001,
    boolean = 0b000,
}

enum Bit4to3_TYPES {
    fixedSizeArray = 0b11,
    boundedSizeArray = 0b10,
    variableSizeArray = 0b01,
    scalar = 0b00,
}

enum Bit2to0_integer_TYPES {
    unsignedLong = 0b111,
    unsignedInt = 0b110,
    unsignedShort = 0b101,
    unsignedByte = 0b100,
    signedLong = 0b011,
    signedInt = 0b010,
    signedShort = 0b001,
    signedByte = 0b000,
}

enum Bit2to0_floatingPoint_TYPES {
    binary128 = 0b100,
    binary64 = 0b011,
    binary32 = 0b010,
}

enum Bit2to0_complex_TYPES {
    boundedString = 0b011,
    variantUnion = 0b010,
    union = 0b001,
    structure = 0b000,
}



// it is sololy used for generating the above "typeIndexEnum"
const convertValueToString = (encodingValue: number): string | undefined => {
    // const encodingValue = 0x80;

    let bit7to5String = undefined;
    let bit7to5Value = -1;
    let bit4to3String = undefined;
    let bit4to3Value = -1;
    let bit2to0String = undefined;
    let bit2to0Value = -1;

    bit7to5Value = (encodingValue & 0b11100000) >> 5;
    bit7to5String = Bit7to5_TYPES[bit7to5Value];

    bit4to3Value = (encodingValue & 0b00011000) >> 3;
    bit4to3String = Bit4to3_TYPES[bit4to3Value];

    bit2to0Value = (encodingValue & 0b00000111) >> 0;
    if (bit7to5Value === Bit7to5_TYPES.complex) {
        bit2to0String = Bit2to0_complex_TYPES[bit2to0Value];
    } else if (bit7to5Value === Bit7to5_TYPES.floatingPoint) {
        bit2to0String = Bit2to0_floatingPoint_TYPES[bit2to0Value];
    } else if (bit7to5Value === Bit7to5_TYPES.integer) {
        bit2to0String = Bit2to0_integer_TYPES[bit2to0Value];
    } else if (bit7to5Value === Bit7to5_TYPES.boolean || bit7to5Value === Bit7to5_TYPES.string) {
        if (bit2to0Value !== 0b000) {
            bit2to0String = undefined;
        } else {
            bit2to0String = "null";
        }
    }

    if (bit7to5String === undefined || bit4to3String === undefined || bit2to0String === undefined) {
        return undefined;
    }

    return bit7to5String + "_" + bit4to3String + (bit2to0String === "null" ? "" : "_" + bit2to0String);
};

const obtain_PvaData_TYPES = () => {
    console.log("export enum PvaData_TYPES {");
    for (let ii = 255; ii >= 0; ii--) {
        const str = convertValueToString(ii);
        if (str !== undefined) {
            console.log("   ", str, "=", `"0x${ii.toString(16)}",`);
        }
    }
    console.log("}");
};

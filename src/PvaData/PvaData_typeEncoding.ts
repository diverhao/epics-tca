// ------------------------ type of data ----------------------------

/**
 * This type is used for 
 *  - scalar primitive data (12 types)
 *  - bounded string (1 type)
 */
type type_primitive_data = string | number | boolean | bigint;

/**
 * This type is used for
 *  - variable-size array of primitive data (12 types)
 *  - bounded-size array of primitive data (12 types)
 *  - fixed-size array of primitive data (12 types)
 *  - variable-size array of struct data (1 type)
 *  - variable-size array of union data (1 type)
 *  - variable-size array of variant union data (1 type)
 */
type type_array_data = boolean[] | string[] | number[] | bigint[] | type_struct_data[] | type_union_data[] | type_variant_union_data[];

/**
 * This type is used for
 *  - struct data (1 type)
 */
export interface type_struct_data {
    [key: string]: type_data,
}
// export type type_struct_data = Record<string, type_data>

/**
 * This type is used for
 *  - union data (1 type)
 */
export interface type_union_data {
    index: number,
    value: type_data,
}

/**
 * This type is used for
 *  - variant union data (1 type)
 */
export interface type_variant_union_data {
    type: type_type,
    value: type_data,
}

export type type_data = type_primitive_data | type_array_data | type_struct_data | type_union_data | type_variant_union_data;

// export const check_data_type = (data: any, type: type_type): boolean => {
//     const typeIndex = type["typeIndex"];

//     if (typeof data === "number" &&
//         (
//             typeIndex === "0x43" ||
//             typeIndex === "0x42" ||
//             typeIndex === "0x27" ||
//             typeIndex === "0x26" ||
//             typeIndex === "0x25" ||
//             typeIndex === "0x24" ||
//             typeIndex === "0x23" ||
//             typeIndex === "0x22" ||
//             typeIndex === "0x21" ||
//             typeIndex === "0x20"
//         )
//     ) {
//         return true;
//     } else if (typeof data === "bigint" &&
//         (
//             typeIndex === "0x27" ||
//             typeIndex === "0x23"
//         )
//     ) {
//         return true;
//     } else if (typeof data === "boolean" &&
//         typeIndex === "0x0"
//     ) {
//         return true;
//     } else if (typeof data === "string" &&
//         (
//             typeIndex === "0x83" ||
//             typeIndex === "0x60"
//         )
//     ) {
//         return true;
//     } else if (Array.isArray(data)) {
//         if (data.length === 0) {
//             return true;
//         } else {
//             let typeElement0 = typeof data[0];

//             // iterate over all elements, make sure they have the same type
//             for (const element of data) {
//                 if (typeof element !== typeElement0) {
//                     return false;
//                 }
//             }

//             if (typeElement0 === "number" &&
//                 (
//                     typeIndex === "0x5b" ||
//                     typeIndex === "0x5a" ||
//                     typeIndex === "0x53" ||
//                     typeIndex === "0x52" ||
//                     typeIndex === "0x4b" ||
//                     typeIndex === "0x4a" ||
//                     typeIndex === "0x3f" ||
//                     typeIndex === "0x3e" ||
//                     typeIndex === "0x3d" ||
//                     typeIndex === "0x3c" ||
//                     typeIndex === "0x3b" ||
//                     typeIndex === "0x3a" ||
//                     typeIndex === "0x39" ||
//                     typeIndex === "0x38" ||
//                     typeIndex === "0x37" ||
//                     typeIndex === "0x36" ||
//                     typeIndex === "0x35" ||
//                     typeIndex === "0x34" ||
//                     typeIndex === "0x33" ||
//                     typeIndex === "0x32" ||
//                     typeIndex === "0x31" ||
//                     typeIndex === "0x30" ||
//                     typeIndex === "0x2f" ||
//                     typeIndex === "0x2e" ||
//                     typeIndex === "0x2d" ||
//                     typeIndex === "0x2c" ||
//                     typeIndex === "0x2b" ||
//                     typeIndex === "0x2a" ||
//                     typeIndex === "0x29" ||
//                     typeIndex === "0x28"
//                 )
//             ) {
//                 return true;
//             } else if (typeElement0 === "bigint" &&
//                 (
//                     typeIndex === "0x3f" ||
//                     typeIndex === "0x3b" ||
//                     typeIndex === "0x37" ||
//                     typeIndex === "0x33" ||
//                     typeIndex === "0x2f" ||
//                     typeIndex === "0x2b"
//                 )
//             ) {
//                 return true;
//             } else if (
//                 typeElement0 === "string" &&
//                 (
//                     typeIndex === "0x78" ||
//                     typeIndex === "0x70" ||
//                     typeIndex === "0x68"
//                 )
//             ) {
//                 return true;
//             } else if (
//                 typeElement0 === "boolean" &&
//                 (
//                     typeIndex === "0x18" ||
//                     typeIndex === "0x10" ||
//                     typeIndex === "0x8"
//                 )
//             ) {
//                 return true;
//             } else if (typeElement0 === "object") {
//                 if (typeIndex === "0x88") {
//                     for (let dataElement of data) {
//                         if (check_compound_data_type(dataElement, { ...type, typeIndex: "0x80" } as type_union_struct_type) === false) {
//                             return false;
//                         }
//                     }
//                     return true;
//                 } else if (typeIndex === "0x89") {
//                     for (let dataElement of data) {
//                         if (check_compound_data_type(dataElement, { ...type, typeIndex: "0x81" } as type_union_struct_type) === false) {
//                             return false;
//                         }
//                     }
//                     return true;
//                 } else if (typeIndex === "0x8a") {
//                     for (let dataElement of data) {
//                         if (check_compound_data_type(dataElement, { ...type, typeIndex: "0x82" } as type_union_struct_type) === false) {
//                             return false;
//                         }
//                     }
//                     return true;
//                 } else {
//                     return false;
//                 }
//             } else {
//                 return false;
//             }
//         }
//     } else if (typeof data === "object" &&
//         (
//             typeIndex === "0x82" ||
//             typeIndex === "0x81" ||
//             typeIndex === "0x80"
//         )
//     ) {
//         return check_compound_data_type(data, type as type_union_struct_type);
//     } else {
//         return false;
//     }
// }

// export const check_compound_data_type = (data: any, type: type_union_struct_type) => {
//     const typeIndex = type["typeIndex"];
//     if (typeIndex !== "0x80" && typeIndex !== "0x81" && typeIndex !== "0x82") {
//         return false;
//     } else if (type["fields"] === undefined) {
//         return false
//     } else if (typeof data !== "object") {
//         return false;
//     } else {
//         const dataFieldNames = Object.keys(data);
//         const dataFields = Object.values(data);
//         const typeFieldNames = Object.keys(type["fields"]);
//         const typeFields = Object.values(type["fields"]);

//         if (dataFieldNames.length !== typeFieldNames.length) {
//             return false;
//         } else {
//             for (let ii = 0; ii < dataFieldNames.length; ii++) {
//                 const dataFieldName = dataFieldNames[ii];
//                 if (!typeFieldNames.includes(dataFieldName)) {
//                     return false;
//                 } else {
//                     const dataField = dataFields[ii];
//                     const jj = typeFieldNames.indexOf(dataFieldName);
//                     const typeField = typeFields[jj];
//                     if (check_data_type(dataField, typeField) === false) {
//                         return false
//                     }
//                 }
//             }
//             return true;
//         }
//     }
// }

// ------------------------ type of type ----------------------------

/**
 * This type is for 
 *  - scalar primitive data type (12 types)
 *  - variable-size array of primitive data type (12 types)
 *  - variant union data type (1 type)
 *  - variable-size array of variant union data type (1 type)
 */
export type type_primitive_type = {
    typeIndex: type_typeIndex,
    id?: number,
    tag?: number
};

/**
 * This type is for
 *  - bounded-size array of primitive data type (12 types)
 *  - fixed-size array of primitive data type (12 types)
 *  - bounded string data type (1 type)
 */
export type type_sized_array_type = {
    typeIndex: type_typeIndex,
    size: number,
    id?: number,
    tag?: number
}

/**
 * This type is for
 *  - union data type (1 type)
 *  - struct data type (1 type)
 */
export type type_union_struct_type = {
    typeIndex: type_typeIndex,
    name: string,
    id?: number,
    tag?: number,
    fields: Record<string, type_type>
}

/**
 * This type is for 
 *  - variable-size array of union data type (1 type)
 *  - variable-size array of struct data type (1 type)
 */
export type type_variable_size_union_struct_array_type = {
    typeIndex: type_typeIndex,
    name: string,
    id?: number,
    tag?: number,
    elementId?: number,
    elementTag?: number,
    fields: Record<string, type_type>
}

export type type_type = type_primitive_type | type_sized_array_type | type_union_struct_type | type_variable_size_union_struct_array_type;


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



// it is sololy used for defining "enum PvaData_TYPES"
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


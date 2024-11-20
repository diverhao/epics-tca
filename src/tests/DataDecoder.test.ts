
import { decodeBitSets, decodeData, decodeStatus } from "../PvaData/DataDecoder"
import { typeIndexEnum } from "../PvaData/PvaData_typeEncoding"
import { createSizeBuffer, ENDIAN } from "../PvaData/PvaMethods"
import { encodeType } from "../PvaData/TypeEncoder"

describe("DataDecoder for PVA", () => {


    describe("decode a BitSets buffer", () => {
        it("bitset, empty", () => {
            const bitSetBuffer = Buffer.from([0x00]);
            const bitSet = decodeBitSets(bitSetBuffer, 0, ENDIAN.BIG);
            expect(bitSet).toEqual([]);
        })
        it("bitset, 1 element", () => {
            const bitSetBuffer = Buffer.from([0x01, 0x01]);
            const bitSet = decodeBitSets(bitSetBuffer, 0, ENDIAN.BIG);
            expect(bitSet).toEqual([0]);
        })
        it("bitset, 1 elements", () => {
            const bitSetBuffer = Buffer.from([0x01, 0x02]);
            const bitSet = decodeBitSets(bitSetBuffer, 0, ENDIAN.BIG);
            expect(bitSet).toEqual([1]);
        })
        it("bitset, 1 elements", () => {
            const bitSetBuffer = Buffer.from([0x01, 0x80]);
            const bitSet = decodeBitSets(bitSetBuffer, 0, ENDIAN.BIG);
            expect(bitSet).toEqual([7]);
        })
        it("bitset, 1 elements", () => {
            const bitSetBuffer = Buffer.from([0x02, 0x00, 0x01]);
            const bitSet = decodeBitSets(bitSetBuffer, 0, ENDIAN.BIG);
            expect(bitSet).toEqual([8]);
        })
        it("bitset, 1 elements", () => {
            const bitSetBuffer = Buffer.from([0x02, 0x00, 0x80]);
            const bitSet = decodeBitSets(bitSetBuffer, 0, ENDIAN.BIG);
            expect(bitSet).toEqual([15]);
        })
        it("bitset, 1 elements", () => {
            const bitSetBuffer = Buffer.from([0x07, 0, 0, 0, 0, 0, 0, 0x80]);
            const bitSet = decodeBitSets(bitSetBuffer, 0, ENDIAN.BIG);
            expect(bitSet).toEqual([55]);
        })
        it("bitset, 1 elements", () => {
            const bitSetBuffer = Buffer.from([8, 0, 0, 0, 0, 0, 0, 0, 1]);
            const bitSet = decodeBitSets(bitSetBuffer, 0, ENDIAN.BIG);
            expect(bitSet).toEqual([56]);
        })
        it("bitset, 1 elements", () => {
            const bitSetBuffer = Buffer.from([8, 0, 0, 0, 0, 0, 0, 0, 0x80]);
            const bitSet = decodeBitSets(bitSetBuffer, 0, ENDIAN.BIG);
            expect(bitSet).toEqual([63]);
        })
        it("bitset, 1 elements", () => {
            const bitSetBuffer = Buffer.from([9, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
            const bitSet = decodeBitSets(bitSetBuffer, 0, ENDIAN.BIG);
            expect(bitSet).toEqual([64]);
        })
        it("bitset, 1 elements", () => {
            const bitSetBuffer = Buffer.from([1, 0x17]);
            const bitSet = decodeBitSets(bitSetBuffer, 0, ENDIAN.BIG);
            expect(bitSet).toEqual([0, 1, 2, 4]);
        })
        it("bitset, 1 elements", () => {
            const bitSetBuffer = Buffer.from([2, 0x17, 1]);
            const bitSet = decodeBitSets(bitSetBuffer, 0, ENDIAN.BIG);
            expect(bitSet).toEqual([0, 1, 2, 4, 8]);
        })
        it("bitset, 1 elements", () => {
            const bitSetBuffer = Buffer.from([7, 0, 1, 2, 3, 4, 5, 6]);
            const bitSet = decodeBitSets(bitSetBuffer, 0, ENDIAN.BIG);
            expect(bitSet).toEqual([8, 17, 24, 25, 34, 40, 42, 49, 50]);
        })
        it("bitset, 1 elements", () => {
            const bitSetBuffer = Buffer.from([8, 0, 1, 2, 3, 4, 5, 6, 7]);
            const bitSet = decodeBitSets(bitSetBuffer, 0, ENDIAN.BIG);
            expect(bitSet).toEqual([8, 17, 24, 25, 34, 40, 42, 49, 50, 56, 57, 58]);
        })
        it("bitset, 1 elements", () => {
            const bitSetBuffer = Buffer.from([0x0b, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0x0a]);
            const bitSet = decodeBitSets(bitSetBuffer, 0, ENDIAN.BIG);
            expect(bitSet).toEqual([8, 17, 24, 25, 34, 40, 42, 49, 50, 56, 57, 58, 67, 72, 75, 81, 83]);
        })
    })


    describe("decode status", () => {
        it("normal case -- full description", () => {
            const bufferArray = [
                0x00, // OK
                0x0b, 84, 104, 105, 115, 32, 105, 115, 32, 84, 67, 65, // "This is TCA", message,
                0x0b, 84, 104, 97, 116, 32, 105, 115, 32, 84, 67, 65, // "That is TCA", calltree
            ];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const data = decodeStatus(buffer, 0, endian);
            expect(data).toEqual({
                type: 0x00,
                message: "This is TCA",
                callTree: "That is TCA",
            })
        })

        it("normal case -- partial description", () => {
            const bufferArray = [
                0xff, // OK
                // 0x0b, 84, 104, 105, 115, 32, 105, 115, 32, 84, 67, 65, // "This is TCA", message,
                // 0x0b, 84, 104, 97, 116, 32, 105, 115, 32, 84, 67, 65, // "That is TCA", calltree
            ];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const data = decodeStatus(buffer, 0, endian);
            expect(data).toEqual({
                type: 0xff,
                // message: "This is TCA",
                // callTree: "That is TCA",
            })
        })

        it("failed case -- partial description, type is not 0xff", () => {
            const bufferArray = [
                0x00, // OK
                // 0x0b, 84, 104, 105, 115, 32, 105, 115, 32, 84, 67, 65, // "This is TCA", message,
                // 0x0b, 84, 104, 97, 116, 32, 105, 115, 32, 84, 67, 65, // "That is TCA", calltree
            ];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            expect(() => { decodeStatus(buffer, 0, endian) }).toThrow();
        })

        it("failed case -- string encoded incorrectly", () => {
            const bufferArray = [
                0x00, // OK
                0x0b, 84, 104, 105, 115, 32, 105, 115, 32, 84, 67, 65, // "This is TCA", message,
                0x0b, 84, 104, 97, 116, 32, 105, 115, 32, 84, 67, // "That is TCA", calltree, size not match
            ];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            expect(() => { decodeStatus(buffer, 0, endian) }).toThrow();
        })


        it("failed case -- type wrong", () => {
            const bufferArray = [
                0x05, // no such type
                0x0b, 84, 104, 105, 115, 32, 105, 115, 32, 84, 67, 65, // "This is TCA", message,
                0x0b, 84, 104, 97, 116, 32, 105, 115, 32, 84, 67, // "That is TCA", calltree, size not match
            ];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            expect(() => { decodeStatus(buffer, 0, endian) }).toThrow();
        })


    })

    describe("not implemented -- complex_variableSizeArray_variantUnion, 0x8a", () => {

    })

    describe("complex_variableSizeArray_union, 0x89", () => {

        it("ok, PVA protocol spec (2015 version) page 10, converted to union", () => {
            const endian = ENDIAN.BIG;

            const type = {
                typeIndex: "0x89",
                name: "abcd", // encoding data does not use this piece of information
                id: 7, // encoding data does not use this piece of information
                tag: 3, // encoding data does not use this piece of information
                fields: { // each field is an option
                    value: { typeIndex: "0x28" }, // integer_variableSizeArray_signedByte = 0x28,
                    boundedSizeArray: { typeIndex: "0x30", size: 16 }, // integer_boundedSizeArray_signedByte = 0x30,
                    fixedSizeArray: { typeIndex: "0x38", size: 4 }, // integer_fixedSizeArray_signedByte = 0x38,
                    timeStamp: {
                        typeIndex: "0x80",
                        name: "timeStamp_t", // encoding data does not use this piece of information
                        id: 8, // encoding data does not use this piece of information
                        tag: 4, // encoding data does not use this piece of information
                        fields: {
                            secondsPastEpoch: { typeIndex: "0x23" }, // integer_scalar_signedLong = 0x23,
                            nanoSeconds: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            userTag: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                        }
                    },
                    alarm: {
                        typeIndex: "0x80",
                        name: "alarm_t",  // encoding data does not use this piece of information
                        id: 6, // encoding data does not use this piece of information
                        tag: 5, // encoding data does not use this piece of information
                        fields: {
                            severity: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            status: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            message: { typeIndex: "0x60" }, // string_scalar = 0x60,
                        }
                    },
                    valueUnion: {
                        typeIndex: "0x81",
                        name: "union_ok",
                        id: 7,
                        tag: 6,
                        // encoding data does need to know all fields or the field's name
                        fields: {
                            fieldMember1: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            fieldMember2: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            fieldMember3: { typeIndex: "0x23" }, // integer_scalar_signedLong = 0x23,
                            fieldMember4: { typeIndex: "0x28" }, // integer_variableSizeArray_signedByte = 0x28,
                        }
                    },
                    // ! todo: variant union
                    // variantUnion: {
                    //     typeIndex: "0x82", // variant union's data type is defined in the data buffer, not in the type buffer
                    // }
                }
            };
            const data0 =
            {
                index: 0,
                value: [1, 2, 3],
            }
            const data1 =
            {
                index: 1,
                value: [4, 5, 6, 7, 8],
            }
            const data2 =
            {
                index: 2,
                value: [9, 10, 11, 12],
            }
            const data3 =
            {
                index: 3,
                value: {
                    secondsPastEpoch: 1234605616436508552n, // big int, Javascript integer can only reach 2^53 - 1
                    nanoSeconds: 0xAABBCCDD | 0, // 0x can only represents unsigned integer, |0 operation convert it to signed integer
                    userTag: 0xEEEEEEEE | 0,
                },
            }
            const data4 = {
                index: 4,
                value: { severity: 0x11111111, status: 0x22222222, message: 'Allo, Allo!' }
            };
            const data5 = {
                index: 5,
                value: { index: 1, value: 0x33333333 },
            }

            const data = [data0, data1, data2, data3, data4, data5,];

            const bufferArray = [
                0x06, // <-- array size
                0x00,
                0x03, 0x01, 0x02, 0x03, // value
                0x01,
                0x05, 0x04, 0x05, 0x06, 0x07, 0x08, // boundedSizeArray
                0x02,
                0x09, 0x0A, 0x0B, 0x0C, // fixedSizeArray
                0x03,
                0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, // timeStamp.secondsSinceEpoch
                0xAA, 0xBB, 0xCC, 0xDD, // timeStamp.nanoSeconds
                0xEE, 0xEE, 0xEE, 0xEE, // timeStamp.userTag
                0x04,
                0x11, 0x11, 0x11, 0x11, // alarm.severity
                0x22, 0x22, 0x22, 0x22, // alarm.status
                0x0B, 0x41, 0x6C, 0x6C, 0x6F, 0x2C, 0x20, 0x41, 0x6C, 0x6C, 0x6F, 0x21, // alarm.message
                0x05,
                0x01, 0x33, 0x33, 0x33, 0x33, // valueUnion
                // 0x60, // variant union type -- a variable size string
                // 0x1C, 0x53, 0x74, 0x72, 0x69, 0x6E, 0x67, 0x20, 0x69, 0x6E, 0x73, 0x69, 0x64, 0x65, 0x20, 0x76, 0x61, 0x72, 0x69, 0x61, 0x6E, 0x74, 0x20, 0x75, 0x6E, 0x69, 0x6F, 0x6E, 0x2E,
            ];
            const buffer = Buffer.from(bufferArray);

            const result = decodeData(type, buffer, 0, endian);
            // this buffer is copied from PVA protocol
            expect(result).toEqual(data);
        })


        it("same as above, little endian", () => {
            const endian = ENDIAN.LITTLE;

            const type = {
                typeIndex: "0x89",
                name: "abcd", // encoding data does not use this piece of information
                id: 7, // encoding data does not use this piece of information
                tag: 3, // encoding data does not use this piece of information
                fields: { // each field is an option
                    value: { typeIndex: "0x28" }, // integer_variableSizeArray_signedByte = 0x28,
                    boundedSizeArray: { typeIndex: "0x30", size: 16 }, // integer_boundedSizeArray_signedByte = 0x30,
                    fixedSizeArray: { typeIndex: "0x38", size: 4 }, // integer_fixedSizeArray_signedByte = 0x38,
                    timeStamp: {
                        typeIndex: "0x80",
                        name: "timeStamp_t", // encoding data does not use this piece of information
                        id: 8, // encoding data does not use this piece of information
                        tag: 4, // encoding data does not use this piece of information
                        fields: {
                            secondsPastEpoch: { typeIndex: "0x23" }, // integer_scalar_signedLong = 0x23,
                            nanoSeconds: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            userTag: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                        }
                    },
                    alarm: {
                        typeIndex: "0x80",
                        name: "alarm_t",  // encoding data does not use this piece of information
                        id: 6, // encoding data does not use this piece of information
                        tag: 5, // encoding data does not use this piece of information
                        fields: {
                            severity: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            status: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            message: { typeIndex: "0x60" }, // string_scalar = 0x60,
                        }
                    },
                    valueUnion: {
                        typeIndex: "0x81",
                        name: "union_ok",
                        id: 7,
                        tag: 6,
                        // encoding data does need to know all fields or the field's name
                        fields: {
                            fieldMember1: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            fieldMember2: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            fieldMember3: { typeIndex: "0x23" }, // integer_scalar_signedLong = 0x23,
                            fieldMember4: { typeIndex: "0x28" }, // integer_variableSizeArray_signedByte = 0x28,
                        }
                    },
                    // ! todo: variant union
                    // variantUnion: {
                    //     typeIndex: "0x82", // variant union's data type is defined in the data buffer, not in the type buffer
                    // }
                }
            };
            const data0 =
            {
                index: 0,
                value: [1, 2, 3],
            }
            const data1 =
            {
                index: 1,
                value: [4, 5, 6, 7, 8],
            }
            const data2 =
            {
                index: 2,
                value: [9, 10, 11, 12],
            }
            const data3 =
            {
                index: 3,
                value: {
                    secondsPastEpoch: 1234605616436508552n, // big int, Javascript integer can only reach 2^53 - 1
                    nanoSeconds: 0xAABBCCDD | 0, // 0x can only represents unsigned integer, |0 operation convert it to signed integer
                    userTag: 0xEEEEEEEE | 0,
                },
            }
            const data4 = {
                index: 4,
                value: { severity: 0x11111111, status: 0x22222222, message: 'Allo, Allo!' }
            };
            const data5 = {
                index: 5,
                value: { index: 1, value: 0x33333333 },
            }
            const data = [data0, data1, data2, data3, data4, data5,];

            const bufferArray = [
                0x06,
                0x00,
                0x03, 0x01, 0x02, 0x03, // value
                0x01,
                0x05, 0x04, 0x05, 0x06, 0x07, 0x08, // boundedSizeArray
                0x02,
                0x09, 0x0A, 0x0B, 0x0C, // fixedSizeArray
                0x03,
                0x88, 0x77, 0x66, 0x55, 0x44, 0x33, 0x22, 0x11, // timeStamp.secondsSinceEpoch
                0xdd, 0xcc, 0xbb, 0xaa, // timeStamp.nanoSeconds
                0xEE, 0xEE, 0xEE, 0xEE, // timeStamp.userTag
                0x04,
                0x11, 0x11, 0x11, 0x11, // alarm.severity
                0x22, 0x22, 0x22, 0x22, // alarm.status
                0x0B, 0x41, 0x6C, 0x6C, 0x6F, 0x2C, 0x20, 0x41, 0x6C, 0x6C, 0x6F, 0x21, // alarm.message
                0x05,
                0x01, 0x33, 0x33, 0x33, 0x33, // valueUnion
                // 0x60, // variant union type -- a variable size string
                // 0x1C, 0x53, 0x74, 0x72, 0x69, 0x6E, 0x67, 0x20, 0x69, 0x6E, 0x73, 0x69, 0x64, 0x65, 0x20, 0x76, 0x61, 0x72, 0x69, 0x61, 0x6E, 0x74, 0x20, 0x75, 0x6E, 0x69, 0x6F, 0x6E, 0x2E,
            ];
            const buffer = Buffer.from(bufferArray);

            const result = decodeData(type, buffer, 0, endian);
            // this buffer is copied from PVA protocol
            expect(result).toEqual(data)
        })


        it("failed case -- union type cannot encode with an empty fields", () => {
            const type = {
                typeIndex: "0x89",
                name: "",
                fields: {}
            }
            const data = {
                index: 0,
                value: []
            };
            const buffer = Buffer.from([0x01]);
            const endian = ENDIAN.BIG;
            expect(() => { decodeData(type, buffer, 0, endian) }).toThrow();
        })

        it("normal case -- simple numbers", () => {
            const type = {
                typeIndex: "0x89",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const data = [{
                index: 0,
                value: 22
            },
            {
                index: 1,
                value: 23
            }
            ];
            const bufferArray = [
                0x02,
                0x00,
                0x41, 0xb0, 0x00, 0x00,
                0x01,
                0x41, 0xb8, 0x00, 0x00,
            ]
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = decodeData(type, buffer, 0, endian);
            expect(result).toEqual(data);
        })

        it("failed case -- type missing name", () => {
            const type = {
                typeIndex: "0x89",
                // name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const data = [{
                index: 0,
                value: 22
            },
            {
                index: 1,
                value: 23
            }
            ];
            const bufferArray = [
                0x02,
                0x00,
                0x41, 0xb0, 0x00, 0x00,
                0x01,
                0x41, 0xb8, 0x00, 0x00,
            ]
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            expect(() => { decodeData(type, buffer, 0, endian) }).toThrow();
        })


        it("failed case -- buffer missing data", () => {
            const type = {
                typeIndex: "0x89",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const data = [{
                index: 0,
                value: 22
            },
            {
                index: 1,
                value: 23
            }
            ];
            const bufferArray = [
                0x02,
                0x00,
                0x41, 0xb0, 0x00, 0x00,
                0x01,
                0x41, 0xb8, 0x00, // <-- missing 0x00
            ]
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            expect(() => { decodeData(type, buffer, 0, endian) }).toThrow();
        })

        it("failed case -- index wrong", () => {
            const type = {
                typeIndex: "0x89",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const data = [{
                index: 2, // <-- no such index
                value: 22
            },
            {
                index: 1,
                value: 23
            }
            ];
            const bufferArray = [
                0x02,
                0x02,
                0x41, 0xb0, 0x00, 0x00,
                0x01,
                0x41, 0xb8, 0x00, 0x00, // <-- missing 0x00
            ]
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            expect(() => { decodeData(type, buffer, 0, endian) }).toThrow();
        })


        it("normal case -- number array", () => {
            const type = {
                typeIndex: "0x89",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_fixedSizeArray_binary32, size: 5 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const data = [
                {
                    index: 0,
                    value: [1, 2, 3, 4, 5],
                    // val2: 33,
                },
                {
                    index: 0,
                    // value: [1, 2, 3, 4, 5],
                    value: [5, 4, 3, 2, 1],
                }
            ]
            const bufferArray = [
                0x02,
                0x00,
                0x3f, 0x80, 0x00, 0x00,
                0x40, 0x00, 0x00, 0x00,
                0x40, 0x40, 0x00, 0x00,
                0x40, 0x80, 0x00, 0x00,
                0x40, 0xa0, 0x00, 0x00,
                0x00,
                0x40, 0xa0, 0x00, 0x00,
                0x40, 0x80, 0x00, 0x00,
                0x40, 0x40, 0x00, 0x00,
                0x40, 0x00, 0x00, 0x00,
                0x3f, 0x80, 0x00, 0x00,
            ]
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = decodeData(type, buffer, 0, endian);

            expect(result).toEqual(data);
        })

    })


    describe("complex_variableSizeArray_structure, 0x88", () => {

        it("ok, PVA protocol spec (2015 version) page 10, with 2 elements", () => {
            const endian = ENDIAN.BIG;

            const type = {
                typeIndex: "0x88",
                name: "abcd", // encoding data does not use this piece of information
                id: 7, // encoding data does not use this piece of information
                tag: 3, // encoding data does not use this piece of information
                fields: {
                    value: { typeIndex: "0x28" }, // integer_variableSizeArray_signedByte = 0x28,
                    boundedSizeArray: { typeIndex: "0x30", size: 16 }, // integer_boundedSizeArray_signedByte = 0x30,
                    fixedSizeArray: { typeIndex: "0x38", size: 4 }, // integer_fixedSizeArray_signedByte = 0x38,
                    timeStamp: {
                        typeIndex: "0x80",
                        name: "timeStamp_t", // encoding data does not use this piece of information
                        id: 8, // encoding data does not use this piece of information
                        tag: 4, // encoding data does not use this piece of information
                        fields: {
                            secondsPastEpoch: { typeIndex: "0x23" }, // integer_scalar_signedLong = 0x23,
                            nanoSeconds: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            userTag: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                        }
                    },
                    alarm: {
                        typeIndex: "0x80",
                        name: "alarm_t",  // encoding data does not use this piece of information
                        id: 6, // encoding data does not use this piece of information
                        tag: 5, // encoding data does not use this piece of information
                        fields: {
                            severity: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            status: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            message: { typeIndex: "0x60" }, // string_scalar = 0x60,
                        }
                    },
                    valueUnion: {
                        typeIndex: "0x81",
                        name: "union_ok",
                        id: 7,
                        tag: 6,
                        // encoding data does need to know all fields or the field's name
                        fields: {
                            fieldMember1: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            fieldMember2: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            fieldMember3: { typeIndex: "0x23" }, // integer_scalar_signedLong = 0x23,
                            fieldMember4: { typeIndex: "0x28" }, // integer_variableSizeArray_signedByte = 0x28,
                        }
                    },
                    // ! todo: variant union
                    // variantUnion: {
                    //     typeIndex: "0x82", // variant union's data type is defined in the data buffer, not in the type buffer
                    // }
                }
            };
            const data =
                [
                    {
                        value: [1, 2, 3],
                        boundedSizeArray: [4, 5, 6, 7, 8],
                        fixedSizeArray: [9, 10, 11, 12],
                        timeStamp: {
                            secondsPastEpoch: 1234605616436508552n, // big int, Javascript integer can only reach 2^53 - 1
                            nanoSeconds: 0xAABBCCDD | 0, // 0x can only represents unsigned integer, |0 operation convert it to signed integer
                            userTag: 0xEEEEEEEE | 0,
                        },
                        alarm: { severity: 0x11111111, status: 0x22222222, message: 'Allo, Allo!' },
                        valueUnion: { index: 1, value: 0x33333333 }, // we cannot simply provide a data, but also an index
                        // variantUnion: 'String inside variant union.'
                    },
                    {
                        value: [1, 2, 3, 4],
                        boundedSizeArray: [4, 5, 6, 7, 8],
                        fixedSizeArray: [9, 10, 11, 13],
                        timeStamp: {
                            secondsPastEpoch: 1234605616436508552n, // big int, Javascript integer can only reach 2^53 - 1
                            nanoSeconds: 0xAABBCCCD | 0, // 0x can only represents unsigned integer, |0 operation convert it to signed integer
                            userTag: 0xEEEEEEDE | 0,
                        },
                        alarm: { severity: 0x11111111, status: 0x22222222, message: 'Allo, Allo!' },
                        valueUnion: { index: 1, value: 0x33333334 }, // we cannot simply provide a data, but also an index
                        // variantUnion: 'String inside variant union.'
                    },
                ];
            const bufferArray = [
                0x02,
                0x03, 0x01, 0x02, 0x03, // value
                0x05, 0x04, 0x05, 0x06, 0x07, 0x08, // boundedSizeArray
                0x09, 0x0A, 0x0B, 0x0C, // fixedSizeArray
                0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, // timeStamp.secondsSinceEpoch
                0xAA, 0xBB, 0xCC, 0xDD, // timeStamp.nanoSeconds
                0xEE, 0xEE, 0xEE, 0xEE, // timeStamp.userTag
                0x11, 0x11, 0x11, 0x11, // alarm.severity
                0x22, 0x22, 0x22, 0x22, // alarm.status
                0x0B, 0x41, 0x6C, 0x6C, 0x6F, 0x2C, 0x20, 0x41, 0x6C, 0x6C, 0x6F, 0x21, // alarm.message
                0x01, 0x33, 0x33, 0x33, 0x33, // valueUnion
                // 0x60, // variant union type -- a variable size string
                // 0x1C, 0x53, 0x74, 0x72, 0x69, 0x6E, 0x67, 0x20, 0x69, 0x6E, 0x73, 0x69, 0x64, 0x65, 0x20, 0x76, 0x61, 0x72, 0x69, 0x61, 0x6E, 0x74, 0x20, 0x75, 0x6E, 0x69, 0x6F, 0x6E, 0x2E,
                0x04, 0x01, 0x02, 0x03, 0x04, // value <-- diff from first element
                0x05, 0x04, 0x05, 0x06, 0x07, 0x08, // boundedSizeArray
                0x09, 0x0A, 0x0B, 0x0D, // fixedSizeArray
                0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, // timeStamp.secondsSinceEpoch
                0xAA, 0xBB, 0xCC, 0xCD, // timeStamp.nanoSeconds <-- diff from first element
                0xEE, 0xEE, 0xEE, 0xDE, // timeStamp.userTag <-- diff from first element
                0x11, 0x11, 0x11, 0x11, // alarm.severity
                0x22, 0x22, 0x22, 0x22, // alarm.status
                0x0B, 0x41, 0x6C, 0x6C, 0x6F, 0x2C, 0x20, 0x41, 0x6C, 0x6C, 0x6F, 0x21, // alarm.message
                0x01, 0x33, 0x33, 0x33, 0x34, // valueUnion <-- diff from first element
                // 0x60, // variant union type -- a variable size string
                // 0x1C, 0x53, 0x74, 0x72, 0x69, 0x6E, 0x67, 0x20, 0x69, 0x6E, 0x73, 0x69, 0x64, 0x65, 0x20, 0x76, 0x61, 0x72, 0x69, 0x61, 0x6E, 0x74, 0x20, 0x75, 0x6E, 0x69, 0x6F, 0x6E, 0x2E,
            ];
            const buffer = Buffer.from(bufferArray);
            const result = decodeData(type, buffer, 0, endian);
            // this buffer is copied from PVA protocol
            expect(result).toEqual(data);
        })

        it("same as above, little endian", () => {
            const endian = ENDIAN.LITTLE;

            const type = {
                typeIndex: "0x88",
                name: "abcd", // encoding data does not use this piece of information
                id: 7, // encoding data does not use this piece of information
                tag: 3, // encoding data does not use this piece of information
                fields: {
                    value: { typeIndex: "0x28" }, // integer_variableSizeArray_signedByte = 0x28,
                    boundedSizeArray: { typeIndex: "0x30", size: 16 }, // integer_boundedSizeArray_signedByte = 0x30,
                    fixedSizeArray: { typeIndex: "0x38", size: 4 }, // integer_fixedSizeArray_signedByte = 0x38,
                    timeStamp: {
                        typeIndex: "0x80",
                        name: "timeStamp_t", // encoding data does not use this piece of information
                        id: 8, // encoding data does not use this piece of information
                        tag: 4, // encoding data does not use this piece of information
                        fields: {
                            secondsPastEpoch: { typeIndex: "0x23" }, // integer_scalar_signedLong = 0x23,
                            nanoSeconds: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            userTag: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                        }
                    },
                    alarm: {
                        typeIndex: "0x80",
                        name: "alarm_t",  // encoding data does not use this piece of information
                        id: 6, // encoding data does not use this piece of information
                        tag: 5, // encoding data does not use this piece of information
                        fields: {
                            severity: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            status: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            message: { typeIndex: "0x60" }, // string_scalar = 0x60,
                        }
                    },
                    valueUnion: {
                        typeIndex: "0x81",
                        name: "union_ok",
                        id: 7,
                        tag: 6,
                        // encoding data does need to know all fields or the field's name
                        fields: {
                            fieldMember1: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            fieldMember2: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            fieldMember3: { typeIndex: "0x23" }, // integer_scalar_signedLong = 0x23,
                            fieldMember4: { typeIndex: "0x28" }, // integer_variableSizeArray_signedByte = 0x28,
                        }
                    },
                    // ! todo: variant union
                    // variantUnion: {
                    //     typeIndex: "0x82", // variant union's data type is defined in the data buffer, not in the type buffer
                    // }
                }
            };
            const data =
                [
                    {
                        value: [1, 2, 3],
                        boundedSizeArray: [4, 5, 6, 7, 8],
                        fixedSizeArray: [9, 10, 11, 12],
                        timeStamp: {
                            secondsPastEpoch: 1234605616436508552n, // big int, Javascript integer can only reach 2^53 - 1
                            nanoSeconds: 0xAABBCCDD | 0, // 0x can only represents unsigned integer, |0 operation convert it to signed integer
                            userTag: 0xEEEEEEEE | 0,
                        },
                        alarm: { severity: 0x11111111, status: 0x22222222, message: 'Allo, Allo!' },
                        valueUnion: { index: 1, value: 0x33333333 }, // we cannot simply provide a data, but also an index
                        // variantUnion: 'String inside variant union.'
                    },
                    {
                        value: [1, 2, 3, 4],
                        boundedSizeArray: [4, 5, 6, 7, 8],
                        fixedSizeArray: [9, 10, 11, 13],
                        timeStamp: {
                            secondsPastEpoch: 1234605616436508552n, // big int, Javascript integer can only reach 2^53 - 1
                            nanoSeconds: 0xAABBCCCD | 0, // 0x can only represents unsigned integer, |0 operation convert it to signed integer
                            userTag: 0xEEEEEEDE | 0,
                        },
                        alarm: { severity: 0x11111111, status: 0x22222222, message: 'Allo, Allo!' },
                        valueUnion: { index: 1, value: 0x33333334 }, // we cannot simply provide a data, but also an index
                        // variantUnion: 'String inside variant union.'
                    },
                ];
            const bufferArray = [
                0x02,
                0x03, 0x01, 0x02, 0x03, // value
                0x05, 0x04, 0x05, 0x06, 0x07, 0x08, // boundedSizeArray
                0x09, 0x0A, 0x0B, 0x0C, // fixedSizeArray
                0x88, 0x77, 0x66, 0x55, 0x44, 0x33, 0x22, 0x11, // timeStamp.secondsSinceEpoch
                0xDD, 0xCC, 0xBB, 0xAA, // timeStamp.nanoSeconds
                0xEE, 0xEE, 0xEE, 0xEE, // timeStamp.userTag
                0x11, 0x11, 0x11, 0x11, // alarm.severity
                0x22, 0x22, 0x22, 0x22, // alarm.status
                0x0B, 0x41, 0x6C, 0x6C, 0x6F, 0x2C, 0x20, 0x41, 0x6C, 0x6C, 0x6F, 0x21, // alarm.message
                0x01, 0x33, 0x33, 0x33, 0x33, // valueUnion
                // 0x60, // variant union type -- a variable size string
                // 0x1C, 0x53, 0x74, 0x72, 0x69, 0x6E, 0x67, 0x20, 0x69, 0x6E, 0x73, 0x69, 0x64, 0x65, 0x20, 0x76, 0x61, 0x72, 0x69, 0x61, 0x6E, 0x74, 0x20, 0x75, 0x6E, 0x69, 0x6F, 0x6E, 0x2E,
                0x04, 0x01, 0x02, 0x03, 0x04, // value <-- diff from first element
                0x05, 0x04, 0x05, 0x06, 0x07, 0x08, // boundedSizeArray
                0x09, 0x0A, 0x0B, 0x0D, // fixedSizeArray
                0x88, 0x77, 0x66, 0x55, 0x44, 0x33, 0x22, 0x11, // timeStamp.secondsSinceEpoch
                0xCD, 0xCC, 0xBB, 0xAA, // timeStamp.nanoSeconds <-- diff from first element
                0xDE, 0xEE, 0xEE, 0xEE, // timeStamp.userTag <-- diff from first element
                0x11, 0x11, 0x11, 0x11, // alarm.severity
                0x22, 0x22, 0x22, 0x22, // alarm.status
                0x0B, 0x41, 0x6C, 0x6C, 0x6F, 0x2C, 0x20, 0x41, 0x6C, 0x6C, 0x6F, 0x21, // alarm.message
                0x01, 0x34, 0x33, 0x33, 0x33, // valueUnion <-- diff from first element
                // 0x60, // variant union type -- a variable size string
                // 0x1C, 0x53, 0x74, 0x72, 0x69, 0x6E, 0x67, 0x20, 0x69, 0x6E, 0x73, 0x69, 0x64, 0x65, 0x20, 0x76, 0x61, 0x72, 0x69, 0x61, 0x6E, 0x74, 0x20, 0x75, 0x6E, 0x69, 0x6F, 0x6E, 0x2E,
            ];
            const buffer = Buffer.from(bufferArray);
            const result = decodeData(type, buffer, 0, endian);
            // this buffer is copied from PVA protocol
            expect(result).toEqual(data)
        })



        it("normal case -- empty fields", () => {
            const type = {
                typeIndex: "0x88",
                name: "",
                fields: {}
            }
            const data = [
                {},
                {}
            ];
            const bufferArray = [0x02];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = decodeData(type, buffer, 0, endian);
            expect(result).toEqual(data);
        })

        it("normal case -- simple values", () => {
            const type = {
                typeIndex: "0x88",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const bufferArray = [
                0x02,
                0x41, 0xb0, 0x00, 0x00,
                0x42, 0x04, 0x00, 0x00,
                0x41, 0xb0, 0x00, 0x00,
                0x42, 0x08, 0x00, 0x00,
            ]
            const buffer = Buffer.from(bufferArray);
            const data = [
                {
                    val1: 22,
                    val2: 33,
                },
                {
                    val1: 22,
                    val2: 34,
                }
            ]
            const endian = ENDIAN.BIG;
            const result = decodeData(type, buffer, 0, endian);
            expect(result).toEqual(data);
        })

        it("failed case -- type missing name", () => {
            const type = {
                typeIndex: "0x88",
                // name: "", <-- missing
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const bufferArray = [
                0x02,
                0x41, 0xb0, 0x00, 0x00,
                0x42, 0x04, 0x00, 0x00,
                0x41, 0xb0, 0x00, 0x00,
                0x42, 0x08, 0x00, 0x00,
            ]
            const buffer = Buffer.from(bufferArray);
            const data = [
                {
                    val1: 22,
                    val2: 33,
                },
                {
                    val1: 22,
                    val2: 34,
                }
            ]
            const endian = ENDIAN.BIG;
            expect(() => { decodeData(type, buffer, 0, endian) }).toThrow();
        })

        it("failed case -- buffer not long enough", () => {
            const type = {
                typeIndex: "0x88",
                // name: "", <-- missing
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const bufferArray = [
                0x02,
                0x41, 0xb0, 0x00, 0x00,
                0x42, 0x04, 0x00, 0x00,
                0x41, 0xb0, 0x00, 0x00,
                0x42, 0x08, 0x00, // <-- missing 
            ]
            const buffer = Buffer.from(bufferArray);
            const data = [
                {
                    val1: 22,
                    val2: 33,
                },
                {
                    val1: 22,
                    val2: 34,
                }
            ]
            const endian = ENDIAN.BIG;
            expect(() => { decodeData(type, buffer, 0, endian) }).toThrow();
        })

        it("normal case -- with element ID and element TAG", () => {
            const type = {
                typeIndex: "0x88",
                name: "",
                elementId: 33,
                elementTag: 22,
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const bufferArray = [
                0x02,
                0x41, 0xb0, 0x00, 0x00,
                0x42, 0x04, 0x00, 0x00,
                0x41, 0xb0, 0x00, 0x00,
                0x42, 0x08, 0x00, 0x00,
            ]
            const buffer = Buffer.from(bufferArray);
            const data = [
                {
                    val1: 22,
                    val2: 33,
                },
                {
                    val1: 22,
                    val2: 34,
                }
            ]
            const endian = ENDIAN.BIG;
            const result = decodeData(type, buffer, 0, endian);
            expect(result).toEqual(data);
        })
    })



    describe("complex_scalar_boundedString, 0x83", () => {

        it("good", () => {
            // create buffer
            const str = "This is TCA";
            const boundSize = str.length + 5;
            const endian = ENDIAN.BIG;
            const sizeBuffer = createSizeBuffer(str.length, endian, undefined);
            const strBuffer = Buffer.from(str);
            const buffer = Buffer.concat([sizeBuffer, strBuffer]);
            // decode buffer
            const result = decodeData({ typeIndex: "0x83", size: boundSize }, buffer, 0, endian);
            expect(result).toBe(str);
        })

        it("good, little endian", () => {
            // create buffer
            const str = "This is TCA";
            const boundSize = str.length + 5;
            const endian = ENDIAN.LITTLE;
            const sizeBuffer = createSizeBuffer(str.length, endian, undefined);
            const strBuffer = Buffer.from(str);
            const buffer = Buffer.concat([sizeBuffer, strBuffer]);
            // decode buffer
            const result = decodeData({ typeIndex: "0x83", size: boundSize }, buffer, 0, endian);
            expect(result).toBe(str);
        })

        it("size > bound size, to throw", () => {
            // create buffer
            const str = "This is TCA";
            const boundSize = str.length - 2;
            const endian = ENDIAN.BIG;
            const sizeBuffer = createSizeBuffer(str.length, endian, undefined);
            const strBuffer = Buffer.from(str);
            const buffer = Buffer.concat([sizeBuffer, strBuffer]);
            // decode buffer
            expect(() => { decodeData({ typeIndex: "0x83", size: boundSize }, buffer, 0, endian) }).toThrow();
        })

        it("failed case -- buffer not holding enough data", () => {
            const bufferArray = [5, 0x61, 0x62, 0x63, 0x64]; // <-- actually 4 chars
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            expect(() => { decodeData({ typeIndex: "0x83", size: 6 }, buffer, 0, endian) }).toThrow();
        })
    })

    describe("complex_scalar_variantUnion, 0x82", () => {
        it("ok", () => {
            const endian = ENDIAN.BIG;
            const data = {
                type: {
                    typeIndex: "0x60",
                },
                value: "ABCD",
            };
            const bufferArray = [0x60, 0x04, 0x41, 0x42, 0x43, 0x44];
            const buffer = Buffer.from(bufferArray);
            const result = decodeData({ typeIndex: "0x82" }, buffer, 0, endian);

            expect(result).toEqual(data);
        })

        it("ok, including type has an id", () => {
            const endian = ENDIAN.BIG;
            const data = {
                type: {
                    typeIndex: "0x60",
                    id: 0x23,
                },
                value: "ABCD",
            };
            const bufferArray = [0xfd, 0x00, 0x23, 0x60, 0x04, 0x41, 0x42, 0x43, 0x44];
            const buffer = Buffer.from(bufferArray);
            const result = decodeData({ typeIndex: "0x82", id: 0x22 }, buffer, 0, endian);
            expect(result).toEqual(data)
        })


        it("ok, boolean_fixedSizeArray, 0x18", () => {

            const endian = ENDIAN.BIG;
            const data = {
                type: {
                    typeIndex: "0x18",
                    size: 4
                },
                value: [true, false, false, false],
            };
            const bufferArray = [0x18, 0x04, 0x01, 0x00, 0x00, 0x00];
            const buffer = Buffer.from(bufferArray);
            const result = decodeData({ typeIndex: "0x82", id: 0x22 }, buffer, 0, endian);

            expect(result).toEqual(data);
        })


        it("ok, boolean_fixedSizeArray, 0x18, with an ID", () => {

            const endian = ENDIAN.BIG;
            const data = {
                type: {
                    typeIndex: "0x18",
                    size: 4,
                    id: 0x33,
                },
                value: [true, false, false, false],
            };
            const bufferArray = [0xfd, 0x00, 0x33, 0x18, 0x04, 0x01, 0x00, 0x00, 0x00];
            const buffer = Buffer.from(bufferArray);
            const result = decodeData({ typeIndex: "0x82", id: 0x22 }, buffer, 0, endian);

            expect(result).toEqual(data);
        })


        it("ok, boolean_fixedSizeArray, 0x18, with an ID and a tag", () => {

            const endian = ENDIAN.BIG;
            const data = {
                type: {
                    typeIndex: "0x18",
                    size: 4,
                    id: 0x33,
                    tag: 0x44,
                },
                value: [true, false, false, false],
            };
            const bufferArray = [0xfc, 0x00, 0x33, 0x00, 0x00, 0x00, 0x44, 0x18, 0x04, 0x01, 0x00, 0x00, 0x00];
            const buffer = Buffer.from(bufferArray);
            const result = decodeData({ typeIndex: "0x82", id: 0x22 }, buffer, 0, endian);

            expect(result).toEqual(data);
        })



        it(`decode a pv request (variant union) -- pvmonitor  "-r record[pipeline:1]field(value)" demo`, () => {
            const bufferArray = [
                // 0xCA, 0x02, 0x80, 0x0D, 0x00, 0x00, 0x00, 0x56, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
                // 0x88, 
                0xFD, 0x00, 0x02, 0x80, 0x00, 0x02, 0x06, 0x72, 0x65, 0x63, 0x6F, 0x72, 0x64, 0xFD, 0x00,
                0x03, 0x80, 0x00, 0x01, 0x08, 0x5F, 0x6F, 0x70, 0x74, 0x69, 0x6F, 0x6E, 0x73, 0xFD, 0x00, 0x04,
                0x80, 0x00, 0x01, 0x08, 0x70, 0x69, 0x70, 0x65, 0x6C, 0x69, 0x6E, 0x65, 0x60, 0x05, 0x66, 0x69,
                0x65, 0x6C, 0x64, 0xFD, 0x00, 0x05, 0x80, 0x00, 0x01, 0x05, 0x76, 0x61, 0x6C, 0x75, 0x65, 0xFD,
                0x00, 0x06, 0x80, 0x00, 0x00, 
                0x04, 0x74, 0x72, 0x75, 0x65,
                // 0x00, 0x00, 0x00, 0x02,
            ];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = decodeData({typeIndex: "0x82"}, buffer, 0, endian);

            console.log(result)
            expect(result).toEqual(
                {
                    type: {
                        typeIndex: '0x80',
                        name: '',
                        fields: {
                            record: {
                                typeIndex: '0x80',
                                id: 3,
                                name: '',
                                fields: {
                                    _options: {
                                        typeIndex: '0x80',
                                        id: 4,
                                        name: '',
                                        fields: { pipeline: { typeIndex: '0x60' } }
                                    }
                                }
                            },
                            field: {
                                typeIndex: '0x80',
                                id: 5,
                                name: '',
                                fields: { value: { typeIndex: '0x80', id: 6, name: '', fields: {} } }
                            }
                        },
                        id: 2
                    },
                    value: {
                        record: {
                            _options: {
                                pipeline: "true",
                            }
                        },
                        field: {
                            value: {}
                        }
                    }

                }
                
            )
        })
    })


    describe("complex_scalar_union, 0x81", () => {

        it("ok, PVA protocol spec (2015 version) page 10, converted to union", () => {
            const endian = ENDIAN.BIG;

            const type = {
                typeIndex: "0x81",
                name: "abcd", // encoding data does not use this piece of information
                id: 7, // encoding data does not use this piece of information
                tag: 3, // encoding data does not use this piece of information
                fields: { // each field is an option
                    value: { typeIndex: "0x28" }, // integer_variableSizeArray_signedByte = 0x28,
                    boundedSizeArray: { typeIndex: "0x30", size: 16 }, // integer_boundedSizeArray_signedByte = 0x30,
                    fixedSizeArray: { typeIndex: "0x38", size: 4 }, // integer_fixedSizeArray_signedByte = 0x38,
                    timeStamp: {
                        typeIndex: "0x80",
                        name: "timeStamp_t", // encoding data does not use this piece of information
                        id: 8, // encoding data does not use this piece of information
                        tag: 4, // encoding data does not use this piece of information
                        fields: {
                            secondsPastEpoch: { typeIndex: "0x23" }, // integer_scalar_signedLong = 0x23,
                            nanoSeconds: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            userTag: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                        }
                    },
                    alarm: {
                        typeIndex: "0x80",
                        name: "alarm_t",  // encoding data does not use this piece of information
                        id: 6, // encoding data does not use this piece of information
                        tag: 5, // encoding data does not use this piece of information
                        fields: {
                            severity: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            status: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            message: { typeIndex: "0x60" }, // string_scalar = 0x60,
                        }
                    },
                    valueUnion: {
                        typeIndex: "0x81",
                        name: "union_ok",
                        id: 7,
                        tag: 6,
                        // encoding data does need to know all fields or the field's name
                        fields: {
                            fieldMember1: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            fieldMember2: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            fieldMember3: { typeIndex: "0x23" }, // integer_scalar_signedLong = 0x23,
                            fieldMember4: { typeIndex: "0x28" }, // integer_variableSizeArray_signedByte = 0x28,
                        }
                    },
                    // ! todo: variant union
                    // variantUnion: {
                    //     typeIndex: "0x82", // variant union's data type is defined in the data buffer, not in the type buffer
                    // }
                }
            };
            const data0 =
            {
                index: 0,
                value: [1, 2, 3],
            }
            const data1 =
            {
                index: 1,
                value: [4, 5, 6, 7, 8],
            }
            const data2 =
            {
                index: 2,
                value: [9, 10, 11, 12],
            }
            const data3 =
            {
                index: 3,
                value: {
                    secondsPastEpoch: 1234605616436508552n, // big int, Javascript integer can only reach 2^53 - 1
                    nanoSeconds: 0xAABBCCDD | 0, // 0x can only represents unsigned integer, |0 operation convert it to signed integer
                    userTag: 0xEEEEEEEE | 0,
                },
            }
            const data4 = {
                index: 4,
                value: { severity: 0x11111111, status: 0x22222222, message: 'Allo, Allo!' }
            };
            const data5 = {
                index: 5,
                value: { index: 1, value: 0x33333333 },
            }

            const buffer0 = [
                0x00,
                0x03, 0x01, 0x02, 0x03, // value
            ];
            const buffer1 = [
                0x01,
                0x05, 0x04, 0x05, 0x06, 0x07, 0x08, // boundedSizeArray
            ];
            const buffer2 = [

                0x02,
                0x09, 0x0A, 0x0B, 0x0C, // fixedSizeArray
            ];
            const buffer3 = [

                0x03,
                0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, // timeStamp.secondsSinceEpoch
                0xAA, 0xBB, 0xCC, 0xDD, // timeStamp.nanoSeconds
                0xEE, 0xEE, 0xEE, 0xEE, // timeStamp.userTag
            ];
            const buffer4 = [

                0x04,
                0x11, 0x11, 0x11, 0x11, // alarm.severity
                0x22, 0x22, 0x22, 0x22, // alarm.status
                0x0B, 0x41, 0x6C, 0x6C, 0x6F, 0x2C, 0x20, 0x41, 0x6C, 0x6C, 0x6F, 0x21, // alarm.message
            ];
            const buffer5 = [
                0x05,
                0x01, 0x33, 0x33, 0x33, 0x33, // valueUnion
                // 0x60, // variant union type -- a variable size string
                // 0x1C, 0x53, 0x74, 0x72, 0x69, 0x6E, 0x67, 0x20, 0x69, 0x6E, 0x73, 0x69, 0x64, 0x65, 0x20, 0x76, 0x61, 0x72, 0x69, 0x61, 0x6E, 0x74, 0x20, 0x75, 0x6E, 0x69, 0x6F, 0x6E, 0x2E,
            ]

            const result0 = decodeData(type, Buffer.from(buffer0), 0, endian);
            const result1 = decodeData(type, Buffer.from(buffer1), 0, endian);
            const result2 = decodeData(type, Buffer.from(buffer2), 0, endian);
            const result3 = decodeData(type, Buffer.from(buffer3), 0, endian);
            const result4 = decodeData(type, Buffer.from(buffer4), 0, endian);
            const result5 = decodeData(type, Buffer.from(buffer5), 0, endian);
            // this buffer is copied from PVA protocol
            expect([result0, result1, result2, result3, result4, result5,]).toEqual(
                [
                    data0,
                    data1,
                    data2,
                    data3,
                    data4,
                    data5,
                ]
            )
        })

        it("same as above, little endian", () => {
            const endian = ENDIAN.LITTLE;

            const type = {
                typeIndex: "0x81",
                name: "abcd", // encoding data does not use this piece of information
                id: 7, // encoding data does not use this piece of information
                tag: 3, // encoding data does not use this piece of information
                fields: { // each field is an option
                    value: { typeIndex: "0x28" }, // integer_variableSizeArray_signedByte = 0x28,
                    boundedSizeArray: { typeIndex: "0x30", size: 16 }, // integer_boundedSizeArray_signedByte = 0x30,
                    fixedSizeArray: { typeIndex: "0x38", size: 4 }, // integer_fixedSizeArray_signedByte = 0x38,
                    timeStamp: {
                        typeIndex: "0x80",
                        name: "timeStamp_t", // encoding data does not use this piece of information
                        id: 8, // encoding data does not use this piece of information
                        tag: 4, // encoding data does not use this piece of information
                        fields: {
                            secondsPastEpoch: { typeIndex: "0x23" }, // integer_scalar_signedLong = 0x23,
                            nanoSeconds: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            userTag: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                        }
                    },
                    alarm: {
                        typeIndex: "0x80",
                        name: "alarm_t",  // encoding data does not use this piece of information
                        id: 6, // encoding data does not use this piece of information
                        tag: 5, // encoding data does not use this piece of information
                        fields: {
                            severity: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            status: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            message: { typeIndex: "0x60" }, // string_scalar = 0x60,
                        }
                    },
                    valueUnion: {
                        typeIndex: "0x81",
                        name: "union_ok",
                        id: 7,
                        tag: 6,
                        // encoding data does need to know all fields or the field's name
                        fields: {
                            fieldMember1: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            fieldMember2: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            fieldMember3: { typeIndex: "0x23" }, // integer_scalar_signedLong = 0x23,
                            fieldMember4: { typeIndex: "0x28" }, // integer_variableSizeArray_signedByte = 0x28,
                        }
                    },
                    // ! todo: variant union
                    // variantUnion: {
                    //     typeIndex: "0x82", // variant union's data type is defined in the data buffer, not in the type buffer
                    // }
                }
            };
            const data0 =
            {
                index: 0,
                value: [1, 2, 3],
            }
            const data1 =
            {
                index: 1,
                value: [4, 5, 6, 7, 8],
            }
            const data2 =
            {
                index: 2,
                value: [9, 10, 11, 12],
            }
            const data3 =
            {
                index: 3,
                value: {
                    secondsPastEpoch: 1234605616436508552n, // big int, Javascript integer can only reach 2^53 - 1
                    nanoSeconds: 0xAABBCCDD | 0, // 0x can only represents unsigned integer, |0 operation convert it to signed integer
                    userTag: 0xEEEEEEEE | 0,
                },
            }
            const data4 = {
                index: 4,
                value: { severity: 0x11111112, status: 0x22222223, message: 'Allo, Allo!' }
            };
            const data5 = {
                index: 5,
                value: { index: 1, value: 0x33333334 },
            }

            const buffer0 = [
                0x00,
                0x03, 0x01, 0x02, 0x03, // value
            ];
            const buffer1 = [
                0x01,
                0x05, 0x04, 0x05, 0x06, 0x07, 0x08, // boundedSizeArray
            ];
            const buffer2 = [

                0x02,
                0x09, 0x0A, 0x0B, 0x0C, // fixedSizeArray
            ];
            const buffer3 = [
                0x03,
                0x88, 0x77, 0x66, 0x55, 0x44, 0x33, 0x22, 0x11, // timeStamp.secondsSinceEpoch
                0xdd, 0xcc, 0xbb, 0xaa, // timeStamp.nanoSeconds
                0xEE, 0xEE, 0xEE, 0xEE, // timeStamp.userTag
            ];
            const buffer4 = [

                0x04,
                0x12, 0x11, 0x11, 0x11, // alarm.severity
                0x23, 0x22, 0x22, 0x22, // alarm.status
                0x0B, 0x41, 0x6C, 0x6C, 0x6F, 0x2C, 0x20, 0x41, 0x6C, 0x6C, 0x6F, 0x21, // alarm.message
            ];
            const buffer5 = [
                0x05,
                0x01, 0x34, 0x33, 0x33, 0x33, // valueUnion
                // 0x60, // variant union type -- a variable size string
                // 0x1C, 0x53, 0x74, 0x72, 0x69, 0x6E, 0x67, 0x20, 0x69, 0x6E, 0x73, 0x69, 0x64, 0x65, 0x20, 0x76, 0x61, 0x72, 0x69, 0x61, 0x6E, 0x74, 0x20, 0x75, 0x6E, 0x69, 0x6F, 0x6E, 0x2E,
            ]

            const result0 = decodeData(type, Buffer.from(buffer0), 0, endian);
            const result1 = decodeData(type, Buffer.from(buffer1), 0, endian);
            const result2 = decodeData(type, Buffer.from(buffer2), 0, endian);
            const result3 = decodeData(type, Buffer.from(buffer3), 0, endian);
            const result4 = decodeData(type, Buffer.from(buffer4), 0, endian);
            const result5 = decodeData(type, Buffer.from(buffer5), 0, endian);
            // this buffer is copied from PVA protocol
            expect([result0, result1, result2, result3, result4, result5,]).toEqual(
                [
                    data0,
                    data1,
                    data2,
                    data3,
                    data4,
                    data5,
                ]
            )
        })

        it("normal case -- one choice", () => {
            const type = {
                typeIndex: "0x81",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.boolean_scalar }
                }
            }
            const bufferArray = [0x00, 0x01];
            const buffer = Buffer.from(bufferArray);

            const endian = ENDIAN.BIG;
            const result = decodeData(type, buffer, 0, endian);
            expect(result).toEqual({
                index: 0,
                value: true
            })
        })

        it("failed case -- buffer does not come with data", () => {
            const type = {
                typeIndex: "0x81",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.boolean_scalar }
                }
            }
            const bufferArray = [0x00];
            const buffer = Buffer.from(bufferArray);

            const endian = ENDIAN.BIG;
            expect(() => { decodeData(type, buffer, 0, endian) }).toThrow();
        })

        it("failed case -- type missing name", () => {
            const type = {
                typeIndex: "0x81",
                // name: "", <-- missing
                fields: {
                    val1: { typeIndex: typeIndexEnum.boolean_scalar }
                }
            }
            const bufferArray = [0x00, 0x01];
            const buffer = Buffer.from(bufferArray);

            const endian = ENDIAN.BIG;
            expect(() => { decodeData(type, buffer, 0, endian) }).toThrow();
        })


        it("failed case -- index overflow", () => {
            const type = {
                typeIndex: "0x81",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.boolean_scalar }
                }
            }
            const bufferArray = [0x05, 0x01];
            const buffer = Buffer.from(bufferArray);

            const endian = ENDIAN.BIG;
            expect(() => { decodeData(type, buffer, 0, endian) }).toThrow();
        })


        it("normal case -- number array", () => {
            const type = {
                typeIndex: "0x81",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_fixedSizeArray_binary32, size: 5 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const data = {
                index: 0,
                value: [1, 2, 3, 4, 5],
            }
            const bufferArray = [
                0x00,
                0x3f, 0x80, 0x00, 0x00,
                0x40, 0x00, 0x00, 0x00,
                0x40, 0x40, 0x00, 0x00,
                0x40, 0x80, 0x00, 0x00,
                0x40, 0xa0, 0x00, 0x00,
                // 0x42, 0x04, 0x00, 0x00,
            ]
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = decodeData(type, buffer, 0, endian);
            expect(result).toEqual(data);
        })

    })



    describe("complex_scalar_structure, 0x80", () => {

        it("PVA protocol spec (2015 version) page 10", () => {
            const bufferArray = [
                0x03, 0x01, 0x02, 0x03, // value
                0x05, 0x04, 0x05, 0x06, 0x07, 0x08, // boundedSizeArray
                0x09, 0x0A, 0x0B, 0x0C, // fixedSizeArray
                0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, // timeStamp.secondsSinceEpoch
                0xAA, 0xBB, 0xCC, 0xDD, // timeStamp.nanoSeconds
                0xEE, 0xEE, 0xEE, 0xEE, // timeStamp.userTag
                0x11, 0x11, 0x11, 0x11, // alarm.severity
                0x22, 0x22, 0x22, 0x22, // alarm.status
                0x0B, 0x41, 0x6C, 0x6C, 0x6F, 0x2C, 0x20, 0x41, 0x6C, 0x6C, 0x6F, 0x21, // alarm.message
                0x01, 0x33, 0x33, 0x33, 0x33, // valueUnion
                0x60, // variant union type -- a variable size string
                0x1C, 0x53, 0x74, 0x72, 0x69, 0x6E, 0x67, 0x20, 0x69, 0x6E, 0x73, 0x69, 0x64, 0x65, 0x20, 0x76, 0x61, 0x72, 0x69, 0x61, 0x6E, 0x74, 0x20, 0x75, 0x6E, 0x69, 0x6F, 0x6E, 0x2E,
            ];
            const buffer = Buffer.from(bufferArray);

            const endian = ENDIAN.BIG;

            const type = {
                typeIndex: "0x80",
                name: "abcd", // decoding data does not use this piece of information
                id: 7, // decoding data does not use this piece of information
                tag: 3, // decoding data does not use this piece of information
                fields: {
                    value: { typeIndex: "0x28" }, // integer_variableSizeArray_signedByte = 0x28,
                    boundedSizeArray: { typeIndex: "0x30", size: 16 }, // integer_boundedSizeArray_signedByte = 0x30,
                    fixedSizeArray: { typeIndex: "0x38", size: 4 }, // integer_fixedSizeArray_signedByte = 0x38,
                    timeStamp: {
                        typeIndex: "0x80",
                        name: "timeStamp_t", // decoding data does not use this piece of information
                        id: 8, // decoding data does not use this piece of information
                        tag: 4, // decoding data does not use this piece of information
                        fields: {
                            secondsPastEpoch: { typeIndex: "0x23" }, // integer_scalar_signedLong = 0x23,
                            nanoSeconds: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            userTag: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                        }
                    },
                    alarm: {
                        typeIndex: "0x80",
                        name: "alarm_t",  // decoding data does not use this piece of information
                        id: 6, // decoding data does not use this piece of information
                        tag: 5, // decoding data does not use this piece of information
                        fields: {
                            severity: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            status: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            message: { typeIndex: "0x60" }, // string_scalar = 0x60,
                        }
                    },
                    valueUnion: {
                        typeIndex: "0x81",
                        name: "union_ok",
                        id: 7,
                        tag: 6,
                        // decoding data does need to know all fields or the field's name
                        fields: {
                            fieldMember1: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            fieldMember2: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            fieldMember3: { typeIndex: "0x23" }, // integer_scalar_signedLong = 0x23,
                            fieldMember4: { typeIndex: "0x28" }, // integer_variableSizeArray_signedByte = 0x28,
                        }
                    },
                    variantUnion: {
                        typeIndex: "0x82", // variant union's data type is defined in the data buffer, not in the type buffer
                    }
                }
            };

            console.dir(encodeType(type, endian).toJSON().data.map(num => num.toString(16).padStart(2,"0")).join(", 0x"), {depth: null, maxArrayLength: null});


            const result = decodeData(type, buffer, 0, endian);

            expect(result).toEqual({
                value: [1, 2, 3],
                boundedSizeArray: [4, 5, 6, 7, 8],
                fixedSizeArray: [9, 10, 11, 12],
                timeStamp: {
                    secondsPastEpoch: 1234605616436508552n, // big int, Javascript integer can only reach 2^53 - 1
                    nanoSeconds: 0xAABBCCDD | 0, // 0x can only represents unsigned integer, |0 operation convert it to signed integer
                    userTag: 0xEEEEEEEE | 0,
                },
                alarm: { severity: 0x11111111, status: 0x22222222, message: 'Allo, Allo!' },
                valueUnion: { index: 1, value: 0x33333333 },
                variantUnion: {
                    type: {
                        typeIndex: "0x60",
                    },
                    value: "String inside variant union."
                }
            })
        })

        it("same as above, little endian", () => {
            const bufferArray = [
                0x03, 0x01, 0x02, 0x03,
                0x05, 0x04, 0x05, 0x06, 0x07, 0x08,
                0x09, 0x0A, 0x0B, 0x0C,
                0x88, 0x77, 0x66, 0x55, 0x44, 0x33, 0x22, 0x11,
                0xdd, 0xcc, 0xbb, 0xaa,
                0xEE, 0xEE, 0xEE, 0xEE,
                0x11, 0x11, 0x11, 0x11,
                0x22, 0x22, 0x22, 0x22,
                0x0B, 0x41, 0x6C, 0x6C, 0x6F, 0x2C, 0x20, 0x41, 0x6C, 0x6C, 0x6F, 0x21,
                0x01, 0x33, 0x33, 0x33, 0x33,
                0x60, 0x1C, 0x53, 0x74, 0x72, 0x69, 0x6E, 0x67, 0x20, 0x69, 0x6E, 0x73, 0x69, 0x64, 0x65, 0x20, 0x76, 0x61, 0x72, 0x69, 0x61, 0x6E, 0x74, 0x20, 0x75, 0x6E, 0x69, 0x6F, 0x6E, 0x2E,
            ];
            const buffer = Buffer.from(bufferArray);

            const endian = ENDIAN.LITTLE;

            const type = {
                typeIndex: "0x80",
                name: "abcd", // decoding data does not use this piece of information
                id: 7, // decoding data does not use this piece of information
                tag: 3, // decoding data does not use this piece of information
                fields: {
                    value: { typeIndex: "0x28" }, // integer_variableSizeArray_signedByte = 0x28,
                    boundedSizeArray: { typeIndex: "0x30", size: 16 }, // integer_boundedSizeArray_signedByte = 0x30,
                    fixedSizeArray: { typeIndex: "0x38", size: 4 }, // integer_fixedSizeArray_signedByte = 0x38,
                    timeStamp: {
                        typeIndex: "0x80",
                        name: "timeStamp_t", // decoding data does not use this piece of information
                        id: 8, // decoding data does not use this piece of information
                        tag: 4, // decoding data does not use this piece of information
                        fields: {
                            secondsPastEpoch: { typeIndex: "0x23" }, // integer_scalar_signedLong = 0x23,
                            nanoSeconds: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            userTag: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                        }
                    },
                    alarm: {
                        typeIndex: "0x80",
                        name: "alarm_t",  // decoding data does not use this piece of information
                        id: 6, // decoding data does not use this piece of information
                        tag: 5, // decoding data does not use this piece of information
                        fields: {
                            severity: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            status: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            message: { typeIndex: "0x60" }, // string_scalar = 0x60,
                        }
                    },
                    valueUnion: {
                        typeIndex: "0x81",
                        name: "union_ok",
                        id: 7,
                        tag: 6,
                        // decoding data does need to know all fields or the field's name
                        fields: {
                            fieldMember1: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            fieldMember2: { typeIndex: "0x22" }, // integer_scalar_signedInt = 0x22,
                            fieldMember3: { typeIndex: "0x23" }, // integer_scalar_signedLong = 0x23,
                            fieldMember4: { typeIndex: "0x28" }, // integer_variableSizeArray_signedByte = 0x28,
                        }
                    },
                    variantUnion: {
                        typeIndex: "0x82", // variant union's data type is defined in the data buffer, not in the type buffer
                    }
                }
            };

            const result = decodeData(type, buffer, 0, endian);
            expect(result).toEqual({
                value: [1, 2, 3],
                boundedSizeArray: [4, 5, 6, 7, 8],
                fixedSizeArray: [9, 10, 11, 12],
                timeStamp: {
                    secondsPastEpoch: 1234605616436508552n, // big int, Javascript integer can only reach 2^53 - 1
                    nanoSeconds: 0xAABBCCDD | 0, // 0x can only represents unsigned integer, |0 operation convert it to signed integer
                    userTag: 0xEEEEEEEE | 0,
                },
                alarm: { severity: 0x11111111, status: 0x22222222, message: 'Allo, Allo!' },
                valueUnion: { index: 1, value: 0x33333333 },
                variantUnion: {
                    type: {
                        typeIndex: "0x60",
                    },
                    value: "String inside variant union."
                }
            })
        })


        it("normal case -- empty fields", () => {
            const type = {
                typeIndex: "0x80",
                name: "",
                fields: {}
            }
            const buffer = Buffer.alloc(0);
            const endian = ENDIAN.BIG;

            const data = decodeData(type, buffer, 0, endian);

            expect(data).toEqual({});
        })

        it("normal case -- simple data", () => {
            const type = {
                typeIndex: "0x80",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const bufferArray = [
                0x41, 0xb0, 0x00, 0x00,
                0x42, 0x04, 0x00, 0x00,
            ];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const data = decodeData(type, buffer, 0, endian);
            expect(data).toEqual({
                val1: 22,
                val2: 33
            })
        })

        it("failed case -- type missing name", () => {
            const type = {
                typeIndex: "0x80",
                // name:"", // <-- missing
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const bufferArray = [
                0x41, 0xb0, 0x00, 0x00,
                0x42, 0x04, 0x00, 0x00,
            ];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            expect(() => decodeData(type, buffer, 0, endian)).toThrow()
        })

        it("failed case -- buffer and type mismatch", () => {
            const type = {
                typeIndex: "0x80",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const bufferArray = [
                0x41, 0xb0, 0x00, 0x00,
                0x42, 0x04, 0x00,// <-- this is not a 4-byte floating point number
            ];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            expect(() => decodeData(type, buffer, 0, endian)).toThrow()
        })

        it("failed case -- not enough data in buffer", () => {
            const type = {
                typeIndex: "0x80",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const bufferArray = [
                0x41, 0xb0, 0x00, 0x00,
            ];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            expect(() => decodeData(type, buffer, 0, endian)).toThrow()
        })

        it("normal case -- number array", () => {
            const type = {
                typeIndex: "0x80",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_fixedSizeArray_binary32, size: 5 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const data = {
                val1: [1, 2, 3, 4, 5],
                val2: 33,
            }
            const bufferArray = [
                0x3f, 0x80, 0x00, 0x00,
                0x40, 0x00, 0x00, 0x00,
                0x40, 0x40, 0x00, 0x00,
                0x40, 0x80, 0x00, 0x00,
                0x40, 0xa0, 0x00, 0x00,
                0x42, 0x04, 0x00, 0x00,
            ]
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = decodeData(type, buffer, 0, endian);
            expect(result).toEqual(data);
        })


        it("normal case -- number array, different types, but same encoded buffer result", () => {
            const type = {
                typeIndex: "0x80",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_fixedSizeArray_binary32, size: 5 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_fixedSizeArray_binary32, size: 1 },
                }
            }
            const data = {
                val1: [1, 2, 3, 4, 5],
                val2: [33],
            }
            const bufferArray = [
                0x3f, 0x80, 0x00, 0x00,
                0x40, 0x00, 0x00, 0x00,
                0x40, 0x40, 0x00, 0x00,
                0x40, 0x80, 0x00, 0x00,
                0x40, 0xa0, 0x00, 0x00,
                0x42, 0x04, 0x00, 0x00,
            ]
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = decodeData(type, buffer, 0, endian);
            expect(result).toEqual(data);
        })

    })


    describe("string_fixedSizeArray, 0x78", () => {
        it("good", () => {
            // create buffer for test
            const str1 = "This is TCA";
            const str2 = "It is awesome";
            const str3 = "Yes, it is.";
            const endian = ENDIAN.BIG;
            const buffer1 = Buffer.concat([createSizeBuffer(str1.length, endian, undefined), Buffer.from(str1)]);
            const buffer2 = Buffer.concat([createSizeBuffer(str2.length, endian, undefined), Buffer.from(str2)]);
            const buffer3 = Buffer.concat([createSizeBuffer(str3.length, endian, undefined), Buffer.from(str3)]);
            const buffer = Buffer.concat([buffer1, buffer2, buffer3]);
            // decode the buffer
            const result = decodeData({ typeIndex: "0x78", size: 3 }, buffer, 0, endian);
            expect(result).toEqual([str1, str2, str3]);
        })

        it("good, little endian", () => {
            // create buffer for test
            const str1 = "This is TCA";
            const str2 = "It is awesome";
            const str3 = "Yes, it is.";
            const endian = ENDIAN.LITTLE;
            const buffer1 = Buffer.concat([createSizeBuffer(str1.length, endian, undefined), Buffer.from(str1)]);
            const buffer2 = Buffer.concat([createSizeBuffer(str2.length, endian, undefined), Buffer.from(str2)]);
            const buffer3 = Buffer.concat([createSizeBuffer(str3.length, endian, undefined), Buffer.from(str3)]);
            const buffer = Buffer.concat([buffer1, buffer2, buffer3]);
            // decode the buffer
            const result = decodeData({ typeIndex: "0x78", size: 3 }, buffer, 0, endian);
            expect(result).toEqual([str1, str2, str3]);
        })


        it("bad: try to read 4 strings in a fixed size 3 string array", () => {
            // create buffer for test
            const str1 = "This is TCA";
            const str2 = "It is awesome";
            const str3 = "Yes, it is.";
            const endian = ENDIAN.LITTLE;
            const buffer1 = Buffer.concat([createSizeBuffer(str1.length, endian, undefined), Buffer.from(str1)]);
            const buffer2 = Buffer.concat([createSizeBuffer(str2.length, endian, undefined), Buffer.from(str2)]);
            const buffer3 = Buffer.concat([createSizeBuffer(str3.length, endian, undefined), Buffer.from(str3)]);
            const buffer = Buffer.concat([buffer1, buffer2, buffer3]);
            // decode the buffer
            expect(() => { decodeData({ typeIndex: "0x78", size: 4 }, buffer, 0, endian) }).toThrow();
        })
    })

    describe("string_boundedSizeArray, 0x70", () => {
        it("good", () => {
            // create buffer for test
            const str1 = "This is TCA";
            const str2 = "It is awesome";
            const str3 = "Yes, it is.";
            const endian = ENDIAN.BIG;
            const buffer1 = Buffer.concat([createSizeBuffer(str1.length, endian, undefined), Buffer.from(str1)]);
            const buffer2 = Buffer.concat([createSizeBuffer(str2.length, endian, undefined), Buffer.from(str2)]);
            const buffer3 = Buffer.concat([createSizeBuffer(str3.length, endian, undefined), Buffer.from(str3)]);
            const sizeBuffer = createSizeBuffer(3, endian, undefined);
            const buffer = Buffer.concat([sizeBuffer, buffer1, buffer2, buffer3]);
            // decode the buffer
            const result = decodeData({ typeIndex: "0x70", size: 4 }, buffer, 0, endian);
            expect(result).toEqual([str1, str2, str3]);
        })

        it("good: little endian", () => {
            // create buffer for test
            const str1 = "This is TCA";
            const str2 = "It is awesome";
            const str3 = "Yes, it is.";
            const endian = ENDIAN.BIG;
            const buffer1 = Buffer.concat([createSizeBuffer(str1.length, endian, undefined), Buffer.from(str1)]);
            const buffer2 = Buffer.concat([createSizeBuffer(str2.length, endian, undefined), Buffer.from(str2)]);
            const buffer3 = Buffer.concat([createSizeBuffer(str3.length, endian, undefined), Buffer.from(str3)]);
            const sizeBuffer = createSizeBuffer(3, endian, undefined);
            const buffer = Buffer.concat([sizeBuffer, buffer1, buffer2, buffer3]);
            // decode the buffer
            const result = decodeData({ typeIndex: "0x70", size: 4 }, buffer, 0, endian);
            expect(result).toEqual([str1, str2, str3]);
        })

        it("bad: try to read 4 strings in a 3-string buffer, reach beyond buffer boundary", () => {
            // create buffer for test
            const str1 = "This is TCA";
            const str2 = "It is awesome";
            const str3 = "Yes, it is.";
            const endian = ENDIAN.LITTLE;
            const buffer1 = Buffer.concat([createSizeBuffer(str1.length, endian, undefined), Buffer.from(str1)]);
            const buffer2 = Buffer.concat([createSizeBuffer(str2.length, endian, undefined), Buffer.from(str2)]);
            const buffer3 = Buffer.concat([createSizeBuffer(str3.length, endian, undefined), Buffer.from(str3)]);
            const sizeBuffer = createSizeBuffer(4, endian, undefined);
            const buffer = Buffer.concat([sizeBuffer, buffer1, buffer2, buffer3]);
            // decode the buffer
            expect(() => { decodeData({ typeIndex: "0x70", size: 4 }, buffer, 0, endian) }).toThrow();
        })

        it("bad: string array size larger than bound size", () => {
            // create buffer for test
            const str1 = "This is TCA";
            const str2 = "It is awesome";
            const str3 = "Yes, it is.";
            const endian = ENDIAN.BIG;
            const buffer1 = Buffer.concat([createSizeBuffer(str1.length, endian, undefined), Buffer.from(str1)]);
            const buffer2 = Buffer.concat([createSizeBuffer(str2.length, endian, undefined), Buffer.from(str2)]);
            const buffer3 = Buffer.concat([createSizeBuffer(str3.length, endian, undefined), Buffer.from(str3)]);
            const sizeBuffer = createSizeBuffer(3, endian, undefined);
            const buffer = Buffer.concat([sizeBuffer, buffer1, buffer2, buffer3]);
            // decode the buffer
            expect(() => { decodeData({ typeIndex: "0x70", size: 2 }, buffer, 0, endian) }).toThrow();
        })
    })

    describe("string_variableSizeArray, 0x68", () => {
        it("good", () => {
            // create buffer for test
            const str1 = "This is TCA";
            const str2 = "It is awesome";
            const str3 = "Yes, it is.";
            const endian = ENDIAN.BIG;
            const buffer1 = Buffer.concat([createSizeBuffer(str1.length, endian, undefined), Buffer.from(str1)]);
            const buffer2 = Buffer.concat([createSizeBuffer(str2.length, endian, undefined), Buffer.from(str2)]);
            const buffer3 = Buffer.concat([createSizeBuffer(str3.length, endian, undefined), Buffer.from(str3)]);
            const sizeBuffer = createSizeBuffer(3, endian, undefined);
            const buffer = Buffer.concat([sizeBuffer, buffer1, buffer2, buffer3]);
            // decode the buffer
            const result = decodeData({ typeIndex: "0x68" }, buffer, 0, endian);
            expect(result).toEqual([str1, str2, str3]);
        })

        it("good, little endian", () => {
            // create buffer for test
            const str1 = "This is TCA";
            const str2 = "It is awesome";
            const str3 = "Yes, it is.";
            const endian = ENDIAN.LITTLE;
            const buffer1 = Buffer.concat([createSizeBuffer(str1.length, endian, undefined), Buffer.from(str1)]);
            const buffer2 = Buffer.concat([createSizeBuffer(str2.length, endian, undefined), Buffer.from(str2)]);
            const buffer3 = Buffer.concat([createSizeBuffer(str3.length, endian, undefined), Buffer.from(str3)]);
            const sizeBuffer = createSizeBuffer(3, endian, undefined);
            const buffer = Buffer.concat([sizeBuffer, buffer1, buffer2, buffer3]);
            // decode the buffer
            const result = decodeData({ typeIndex: "0x68" }, buffer, 0, endian);
            expect(result).toEqual([str1, str2, str3]);
        })

        it("good: read 2 strings in a 3 string buffer", () => {
            // create buffer for test
            const str1 = "This is TCA";
            const str2 = "It is awesome";
            const str3 = "Yes, it is.";
            const endian = ENDIAN.LITTLE;
            const buffer1 = Buffer.concat([createSizeBuffer(str1.length, endian, undefined), Buffer.from(str1)]);
            const buffer2 = Buffer.concat([createSizeBuffer(str2.length, endian, undefined), Buffer.from(str2)]);
            const buffer3 = Buffer.concat([createSizeBuffer(str3.length, endian, undefined), Buffer.from(str3)]);
            const sizeBuffer = createSizeBuffer(3 - 1, endian, undefined);
            const buffer = Buffer.concat([sizeBuffer, buffer1, buffer2, buffer3]);
            // decode the buffer
            const result = decodeData({ typeIndex: "0x68" }, buffer, 0, endian);
            expect(result).toEqual([str1, str2]);
        })

        it("bad: read 4 strings in a 3 string buffer", () => {
            // create buffer for test
            const str1 = "This is TCA";
            const str2 = "It is awesome";
            const str3 = "Yes, it is.";
            const endian = ENDIAN.LITTLE;
            const buffer1 = Buffer.concat([createSizeBuffer(str1.length, endian, undefined), Buffer.from(str1)]);
            const buffer2 = Buffer.concat([createSizeBuffer(str2.length, endian, undefined), Buffer.from(str2)]);
            const buffer3 = Buffer.concat([createSizeBuffer(str3.length, endian, undefined), Buffer.from(str3)]);
            const sizeBuffer = createSizeBuffer(3 + 1, endian, undefined);
            const buffer = Buffer.concat([sizeBuffer, buffer1, buffer2, buffer3]);
            // decode the buffer
            expect(() => { decodeData({ typeIndex: "0x68" }, buffer, 0, endian) }).toThrow();
        })
    })

    describe("string_scalar, 0x60", () => {
        it("good", () => {
            // create buffer to decode
            const str = "This is TCA";
            const size = str.length;
            const endian = ENDIAN.BIG;
            const sizeBuffer = createSizeBuffer(size, endian, undefined);
            const strBuffer = Buffer.from(str);
            const buffer = Buffer.concat([sizeBuffer, strBuffer]);
            // decode the data
            const result = decodeData({ typeIndex: "0x60" }, buffer, 0, endian);
            expect(result).toBe(str);
        })

        it("good, little endian", () => {
            // create buffer to decode
            const str = "This is TCA";
            const size = str.length;
            const endian = ENDIAN.LITTLE;
            const sizeBuffer = createSizeBuffer(size, endian, undefined);
            const strBuffer = Buffer.from(str);
            const buffer = Buffer.concat([sizeBuffer, strBuffer]);
            // decode the data
            const result = decodeData({ typeIndex: "0x60" }, buffer, 0, endian);
            expect(result).toBe(str);
        })

        it("bad: size larger than buffer limit", () => {
            // create buffer to decode
            const str = "This is TCA";
            const size = str.length;
            const endian = ENDIAN.LITTLE;
            const sizeBuffer = createSizeBuffer(size + 2, endian, undefined); // will read "This is TCA" + 2 more bytes
            const strBuffer = Buffer.from(str);
            const buffer = Buffer.concat([sizeBuffer, strBuffer]);
            // decode the data
            expect(() => { decodeData({ typeIndex: "0x60" }, buffer, 0, endian) }).toThrow();
        })
    })




    describe("number fixed/bounded size array, 0x5b/5a,53/52/3f--30/", () => {
        it("normal case", () => {
            const endian = ENDIAN.BIG;
            const types = [
                { typeIndex: "0x5b", size: 0x03 },
                { typeIndex: "0x5a", size: 0x03 },
                { typeIndex: "0x53", size: 0x03 },
                { typeIndex: "0x52", size: 0x03 },
                { typeIndex: "0x3f", size: 0x03 },
                { typeIndex: "0x3e", size: 0x03 },
                { typeIndex: "0x3d", size: 0x03 },
                { typeIndex: "0x3c", size: 0x03 },
                { typeIndex: "0x3b", size: 0x03 },
                { typeIndex: "0x3a", size: 0x03 },
                { typeIndex: "0x39", size: 0x03 },
                { typeIndex: "0x38", size: 0x03 },
                { typeIndex: "0x37", size: 0x03 },
                { typeIndex: "0x36", size: 0x03 },
                { typeIndex: "0x35", size: 0x03 },
                { typeIndex: "0x34", size: 0x03 },
                { typeIndex: "0x33", size: 0x03 },
                { typeIndex: "0x32", size: 0x03 },
                { typeIndex: "0x31", size: 0x03 },
                { typeIndex: "0x30", size: 0x03 },
            ];
            const datas = [
                [3.14, 2.71, 42],
                [3.14000010490417480, 2.7100000381469727, 42],
                [3.14, 2.71, 42],
                [3.14000010490417480, 2.7100000381469727, 42],
                [3n, 2n, 42n],
                [3, 2, 42],
                [3, 2, 42],
                [3, 2, 42],
                [3n, 2n, 42n],
                [3, 2, 42],
                [3, 2, 42],
                [3, 2, 42],
                [3n, 2n, 42n],
                [3, 2, 42],
                [3, 2, 42],
                [3, 2, 42],
                [3n, 2n, 42n],
                [3, 2, 42],
                [3, 2, 42],
                [3, 2, 42],
            ];
            const bufferArrays = [
                [0x40, 0x09, 0x1E, 0xB8, 0x51, 0xEB, 0x85, 0x1F, 0x40, 0x05, 0xAE, 0x14, 0x7A, 0xE1, 0x47, 0xAE, 0x40, 0x45, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,],
                [0x40, 0x48, 0xf5, 0xc3, 0x40, 0x2d, 0x70, 0xa4, 0x42, 0x28, 0x00, 0x00],
                [0x03, 0x40, 0x09, 0x1E, 0xB8, 0x51, 0xEB, 0x85, 0x1F, 0x40, 0x05, 0xAE, 0x14, 0x7A, 0xE1, 0x47, 0xAE, 0x40, 0x45, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,],
                [0x03, 0x40, 0x48, 0xf5, 0xc3, 0x40, 0x2d, 0x70, 0xa4, 0x42, 0x28, 0x00, 0x00],
                [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x2a],
                [0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x2a],
                [0x00, 0x03, 0x00, 0x02, 0x00, 0x2a],
                [0x03, 0x02, 0x2a],
                [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x2a],
                [0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x2a],
                [0x00, 0x03, 0x00, 0x02, 0x00, 0x2a],
                [0x03, 0x02, 0x2a],
                [0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x2a],
                [0x03, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x2a],
                [0x03, 0x00, 0x03, 0x00, 0x02, 0x00, 0x2a],
                [0x03, 0x03, 0x02, 0x2a],
                [0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x2a],
                [0x03, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x2a],
                [0x03, 0x00, 0x03, 0x00, 0x02, 0x00, 0x2a],
                [0x03, 0x03, 0x02, 0x2a],
            ];

            for (let ii = 0; ii < bufferArrays.length; ii++) {
                const type = types[ii];
                const bufferArray = bufferArrays[ii];
                const buffer = Buffer.from(bufferArray);
                const result = decodeData(type, buffer, 0, endian);
                expect(result).toEqual(datas[ii]);
            }

        })

        it("normal case -- with ID and TAG", () => {
            const endian = ENDIAN.BIG;
            const types = [
                { typeIndex: "0x5b", size: 0x03, id: 0x22, tag: 0x55 },
                { typeIndex: "0x5a", size: 0x03, id: 0x22, tag: 0x55 },
                { typeIndex: "0x53", size: 0x03, id: 0x22, tag: 0x55 },
                { typeIndex: "0x52", size: 0x03, id: 0x22, tag: 0x55 },
                { typeIndex: "0x3f", size: 0x03, id: 0x22, tag: 0x55 },
                { typeIndex: "0x3e", size: 0x03, id: 0x22, tag: 0x55 },
                { typeIndex: "0x3d", size: 0x03, id: 0x22, tag: 0x55 },
                { typeIndex: "0x3c", size: 0x03, id: 0x22, tag: 0x55 },
                { typeIndex: "0x3b", size: 0x03, id: 0x22, tag: 0x55 },
                { typeIndex: "0x3a", size: 0x03, id: 0x22, tag: 0x55 },
                { typeIndex: "0x39", size: 0x03, id: 0x22, tag: 0x55 },
                { typeIndex: "0x38", size: 0x03, id: 0x22, tag: 0x55 },
                { typeIndex: "0x37", size: 0x03, id: 0x22, tag: 0x55 },
                { typeIndex: "0x36", size: 0x03, id: 0x22, tag: 0x55 },
                { typeIndex: "0x35", size: 0x03, id: 0x22, tag: 0x55 },
                { typeIndex: "0x34", size: 0x03, id: 0x22, tag: 0x55 },
                { typeIndex: "0x33", size: 0x03, id: 0x22, tag: 0x55 },
                { typeIndex: "0x32", size: 0x03, id: 0x22, tag: 0x55 },
                { typeIndex: "0x31", size: 0x03, id: 0x22, tag: 0x55 },
                { typeIndex: "0x30", size: 0x03, id: 0x22, tag: 0x55 },
            ];
            const datas = [
                [3.14, 2.71, 42],
                [3.14000010490417480, 2.7100000381469727, 42],
                [3.14, 2.71, 42],
                [3.14000010490417480, 2.7100000381469727, 42],
                [3n, 2n, 42n],
                [3, 2, 42],
                [3, 2, 42],
                [3, 2, 42],
                [3n, 2n, 42n],
                [3, 2, 42],
                [3, 2, 42],
                [3, 2, 42],
                [3n, 2n, 42n],
                [3, 2, 42],
                [3, 2, 42],
                [3, 2, 42],
                [3n, 2n, 42n],
                [3, 2, 42],
                [3, 2, 42],
                [3, 2, 42],
            ];
            const bufferArrays = [
                [0x40, 0x09, 0x1E, 0xB8, 0x51, 0xEB, 0x85, 0x1F, 0x40, 0x05, 0xAE, 0x14, 0x7A, 0xE1, 0x47, 0xAE, 0x40, 0x45, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,],
                [0x40, 0x48, 0xf5, 0xc3, 0x40, 0x2d, 0x70, 0xa4, 0x42, 0x28, 0x00, 0x00],
                [0x03, 0x40, 0x09, 0x1E, 0xB8, 0x51, 0xEB, 0x85, 0x1F, 0x40, 0x05, 0xAE, 0x14, 0x7A, 0xE1, 0x47, 0xAE, 0x40, 0x45, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,],
                [0x03, 0x40, 0x48, 0xf5, 0xc3, 0x40, 0x2d, 0x70, 0xa4, 0x42, 0x28, 0x00, 0x00],
                [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x2a],
                [0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x2a],
                [0x00, 0x03, 0x00, 0x02, 0x00, 0x2a],
                [0x03, 0x02, 0x2a],
                [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x2a],
                [0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x2a],
                [0x00, 0x03, 0x00, 0x02, 0x00, 0x2a],
                [0x03, 0x02, 0x2a],
                [0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x2a],
                [0x03, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x2a],
                [0x03, 0x00, 0x03, 0x00, 0x02, 0x00, 0x2a],
                [0x03, 0x03, 0x02, 0x2a],
                [0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x2a],
                [0x03, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x2a],
                [0x03, 0x00, 0x03, 0x00, 0x02, 0x00, 0x2a],
                [0x03, 0x03, 0x02, 0x2a],
            ];

            for (let ii = 0; ii < datas.length; ii++) {
                const type = types[ii];
                const bufferArray = bufferArrays[ii];
                const buffer = Buffer.from(bufferArray);
                const result = decodeData(type, buffer, 0, endian);
                expect(result).toEqual(datas[ii]);
            }

        })

        it("normal case -- negative numbers", () => {
            const endian = ENDIAN.BIG;
            const types = [
                { typeIndex: "0x5b", size: 0x03 },
                { typeIndex: "0x5a", size: 0x03 },
                { typeIndex: "0x53", size: 0x03 },
                { typeIndex: "0x52", size: 0x03 },
                { typeIndex: "0x3f", size: 0x03 }, // negative number not allowed
                { typeIndex: "0x3e", size: 0x03 }, // negative number not allowed
                { typeIndex: "0x3d", size: 0x03 }, // negative number not allowed
                { typeIndex: "0x3c", size: 0x03 }, // negative number not allowed
                { typeIndex: "0x3b", size: 0x03 },
                { typeIndex: "0x3a", size: 0x03 },
                { typeIndex: "0x39", size: 0x03 },
                { typeIndex: "0x38", size: 0x03 },
                { typeIndex: "0x37", size: 0x03 },// negative number not allowed
                { typeIndex: "0x36", size: 0x03 },// negative number not allowed
                { typeIndex: "0x35", size: 0x03 },// negative number not allowed
                { typeIndex: "0x34", size: 0x03 },// negative number not allowed
                { typeIndex: "0x33", size: 0x03 },
                { typeIndex: "0x32", size: 0x03 },
                { typeIndex: "0x31", size: 0x03 },
                { typeIndex: "0x30", size: 0x03 },
            ];
            const datas = [
                [-3.14, -2.71, -42],
                [-3.14000010490417480, -2.7100000381469727, -42],
                [-3.14, -2.71, -42],
                [-3.14000010490417480, -2.7100000381469727, -42],
                [-3n, -2n, -42n], // negative number not allowed
                [-3, -2, -42], // negative number not allowed
                [-3, -2, -42], // negative number not allowed
                [-3, -2, -42], // negative number not allowed
                [-3n, -2n, -42n],
                [-3, -2, -42],
                [-3, -2, -42],
                [-3, -2, -42],
                [-3n, -2n, -42n], // negative number not allowed
                [-3, -2, -42], // negative number not allowed
                [-3, -2, -42], // negative number not allowed
                [-3, -2, -42], // negative number not allowed
                [-3n, -2n, -42n],
                [-3, -2, -42],
                [-3, -2, -42],
                [-3, -2, -42],
            ];

            const bufferArrays = [
                [0xC0, 0x09, 0x1E, 0xB8, 0x51, 0xEB, 0x85, 0x1F, 0xC0, 0x05, 0xAE, 0x14, 0x7A, 0xE1, 0x47, 0xAE, 0xC0, 0x45, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
                [0xc0, 0x48, 0xf5, 0xc3, 0xc0, 0x2d, 0x70, 0xa4, 0xc2, 0x28, 0x00, 0x00],
                [0x03, 0xC0, 0x09, 0x1E, 0xB8, 0x51, 0xEB, 0x85, 0x1F, 0xC0, 0x05, 0xAE, 0x14, 0x7A, 0xE1, 0x47, 0xAE, 0xC0, 0x45, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
                [0x03, 0xc0, 0x48, 0xf5, 0xc3, 0xc0, 0x2d, 0x70, 0xa4, 0xc2, 0x28, 0x00, 0x00],
                [],  // negative number not allowed
                [],  // negative number not allowed
                [],  // negative number not allowed
                [],  // negative number not allowed
                [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfd, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfe, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xd6,],
                [0xff, 0xff, 0xff, 0xfd, 0xff, 0xff, 0xff, 0xfe, 0xff, 0xff, 0xff, 0xd6,],
                [0xff, 0xfd, 0xff, 0xfe, 0xff, 0xd6,],
                [0xfd, 0xfe, 0xd6,],
                [], // negative number not allowed
                [], // negative number not allowed
                [], // negative number not allowed
                [], // negative number not allowed
                [0x03, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfd, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfe, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xd6,],
                [0x03, 0xff, 0xff, 0xff, 0xfd, 0xff, 0xff, 0xff, 0xfe, 0xff, 0xff, 0xff, 0xd6,],
                [0x03, 0xff, 0xfd, 0xff, 0xfe, 0xff, 0xd6,],
                [0x03, 0xfd, 0xfe, 0xd6,],
            ];

            for (let ii = 0; ii < datas.length; ii++) {
                const type = types[ii];
                const data = datas[ii];
                const bufferArray = bufferArrays[ii];
                const buffer = Buffer.from(bufferArray);
                if (type["typeIndex"] === "0x3f" || type["typeIndex"] === "0x3e" || type["typeIndex"] === "0x3d" || type["typeIndex"] === "0x3c" ||
                    type["typeIndex"] === "0x37" || type["typeIndex"] === "0x36" || type["typeIndex"] === "0x35" || type["typeIndex"] === "0x34"
                ) {
                    expect(() => { decodeData(type, buffer, 0, endian) }).toThrow();
                } else {
                    const result = decodeData(type, buffer, 0, endian);
                    expect(result).toEqual(data);
                }
            }

        })

        it("failed case -- buffer does not include all data", () => {
            const endian = ENDIAN.BIG;
            const types = [
                { typeIndex: "0x5b", size: 0x03 },
                { typeIndex: "0x5a", size: 0x03 },
                { typeIndex: "0x53", size: 0x03 },
                { typeIndex: "0x52", size: 0x03 },
                { typeIndex: "0x3f", size: 0x03 },
                { typeIndex: "0x3e", size: 0x03 },
                { typeIndex: "0x3d", size: 0x03 },
                { typeIndex: "0x3c", size: 0x03 },
                { typeIndex: "0x3b", size: 0x03 },
                { typeIndex: "0x3a", size: 0x03 },
                { typeIndex: "0x39", size: 0x03 },
                { typeIndex: "0x38", size: 0x03 },
                { typeIndex: "0x37", size: 0x03 },
                { typeIndex: "0x36", size: 0x03 },
                { typeIndex: "0x35", size: 0x03 },
                { typeIndex: "0x34", size: 0x03 },
                { typeIndex: "0x33", size: 0x03 },
                { typeIndex: "0x32", size: 0x03 },
                { typeIndex: "0x31", size: 0x03 },
                { typeIndex: "0x30", size: 0x03 },
            ];
            const datas = [
                [3.14, 2.71, 42],
                [3.14000010490417480, 2.7100000381469727, 42],
                [3.14, 2.71, 42],
                [3.14000010490417480, 2.7100000381469727, 42],
                [3n, 2n, 42n],
                [3, 2, 42],
                [3, 2, 42],
                [3, 2, 42],
                [3n, 2n, 42n],
                [3, 2, 42],
                [3, 2, 42],
                [3, 2, 42],
                [3n, 2n, 42n],
                [3, 2, 42],
                [3, 2, 42],
                [3, 2, 42],
                [3n, 2n, 42n],
                [3, 2, 42],
                [3, 2, 42],
                [3, 2, 42],
            ];
            const bufferArrays = [
                [0x40, 0x09, 0x1E, 0xB8, 0x51, 0xEB, 0x85, 0x1F, 0x40, 0x05, 0xAE, 0x14, 0x7A, 0xE1, 0x47, 0xAE, 0x40, 0x45, 0x00, 0x00, 0x00, 0x00, 0x00,],
                [0x40, 0x48, 0xf5, 0xc3, 0x40, 0x2d, 0x70, 0xa4, 0x42, 0x28, 0x00,],
                [0x03, 0x40, 0x09, 0x1E, 0xB8, 0x51, 0xEB, 0x85, 0x1F, 0x40, 0x05, 0xAE, 0x14, 0x7A, 0xE1, 0x47, 0xAE, 0x40, 0x45, 0x00, 0x00, 0x00, 0x00, 0x00,],
                [0x03, 0x40, 0x48, 0xf5, 0xc3, 0x40, 0x2d, 0x70, 0xa4, 0x42, 0x28, 0x00,],
                [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,],
                [0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00,],
                [0x00, 0x03, 0x00, 0x02, 0x00,],
                [0x03, 0x02,],
                [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,],
                [0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00,],
                [0x00, 0x03, 0x00, 0x02, 0x00,],
                [0x03, 0x02,],
                [0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,],
                [0x03, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00,],
                [0x03, 0x00, 0x03, 0x00, 0x02, 0x00,],
                [0x03, 0x03, 0x02,],
                [0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,],
                [0x03, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00,],
                [0x03, 0x00, 0x03, 0x00, 0x02, 0x00,],
                [0x03, 0x03, 0x02,],
            ];

            for (let ii = 0; ii < bufferArrays.length; ii++) {
                const type = types[ii];
                const bufferArray = bufferArrays[ii];
                const buffer = Buffer.from(bufferArray);
                expect(() => { decodeData(type, buffer, 0, endian) }).toThrow();
            }

        })
    })

    describe("floatingPoint_fixedSizeArray_binary64, 0x5b -- already covered", () => {

    })

    describe("floatingPoint_fixedSizeArray_binary32, 0x5a -- already covered", () => {

    })

    describe("floatingPoint_boundedSizeArray_binary64, 0x53 -- already covered", () => {

    })

    describe("floatingPoint_boundedSizeArray_binary32, 0x52 -- already covered", () => {

    })


    describe("number variable size array and scalar numbers, 0x4b/4a/43/42/2f--20", () => {

        it("normal case", () => {
            const endian = ENDIAN.BIG;
            const types = [
                { typeIndex: "0x4b" },
                { typeIndex: "0x4a" },
                { typeIndex: "0x43" },
                { typeIndex: "0x42" },
                { typeIndex: "0x2f" },
                { typeIndex: "0x2e" },
                { typeIndex: "0x2d" },
                { typeIndex: "0x2c" },
                { typeIndex: "0x2b" },
                { typeIndex: "0x2a" },
                { typeIndex: "0x29" },
                { typeIndex: "0x28" },
                { typeIndex: "0x27" },
                { typeIndex: "0x26" },
                { typeIndex: "0x25" },
                { typeIndex: "0x24" },
                { typeIndex: "0x23" },
                { typeIndex: "0x22" },
                { typeIndex: "0x21" },
                { typeIndex: "0x20" },
            ];
            const datas = [
                [3.14, 2.71, 42],
                [3.140000104904175, 2.7100000381469727, 42],
                3.14,
                3.140000104904175,
                [3n, 2n, 42n],
                [3, 2, 42],
                [3, 2, 42],
                [3, 2, 42],
                [3n, 2n, 42n],
                [3, 2, 42],
                [3, 2, 42],
                [3, 2, 42],
                3n,
                3,
                3,
                3,
                3n,
                3,
                3,
                3,
            ];
            const bufferArrays = [
                [0x03, 0x40, 0x09, 0x1E, 0xB8, 0x51, 0xEB, 0x85, 0x1F, 0x40, 0x05, 0xAE, 0x14, 0x7A, 0xE1, 0x47, 0xAE, 0x40, 0x45, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,],
                [0x03, 0x40, 0x48, 0xf5, 0xc3, 0x40, 0x2d, 0x70, 0xa4, 0x42, 0x28, 0x00, 0x00],
                [0x40, 0x09, 0x1E, 0xB8, 0x51, 0xEB, 0x85, 0x1F,],
                [0x40, 0x48, 0xf5, 0xc3,],
                [0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x2a],
                [0x03, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x2a],
                [0x03, 0x00, 0x03, 0x00, 0x02, 0x00, 0x2a],
                [0x03, 0x03, 0x02, 0x2a],
                [0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x2a],
                [0x03, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x2a],
                [0x03, 0x00, 0x03, 0x00, 0x02, 0x00, 0x2a],
                [0x03, 0x03, 0x02, 0x2a],

                [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03,],
                [0x00, 0x00, 0x00, 0x03,],
                [0x00, 0x03,],
                [0x03,],
                [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03,],
                [0x00, 0x00, 0x00, 0x03,],
                [0x00, 0x03,],
                [0x03,],
            ];

            for (let ii = 0; ii < datas.length; ii++) {
                const type = types[ii];
                const data = datas[ii];
                const bufferArray = bufferArrays[ii];
                const buffer = Buffer.from(bufferArray);
                const result = decodeData(type, buffer, 0, endian);
                expect(result).toEqual(data);
            }

        })

        it("normal case -- with ID and TAG", () => {
            const endian = ENDIAN.BIG;
            const types = [
                { typeIndex: "0x4b", id: 33, tag: 22 },
                { typeIndex: "0x4a", id: 33, tag: 22 },
                { typeIndex: "0x43", id: 33, tag: 22 },
                { typeIndex: "0x42", id: 33, tag: 22 },
                { typeIndex: "0x2f", id: 33, tag: 22 },
                { typeIndex: "0x2e", id: 33, tag: 22 },
                { typeIndex: "0x2d", id: 33, tag: 22 },
                { typeIndex: "0x2c", id: 33, tag: 22 },
                { typeIndex: "0x2b", id: 33, tag: 22 },
                { typeIndex: "0x2a", id: 33, tag: 22 },
                { typeIndex: "0x29", id: 33, tag: 22 },
                { typeIndex: "0x28", id: 33, tag: 22 },
                { typeIndex: "0x27", id: 33, tag: 22 },
                { typeIndex: "0x26", id: 33, tag: 22 },
                { typeIndex: "0x25", id: 33, tag: 22 },
                { typeIndex: "0x24", id: 33, tag: 22 },
                { typeIndex: "0x23", id: 33, tag: 22 },
                { typeIndex: "0x22", id: 33, tag: 22 },
                { typeIndex: "0x21", id: 33, tag: 22 },
                { typeIndex: "0x20", id: 33, tag: 22 },
            ];
            const datas = [
                [3.14, 2.71, 42],
                [3.140000104904175, 2.7100000381469727, 42],
                3.14,
                3.140000104904175,
                [3n, 2n, 42n],
                [3, 2, 42],
                [3, 2, 42],
                [3, 2, 42],
                [3n, 2n, 42n],
                [3, 2, 42],
                [3, 2, 42],
                [3, 2, 42],
                3n,
                3,
                3,
                3,
                3n,
                3,
                3,
                3,
            ];
            const bufferArrays = [
                [0x03, 0x40, 0x09, 0x1E, 0xB8, 0x51, 0xEB, 0x85, 0x1F, 0x40, 0x05, 0xAE, 0x14, 0x7A, 0xE1, 0x47, 0xAE, 0x40, 0x45, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,],
                [0x03, 0x40, 0x48, 0xf5, 0xc3, 0x40, 0x2d, 0x70, 0xa4, 0x42, 0x28, 0x00, 0x00],
                [0x40, 0x09, 0x1E, 0xB8, 0x51, 0xEB, 0x85, 0x1F,],
                [0x40, 0x48, 0xf5, 0xc3,],
                [0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x2a],
                [0x03, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x2a],
                [0x03, 0x00, 0x03, 0x00, 0x02, 0x00, 0x2a],
                [0x03, 0x03, 0x02, 0x2a],
                [0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x2a],
                [0x03, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x2a],
                [0x03, 0x00, 0x03, 0x00, 0x02, 0x00, 0x2a],
                [0x03, 0x03, 0x02, 0x2a],

                [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03,],
                [0x00, 0x00, 0x00, 0x03,],
                [0x00, 0x03,],
                [0x03,],
                [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03,],
                [0x00, 0x00, 0x00, 0x03,],
                [0x00, 0x03,],
                [0x03,],
            ];

            for (let ii = 0; ii < datas.length; ii++) {
                const type = types[ii];
                const data = datas[ii];
                const bufferArray = bufferArrays[ii];
                const buffer = Buffer.from(bufferArray);
                const result = decodeData(type, buffer, 0, endian);
                expect(result).toEqual(data);
            }

        })


        it("normal case -- negative numbers", () => {
            const endian = ENDIAN.BIG;
            const types = [
                { typeIndex: "0x4b", id: 33, tag: 22 },
                { typeIndex: "0x4a", id: 33, tag: 22 },
                { typeIndex: "0x43", id: 33, tag: 22 },
                { typeIndex: "0x42", id: 33, tag: 22 },
                { typeIndex: "0x2f", id: 33, tag: 22 }, // negative number not allowed
                { typeIndex: "0x2e", id: 33, tag: 22 }, // negative number not allowed
                { typeIndex: "0x2d", id: 33, tag: 22 }, // negative number not allowed
                { typeIndex: "0x2c", id: 33, tag: 22 }, // negative number not allowed
                { typeIndex: "0x2b", id: 33, tag: 22 },
                { typeIndex: "0x2a", id: 33, tag: 22 },
                { typeIndex: "0x29", id: 33, tag: 22 },
                { typeIndex: "0x28", id: 33, tag: 22 },
                { typeIndex: "0x27", id: 33, tag: 22 }, // negative number not allowed
                { typeIndex: "0x26", id: 33, tag: 22 }, // negative number not allowed
                { typeIndex: "0x25", id: 33, tag: 22 }, // negative number not allowed
                { typeIndex: "0x24", id: 33, tag: 22 }, // negative number not allowed
                { typeIndex: "0x23", id: 33, tag: 22 },
                { typeIndex: "0x22", id: 33, tag: 22 },
                { typeIndex: "0x21", id: 33, tag: 22 },
                { typeIndex: "0x20", id: 33, tag: 22 },
            ];
            const datas = [
                [-3.14, -2.71, -42],
                [-3.140000104904175, -2.7100000381469727, -42],
                -3.14,
                -3.140000104904175,
                [-3n, -2n, -42n],  // negative number not allowed
                [-3, -2, -42],  // negative number not allowed
                [-3, -2, -42],  // negative number not allowed
                [-3, -2, -42],  // negative number not allowed
                [-3n, -2n, -42n],
                [-3, -2, -42],
                [-3, -2, -42],
                [-3, -2, -42],
                -3n,  // negative number not allowed
                -3,  // negative number not allowed
                -3,  // negative number not allowed
                -3,  // negative number not allowed
                -3n,
                -3,
                -3,
                -3,
            ];
            const bufferArrays = [
                [0x03, 0xC0, 0x09, 0x1E, 0xB8, 0x51, 0xEB, 0x85, 0x1F, 0xC0, 0x05, 0xAE, 0x14, 0x7A, 0xE1, 0x47, 0xAE, 0xC0, 0x45, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
                [0x03, 0xc0, 0x48, 0xf5, 0xc3, 0xc0, 0x2d, 0x70, 0xa4, 0xc2, 0x28, 0x00, 0x00],
                [0xC0, 0x09, 0x1E, 0xB8, 0x51, 0xEB, 0x85, 0x1F,],
                [0xc0, 0x48, 0xf5, 0xc3,],
                [],  // negative number not allowed
                [],  // negative number not allowed
                [],  // negative number not allowed
                [],  // negative number not allowed
                [0x03, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfd, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfe, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xd6,],
                [0x03, 0xff, 0xff, 0xff, 0xfd, 0xff, 0xff, 0xff, 0xfe, 0xff, 0xff, 0xff, 0xd6,],
                [0x03, 0xff, 0xfd, 0xff, 0xfe, 0xff, 0xd6,],
                [0x03, 0xfd, 0xfe, 0xd6,],
                [], // negative number not allowed
                [], // negative number not allowed
                [], // negative number not allowed
                [], // negative number not allowed
                [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfd,],
                [0xff, 0xff, 0xff, 0xfd,],
                [0xff, 0xfd,],
                [0xfd,],
            ];

            for (let ii = 0; ii < datas.length; ii++) {
                const type = types[ii];
                const data = datas[ii];
                const bufferArray = bufferArrays[ii];
                const buffer = Buffer.from(bufferArray);
                if (type["typeIndex"] === "0x4b" || type["typeIndex"] === "0x4a" || type["typeIndex"] === "0x43" || type["typeIndex"] === "0x42" ||
                    type["typeIndex"] === "0x2b" || type["typeIndex"] === "0x2a" || type["typeIndex"] === "0x29" || type["typeIndex"] === "0x28" ||
                    type["typeIndex"] === "0x23" || type["typeIndex"] === "0x22" || type["typeIndex"] === "0x21" || type["typeIndex"] === "0x20"
                ) {
                    const result = decodeData(type, buffer, 0, endian);
                    expect(result).toEqual(data);
                }
            }

        })


        it("failed case -- buffer not containing all data", () => {
            const endian = ENDIAN.BIG;
            const types = [
                { typeIndex: "0x4b" },
                { typeIndex: "0x4a" },
                { typeIndex: "0x43" },
                { typeIndex: "0x42" },
                { typeIndex: "0x2f" },
                { typeIndex: "0x2e" },
                { typeIndex: "0x2d" },
                { typeIndex: "0x2c" },
                { typeIndex: "0x2b" },
                { typeIndex: "0x2a" },
                { typeIndex: "0x29" },
                { typeIndex: "0x28" },
                { typeIndex: "0x27" },
                { typeIndex: "0x26" },
                { typeIndex: "0x25" },
                { typeIndex: "0x24" },
                { typeIndex: "0x23" },
                { typeIndex: "0x22" },
                { typeIndex: "0x21" },
                { typeIndex: "0x20" },
            ];
            const datas = [
                [3.14, 2.71, 42],
                [3.140000104904175, 2.7100000381469727, 42],
                3.14,
                3.140000104904175,
                [3n, 2n, 42n],
                [3, 2, 42],
                [3, 2, 42],
                [3, 2, 42],
                [3n, 2n, 42n],
                [3, 2, 42],
                [3, 2, 42],
                [3, 2, 42],
                3n,
                3,
                3,
                3,
                3n,
                3,
                3,
                3,
            ];
            const bufferArrays = [
                [0x03, 0x40, 0x09, 0x1E, 0xB8, 0x51, 0xEB, 0x85, 0x1F, 0x40, 0x05, 0xAE, 0x14, 0x7A, 0xE1, 0x47, 0xAE, 0x40, 0x45, 0x00, 0x00, 0x00, 0x00, 0x00,],
                [0x03, 0x40, 0x48, 0xf5, 0xc3, 0x40, 0x2d, 0x70, 0xa4, 0x42, 0x28, 0x00],
                [0x40, 0x09, 0x1E, 0xB8, 0x51, 0xEB, 0x85,],
                [0x40, 0x48, 0xf5,],
                [0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,],
                [0x03, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00,],
                [0x03, 0x00, 0x03, 0x00, 0x02, 0x00,],
                [0x03, 0x03, 0x02,],
                [0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,],
                [0x03, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00,],
                [0x03, 0x00, 0x03, 0x00, 0x02, 0x00,],
                [0x03, 0x03, 0x02,],
                [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,],
                [0x00, 0x00, 0x00,],
                [0x00,],
                [],
                [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,],
                [0x00, 0x00, 0x00,],
                [0x00,],
                [],
            ];

            for (let ii = 0; ii < datas.length; ii++) {
                const type = types[ii];
                const data = datas[ii];
                const bufferArray = bufferArrays[ii];
                const buffer = Buffer.from(bufferArray);
                expect(() => { decodeData(type, buffer, 0, endian) }).toThrow();
            }

        })

    })


    it("floatingPoint_variableSizeArray_binary64, 0x4b -- already covered", () => {

    })

    it("floatingPoint_variableSizeArray_binary32, 0x4a -- already covered", () => {

    })

    describe("floatingPoint_scalar_binary64, 0x43 -- already covered", () => {
        it("good", () => {
            // create buffer to decode
            const num = 3.1415926;
            const buffer = Buffer.alloc(28); // more than enough
            buffer.writeDoubleBE(num);
            const endian = ENDIAN.BIG;
            // decode the buffer
            const result = decodeData({ typeIndex: "0x43" }, buffer, 0, endian);
            expect(result).toBe(num);
        })

        it("good, little endian", () => {
            // create buffer to decode
            const num = 3.1415926;
            const buffer = Buffer.alloc(28);
            buffer.writeDoubleLE(num);
            const endian = ENDIAN.LITTLE;
            // decode buffer
            const result = decodeData({ typeIndex: "0x43" }, buffer, 0, endian);
            expect(result).toBe(num);
        })

        it("bad, buffer too small", () => {
            // create buffer to decode
            const num = 3.1415926;
            const buffer = Buffer.alloc(28);
            buffer.writeDoubleLE(num);
            const endian = ENDIAN.LITTLE;
            // decode buffer
            expect(() => { decodeData({ typeIndex: "0x43" }, buffer.slice(0, 5), 0, endian) }).toThrow();
        })

    })

    describe("floatingPoint_scalar_binary32, 0x42 -- already covered", () => {
        it("good", () => {
            // create the buffer to decode
            const num = 3.1415926;
            const buffer = Buffer.alloc(14); // more than enough
            buffer.writeFloatBE(num);
            const endian = ENDIAN.BIG;
            // decode the buffer
            const result = decodeData({ typeIndex: "0x42" }, buffer, 0, endian);
            expect(result).toBe(3.141592502593994140625); // 3.1415926 cannot be precisely converted
        })

        it("good, little endian", () => {
            // create the buffer to decode
            const num = 3.1415926;
            const buffer = Buffer.alloc(14);
            buffer.writeFloatLE(num);
            const endian = ENDIAN.LITTLE;
            // decode the buffer
            const result = decodeData({ typeIndex: "0x42" }, buffer, 0, endian);
            expect(result).toBe(3.141592502593994140625); // 3.1415926 cannot be precisely converted
        })

        it("bad, buffer too small", () => {
            // create the buffer to decode
            const num = 3.1415926;
            const buffer = Buffer.alloc(14);
            buffer.writeFloatLE(num);
            const endian = ENDIAN.LITTLE;
            // decode the buffer
            expect(() => { decodeData({ typeIndex: "0x42" }, buffer.slice(0, 3), 0, endian) }).toThrow();
        })
    })

    describe("integer_fixedSizeArray_unsignedLong, 0x3f -- already covered", () => {
        it("good", () => {
            // create the buffer for test
            const num1 = BigInt(1234567);
            const num2 = BigInt(2345678);
            const num3 = BigInt(3456789);
            const buffer = Buffer.alloc(50); // more than enough
            buffer.writeBigUInt64BE(num1, 0);
            buffer.writeBigUInt64BE(num2, 8);
            buffer.writeBigUInt64BE(num3, 16);
            const endian = ENDIAN.BIG;
            // decode buffer
            const result = decodeData({ typeIndex: "0x3f", size: 3 }, buffer, 0, endian);
            expect(result).toEqual([num1, num2, num3]);
        })

        it("good, little endian", () => {
            // create the buffer for test
            const num1 = BigInt(1234567);
            const num2 = BigInt(2345678);
            const num3 = BigInt(3456789);
            const buffer = Buffer.alloc(50);
            buffer.writeBigUInt64LE(num1, 0);
            buffer.writeBigUInt64LE(num2, 8);
            buffer.writeBigUInt64LE(num3, 16);
            const endian = ENDIAN.LITTLE;
            // decode buffer
            const result = decodeData({ typeIndex: "0x3f", size: 3 }, buffer, 0, endian);
            expect(result).toEqual([num1, num2, num3]);
        })

        it("bad: size and actual size do not match", () => {
            // create the buffer for test
            const num1 = BigInt(1234567);
            const num2 = BigInt(2345678);
            const num3 = BigInt(3456789);
            const buffer = Buffer.alloc(24); // 3 numbers
            buffer.writeBigUInt64BE(num1, 0);
            buffer.writeBigUInt64BE(num2, 8);
            buffer.writeBigUInt64BE(num3, 16);
            const endian = ENDIAN.BIG;
            // decode buffer
            // try to decode 4 numbers from a 3-number buffer
            expect(() => { decodeData({ typeIndex: "0x3f", size: 4 }, buffer, 0, endian) }).toThrow();
        })
    })

    it("integer_fixedSizeArray_unsignedInt, 0x3e -- already covered", () => {

    })

    it("integer_fixedSizeArray_unsignedShort, 0x3d -- already covered", () => {

    })

    it("integer_fixedSizeArray_unsignedByte, 0x3c -- already covered", () => {

    })

    it("integer_fixedSizeArray_signedLong, 0x3b -- already covered", () => {

    })

    it("integer_fixedSizeArray_signedInt, 0x3a -- already covered", () => {

    })

    it("integer_fixedSizeArray_signedShort, 0x39 -- already covered", () => {

    })

    it("integer_fixedSizeArray_signedByte, 0x38 -- already covered", () => {

    })

    it("integer_boundedSizeArray_unsignedLong, 0x37 -- already covered", () => {

    })

    it("integer_boundedSizeArray_unsignedInt, 0x36 -- already covered", () => {

    })

    it("integer_boundedSizeArray_unsignedShort, 0x35 -- already covered", () => {

    })

    it("integer_boundedSizeArray_unsignedByte, 0x34 -- already covered", () => {

    })

    it("integer_boundedSizeArray_signedLong, 0x33 -- already covered", () => {

    })

    it("integer_boundedSizeArray_signedInt, 0x32 -- already covered", () => {

    })

    it("integer_boundedSizeArray_signedShort, 0x31 -- already covered", () => {

    })

    it("integer_boundedSizeArray_signedByte, 0x30 -- already covered", () => {

    })

    it("integer_variableSizeArray_unsignedLong, 0x2f -- already covered", () => {

    })

    it("integer_variableSizeArray_unsignedInt, 0x2e -- already covered", () => {

    })

    it("integer_variableSizeArray_unsignedShort, 0x2d -- already covered", () => {

    })

    it("integer_variableSizeArray_unsignedByte, 0x2c -- already covered", () => {

    })

    it("integer_variableSizeArray_signedLong, 0x2b -- already covered", () => {

    })

    it("integer_variableSizeArray_signedInt, 0x2a -- already covered", () => {

    })

    it("integer_variableSizeArray_signedShort, 0x29 -- already covered", () => {

    })

    it("integer_variableSizeArray_signedByte, 0x28 -- already covered", () => {

    })

    it("integer_scalar_unsignedLong, 0x27 -- already covered", () => {

    })

    it("integer_scalar_unsignedInt, 0x26 -- already covered", () => {

    })

    it("integer_scalar_unsignedShort, 0x25 -- already covered", () => {

    })

    it("integer_scalar_unsignedByte, 0x24 -- already covered", () => {

    })

    it("integer_scalar_signedLong, 0x23 -- already covered", () => {

    })

    it("integer_scalar_signedInt, 0x22 -- already covered", () => {

    })

    it("integer_scalar_signedShort, 0x21 -- already covered", () => {

    })

    it("integer_scalar_signedByte, 0x20 -- already covered", () => {

    })

    // todo -------------------- below -------------------

    describe("boolean_fixedSizeArray, 0x18", () => {

        it("good", () => {
            const bools = [true, false, false, false];
            const endian = ENDIAN.BIG;
            const bufferArray = [0x01, 0x00, 0x00, 0x00];
            const buffer = Buffer.from(bufferArray);
            const result = decodeData({ typeIndex: "0x18", size: 4 }, buffer, 0, endian);
            console.log(result)
            expect(result).toEqual(bools);
        })


        it("bad: actual size and type defined size do not match", () => {
            const bools = [true, false, false,];
            const endian = ENDIAN.BIG;
            const bufferArray = [0x01, 0x00, 0x00,];
            const buffer = Buffer.from(bufferArray);
            expect(() => { decodeData({ typeIndex: "0x18", size: 4 }, buffer, 0, endian) }).toThrow();
        })

    })

    describe("boolean_boundedSizeArray, 0x10", () => {
        it("good", () => {
            const bools = [true, false, false, false];
            const endian = ENDIAN.BIG;
            const bufferArray = [0x04, 0x01, 0x00, 0x00, 0x00];
            const buffer = Buffer.from(bufferArray);
            const result = decodeData({ typeIndex: "0x10", size: 30 }, buffer, 0, endian);
            expect(result).toEqual(bools);
        })

        it("failed case -- size overflow", () => {
            const bools = [true, false, false, false];
            const endian = ENDIAN.BIG;
            const bufferArray = [0x04, 0x01, 0x00, 0x00, 0x00];
            const buffer = Buffer.from(bufferArray);
            expect(() => { decodeData({ typeIndex: "0x10", size: 3 }, buffer, 0, endian) }).toThrow();
        })

        it("failed case -- buffer does not contain all data", () => {
            const bools = [true, false, false, false];
            const endian = ENDIAN.BIG;
            const bufferArray = [0x05, 0x01, 0x00, 0x00, 0x00]; // <-- there should be 5 data
            const buffer = Buffer.from(bufferArray);
            expect(() => { decodeData({ typeIndex: "0x10", size: 30 }, buffer, 0, endian) }).toThrow();
        })

    })

    describe("boolean_variableSizeArray, 0x8", () => {
        it("good", () => {
            const bools = [true, false, false, false];
            const endian = ENDIAN.BIG;
            const bufferArray = [0x04, 0x01, 0x00, 0x00, 0x00];
            const buffer = Buffer.from(bufferArray);
            const result = decodeData({ typeIndex: "0x8" }, buffer, 0, endian);
            expect(result).toEqual(bools);
        })

        it("failed case -- buffer does not contain all data", () => {
            const bools = [true, false, false, false];
            const endian = ENDIAN.BIG;
            const bufferArray = [0x04, 0x01, 0x00, 0x00]; // <-- there should be 4 data
            const buffer = Buffer.from(bufferArray);
            expect(() => {decodeData({ typeIndex: "0x8" }, buffer, 0, endian)}).toThrow();
        })


    })

    describe("boolean_scalar, 0x0", () => {
        it("good, true", () => {
            const bool = true;
            const endian = ENDIAN.BIG;
            const result = decodeData({ typeIndex: "0x0" }, Buffer.alloc(1, 1), 0, endian);
            expect(result).toBe(true);
        })

        it("good, false", () => {
            const bool = true;
            const endian = ENDIAN.BIG;
            const result = decodeData({ typeIndex: "0x0" }, Buffer.alloc(1), 0, endian);
            expect(result).toBe(false);
        })


    })

})


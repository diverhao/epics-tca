import { checkDataAndType, typeIndexEnum } from "../PvaData/PvaData_typeEncoding"
import { DataEncoder, encodeBitSets, encodeData } from "../PvaData/DataEncoder"
import { createSizeBuffer, encodeSize, ENDIAN } from "../PvaData/PvaMethods"


describe("DataEncoder.test", () => {

    describe("encode a BitSets array", () => {
        it("bitset, empty", () => {
            const bitSet: number[] = [];
            const bitSetBuffer = encodeBitSets(bitSet, ENDIAN.BIG);
            expect(bitSetBuffer.toJSON().data).toEqual([0]);
        })

        it("bitset, 1 element", () => {
            const bitSet: number[] = [0];
            const bitSetBuffer = encodeBitSets(bitSet, ENDIAN.BIG);
            expect(bitSetBuffer.toJSON().data).toEqual([1, 1]);
        })

        it("bitset, 1 element", () => {
            const bitSet: number[] = [1];
            const bitSetBuffer = encodeBitSets(bitSet, ENDIAN.BIG);
            expect(bitSetBuffer.toJSON().data).toEqual([1, 2]);
        })

        it("bitset, 1 element", () => {
            const bitSet: number[] = [7];
            const bitSetBuffer = encodeBitSets(bitSet, ENDIAN.BIG);
            expect(bitSetBuffer.toJSON().data).toEqual([1, 0x80]);
        })

        it("bitset, 1 element", () => {
            const bitSet: number[] = [8];
            const bitSetBuffer = encodeBitSets(bitSet, ENDIAN.BIG);
            expect(bitSetBuffer.toJSON().data).toEqual([2, 0, 1]);
        })

        it("bitset, 1 element", () => {
            const bitSet: number[] = [15];
            const bitSetBuffer = encodeBitSets(bitSet, ENDIAN.BIG);
            expect(bitSetBuffer.toJSON().data).toEqual([2, 0, 0x80]);
        })

        it("bitset, 1 element", () => {
            const bitSet: number[] = [55];
            const bitSetBuffer = encodeBitSets(bitSet, ENDIAN.BIG);
            expect(bitSetBuffer.toJSON().data).toEqual([7, 0, 0, 0, 0, 0, 0, 0x80]);
        })

        it("bitset, 1 element", () => {
            const bitSet: number[] = [56];
            const bitSetBuffer = encodeBitSets(bitSet, ENDIAN.BIG);
            expect(bitSetBuffer.toJSON().data).toEqual([8, 0, 0, 0, 0, 0, 0, 0, 1]);
        })

        it("bitset, 1 element", () => {
            const bitSet: number[] = [63];
            const bitSetBuffer = encodeBitSets(bitSet, ENDIAN.BIG);
            expect(bitSetBuffer.toJSON().data).toEqual([8, 0, 0, 0, 0, 0, 0, 0, 0x80]);
        })
        it("bitset, 1 element", () => {
            const bitSet: number[] = [64];
            const bitSetBuffer = encodeBitSets(bitSet, ENDIAN.BIG);
            expect(bitSetBuffer.toJSON().data).toEqual([9, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
        })

        it("bitset, 1 element", () => {
            const bitSet: number[] = [65];
            const bitSetBuffer = encodeBitSets(bitSet, ENDIAN.BIG);
            expect(bitSetBuffer.toJSON().data).toEqual([9, 0, 0, 0, 0, 0, 0, 0, 0, 2]);
        })

        it("bitset, 1 element", () => {
            const bitSet: number[] = [0, 1, 2, 4];
            const bitSetBuffer = encodeBitSets(bitSet, ENDIAN.BIG);
            expect(bitSetBuffer.toJSON().data).toEqual([1, 0x17]);
        })


        it("bitset, 1 element", () => {
            const bitSet: number[] = [0, 1, 2, 4, 8];
            const bitSetBuffer = encodeBitSets(bitSet, ENDIAN.BIG);
            expect(bitSetBuffer.toJSON().data).toEqual([2, 0x17, 1]);
        })

        it("bitset, 1 element", () => {
            const bitSet: number[] = [8, 17, 24, 25, 34, 40, 42, 49, 50];
            const bitSetBuffer = encodeBitSets(bitSet, ENDIAN.BIG);
            expect(bitSetBuffer.toJSON().data).toEqual([7, 0, 1, 2, 3, 4, 5, 6]);
        })

        it("bitset, 1 element", () => {
            const bitSet: number[] = [8, 17, 24, 25, 34, 40, 42, 49, 50, 56, 57, 58];
            const bitSetBuffer = encodeBitSets(bitSet, ENDIAN.BIG);
            expect(bitSetBuffer.toJSON().data).toEqual([8, 0, 1, 2, 3, 4, 5, 6, 7]);
        })

        it("bitset, 1 element", () => {
            const bitSet: number[] = [8, 17, 24, 25, 34, 40, 42, 49, 50, 56, 57, 58, 67];
            const bitSetBuffer = encodeBitSets(bitSet, ENDIAN.BIG);
            expect(bitSetBuffer.toJSON().data).toEqual([9, 0, 1, 2, 3, 4, 5, 6, 7, 8]);
        })

        it("bitset, 1 element", () => {
            const bitSet: number[] = [8, 17, 24, 25, 34, 40, 42, 49, 50, 56, 57, 58, 67, 72, 75, 81, 83];
            const bitSetBuffer = encodeBitSets(bitSet, ENDIAN.BIG);
            expect(bitSetBuffer.toJSON().data).toEqual([0x0b, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0x0a]);
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

            const result = encodeData(type, data, endian);
            // this buffer is copied from PVA protocol
            expect(result.toJSON().data).toEqual(
                [
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
                ]
            )
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

            const result = encodeData(type, data, endian);
            // this buffer is copied from PVA protocol
            expect(result.toJSON().data).toEqual(
                [
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
                ]
            )
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
            const endian = ENDIAN.BIG;
            expect(() => { encodeData(type, data, endian) }).toThrow();
        })

        it("failed case -- type missing name", () => {
            const type = {
                typeIndex: "0x89",
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
                index: 0,
                value: 23
            }
            ];
            const endian = ENDIAN.BIG;
            expect(() => encodeData(type, data, endian)).toThrow()
        })

        it("failed case -- data and type mismatch", () => {
            const type = {
                typeIndex: "0x81",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const data = [{
                index: 0,
                value: "22",
            },
            {
                index: 0,
                value: 23,
            }
            ]
            const endian = ENDIAN.BIG;
            expect(() => encodeData(type, data, endian)).toThrow()
        })

        it("failed case -- index wrong", () => {
            const type = {
                typeIndex: "0x81",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const data = [
                {
                    index: 0,
                    value: 22
                },
                {
                    index: 9,
                    value: 22
                }
            ]
            const endian = ENDIAN.BIG;
            expect(() => encodeData(type, data, endian)).toThrow()
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
            const result = encodeData(type, data, endian);

            console.log(result)
            expect(result.toJSON().data).toEqual(bufferArray);
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
            const result = encodeData(type, data, endian);
            // this buffer is copied from PVA protocol
            expect(result.toJSON().data).toEqual(
                [
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
                ]
            )
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
            const result = encodeData(type, data, endian);
            // this buffer is copied from PVA protocol
            expect(result.toJSON().data).toEqual(
                [
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
                ]
            )
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
            const endian = ENDIAN.BIG;
            const buffer = encodeData(type, data, endian);
            expect(buffer.toJSON().data).toEqual([0x02]);
        })

        it("failed case -- type missing name", () => {
            const type = {
                typeIndex: "0x88",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
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
            expect(() => encodeData(type, data, endian)).toThrow()
        })

        it("failed case -- data and type mismatch", () => {
            const type = {
                typeIndex: "0x88",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const data = [
                {
                    val1: 22,
                    val2: 33,
                },
                {
                    val1: "22",
                    val2: 33,
                }
            ]
            const endian = ENDIAN.BIG;
            expect(() => encodeData(type, data, endian)).toThrow()
        })

        it("failed case -- data and type mismatch", () => {
            const type = {
                typeIndex: "0x88",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const data = [
                {
                    val1: 22,
                    val2: 33,
                    val3: 55, // <-- extra field
                },
                {
                    val1: 22,
                    val2: 33,
                }
            ]
            const endian = ENDIAN.BIG;
            expect(() => encodeData(type, data, endian)).toThrow()
        })

        it("failed case -- data and type mismatch, more fields in data", () => {
            const type = {
                typeIndex: "0x88",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const data = [
                {
                    val1: 22,
                    val2: 33,
                },
                {
                    val1: 22,
                    val2: 33,
                    val3: 55, // <-- extra field
                }
            ]
            const endian = ENDIAN.BIG;
            expect(() => encodeData(type, data, endian)).toThrow()
        })

        it("failed case -- data and type mismatch, more fields in type", () => {
            const type = {
                typeIndex: "0x80",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const data = [
                {
                    val1: 22,
                },
                {
                    val1: 22,
                    val2: 23,
                }
            ]
            const endian = ENDIAN.BIG;
            expect(() => encodeData(type, data, endian)).toThrow()
        })

        it("normal case -- number array", () => {
            const type = {
                typeIndex: "0x88",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_fixedSizeArray_binary32, size: 5 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const data = [
                {
                    val1: [1, 2, 3, 4, 5],
                    val2: 33,
                },
                {
                    val1: [5, 4, 3, 2, 1],
                    val2: 33,
                }
            ]
            const bufferArray = [
                0x02,
                0x3f, 0x80, 0x00, 0x00,
                0x40, 0x00, 0x00, 0x00,
                0x40, 0x40, 0x00, 0x00,
                0x40, 0x80, 0x00, 0x00,
                0x40, 0xa0, 0x00, 0x00,
                0x42, 0x04, 0x00, 0x00,
                0x40, 0xa0, 0x00, 0x00,
                0x40, 0x80, 0x00, 0x00,
                0x40, 0x40, 0x00, 0x00,
                0x40, 0x00, 0x00, 0x00,
                0x3f, 0x80, 0x00, 0x00,
                0x42, 0x04, 0x00, 0x00,
            ]
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = encodeData(type, data, endian);
            expect(result.toJSON().data).toEqual(bufferArray);
        })


        it("normal case -- with element id, no difference on the data", () => {
            const type = {
                typeIndex: "0x88",
                name: "",
                elementId: 0x08,
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_fixedSizeArray_binary32, size: 5 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const data = [
                {
                    val1: [1, 2, 3, 4, 5],
                    val2: 33,
                },
                {
                    val1: [5, 4, 3, 2, 1],
                    val2: 33,
                }
            ]
            const bufferArray = [
                0x02,
                0x3f, 0x80, 0x00, 0x00,
                0x40, 0x00, 0x00, 0x00,
                0x40, 0x40, 0x00, 0x00,
                0x40, 0x80, 0x00, 0x00,
                0x40, 0xa0, 0x00, 0x00,
                0x42, 0x04, 0x00, 0x00,
                0x40, 0xa0, 0x00, 0x00,
                0x40, 0x80, 0x00, 0x00,
                0x40, 0x40, 0x00, 0x00,
                0x40, 0x00, 0x00, 0x00,
                0x3f, 0x80, 0x00, 0x00,
                0x42, 0x04, 0x00, 0x00,
            ]
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = encodeData(type, data, endian);
            expect(result.toJSON().data).toEqual(bufferArray);
        })

        it("normal case -- with element id and element tag, no difference on the data", () => {
            const type = {
                typeIndex: "0x88",
                name: "",
                elementId: 0x08,
                elementTag: 0x04,
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_fixedSizeArray_binary32, size: 5 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const data = [
                {
                    val1: [1, 2, 3, 4, 5],
                    val2: 33,
                },
                {
                    val1: [5, 4, 3, 2, 1],
                    val2: 33,
                }
            ]
            const bufferArray = [
                0x02,
                0x3f, 0x80, 0x00, 0x00,
                0x40, 0x00, 0x00, 0x00,
                0x40, 0x40, 0x00, 0x00,
                0x40, 0x80, 0x00, 0x00,
                0x40, 0xa0, 0x00, 0x00,
                0x42, 0x04, 0x00, 0x00,
                0x40, 0xa0, 0x00, 0x00,
                0x40, 0x80, 0x00, 0x00,
                0x40, 0x40, 0x00, 0x00,
                0x40, 0x00, 0x00, 0x00,
                0x3f, 0x80, 0x00, 0x00,
                0x42, 0x04, 0x00, 0x00,
            ]
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = encodeData(type, data, endian);
            expect(result.toJSON().data).toEqual(bufferArray);
        })

        it("normal case -- number array, different types, but same encoded buffer result", () => {
            const type = {
                typeIndex: "0x88",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_fixedSizeArray_binary32, size: 5 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_fixedSizeArray_binary32, size: 1 },
                }
            }
            const data = [
                {
                    val1: [1, 2, 3, 4, 5],
                    val2: [33],
                },
                {
                    val1: [1, 2, 3, 4, 5],
                    val2: [1],
                }
            ]
            const bufferArray = [
                0x02,
                0x3f, 0x80, 0x00, 0x00,
                0x40, 0x00, 0x00, 0x00,
                0x40, 0x40, 0x00, 0x00,
                0x40, 0x80, 0x00, 0x00,
                0x40, 0xa0, 0x00, 0x00,
                0x42, 0x04, 0x00, 0x00,
                0x3f, 0x80, 0x00, 0x00,
                0x40, 0x00, 0x00, 0x00,
                0x40, 0x40, 0x00, 0x00,
                0x40, 0x80, 0x00, 0x00,
                0x40, 0xa0, 0x00, 0x00,
                0x3f, 0x80, 0x00, 0x00,
            ]
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = encodeData(type, data, endian);
            expect(result.toJSON().data).toEqual(bufferArray);
        })


    })


    describe("complex_scalar_boundedString, 0x83", () => {
        it("ok", () => {
            const endian = ENDIAN.BIG;
            const str = "This is TCA.";
            const buffer = encodeData({ typeIndex: "0x83", size: 25 }, str, endian);
            expect(buffer.toJSON().data).toEqual([12, 84, 104, 105, 115, 32, 105, 115, 32, 84, 67, 65, 46]);
        })

        it("ok: additional id in type definition does not affect result", () => {
            const endian = ENDIAN.BIG;
            const str = "This is TCA.";
            const buffer = encodeData({ typeIndex: "0x83", size: 25, id: 28 }, str, endian);
            expect(buffer.toJSON().data).toEqual([12, 84, 104, 105, 115, 32, 105, 115, 32, 84, 67, 65, 46]);
        })

        it("ok: very long string, exceed 255", () => {
            const endian = ENDIAN.BIG;
            // size 864 = 0x360
            const str = "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur";
            const buffer = encodeData({ typeIndex: "0x83", size: 100000 }, str, endian);
            expect(buffer.toJSON().data).toEqual([0xff, 0x00, 0x00, 0x03, 0x60, 0x53, 0x65, 0x64, 0x20, 0x75, 0x74, 0x20, 0x70, 0x65, 0x72, 0x73, 0x70, 0x69, 0x63, 0x69, 0x61, 0x74, 0x69, 0x73, 0x20, 0x75, 0x6e, 0x64, 0x65, 0x20, 0x6f, 0x6d, 0x6e, 0x69, 0x73, 0x20, 0x69, 0x73, 0x74, 0x65, 0x20, 0x6e, 0x61, 0x74, 0x75, 0x73, 0x20, 0x65, 0x72, 0x72, 0x6f, 0x72, 0x20, 0x73, 0x69, 0x74, 0x20, 0x76, 0x6f, 0x6c, 0x75, 0x70, 0x74, 0x61, 0x74, 0x65, 0x6d, 0x20, 0x61, 0x63, 0x63, 0x75, 0x73, 0x61, 0x6e, 0x74, 0x69, 0x75, 0x6d, 0x20, 0x64, 0x6f, 0x6c, 0x6f, 0x72, 0x65, 0x6d, 0x71, 0x75, 0x65, 0x20, 0x6c, 0x61, 0x75, 0x64, 0x61, 0x6e, 0x74, 0x69, 0x75, 0x6d, 0x2c, 0x20, 0x74, 0x6f, 0x74, 0x61, 0x6d, 0x20, 0x72, 0x65, 0x6d, 0x20, 0x61, 0x70, 0x65, 0x72, 0x69, 0x61, 0x6d, 0x2c, 0x20, 0x65, 0x61, 0x71, 0x75, 0x65, 0x20, 0x69, 0x70, 0x73, 0x61, 0x20, 0x71, 0x75, 0x61, 0x65, 0x20, 0x61, 0x62, 0x20, 0x69, 0x6c, 0x6c, 0x6f, 0x20, 0x69, 0x6e, 0x76, 0x65, 0x6e, 0x74, 0x6f, 0x72, 0x65, 0x20, 0x76, 0x65, 0x72, 0x69, 0x74, 0x61, 0x74, 0x69, 0x73, 0x20, 0x65, 0x74, 0x20, 0x71, 0x75, 0x61, 0x73, 0x69, 0x20, 0x61, 0x72, 0x63, 0x68, 0x69, 0x74, 0x65, 0x63, 0x74, 0x6f, 0x20, 0x62, 0x65, 0x61, 0x74, 0x61, 0x65, 0x20, 0x76, 0x69, 0x74, 0x61, 0x65, 0x20, 0x64, 0x69, 0x63, 0x74, 0x61, 0x20, 0x73, 0x75, 0x6e, 0x74, 0x20, 0x65, 0x78, 0x70, 0x6c, 0x69, 0x63, 0x61, 0x62, 0x6f, 0x2e, 0x20, 0x4e, 0x65, 0x6d, 0x6f, 0x20, 0x65, 0x6e, 0x69, 0x6d, 0x20, 0x69, 0x70, 0x73, 0x61, 0x6d, 0x20, 0x76, 0x6f, 0x6c, 0x75, 0x70, 0x74, 0x61, 0x74, 0x65, 0x6d, 0x20, 0x71, 0x75, 0x69, 0x61, 0x20, 0x76, 0x6f, 0x6c, 0x75, 0x70, 0x74, 0x61, 0x73, 0x20, 0x73, 0x69, 0x74, 0x20, 0x61, 0x73, 0x70, 0x65, 0x72, 0x6e, 0x61, 0x74, 0x75, 0x72, 0x20, 0x61, 0x75, 0x74, 0x20, 0x6f, 0x64, 0x69, 0x74, 0x20, 0x61, 0x75, 0x74, 0x20, 0x66, 0x75, 0x67, 0x69, 0x74, 0x2c, 0x20, 0x73, 0x65, 0x64, 0x20, 0x71, 0x75, 0x69, 0x61, 0x20, 0x63, 0x6f, 0x6e, 0x73, 0x65, 0x71, 0x75, 0x75, 0x6e, 0x74, 0x75, 0x72, 0x20, 0x6d, 0x61, 0x67, 0x6e, 0x69, 0x20, 0x64, 0x6f, 0x6c, 0x6f, 0x72, 0x65, 0x73, 0x20, 0x65, 0x6f, 0x73, 0x20, 0x71, 0x75, 0x69, 0x20, 0x72, 0x61, 0x74, 0x69, 0x6f, 0x6e, 0x65, 0x20, 0x76, 0x6f, 0x6c, 0x75, 0x70, 0x74, 0x61, 0x74, 0x65, 0x6d, 0x20, 0x73, 0x65, 0x71, 0x75, 0x69, 0x20, 0x6e, 0x65, 0x73, 0x63, 0x69, 0x75, 0x6e, 0x74, 0x2e, 0x20, 0x4e, 0x65, 0x71, 0x75, 0x65, 0x20, 0x70, 0x6f, 0x72, 0x72, 0x6f, 0x20, 0x71, 0x75, 0x69, 0x73, 0x71, 0x75, 0x61, 0x6d, 0x20, 0x65, 0x73, 0x74, 0x2c, 0x20, 0x71, 0x75, 0x69, 0x20, 0x64, 0x6f, 0x6c, 0x6f, 0x72, 0x65, 0x6d, 0x20, 0x69, 0x70, 0x73, 0x75, 0x6d, 0x20, 0x71, 0x75, 0x69, 0x61, 0x20, 0x64, 0x6f, 0x6c, 0x6f, 0x72, 0x20, 0x73, 0x69, 0x74, 0x20, 0x61, 0x6d, 0x65, 0x74, 0x2c, 0x20, 0x63, 0x6f, 0x6e, 0x73, 0x65, 0x63, 0x74, 0x65, 0x74, 0x75, 0x72, 0x2c, 0x20, 0x61, 0x64, 0x69, 0x70, 0x69, 0x73, 0x63, 0x69, 0x20, 0x76, 0x65, 0x6c, 0x69, 0x74, 0x2c, 0x20, 0x73, 0x65, 0x64, 0x20, 0x71, 0x75, 0x69, 0x61, 0x20, 0x6e, 0x6f, 0x6e, 0x20, 0x6e, 0x75, 0x6d, 0x71, 0x75, 0x61, 0x6d, 0x20, 0x65, 0x69, 0x75, 0x73, 0x20, 0x6d, 0x6f, 0x64, 0x69, 0x20, 0x74, 0x65, 0x6d, 0x70, 0x6f, 0x72, 0x61, 0x20, 0x69, 0x6e, 0x63, 0x69, 0x64, 0x75, 0x6e, 0x74, 0x20, 0x75, 0x74, 0x20, 0x6c, 0x61, 0x62, 0x6f, 0x72, 0x65, 0x20, 0x65, 0x74, 0x20, 0x64, 0x6f, 0x6c, 0x6f, 0x72, 0x65, 0x20, 0x6d, 0x61, 0x67, 0x6e, 0x61, 0x6d, 0x20, 0x61, 0x6c, 0x69, 0x71, 0x75, 0x61, 0x6d, 0x20, 0x71, 0x75, 0x61, 0x65, 0x72, 0x61, 0x74, 0x20, 0x76, 0x6f, 0x6c, 0x75, 0x70, 0x74, 0x61, 0x74, 0x65, 0x6d, 0x2e, 0x20, 0x55, 0x74, 0x20, 0x65, 0x6e, 0x69, 0x6d, 0x20, 0x61, 0x64, 0x20, 0x6d, 0x69, 0x6e, 0x69, 0x6d, 0x61, 0x20, 0x76, 0x65, 0x6e, 0x69, 0x61, 0x6d, 0x2c, 0x20, 0x71, 0x75, 0x69, 0x73, 0x20, 0x6e, 0x6f, 0x73, 0x74, 0x72, 0x75, 0x6d, 0x20, 0x65, 0x78, 0x65, 0x72, 0x63, 0x69, 0x74, 0x61, 0x74, 0x69, 0x6f, 0x6e, 0x65, 0x6d, 0x20, 0x75, 0x6c, 0x6c, 0x61, 0x6d, 0x20, 0x63, 0x6f, 0x72, 0x70, 0x6f, 0x72, 0x69, 0x73, 0x20, 0x73, 0x75, 0x73, 0x63, 0x69, 0x70, 0x69, 0x74, 0x20, 0x6c, 0x61, 0x62, 0x6f, 0x72, 0x69, 0x6f, 0x73, 0x61, 0x6d, 0x2c, 0x20, 0x6e, 0x69, 0x73, 0x69, 0x20, 0x75, 0x74, 0x20, 0x61, 0x6c, 0x69, 0x71, 0x75, 0x69, 0x64, 0x20, 0x65, 0x78, 0x20, 0x65, 0x61, 0x20, 0x63, 0x6f, 0x6d, 0x6d, 0x6f, 0x64, 0x69, 0x20, 0x63, 0x6f, 0x6e, 0x73, 0x65, 0x71, 0x75, 0x61, 0x74, 0x75, 0x72, 0x3f, 0x20, 0x51, 0x75, 0x69, 0x73, 0x20, 0x61, 0x75, 0x74, 0x65, 0x6d, 0x20, 0x76, 0x65, 0x6c, 0x20, 0x65, 0x75, 0x6d, 0x20, 0x69, 0x75, 0x72, 0x65, 0x20, 0x72, 0x65, 0x70, 0x72, 0x65, 0x68, 0x65, 0x6e, 0x64, 0x65, 0x72, 0x69, 0x74, 0x20, 0x71, 0x75, 0x69, 0x20, 0x69, 0x6e, 0x20, 0x65, 0x61, 0x20, 0x76, 0x6f, 0x6c, 0x75, 0x70, 0x74, 0x61, 0x74, 0x65, 0x20, 0x76, 0x65, 0x6c, 0x69, 0x74, 0x20, 0x65, 0x73, 0x73, 0x65, 0x20, 0x71, 0x75, 0x61, 0x6d, 0x20, 0x6e, 0x69, 0x68, 0x69, 0x6c, 0x20, 0x6d, 0x6f, 0x6c, 0x65, 0x73, 0x74, 0x69, 0x61, 0x65, 0x20, 0x63, 0x6f, 0x6e, 0x73, 0x65, 0x71, 0x75, 0x61, 0x74, 0x75, 0x72, 0x2c, 0x20, 0x76, 0x65, 0x6c, 0x20, 0x69, 0x6c, 0x6c, 0x75, 0x6d, 0x20, 0x71, 0x75, 0x69, 0x20, 0x64, 0x6f, 0x6c, 0x6f, 0x72, 0x65, 0x6d, 0x20, 0x65, 0x75, 0x6d, 0x20, 0x66, 0x75, 0x67, 0x69, 0x61, 0x74, 0x20, 0x71, 0x75, 0x6f, 0x20, 0x76, 0x6f, 0x6c, 0x75, 0x70, 0x74, 0x61, 0x73, 0x20, 0x6e, 0x75, 0x6c, 0x6c, 0x61, 0x20, 0x70, 0x61, 0x72, 0x69, 0x61, 0x74, 0x75, 0x72]);
        })


        it("ok: very long string, exceed 255, little endian", () => {
            const endian = ENDIAN.LITTLE;
            // size 864 = 0x360
            const str = "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur";
            const buffer = encodeData({ typeIndex: "0x83", size: 100000 }, str, endian);
            expect(buffer.toJSON().data).toEqual([0xff, 0x60, 0x03, 0x00, 0x00, 0x53, 0x65, 0x64, 0x20, 0x75, 0x74, 0x20, 0x70, 0x65, 0x72, 0x73, 0x70, 0x69, 0x63, 0x69, 0x61, 0x74, 0x69, 0x73, 0x20, 0x75, 0x6e, 0x64, 0x65, 0x20, 0x6f, 0x6d, 0x6e, 0x69, 0x73, 0x20, 0x69, 0x73, 0x74, 0x65, 0x20, 0x6e, 0x61, 0x74, 0x75, 0x73, 0x20, 0x65, 0x72, 0x72, 0x6f, 0x72, 0x20, 0x73, 0x69, 0x74, 0x20, 0x76, 0x6f, 0x6c, 0x75, 0x70, 0x74, 0x61, 0x74, 0x65, 0x6d, 0x20, 0x61, 0x63, 0x63, 0x75, 0x73, 0x61, 0x6e, 0x74, 0x69, 0x75, 0x6d, 0x20, 0x64, 0x6f, 0x6c, 0x6f, 0x72, 0x65, 0x6d, 0x71, 0x75, 0x65, 0x20, 0x6c, 0x61, 0x75, 0x64, 0x61, 0x6e, 0x74, 0x69, 0x75, 0x6d, 0x2c, 0x20, 0x74, 0x6f, 0x74, 0x61, 0x6d, 0x20, 0x72, 0x65, 0x6d, 0x20, 0x61, 0x70, 0x65, 0x72, 0x69, 0x61, 0x6d, 0x2c, 0x20, 0x65, 0x61, 0x71, 0x75, 0x65, 0x20, 0x69, 0x70, 0x73, 0x61, 0x20, 0x71, 0x75, 0x61, 0x65, 0x20, 0x61, 0x62, 0x20, 0x69, 0x6c, 0x6c, 0x6f, 0x20, 0x69, 0x6e, 0x76, 0x65, 0x6e, 0x74, 0x6f, 0x72, 0x65, 0x20, 0x76, 0x65, 0x72, 0x69, 0x74, 0x61, 0x74, 0x69, 0x73, 0x20, 0x65, 0x74, 0x20, 0x71, 0x75, 0x61, 0x73, 0x69, 0x20, 0x61, 0x72, 0x63, 0x68, 0x69, 0x74, 0x65, 0x63, 0x74, 0x6f, 0x20, 0x62, 0x65, 0x61, 0x74, 0x61, 0x65, 0x20, 0x76, 0x69, 0x74, 0x61, 0x65, 0x20, 0x64, 0x69, 0x63, 0x74, 0x61, 0x20, 0x73, 0x75, 0x6e, 0x74, 0x20, 0x65, 0x78, 0x70, 0x6c, 0x69, 0x63, 0x61, 0x62, 0x6f, 0x2e, 0x20, 0x4e, 0x65, 0x6d, 0x6f, 0x20, 0x65, 0x6e, 0x69, 0x6d, 0x20, 0x69, 0x70, 0x73, 0x61, 0x6d, 0x20, 0x76, 0x6f, 0x6c, 0x75, 0x70, 0x74, 0x61, 0x74, 0x65, 0x6d, 0x20, 0x71, 0x75, 0x69, 0x61, 0x20, 0x76, 0x6f, 0x6c, 0x75, 0x70, 0x74, 0x61, 0x73, 0x20, 0x73, 0x69, 0x74, 0x20, 0x61, 0x73, 0x70, 0x65, 0x72, 0x6e, 0x61, 0x74, 0x75, 0x72, 0x20, 0x61, 0x75, 0x74, 0x20, 0x6f, 0x64, 0x69, 0x74, 0x20, 0x61, 0x75, 0x74, 0x20, 0x66, 0x75, 0x67, 0x69, 0x74, 0x2c, 0x20, 0x73, 0x65, 0x64, 0x20, 0x71, 0x75, 0x69, 0x61, 0x20, 0x63, 0x6f, 0x6e, 0x73, 0x65, 0x71, 0x75, 0x75, 0x6e, 0x74, 0x75, 0x72, 0x20, 0x6d, 0x61, 0x67, 0x6e, 0x69, 0x20, 0x64, 0x6f, 0x6c, 0x6f, 0x72, 0x65, 0x73, 0x20, 0x65, 0x6f, 0x73, 0x20, 0x71, 0x75, 0x69, 0x20, 0x72, 0x61, 0x74, 0x69, 0x6f, 0x6e, 0x65, 0x20, 0x76, 0x6f, 0x6c, 0x75, 0x70, 0x74, 0x61, 0x74, 0x65, 0x6d, 0x20, 0x73, 0x65, 0x71, 0x75, 0x69, 0x20, 0x6e, 0x65, 0x73, 0x63, 0x69, 0x75, 0x6e, 0x74, 0x2e, 0x20, 0x4e, 0x65, 0x71, 0x75, 0x65, 0x20, 0x70, 0x6f, 0x72, 0x72, 0x6f, 0x20, 0x71, 0x75, 0x69, 0x73, 0x71, 0x75, 0x61, 0x6d, 0x20, 0x65, 0x73, 0x74, 0x2c, 0x20, 0x71, 0x75, 0x69, 0x20, 0x64, 0x6f, 0x6c, 0x6f, 0x72, 0x65, 0x6d, 0x20, 0x69, 0x70, 0x73, 0x75, 0x6d, 0x20, 0x71, 0x75, 0x69, 0x61, 0x20, 0x64, 0x6f, 0x6c, 0x6f, 0x72, 0x20, 0x73, 0x69, 0x74, 0x20, 0x61, 0x6d, 0x65, 0x74, 0x2c, 0x20, 0x63, 0x6f, 0x6e, 0x73, 0x65, 0x63, 0x74, 0x65, 0x74, 0x75, 0x72, 0x2c, 0x20, 0x61, 0x64, 0x69, 0x70, 0x69, 0x73, 0x63, 0x69, 0x20, 0x76, 0x65, 0x6c, 0x69, 0x74, 0x2c, 0x20, 0x73, 0x65, 0x64, 0x20, 0x71, 0x75, 0x69, 0x61, 0x20, 0x6e, 0x6f, 0x6e, 0x20, 0x6e, 0x75, 0x6d, 0x71, 0x75, 0x61, 0x6d, 0x20, 0x65, 0x69, 0x75, 0x73, 0x20, 0x6d, 0x6f, 0x64, 0x69, 0x20, 0x74, 0x65, 0x6d, 0x70, 0x6f, 0x72, 0x61, 0x20, 0x69, 0x6e, 0x63, 0x69, 0x64, 0x75, 0x6e, 0x74, 0x20, 0x75, 0x74, 0x20, 0x6c, 0x61, 0x62, 0x6f, 0x72, 0x65, 0x20, 0x65, 0x74, 0x20, 0x64, 0x6f, 0x6c, 0x6f, 0x72, 0x65, 0x20, 0x6d, 0x61, 0x67, 0x6e, 0x61, 0x6d, 0x20, 0x61, 0x6c, 0x69, 0x71, 0x75, 0x61, 0x6d, 0x20, 0x71, 0x75, 0x61, 0x65, 0x72, 0x61, 0x74, 0x20, 0x76, 0x6f, 0x6c, 0x75, 0x70, 0x74, 0x61, 0x74, 0x65, 0x6d, 0x2e, 0x20, 0x55, 0x74, 0x20, 0x65, 0x6e, 0x69, 0x6d, 0x20, 0x61, 0x64, 0x20, 0x6d, 0x69, 0x6e, 0x69, 0x6d, 0x61, 0x20, 0x76, 0x65, 0x6e, 0x69, 0x61, 0x6d, 0x2c, 0x20, 0x71, 0x75, 0x69, 0x73, 0x20, 0x6e, 0x6f, 0x73, 0x74, 0x72, 0x75, 0x6d, 0x20, 0x65, 0x78, 0x65, 0x72, 0x63, 0x69, 0x74, 0x61, 0x74, 0x69, 0x6f, 0x6e, 0x65, 0x6d, 0x20, 0x75, 0x6c, 0x6c, 0x61, 0x6d, 0x20, 0x63, 0x6f, 0x72, 0x70, 0x6f, 0x72, 0x69, 0x73, 0x20, 0x73, 0x75, 0x73, 0x63, 0x69, 0x70, 0x69, 0x74, 0x20, 0x6c, 0x61, 0x62, 0x6f, 0x72, 0x69, 0x6f, 0x73, 0x61, 0x6d, 0x2c, 0x20, 0x6e, 0x69, 0x73, 0x69, 0x20, 0x75, 0x74, 0x20, 0x61, 0x6c, 0x69, 0x71, 0x75, 0x69, 0x64, 0x20, 0x65, 0x78, 0x20, 0x65, 0x61, 0x20, 0x63, 0x6f, 0x6d, 0x6d, 0x6f, 0x64, 0x69, 0x20, 0x63, 0x6f, 0x6e, 0x73, 0x65, 0x71, 0x75, 0x61, 0x74, 0x75, 0x72, 0x3f, 0x20, 0x51, 0x75, 0x69, 0x73, 0x20, 0x61, 0x75, 0x74, 0x65, 0x6d, 0x20, 0x76, 0x65, 0x6c, 0x20, 0x65, 0x75, 0x6d, 0x20, 0x69, 0x75, 0x72, 0x65, 0x20, 0x72, 0x65, 0x70, 0x72, 0x65, 0x68, 0x65, 0x6e, 0x64, 0x65, 0x72, 0x69, 0x74, 0x20, 0x71, 0x75, 0x69, 0x20, 0x69, 0x6e, 0x20, 0x65, 0x61, 0x20, 0x76, 0x6f, 0x6c, 0x75, 0x70, 0x74, 0x61, 0x74, 0x65, 0x20, 0x76, 0x65, 0x6c, 0x69, 0x74, 0x20, 0x65, 0x73, 0x73, 0x65, 0x20, 0x71, 0x75, 0x61, 0x6d, 0x20, 0x6e, 0x69, 0x68, 0x69, 0x6c, 0x20, 0x6d, 0x6f, 0x6c, 0x65, 0x73, 0x74, 0x69, 0x61, 0x65, 0x20, 0x63, 0x6f, 0x6e, 0x73, 0x65, 0x71, 0x75, 0x61, 0x74, 0x75, 0x72, 0x2c, 0x20, 0x76, 0x65, 0x6c, 0x20, 0x69, 0x6c, 0x6c, 0x75, 0x6d, 0x20, 0x71, 0x75, 0x69, 0x20, 0x64, 0x6f, 0x6c, 0x6f, 0x72, 0x65, 0x6d, 0x20, 0x65, 0x75, 0x6d, 0x20, 0x66, 0x75, 0x67, 0x69, 0x61, 0x74, 0x20, 0x71, 0x75, 0x6f, 0x20, 0x76, 0x6f, 0x6c, 0x75, 0x70, 0x74, 0x61, 0x73, 0x20, 0x6e, 0x75, 0x6c, 0x6c, 0x61, 0x20, 0x70, 0x61, 0x72, 0x69, 0x61, 0x74, 0x75, 0x72]);
        })

        it("bad: actual size > bounded size", () => {
            const endian = ENDIAN.BIG;
            const str = "This is TCA.";
            expect(() => { encodeData({ typeIndex: "0x83", size: 5 }, str, endian) }).toThrow();
        })

        it("bad: forgot to add size", () => {
            const endian = ENDIAN.BIG;
            const str = "This is TCA.";
            expect(() => { encodeData({ typeIndex: "0x83" }, str, endian) }).toThrow();
        })

        it("bad: size misspelled", () => {
            const endian = ENDIAN.BIG;
            const str = "This is TCA.";
            expect(() => { encodeData({ typeIndex: "0x83", siz: 99 } as any, str, endian) }).toThrow();
        })

        it("bad: try to encode to `0x82`, throw", () => {
            const endian = ENDIAN.BIG;
            const str = "This is TCA.";
            expect(() => { encodeData({ typeIndex: "0x82", size: 99 } as any, str, endian) }).toThrow();
        })

        it("bad: try to encode to `0x80`, throw", () => {
            const endian = ENDIAN.BIG;
            const str = "This is TCA.";
            expect(() => { encodeData({ typeIndex: "0x80", size: 99 } as any, str, endian) }).toThrow();
        })

        it("bad: size is a string", () => {
            const endian = ENDIAN.BIG;
            const str = "This is TCA.";
            expect(() => { encodeData({ typeIndex: "0x83", size: "abc" } as any, str, endian) }).toThrow();
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
            const buffer = encodeData({ typeIndex: "0x82" }, data, endian);

            expect(buffer.toJSON().data).toEqual([0x60, 0x04, 0x41, 0x42, 0x43, 0x44]);
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
            const buffer = encodeData({ typeIndex: "0x82", id: 0x22 }, data, endian);
            expect(buffer.toJSON().data).toEqual([0xfd, 0x00, 0x23, 0x60, 0x04, 0x41, 0x42, 0x43, 0x44])
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
            const buffer = encodeData({ typeIndex: "0x82", id: 0x22 }, data, endian);

            expect(buffer.toJSON().data).toEqual([0x18, 0x04, 0x01, 0x00, 0x00, 0x00]);
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
            const buffer = encodeData({ typeIndex: "0x82", id: 0x22 }, data, endian);

            expect(buffer.toJSON().data).toEqual([0xfd, 0x00, 0x33, 0x18, 0x04, 0x01, 0x00, 0x00, 0x00]);
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
            const buffer = encodeData({ typeIndex: "0x82", id: 0x22 }, data, endian);

            expect(buffer.toJSON().data).toEqual([0xfc, 0x00, 0x33, 0x00, 0x00, 0x00, 0x44, 0x18, 0x04, 0x01, 0x00, 0x00, 0x00]);
        })

        it("failed case, type and value not match", () => {

            const endian = ENDIAN.BIG;
            const data = {
                type: {
                    typeIndex: "0x18",
                    size: 4,
                    id: 0x33,
                    tag: 0x44,
                },
                value: [true, false, false, 1], // <-- there is a number here
            };

            expect(() => {encodeData({ typeIndex: "0x82", id: 0x22 }, data, endian)}).toThrow();
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
            const result0 = encodeData(type, data0, endian);
            const result1 = encodeData(type, data1, endian);
            const result2 = encodeData(type, data2, endian);
            const result3 = encodeData(type, data3, endian);
            const result4 = encodeData(type, data4, endian);
            const result5 = encodeData(type, data5, endian);
            // this buffer is copied from PVA protocol
            expect(Buffer.concat([result0, result1, result2, result3, result4, result5,]).toJSON().data).toEqual(
                [
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
                value: { severity: 0x11111111, status: 0x22222222, message: 'Allo, Allo!' }
            };
            const data5 = {
                index: 5,
                value: { index: 1, value: 0x33333333 },
            }
            const result0 = encodeData(type, data0, endian);
            const result1 = encodeData(type, data1, endian);
            const result2 = encodeData(type, data2, endian);
            const result3 = encodeData(type, data3, endian);
            const result4 = encodeData(type, data4, endian);
            const result5 = encodeData(type, data5, endian);
            // this buffer is copied from PVA protocol
            expect(Buffer.concat([result0, result1, result2, result3, result4, result5,]).toJSON().data).toEqual(
                [
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
                ]
            )
        })


        it("failed case -- union type cannot encode with an empty fields", () => {
            const type = {
                typeIndex: "0x81",
                name: "",
                fields: {}
            }
            const data = {
                index: 0,
                value: []
            };
            const endian = ENDIAN.BIG;
            expect(() => { encodeData(type, data, endian) }).toThrow();
        })

        it("failed case -- type missing name", () => {
            const type = {
                typeIndex: "0x81",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const data = {
                index: 0,
                value: 22
            }
            const endian = ENDIAN.BIG;
            expect(() => encodeData(type, data, endian)).toThrow()
        })

        it("failed case -- data and type mismatch", () => {
            const type = {
                typeIndex: "0x81",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const data = {
                index: 0,
                value: "22",
            }
            const endian = ENDIAN.BIG;
            expect(() => encodeData(type, data, endian)).toThrow()
        })

        it("failed case -- index wrong", () => {
            const type = {
                typeIndex: "0x81",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const data = {
                index: 9,
                value: 22
            }
            const endian = ENDIAN.BIG;
            expect(() => encodeData(type, data, endian)).toThrow()
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
                // val2: 33,
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
            const result = encodeData(type, data, endian);
            expect(result.toJSON().data).toEqual(bufferArray);
        })

    })

    describe("complex_scalar_structure, 0x80", () => {

        it("ok, PVA protocol spec (2015 version) page 10", () => {
            const endian = ENDIAN.BIG;

            const type = {
                typeIndex: "0x80",
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
            };
            const result = encodeData(type, data, endian);
            // this buffer is copied from PVA protocol
            expect(result.toJSON().data).toEqual(
                [
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
                ]
            )
        })

        it("same as above, little endian", () => {
            const endian = ENDIAN.LITTLE;

            const type = {
                typeIndex: "0x80",
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
            };
            const result = encodeData(type, data, endian);
            // this buffer is copied from PVA protocol
            expect(result.toJSON().data).toEqual(
                [
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
                    // 0x60, 0x1C, 0x53, 0x74, 0x72, 0x69, 0x6E, 0x67, 0x20, 0x69, 0x6E, 0x73, 0x69, 0x64, 0x65, 0x20, 0x76, 0x61, 0x72, 0x69, 0x61, 0x6E, 0x74, 0x20, 0x75, 0x6E, 0x69, 0x6F, 0x6E, 0x2E,
                ]
            )
        })

        it("normal case -- empty fields", () => {
            const type = {
                typeIndex: "0x80",
                name: "",
                fields: {}
            }
            const data = {};
            const endian = ENDIAN.BIG;
            const buffer = encodeData(type, data, endian);
            expect(buffer.toJSON().data).toEqual([]);
        })

        it("failed case -- type missing name", () => {
            const type = {
                typeIndex: "0x80",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const data = {
                val1: 22,
                val2: 33,
            }
            const endian = ENDIAN.BIG;
            expect(() => encodeData(type, data, endian)).toThrow()
        })

        it("failed case -- data and type mismatch", () => {
            const type = {
                typeIndex: "0x80",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const data = {
                val1: "22",
                val2: 33,
            }
            const endian = ENDIAN.BIG;
            expect(() => encodeData(type, data, endian)).toThrow()
        })

        it("failed case -- data and type mismatch", () => {
            const type = {
                typeIndex: "0x80",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const data = {
                val1: 22,
                val2: 33,
                val3: 55, // <-- extra field
            }
            const endian = ENDIAN.BIG;
            expect(() => encodeData(type, data, endian)).toThrow()
        })

        it("failed case -- data and type mismatch, more fields in data", () => {
            const type = {
                typeIndex: "0x80",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const data = {
                val1: 22,
                val2: 33,
                val3: 55, // <-- extra field
            }
            const endian = ENDIAN.BIG;
            expect(() => encodeData(type, data, endian)).toThrow()
        })

        it("failed case -- data and type mismatch, more fields in type", () => {
            const type = {
                typeIndex: "0x80",
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                    val2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }
            const data = {
                val1: 22,
            }
            const endian = ENDIAN.BIG;
            expect(() => encodeData(type, data, endian)).toThrow()
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
            const result = encodeData(type, data, endian);
            expect(result.toJSON().data).toEqual(bufferArray);
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
            const result = encodeData(type, data, endian);
            expect(result.toJSON().data).toEqual(bufferArray);
        })


    })

    describe("string_fixedSizeArray, 0x78", () => {
        it("ok", () => {
            const endian = ENDIAN.BIG;
            const data = ["This", " ", "is", " ", "TCA", "."];
            const result = encodeData({ typeIndex: "0x78", size: 6 }, data, endian);
            expect(result.toJSON().data).toEqual([
                4, 84, 104, 105, 115, // "This"
                1, 32, // " "
                2, 105, 115, // "is" 
                1, 32, // " "
                3, 84, 67, 65, // "TCA"
                1, 46, // "."
            ])
        })

        it("ok, with an id", () => {
            const endian = ENDIAN.BIG;
            const data = ["This", " ", "is", " ", "TCA", "."];
            const result = encodeData({ typeIndex: "0x78", size: 6, id: 0x22 }, data, endian);
            expect(result.toJSON().data).toEqual([
                // the type's id is not in the data
                4, 84, 104, 105, 115, // "This"
                1, 32, // " "
                2, 105, 115, // "is" 
                1, 32, // " "
                3, 84, 67, 65, // "TCA"
                1, 46, // "."
            ])
        })


        it("ok, 0 length", () => {
            const endian = ENDIAN.BIG;
            const data: string[] = [];
            const result = encodeData({ typeIndex: "0x78", size: 0, id: 0x22 }, data, endian);
            expect(result.toJSON().data).toEqual([])
        })

        it("failed case, type def error, size missing", () => {
            const endian = ENDIAN.BIG;
            const data = ["This", " ", "is", " ", "TCA", "."];
            expect(() => { encodeData({ typeIndex: "0x78", id: 0x22 }, data, endian) }).toThrow();
        })


        it("failed case, data has a number element", () => {
            const endian = ENDIAN.BIG;
            const data = ["This", " ", "is", 33, "TCA", "."];
            expect(() => { encodeData({ typeIndex: "0x78", id: 0x22 }, data, endian) }).toThrow();
        })

        it("bad: sizes do not match", () => {
            const endian = ENDIAN.BIG;
            const data = ["This", " ", "is", " ", "TCA", "."];
            expect(() => { encodeData({ typeIndex: "0x78", size: 5 }, data, endian) }).toThrow();
        })
    })

    describe("string_boundedSizeArray, 0x70", () => {
        it("ok", () => {
            const endian = ENDIAN.BIG;
            const data = ["This", " ", "is", " ", "TCA", "."];
            const result = encodeData({ typeIndex: "0x70", size: 22 }, data, endian);
            expect(result.toJSON().data).toEqual([
                6, // actual size
                4, 84, 104, 105, 115, // "This"
                1, 32, // " "
                2, 105, 115, // "is" 
                1, 32, // " "
                3, 84, 67, 65, // "TCA"
                1, 46, // "."
            ])
        })


        it("ok, 0 length", () => {
            const endian = ENDIAN.BIG;
            const data: string[] = [];
            const result = encodeData({ typeIndex: "0x70", size: 0, id: 0x22 }, data, endian);
            expect(result.toJSON().data).toEqual([0x00])
        })

        it("bad: actual sizes overflow", () => {
            const endian = ENDIAN.BIG;
            const data = ["This", " ", "is", " ", "TCA", "."];
            expect(() => { encodeData({ typeIndex: "0x70", size: 5 }, data, endian) }).toThrow();
        })


        it("bad: data has a number", () => {
            const endian = ENDIAN.BIG;
            const data = ["This", " ", "is", 33, "TCA", "."];
            expect(() => { encodeData({ typeIndex: "0x70", size: 5 }, data, endian) }).toThrow();
        })

    })

    describe("string_variableSizeArray, 0x68", () => {

        it("ok", () => {
            const endian = ENDIAN.BIG;
            const data = ["This", " ", "is", " ", "TCA", "."];
            const result = encodeData({ typeIndex: "0x68" }, data, endian);
            expect(result.toJSON().data).toEqual([
                6, // size
                4, 84, 104, 105, 115, // "This"
                1, 32, // " "
                2, 105, 115, // "is" 
                1, 32, // " "
                3, 84, 67, 65, // "TCA"
                1, 46, // "."
            ])
        })


        it("ok -- 0 size array", () => {
            const endian = ENDIAN.BIG;
            const data: string[] = [];
            const result = encodeData({ typeIndex: "0x68" }, data, endian);
            expect(result.toJSON().data).toEqual([0x00])
        })

        it("failed case -- data has a number element", () => {
            const endian = ENDIAN.BIG;
            const data = ["This", " ", "is", 33, "TCA", "."];
            expect(() => { encodeData({ typeIndex: "0x68" }, data, endian) }).toThrow();
        })

    })


    describe("string_scalar, 0x60", () => {
        it("ok", () => {
            const endian = ENDIAN.BIG;
            const str = "This is TCA";
            const buffer = encodeData({ typeIndex: "0x60" }, str, endian);
            expect(buffer.toJSON()["data"]).toEqual([11, 84, 104, 105, 115, 32, 105, 115, 32, 84, 67, 65]);
        })

        it("ok, little endian", () => {
            const endian = ENDIAN.LITTLE;
            const str = "This is TCA";
            const buffer = encodeData({ typeIndex: "0x60" }, str, endian);
            expect(buffer.toJSON()["data"]).toEqual([11, 84, 104, 105, 115, 32, 105, 115, 32, 84, 67, 65]);
        })

        it("normal case -- 0 size string", () => {
            const endian = ENDIAN.BIG;
            const str = "";
            const buffer = encodeData({ typeIndex: "0x60" }, str, endian);
            expect(buffer.toJSON()["data"]).toEqual([0x00]);
        })

        it("failed case -- data is not a string", () => {
            const endian = ENDIAN.BIG;
            const str = 35;
            expect(() => { encodeData({ typeIndex: "0x60" }, str, endian) }).toThrow();
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
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
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
                const data = datas[ii];
                const result = encodeData(type, data, endian);
                expect(result.toJSON().data).toEqual(bufferArrays[ii]);
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
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
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
                const data = datas[ii];
                const result = encodeData(type, data, endian);
                expect(result.toJSON().data).toEqual(bufferArrays[ii]);
            }

        })

        it("normal case -- signed/unsigned long array are bigints", () => {
            const endian = ENDIAN.BIG;
            const types = [
                { typeIndex: "0x5b", size: 0x03 },
                { typeIndex: "0x5a", size: 0x03 },
                { typeIndex: "0x53", size: 0x03 },
                { typeIndex: "0x52", size: 0x03 },
                { typeIndex: "0x3f", size: 0x03 }, // <- 
                { typeIndex: "0x3e", size: 0x03 },
                { typeIndex: "0x3d", size: 0x03 },
                { typeIndex: "0x3c", size: 0x03 },
                { typeIndex: "0x3b", size: 0x03 }, // <- 
                { typeIndex: "0x3a", size: 0x03 },
                { typeIndex: "0x39", size: 0x03 },
                { typeIndex: "0x38", size: 0x03 },
                { typeIndex: "0x37", size: 0x03 }, // <- 
                { typeIndex: "0x36", size: 0x03 },
                { typeIndex: "0x35", size: 0x03 },
                { typeIndex: "0x34", size: 0x03 },
                { typeIndex: "0x33", size: 0x03 }, // <- 
                { typeIndex: "0x32", size: 0x03 },
                { typeIndex: "0x31", size: 0x03 },
                { typeIndex: "0x30", size: 0x03 },
            ];
            const datas = [
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3n, 2n, 42n], // <- 
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3n, 2n, 42n], // <-
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3n, 2n, 42n], // <-
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3n, 2n, 42n], // <-
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
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
                const data = datas[ii];
                const result = encodeData(type, data, endian);
                expect(result.toJSON().data).toEqual(bufferArrays[ii]);
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
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42], // negative number not allowed
                [-3.14, -2.71, -42], // negative number not allowed
                [-3.14, -2.71, -42], // negative number not allowed
                [-3.14, -2.71, -42], // negative number not allowed
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42], // negative number not allowed
                [-3.14, -2.71, -42], // negative number not allowed
                [-3.14, -2.71, -42], // negative number not allowed
                [-3.14, -2.71, -42], // negative number not allowed
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
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
                if (type["typeIndex"] === "0x3f" || type["typeIndex"] === "0x3e" || type["typeIndex"] === "0x3d" || type["typeIndex"] === "0x3c" ||
                    type["typeIndex"] === "0x37" || type["typeIndex"] === "0x36" || type["typeIndex"] === "0x35" || type["typeIndex"] === "0x34"
                ) {
                    expect(() => { encodeData(type, data, endian) }).toThrow();
                } else {
                    const result = encodeData(type, data, endian);
                    expect(result.toJSON().data).toEqual(bufferArrays[ii]);
                }
            }

        })

        it("failed case -- size overflow/different", () => {
            const endian = ENDIAN.BIG;
            const types = [
                { typeIndex: "0x5b", size: 0x02 },
                { typeIndex: "0x5a", size: 0x02 },
                { typeIndex: "0x53", size: 0x02 },
                { typeIndex: "0x52", size: 0x02 },
                { typeIndex: "0x3f", size: 0x02 },
                { typeIndex: "0x3e", size: 0x02 },
                { typeIndex: "0x3d", size: 0x02 },
                { typeIndex: "0x3c", size: 0x02 },
                { typeIndex: "0x3b", size: 0x02 },
                { typeIndex: "0x3a", size: 0x02 },
                { typeIndex: "0x39", size: 0x02 },
                { typeIndex: "0x38", size: 0x02 },
                { typeIndex: "0x37", size: 0x02 },
                { typeIndex: "0x36", size: 0x02 },
                { typeIndex: "0x35", size: 0x02 },
                { typeIndex: "0x34", size: 0x02 },
                { typeIndex: "0x33", size: 0x02 },
                { typeIndex: "0x32", size: 0x02 },
                { typeIndex: "0x31", size: 0x02 },
                { typeIndex: "0x30", size: 0x02 },
            ];
            const datas = [
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
            ];

            for (let ii = 0; ii < datas.length; ii++) {
                const type = types[ii];
                const data = datas[ii];
                expect(() => { encodeData(type, data, endian) }).toThrow();
            }

        })

        it("failed case -- there is a string in each array", () => {
            const endian = ENDIAN.BIG;
            const types = [
                { typeIndex: "0x5b", size: 0x02 },
                { typeIndex: "0x5a", size: 0x02 },
                { typeIndex: "0x53", size: 0x02 },
                { typeIndex: "0x52", size: 0x02 },
                { typeIndex: "0x3f", size: 0x02 },
                { typeIndex: "0x3e", size: 0x02 },
                { typeIndex: "0x3d", size: 0x02 },
                { typeIndex: "0x3c", size: 0x02 },
                { typeIndex: "0x3b", size: 0x02 },
                { typeIndex: "0x3a", size: 0x02 },
                { typeIndex: "0x39", size: 0x02 },
                { typeIndex: "0x38", size: 0x02 },
                { typeIndex: "0x37", size: 0x02 },
                { typeIndex: "0x36", size: 0x02 },
                { typeIndex: "0x35", size: 0x02 },
                { typeIndex: "0x34", size: 0x02 },
                { typeIndex: "0x33", size: 0x02 },
                { typeIndex: "0x32", size: 0x02 },
                { typeIndex: "0x31", size: 0x02 },
                { typeIndex: "0x30", size: 0x02 },
            ];
            const datas = [
                ["-3.14", -2.71, -42],
                ["-3.14", -2.71, -42],
                ["-3.14", -2.71, -42],
                ["-3.14", -2.71, -42],
                ["-3.14", -2.71, -42],
                ["-3.14", -2.71, -42],
                ["-3.14", -2.71, -42],
                ["-3.14", -2.71, -42],
                ["-3.14", -2.71, -42],
                ["-3.14", -2.71, -42],
                ["-3.14", -2.71, -42],
                ["-3.14", -2.71, -42],
                ["-3.14", -2.71, -42],
                ["-3.14", -2.71, -42],
                ["-3.14", -2.71, -42],
                ["-3.14", -2.71, -42],
                ["-3.14", -2.71, -42],
                ["-3.14", -2.71, -42],
                ["-3.14", -2.71, -42],
                ["-3.14", -2.71, -42],
            ];

            for (let ii = 0; ii < datas.length; ii++) {
                const type = types[ii];
                const data = datas[ii];
                expect(() => { encodeData(type, data, endian) }).toThrow();
            }

        })


        it("failed case -- there is a bigint in each array", () => {
            const endian = ENDIAN.BIG;
            const types = [
                { typeIndex: "0x5b", size: 0x02 },
                { typeIndex: "0x5a", size: 0x02 },
                { typeIndex: "0x53", size: 0x02 },
                { typeIndex: "0x52", size: 0x02 },
                { typeIndex: "0x3f", size: 0x02 },
                { typeIndex: "0x3e", size: 0x02 },
                { typeIndex: "0x3d", size: 0x02 },
                { typeIndex: "0x3c", size: 0x02 },
                { typeIndex: "0x3b", size: 0x02 },
                { typeIndex: "0x3a", size: 0x02 },
                { typeIndex: "0x39", size: 0x02 },
                { typeIndex: "0x38", size: 0x02 },
                { typeIndex: "0x37", size: 0x02 },
                { typeIndex: "0x36", size: 0x02 },
                { typeIndex: "0x35", size: 0x02 },
                { typeIndex: "0x34", size: 0x02 },
                { typeIndex: "0x33", size: 0x02 },
                { typeIndex: "0x32", size: 0x02 },
                { typeIndex: "0x31", size: 0x02 },
                { typeIndex: "0x30", size: 0x02 },
            ];
            const datas: any[] = [
                [-3.14, -2.71, -42n], // all elements must be in same type
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
            ];

            for (let ii = 0; ii < datas.length; ii++) {
                const type = types[ii];
                const data = datas[ii];
                expect(() => { encodeData(type, data, endian) }).toThrow();
            }

        })

        it("failed case -- typo in type", () => {
            const endian = ENDIAN.BIG;
            const types = [
                { typeInde: "0x5b", size: 0x03 },
                { typeInde: "0x5a", size: 0x03 },
                { typeInde: "0x53", size: 0x03 },
                { typeInde: "0x52", size: 0x03 },
                { typeInde: "0x3f", size: 0x03 },
                { typeInde: "0x3e", size: 0x03 },
                { typeInde: "0x3d", size: 0x03 },
                { typeInde: "0x3c", size: 0x03 },
                { typeInde: "0x3b", size: 0x03 },
                { typeInde: "0x3a", size: 0x03 },
                { typeInde: "0x39", size: 0x03 },
                { typeInde: "0x38", size: 0x03 },
                { typeInde: "0x37", size: 0x03 },
                { typeInde: "0x36", size: 0x03 },
                { typeInde: "0x35", size: 0x03 },
                { typeInde: "0x34", size: 0x03 },
                { typeInde: "0x33", size: 0x03 },
                { typeInde: "0x32", size: 0x03 },
                { typeInde: "0x31", size: 0x03 },
                { typeInde: "0x30", size: 0x03 },
            ];
            const datas = [
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
            ];
            
            for (let ii = 0; ii < datas.length; ii++) {
                const type = types[ii];
                const data = datas[ii];
                expect(() => {encodeData(type, data, endian)}).toThrow();
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
                [3.14, 2.71, 42],
                3.14,
                3.14,
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                3.14,
                3.14,
                3.14,
                3.14,
                3.14,
                3.14,
                3.14,
                3.14,
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
                const result = encodeData(type, data, endian);
                expect(result.toJSON().data).toEqual(bufferArrays[ii]);
            }

        })

        it("normal case -- signed/unsigned long data are bigint", () => {
            const endian = ENDIAN.BIG;
            const types = [
                { typeIndex: "0x4b" },
                { typeIndex: "0x4a" },
                { typeIndex: "0x43" },
                { typeIndex: "0x42" },
                { typeIndex: "0x2f" }, // <--
                { typeIndex: "0x2e" },
                { typeIndex: "0x2d" },
                { typeIndex: "0x2c" },
                { typeIndex: "0x2b" }, // <--
                { typeIndex: "0x2a" },
                { typeIndex: "0x29" },
                { typeIndex: "0x28" },
                { typeIndex: "0x27" }, // <--
                { typeIndex: "0x26" },
                { typeIndex: "0x25" },
                { typeIndex: "0x24" },
                { typeIndex: "0x23" }, // <--
                { typeIndex: "0x22" },
                { typeIndex: "0x21" },
                { typeIndex: "0x20" },
            ];
            const datas = [
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                3.14,
                3.14,
                [3n, 2n, 42n],  // <--
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3n, 2n, 42n], // <--
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                3n,  // <--
                3.14,
                3.14,
                3.14,
                3n, // <--
                3.14,
                3.14,
                3.14,
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
                const result = encodeData(type, data, endian);
                expect(result.toJSON().data).toEqual(bufferArrays[ii]);
            }

        })

        it("normal case -- with ID and TAG", () => {
            const endian = ENDIAN.BIG;
            const types = [
                { typeIndex: "0x4b", id: 0x22, tag: 0x55 },
                { typeIndex: "0x4a", id: 0x22, tag: 0x55 },
                { typeIndex: "0x43", id: 0x22, tag: 0x55 },
                { typeIndex: "0x42", id: 0x22, tag: 0x55 },
                { typeIndex: "0x2f", id: 0x22, tag: 0x55 },
                { typeIndex: "0x2e", id: 0x22, tag: 0x55 },
                { typeIndex: "0x2d", id: 0x22, tag: 0x55 },
                { typeIndex: "0x2c", id: 0x22, tag: 0x55 },
                { typeIndex: "0x2b", id: 0x22, tag: 0x55 },
                { typeIndex: "0x2a", id: 0x22, tag: 0x55 },
                { typeIndex: "0x29", id: 0x22, tag: 0x55 },
                { typeIndex: "0x28", id: 0x22, tag: 0x55 },
                { typeIndex: "0x27", id: 0x22, tag: 0x55 },
                { typeIndex: "0x26", id: 0x22, tag: 0x55 },
                { typeIndex: "0x25", id: 0x22, tag: 0x55 },
                { typeIndex: "0x24", id: 0x22, tag: 0x55 },
                { typeIndex: "0x23", id: 0x22, tag: 0x55 },
                { typeIndex: "0x22", id: 0x22, tag: 0x55 },
                { typeIndex: "0x21", id: 0x22, tag: 0x55 },
                { typeIndex: "0x20", id: 0x22, tag: 0x55 },
            ];

            const datas = [
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                3.14,
                3.14,
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                3.14,
                3.14,
                3.14,
                3.14,
                3.14,
                3.14,
                3.14,
                3.14,
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
                const result = encodeData(type, data, endian);
                expect(result.toJSON().data).toEqual(bufferArrays[ii]);
            }

        })


        it("normal case -- negative numbers", () => {
            const endian = ENDIAN.BIG;
            const types = [
                { typeIndex: "0x4b", },
                { typeIndex: "0x4a", },
                { typeIndex: "0x43", },
                { typeIndex: "0x42", },
                { typeIndex: "0x2f", }, // negative number not allowed
                { typeIndex: "0x2e", }, // negative number not allowed
                { typeIndex: "0x2d", }, // negative number not allowed
                { typeIndex: "0x2c", }, // negative number not allowed
                { typeIndex: "0x2b", },
                { typeIndex: "0x2a", },
                { typeIndex: "0x29", },
                { typeIndex: "0x28", },
                { typeIndex: "0x27", },// negative number not allowed
                { typeIndex: "0x26", },// negative number not allowed
                { typeIndex: "0x25", },// negative number not allowed
                { typeIndex: "0x24", },// negative number not allowed
                { typeIndex: "0x23", },
                { typeIndex: "0x22", },
                { typeIndex: "0x21", },
                { typeIndex: "0x20", },
            ];
            const datas = [
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                -3.14,
                -3.14,
                [-3.14, -2.71, -42], // negative number not allowed
                [-3.14, -2.71, -42], // negative number not allowed
                [-3.14, -2.71, -42], // negative number not allowed
                [-3.14, -2.71, -42], // negative number not allowed
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                [-3.14, -2.71, -42],
                -3.14, // negative number not allowed
                -3.14, // negative number not allowed
                -3.14, // negative number not allowed
                -3.14, // negative number not allowed
                -3.14,
                -3.14,
                -3.14,
                -3.14,
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
                [0xfd, ,],
            ];

            for (let ii = 0; ii < datas.length; ii++) {
                const type = types[ii];
                const data = datas[ii];
                if (type["typeIndex"] === "0x2f" || type["typeIndex"] === "0x2e" || type["typeIndex"] === "0x2d" || type["typeIndex"] === "0x2c" ||
                    type["typeIndex"] === "0x27" || type["typeIndex"] === "0x26" || type["typeIndex"] === "0x25" || type["typeIndex"] === "0x24"
                ) {
                    expect(() => { encodeData(type, data, endian) }).toThrow();
                } else {
                    const result = encodeData(type, data, endian);
                    expect(result.toJSON().data).toEqual(bufferArrays[ii]);
                }
            }

        })

        it("failed case -- there is a string in each array", () => {
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
                [3.14, 2.71, "42"],
                [3.14, 2.71, "42"],
                "3.14",
                "3.14",
                [3.14, 2.71, "42"],
                [3.14, 2.71, "42"],
                [3.14, 2.71, "42"],
                [3.14, 2.71, "42"],
                [3.14, 2.71, "42"],
                [3.14, 2.71, "42"],
                [3.14, 2.71, "42"],
                [3.14, 2.71, "42"],
                "3.14",
                "3.14",
                "3.14",
                "3.14",
                "3.14",
                "3.14",
                "3.14",
                "3.14",
            ];
            for (let ii = 0; ii < datas.length; ii++) {
                const type = types[ii];
                const data = datas[ii];
                expect(() => { encodeData(type, data, endian) }).toThrow();
            }

        })


        it("failed case -- there is a bigint in each array", () => {
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
            const datas: any[] = [
                [-3.14, -2.71, -42n], // all elements must be in same type
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
                [-3.14, -2.71, -42n],
            ];

            for (let ii = 0; ii < datas.length; ii++) {
                const type = types[ii];
                const data = datas[ii];
                expect(() => { encodeData(type, data, endian) }).toThrow();
            }

        })

        it("failed case -- typo in type definition", () => {
            const endian = ENDIAN.BIG;
            const types = [
                { typeInde: "0x4b" },
                { typeInde: "0x4a" },
                { typeInde: "0x43" },
                { typeInde: "0x42" },
                { typeInde: "0x2f" },
                { typeInde: "0x2e" },
                { typeInde: "0x2d" },
                { typeInde: "0x2c" },
                { typeInde: "0x2b" },
                { typeInde: "0x2a" },
                { typeInde: "0x29" },
                { typeInde: "0x28" },
                { typeInde: "0x27" },
                { typeInde: "0x26" },
                { typeInde: "0x25" },
                { typeInde: "0x24" },
                { typeInde: "0x23" },
                { typeInde: "0x22" },
                { typeInde: "0x21" },
                { typeInde: "0x20" },
            ];
            const datas = [
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                3.14,
                3.14,
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                [3.14, 2.71, 42],
                3.14,
                3.14,
                3.14,
                3.14,
                3.14,
                3.14,
                3.14,
                3.14,
            ];

            for (let ii = 0; ii < datas.length; ii++) {
                const type = types[ii];
                const data = datas[ii];
                expect(() => {encodeData(type, data, endian)}).toThrow();
            }

        })

    })

    describe("floatingPoint_variableSizeArray_binary64, 0x4b -- already covered", () => {

    })

    describe("floatingPoint_variableSizeArray_binary32, 0x4a -- already covered", () => {

    })

    describe("floatingPoint_scalar_binary64, 0x43 -- already covered", () => {
        it("ok", () => {
            const endian = ENDIAN.BIG;
            const num = 3.14;
            const buffer = encodeData({ typeIndex: "0x43" }, num, endian);
            expect(buffer.toJSON().data).toEqual([0x40, 0x09, 0x1e, 0xb8, 0x51, 0xeb, 0x85, 0x1f]);
        })

        it("ok, ignore additional property", () => {
            const endian = ENDIAN.BIG;
            const num = 3.14;
            const buffer = encodeData({ typeIndex: "0x43", id: 77 }, num, endian);
            expect(buffer.toJSON().data).toEqual([0x40, 0x09, 0x1e, 0xb8, 0x51, 0xeb, 0x85, 0x1f]);
        })

        it("bad, typeIndex in type is written as typeInde, throw an exception", () => {
            const endian = ENDIAN.BIG;
            const num = 3.14;
            expect(() => { encodeData({ typeInde: "0x43" } as any, num, endian) }).toThrow();
        })

        it("ok, little endian", () => {
            const endian = ENDIAN.LITTLE;
            const num = 3.14;
            const buffer = encodeData({ typeIndex: "0x43" }, num, endian);
            expect(buffer.toJSON().data).toEqual([0x1f, 0x85, 0xeb, 0x51, 0xb8, 0x1e, 0x09, 0x40]);
        })

        it("bad, try to encode using 0x82 (variant union), throw an exception", () => {
            const endian = ENDIAN.LITTLE;
            const num = 3.14;
            expect(() => { encodeData({ typeIndex: "0x82" }, num, endian) }).toThrow();
        })

        it("bad, try to encode using 0x83 (bounded string), throw an exception", () => {
            const endian = ENDIAN.LITTLE;
            const num = 3.14;
            expect(() => { encodeData({ typeIndex: "0x83" }, num, endian) }).toThrow();
        })
    })

    describe("floatingPoint_scalar_binary32, 0x42 -- already covered", () => {
        it("ok", () => {
            const endian = ENDIAN.BIG;
            const num = 3.14;
            const buffer = encodeData({ typeIndex: "0x42" }, num, endian);
            expect(buffer.toJSON().data).toEqual([0x40, 0x48, 0xf5, 0xc3]);
        })

        it("ok, little endian", () => {
            const endian = ENDIAN.LITTLE;
            const num = 3.14;
            const buffer = encodeData({ typeIndex: "0x42" }, num, endian);
            expect(buffer.toJSON().data).toEqual([0xc3, 0xf5, 0x48, 0x40]);
        })

        it("ok, ignore additional property", () => {
            const endian = ENDIAN.BIG;
            const num = 3.14;
            const buffer = encodeData({ typeIndex: "0x42", id: 77 }, num, endian);
            expect(buffer.toJSON().data).toEqual([0x40, 0x48, 0xf5, 0xc3]);
        })

        it("ok, number overflow, write 0x7f800000, no throw", () => {
            const endian = ENDIAN.BIG;
            const num = 3.5e38;
            const buffer = encodeData({ typeIndex: "0x42", id: 77 }, num, endian);
            expect(buffer.toJSON().data).toEqual([0x7f, 0x80, 0x00, 0x00]);
        })

        it("bad, typeIndex in type is written as typeInde, throw an exception", () => {
            const endian = ENDIAN.BIG;
            const num = 3.14;
            expect(() => { encodeData({ typeInde: "0x42" } as any, num, endian) }).toThrow();
        })

        it("bad, try to encode using 0x82 (variant union), throw an exception", () => {
            const endian = ENDIAN.LITTLE;
            const num = 3.14;
            expect(() => { encodeData({ typeIndex: "0x82" }, num, endian) }).toThrow();
        })

        it("bad, try to encode using 0x83 (bounded string), throw an exception", () => {
            const endian = ENDIAN.LITTLE;
            const num = 3.14;
            expect(() => { encodeData({ typeIndex: "0x83" }, num, endian) }).toThrow();
        })
    })

    describe("integer_fixedSizeArray_unsignedLong, 0x3f -- already covered", () => {

    })

    describe("integer_fixedSizeArray_unsignedInt, 0x3e -- already covered", () => {

    })

    describe("integer_fixedSizeArray_unsignedShort, 0x3d -- already covered", () => {

    })

    describe("integer_fixedSizeArray_unsignedByte, 0x3c -- already covered", () => {

    })

    describe("integer_fixedSizeArray_signedLong, 0x3b -- already covered", () => {

    })

    describe("integer_fixedSizeArray_signedInt, 0x3a -- already covered", () => {

    })

    describe("integer_fixedSizeArray_signedShort, 0x39 -- already covered", () => {

    })

    describe("integer_fixedSizeArray_signedByte, 0x38 -- already covered", () => {

    })

    describe("integer_boundedSizeArray_unsignedLong, 0x37 -- already covered", () => {

    })

    describe("integer_boundedSizeArray_unsignedInt, 0x36 -- already covered", () => {

    })

    describe("integer_boundedSizeArray_unsignedShort, 0x35 -- already covered", () => {

    })

    describe("integer_boundedSizeArray_unsignedByte, 0x34 -- already covered", () => {

    })

    describe("integer_boundedSizeArray_signedLong, 0x33 -- already covered", () => {

    })

    describe("integer_boundedSizeArray_signedInt, 0x32 -- already covered", () => {

    })

    describe("integer_boundedSizeArray_signedShort, 0x31 -- already covered", () => {

    })

    describe("integer_boundedSizeArray_signedByte, 0x30 -- already covered", () => {

    })

    describe("integer_variableSizeArray_unsignedLong, 0x2f -- already covered", () => {

    })

    describe("integer_variableSizeArray_unsignedInt, 0x2e -- already covered", () => {

    })

    describe("integer_variableSizeArray_unsignedShort, 0x2d -- already covered", () => {

    })

    describe("integer_variableSizeArray_unsignedByte, 0x2c -- already covered", () => {

    })

    describe("integer_variableSizeArray_signedLong, 0x2b -- already covered", () => {

    })

    describe("integer_variableSizeArray_signedInt, 0x2a -- already covered", () => {

    })

    describe("integer_variableSizeArray_signedShort, 0x29 -- already covered", () => {

    })

    describe("integer_variableSizeArray_signedByte, 0x28 -- already covered", () => {

    })

    describe("integer_scalar_unsignedLong, 0x27 -- already covered", () => {
        it("ok", () => {
            const endian = ENDIAN.BIG;
            const num = 96;
            const buffer = encodeData({ typeIndex: "0x27" }, num, endian);
            expect(buffer.toJSON().data).toEqual([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x60]);
        })

        it("ok, little endian", () => {
            const endian = ENDIAN.LITTLE;
            const num = 96;
            const buffer = encodeData({ typeIndex: "0x27" }, num, endian);
            expect(buffer.toJSON().data).toEqual([0x60, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
        })

        it("ok, ignore additional property in type", () => {
            const endian = ENDIAN.BIG;
            const num = 96;
            const buffer = encodeData({ typeIndex: "0x27", fields: {} }, num, endian);
            expect(buffer.toJSON().data).toEqual([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x60]);
        })

        it("ok, big int input", () => {
            const endian = ENDIAN.BIG;
            const num = 96n;
            const buffer = encodeData({ typeIndex: "0x27" }, num, endian);
            expect(buffer.toJSON().data).toEqual([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x60]);
        })

        it("ok, a large number", () => {
            const endian = ENDIAN.BIG;
            const num = 0x6fffffffffffffffn;
            const buffer = encodeData({ typeIndex: "0x27" }, num, endian);
            expect(buffer.toJSON().data).toEqual([0x6f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
        })

        it("ok, a floating point number as input, write a floor value", () => {
            const endian = ENDIAN.BIG;
            const num = 12.345678;
            const buffer = encodeData({ typeIndex: "0x27" }, num, endian);
            expect(buffer.toJSON().data).toEqual([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0c]);
        })

        it("bad, number overflow, throw", () => {
            const endian = ENDIAN.BIG;
            const num = 0x6fffffffffffffff1n; // too large for 8-byte number
            expect(() => { encodeData({ typeIndex: "0x27" }, num, endian) }).toThrow();
        })

        it("bad, typeIndex in type is written as typeInde, throw an exception", () => {
            const endian = ENDIAN.BIG;
            const num = 77;
            expect(() => { encodeData({ typeInde: "0x27" } as any, num, endian) }).toThrow();
        })

        it("bad, try to encode using 0x82 (variant union), throw an exception", () => {
            const endian = ENDIAN.LITTLE;
            const num = 77;
            expect(() => { encodeData({ typeIndex: "0x82" }, num, endian) }).toThrow();
        })

        it("bad, try to encode using 0x83 (bounded string), throw an exception", () => {
            const endian = ENDIAN.LITTLE;
            const num = 77;
            expect(() => { encodeData({ typeIndex: "0x83" }, num, endian) }).toThrow();
        })

    })

    describe("integer_scalar_unsignedInt, 0x26 -- already covered", () => {

    })

    describe("integer_scalar_unsignedShort, 0x25 -- already covered", () => {

    })

    describe("integer_scalar_unsignedByte, 0x24 -- already covered", () => {

    })

    describe("integer_scalar_signedLong, 0x23 -- already covered", () => {

    })

    describe("integer_scalar_signedInt, 0x22 -- already covered", () => {

    })

    describe("integer_scalar_signedShort, 0x21 -- already covered", () => {
        it("good", () => {
            const endian = ENDIAN.BIG;
            const int = 38;
            const result = encodeData({ typeIndex: "0x21" }, int, endian);
            expect(result.toJSON().data).toEqual([0, 38]);
        })

        it("good: encode negative number", () => {
            const endian = ENDIAN.BIG;
            const int = -54;
            const result = encodeData({ typeIndex: "0x21" }, int, endian);
            expect(result.toJSON().data).toEqual([0xff, 0xca]);
        })

        it("bad: number out of range", () => {
            const endian = ENDIAN.BIG;
            const int = 200000000;
            expect(() => { encodeData({ typeIndex: "0x21" }, int, endian) }).toThrow();
        })

        it("bad: number out of range", () => {
            const endian = ENDIAN.BIG;
            const int = -200000000;
            expect(() => { encodeData({ typeIndex: "0x21" }, int, endian) }).toThrow();
        })

        it("input type has additional property: ignored", () => {
            const endian = ENDIAN.BIG;
            const int = 0x22;
            expect(encodeData({ typeIndex: "0x21", fields: {} }, int, endian).toJSON().data).toEqual([0x00, 0x22])
        })

        it("try to encode a string instead of a number", () => {
            const endian = ENDIAN.BIG;
            const int = "ABC";
            expect(() => { encodeData({ typeIndex: "0x21" }, int, endian) }).toThrow()
        })

    })

    describe("integer_scalar_signedByte, 0x20 -- already covered", () => {
        it("good", () => {
            const endian = ENDIAN.BIG;
            const int = 38;
            const result = encodeData({ typeIndex: "0x20" }, int, endian);
            expect(result.toJSON().data).toEqual([38]);
        })

        it("good: encode negative number", () => {
            const endian = ENDIAN.BIG;
            const int = -54;
            const result = encodeData({ typeIndex: "0x20" }, int, endian);
            expect(result.toJSON().data).toEqual([202]);
        })

        it("bad: number out of range", () => {
            const endian = ENDIAN.BIG;
            const int = 200;
            expect(() => { encodeData({ typeIndex: "0x20" }, int, endian) }).toThrow();
        })

        it("bad: number out of range", () => {
            const endian = ENDIAN.BIG;
            const int = -200;
            expect(() => { encodeData({ typeIndex: "0x20" }, int, endian) }).toThrow();
        })

        it("input type has additional property: ignored", () => {
            const endian = ENDIAN.BIG;
            const int = 0x22;
            expect(encodeData({ typeIndex: "0x20", fields: {} }, int, endian).toJSON().data).toEqual([0x22])
        })

        it("try to encode a string instead of a number", () => {
            const endian = ENDIAN.BIG;
            const int = "ABC";
            expect(() => { encodeData({ typeIndex: "0x20" }, int, endian) }).toThrow()
        })

    })

    describe("boolean_fixedSizeArray, 0x18", () => {
        it("good", () => {
            const bools = [true, false, false, false];
            const endian = ENDIAN.BIG;
            const result = encodeData({ typeIndex: "0x18", size: 4 }, bools, endian);
            expect(result.toJSON().data).toEqual([0x01, 0x00, 0x00, 0x00]);
        })

        it("bad: actual size and type defined size do not match", () => {
            const bools = [true, false, false, false];
            const endian = ENDIAN.BIG;
            expect(() => { encodeData({ typeIndex: "0x18", size: 5 }, bools, endian) }).toThrow();
        })

        it("bad: actual size and type defined size do not match", () => {
            const bools = [true, false, false, false];
            const endian = ENDIAN.BIG;
            expect(() => { encodeData({ typeIndex: "0x18", size: 3 }, bools, endian) }).toThrow();
        })

        it("failed case -- a number in array", () => {
            const bools = [true, false, false, 1];
            const endian = ENDIAN.BIG;
            expect(() => {encodeData({ typeIndex: "0x18", size: 4 }, bools, endian)}).toThrow();
        })
    })

    describe("boolean_boundedSizeArray, 0x10", () => {
        it("good", () => {
            const bools = [true, false, false, false];
            const endian = ENDIAN.BIG;
            const result = encodeData({ typeIndex: "0x10", size: 30 }, bools, endian);
            expect(result.toJSON().data).toEqual([0x04, 0x01, 0x00, 0x00, 0x00]);
        })

        it("bad: actual size overflow", () => {
            const bools = [true, false, false, false];
            const endian = ENDIAN.BIG;
            expect(() => { encodeData({ typeIndex: "0x10", size: 3 }, bools, endian) }).toThrow();
        })

        it("failed case -- there is a number in array", () => {
            const bools = [true, false, false, 2];
            const endian = ENDIAN.BIG;
            expect(() => {encodeData({ typeIndex: "0x10", size: 30 }, bools, endian)}).toThrow();
        })
    })

    describe("boolean_variableSizeArray, 0x8", () => {
        it("good", () => {
            const bools = [true, false, false, false];
            const endian = ENDIAN.BIG;
            const result = encodeData({ typeIndex: "0x8" }, bools, endian);
            expect(result.toJSON().data).toEqual([0x04, 0x01, 0x00, 0x00, 0x00]);
        })

        it("failed case -- there is a number in array", () => {
            const bools = [true, false, false, 1];
            const endian = ENDIAN.BIG;
            expect(() => {encodeData({ typeIndex: "0x8" }, bools, endian)}).toThrow();
        })
    })

    describe("boolean_scalar, 0x0", () => {
        it("good, true", () => {
            const bool = true;
            const endian = ENDIAN.BIG;
            const result = encodeData({ typeIndex: "0x0" }, bool, endian);
            expect(result.toJSON().data).not.toEqual([0x0]);
        })

        it("good, false", () => {
            const bool = false;
            const endian = ENDIAN.BIG;
            const result = encodeData({ typeIndex: "0x0" }, bool, endian);
            expect(result.toJSON().data).toEqual([0x0]);
        })

        it("failed case -- data type wrong", () => {
            const bool = 1;
            const endian = ENDIAN.BIG;
            expect(() => {encodeData({ typeIndex: "0x0" }, bool, endian)}).toThrow();
        })
    })


})



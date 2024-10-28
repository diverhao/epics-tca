import { type_typeIndex } from "../PvaData/DataDecoder"
import { encodeData } from "../PvaData/DataEncoder"
import { ENDIAN } from "../PvaData/PvaMethods"


describe("DataEncoder.test", () => {

    describe("complex_variableSizeArray_variantUnion, 0x8a", () => {

    })

    describe("complex_variableSizeArray_union, 0x89", () => {

    })

    describe("complex_variableSizeArray_structure, 0x88", () => {

    })

    describe("complex_scalar_boundedString, 0x83", () => {

    })

    describe("complex_scalar_variantUnion, 0x82", () => {

    })

    describe("complex_scalar_union, 0x81", () => {

    })

    describe("complex_scalar_structure, 0x80", () => {

        it("ok, PVA protocol spec (2015 version) page 10", () => {
            const endian = ENDIAN.BIG;

            const type = {
                typeIndex: "0x80" as type_typeIndex,
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
            const result = encodeData(data, type, endian);
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
            console.log(result);
        })

        it("same as above, little endian", () => {
            const endian = ENDIAN.LITTLE;

            const type = {
                typeIndex: "0x80" as type_typeIndex,
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
            const result = encodeData(data, type, endian);
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
            console.log(result);
        })
    })

    describe("string_fixedSizeArray, 0x78", () => {
        it("ok", () => {
            const endian = ENDIAN.BIG;
            const data = ["This", " ", "is", " ", "TCA", "."];
            const result = encodeData(data, { typeIndex: "0x78", size: 6 }, endian);
            expect(result.toJSON().data).toEqual([
                4, 84, 104, 105, 115, // "This"
                1, 32, // " "
                2, 105, 115, // "is" 
                1, 32, // " "
                3, 84, 67, 65, // "TCA"
                1, 46, // "."
            ])
        })

        it("bad: sizes do not match", () => {
            const endian = ENDIAN.BIG;
            const data = ["This", " ", "is", " ", "TCA", "."];
            expect(() => { encodeData(data, { typeIndex: "0x78", size: 5 }, endian) }).toThrow();
        })
    })

    describe("string_boundedSizeArray, 0x70", () => {
        it("ok", () => {
            const endian = ENDIAN.BIG;
            const data = ["This", " ", "is", " ", "TCA", "."];
            const result = encodeData(data, { typeIndex: "0x70", size: 22 }, endian);
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

        it("bad: actual sizes overflow", () => {
            const endian = ENDIAN.BIG;
            const data = ["This", " ", "is", " ", "TCA", "."];
            expect(() => { encodeData(data, { typeIndex: "0x70", size: 5 }, endian) }).toThrow();
        })

    })

    describe("string_variableSizeArray, 0x68", () => {

        it("ok", () => {
            const endian = ENDIAN.BIG;
            const data = ["This", " ", "is", " ", "TCA", "."];
            const result = encodeData(data, { typeIndex: "0x68" }, endian);
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

    })

    describe("string_scalar, 0x60", () => {
        it("ok", () => {
            const endian = ENDIAN.BIG;
            const str = "This is TCA";
            const buffer = encodeData(str, { typeIndex: "0x60" }, endian);
            expect(buffer.toJSON()["data"]).toEqual([11, 84, 104, 105, 115, 32, 105, 115, 32, 84, 67, 65]);
        })

        it("ok, little endian", () => {
            const endian = ENDIAN.LITTLE;
            const str = "This is TCA";
            const buffer = encodeData(str, { typeIndex: "0x60" }, endian);
            expect(buffer.toJSON()["data"]).toEqual([11, 84, 104, 105, 115, 32, 105, 115, 32, 84, 67, 65]);
        })

    })

    describe("floatingPoint_fixedSizeArray_binary64, 0x5b", () => {
        it("ok", () => {
            const endian = ENDIAN.BIG;
            const data = [3.14, 2.71, 42];
            const result = encodeData(data, { typeIndex: "0x5b", size: 3 }, endian);
            console.log(result)
            expect(result.toJSON().data).toEqual([
                0x40, 0x09, 0x1E, 0xB8, 0x51, 0xEB, 0x85, 0x1F,
                0x40, 0x05, 0xAE, 0x14, 0x7A, 0xE1, 0x47, 0xAE,
                0x40, 0x45, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            ])
        })

        it("ok, little endian", () => {
            const endian = ENDIAN.LITTLE;
            const data = [3.14, 2.71, 42];
            const result = encodeData(data, { typeIndex: "0x5b", size: 3 }, endian);
            console.log(result)
            expect(result.toJSON().data).toEqual([
                0x1F, 0x85, 0xEB, 0x51, 0xB8, 0x1E, 0x09, 0x40,
                0xAE, 0x47, 0xE1, 0x7A, 0x14, 0xAE, 0x05, 0x40,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x45, 0x40,
            ])
        })

        it("bad, size not match", () => {
            const endian = ENDIAN.LITTLE;
            const data = [3.14, 2.71, 42];
            expect(() => { encodeData(data, { typeIndex: "0x5b", size: 2 }, endian) }).toThrow();
        })

    })

    describe("floatingPoint_fixedSizeArray_binary32, 0x5a", () => {

    })

    describe("floatingPoint_boundedSizeArray_binary64, 0x53", () => {

    })

    describe("floatingPoint_boundedSizeArray_binary32, 0x52", () => {

    })

    describe("floatingPoint_variableSizeArray_binary64, 0x4b", () => {

    })

    describe("floatingPoint_variableSizeArray_binary32, 0x4a", () => {

    })

    describe("floatingPoint_scalar_binary64, 0x43", () => {
        it("ok", () => {
            const endian = ENDIAN.BIG;
            const num = 3.14;
            const buffer = encodeData(num, { typeIndex: "0x43" }, endian);
            expect(buffer.toJSON().data).toEqual([0x40, 0x09, 0x1e, 0xb8, 0x51, 0xeb, 0x85, 0x1f]);
        })

        it("ok, little endian", () => {
            const endian = ENDIAN.LITTLE;
            const num = 3.14;
            const buffer = encodeData(num, { typeIndex: "0x43" }, endian);
            expect(buffer.toJSON().data).toEqual([0x1f, 0x85, 0xeb, 0x51, 0xb8, 0x1e, 0x09, 0x40]);
        })
    })

    describe("floatingPoint_scalar_binary32, 0x42", () => {
        it("ok", () => {
            const endian = ENDIAN.BIG;
            const num = 3.14;
            const buffer = encodeData(num, { typeIndex: "0x42" }, endian);
            expect(buffer.toJSON().data).toEqual([0x40, 0x48, 0xf5, 0xc3]);
        })

        it("ok, little endian", () => {
            const endian = ENDIAN.LITTLE;
            const num = 3.14;
            const buffer = encodeData(num, { typeIndex: "0x42" }, endian);
            expect(buffer.toJSON().data).toEqual([0xc3, 0xf5, 0x48, 0x40]);
        })

    })

    describe("integer_fixedSizeArray_unsignedLong, 0x3f", () => {

    })

    describe("integer_fixedSizeArray_unsignedInt, 0x3e", () => {

    })

    describe("integer_fixedSizeArray_unsignedShort, 0x3d", () => {

    })

    describe("integer_fixedSizeArray_unsignedByte, 0x3c", () => {

    })

    describe("integer_fixedSizeArray_signedLong, 0x3b", () => {

    })

    describe("integer_fixedSizeArray_signedInt, 0x3a", () => {

    })

    describe("integer_fixedSizeArray_signedShort, 0x39", () => {

    })

    describe("integer_fixedSizeArray_signedByte, 0x38", () => {

    })

    describe("integer_boundedSizeArray_unsignedLong, 0x37", () => {

    })

    describe("integer_boundedSizeArray_unsignedInt, 0x36", () => {

    })

    describe("integer_boundedSizeArray_unsignedShort, 0x35", () => {

    })

    describe("integer_boundedSizeArray_unsignedByte, 0x34", () => {

    })

    describe("integer_boundedSizeArray_signedLong, 0x33", () => {

    })

    describe("integer_boundedSizeArray_signedInt, 0x32", () => {

    })

    describe("integer_boundedSizeArray_signedShort, 0x31", () => {

    })

    describe("integer_boundedSizeArray_signedByte, 0x30", () => {

    })

    describe("integer_variableSizeArray_unsignedLong, 0x2f", () => {

    })

    describe("integer_variableSizeArray_unsignedInt, 0x2e", () => {

    })

    describe("integer_variableSizeArray_unsignedShort, 0x2d", () => {

    })

    describe("integer_variableSizeArray_unsignedByte, 0x2c", () => {

    })

    describe("integer_variableSizeArray_signedLong, 0x2b", () => {

    })

    describe("integer_variableSizeArray_signedInt, 0x2a", () => {

    })

    describe("integer_variableSizeArray_signedShort, 0x29", () => {

    })

    describe("integer_variableSizeArray_signedByte, 0x28", () => {

    })

    describe("integer_scalar_unsignedLong, 0x27", () => {

    })

    describe("integer_scalar_unsignedInt, 0x26", () => {

    })

    describe("integer_scalar_unsignedShort, 0x25", () => {

    })

    describe("integer_scalar_unsignedByte, 0x24", () => {

    })

    describe("integer_scalar_signedLong, 0x23", () => {

    })

    describe("integer_scalar_signedInt, 0x22", () => {

    })

    describe("integer_scalar_signedShort, 0x21", () => {

    })

    describe("integer_scalar_signedByte, 0x20", () => {
        it("good", () => {
            const endian = ENDIAN.BIG;
            const int = 38;
            const result = encodeData(int, {typeIndex: "0x20"}, endian);
            expect(result.toJSON().data).toEqual([38]);
        })

        it("good: encode negative number", () => {
            const endian = ENDIAN.BIG;
            const int = -54;
            const result = encodeData(int, {typeIndex: "0x20"}, endian);
            expect(result.toJSON().data).toEqual([202]);
        })

        it("bad: number out of range", () => {
            const endian = ENDIAN.BIG;
            const int = 200;
            expect(() => {encodeData(int, {typeIndex: "0x20"}, endian)}).toThrow();
        })

        it("bad: number out of range", () => {
            const endian = ENDIAN.BIG;
            const int = -200;
            expect(() => {encodeData(int, {typeIndex: "0x20"}, endian)}).toThrow();
        })

    })

    describe("boolean_fixedSizeArray, 0x18", () => {
        it("good", () => {
            const bools = [true, false, false, false];
            const endian = ENDIAN.BIG;
            const result = encodeData(bools, { typeIndex: "0x18", size: 4 }, endian);
            expect(result.toJSON().data).toEqual([0x01, 0x00, 0x00, 0x00]);
        })

        it("bad: actual size and type defined size do not match", () => {
            const bools = [true, false, false, false];
            const endian = ENDIAN.BIG;
            expect(() => { encodeData(bools, { typeIndex: "0x18", size: 5 }, endian) }).toThrow();
        })

        it("bad: actual size and type defined size do not match", () => {
            const bools = [true, false, false, false];
            const endian = ENDIAN.BIG;
            expect(() => { encodeData(bools, { typeIndex: "0x18", size: 3 }, endian) }).toThrow();
        })
    })

    describe("boolean_boundedSizeArray, 0x10", () => {
        it("good", () => {
            const bools = [true, false, false, false];
            const endian = ENDIAN.BIG;
            const result = encodeData(bools, { typeIndex: "0x10", size: 30 }, endian);
            expect(result.toJSON().data).toEqual([0x04, 0x01, 0x00, 0x00, 0x00]);
        })

        it("bad: actual size overflow", () => {
            const bools = [true, false, false, false];
            const endian = ENDIAN.BIG;
            expect(() => { encodeData(bools, { typeIndex: "0x10", size: 3 }, endian) }).toThrow();
        })
    })

    describe("boolean_variableSizeArray, 0x8", () => {
        it("good", () => {
            const bools = [true, false, false, false];
            const endian = ENDIAN.BIG;
            const result = encodeData(bools, { typeIndex: "0x8" }, endian);
            expect(result.toJSON().data).toEqual([0x04, 0x01, 0x00, 0x00, 0x00]);
        })
    })

    describe("boolean_scalar, 0x0", () => {
        it("good, true", () => {
            const bool = true;
            const endian = ENDIAN.BIG;
            const result = encodeData(bool, { typeIndex: "0x0" }, endian);
            expect(result.toJSON().data).not.toEqual([0x0]);
        })

        it("good, false", () => {
            const bool = false;
            const endian = ENDIAN.BIG;
            const result = encodeData(bool, { typeIndex: "0x0" }, endian);
            expect(result.toJSON().data).toEqual([0x0]);
        })
    })


})



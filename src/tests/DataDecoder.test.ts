import { endianness } from "os"
import { type_typeIndex } from "../PvaData/PvaData_typeEncoding"
import { decodeData } from "../PvaData/DataDecoder"
import { createSizeBuffer, ENDIAN } from "../PvaData/PvaMethods"

describe("DataDecoder for PVA", () => {

    it("complex_variableSizeArray_variantUnion, 0x8a", () => {

    })

    it("complex_variableSizeArray_union, 0x89", () => {

    })

    it("complex_variableSizeArray_structure, 0x88", () => {

    })

    describe("complex_scalar_boundedString, 0x83", () => {

        it("good", () => {
            // create buffer
            const str = "This is TCA";
            const boundSize = str.length + 5;
            const endian = ENDIAN.BIG;
            const sizeBuffer = createSizeBuffer(str.length, endian);
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
            const sizeBuffer = createSizeBuffer(str.length, endian);
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
            const sizeBuffer = createSizeBuffer(str.length, endian);
            const strBuffer = Buffer.from(str);
            const buffer = Buffer.concat([sizeBuffer, strBuffer]);
            // decode buffer
            expect(() => { decodeData({ typeIndex: "0x83", size: boundSize }, buffer, 0, endian) }).toThrow();
        })
    })

    it("complex_scalar_variantUnion, 0x82", () => {

    })

    it("complex_scalar_union, 0x81", () => {

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
                typeIndex: "0x80" as type_typeIndex,
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
                valueUnion: {index: 1, value: 0x33333333},
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
                typeIndex: "0x80" as type_typeIndex,
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
                valueUnion: {index: 1, value: 0x33333333},
                variantUnion: {
                    type: {
                        typeIndex: "0x60",
                    },
                    value: "String inside variant union."
                }
            })
        })
    })


    describe("string_fixedSizeArray, 0x78", () => {
        it("good", () => {
            // create buffer for test
            const str1 = "This is TCA";
            const str2 = "It is awesome";
            const str3 = "Yes, it is.";
            const endian = ENDIAN.BIG;
            const buffer1 = Buffer.concat([createSizeBuffer(str1.length, endian), Buffer.from(str1)]);
            const buffer2 = Buffer.concat([createSizeBuffer(str2.length, endian), Buffer.from(str2)]);
            const buffer3 = Buffer.concat([createSizeBuffer(str3.length, endian), Buffer.from(str3)]);
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
            const buffer1 = Buffer.concat([createSizeBuffer(str1.length, endian), Buffer.from(str1)]);
            const buffer2 = Buffer.concat([createSizeBuffer(str2.length, endian), Buffer.from(str2)]);
            const buffer3 = Buffer.concat([createSizeBuffer(str3.length, endian), Buffer.from(str3)]);
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
            const buffer1 = Buffer.concat([createSizeBuffer(str1.length, endian), Buffer.from(str1)]);
            const buffer2 = Buffer.concat([createSizeBuffer(str2.length, endian), Buffer.from(str2)]);
            const buffer3 = Buffer.concat([createSizeBuffer(str3.length, endian), Buffer.from(str3)]);
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
            const buffer1 = Buffer.concat([createSizeBuffer(str1.length, endian), Buffer.from(str1)]);
            const buffer2 = Buffer.concat([createSizeBuffer(str2.length, endian), Buffer.from(str2)]);
            const buffer3 = Buffer.concat([createSizeBuffer(str3.length, endian), Buffer.from(str3)]);
            const sizeBuffer = createSizeBuffer(3, endian);
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
            const buffer1 = Buffer.concat([createSizeBuffer(str1.length, endian), Buffer.from(str1)]);
            const buffer2 = Buffer.concat([createSizeBuffer(str2.length, endian), Buffer.from(str2)]);
            const buffer3 = Buffer.concat([createSizeBuffer(str3.length, endian), Buffer.from(str3)]);
            const sizeBuffer = createSizeBuffer(3, endian);
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
            const buffer1 = Buffer.concat([createSizeBuffer(str1.length, endian), Buffer.from(str1)]);
            const buffer2 = Buffer.concat([createSizeBuffer(str2.length, endian), Buffer.from(str2)]);
            const buffer3 = Buffer.concat([createSizeBuffer(str3.length, endian), Buffer.from(str3)]);
            const sizeBuffer = createSizeBuffer(4, endian);
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
            const buffer1 = Buffer.concat([createSizeBuffer(str1.length, endian), Buffer.from(str1)]);
            const buffer2 = Buffer.concat([createSizeBuffer(str2.length, endian), Buffer.from(str2)]);
            const buffer3 = Buffer.concat([createSizeBuffer(str3.length, endian), Buffer.from(str3)]);
            const sizeBuffer = createSizeBuffer(3, endian);
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
            const buffer1 = Buffer.concat([createSizeBuffer(str1.length, endian), Buffer.from(str1)]);
            const buffer2 = Buffer.concat([createSizeBuffer(str2.length, endian), Buffer.from(str2)]);
            const buffer3 = Buffer.concat([createSizeBuffer(str3.length, endian), Buffer.from(str3)]);
            const sizeBuffer = createSizeBuffer(3, endian);
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
            const buffer1 = Buffer.concat([createSizeBuffer(str1.length, endian), Buffer.from(str1)]);
            const buffer2 = Buffer.concat([createSizeBuffer(str2.length, endian), Buffer.from(str2)]);
            const buffer3 = Buffer.concat([createSizeBuffer(str3.length, endian), Buffer.from(str3)]);
            const sizeBuffer = createSizeBuffer(3, endian);
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
            const buffer1 = Buffer.concat([createSizeBuffer(str1.length, endian), Buffer.from(str1)]);
            const buffer2 = Buffer.concat([createSizeBuffer(str2.length, endian), Buffer.from(str2)]);
            const buffer3 = Buffer.concat([createSizeBuffer(str3.length, endian), Buffer.from(str3)]);
            const sizeBuffer = createSizeBuffer(3 - 1, endian);
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
            const buffer1 = Buffer.concat([createSizeBuffer(str1.length, endian), Buffer.from(str1)]);
            const buffer2 = Buffer.concat([createSizeBuffer(str2.length, endian), Buffer.from(str2)]);
            const buffer3 = Buffer.concat([createSizeBuffer(str3.length, endian), Buffer.from(str3)]);
            const sizeBuffer = createSizeBuffer(3 + 1, endian);
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
            const sizeBuffer = createSizeBuffer(size, endian);
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
            const sizeBuffer = createSizeBuffer(size, endian);
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
            const sizeBuffer = createSizeBuffer(size + 2, endian); // will read "This is TCA" + 2 more bytes
            const strBuffer = Buffer.from(str);
            const buffer = Buffer.concat([sizeBuffer, strBuffer]);
            // decode the data
            expect(() => { decodeData({ typeIndex: "0x60" }, buffer, 0, endian) }).toThrow();
        })
    })

    it("floatingPoint_fixedSizeArray_binary64, 0x5b", () => {

    })

    it("floatingPoint_fixedSizeArray_binary32, 0x5a", () => {

    })

    it("floatingPoint_boundedSizeArray_binary64, 0x53", () => {

    })

    it("floatingPoint_boundedSizeArray_binary32, 0x52", () => {

    })

    it("floatingPoint_variableSizeArray_binary64, 0x4b", () => {

    })

    it("floatingPoint_variableSizeArray_binary32, 0x4a", () => {

    })

    describe("floatingPoint_scalar_binary64, 0x43", () => {
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

    describe("floatingPoint_scalar_binary32, 0x42", () => {
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

    describe("integer_fixedSizeArray_unsignedLong, 0x3f", () => {
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

    it("integer_fixedSizeArray_unsignedInt, 0x3e", () => {

    })

    it("integer_fixedSizeArray_unsignedShort, 0x3d", () => {

    })

    it("integer_fixedSizeArray_unsignedByte, 0x3c", () => {

    })

    it("integer_fixedSizeArray_signedLong, 0x3b", () => {

    })

    it("integer_fixedSizeArray_signedInt, 0x3a", () => {

    })

    it("integer_fixedSizeArray_signedShort, 0x39", () => {

    })

    it("integer_fixedSizeArray_signedByte, 0x38", () => {

    })

    it("integer_boundedSizeArray_unsignedLong, 0x37", () => {

    })

    it("integer_boundedSizeArray_unsignedInt, 0x36", () => {

    })

    it("integer_boundedSizeArray_unsignedShort, 0x35", () => {

    })

    it("integer_boundedSizeArray_unsignedByte, 0x34", () => {

    })

    it("integer_boundedSizeArray_signedLong, 0x33", () => {

    })

    it("integer_boundedSizeArray_signedInt, 0x32", () => {

    })

    it("integer_boundedSizeArray_signedShort, 0x31", () => {

    })

    it("integer_boundedSizeArray_signedByte, 0x30", () => {

    })

    it("integer_variableSizeArray_unsignedLong, 0x2f", () => {

    })

    it("integer_variableSizeArray_unsignedInt, 0x2e", () => {

    })

    it("integer_variableSizeArray_unsignedShort, 0x2d", () => {

    })

    it("integer_variableSizeArray_unsignedByte, 0x2c", () => {

    })

    it("integer_variableSizeArray_signedLong, 0x2b", () => {

    })

    it("integer_variableSizeArray_signedInt, 0x2a", () => {

    })

    it("integer_variableSizeArray_signedShort, 0x29", () => {

    })

    it("integer_variableSizeArray_signedByte, 0x28", () => {

    })

    it("integer_scalar_unsignedLong, 0x27", () => {

    })

    it("integer_scalar_unsignedInt, 0x26", () => {

    })

    it("integer_scalar_unsignedShort, 0x25", () => {

    })

    it("integer_scalar_unsignedByte, 0x24", () => {

    })

    it("integer_scalar_signedLong, 0x23", () => {

    })

    it("integer_scalar_signedInt, 0x22", () => {

    })

    it("integer_scalar_signedShort, 0x21", () => {

    })

    it("integer_scalar_signedByte, 0x20", () => {

    })

    it("boolean_fixedSizeArray, 0x18", () => {

    })

    it("boolean_boundedSizeArray, 0x10", () => {

    })

    it("boolean_variableSizeArray, 0x8", () => {

    })

    it("boolean_scalar, 0x0", () => {

    })

})


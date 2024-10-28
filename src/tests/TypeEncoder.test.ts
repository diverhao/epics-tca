import { type_typeIndex } from "../PvaData/DataDecoder"
import { ENDIAN } from "../PvaData/PvaMethods"
import { encodeType } from "../PvaData/TypeEncoder"


describe("TypeEncoder.test", () => {

    describe("complex_variableSizeArray_variantUnion, 0x8a", () => {

    })

    describe("complex_variableSizeArray_union, 0x89", () => {

    })

    describe("complex_variableSizeArray_structure, 0x88", () => {

    })

    describe("complex_scalar_boundedString, 0x83", () => {
        it("good", () => {
            const endian = ENDIAN.BIG;
            const result = encodeType({ typeIndex: "0x83", size: 5 }, endian);
            expect(result.toJSON().data).toEqual([0x83, 0x05]);
        })

        it("good, with a numbered id", () => {
            const endian = ENDIAN.BIG;
            const result = encodeType({ typeIndex: "0x83", size: 5, id: 22 }, endian);
            console.log(result)
            expect(result.toJSON().data).toEqual([0xfd, 0x00, 0x16, 0x83, 0x05]);
        })

        it("good, little endian", () => {
            const endian = ENDIAN.LITTLE;
            const result = encodeType({ typeIndex: "0x83", size: 5, id: 22 }, endian);
            console.log(result)
            expect(result.toJSON().data).toEqual([0xfd, 0x16, 0x00, 0x83, 0x05]);
        })
    })

    describe("complex_scalar_variantUnion, 0x82", () => {

    })

    describe("complex_scalar_union, 0x81", () => {

    })

    describe("complex_scalar_structure, 0x80", () => {
        it("NTNDArray: https://docs.epics-controls.org/en/latest/pv-access/Normative-Types-Specification.html#ntndarray", () => {

                const endian = ENDIAN.LITTLE;
                const type = {
                    id: 1,
                    typeIndex: '0x80' as type_typeIndex,
                    name: 'epics:nt/NTNDArray:1.0',
                    fields: {
                        value: {
                            id: 2,
                            typeIndex: '0x81',
                            name: '',
                            fields: {
                                booleanValue: { typeIndex: '0x8' },
                                byteValue: { typeIndex: '0x28' },
                                shortValue: { typeIndex: '0x29' },
                                intValue: { typeIndex: '0x2a' },
                                longValue: { typeIndex: '0x2b' },
                                ubyteValue: { typeIndex: '0x2c' },
                                ushortValue: { typeIndex: '0x2d' },
                                uintValue: { typeIndex: '0x2e' },
                                ulongValue: { typeIndex: '0x2f' },
                                floatValue: { typeIndex: '0x4a' },
                                doubleValue: { typeIndex: '0x4b' }
                            }
                        },
                        codec: {
                            id: 3,
                            typeIndex: '0x80',
                            name: 'codec_t',
                            fields: {
                                name: { typeIndex: '0x60' },
                                parameters: { id: 4, typeIndex: '0x82' }
                            }
                        },
                        compressedSize: { typeIndex: '0x23' },
                        uncompressedSize: { typeIndex: '0x23' },
                        dimension: {
                            id: 5,
                            typeIndex: '0x88',
                            name: 'dimension_t',
                            fields: {
                                size: { typeIndex: '0x22' },
                                offset: { typeIndex: '0x22' },
                                fullSize: { typeIndex: '0x22' },
                                binning: { typeIndex: '0x22' },
                                reverse: { typeIndex: '0x0' }
                            },
                            elementId: 6
                        },
                        uniqueId: { typeIndex: '0x22' },
                        dataTimeStamp: {
                            id: 7,
                            typeIndex: '0x80',
                            name: 'time_t',
                            fields: {
                                secondsPastEpoch: { typeIndex: '0x23' },
                                nanoseconds: { typeIndex: '0x22' },
                                userTag: { typeIndex: '0x22' }
                            }
                        },
                        attribute: {
                            id: 8,
                            typeIndex: '0x88',
                            name: 'epics:nt/NTAttribute:1.0',
                            fields: {
                                name: { typeIndex: '0x60' },
                                value: { id: 4, typeIndex: '0x82' },
                                descriptor: { typeIndex: '0x60' },
                                sourceType: { typeIndex: '0x22' },
                                source: { typeIndex: '0x60' }
                            },
                            elementId: 9
                        },
                        timeStamp: {
                            id: 7,
                            typeIndex: '0x80',
                            name: 'time_t',
                            fields: {
                                secondsPastEpoch: { typeIndex: '0x23' },
                                nanoseconds: { typeIndex: '0x22' },
                                userTag: { typeIndex: '0x22' }
                            }
                        }
                    }
                };

                const buffer = encodeType(type, endian);
                const hex: string[] = [];
                buffer.toJSON().data.map((num: number) => hex.push(num.toString(16)));
                console.dir(hex.join(" "));
                expect(buffer.toJSON().data).toEqual(
                    [
                        0xfd, 0x01,
                        0x00, 0x80, 0x16, 0x65, 0x70, 0x69, 0x63, 0x73, 0x3a, 0x6e, 0x74, 0x2f, 0x4e, 0x54, 0x4e, 0x44, 0x41, 0x72, 0x72, 0x61, 0x79, 0x3a, 0x31, 0x2e,
                        0x30, 0x09, 0x05, 0x76, 0x61, 0x6c, 0x75, 0x65, 0xfd, 0x02, 0x00, 0x81, 0x00, 0x0b, 0x0c, 0x62, 0x6f, 0x6f, 0x6c, 0x65, 0x61, 0x6e, 0x56, 0x61,
                        0x6c, 0x75, 0x65, 0x08, 0x09, 0x62, 0x79, 0x74, 0x65, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x28, 0x0a, 0x73, 0x68, 0x6f, 0x72, 0x74, 0x56, 0x61, 0x6c,
                        0x75, 0x65, 0x29, 0x08, 0x69, 0x6e, 0x74, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x2a, 0x09, 0x6c, 0x6f, 0x6e, 0x67, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x2b,
                        0x0a, 0x75, 0x62, 0x79, 0x74, 0x65, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x2c, 0x0b, 0x75, 0x73, 0x68, 0x6f, 0x72, 0x74, 0x56, 0x61, 0x6c, 0x75, 0x65,
                        0x2d, 0x09, 0x75, 0x69, 0x6e, 0x74, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x2e, 0x0a, 0x75, 0x6c, 0x6f, 0x6e, 0x67, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x2f,
                        0x0a, 0x66, 0x6c, 0x6f, 0x61, 0x74, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x4a, 0x0b, 0x64, 0x6f, 0x75, 0x62, 0x6c, 0x65, 0x56, 0x61, 0x6c, 0x75, 0x65,
                        0x4b, 0x05, 0x63, 0x6f, 0x64, 0x65, 0x63, 0xfd, 0x03, 0x00, 0x80, 0x07, 0x63, 0x6f, 0x64, 0x65, 0x63, 0x5f, 0x74, 0x02, 0x04, 0x6e, 0x61, 0x6d,
                        0x65, 0x60, 0x0a, 0x70, 0x61, 0x72, 0x61, 0x6d, 0x65, 0x74, 0x65, 0x72, 0x73, 0xfd, 0x04, 0x00, 0x82, 0x0e, 0x63, 0x6f, 0x6d, 0x70, 0x72, 0x65,
                        0x73, 0x73, 0x65, 0x64, 0x53, 0x69, 0x7a, 0x65, 0x23, 0x10, 0x75, 0x6e, 0x63, 0x6f, 0x6d, 0x70, 0x72, 0x65, 0x73, 0x73, 0x65, 0x64, 0x53, 0x69,
                        0x7a, 0x65, 0x23, 0x09, 0x64, 0x69, 0x6d, 0x65, 0x6e, 0x73, 0x69, 0x6f, 0x6e, 0xfd, 0x05, 0x00, 0x88, 0xfd, 0x06, 0x00, 0x80, 0x0b, 0x64, 0x69,
                        0x6d, 0x65, 0x6e, 0x73, 0x69, 0x6f, 0x6e, 0x5f, 0x74, 0x05, 0x04, 0x73, 0x69, 0x7a, 0x65, 0x22, 0x06, 0x6f, 0x66, 0x66, 0x73, 0x65, 0x74, 0x22,
                        0x08, 0x66, 0x75, 0x6c, 0x6c, 0x53, 0x69, 0x7a, 0x65, 0x22, 0x07, 0x62, 0x69, 0x6e, 0x6e, 0x69, 0x6e, 0x67, 0x22, 0x07, 0x72, 0x65, 0x76, 0x65,
                        0x72, 0x73, 0x65, 0x00, 0x08, 0x75, 0x6e, 0x69, 0x71, 0x75, 0x65, 0x49, 0x64, 0x22, 0x0d, 0x64, 0x61, 0x74, 0x61, 0x54, 0x69, 0x6d, 0x65, 0x53,
                        0x74, 0x61, 0x6d, 0x70, 0xfd, 0x07, 0x00, 0x80, 0x06, 0x74, 0x69, 0x6d, 0x65, 0x5f, 0x74, 0x03, 0x10, 0x73, 0x65, 0x63, 0x6f, 0x6e, 0x64, 0x73,
                        0x50, 0x61, 0x73, 0x74, 0x45, 0x70, 0x6f, 0x63, 0x68, 0x23, 0x0b, 0x6e, 0x61, 0x6e, 0x6f, 0x73, 0x65, 0x63, 0x6f, 0x6e, 0x64, 0x73, 0x22, 0x07,
                        0x75, 0x73, 0x65, 0x72, 0x54, 0x61, 0x67, 0x22, 0x09, 0x61, 0x74, 0x74, 0x72, 0x69, 0x62, 0x75, 0x74, 0x65, 0xfd, 0x08, 0x00, 0x88, 0xfd, 0x09,
                        0x00, 0x80, 0x18, 0x65, 0x70, 0x69, 0x63, 0x73, 0x3a, 0x6e, 0x74, 0x2f, 0x4e, 0x54, 0x41, 0x74, 0x74, 0x72, 0x69, 0x62, 0x75, 0x74, 0x65, 0x3a,
                        0x31, 0x2e, 0x30, 0x05, 0x04, 0x6e, 0x61, 0x6d, 0x65, 0x60, 0x05, 0x76, 0x61, 0x6c, 0x75, 0x65, 0xfe, 0x04, 0x00, 0x0a, 0x64, 0x65, 0x73, 0x63,
                        0x72, 0x69, 0x70, 0x74, 0x6f, 0x72, 0x60, 0x0a, 0x73, 0x6f, 0x75, 0x72, 0x63, 0x65, 0x54, 0x79, 0x70, 0x65, 0x22, 0x06, 0x73, 0x6f, 0x75, 0x72,
                        0x63, 0x65, 0x60, 0x09, 0x74, 0x69, 0x6d, 0x65, 0x53, 0x74, 0x61, 0x6d, 0x70, 0xfe, 0x07, 0x00,
                    ]
                )
            
        })


    })

    describe("string_fixedSizeArray, 0x78", () => {

    })

    describe("string_boundedSizeArray, 0x70", () => {

    })

    describe("string_variableSizeArray, 0x68", () => {

    })

    describe("string_scalar, 0x60", () => {

    })

    describe("floatingPoint_fixedSizeArray_binary64, 0x5b", () => {

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

    })

    describe("floatingPoint_scalar_binary32, 0x42", () => {

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

    })

    describe("boolean_fixedSizeArray, 0x18", () => {

    })

    describe("boolean_boundedSizeArray, 0x10", () => {

    })

    describe("boolean_variableSizeArray, 0x8", () => {

    })

    describe("boolean_scalar  0x0", () => {

    })
})

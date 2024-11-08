import { checkDataAndType, checkType, typeIndexEnum } from "../PvaData/PvaData_typeEncoding"

describe("Test functions in PvaData_typeEncoding", () => {
    describe("checkType()", () => {
        it("normal case", () => {
            const type = {
                typeIndex: typeIndexEnum.integer_scalar_unsignedInt
            };
            const result = checkType(type);
            expect(result).toBe(undefined);
        })

        it("normal case, but with additional field, should pass", () => {
            const type = {
                typeIndex: typeIndexEnum.integer_scalar_unsignedInt,
                abc: "def",
            };
            const result = checkType(type);
            expect(result).toBe(undefined);
        })

        it("normal case, with ID", () => {
            const type = {
                typeIndex: typeIndexEnum.integer_scalar_unsignedInt,
                id: 22,
            };
            const result = checkType(type);
            expect(result).toBe(undefined);
        })

        it("normal case, with ID and TAG", () => {
            const type = {
                typeIndex: typeIndexEnum.integer_scalar_unsignedInt,
                id: 22,
                tag: 23,
            };
            const result = checkType(type);
            expect(result).toBe(undefined);
        })

        it("normal case -- struct, empty fields", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_structure,
                id: 22,
                tag: 23,
                name: "",
                fields: {}
            };
            const result = checkType(type);
            expect(result).toBe(undefined);
        })

        it("normal case -- struct, with struct/union/struct[] fields and subfields", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_structure,
                id: 22,
                tag: 23,
                name: "",
                fields: {
                    aaa: { typeIndex: typeIndexEnum.boolean_scalar },
                    bbb: {
                        typeIndex: typeIndexEnum.complex_scalar_structure,
                        name: "",
                        fields: {
                            bbb1: { typeIndex: typeIndexEnum.boolean_boundedSizeArray, size: 7 },
                            bbb2: {
                                typeIndex: typeIndexEnum.complex_scalar_structure,
                                name: "",
                                fields: {
                                    bbb2A: { typeIndex: typeIndexEnum.boolean_fixedSizeArray, size: 8 },
                                    bbb2B: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
                                }
                            },
                            bbb3: { typeIndex: typeIndexEnum.floatingPoint_boundedSizeArray_binary32, size: 9 },
                        }
                    },
                    ccc: {
                        typeIndex: typeIndexEnum.complex_scalar_union,
                        name: "",
                        fields: {
                            ccc1: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedShort, size: 6 },
                            ccc2: {
                                typeIndex: typeIndexEnum.complex_scalar_structure,
                                name: "",
                                fields: {}
                            }
                        }
                    },
                    ddd: {
                        typeIndex: typeIndexEnum.complex_scalar_structure,
                        name: "",
                        fields: {
                            ddd1: {
                                typeIndex: typeIndexEnum.complex_variableSizeArray_structure,
                                name: "abc",
                                id: 22,
                                elementId: 23,
                                tag: 24,
                                elementTag: 24,
                                fields: {
                                    ddd1A: { typeIndex: typeIndexEnum.integer_boundedSizeArray_signedInt, size: 4 }
                                }
                            }
                        }
                    }
                }
            };
            const result = checkType(type);
            expect(result).toBe(undefined);
        })

        it("failed case, ID has string type", () => {
            const type = {
                typeIndex: typeIndexEnum.integer_scalar_unsignedInt,
                id: "22",
            };
            expect(() => { checkType(type); }).toThrow();
        })

        it("failed case, struct missing name", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_structure,
                fields: {}
            };
            expect(() => { checkType(type); }).toThrow();
        })

        it("failed case, struct missing fields", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_structure,
                name: "abc"
            };
            expect(() => { checkType(type); }).toThrow();
        })



        it("failed case, union missing name", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_union,
                fields: {}
            };
            expect(() => { checkType(type); }).toThrow();
        })

        it("failed case, union missing fields", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_union,
                name: "abc"
            };
            expect(() => { checkType(type); }).toThrow();
        })

        it("failed case, struct array missing fields", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_variableSizeArray_structure,
                name: "abc"
            };
            expect(() => { checkType(type); }).toThrow();
        })


        it("failed case, struct array missing name", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_variableSizeArray_structure,
                fields: {}
            };
            expect(() => { checkType(type); }).toThrow();
        })

        it("failed case, union array missing fields", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_variableSizeArray_union,
                name: "abc"
            };
            expect(() => { checkType(type); }).toThrow();
        })

        it("failed case, union array missing name", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_variableSizeArray_union,
                fields: {}
            };
            expect(() => { checkType(type); }).toThrow();
        })

        it("normal case, union array", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_variableSizeArray_union,
                name: "abcd",
                fields: {
                    a: { typeIndex: typeIndexEnum.boolean_scalar }
                }
            };
            const result = checkType(type);
            expect(result).toBe(undefined)
        })

        it("normal case, union array with ID, TAG, element ID, and element TAG", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_variableSizeArray_union,
                name: "abcd",
                id: 1,
                tag: 2,
                elementId: 3,
                elementTag: 4,
                fields: {
                    a: { typeIndex: typeIndexEnum.boolean_scalar }
                }
            };
            const result = checkType(type);
            expect(result).toBe(undefined)
        })

        it("failed case, union array with a string element TAG", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_variableSizeArray_union,
                name: "abcd",
                id: 1,
                tag: 2,
                elementId: 3,
                elementTag: "4",
                fields: {
                    a: { typeIndex: typeIndexEnum.boolean_scalar }
                }
            };

            expect(() => { checkType(type) }).toThrow();
        })

        it("normal case -- all primitive scalar and variable size array types", () => {
            const scalarTypeIndices = [

                // typeIndexEnum.// complex_variableSizeArray_variantUnion,
                // typeIndexEnum.// complex_variableSizeArray_union,
                // typeIndexEnum.// complex_variableSizeArray_structure,
                // typeIndexEnum.// complex_scalar_boundedString,
                // typeIndexEnum.// complex_scalar_variantUnion,
                // typeIndexEnum.// complex_scalar_union,
                // typeIndexEnum.// complex_scalar_structure,
                // typeIndexEnum.// string_fixedSizeArray,
                // typeIndexEnum.// string_boundedSizeArray,
                typeIndexEnum.string_variableSizeArray,
                typeIndexEnum.string_scalar,
                // typeIndexEnum.// floatingPoint_fixedSizeArray_binary64,
                // typeIndexEnum.// floatingPoint_fixedSizeArray_binary32,
                // typeIndexEnum.// floatingPoint_boundedSizeArray_binary64,
                // typeIndexEnum.// floatingPoint_boundedSizeArray_binary32,
                typeIndexEnum.floatingPoint_variableSizeArray_binary64,
                typeIndexEnum.floatingPoint_variableSizeArray_binary32,
                typeIndexEnum.floatingPoint_scalar_binary64,
                typeIndexEnum.floatingPoint_scalar_binary32,
                // typeIndexEnum.// integer_fixedSizeArray_unsignedLong,
                // typeIndexEnum.// integer_fixedSizeArray_unsignedInt,
                // typeIndexEnum.// integer_fixedSizeArray_unsignedShort,
                // typeIndexEnum.// integer_fixedSizeArray_unsignedByte,
                // typeIndexEnum.// integer_fixedSizeArray_signedLong,
                // typeIndexEnum.// integer_fixedSizeArray_signedInt,
                // typeIndexEnum.// integer_fixedSizeArray_signedShort,
                // typeIndexEnum.// integer_fixedSizeArray_signedByte,
                // typeIndexEnum.// integer_boundedSizeArray_unsignedLong,
                // typeIndexEnum.// integer_boundedSizeArray_unsignedInt,
                // typeIndexEnum.// integer_boundedSizeArray_unsignedShort,
                // typeIndexEnum.// integer_boundedSizeArray_unsignedByte,
                // typeIndexEnum.// integer_boundedSizeArray_signedLong,
                // typeIndexEnum.// integer_boundedSizeArray_signedInt,
                // typeIndexEnum.// integer_boundedSizeArray_signedShort,
                // typeIndexEnum.// integer_boundedSizeArray_signedByte,
                typeIndexEnum.integer_variableSizeArray_unsignedLong,
                typeIndexEnum.integer_variableSizeArray_unsignedInt,
                typeIndexEnum.integer_variableSizeArray_unsignedShort,
                typeIndexEnum.integer_variableSizeArray_unsignedByte,
                typeIndexEnum.integer_variableSizeArray_signedLong,
                typeIndexEnum.integer_variableSizeArray_signedInt,
                typeIndexEnum.integer_variableSizeArray_signedShort,
                typeIndexEnum.integer_variableSizeArray_signedByte,
                typeIndexEnum.integer_scalar_unsignedLong,
                typeIndexEnum.integer_scalar_unsignedInt,
                typeIndexEnum.integer_scalar_unsignedShort,
                typeIndexEnum.integer_scalar_unsignedByte,
                typeIndexEnum.integer_scalar_signedLong,
                typeIndexEnum.integer_scalar_signedInt,
                typeIndexEnum.integer_scalar_signedShort,
                typeIndexEnum.integer_scalar_signedByte,
                // typeIndexEnum.// boolean_fixedSizeArray,
                // typeIndexEnum.// boolean_boundedSizeArray,
                typeIndexEnum.boolean_variableSizeArray,
                typeIndexEnum.boolean_scalar,
            ];
            const results: any[] = [];
            const expectedResults: any[] = [];
            for (let typeIndex of scalarTypeIndices) {
                const type = { typeIndex: typeIndex };
                const result = checkType(type);
                results.push(result);
                expectedResults.push(undefined);
            }
            expect(results).toEqual(expectedResults);
        })

        it("normal case -- all types that come with a size property ", () => {
            const scalarTypeIndices = [

                // typeIndexEnum.// complex_variableSizeArray_variantUnion,
                // typeIndexEnum.// complex_variableSizeArray_union,
                // typeIndexEnum.// complex_variableSizeArray_structure,
                // typeIndexEnum.// complex_scalar_boundedString,
                // typeIndexEnum.// complex_scalar_variantUnion,
                // typeIndexEnum.// complex_scalar_union,
                // typeIndexEnum.// complex_scalar_structure,
                typeIndexEnum.string_fixedSizeArray,
                typeIndexEnum.string_boundedSizeArray,
                // typeIndexEnum.string_variableSizeArray,
                // typeIndexEnum.string_scalar,
                typeIndexEnum.floatingPoint_fixedSizeArray_binary64,
                typeIndexEnum.floatingPoint_fixedSizeArray_binary32,
                typeIndexEnum.floatingPoint_boundedSizeArray_binary64,
                typeIndexEnum.floatingPoint_boundedSizeArray_binary32,
                // typeIndexEnum.floatingPoint_variableSizeArray_binary64,
                // typeIndexEnum.floatingPoint_variableSizeArray_binary32,
                // typeIndexEnum.floatingPoint_scalar_binary64,
                // typeIndexEnum.floatingPoint_scalar_binary32,
                typeIndexEnum.integer_fixedSizeArray_unsignedLong,
                typeIndexEnum.integer_fixedSizeArray_unsignedInt,
                typeIndexEnum.integer_fixedSizeArray_unsignedShort,
                typeIndexEnum.integer_fixedSizeArray_unsignedByte,
                typeIndexEnum.integer_fixedSizeArray_signedLong,
                typeIndexEnum.integer_fixedSizeArray_signedInt,
                typeIndexEnum.integer_fixedSizeArray_signedShort,
                typeIndexEnum.integer_fixedSizeArray_signedByte,
                typeIndexEnum.integer_boundedSizeArray_unsignedLong,
                typeIndexEnum.integer_boundedSizeArray_unsignedInt,
                typeIndexEnum.integer_boundedSizeArray_unsignedShort,
                typeIndexEnum.integer_boundedSizeArray_unsignedByte,
                typeIndexEnum.integer_boundedSizeArray_signedLong,
                typeIndexEnum.integer_boundedSizeArray_signedInt,
                typeIndexEnum.integer_boundedSizeArray_signedShort,
                typeIndexEnum.integer_boundedSizeArray_signedByte,
                // typeIndexEnum.integer_variableSizeArray_unsignedLong,
                // typeIndexEnum.integer_variableSizeArray_unsignedInt,
                // typeIndexEnum.integer_variableSizeArray_unsignedShort,
                // typeIndexEnum.integer_variableSizeArray_unsignedByte,
                // typeIndexEnum.integer_variableSizeArray_signedLong,
                // typeIndexEnum.integer_variableSizeArray_signedInt,
                // typeIndexEnum.integer_variableSizeArray_signedShort,
                // typeIndexEnum.integer_variableSizeArray_signedByte,
                // typeIndexEnum.integer_scalar_unsignedLong,
                // typeIndexEnum.integer_scalar_unsignedInt,
                // typeIndexEnum.integer_scalar_unsignedShort,
                // typeIndexEnum.integer_scalar_unsignedByte,
                // typeIndexEnum.integer_scalar_signedLong,
                // typeIndexEnum.integer_scalar_signedInt,
                // typeIndexEnum.integer_scalar_signedShort,
                // typeIndexEnum.integer_scalar_signedByte,
                typeIndexEnum.boolean_fixedSizeArray,
                typeIndexEnum.boolean_boundedSizeArray,
                // typeIndexEnum.boolean_variableSizeArray,
                // typeIndexEnum.boolean_scalar,
            ];
            const results: any[] = [];
            const expectedResults: any[] = [];
            for (let typeIndex of scalarTypeIndices) {
                const type = { typeIndex: typeIndex, size: 5 };
                const result = checkType(type);
                results.push(result);
                expectedResults.push(undefined);
            }
            expect(results).toEqual(expectedResults);
        })
    })

    describe("checkDataAndType()", () => {
        it("normal case", () => {
            const type = { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 };
            const data = 9.5;
            const result = checkDataAndType(data, type);
            expect(result).toBe(undefined);
        })

        it("normal case -- a floating number is ok for unsigned int type", () => {
            const type = { typeIndex: typeIndexEnum.integer_scalar_unsignedInt };
            const data = 9.5;
            const result = checkDataAndType(data, type);
            expect(result).toBe(undefined);
        })

        it("normal case -- a bigint number is ok for unsigned int ", () => {
            const type = { typeIndex: typeIndexEnum.integer_scalar_unsignedInt };
            const data = 9n;
            const result = checkDataAndType(data, type);
            expect(result).toBe(undefined);
        })

        it("normal case -- string type", () => {
            const type = { typeIndex: typeIndexEnum.string_scalar };
            const data = "9";
            const result = checkDataAndType(data, type);
            expect(result).toBe(undefined);
        })

        it("failed case -- integer for string type", () => {
            const type = { typeIndex: typeIndexEnum.string_scalar };
            const data = 9;
            expect(() => { checkDataAndType(data, type) }).toThrow();
        })

        it("failed case -- string for integer type", () => {
            const type = { typeIndex: typeIndexEnum.integer_scalar_signedInt };
            const data = "9";
            expect(() => { checkDataAndType(data, type) }).toThrow();
        })

        it("failed case -- string for integer array type", () => {
            const type = { typeIndex: typeIndexEnum.integer_variableSizeArray_signedInt };
            const data = "9";
            expect(() => { checkDataAndType(data, type) }).toThrow();
        })

        it("failed case -- string for floating array type", () => {
            const type = { typeIndex: typeIndexEnum.floatingPoint_boundedSizeArray_binary32, size: 5 };
            const data = "9";
            expect(() => { checkDataAndType(data, type) }).toThrow();
        })

        it("failed case -- type def wrong, although data is correct", () => {
            const type = { typeIndex: typeIndexEnum.floatingPoint_boundedSizeArray_binary32 };
            const data = [9];
            expect(() => { checkDataAndType(data, type) }).toThrow();
        })

        it("normal case -- floating point array ", () => {
            const type = { typeIndex: typeIndexEnum.floatingPoint_boundedSizeArray_binary32, size: 5 };
            const data = [9];
            const result = checkDataAndType(data, type);
            expect(result).toBe(undefined);
        })

        it("failed case -- floating point bounded array, out of bound", () => {
            const type = { typeIndex: typeIndexEnum.floatingPoint_boundedSizeArray_binary32, size: 5 };
            const data = [1, 2, 3, 4, 5, 6];
            expect(() => { checkDataAndType(data, type) }).toThrow();
        })

        it("normal case -- floating point fixed-size array, matched size", () => {
            const type = { typeIndex: typeIndexEnum.floatingPoint_fixedSizeArray_binary32, size: 5 };
            const data = [1, 2, 3, 4, 5];
            const result = checkDataAndType(data, type);
            expect(result).toBe(undefined);
        })

        it("failed case -- floating point fixed-size array, unmatched size", () => {
            const type = { typeIndex: typeIndexEnum.floatingPoint_fixedSizeArray_binary32, size: 5 };
            const data = [1, 2, 3, 4];
            expect(() => { checkDataAndType(data, type) }).toThrow();
        })

        it("normal case -- all scalar number types", () => {
            const scalarTypeIndices = [

                // typeIndexEnum.// complex_variableSizeArray_variantUnion,
                // typeIndexEnum.// complex_variableSizeArray_union,
                // typeIndexEnum.// complex_variableSizeArray_structure,
                // typeIndexEnum.// complex_scalar_boundedString,
                // typeIndexEnum.// complex_scalar_variantUnion,
                // typeIndexEnum.// complex_scalar_union,
                // typeIndexEnum.// complex_scalar_structure,
                // typeIndexEnum.string_fixedSizeArray,
                // typeIndexEnum.string_boundedSizeArray,
                // typeIndexEnum.string_variableSizeArray,
                // typeIndexEnum.string_scalar,
                // typeIndexEnum.floatingPoint_fixedSizeArray_binary64,
                // typeIndexEnum.floatingPoint_fixedSizeArray_binary32,
                // typeIndexEnum.floatingPoint_boundedSizeArray_binary64,
                // typeIndexEnum.floatingPoint_boundedSizeArray_binary32,
                // typeIndexEnum.floatingPoint_variableSizeArray_binary64,
                // typeIndexEnum.floatingPoint_variableSizeArray_binary32,
                // typeIndexEnum.floatingPoint_scalar_binary64,
                // typeIndexEnum.floatingPoint_scalar_binary32,
                // typeIndexEnum.integer_fixedSizeArray_unsignedLong,
                // typeIndexEnum.integer_fixedSizeArray_unsignedInt,
                // typeIndexEnum.integer_fixedSizeArray_unsignedShort,
                // typeIndexEnum.integer_fixedSizeArray_unsignedByte,
                // typeIndexEnum.integer_fixedSizeArray_signedLong,
                // typeIndexEnum.integer_fixedSizeArray_signedInt,
                // typeIndexEnum.integer_fixedSizeArray_signedShort,
                // typeIndexEnum.integer_fixedSizeArray_signedByte,
                // typeIndexEnum.integer_boundedSizeArray_unsignedLong,
                // typeIndexEnum.integer_boundedSizeArray_unsignedInt,
                // typeIndexEnum.integer_boundedSizeArray_unsignedShort,
                // typeIndexEnum.integer_boundedSizeArray_unsignedByte,
                // typeIndexEnum.integer_boundedSizeArray_signedLong,
                // typeIndexEnum.integer_boundedSizeArray_signedInt,
                // typeIndexEnum.integer_boundedSizeArray_signedShort,
                // typeIndexEnum.integer_boundedSizeArray_signedByte,
                // typeIndexEnum.integer_variableSizeArray_unsignedLong,
                // typeIndexEnum.integer_variableSizeArray_unsignedInt,
                // typeIndexEnum.integer_variableSizeArray_unsignedShort,
                // typeIndexEnum.integer_variableSizeArray_unsignedByte,
                // typeIndexEnum.integer_variableSizeArray_signedLong,
                // typeIndexEnum.integer_variableSizeArray_signedInt,
                // typeIndexEnum.integer_variableSizeArray_signedShort,
                // typeIndexEnum.integer_variableSizeArray_signedByte,
                typeIndexEnum.integer_scalar_unsignedLong,
                typeIndexEnum.integer_scalar_unsignedInt,
                typeIndexEnum.integer_scalar_unsignedShort,
                typeIndexEnum.integer_scalar_unsignedByte,
                typeIndexEnum.integer_scalar_signedLong,
                typeIndexEnum.integer_scalar_signedInt,
                typeIndexEnum.integer_scalar_signedShort,
                typeIndexEnum.integer_scalar_signedByte,
                // typeIndexEnum.boolean_fixedSizeArray,
                // typeIndexEnum.boolean_boundedSizeArray,
                // typeIndexEnum.boolean_variableSizeArray,
                // typeIndexEnum.boolean_scalar,
            ];

            const results: any[] = [];
            const expectedResults: any[] = [];
            for (let typeIndex of scalarTypeIndices) {
                const data = Math.random() * 50;
                const type = { typeIndex: typeIndex };
                const result = checkDataAndType(data, type);
                results.push(result);
            }
            expect(results).toEqual(expectedResults);
        })


        it("normal case -- scalar boolean", () => {
            const scalarTypeIndices = [

                // typeIndexEnum.// complex_variableSizeArray_variantUnion,
                // typeIndexEnum.// complex_variableSizeArray_union,
                // typeIndexEnum.// complex_variableSizeArray_structure,
                // typeIndexEnum.// complex_scalar_boundedString,
                // typeIndexEnum.// complex_scalar_variantUnion,
                // typeIndexEnum.// complex_scalar_union,
                // typeIndexEnum.// complex_scalar_structure,
                // typeIndexEnum.string_fixedSizeArray,
                // typeIndexEnum.string_boundedSizeArray,
                // typeIndexEnum.string_variableSizeArray,
                // typeIndexEnum.string_scalar,
                // typeIndexEnum.floatingPoint_fixedSizeArray_binary64,
                // typeIndexEnum.floatingPoint_fixedSizeArray_binary32,
                // typeIndexEnum.floatingPoint_boundedSizeArray_binary64,
                // typeIndexEnum.floatingPoint_boundedSizeArray_binary32,
                // typeIndexEnum.floatingPoint_variableSizeArray_binary64,
                // typeIndexEnum.floatingPoint_variableSizeArray_binary32,
                // typeIndexEnum.floatingPoint_scalar_binary64,
                // typeIndexEnum.floatingPoint_scalar_binary32,
                // typeIndexEnum.integer_fixedSizeArray_unsignedLong,
                // typeIndexEnum.integer_fixedSizeArray_unsignedInt,
                // typeIndexEnum.integer_fixedSizeArray_unsignedShort,
                // typeIndexEnum.integer_fixedSizeArray_unsignedByte,
                // typeIndexEnum.integer_fixedSizeArray_signedLong,
                // typeIndexEnum.integer_fixedSizeArray_signedInt,
                // typeIndexEnum.integer_fixedSizeArray_signedShort,
                // typeIndexEnum.integer_fixedSizeArray_signedByte,
                // typeIndexEnum.integer_boundedSizeArray_unsignedLong,
                // typeIndexEnum.integer_boundedSizeArray_unsignedInt,
                // typeIndexEnum.integer_boundedSizeArray_unsignedShort,
                // typeIndexEnum.integer_boundedSizeArray_unsignedByte,
                // typeIndexEnum.integer_boundedSizeArray_signedLong,
                // typeIndexEnum.integer_boundedSizeArray_signedInt,
                // typeIndexEnum.integer_boundedSizeArray_signedShort,
                // typeIndexEnum.integer_boundedSizeArray_signedByte,
                // typeIndexEnum.integer_variableSizeArray_unsignedLong,
                // typeIndexEnum.integer_variableSizeArray_unsignedInt,
                // typeIndexEnum.integer_variableSizeArray_unsignedShort,
                // typeIndexEnum.integer_variableSizeArray_unsignedByte,
                // typeIndexEnum.integer_variableSizeArray_signedLong,
                // typeIndexEnum.integer_variableSizeArray_signedInt,
                // typeIndexEnum.integer_variableSizeArray_signedShort,
                // typeIndexEnum.integer_variableSizeArray_signedByte,
                // typeIndexEnum.integer_scalar_unsignedLong,
                // typeIndexEnum.integer_scalar_unsignedInt,
                // typeIndexEnum.integer_scalar_unsignedShort,
                // typeIndexEnum.integer_scalar_unsignedByte,
                // typeIndexEnum.integer_scalar_signedLong,
                // typeIndexEnum.integer_scalar_signedInt,
                // typeIndexEnum.integer_scalar_signedShort,
                // typeIndexEnum.integer_scalar_signedByte,
                // typeIndexEnum.boolean_fixedSizeArray,
                // typeIndexEnum.boolean_boundedSizeArray,
                // typeIndexEnum.boolean_variableSizeArray,
                typeIndexEnum.boolean_scalar,
            ];

            const results: any[] = [];
            const expectedResults: any[] = [];
            for (let typeIndex of scalarTypeIndices) {
                const data = false;
                const type = { typeIndex: typeIndex };
                const result = checkDataAndType(data, type);
                results.push(result);
            }
            expect(results).toEqual(expectedResults);
        })

        it("normal case -- variable size number arrays", () => {
            const scalarTypeIndices = [

                // typeIndexEnum.// complex_variableSizeArray_variantUnion,
                // typeIndexEnum.// complex_variableSizeArray_union,
                // typeIndexEnum.// complex_variableSizeArray_structure,
                // typeIndexEnum.// complex_scalar_boundedString,
                // typeIndexEnum.// complex_scalar_variantUnion,
                // typeIndexEnum.// complex_scalar_union,
                // typeIndexEnum.// complex_scalar_structure,
                // typeIndexEnum.string_fixedSizeArray,
                // typeIndexEnum.string_boundedSizeArray,
                // typeIndexEnum.string_variableSizeArray,
                // typeIndexEnum.string_scalar,
                // typeIndexEnum.floatingPoint_fixedSizeArray_binary64,
                // typeIndexEnum.floatingPoint_fixedSizeArray_binary32,
                // typeIndexEnum.floatingPoint_boundedSizeArray_binary64,
                // typeIndexEnum.floatingPoint_boundedSizeArray_binary32,
                typeIndexEnum.floatingPoint_variableSizeArray_binary64,
                typeIndexEnum.floatingPoint_variableSizeArray_binary32,
                // typeIndexEnum.floatingPoint_scalar_binary64,
                // typeIndexEnum.floatingPoint_scalar_binary32,
                // typeIndexEnum.integer_fixedSizeArray_unsignedLong,
                // typeIndexEnum.integer_fixedSizeArray_unsignedInt,
                // typeIndexEnum.integer_fixedSizeArray_unsignedShort,
                // typeIndexEnum.integer_fixedSizeArray_unsignedByte,
                // typeIndexEnum.integer_fixedSizeArray_signedLong,
                // typeIndexEnum.integer_fixedSizeArray_signedInt,
                // typeIndexEnum.integer_fixedSizeArray_signedShort,
                // typeIndexEnum.integer_fixedSizeArray_signedByte,
                // typeIndexEnum.integer_boundedSizeArray_unsignedLong,
                // typeIndexEnum.integer_boundedSizeArray_unsignedInt,
                // typeIndexEnum.integer_boundedSizeArray_unsignedShort,
                // typeIndexEnum.integer_boundedSizeArray_unsignedByte,
                // typeIndexEnum.integer_boundedSizeArray_signedLong,
                // typeIndexEnum.integer_boundedSizeArray_signedInt,
                // typeIndexEnum.integer_boundedSizeArray_signedShort,
                // typeIndexEnum.integer_boundedSizeArray_signedByte,
                typeIndexEnum.integer_variableSizeArray_unsignedLong,
                typeIndexEnum.integer_variableSizeArray_unsignedInt,
                typeIndexEnum.integer_variableSizeArray_unsignedShort,
                typeIndexEnum.integer_variableSizeArray_unsignedByte,
                typeIndexEnum.integer_variableSizeArray_signedLong,
                typeIndexEnum.integer_variableSizeArray_signedInt,
                typeIndexEnum.integer_variableSizeArray_signedShort,
                typeIndexEnum.integer_variableSizeArray_signedByte,
                // typeIndexEnum.integer_scalar_unsignedLong,
                // typeIndexEnum.integer_scalar_unsignedInt,
                // typeIndexEnum.integer_scalar_unsignedShort,
                // typeIndexEnum.integer_scalar_unsignedByte,
                // typeIndexEnum.integer_scalar_signedLong,
                // typeIndexEnum.integer_scalar_signedInt,
                // typeIndexEnum.integer_scalar_signedShort,
                // typeIndexEnum.integer_scalar_signedByte,
                // typeIndexEnum.boolean_fixedSizeArray,
                // typeIndexEnum.boolean_boundedSizeArray,
                // typeIndexEnum.boolean_variableSizeArray,
                // typeIndexEnum.boolean_scalar,
            ];

            const results: any[] = [];
            const expectedResults: any[] = [];
            for (let typeIndex of scalarTypeIndices) {
                const data = [1, 2, 3, 4];
                const type = { typeIndex: typeIndex };
                const result = checkDataAndType(data, type);
                results.push(result);
                expectedResults.push(undefined);
            }
            expect(results).toEqual(expectedResults);
        })

        it("normal case -- variable size number arrays", () => {
            const scalarTypeIndices = [

                // typeIndexEnum.// complex_variableSizeArray_variantUnion,
                // typeIndexEnum.// complex_variableSizeArray_union,
                // typeIndexEnum.// complex_variableSizeArray_structure,
                // typeIndexEnum.// complex_scalar_boundedString,
                // typeIndexEnum.// complex_scalar_variantUnion,
                // typeIndexEnum.// complex_scalar_union,
                // typeIndexEnum.// complex_scalar_structure,
                // typeIndexEnum.string_fixedSizeArray,
                // typeIndexEnum.string_boundedSizeArray,
                // typeIndexEnum.string_variableSizeArray,
                // typeIndexEnum.string_scalar,
                // typeIndexEnum.floatingPoint_fixedSizeArray_binary64,
                // typeIndexEnum.floatingPoint_fixedSizeArray_binary32,
                // typeIndexEnum.floatingPoint_boundedSizeArray_binary64,
                // typeIndexEnum.floatingPoint_boundedSizeArray_binary32,
                typeIndexEnum.floatingPoint_variableSizeArray_binary64,
                typeIndexEnum.floatingPoint_variableSizeArray_binary32,
                // typeIndexEnum.floatingPoint_scalar_binary64,
                // typeIndexEnum.floatingPoint_scalar_binary32,
                // typeIndexEnum.integer_fixedSizeArray_unsignedLong,
                // typeIndexEnum.integer_fixedSizeArray_unsignedInt,
                // typeIndexEnum.integer_fixedSizeArray_unsignedShort,
                // typeIndexEnum.integer_fixedSizeArray_unsignedByte,
                // typeIndexEnum.integer_fixedSizeArray_signedLong,
                // typeIndexEnum.integer_fixedSizeArray_signedInt,
                // typeIndexEnum.integer_fixedSizeArray_signedShort,
                // typeIndexEnum.integer_fixedSizeArray_signedByte,
                // typeIndexEnum.integer_boundedSizeArray_unsignedLong,
                // typeIndexEnum.integer_boundedSizeArray_unsignedInt,
                // typeIndexEnum.integer_boundedSizeArray_unsignedShort,
                // typeIndexEnum.integer_boundedSizeArray_unsignedByte,
                // typeIndexEnum.integer_boundedSizeArray_signedLong,
                // typeIndexEnum.integer_boundedSizeArray_signedInt,
                // typeIndexEnum.integer_boundedSizeArray_signedShort,
                // typeIndexEnum.integer_boundedSizeArray_signedByte,
                typeIndexEnum.integer_variableSizeArray_unsignedLong,
                typeIndexEnum.integer_variableSizeArray_unsignedInt,
                typeIndexEnum.integer_variableSizeArray_unsignedShort,
                typeIndexEnum.integer_variableSizeArray_unsignedByte,
                typeIndexEnum.integer_variableSizeArray_signedLong,
                typeIndexEnum.integer_variableSizeArray_signedInt,
                typeIndexEnum.integer_variableSizeArray_signedShort,
                typeIndexEnum.integer_variableSizeArray_signedByte,
                // typeIndexEnum.integer_scalar_unsignedLong,
                // typeIndexEnum.integer_scalar_unsignedInt,
                // typeIndexEnum.integer_scalar_unsignedShort,
                // typeIndexEnum.integer_scalar_unsignedByte,
                // typeIndexEnum.integer_scalar_signedLong,
                // typeIndexEnum.integer_scalar_signedInt,
                // typeIndexEnum.integer_scalar_signedShort,
                // typeIndexEnum.integer_scalar_signedByte,
                // typeIndexEnum.boolean_fixedSizeArray,
                // typeIndexEnum.boolean_boundedSizeArray,
                // typeIndexEnum.boolean_variableSizeArray,
                // typeIndexEnum.boolean_scalar,
            ];

            const results: any[] = [];
            const expectedResults: any[] = [];
            for (let typeIndex of scalarTypeIndices) {
                const data = [1, 2, 3, 4];
                const type = { typeIndex: typeIndex };
                const result = checkDataAndType(data, type);
                results.push(result);
                expectedResults.push(undefined);
            }
            expect(results).toEqual(expectedResults);
        })


        it("normal case -- bounded size number arrays", () => {
            const scalarTypeIndices = [

                // typeIndexEnum.// complex_variableSizeArray_variantUnion,
                // typeIndexEnum.// complex_variableSizeArray_union,
                // typeIndexEnum.// complex_variableSizeArray_structure,
                // typeIndexEnum.// complex_scalar_boundedString,
                // typeIndexEnum.// complex_scalar_variantUnion,
                // typeIndexEnum.// complex_scalar_union,
                // typeIndexEnum.// complex_scalar_structure,
                // typeIndexEnum.string_fixedSizeArray,
                // typeIndexEnum.string_boundedSizeArray,
                // typeIndexEnum.string_variableSizeArray,
                // typeIndexEnum.string_scalar,
                // typeIndexEnum.floatingPoint_fixedSizeArray_binary64,
                // typeIndexEnum.floatingPoint_fixedSizeArray_binary32,
                typeIndexEnum.floatingPoint_boundedSizeArray_binary64,
                typeIndexEnum.floatingPoint_boundedSizeArray_binary32,
                // typeIndexEnum.floatingPoint_variableSizeArray_binary64,
                // typeIndexEnum.floatingPoint_variableSizeArray_binary32,
                // typeIndexEnum.floatingPoint_scalar_binary64,
                // typeIndexEnum.floatingPoint_scalar_binary32,
                // typeIndexEnum.integer_fixedSizeArray_unsignedLong,
                // typeIndexEnum.integer_fixedSizeArray_unsignedInt,
                // typeIndexEnum.integer_fixedSizeArray_unsignedShort,
                // typeIndexEnum.integer_fixedSizeArray_unsignedByte,
                // typeIndexEnum.integer_fixedSizeArray_signedLong,
                // typeIndexEnum.integer_fixedSizeArray_signedInt,
                // typeIndexEnum.integer_fixedSizeArray_signedShort,
                // typeIndexEnum.integer_fixedSizeArray_signedByte,
                typeIndexEnum.integer_boundedSizeArray_unsignedLong,
                typeIndexEnum.integer_boundedSizeArray_unsignedInt,
                typeIndexEnum.integer_boundedSizeArray_unsignedShort,
                typeIndexEnum.integer_boundedSizeArray_unsignedByte,
                typeIndexEnum.integer_boundedSizeArray_signedLong,
                typeIndexEnum.integer_boundedSizeArray_signedInt,
                typeIndexEnum.integer_boundedSizeArray_signedShort,
                typeIndexEnum.integer_boundedSizeArray_signedByte,
                // typeIndexEnum.integer_variableSizeArray_unsignedLong,
                // typeIndexEnum.integer_variableSizeArray_unsignedInt,
                // typeIndexEnum.integer_variableSizeArray_unsignedShort,
                // typeIndexEnum.integer_variableSizeArray_unsignedByte,
                // typeIndexEnum.integer_variableSizeArray_signedLong,
                // typeIndexEnum.integer_variableSizeArray_signedInt,
                // typeIndexEnum.integer_variableSizeArray_signedShort,
                // typeIndexEnum.integer_variableSizeArray_signedByte,
                // typeIndexEnum.integer_scalar_unsignedLong,
                // typeIndexEnum.integer_scalar_unsignedInt,
                // typeIndexEnum.integer_scalar_unsignedShort,
                // typeIndexEnum.integer_scalar_unsignedByte,
                // typeIndexEnum.integer_scalar_signedLong,
                // typeIndexEnum.integer_scalar_signedInt,
                // typeIndexEnum.integer_scalar_signedShort,
                // typeIndexEnum.integer_scalar_signedByte,
                // typeIndexEnum.boolean_fixedSizeArray,
                // typeIndexEnum.boolean_boundedSizeArray,
                // typeIndexEnum.boolean_variableSizeArray,
                // typeIndexEnum.boolean_scalar,
            ];

            const results: any[] = [];
            const expectedResults: any[] = [];
            for (let typeIndex of scalarTypeIndices) {
                const data = [1, 2, 3, 4];
                const type = { typeIndex: typeIndex, size: 5 };
                const result = checkDataAndType(data, type);
                results.push(result);
                expectedResults.push(undefined);
            }
            expect(results).toEqual(expectedResults);
        })

        it("normal case -- fixed size number arrays", () => {
            const scalarTypeIndices = [

                // typeIndexEnum.// complex_variableSizeArray_variantUnion,
                // typeIndexEnum.// complex_variableSizeArray_union,
                // typeIndexEnum.// complex_variableSizeArray_structure,
                // typeIndexEnum.// complex_scalar_boundedString,
                // typeIndexEnum.// complex_scalar_variantUnion,
                // typeIndexEnum.// complex_scalar_union,
                // typeIndexEnum.// complex_scalar_structure,
                // typeIndexEnum.string_fixedSizeArray,
                // typeIndexEnum.string_boundedSizeArray,
                // typeIndexEnum.string_variableSizeArray,
                // typeIndexEnum.string_scalar,
                typeIndexEnum.floatingPoint_fixedSizeArray_binary64,
                typeIndexEnum.floatingPoint_fixedSizeArray_binary32,
                // typeIndexEnum.floatingPoint_boundedSizeArray_binary64,
                // typeIndexEnum.floatingPoint_boundedSizeArray_binary32,
                // typeIndexEnum.floatingPoint_variableSizeArray_binary64,
                // typeIndexEnum.floatingPoint_variableSizeArray_binary32,
                // typeIndexEnum.floatingPoint_scalar_binary64,
                // typeIndexEnum.floatingPoint_scalar_binary32,
                typeIndexEnum.integer_fixedSizeArray_unsignedLong,
                typeIndexEnum.integer_fixedSizeArray_unsignedInt,
                typeIndexEnum.integer_fixedSizeArray_unsignedShort,
                typeIndexEnum.integer_fixedSizeArray_unsignedByte,
                typeIndexEnum.integer_fixedSizeArray_signedLong,
                typeIndexEnum.integer_fixedSizeArray_signedInt,
                typeIndexEnum.integer_fixedSizeArray_signedShort,
                typeIndexEnum.integer_fixedSizeArray_signedByte,
                // typeIndexEnum.integer_boundedSizeArray_unsignedLong,
                // typeIndexEnum.integer_boundedSizeArray_unsignedInt,
                // typeIndexEnum.integer_boundedSizeArray_unsignedShort,
                // typeIndexEnum.integer_boundedSizeArray_unsignedByte,
                // typeIndexEnum.integer_boundedSizeArray_signedLong,
                // typeIndexEnum.integer_boundedSizeArray_signedInt,
                // typeIndexEnum.integer_boundedSizeArray_signedShort,
                // typeIndexEnum.integer_boundedSizeArray_signedByte,
                // typeIndexEnum.integer_variableSizeArray_unsignedLong,
                // typeIndexEnum.integer_variableSizeArray_unsignedInt,
                // typeIndexEnum.integer_variableSizeArray_unsignedShort,
                // typeIndexEnum.integer_variableSizeArray_unsignedByte,
                // typeIndexEnum.integer_variableSizeArray_signedLong,
                // typeIndexEnum.integer_variableSizeArray_signedInt,
                // typeIndexEnum.integer_variableSizeArray_signedShort,
                // typeIndexEnum.integer_variableSizeArray_signedByte,
                // typeIndexEnum.integer_scalar_unsignedLong,
                // typeIndexEnum.integer_scalar_unsignedInt,
                // typeIndexEnum.integer_scalar_unsignedShort,
                // typeIndexEnum.integer_scalar_unsignedByte,
                // typeIndexEnum.integer_scalar_signedLong,
                // typeIndexEnum.integer_scalar_signedInt,
                // typeIndexEnum.integer_scalar_signedShort,
                // typeIndexEnum.integer_scalar_signedByte,
                // typeIndexEnum.boolean_fixedSizeArray,
                // typeIndexEnum.boolean_boundedSizeArray,
                // typeIndexEnum.boolean_variableSizeArray,
                // typeIndexEnum.boolean_scalar,
            ];

            const results: any[] = [];
            const expectedResults: any[] = [];
            for (let typeIndex of scalarTypeIndices) {
                const data = [1, 2, 3, 4];
                const type = { typeIndex: typeIndex, size: 4 };
                const result = checkDataAndType(data, type);
                results.push(result);
                expectedResults.push(undefined);
            }
            expect(results).toEqual(expectedResults);
        })

        it("normal case -- string fixed size array", () => {
            const type = {
                typeIndex: typeIndexEnum.string_fixedSizeArray,
                size: 5,
            };
            const data = ["AA", "BB", "CC", "DD", "EE"];

            const result = checkDataAndType(data, type);
            expect(result).toEqual(undefined);
        })

        it("normal case -- string bounded size array", () => {
            const type = {
                typeIndex: typeIndexEnum.string_boundedSizeArray,
                size: 5,
            };
            const data = ["AA", "BB", "CC", "DD", "EE"];

            const result = checkDataAndType(data, type);
            expect(result).toEqual(undefined);
        })

        it("normal case -- string bounded size array", () => {
            const type = {
                typeIndex: typeIndexEnum.string_variableSizeArray,
            };
            const data = ["AA", "BB", "CC", "DD", "EE"];

            const result = checkDataAndType(data, type);
            expect(result).toEqual(undefined);
        })

        it("normal case -- struct", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_structure,
                id: 22,
                tag: 23,
                name: "",
                fields: {
                    aaa: { typeIndex: typeIndexEnum.boolean_scalar },
                    bbb: {
                        typeIndex: typeIndexEnum.complex_scalar_structure,
                        name: "",
                        fields: {
                            bbb1: { typeIndex: typeIndexEnum.boolean_boundedSizeArray, size: 7 },
                            bbb2: {
                                typeIndex: typeIndexEnum.complex_scalar_structure,
                                name: "",
                                fields: {
                                    bbb2A: { typeIndex: typeIndexEnum.boolean_fixedSizeArray, size: 8 },
                                    bbb2B: { typeIndex: typeIndexEnum.integer_scalar_unsignedByte },
                                }
                            },
                            bbb3: { typeIndex: typeIndexEnum.floatingPoint_boundedSizeArray_binary32, size: 9 },
                        }
                    },
                    ccc: {
                        typeIndex: typeIndexEnum.complex_scalar_union,
                        name: "",
                        fields: {
                            ccc1: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedShort, size: 6 },
                            ccc2: {
                                typeIndex: typeIndexEnum.complex_scalar_structure,
                                name: "",
                                fields: {}
                            }
                        }
                    },
                    ddd: {
                        typeIndex: typeIndexEnum.complex_scalar_structure,
                        name: "",
                        fields: {
                            ddd1: {
                                typeIndex: typeIndexEnum.complex_variableSizeArray_structure,
                                name: "abc",
                                id: 22,
                                elementId: 23,
                                tag: 24,
                                elementTag: 24,
                                fields: {
                                    ddd1A: { typeIndex: typeIndexEnum.integer_boundedSizeArray_signedInt, size: 4 }
                                }
                            }
                        }
                    }
                }
            };
            const data1 = {
                aaa: false,
                bbb: {
                    bbb1: [true, false],
                    bbb2: {
                        bbb2A: [true, true, true, true, false, false, false, false],
                        bbb2B: 33,

                    },
                    bbb3: [1, 2, 3, 4, 5, 6, 7, 8, 9],
                },
                ccc: { // union choose 1
                    index: 1,
                    value: {}
                },
                ddd: {
                    ddd1: [{
                        ddd1A: [1, 2, 3, 4],
                    }]
                }
            };

            const data2 = {
                aaa: false,
                bbb: {
                    bbb1: [true, false],
                    bbb2: {
                        bbb2A: [true, true, true, true, false, false, false, false],
                        bbb2B: 33,

                    },
                    bbb3: [1, 2, 3, 4, 5, 6, 7, 8, 9],
                },
                ccc: {
                    index: 0, // union choose 0
                    value: [1, 2, 3, 4, 5, 6]
                },
                ddd: {
                    ddd1: [{
                        ddd1A: [1, 2, 3, 4],
                    }]
                }
            };

            const result1 = checkDataAndType(data1, type);
            const result2 = checkDataAndType(data2, type);
            expect(result1).toBe(undefined);
            expect(result2).toBe(undefined);
        })

        it("normal case -- union", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_union,
                name: "",
                fields: {
                    choice1: { typeIndex: typeIndexEnum.boolean_scalar },
                    choice2: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                }
            }

            const data = {
                index: 1,
                value: 23,
            };
            const result = checkDataAndType(data, type);
            expect(result).toBe(undefined);
        })


        it("normal case -- union as a struct field", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_structure,
                name: "",
                fields: {
                    field1: { typeIndex: typeIndexEnum.boolean_scalar },
                    field2: {
                        typeIndex: typeIndexEnum.complex_scalar_union,
                        name: "",
                        fields: {
                            choice2A: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                            choice2B: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary64 }
                        }
                    },
                }
            }

            const data1 = {
                field1: false,
                field2: {
                    index: 0,
                    value: 42,
                }
            };
            const result = checkDataAndType(data1, type)
            expect(result).toBe(undefined)
        })

        it("failed case -- union type error", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_structure,
                name: "",
                fields: {
                    field1: { typeIndex: typeIndexEnum.boolean_scalar },
                    field2: {
                        typeIndex: typeIndexEnum.complex_scalar_union,
                        name: "",
                        field: { // <-- should be fields
                            choice2A: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                            choice2B: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary64 }
                        }
                    },
                }
            }

            const data1 = {
                field1: false,
                field2: {
                    index: 0,
                    value: 42,
                }
            };
            expect(() => { checkDataAndType(data1, type) }).toThrow();
        })

        it("failed case -- union data error", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_structure,
                name: "",
                fields: {
                    field1: { typeIndex: typeIndexEnum.boolean_scalar },
                    field2: {
                        typeIndex: typeIndexEnum.complex_scalar_union,
                        name: "",
                        fields: {
                            choice2A: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                            choice2B: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary64 }
                        }
                    },
                }
            }

            const data1 = {
                field1: false,
                field2: {
                    index: 0,
                    data: 42, // <-- should be "value"
                }
            };
            expect(() => { checkDataAndType(data1, type) }).toThrow();
        })

        it("normal case -- struct array", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_variableSizeArray_structure,
                name: "",
                fields: {
                    field1: { typeIndex: typeIndexEnum.boolean_scalar },
                    field2: {
                        typeIndex: typeIndexEnum.complex_scalar_union,
                        name: "",
                        fields: {
                            choice2A: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                            choice2B: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary64 }
                        }
                    },
                }
            }

            const data1 = [{
                field1: false,
                field2: {
                    index: 0,
                    value: 42,
                }
            }];
            const result = checkDataAndType(data1, type);
            expect(result).toBe(undefined);
        })

        it("failed case -- struct array, wrong data type", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_variableSizeArray_structure,
                name: "",
                fields: {
                    field1: { typeIndex: typeIndexEnum.boolean_scalar },
                    field2: {
                        typeIndex: typeIndexEnum.complex_scalar_union,
                        name: "",
                        fields: {
                            choice2A: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                            choice2B: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary64 }
                        }
                    },
                }
            }

            const data1 = [{
                field1: false,
                field2: {
                    index: 0,
                    value: "42", // <-- should be a number
                }
            }];
            expect(() => { checkDataAndType(data1, type) }).toThrow();
        })

        it("normal case -- struct array, multiple elements", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_variableSizeArray_structure,
                name: "",
                fields: {
                    field1: { typeIndex: typeIndexEnum.boolean_scalar },
                    field2: {
                        typeIndex: typeIndexEnum.complex_scalar_union,
                        name: "",
                        fields: {
                            choice2A: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                            choice2B: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary64 }
                        }
                    },
                }
            }

            const data1 = [{
                field1: false,
                field2: {
                    index: 0,
                    value: 42,
                }
            },
            {
                field1: true,
                field2: {
                    index: 1,
                    value: 43,
                }
            }
            ];
            const result = checkDataAndType(data1, type);
            expect(result).toBe(undefined);
        })

        it("failed case -- struct array, one element is wrong", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_variableSizeArray_structure,
                name: "",
                fields: {
                    field1: { typeIndex: typeIndexEnum.boolean_scalar },
                    field2: {
                        typeIndex: typeIndexEnum.complex_scalar_union,
                        name: "",
                        fields: {
                            choice2A: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                            choice2B: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary64 }
                        }
                    },
                }
            }

            const data1 = [{
                field1: false,
                field2: {
                    index: 0,
                    value: 42,
                }
            },
            {
                field1: true,
                field2: {
                    index: 1,
                    value: "43", // <-- should be a number
                }
            }
            ];

            expect(() => { checkDataAndType(data1, type) }).toThrow();
        })

        it("normal case -- union array", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_variableSizeArray_union,
                name: "",
                fields: {
                    field1: { typeIndex: typeIndexEnum.boolean_scalar },
                    field2: {
                        typeIndex: typeIndexEnum.complex_scalar_union,
                        name: "",
                        fields: {
                            choice2A: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                            choice2B: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary64 }
                        }
                    },
                }
            }

            const data1 = [{
                index: 0,
                value: false,
            },
            {
                index: 1,
                value: {
                    index: 1,
                    value: 43,
                }
            }
            ];

            const result = checkDataAndType(data1, type);
            expect(result).toBe(undefined);
        })


        it("failed case -- union array, one element is wrong", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_variableSizeArray_union,
                name: "",
                fields: {
                    field1: { typeIndex: typeIndexEnum.boolean_scalar },
                    field2: {
                        typeIndex: typeIndexEnum.complex_scalar_union,
                        name: "",
                        fields: {
                            choice2A: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary32 },
                            choice2B: { typeIndex: typeIndexEnum.floatingPoint_scalar_binary64 }
                        }
                    },
                }
            }

            const data1 = [{
                index: 0,
                value: false,
            },
            {
                index: 1,
                value: {
                    index: 1,
                    value: "43", // <-- should be a number
                }
            }
            ];

            expect(() => { checkDataAndType(data1, type) }).toThrow();
        })

        it("normal case -- variant union type", () => {
            const type = { typeIndex: typeIndexEnum.complex_scalar_variantUnion };
            const data = {
                type: {
                    typeIndex: typeIndexEnum.boolean_scalar
                },
                value: false,
            };
            const result = checkDataAndType(data, type);
            expect(result).toBe(undefined);
        })


        it("normal case -- variant union type", () => {
            const type = { typeIndex: typeIndexEnum.complex_scalar_variantUnion };
            const data = {
                type: {
                    typeIndex: typeIndexEnum.complex_scalar_structure,
                    name: "",
                    fields: {
                        field1: { typeIndex: typeIndexEnum.boolean_variableSizeArray },
                        field2: { typeIndex: typeIndexEnum.floatingPoint_boundedSizeArray_binary32, size: 5 }
                    }
                },
                value: {
                    field1: [false, true],
                    field2: [1, 2, 3, 4, 5],
                },
            };
            const result = checkDataAndType(data, type);
            expect(result).toBe(undefined);
        })


        it("failed case -- variant union type: type and value do not match", () => {
            const type = { typeIndex: typeIndexEnum.complex_scalar_variantUnion };
            const data = {
                type: {
                    typeIndex: typeIndexEnum.complex_scalar_structure,
                    name: "",
                    fields: {
                        field1: { typeIndex: typeIndexEnum.boolean_variableSizeArray },
                        field2: { typeIndex: typeIndexEnum.floatingPoint_boundedSizeArray_binary32, size: 5 }
                    }
                },
                value: {
                    field1: [false, true],
                    field2: [1, 2, 3, 4, 5, 6],
                },
            };
            expect(() => { checkDataAndType(data, type) }).toThrow();
        })

    })

})
import { checkType, typeIndexEnum } from "../PvaData/PvaData_typeEncoding"

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
                    aaa: {typeIndex: typeIndexEnum.boolean_scalar},
                    bbb: {
                        typeIndex: typeIndexEnum.complex_scalar_structure,
                        name: "",
                        fields: {
                            bbb1: {typeIndex: typeIndexEnum.boolean_boundedSizeArray, size: 7},
                            bbb2: {
                                typeIndex: typeIndexEnum.complex_scalar_structure, 
                                name: "",
                                fields: {
                                    bbb2A: {typeIndex: typeIndexEnum.boolean_fixedSizeArray, size: 8},
                                    bbb2B: {typeIndex: typeIndexEnum.integer_scalar_unsignedByte},
                                }
                            },
                            bbb3: {type: typeIndexEnum.floatingPoint_boundedSizeArray_binary32, size: 9},
                        }
                    },
                    ccc: {
                        typeIndex: typeIndexEnum.complex_scalar_union,
                        name: "",
                        fields: {
                            ccc1: {typeIndex: typeIndexEnum.integer_fixedSizeArray_signedShort, size: 6},
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
                                    ddd1A: {typeIndex: typeIndexEnum.integer_boundedSizeArray_signedInt, size: 4}
                                }
                            }
                        }
                    }
                }
            };
            const result = checkType(type);
            expect(result).toBe(undefined);
        })

    })
})
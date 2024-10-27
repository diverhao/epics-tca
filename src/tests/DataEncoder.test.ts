import { encodeData } from "../DataEncoder"
import { ENDIAN } from "../PvaMethods"


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

    })

    describe("string_fixedSizeArray, 0x78", () => {

    })

    describe("string_boundedSizeArray, 0x70", () => {

    })

    describe("string_variableSizeArray, 0x68", () => {

    })

    describe("string_scalar, 0x60", () => {
        it("ok", () => {
            const endian = ENDIAN.BIG;
            const str = "This is TCA";
            const buffer = encodeData(str, {typeIndex: "0x60"}, endian);
            expect(buffer.toJSON()["data"]).toEqual([11, 84, 104, 105, 115, 32, 105, 115, 32, 84, 67, 65]);
        })

        it("ok, little endian", () => {
            const endian = ENDIAN.LITTLE;
            const str = "This is TCA";
            const buffer = encodeData(str, {typeIndex: "0x60"}, endian);
            expect(buffer.toJSON()["data"]).toEqual([11, 84, 104, 105, 115, 32, 105, 115, 32, 84, 67, 65]);
        })
        
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
        it("ok", () => {
            const endian = ENDIAN.BIG;
            const num = 3.14;
            const buffer = encodeData(num, {typeIndex: "0x43"}, endian);
            expect(buffer.toJSON().data).toEqual([0x40, 0x09, 0x1e, 0xb8, 0x51, 0xeb, 0x85, 0x1f]);
        })

        it("ok, little endian", () => {
            const endian = ENDIAN.LITTLE;
            const num = 3.14;
            const buffer = encodeData(num, {typeIndex: "0x43"}, endian);
            expect(buffer.toJSON().data).toEqual([0x1f, 0x85, 0xeb, 0x51, 0xb8, 0x1e, 0x09, 0x40]);
        })
    })

    describe("floatingPoint_scalar_binary32, 0x42", () => {
        it("ok", () => {
            const endian = ENDIAN.BIG;
            const num = 3.14;
            const buffer = encodeData(num, {typeIndex: "0x42"}, endian);
            expect(buffer.toJSON().data).toEqual([0x40, 0x48, 0xf5, 0xc3]);
        })

        it("ok, little endian", () => {
            const endian = ENDIAN.LITTLE;
            const num = 3.14;
            const buffer = encodeData(num, {typeIndex: "0x42"}, endian);
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

    })

    describe("boolean_fixedSizeArray, 0x18", () => {

    })

    describe("boolean_boundedSizeArray, 0x10", () => {

    })

    describe("boolean_variableSizeArray, 0x8", () => {

    })

    describe("boolean_scalar, 0x0", () => {

    })


})



import { PvRequest } from "../PvaData/PvRequest"
import { typeIndexEnum } from "../PvaData/PvaData_typeEncoding";
import { createSizeBuffer, encodeSize, ENDIAN } from "../PvaData/PvaMethods"

describe("PvRequest.test", () => {


    it("simple case -- field only, value,abc", () => {
        const endian = ENDIAN.LITTLE;
        const result = PvRequest.encodePvRequest("record[abc=def]field(abc[def=ghi,jkl=mno],def)", endian);
    })


    it("empty pv request -- empty string", () => {
        const endian = ENDIAN.LITTLE;
        const bufferArray = [
            // 0xca, 0x2, 0x0, 0xa, 0xf, 0x0, 0x0, 0x0, 0x1, 0x34, 0x0, 0x12, 0x51, 0x60, 0x70, 0x80, 0x8,
            0x80, 0x0, 0x0];
        const result = PvRequest.encodePvRequest("  ", endian);
        expect(result.toJSON().data).toEqual(bufferArray);
    })

    it("empty pv request -- field(), different from above", () => {
        const endian = ENDIAN.LITTLE;
        const bufferArray = [
            // 0xca, 0x2, 0x0, 0xa, 0x1b, 0x0, 0x0, 0x0, 0x1, 0x34, 0x0, 0x12, 0x51, 0x60, 0x70, 0x80, 0x8, 
            0x80, 0x0, 0x1, 0x5, 0x66, 0x69, 0x65, 0x6c, 0x64, 0x80, 0x0, 0x0];
        const result = PvRequest.encodePvRequest("field(      )", endian);
        expect(result.toJSON().data).toEqual(bufferArray);
    })

    it("simple case -- field only, value,abc", () => {
        const endian = ENDIAN.LITTLE;
        const bufferArray = [
            // 0xca, 0x2, 0x0, 0xa, 0x2e, 0x0, 0x0, 0x0, 0x1, 0x34, 0x0, 0x12, 0x51, 0x60, 0x70, 0x80, 0x8, 
            0x80, 0x0, 0x1, 0x5, 0x66, 0x69, 0x65, 0x6c, 0x64, 0x80, 0x0, 0x2, 0x5, 0x76, 0x61, 0x6c, 0x75, 0x65, 0x80, 0x0, 0x0, 0x3, 0x61, 0x62, 0x63, 0x80, 0x0, 0x0];
        const result = PvRequest.encodePvRequest("val ue,ab c", endian);
        expect(result.toJSON().data).toEqual(bufferArray);
    })

    it("simple case -- field in field, value,abc{def}", () => {
        const endian = ENDIAN.LITTLE;
        const bufferArray = [
            // 0xca, 0x2, 0x0, 0xa, 0x38, 0x0, 0x0, 0x0, 0x1, 0x34, 0x0, 0x12, 0x51, 0x60, 0x70, 0x80, 0x8, 
            0x80, 0x0, 0x1, 0x5, 0x66, 0x69, 0x65, 0x6c, 0x64, 0x80, 0x0, 0x2, 0x5, 0x76, 0x61, 0x6c, 0x75, 0x65, 0x80, 0x0, 0x0, 0x3, 0x61, 0x62, 0x63, 0x80, 0x0, 0x1, 0x3, 0x64, 0x65, 0x66, 0x80, 0x0, 0x0
        ]
        const result = PvRequest.encodePvRequest("value, abc{def}", endian);
        expect(result.toJSON().data).toEqual(bufferArray);
    })


    it("simple case -- 2 layers fields, value,abc{def{ghi,jkl},opq}", () => {
        const endian = ENDIAN.LITTLE;
        const bufferArray = [
            // 0xca, 0x2, 0x0, 0xa, 0x50, 0x0, 0x0, 0x0, 0x1, 0x34, 0x0, 0x12, 0x51, 0x60, 0x70, 0x80, 0x8, 
            0x80, 0x0, 0x1, 0x5, 0x66, 0x69, 0x65, 0x6c, 0x64, 0x80, 0x0, 0x2, 0x5, 0x76, 0x61, 0x6c, 0x75, 0x65, 0x80, 0x0, 0x0, 0x3, 0x61, 0x62, 0x63, 0x80, 0x0, 0x2, 0x3, 0x64, 0x65, 0x66, 0x80, 0x0, 0x2, 0x3, 0x67, 0x68, 0x69, 0x80, 0x0, 0x0, 0x3, 0x6a, 0x6b, 0x6c, 0x80, 0x0, 0x0, 0x3, 0x6f, 0x70, 0x71, 0x80, 0x0, 0x0
        ]
        const result = PvRequest.encodePvRequest("va lue,ab c{def{gh i,jkl} ,op q}", endian);
        expect(result.toJSON().data).toEqual(bufferArray);
    })

    it("simple case -- with reocrd, abc[def=ghi,jkl=mno],def", () => {
        const endian = ENDIAN.LITTLE;
        const bufferArray = [
            // 0xca, 0x2, 0x0, 0xa, 0x50, 0x0, 0x0, 0x0, 0x1, 0x34, 0x0, 0x12, 0x51, 0x60, 0x70, 0x80, 0x8, 
            0x80, 0x0, 0x1, 0x5, 0x66, 0x69, 0x65, 0x6c, 0x64, 0x80, 0x0, 0x2, 0x3, 0x61, 0x62, 0x63, 0x80, 0x0, 0x1, 0x8, 0x5f, 0x6f, 0x70, 0x74, 0x69, 0x6f, 0x6e, 0x73, 0x80, 0x0, 0x2, 0x3, 0x64, 0x65, 0x66, 0x60, 0x3, 0x6a, 0x6b, 0x6c, 0x60, 0x3, 0x64, 0x65, 0x66, 0x80, 0x0, 0x0, 0x3, 0x67, 0x68, 0x69, 0x3, 0x6d, 0x6e, 0x6f
        ]
        const result = PvRequest.encodePvRequest("ab c[def =gh i,jkl=mno],d ef", endian);
        expect(result.toJSON().data).toEqual(bufferArray);
    })


    it("simple case -- with reocrd, abc.def.ghi", () => {
        const endian = ENDIAN.LITTLE;
        const result = PvRequest.encodePvRequest("abc.def.ghi", endian);
        const bufferArray = [
            // 0xca, 0x2, 0x0, 0xa, 0x39, 0x0, 0x0, 0x0, 0x1, 0x34, 0x0, 0x12, 0x51, 0x60, 0x70, 0x80, 0x8, 
            0x80, 0x0, 0x1, 0x5, 0x66, 0x69, 0x65, 0x6c, 0x64, 0x80, 0x0, 0x1, 0x3, 0x61, 0x62, 0x63, 0x80, 0x0, 0x1, 0x3, 0x64, 0x65, 0x66, 0x80, 0x0, 0x1, 0x3, 0x67, 0x68, 0x69, 0x80, 0x0, 0x0];
        expect(result.toJSON().data).toEqual(bufferArray);
    })

    it("complex case -- with reocrd, abc.def[ABC=DEF,GHI=OPQ].ghi[XYZ=UVW]", () => {
        const endian = ENDIAN.LITTLE;
        const result = PvRequest.encodePvRequest("ab c.def[ ABC=DEF, GHI      =OPQ].ghi[ XYZ=UVW ] ", endian);
        const bufferArray = [
            // 0xca, 0x2, 0x0, 0xa, 0x72, 0x0, 0x0, 0x0, 0x1, 0x34, 0x0, 0x12, 0x51, 0x60, 0x70, 0x80, 0x8, 
            0x80, 0x0, 0x1, 0x5, 0x66, 0x69, 0x65, 0x6c, 0x64, 0x80, 0x0, 0x1, 0x3, 0x61, 0x62, 0x63, 0x80, 0x0, 0x1, 0x3, 0x64, 0x65, 0x66, 0x80, 0x0, 0x2, 0x8, 0x5f, 0x6f, 0x70, 0x74, 0x69, 0x6f, 0x6e, 0x73, 0x80, 0x0, 0x2, 0x3, 0x41, 0x42, 0x43, 0x60, 0x3, 0x47, 0x48, 0x49, 0x60, 0x3, 0x67, 0x68, 0x69, 0x80, 0x0, 0x1, 0x8, 0x5f, 0x6f, 0x70, 0x74, 0x69, 0x6f, 0x6e, 0x73, 0x80, 0x0, 0x1, 0x3, 0x58, 0x59, 0x5a, 0x60, 0x3, 0x44, 0x45, 0x46, 0x3, 0x4f, 0x50, 0x51, 0x3, 0x55, 0x56, 0x57];
        expect(result.toJSON().data).toEqual(bufferArray);
    })

    it("complex case -- with reocrd, field(abc[def=ghi,jkl=mno],def)", () => {
        const endian = ENDIAN.LITTLE;
        const result = PvRequest.encodePvRequest("field(abc[def=ghi,jkl=mno],def)", endian);
        const bufferArray = [
            // 0xca, 0x2, 0x0, 0xa, 0x50, 0x0, 0x0, 0x0, 0x1, 0x34, 0x0, 0x12, 0x51, 0x60, 0x70, 0x80, 0x8, 
            0x80, 0x0, 0x1, 0x5, 0x66, 0x69, 0x65, 0x6c, 0x64, 0x80, 0x0, 0x2, 0x3, 0x61, 0x62, 0x63, 0x80, 0x0, 0x1, 0x8, 0x5f, 0x6f, 0x70, 0x74, 0x69, 0x6f, 0x6e, 0x73, 0x80, 0x0, 0x2, 0x3, 0x64, 0x65, 0x66, 0x60, 0x3, 0x6a, 0x6b, 0x6c, 0x60, 0x3, 0x64, 0x65, 0x66, 0x80, 0x0, 0x0, 0x3, 0x67, 0x68, 0x69, 0x3, 0x6d, 0x6e, 0x6f];
        expect(result.toJSON().data).toEqual(bufferArray);
    })


    it("complex case -- with reocrd, abc[def=ghi,jkl=mno],def", () => {
        const endian = ENDIAN.LITTLE;
        const result = PvRequest.encodePvRequest("abc[def=ghi,jkl=mno],def", endian);
        const bufferArray = [
            // 0xca, 0x2, 0x0, 0xa, 0x50, 0x0, 0x0, 0x0, 0x1, 0x34, 0x0, 0x12, 0x51, 0x60, 0x70, 0x80, 0x8, 
            0x80, 0x0, 0x1, 0x5, 0x66, 0x69, 0x65, 0x6c, 0x64, 0x80, 0x0, 0x2, 0x3, 0x61, 0x62, 0x63, 0x80, 0x0, 0x1, 0x8, 0x5f, 0x6f, 0x70, 0x74, 0x69, 0x6f, 0x6e, 0x73, 0x80, 0x0, 0x2, 0x3, 0x64, 0x65, 0x66, 0x60, 0x3, 0x6a, 0x6b, 0x6c, 0x60, 0x3, 0x64, 0x65, 0x66, 0x80, 0x0, 0x0, 0x3, 0x67, 0x68, 0x69, 0x3, 0x6d, 0x6e, 0x6f];
        expect(result.toJSON().data).toEqual(bufferArray);
    })


    it("complex case -- field(abc[def=ghi,jkl=mno],def{ghi,opq[a=b,c=d]})", () => {
        const endian = ENDIAN.LITTLE;
        const bufferArray = [
            // 0xca, 0x2, 0x0, 0xa, 0x7d, 0x0, 0x0, 0x0, 0x1, 0x34, 0x0, 0x12, 0x51, 0x60, 0x70, 0x80, 0x8, 
            0x80, 0x0, 0x1, 0x5, 0x66, 0x69, 0x65, 0x6c, 0x64, 0x80, 0x0, 0x2, 0x3, 0x61, 0x62, 0x63, 0x80, 0x0, 0x1, 0x8, 0x5f, 0x6f, 0x70, 0x74, 0x69, 0x6f, 0x6e, 0x73, 0x80, 0x0, 0x2, 0x3, 0x64, 0x65, 0x66, 0x60, 0x3, 0x6a, 0x6b, 0x6c, 0x60, 0x3, 0x64, 0x65, 0x66, 0x80, 0x0, 0x2, 0x3, 0x67, 0x68, 0x69, 0x80, 0x0, 0x0, 0x3, 0x6f, 0x70, 0x71, 0x80, 0x0, 0x1, 0x8, 0x5f, 0x6f, 0x70, 0x74, 0x69, 0x6f, 0x6e, 0x73, 0x80, 0x0, 0x2, 0x1, 0x61, 0x60, 0x1, 0x63, 0x60, 0x3, 0x67, 0x68, 0x69, 0x3, 0x6d, 0x6e, 0x6f, 0x1, 0x62, 0x1, 0x64];
        const result = PvRequest.encodePvRequest("field(abc[def=ghi,jkl=mno],def{ghi,opq[a=b,c=d]})", endian);
        expect(result.toJSON().data).toEqual(bufferArray);
    })

    it("complex case -- with reocrd, record[abc=def]field(abc[def=ghi,jkl=mno],def)", () => {
        const endian = ENDIAN.LITTLE;
        const bufferArray = [
            // 0xca, 0x2, 0x0, 0xa, 0x75, 0x0, 0x0, 0x0, 0x1, 0x34, 0x0, 0x12, 0x51, 0x60, 0x70, 0x80, 0x8, 
            0x80, 0x0, 0x2, 0x6, 0x72, 0x65, 0x63, 0x6f, 0x72, 0x64, 0x80, 0x0, 0x1, 0x8, 0x5f, 0x6f, 0x70, 0x74, 0x69, 0x6f, 0x6e, 0x73, 0x80, 0x0, 0x1, 0x3, 0x61, 0x62, 0x63, 0x60, 0x5, 0x66, 0x69, 0x65, 0x6c, 0x64, 0x80, 0x0, 0x2, 0x3, 0x61, 0x62, 0x63, 0x80, 0x0, 0x1, 0x8, 0x5f, 0x6f, 0x70, 0x74, 0x69, 0x6f, 0x6e, 0x73, 0x80, 0x0, 0x2, 0x3, 0x64, 0x65, 0x66, 0x60, 0x3, 0x6a, 0x6b, 0x6c, 0x60, 0x3, 0x64, 0x65, 0x66, 0x80, 0x0, 0x0, 0x3, 0x64, 0x65, 0x66, 0x3, 0x67, 0x68, 0x69, 0x3, 0x6d, 0x6e, 0x6f];
        const result = PvRequest.encodePvRequest("record[abc=def]field(abc[def=ghi,jkl=mno],def)", endian);
        expect(result.toJSON().data).toEqual(bufferArray);
    })


    it("complex case --  timeStamp.secondsPastEpoch, pixel.value", () => {
        const endian = ENDIAN.LITTLE;
        const bufferArray = [
            // 0xca, 0x2, 0x0, 0xa, 0x57, 0x0, 0x0, 0x0, 0x1, 0x34, 0x0, 0x12, 0x51, 0x60, 0x70, 0x80, 0x8, 
            0x80, 0x0, 0x1, 0x5, 0x66, 0x69, 0x65, 0x6c, 0x64, 0x80, 0x0, 0x2, 0x9, 0x74, 0x69, 0x6d, 0x65, 0x53, 0x74, 0x61, 0x6d, 0x70, 0x80, 0x0, 0x1, 0x10, 0x73, 0x65, 0x63, 0x6f, 0x6e, 0x64, 0x73, 0x50, 0x61, 0x73, 0x74, 0x45, 0x70, 0x6f, 0x63, 0x68, 0x80, 0x0, 0x0, 0x5, 0x70, 0x69, 0x78, 0x65, 0x6c, 0x80, 0x0, 0x1, 0x5, 0x76, 0x61, 0x6c, 0x75, 0x65, 0x80, 0x0, 0x0];
        const result = PvRequest.encodePvRequest("timeStamp.secondsPastEpoch, pixel.value", endian);
        expect(result.toJSON().data).toEqual(bufferArray);
    })


    describe("getBitSetFromFieldName()", () => {
        // it("simple case", () => {
        //     const type = {
        //         typeIndex: typeIndexEnum.complex_scalar_structure,
        //         name: "",
        //         fields: {
        //             val1: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
        //             val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
        //             val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
        //         }
        //     }

        //     const result = PvRequest.getBitSetsFromFieldName("", type);
        //     expect(result).toEqual([0]);
        // })

        // it("simple case", () => {
        //     const type = {
        //         typeIndex: typeIndexEnum.complex_scalar_structure,
        //         name: "",
        //         fields: {
        //             val1: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
        //             val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
        //             val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
        //         }
        //     }

        //     const result = PvRequest.getBitSetsFromFieldName("val2", type);
        //     expect(result).toEqual([2]);
        // })

        // it("simple case -- cannot find", () => {
        //     const type = {
        //         typeIndex: '0x80',
        //         id: 1,
        //         name: 'epics:nt/NTScalarArray:1.0',
        //         fields: {
        //             value: { typeIndex: '0x4b' },
        //             alarm: {
        //                 typeIndex: '0x80',
        //                 id: 2,
        //                 name: 'alarm_t',
        //                 fields: {
        //                     severity: { typeIndex: '0x22' },
        //                     status: { typeIndex: '0x22' },
        //                     message: { typeIndex: '0x60' }
        //                 }
        //             },
        //             timeStamp: {
        //                 typeIndex: '0x80',
        //                 id: 3,
        //                 name: '',
        //                 fields: {
        //                     secondsPastEpoch: { typeIndex: '0x23' },
        //                     nanoseconds: { typeIndex: '0x22' },
        //                     userTag: { typeIndex: '0x22' }
        //                 }
        //             },
        //             display: {
        //                 typeIndex: '0x80',
        //                 id: 4,
        //                 name: '',
        //                 fields: {
        //                     limitLow: { typeIndex: '0x43' },
        //                     limitHigh: { typeIndex: '0x43' },
        //                     description: { typeIndex: '0x60' },
        //                     units: { typeIndex: '0x60' },
        //                     precision: { typeIndex: '0x22' },
        //                     form: {
        //                         typeIndex: '0x80',
        //                         id: 5,
        //                         name: 'enum_t',
        //                         fields: {
        //                             index: { typeIndex: '0x22' },
        //                             choices: { typeIndex: '0x68' }
        //                         }
        //                     }
        //                 }
        //             },
        //             control: {
        //                 typeIndex: '0x80',
        //                 id: 6,
        //                 name: 'control_t',
        //                 fields: {
        //                     limitLow: { typeIndex: '0x43' },
        //                     limitHigh: { typeIndex: '0x43' },
        //                     minStep: { typeIndex: '0x43' }
        //                 }
        //             },
        //             valueAlarm: {
        //                 typeIndex: '0x80',
        //                 id: 7,
        //                 name: 'valueAlarm_t',
        //                 fields: {
        //                     active: { typeIndex: '0x0' },
        //                     lowAlarmLimit: { typeIndex: '0x43' },
        //                     lowWarningLimit: { typeIndex: '0x43' },
        //                     highWarningLimit: { typeIndex: '0x43' },
        //                     highAlarmLimit: { typeIndex: '0x43' },
        //                     lowAlarmSeverity: { typeIndex: '0x22' },
        //                     lowWarningSeverity: { typeIndex: '0x22' },
        //                     highWarningSeverity: { typeIndex: '0x22' },
        //                     highAlarmSeverity: { typeIndex: '0x22' },
        //                     hysteresis: { typeIndex: '0x20' }
        //                 }
        //             }
        //         }
        //     };
        //     const result = PvRequest.getBitSetsFromFieldName("val2", type);
        //     expect(result).toEqual([])

        // })


        // it("simple case", () => {
        //     const type = {
        //         typeIndex: '0x80',
        //         id: 1,
        //         name: 'epics:nt/NTScalarArray:1.0',
        //         fields: {
        //             value: { typeIndex: '0x4b' },
        //             alarm: {
        //                 typeIndex: '0x80',
        //                 id: 2,
        //                 name: 'alarm_t',
        //                 fields: {
        //                     severity: { typeIndex: '0x22' },
        //                     status: { typeIndex: '0x22' },
        //                     message: { typeIndex: '0x60' }
        //                 }
        //             },
        //             timeStamp: {
        //                 typeIndex: '0x80',
        //                 id: 3,
        //                 name: '',
        //                 fields: {
        //                     secondsPastEpoch: { typeIndex: '0x23' },
        //                     nanoseconds: { typeIndex: '0x22' },
        //                     userTag: { typeIndex: '0x22' }
        //                 }
        //             },
        //             display: {
        //                 typeIndex: '0x80',
        //                 id: 4,
        //                 name: '',
        //                 fields: {
        //                     limitLow: { typeIndex: '0x43' },
        //                     limitHigh: { typeIndex: '0x43' },
        //                     description: { typeIndex: '0x60' },
        //                     units: { typeIndex: '0x60' },
        //                     precision: { typeIndex: '0x22' },
        //                     form: {
        //                         typeIndex: '0x80',
        //                         id: 5,
        //                         name: 'enum_t',
        //                         fields: {
        //                             index: { typeIndex: '0x22' },
        //                             choices: { typeIndex: '0x68' }
        //                         }
        //                     }
        //                 }
        //             },
        //             control: {
        //                 typeIndex: '0x80',
        //                 id: 6,
        //                 name: 'control_t',
        //                 fields: {
        //                     limitLow: { typeIndex: '0x43' },
        //                     limitHigh: { typeIndex: '0x43' },
        //                     minStep: { typeIndex: '0x43' }
        //                 }
        //             },
        //             valueAlarm: {
        //                 typeIndex: '0x80',
        //                 id: 7,
        //                 name: 'valueAlarm_t',
        //                 fields: {
        //                     active: { typeIndex: '0x0' },
        //                     lowAlarmLimit: { typeIndex: '0x43' },
        //                     lowWarningLimit: { typeIndex: '0x43' },
        //                     highWarningLimit: { typeIndex: '0x43' },
        //                     highAlarmLimit: { typeIndex: '0x43' },
        //                     lowAlarmSeverity: { typeIndex: '0x22' },
        //                     lowWarningSeverity: { typeIndex: '0x22' },
        //                     highWarningSeverity: { typeIndex: '0x22' },
        //                     highAlarmSeverity: { typeIndex: '0x22' },
        //                     hysteresis: { typeIndex: '0x20' }
        //                 }
        //             }
        //         }
        //     };
        //     const result = PvRequest.getBitSetsFromFieldName("alarm.severity", type);
        //     expect(result).toEqual([3])

        // })


        // it("2-layer search", () => {
        //     const type = {
        //         typeIndex: '0x80',
        //         id: 1,
        //         name: 'epics:nt/NTScalarArray:1.0',
        //         fields: {
        //             value: { typeIndex: '0x4b' },
        //             alarm: {
        //                 typeIndex: '0x80',
        //                 id: 2,
        //                 name: 'alarm_t',
        //                 fields: {
        //                     severity: { typeIndex: '0x22' },
        //                     status: { typeIndex: '0x22' },
        //                     message: { typeIndex: '0x60' }
        //                 }
        //             },
        //             timeStamp: {
        //                 typeIndex: '0x80',
        //                 id: 3,
        //                 name: '',
        //                 fields: {
        //                     secondsPastEpoch: { typeIndex: '0x23' },
        //                     nanoseconds: { typeIndex: '0x22' },
        //                     userTag: { typeIndex: '0x22' }
        //                 }
        //             },
        //             display: {
        //                 typeIndex: '0x80',
        //                 id: 4,
        //                 name: '',
        //                 fields: {
        //                     limitLow: { typeIndex: '0x43' },
        //                     limitHigh: { typeIndex: '0x43' },
        //                     description: { typeIndex: '0x60' },
        //                     units: { typeIndex: '0x60' },
        //                     precision: { typeIndex: '0x22' },
        //                     form: {
        //                         typeIndex: '0x80',
        //                         id: 5,
        //                         name: 'enum_t',
        //                         fields: {
        //                             index: { typeIndex: '0x22' },
        //                             choices: { typeIndex: '0x68' }
        //                         }
        //                     }
        //                 }
        //             },
        //             control: {
        //                 typeIndex: '0x80',
        //                 id: 6,
        //                 name: 'control_t',
        //                 fields: {
        //                     limitLow: { typeIndex: '0x43' },
        //                     limitHigh: { typeIndex: '0x43' },
        //                     minStep: { typeIndex: '0x43' }
        //                 }
        //             },
        //             valueAlarm: {
        //                 typeIndex: '0x80',
        //                 id: 7,
        //                 name: 'valueAlarm_t',
        //                 fields: {
        //                     active: { typeIndex: '0x0' },
        //                     lowAlarmLimit: { typeIndex: '0x43' },
        //                     lowWarningLimit: { typeIndex: '0x43' },
        //                     highWarningLimit: { typeIndex: '0x43' },
        //                     highAlarmLimit: { typeIndex: '0x43' },
        //                     lowAlarmSeverity: { typeIndex: '0x22' },
        //                     lowWarningSeverity: { typeIndex: '0x22' },
        //                     highWarningSeverity: { typeIndex: '0x22' },
        //                     highAlarmSeverity: { typeIndex: '0x22' },
        //                     hysteresis: { typeIndex: '0x20' }
        //                 }
        //             }
        //         }
        //     };
        //     const result = PvRequest.getBitSetsFromFieldName("display.form.choices", type);
        //     expect(result).toEqual([18])

        // })

    })

    describe("getPvRequestBitSets()", () => {
        // it("simple test", () => {
        //     const result = PvRequest.getPvRequestBitSets("abc.def.ghi");
        //     expect(result).toEqual([3]);
        // })
        // it("simple test", () => {
        //     const result = PvRequest.getPvRequestBitSets("abc.def,ghi");
        //     expect(result).toEqual([2,3]);
        // })
        // it("simple test", () => {
        //     const result = PvRequest.getPvRequestBitSets("abc{def{ghi,jkl},mno{pqr}},ABC,DEF{GHI}");
        //     expect(result).toEqual([3,4,6,7,9]);
        // })


    })

    describe("encodePvRequestDataWithValue()", () => {
        it("simple case", () => {
            const pvRequest = "abc.def,ABC";
            const type = {
                typeIndex: "0x80",
                name: "",
                fields: {
                    abc: {
                        typeIndex: "0x80",
                        name: "",
                        fields: {
                            def: {
                                typeIndex: "0x60",
                            },
                            ghi: {
                                typeIndex: "0x60",
                            }
                        }
                    },
                    ABC: {
                        typeIndex: "0x60"
                    }
                }
            }

            const values = ["AAA", "BBB"];
            const endian = ENDIAN.LITTLE;
            const result = PvRequest.encodePvRequestDataWithValue(pvRequest, type, values, endian);
            // console.log("================", PvRequest.fullTypeBitSets);
            // console.dir(result, {depth: null})
        })
    })

    // todo: this one
    describe("reduceStructTypeWithPvRequest()", () => {

        // it("a more complicated data type", () => {
        //     const type = {
        //         typeIndex: '0x80',
        //         id: 1,
        //         name: 'epics:nt/NTScalarArray:1.0',
        //         fields: {
        //             value: { typeIndex: '0x4b' },
        //             alarm: {
        //                 typeIndex: '0x80',
        //                 id: 2,
        //                 name: 'alarm_t',
        //                 fields: {
        //                     severity: { typeIndex: '0x22' },
        //                     status: { typeIndex: '0x22' },
        //                     message: { typeIndex: '0x60' }
        //                 }
        //             },
        //             timeStamp: {
        //                 typeIndex: '0x80',
        //                 id: 3,
        //                 name: '',
        //                 fields: {
        //                     secondsPastEpoch: { typeIndex: '0x23' },
        //                     nanoseconds: { typeIndex: '0x22' },
        //                     userTag: { typeIndex: '0x22' }
        //                 }
        //             },
        //             display: {
        //                 typeIndex: '0x80',
        //                 id: 4,
        //                 name: '',
        //                 fields: {
        //                     limitLow: { typeIndex: '0x43' },
        //                     limitHigh: { typeIndex: '0x43' },
        //                     description: { typeIndex: '0x60' },
        //                     units: { typeIndex: '0x60' },
        //                     precision: { typeIndex: '0x22' },
        //                     form: {
        //                         typeIndex: '0x80',
        //                         id: 5,
        //                         name: 'enum_t',
        //                         fields: {
        //                             index: { typeIndex: '0x22' },
        //                             choices: { typeIndex: '0x68' }
        //                         }
        //                     }
        //                 }
        //             },
        //             control: {
        //                 typeIndex: '0x80',
        //                 id: 6,
        //                 name: 'control_t',
        //                 fields: {
        //                     limitLow: { typeIndex: '0x43' },
        //                     limitHigh: { typeIndex: '0x43' },
        //                     minStep: { typeIndex: '0x43' }
        //                 }
        //             },
        //             valueAlarm: {
        //                 typeIndex: '0x80',
        //                 id: 7,
        //                 name: 'valueAlarm_t',
        //                 fields: {
        //                     active: { typeIndex: '0x0' },
        //                     lowAlarmLimit: { typeIndex: '0x43' },
        //                     lowWarningLimit: { typeIndex: '0x43' },
        //                     highWarningLimit: { typeIndex: '0x43' },
        //                     highAlarmLimit: { typeIndex: '0x43' },
        //                     lowAlarmSeverity: { typeIndex: '0x22' },
        //                     lowWarningSeverity: { typeIndex: '0x22' },
        //                     highWarningSeverity: { typeIndex: '0x22' },
        //                     highAlarmSeverity: { typeIndex: '0x22' },
        //                     hysteresis: { typeIndex: '0x20' }
        //                 }
        //             }
        //         }
        //     };
        //     const pvRequest = "valueAlarm.highAlarmLimit,value,alarm{message,severity}";
        //     const result = PvRequest.reduceStructTypeWithPvRequest(pvRequest, type);
        //     // console.log("-------------------");
        //     // console.dir(result, {depth: null})

        // })
    })


})
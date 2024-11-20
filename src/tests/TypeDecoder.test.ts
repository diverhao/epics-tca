
import { checkType, SIZE_TYPE, typeIndexEnum } from "../PvaData/PvaData_typeEncoding"

import { createSizeBuffer, ENDIAN, writeUInt8 } from "../PvaData/PvaMethods"
import { decodeSizeB as decodeSize, decodeString, decodeType, getBitSetsFromFieldName, getDecodingTypeNewOffset, reduceStructTypeWithBitSets } from "../PvaData/TypeDecoder";

describe("decode a type buffer", () => {

    describe("decode a size", () => {
        it("normal case", () => {
            const buffer = Buffer.from([0x05]);
            const endian = ENDIAN.BIG;
            const size = decodeSize(buffer, 0, endian, SIZE_TYPE.size);
            expect(size).toBe(0x05);
        })

        it("normal case -- size is a unsigned short", () => {
            const buffer = Buffer.from([0x00, 0x05]);
            const endian = ENDIAN.BIG;
            const size = decodeSize(buffer, 0, endian, SIZE_TYPE.unsigned_short);
            expect(size).toBe(0x05);
        })

        it("normal case -- check offset", () => {
            const buffer = Buffer.from([0x05, 0x05]);
            const endian = ENDIAN.BIG;
            const size = decodeSize(buffer, 0, endian, SIZE_TYPE.size);
            const offset = getDecodingTypeNewOffset();
            expect([size, offset]).toEqual([0x05, 1]);
        })

        it("normal case -- check offset for unsigned short size", () => {
            const buffer = Buffer.from([0x05, 0x05]);
            const endian = ENDIAN.BIG;
            const size = decodeSize(buffer, 0, endian, SIZE_TYPE.unsigned_short);
            const offset = getDecodingTypeNewOffset();
            expect([size, offset]).toEqual([0x505, 2]);
        })

        it("normal case -- large size = 254", () => {
            const buffer = Buffer.from([0xfe]);
            const endian = ENDIAN.BIG;
            const size = decodeSize(buffer, 0, endian, SIZE_TYPE.size);
            const offset = getDecodingTypeNewOffset();
            expect([size, offset]).toEqual([254, 1]);
        })


        it("failed case -- large size = 255", () => {
            const buffer = Buffer.from([0xff]);
            const endian = ENDIAN.BIG;
            const offset = getDecodingTypeNewOffset();
            expect(() => { decodeSize(buffer, 0, endian, SIZE_TYPE.size) }).toThrow();
        })

        it("normal case -- large size = 255", () => {
            const buffer = Buffer.from([0xff, 0x00, 0x00, 0x00, 0xff]);
            const endian = ENDIAN.BIG;
            const size = decodeSize(buffer, 0, endian, SIZE_TYPE.size);
            const offset = getDecodingTypeNewOffset();
            expect([size, offset]).toEqual([255, 5]);
        })

        it("normal case -- large size = 0x12345678", () => {
            const buffer = Buffer.from([0xff, 0x12, 0x34, 0x56, 0x78]);
            const endian = ENDIAN.BIG;
            const size = decodeSize(buffer, 0, endian, SIZE_TYPE.size);
            const offset = getDecodingTypeNewOffset();
            expect([size, offset]).toEqual([0x12345678, 5]);
        })

        it("normal case -- large size = 0x7ffffffe, 2^31 - 2", () => {
            const buffer = Buffer.from([0xff, 0x7f, 0xff, 0xff, 0xfe]);
            const endian = ENDIAN.BIG;
            const size = decodeSize(buffer, 0, endian, SIZE_TYPE.size);
            const offset = getDecodingTypeNewOffset();
            expect([size, offset]).toEqual([0x7ffffffe, 5]);
        })

        it("failed case -- large size = 0x7fffffff, 2^31 -1", () => {
            const buffer = Buffer.from([0xff, 0x7f, 0xff, 0xff, 0xff]);
            const endian = ENDIAN.BIG;
            // const size = decodeSize(buffer, 0, endian, SIZE_TYPE.size);
            const offset = getDecodingTypeNewOffset();
            expect(() => { decodeSize(buffer, 0, endian, SIZE_TYPE.size) }).toThrow();
        })

        it("normal case -- large size = 0x80000000, 2^31", () => {
            const buffer = Buffer.from([0xff, 0x7f, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00, 0x80, 0x00, 0x00, 0x00]);
            const endian = ENDIAN.BIG;
            const size = decodeSize(buffer, 0, endian, SIZE_TYPE.size);
            const offset = getDecodingTypeNewOffset();
            console.log(size, offset)
            expect([size, offset]).toEqual([0x80000000n, 13])
        })


        it("normal case -- large size = 0x1234567890, 2^31", () => {
            const buffer = Buffer.from([0xff, 0x7f, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x12, 0x34, 0x56, 0x78, 0x90]);
            const endian = ENDIAN.BIG;
            const size = decodeSize(buffer, 0, endian, SIZE_TYPE.size);
            const offset = getDecodingTypeNewOffset();
            console.log(size, offset)
            expect([size, offset]).toEqual([0x1234567890n, 13])
        })

        it("failed case -- large size = 0x80000000, 2^31", () => {
            const buffer = Buffer.from([0xff, 0x80, 0x00, 0x00, 0x00]);
            const endian = ENDIAN.BIG;
            expect(() => { decodeSize(buffer, 0, endian, SIZE_TYPE.size) }).toThrow();

        })

    })

    describe("decode a string", () => {
        it("normal case", () => {
            const str = "This is PVA";
            const bufferStr = Buffer.from(str);
            const bufferSize = createSizeBuffer(str.length, ENDIAN.LITTLE, SIZE_TYPE.size);
            const buffer = Buffer.concat([bufferSize, bufferStr]);
            const result = decodeString(buffer, 0, ENDIAN.LITTLE);
            expect(result).toBe(str);
        })

        it("normal case -- long string", () => {
            const str = `Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum" (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very popular during the Renaissance. The first line of Lorem Ipsum, "Lorem ipsum dolor sit amet..", comes from a line in section 1.10.32.The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested. Sections 1.10.32 and 1.10.33 from "de Finibus Bonorum et Malorum" by Cicero are also reproduced in their exact original form, accompanied by English versions from the 1914 translation by H. Rackham.`;
            const bufferStr = Buffer.from(str);
            const bufferSize = createSizeBuffer(str.length, ENDIAN.LITTLE, SIZE_TYPE.size);
            const buffer = Buffer.concat([bufferSize, bufferStr]);
            const result = decodeString(buffer, 0, ENDIAN.LITTLE);
            expect(result).toBe(str);
        })

    })

    describe("reduceStructTypeWithBitSets()", () => {
        it("reduce regular fields", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_structure,
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                    val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                    val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                }
            }

            const bitSets = [1];
            checkType(type);
            const reducedType = reduceStructTypeWithBitSets(type, bitSets, true);
            console.log("redued type", reducedType)
            expect(reducedType).toEqual(
                {
                    typeIndex: '0x80',
                    name: '',
                    fields: { val1: { typeIndex: '0x38', size: 5 } }
                }
            )
        })

        it("keep the whole fields", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_structure,
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                    val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                    val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                }
            }

            const bitSets = [0];
            const reducedType = reduceStructTypeWithBitSets(type, bitSets, true);
            console.log(reducedType)
            expect(reducedType).toEqual(
                {
                    typeIndex: typeIndexEnum.complex_scalar_structure,
                    name: "",
                    fields: {
                        val1: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                        val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                        val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                    }
                }
            )
        })

        it("keep the whole struct", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_structure,
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                    val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                    val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                }
            }

            const bitSets = [1, 2, 3];
            const reducedType = reduceStructTypeWithBitSets(type, bitSets, true);
            expect(reducedType).toEqual(
                {
                    typeIndex: typeIndexEnum.complex_scalar_structure,
                    name: "",
                    fields: {
                        val1: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                        val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                        val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                    }
                }
            )
        })


        it("keep the whole struct", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_structure,
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                    val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                    val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                }
            }

            const bitSets = [0, 1, 3];
            const reducedType = reduceStructTypeWithBitSets(type, bitSets, true);
            expect(reducedType).toEqual(
                {
                    typeIndex: typeIndexEnum.complex_scalar_structure,
                    name: "",
                    fields: {
                        val1: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                        val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                        val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                    }
                }
            )
        })

        it("keep the whole struct", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_structure,
                name: "",
                fields: {
                    val1: {
                        typeIndex: typeIndexEnum.complex_scalar_structure,
                        name: "",
                        fields: {
                            val11: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                            val12: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                        }
                    },
                    val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                    val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                }
            }

            const bitSets = [1];
            const reducedType = reduceStructTypeWithBitSets(type, bitSets, true);
            console.log("reduced type", reducedType)
            expect(reducedType).toEqual(
                {
                    typeIndex: typeIndexEnum.complex_scalar_structure,
                    name: "",
                    fields: {
                        val1: {
                            typeIndex: typeIndexEnum.complex_scalar_structure,
                            name: "",
                            fields: {
                                val11: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                                val12: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                            }
                        },
                    }
                }
            )
        })

        it("keep the whole struct", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_structure,
                name: "",
                fields: {
                    val1: {
                        typeIndex: typeIndexEnum.complex_scalar_structure,
                        name: "",
                        fields: {
                            val11: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                            val12: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                        }
                    },
                    val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                    val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                }
            }

            const bitSets = [3];
            const reducedType = reduceStructTypeWithBitSets(type, bitSets, true);
            console.log("reduced type", reducedType)
            expect(reducedType).toEqual(
                {
                    typeIndex: typeIndexEnum.complex_scalar_structure,
                    name: "",
                    fields: {
                        val1: {
                            typeIndex: typeIndexEnum.complex_scalar_structure,
                            name: "",
                            fields: {
                                val12: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                            }
                        },
                    }
                }
            )
        })

        it("keep the whole struct", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_structure,
                name: "",
                fields: {
                    val1: {
                        typeIndex: typeIndexEnum.complex_scalar_structure,
                        name: "",
                        fields: {
                            val11: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                            val12: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                        }
                    },
                    val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                    val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                }
            }

            const bitSets = [1, 3, 4];
            const reducedType = reduceStructTypeWithBitSets(type, bitSets, true);
            console.log("reduced type", reducedType)
            expect(reducedType).toEqual(
                {
                    typeIndex: typeIndexEnum.complex_scalar_structure,
                    name: "",
                    fields: {
                        val1: {
                            typeIndex: typeIndexEnum.complex_scalar_structure,
                            name: "",
                            fields: {
                                val11: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                                val12: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                            }
                        },
                        val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                    }
                }
            )
        })

        it("keep the whole struct", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_structure,
                name: "",
                fields: {
                    val1: {
                        typeIndex: typeIndexEnum.complex_scalar_structure,
                        name: "",
                        fields: {
                            val11: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                            val12: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                        }
                    },
                    val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                    val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                }
            }

            const bitSets = [4, 5];
            const reducedType = reduceStructTypeWithBitSets(type, bitSets, true);
            expect(reducedType).toEqual(
                {
                    typeIndex: '0x80',
                    name: '',
                    fields: {
                        val2: { typeIndex: '0x38', size: 5 },
                        val3: { typeIndex: '0x38', size: 5 }
                    }
                }
            )
        })


        it("keep the whole struct", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_structure,
                name: "",
                fields: {
                    val1: {
                        typeIndex: typeIndexEnum.complex_scalar_structure,
                        name: "",
                        fields: {
                            val11: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                            val12: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                        }
                    },
                    val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                    val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                }
            }

            const bitSets = [3, 5];
            const reducedType = reduceStructTypeWithBitSets(type, bitSets, true);
            expect(reducedType).toEqual(
                {
                    typeIndex: typeIndexEnum.complex_scalar_structure,
                    name: "",
                    fields: {
                        val1: {
                            typeIndex: typeIndexEnum.complex_scalar_structure,
                            name: "",
                            fields: {
                                val12: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                            }
                        },
                        val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                    }
                }
            )
        })


        it("keep the whole struct", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_structure,
                name: "",
                fields: {
                    val1: {
                        typeIndex: typeIndexEnum.complex_scalar_structure,
                        name: "",
                        fields: {
                            val11: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                            val12: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                        }
                    },
                    val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                    val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                }
            }

            const bitSets = [0, 1, 2, 3, 4, 5];
            const reducedType = reduceStructTypeWithBitSets(type, bitSets, true);
            expect(reducedType).toEqual(type)
        })

        it("keep the whole struct", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_structure,
                name: "",
                fields: {
                    val1: {
                        typeIndex: typeIndexEnum.complex_scalar_structure,
                        name: "",
                        fields: {
                            val11: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                            val12: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                        }
                    },
                    val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                    val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                }
            }

            const bitSets = [1, 3, 4, 5];
            const reducedType = reduceStructTypeWithBitSets(type, bitSets, true);
            expect(reducedType).toEqual(type)
        })


        it("a more complicated data type", () => {
            const type = {
                typeIndex: '0x80',
                id: 1,
                name: 'epics:nt/NTScalarArray:1.0',
                fields: {
                    value: { typeIndex: '0x4b' },
                    alarm: {
                        typeIndex: '0x80',
                        id: 2,
                        name: 'alarm_t',
                        fields: {
                            severity: { typeIndex: '0x22' },
                            status: { typeIndex: '0x22' },
                            message: { typeIndex: '0x60' }
                        }
                    },
                    timeStamp: {
                        typeIndex: '0x80',
                        id: 3,
                        name: '',
                        fields: {
                            secondsPastEpoch: { typeIndex: '0x23' },
                            nanoseconds: { typeIndex: '0x22' },
                            userTag: { typeIndex: '0x22' }
                        }
                    },
                    display: {
                        typeIndex: '0x80',
                        id: 4,
                        name: '',
                        fields: {
                            limitLow: { typeIndex: '0x43' },
                            limitHigh: { typeIndex: '0x43' },
                            description: { typeIndex: '0x60' },
                            units: { typeIndex: '0x60' },
                            precision: { typeIndex: '0x22' },
                            form: {
                                typeIndex: '0x80',
                                id: 5,
                                name: 'enum_t',
                                fields: {
                                    index: { typeIndex: '0x22' },
                                    choices: { typeIndex: '0x68' }
                                }
                            }
                        }
                    },
                    control: {
                        typeIndex: '0x80',
                        id: 6,
                        name: 'control_t',
                        fields: {
                            limitLow: { typeIndex: '0x43' },
                            limitHigh: { typeIndex: '0x43' },
                            minStep: { typeIndex: '0x43' }
                        }
                    },
                    valueAlarm: {
                        typeIndex: '0x80',
                        id: 7,
                        name: 'valueAlarm_t',
                        fields: {
                            active: { typeIndex: '0x0' },
                            lowAlarmLimit: { typeIndex: '0x43' },
                            lowWarningLimit: { typeIndex: '0x43' },
                            highWarningLimit: { typeIndex: '0x43' },
                            highAlarmLimit: { typeIndex: '0x43' },
                            lowAlarmSeverity: { typeIndex: '0x22' },
                            lowWarningSeverity: { typeIndex: '0x22' },
                            highWarningSeverity: { typeIndex: '0x22' },
                            highAlarmSeverity: { typeIndex: '0x22' },
                            hysteresis: { typeIndex: '0x20' }
                        }
                    }
                }
            };
            const bitSets = [12];
            const reducedType = reduceStructTypeWithBitSets(type, bitSets, true);
            console.dir(reducedType, { depth: null, maxArrayLength: null })
            expect(reducedType).toEqual(
                {
                    typeIndex: '0x80',
                    id: 1,
                    name: 'epics:nt/NTScalarArray:1.0',
                    fields: {
                        display: {
                            typeIndex: '0x80',
                            id: 4,
                            name: '',
                            fields: { limitHigh: { typeIndex: '0x43' } }
                        }
                    }
                }
            )

        })

    })

    describe("getBitSetsFromName()", () => {
        it("simple case", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_structure,
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                    val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                    val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                }
            }

            const result = getBitSetsFromFieldName("", type);
            expect(result).toBe(0);
        })

        it("simple case", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_structure,
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                    val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                    val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte, size: 5 },
                }
            }

            const result = getBitSetsFromFieldName("val2", type);
            expect(result).toBe(2);
        })

        it("simple case -- cannot find", () => {
            const type = {
                typeIndex: '0x80',
                id: 1,
                name: 'epics:nt/NTScalarArray:1.0',
                fields: {
                    value: { typeIndex: '0x4b' },
                    alarm: {
                        typeIndex: '0x80',
                        id: 2,
                        name: 'alarm_t',
                        fields: {
                            severity: { typeIndex: '0x22' },
                            status: { typeIndex: '0x22' },
                            message: { typeIndex: '0x60' }
                        }
                    },
                    timeStamp: {
                        typeIndex: '0x80',
                        id: 3,
                        name: '',
                        fields: {
                            secondsPastEpoch: { typeIndex: '0x23' },
                            nanoseconds: { typeIndex: '0x22' },
                            userTag: { typeIndex: '0x22' }
                        }
                    },
                    display: {
                        typeIndex: '0x80',
                        id: 4,
                        name: '',
                        fields: {
                            limitLow: { typeIndex: '0x43' },
                            limitHigh: { typeIndex: '0x43' },
                            description: { typeIndex: '0x60' },
                            units: { typeIndex: '0x60' },
                            precision: { typeIndex: '0x22' },
                            form: {
                                typeIndex: '0x80',
                                id: 5,
                                name: 'enum_t',
                                fields: {
                                    index: { typeIndex: '0x22' },
                                    choices: { typeIndex: '0x68' }
                                }
                            }
                        }
                    },
                    control: {
                        typeIndex: '0x80',
                        id: 6,
                        name: 'control_t',
                        fields: {
                            limitLow: { typeIndex: '0x43' },
                            limitHigh: { typeIndex: '0x43' },
                            minStep: { typeIndex: '0x43' }
                        }
                    },
                    valueAlarm: {
                        typeIndex: '0x80',
                        id: 7,
                        name: 'valueAlarm_t',
                        fields: {
                            active: { typeIndex: '0x0' },
                            lowAlarmLimit: { typeIndex: '0x43' },
                            lowWarningLimit: { typeIndex: '0x43' },
                            highWarningLimit: { typeIndex: '0x43' },
                            highAlarmLimit: { typeIndex: '0x43' },
                            lowAlarmSeverity: { typeIndex: '0x22' },
                            lowWarningSeverity: { typeIndex: '0x22' },
                            highWarningSeverity: { typeIndex: '0x22' },
                            highAlarmSeverity: { typeIndex: '0x22' },
                            hysteresis: { typeIndex: '0x20' }
                        }
                    }
                }
            };
            const result = getBitSetsFromFieldName("val2", type);
            expect(result).toBe(undefined)

        })


        it("simple case", () => {
            const type = {
                typeIndex: '0x80',
                id: 1,
                name: 'epics:nt/NTScalarArray:1.0',
                fields: {
                    value: { typeIndex: '0x4b' },
                    alarm: {
                        typeIndex: '0x80',
                        id: 2,
                        name: 'alarm_t',
                        fields: {
                            severity: { typeIndex: '0x22' },
                            status: { typeIndex: '0x22' },
                            message: { typeIndex: '0x60' }
                        }
                    },
                    timeStamp: {
                        typeIndex: '0x80',
                        id: 3,
                        name: '',
                        fields: {
                            secondsPastEpoch: { typeIndex: '0x23' },
                            nanoseconds: { typeIndex: '0x22' },
                            userTag: { typeIndex: '0x22' }
                        }
                    },
                    display: {
                        typeIndex: '0x80',
                        id: 4,
                        name: '',
                        fields: {
                            limitLow: { typeIndex: '0x43' },
                            limitHigh: { typeIndex: '0x43' },
                            description: { typeIndex: '0x60' },
                            units: { typeIndex: '0x60' },
                            precision: { typeIndex: '0x22' },
                            form: {
                                typeIndex: '0x80',
                                id: 5,
                                name: 'enum_t',
                                fields: {
                                    index: { typeIndex: '0x22' },
                                    choices: { typeIndex: '0x68' }
                                }
                            }
                        }
                    },
                    control: {
                        typeIndex: '0x80',
                        id: 6,
                        name: 'control_t',
                        fields: {
                            limitLow: { typeIndex: '0x43' },
                            limitHigh: { typeIndex: '0x43' },
                            minStep: { typeIndex: '0x43' }
                        }
                    },
                    valueAlarm: {
                        typeIndex: '0x80',
                        id: 7,
                        name: 'valueAlarm_t',
                        fields: {
                            active: { typeIndex: '0x0' },
                            lowAlarmLimit: { typeIndex: '0x43' },
                            lowWarningLimit: { typeIndex: '0x43' },
                            highWarningLimit: { typeIndex: '0x43' },
                            highAlarmLimit: { typeIndex: '0x43' },
                            lowAlarmSeverity: { typeIndex: '0x22' },
                            lowWarningSeverity: { typeIndex: '0x22' },
                            highWarningSeverity: { typeIndex: '0x22' },
                            highAlarmSeverity: { typeIndex: '0x22' },
                            hysteresis: { typeIndex: '0x20' }
                        }
                    }
                }
            };
            const result = getBitSetsFromFieldName("alarm.severity", type);
            expect(result).toBe(3)

        })


        it("2-layer search", () => {
            const type = {
                typeIndex: '0x80',
                id: 1,
                name: 'epics:nt/NTScalarArray:1.0',
                fields: {
                    value: { typeIndex: '0x4b' },
                    alarm: {
                        typeIndex: '0x80',
                        id: 2,
                        name: 'alarm_t',
                        fields: {
                            severity: { typeIndex: '0x22' },
                            status: { typeIndex: '0x22' },
                            message: { typeIndex: '0x60' }
                        }
                    },
                    timeStamp: {
                        typeIndex: '0x80',
                        id: 3,
                        name: '',
                        fields: {
                            secondsPastEpoch: { typeIndex: '0x23' },
                            nanoseconds: { typeIndex: '0x22' },
                            userTag: { typeIndex: '0x22' }
                        }
                    },
                    display: {
                        typeIndex: '0x80',
                        id: 4,
                        name: '',
                        fields: {
                            limitLow: { typeIndex: '0x43' },
                            limitHigh: { typeIndex: '0x43' },
                            description: { typeIndex: '0x60' },
                            units: { typeIndex: '0x60' },
                            precision: { typeIndex: '0x22' },
                            form: {
                                typeIndex: '0x80',
                                id: 5,
                                name: 'enum_t',
                                fields: {
                                    index: { typeIndex: '0x22' },
                                    choices: { typeIndex: '0x68' }
                                }
                            }
                        }
                    },
                    control: {
                        typeIndex: '0x80',
                        id: 6,
                        name: 'control_t',
                        fields: {
                            limitLow: { typeIndex: '0x43' },
                            limitHigh: { typeIndex: '0x43' },
                            minStep: { typeIndex: '0x43' }
                        }
                    },
                    valueAlarm: {
                        typeIndex: '0x80',
                        id: 7,
                        name: 'valueAlarm_t',
                        fields: {
                            active: { typeIndex: '0x0' },
                            lowAlarmLimit: { typeIndex: '0x43' },
                            lowWarningLimit: { typeIndex: '0x43' },
                            highWarningLimit: { typeIndex: '0x43' },
                            highAlarmLimit: { typeIndex: '0x43' },
                            lowAlarmSeverity: { typeIndex: '0x22' },
                            lowWarningSeverity: { typeIndex: '0x22' },
                            highWarningSeverity: { typeIndex: '0x22' },
                            highAlarmSeverity: { typeIndex: '0x22' },
                            hysteresis: { typeIndex: '0x20' }
                        }
                    }
                }
            };
            const result = getBitSetsFromFieldName("display.form.choices", type);
            expect(result).toBe(18)

        })

    })

    describe("not implemented -- complex_variableSizeArray_variantUnion, 0x8a", () => {

    })


    describe("complex_variableSizeArray_union, 0x89", () => {
        it("normal case", () => {

            let bufferArray = [
                0x89,
                0xFD, 0x00, 0x01, 0x81, 0x10, 0x65, 0x78, 0x61, 0x6D, 0x70, 0x6C, 0x65, 0x53, 0x74, 0x72, 0x75,
                0x63, 0x74, 0x75, 0x72, 0x65, 0x07, 0x05, 0x76, 0x61, 0x6C, 0x75, 0x65, 0x28, 0x10, 0x62, 0x6F,
                0x75, 0x6E, 0x64, 0x65, 0x64, 0x53, 0x69, 0x7A, 0x65, 0x41, 0x72, 0x72, 0x61, 0x79, 0x30, 0x10,
                0x0E, 0x66, 0x69, 0x78, 0x65, 0x64, 0x53, 0x69, 0x7A, 0x65, 0x41, 0x72, 0x72, 0x61, 0x79, 0x38,
                0x04, 0x09, 0x74, 0x69, 0x6D, 0x65, 0x53, 0x74, 0x61, 0x6D, 0x70, 0xFD, 0x00, 0x02, 0x80, 0x06,
                0x74, 0x69, 0x6D, 0x65, 0x5F, 0x74, 0x03, 0x10, 0x73, 0x65, 0x63, 0x6F, 0x6E, 0x64, 0x73, 0x50,
                0x61, 0x73, 0x74, 0x45, 0x70, 0x6F, 0x63, 0x68, 0x23, 0x0B, 0x6E, 0x61, 0x6E, 0x6F, 0x73, 0x65,
                0x63, 0x6F, 0x6E, 0x64, 0x73, 0x22, 0x07, 0x75, 0x73, 0x65, 0x72, 0x54, 0x61, 0x67, 0x22, 0x05,
                0x61, 0x6C, 0x61, 0x72, 0x6D, 0xFD, 0x00, 0x03, 0x80, 0x07, 0x61, 0x6C, 0x61, 0x72, 0x6D, 0x5F,
                0x74, 0x03, 0x08, 0x73, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0x06, 0x73, 0x74, 0x61,
                0x74, 0x75, 0x73, 0x22, 0x07, 0x6D, 0x65, 0x73, 0x73, 0x61, 0x67, 0x65, 0x60, 0x0A, 0x76, 0x61,
                0x6C, 0x75, 0x65, 0x55, 0x6E, 0x69, 0x6F, 0x6E, 0xFD, 0x00, 0x04, 0x81, 0x00, 0x03, 0x0B, 0x73,
                0x74, 0x72, 0x69, 0x6E, 0x67, 0x56, 0x61, 0x6C, 0x75, 0x65, 0x60, 0x08, 0x69, 0x6E, 0x74, 0x56,
                0x61, 0x6C, 0x75, 0x65, 0x22, 0x0B, 0x64, 0x6F, 0x75, 0x62, 0x6C, 0x65, 0x56, 0x61, 0x6C, 0x75,
                0x65, 0x43, 0x0C, 0x76, 0x61, 0x72, 0x69, 0x61, 0x6E, 0x74, 0x55, 0x6E, 0x69, 0x6F, 0x6E, 0xFD,
                0x00, 0x05, 0x82];
            const buffer = Buffer.from(bufferArray);
            const result = decodeType(buffer, 0, ENDIAN.BIG);
            console.dir(result, { maxArrayLength: null, depth: null })
            expect(result).toEqual(
                {
                    typeIndex: '0x89',
                    name: 'exampleStructure', // it is actually a union
                    elementId: 1,
                    fields: {
                        value: { typeIndex: '0x28' },
                        boundedSizeArray: { typeIndex: '0x30', size: 16 },
                        fixedSizeArray: { typeIndex: '0x38', size: 4 },
                        timeStamp: {
                            id: 2,
                            typeIndex: '0x80',
                            name: 'time_t',
                            fields: {
                                secondsPastEpoch: { typeIndex: '0x23' },
                                nanoseconds: { typeIndex: '0x22' },
                                userTag: { typeIndex: '0x22' }
                            }
                        },
                        alarm: {
                            id: 3,
                            typeIndex: '0x80',
                            name: 'alarm_t',
                            fields: {
                                severity: { typeIndex: '0x22' },
                                status: { typeIndex: '0x22' },
                                message: { typeIndex: '0x60' }
                            }
                        },
                        valueUnion: {
                            id: 4,
                            typeIndex: '0x81',
                            name: '',
                            fields: {
                                stringValue: { typeIndex: '0x60' },
                                intValue: { typeIndex: '0x22' },
                                doubleValue: { typeIndex: '0x43' }
                            }
                        },
                        variantUnion: { id: 5, typeIndex: '0x82' }
                    }
                }
            )
        })

        it("normal case -- with an ID", () => {

            let bufferArray = [
                0xFD,
                0x00, 0x11, // ID
                0x89, // type index
                0xFD, 0x00, 0x01, 0x81, 0x10, 0x65, 0x78, 0x61, 0x6D, 0x70, 0x6C, 0x65, 0x53, 0x74, 0x72, 0x75,
                0x63, 0x74, 0x75, 0x72, 0x65, 0x07, 0x05, 0x76, 0x61, 0x6C, 0x75, 0x65, 0x28, 0x10, 0x62, 0x6F,
                0x75, 0x6E, 0x64, 0x65, 0x64, 0x53, 0x69, 0x7A, 0x65, 0x41, 0x72, 0x72, 0x61, 0x79, 0x30, 0x10,
                0x0E, 0x66, 0x69, 0x78, 0x65, 0x64, 0x53, 0x69, 0x7A, 0x65, 0x41, 0x72, 0x72, 0x61, 0x79, 0x38,
                0x04, 0x09, 0x74, 0x69, 0x6D, 0x65, 0x53, 0x74, 0x61, 0x6D, 0x70, 0xFD, 0x00, 0x02, 0x80, 0x06,
                0x74, 0x69, 0x6D, 0x65, 0x5F, 0x74, 0x03, 0x10, 0x73, 0x65, 0x63, 0x6F, 0x6E, 0x64, 0x73, 0x50,
                0x61, 0x73, 0x74, 0x45, 0x70, 0x6F, 0x63, 0x68, 0x23, 0x0B, 0x6E, 0x61, 0x6E, 0x6F, 0x73, 0x65,
                0x63, 0x6F, 0x6E, 0x64, 0x73, 0x22, 0x07, 0x75, 0x73, 0x65, 0x72, 0x54, 0x61, 0x67, 0x22, 0x05,
                0x61, 0x6C, 0x61, 0x72, 0x6D, 0xFD, 0x00, 0x03, 0x80, 0x07, 0x61, 0x6C, 0x61, 0x72, 0x6D, 0x5F,
                0x74, 0x03, 0x08, 0x73, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0x06, 0x73, 0x74, 0x61,
                0x74, 0x75, 0x73, 0x22, 0x07, 0x6D, 0x65, 0x73, 0x73, 0x61, 0x67, 0x65, 0x60, 0x0A, 0x76, 0x61,
                0x6C, 0x75, 0x65, 0x55, 0x6E, 0x69, 0x6F, 0x6E, 0xFD, 0x00, 0x04, 0x81, 0x00, 0x03, 0x0B, 0x73,
                0x74, 0x72, 0x69, 0x6E, 0x67, 0x56, 0x61, 0x6C, 0x75, 0x65, 0x60, 0x08, 0x69, 0x6E, 0x74, 0x56,
                0x61, 0x6C, 0x75, 0x65, 0x22, 0x0B, 0x64, 0x6F, 0x75, 0x62, 0x6C, 0x65, 0x56, 0x61, 0x6C, 0x75,
                0x65, 0x43, 0x0C, 0x76, 0x61, 0x72, 0x69, 0x61, 0x6E, 0x74, 0x55, 0x6E, 0x69, 0x6F, 0x6E, 0xFD,
                0x00, 0x05, 0x82];
            const buffer = Buffer.from(bufferArray);
            const result = decodeType(buffer, 0, ENDIAN.BIG);
            console.dir(result, { maxArrayLength: null, depth: null })
            expect(result).toEqual(
                {
                    typeIndex: '0x89',
                    name: 'exampleStructure',
                    id: 0x11,
                    elementId: 1,
                    fields: {
                        value: { typeIndex: '0x28' },
                        boundedSizeArray: { typeIndex: '0x30', size: 16 },
                        fixedSizeArray: { typeIndex: '0x38', size: 4 },
                        timeStamp: {
                            id: 2,
                            typeIndex: '0x80',
                            name: 'time_t',
                            fields: {
                                secondsPastEpoch: { typeIndex: '0x23' },
                                nanoseconds: { typeIndex: '0x22' },
                                userTag: { typeIndex: '0x22' }
                            }
                        },
                        alarm: {
                            id: 3,
                            typeIndex: '0x80',
                            name: 'alarm_t',
                            fields: {
                                severity: { typeIndex: '0x22' },
                                status: { typeIndex: '0x22' },
                                message: { typeIndex: '0x60' }
                            }
                        },
                        valueUnion: {
                            id: 4,
                            typeIndex: '0x81',
                            name: '',
                            fields: {
                                stringValue: { typeIndex: '0x60' },
                                intValue: { typeIndex: '0x22' },
                                doubleValue: { typeIndex: '0x43' }
                            }
                        },
                        variantUnion: { id: 5, typeIndex: '0x82' }
                    }
                }
            )
        })


        it("normal case -- with an ID and a TAG", () => {

            let bufferArray = [
                0xFC,
                0x00, 0x11, // ID
                0x00, 0x00, 0x00, 0x12, // TAG
                0x89, // type index
                0xFD, 0x00, 0x01, 0x81, 0x10, 0x65, 0x78, 0x61, 0x6D, 0x70, 0x6C, 0x65, 0x53, 0x74, 0x72, 0x75,
                0x63, 0x74, 0x75, 0x72, 0x65, 0x07, 0x05, 0x76, 0x61, 0x6C, 0x75, 0x65, 0x28, 0x10, 0x62, 0x6F,
                0x75, 0x6E, 0x64, 0x65, 0x64, 0x53, 0x69, 0x7A, 0x65, 0x41, 0x72, 0x72, 0x61, 0x79, 0x30, 0x10,
                0x0E, 0x66, 0x69, 0x78, 0x65, 0x64, 0x53, 0x69, 0x7A, 0x65, 0x41, 0x72, 0x72, 0x61, 0x79, 0x38,
                0x04, 0x09, 0x74, 0x69, 0x6D, 0x65, 0x53, 0x74, 0x61, 0x6D, 0x70, 0xFD, 0x00, 0x02, 0x80, 0x06,
                0x74, 0x69, 0x6D, 0x65, 0x5F, 0x74, 0x03, 0x10, 0x73, 0x65, 0x63, 0x6F, 0x6E, 0x64, 0x73, 0x50,
                0x61, 0x73, 0x74, 0x45, 0x70, 0x6F, 0x63, 0x68, 0x23, 0x0B, 0x6E, 0x61, 0x6E, 0x6F, 0x73, 0x65,
                0x63, 0x6F, 0x6E, 0x64, 0x73, 0x22, 0x07, 0x75, 0x73, 0x65, 0x72, 0x54, 0x61, 0x67, 0x22, 0x05,
                0x61, 0x6C, 0x61, 0x72, 0x6D, 0xFD, 0x00, 0x03, 0x80, 0x07, 0x61, 0x6C, 0x61, 0x72, 0x6D, 0x5F,
                0x74, 0x03, 0x08, 0x73, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0x06, 0x73, 0x74, 0x61,
                0x74, 0x75, 0x73, 0x22, 0x07, 0x6D, 0x65, 0x73, 0x73, 0x61, 0x67, 0x65, 0x60, 0x0A, 0x76, 0x61,
                0x6C, 0x75, 0x65, 0x55, 0x6E, 0x69, 0x6F, 0x6E, 0xFD, 0x00, 0x04, 0x81, 0x00, 0x03, 0x0B, 0x73,
                0x74, 0x72, 0x69, 0x6E, 0x67, 0x56, 0x61, 0x6C, 0x75, 0x65, 0x60, 0x08, 0x69, 0x6E, 0x74, 0x56,
                0x61, 0x6C, 0x75, 0x65, 0x22, 0x0B, 0x64, 0x6F, 0x75, 0x62, 0x6C, 0x65, 0x56, 0x61, 0x6C, 0x75,
                0x65, 0x43, 0x0C, 0x76, 0x61, 0x72, 0x69, 0x61, 0x6E, 0x74, 0x55, 0x6E, 0x69, 0x6F, 0x6E, 0xFD,
                0x00, 0x05, 0x82];
            const buffer = Buffer.from(bufferArray);
            const result = decodeType(buffer, 0, ENDIAN.BIG);
            console.dir(result, { maxArrayLength: null, depth: null })
            expect(result).toEqual(
                {
                    typeIndex: '0x89',
                    name: 'exampleStructure',
                    id: 0x11,
                    tag: 0x12,
                    elementId: 1,
                    fields: {
                        value: { typeIndex: '0x28' },
                        boundedSizeArray: { typeIndex: '0x30', size: 16 },
                        fixedSizeArray: { typeIndex: '0x38', size: 4 },
                        timeStamp: {
                            id: 2,
                            typeIndex: '0x80',
                            name: 'time_t',
                            fields: {
                                secondsPastEpoch: { typeIndex: '0x23' },
                                nanoseconds: { typeIndex: '0x22' },
                                userTag: { typeIndex: '0x22' }
                            }
                        },
                        alarm: {
                            id: 3,
                            typeIndex: '0x80',
                            name: 'alarm_t',
                            fields: {
                                severity: { typeIndex: '0x22' },
                                status: { typeIndex: '0x22' },
                                message: { typeIndex: '0x60' }
                            }
                        },
                        valueUnion: {
                            id: 4,
                            typeIndex: '0x81',
                            name: '',
                            fields: {
                                stringValue: { typeIndex: '0x60' },
                                intValue: { typeIndex: '0x22' },
                                doubleValue: { typeIndex: '0x43' }
                            }
                        },
                        variantUnion: { id: 5, typeIndex: '0x82' }
                    }
                }
            )
        })


        it("failed case -- we are not attaching a union type in buffer", () => {

            let bufferArray = [
                0x89,
                0xFD, 0x00, 0x01, 0x28];
            const buffer = Buffer.from(bufferArray);
            expect(() => { decodeType(buffer, 0, ENDIAN.BIG) }).toThrow();
        })

        it("failed case -- we are attaching a struct", () => {

            let bufferArray = [
                0xFC,
                0x00, 0x11, // ID
                0x00, 0x00, 0x00, 0x12, // TAG
                0x89, // type index
                0xFD, 0x00, 0x01, 0x80, // we are attaching a struct
                0x10, 0x65, 0x78, 0x61, 0x6D, 0x70, 0x6C, 0x65, 0x53, 0x74, 0x72, 0x75,
                0x63, 0x74, 0x75, 0x72, 0x65, 0x07, 0x05, 0x76, 0x61, 0x6C, 0x75, 0x65, 0x28, 0x10, 0x62, 0x6F,
                0x75, 0x6E, 0x64, 0x65, 0x64, 0x53, 0x69, 0x7A, 0x65, 0x41, 0x72, 0x72, 0x61, 0x79, 0x30, 0x10,
                0x0E, 0x66, 0x69, 0x78, 0x65, 0x64, 0x53, 0x69, 0x7A, 0x65, 0x41, 0x72, 0x72, 0x61, 0x79, 0x38,
                0x04, 0x09, 0x74, 0x69, 0x6D, 0x65, 0x53, 0x74, 0x61, 0x6D, 0x70, 0xFD, 0x00, 0x02, 0x80, 0x06,
                0x74, 0x69, 0x6D, 0x65, 0x5F, 0x74, 0x03, 0x10, 0x73, 0x65, 0x63, 0x6F, 0x6E, 0x64, 0x73, 0x50,
                0x61, 0x73, 0x74, 0x45, 0x70, 0x6F, 0x63, 0x68, 0x23, 0x0B, 0x6E, 0x61, 0x6E, 0x6F, 0x73, 0x65,
                0x63, 0x6F, 0x6E, 0x64, 0x73, 0x22, 0x07, 0x75, 0x73, 0x65, 0x72, 0x54, 0x61, 0x67, 0x22, 0x05,
                0x61, 0x6C, 0x61, 0x72, 0x6D, 0xFD, 0x00, 0x03, 0x80, 0x07, 0x61, 0x6C, 0x61, 0x72, 0x6D, 0x5F,
                0x74, 0x03, 0x08, 0x73, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0x06, 0x73, 0x74, 0x61,
                0x74, 0x75, 0x73, 0x22, 0x07, 0x6D, 0x65, 0x73, 0x73, 0x61, 0x67, 0x65, 0x60, 0x0A, 0x76, 0x61,
                0x6C, 0x75, 0x65, 0x55, 0x6E, 0x69, 0x6F, 0x6E, 0xFD, 0x00, 0x04, 0x81, 0x00, 0x03, 0x0B, 0x73,
                0x74, 0x72, 0x69, 0x6E, 0x67, 0x56, 0x61, 0x6C, 0x75, 0x65, 0x60, 0x08, 0x69, 0x6E, 0x74, 0x56,
                0x61, 0x6C, 0x75, 0x65, 0x22, 0x0B, 0x64, 0x6F, 0x75, 0x62, 0x6C, 0x65, 0x56, 0x61, 0x6C, 0x75,
                0x65, 0x43, 0x0C, 0x76, 0x61, 0x72, 0x69, 0x61, 0x6E, 0x74, 0x55, 0x6E, 0x69, 0x6F, 0x6E, 0xFD,
                0x00, 0x05, 0x82];
            const buffer = Buffer.from(bufferArray);
            expect(() => { decodeType(buffer, 0, ENDIAN.BIG) }).toThrow();
        })
    })


    describe("complex_variableSizeArray_structure, 0x88", () => {
        it("normal case", () => {

            let bufferArray = [
                0x88,
                0xFD, 0x00, 0x01, 0x80, 0x10, 0x65, 0x78, 0x61, 0x6D, 0x70, 0x6C, 0x65, 0x53, 0x74, 0x72, 0x75,
                0x63, 0x74, 0x75, 0x72, 0x65, 0x07, 0x05, 0x76, 0x61, 0x6C, 0x75, 0x65, 0x28, 0x10, 0x62, 0x6F,
                0x75, 0x6E, 0x64, 0x65, 0x64, 0x53, 0x69, 0x7A, 0x65, 0x41, 0x72, 0x72, 0x61, 0x79, 0x30, 0x10,
                0x0E, 0x66, 0x69, 0x78, 0x65, 0x64, 0x53, 0x69, 0x7A, 0x65, 0x41, 0x72, 0x72, 0x61, 0x79, 0x38,
                0x04, 0x09, 0x74, 0x69, 0x6D, 0x65, 0x53, 0x74, 0x61, 0x6D, 0x70, 0xFD, 0x00, 0x02, 0x80, 0x06,
                0x74, 0x69, 0x6D, 0x65, 0x5F, 0x74, 0x03, 0x10, 0x73, 0x65, 0x63, 0x6F, 0x6E, 0x64, 0x73, 0x50,
                0x61, 0x73, 0x74, 0x45, 0x70, 0x6F, 0x63, 0x68, 0x23, 0x0B, 0x6E, 0x61, 0x6E, 0x6F, 0x73, 0x65,
                0x63, 0x6F, 0x6E, 0x64, 0x73, 0x22, 0x07, 0x75, 0x73, 0x65, 0x72, 0x54, 0x61, 0x67, 0x22, 0x05,
                0x61, 0x6C, 0x61, 0x72, 0x6D, 0xFD, 0x00, 0x03, 0x80, 0x07, 0x61, 0x6C, 0x61, 0x72, 0x6D, 0x5F,
                0x74, 0x03, 0x08, 0x73, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0x06, 0x73, 0x74, 0x61,
                0x74, 0x75, 0x73, 0x22, 0x07, 0x6D, 0x65, 0x73, 0x73, 0x61, 0x67, 0x65, 0x60, 0x0A, 0x76, 0x61,
                0x6C, 0x75, 0x65, 0x55, 0x6E, 0x69, 0x6F, 0x6E, 0xFD, 0x00, 0x04, 0x81, 0x00, 0x03, 0x0B, 0x73,
                0x74, 0x72, 0x69, 0x6E, 0x67, 0x56, 0x61, 0x6C, 0x75, 0x65, 0x60, 0x08, 0x69, 0x6E, 0x74, 0x56,
                0x61, 0x6C, 0x75, 0x65, 0x22, 0x0B, 0x64, 0x6F, 0x75, 0x62, 0x6C, 0x65, 0x56, 0x61, 0x6C, 0x75,
                0x65, 0x43, 0x0C, 0x76, 0x61, 0x72, 0x69, 0x61, 0x6E, 0x74, 0x55, 0x6E, 0x69, 0x6F, 0x6E, 0xFD,
                0x00, 0x05, 0x82];
            const buffer = Buffer.from(bufferArray);
            const result = decodeType(buffer, 0, ENDIAN.BIG);
            console.dir(result, { maxArrayLength: null, depth: null })
            expect(result).toEqual(
                {
                    typeIndex: '0x88',
                    name: 'exampleStructure',
                    elementId: 1,
                    fields: {
                        value: { typeIndex: '0x28' },
                        boundedSizeArray: { typeIndex: '0x30', size: 16 },
                        fixedSizeArray: { typeIndex: '0x38', size: 4 },
                        timeStamp: {
                            id: 2,
                            typeIndex: '0x80',
                            name: 'time_t',
                            fields: {
                                secondsPastEpoch: { typeIndex: '0x23' },
                                nanoseconds: { typeIndex: '0x22' },
                                userTag: { typeIndex: '0x22' }
                            }
                        },
                        alarm: {
                            id: 3,
                            typeIndex: '0x80',
                            name: 'alarm_t',
                            fields: {
                                severity: { typeIndex: '0x22' },
                                status: { typeIndex: '0x22' },
                                message: { typeIndex: '0x60' }
                            }
                        },
                        valueUnion: {
                            id: 4,
                            typeIndex: '0x81',
                            name: '',
                            fields: {
                                stringValue: { typeIndex: '0x60' },
                                intValue: { typeIndex: '0x22' },
                                doubleValue: { typeIndex: '0x43' }
                            }
                        },
                        variantUnion: { id: 5, typeIndex: '0x82' }
                    }
                }
            )
        })

        it("normal case -- with an ID", () => {

            let bufferArray = [
                0xFD,
                0x00, 0x11, // ID
                0x88, // type index
                0xFD, 0x00, 0x01, 0x80, 0x10, 0x65, 0x78, 0x61, 0x6D, 0x70, 0x6C, 0x65, 0x53, 0x74, 0x72, 0x75,
                0x63, 0x74, 0x75, 0x72, 0x65, 0x07, 0x05, 0x76, 0x61, 0x6C, 0x75, 0x65, 0x28, 0x10, 0x62, 0x6F,
                0x75, 0x6E, 0x64, 0x65, 0x64, 0x53, 0x69, 0x7A, 0x65, 0x41, 0x72, 0x72, 0x61, 0x79, 0x30, 0x10,
                0x0E, 0x66, 0x69, 0x78, 0x65, 0x64, 0x53, 0x69, 0x7A, 0x65, 0x41, 0x72, 0x72, 0x61, 0x79, 0x38,
                0x04, 0x09, 0x74, 0x69, 0x6D, 0x65, 0x53, 0x74, 0x61, 0x6D, 0x70, 0xFD, 0x00, 0x02, 0x80, 0x06,
                0x74, 0x69, 0x6D, 0x65, 0x5F, 0x74, 0x03, 0x10, 0x73, 0x65, 0x63, 0x6F, 0x6E, 0x64, 0x73, 0x50,
                0x61, 0x73, 0x74, 0x45, 0x70, 0x6F, 0x63, 0x68, 0x23, 0x0B, 0x6E, 0x61, 0x6E, 0x6F, 0x73, 0x65,
                0x63, 0x6F, 0x6E, 0x64, 0x73, 0x22, 0x07, 0x75, 0x73, 0x65, 0x72, 0x54, 0x61, 0x67, 0x22, 0x05,
                0x61, 0x6C, 0x61, 0x72, 0x6D, 0xFD, 0x00, 0x03, 0x80, 0x07, 0x61, 0x6C, 0x61, 0x72, 0x6D, 0x5F,
                0x74, 0x03, 0x08, 0x73, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0x06, 0x73, 0x74, 0x61,
                0x74, 0x75, 0x73, 0x22, 0x07, 0x6D, 0x65, 0x73, 0x73, 0x61, 0x67, 0x65, 0x60, 0x0A, 0x76, 0x61,
                0x6C, 0x75, 0x65, 0x55, 0x6E, 0x69, 0x6F, 0x6E, 0xFD, 0x00, 0x04, 0x81, 0x00, 0x03, 0x0B, 0x73,
                0x74, 0x72, 0x69, 0x6E, 0x67, 0x56, 0x61, 0x6C, 0x75, 0x65, 0x60, 0x08, 0x69, 0x6E, 0x74, 0x56,
                0x61, 0x6C, 0x75, 0x65, 0x22, 0x0B, 0x64, 0x6F, 0x75, 0x62, 0x6C, 0x65, 0x56, 0x61, 0x6C, 0x75,
                0x65, 0x43, 0x0C, 0x76, 0x61, 0x72, 0x69, 0x61, 0x6E, 0x74, 0x55, 0x6E, 0x69, 0x6F, 0x6E, 0xFD,
                0x00, 0x05, 0x82];
            const buffer = Buffer.from(bufferArray);
            const result = decodeType(buffer, 0, ENDIAN.BIG);
            console.dir(result, { maxArrayLength: null, depth: null })
            expect(result).toEqual(
                {
                    typeIndex: '0x88',
                    name: 'exampleStructure',
                    id: 0x11,
                    elementId: 1,
                    fields: {
                        value: { typeIndex: '0x28' },
                        boundedSizeArray: { typeIndex: '0x30', size: 16 },
                        fixedSizeArray: { typeIndex: '0x38', size: 4 },
                        timeStamp: {
                            id: 2,
                            typeIndex: '0x80',
                            name: 'time_t',
                            fields: {
                                secondsPastEpoch: { typeIndex: '0x23' },
                                nanoseconds: { typeIndex: '0x22' },
                                userTag: { typeIndex: '0x22' }
                            }
                        },
                        alarm: {
                            id: 3,
                            typeIndex: '0x80',
                            name: 'alarm_t',
                            fields: {
                                severity: { typeIndex: '0x22' },
                                status: { typeIndex: '0x22' },
                                message: { typeIndex: '0x60' }
                            }
                        },
                        valueUnion: {
                            id: 4,
                            typeIndex: '0x81',
                            name: '',
                            fields: {
                                stringValue: { typeIndex: '0x60' },
                                intValue: { typeIndex: '0x22' },
                                doubleValue: { typeIndex: '0x43' }
                            }
                        },
                        variantUnion: { id: 5, typeIndex: '0x82' }
                    }
                }
            )
        })

        it("normal case -- with an ID and a TAG", () => {

            let bufferArray = [
                0xFC,
                0x00, 0x11, // ID
                0x00, 0x00, 0x00, 0x12, // TAG
                0x88, // type index
                0xFD, 0x00, 0x01, 0x80, 0x10, 0x65, 0x78, 0x61, 0x6D, 0x70, 0x6C, 0x65, 0x53, 0x74, 0x72, 0x75,
                0x63, 0x74, 0x75, 0x72, 0x65, 0x07, 0x05, 0x76, 0x61, 0x6C, 0x75, 0x65, 0x28, 0x10, 0x62, 0x6F,
                0x75, 0x6E, 0x64, 0x65, 0x64, 0x53, 0x69, 0x7A, 0x65, 0x41, 0x72, 0x72, 0x61, 0x79, 0x30, 0x10,
                0x0E, 0x66, 0x69, 0x78, 0x65, 0x64, 0x53, 0x69, 0x7A, 0x65, 0x41, 0x72, 0x72, 0x61, 0x79, 0x38,
                0x04, 0x09, 0x74, 0x69, 0x6D, 0x65, 0x53, 0x74, 0x61, 0x6D, 0x70, 0xFD, 0x00, 0x02, 0x80, 0x06,
                0x74, 0x69, 0x6D, 0x65, 0x5F, 0x74, 0x03, 0x10, 0x73, 0x65, 0x63, 0x6F, 0x6E, 0x64, 0x73, 0x50,
                0x61, 0x73, 0x74, 0x45, 0x70, 0x6F, 0x63, 0x68, 0x23, 0x0B, 0x6E, 0x61, 0x6E, 0x6F, 0x73, 0x65,
                0x63, 0x6F, 0x6E, 0x64, 0x73, 0x22, 0x07, 0x75, 0x73, 0x65, 0x72, 0x54, 0x61, 0x67, 0x22, 0x05,
                0x61, 0x6C, 0x61, 0x72, 0x6D, 0xFD, 0x00, 0x03, 0x80, 0x07, 0x61, 0x6C, 0x61, 0x72, 0x6D, 0x5F,
                0x74, 0x03, 0x08, 0x73, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0x06, 0x73, 0x74, 0x61,
                0x74, 0x75, 0x73, 0x22, 0x07, 0x6D, 0x65, 0x73, 0x73, 0x61, 0x67, 0x65, 0x60, 0x0A, 0x76, 0x61,
                0x6C, 0x75, 0x65, 0x55, 0x6E, 0x69, 0x6F, 0x6E, 0xFD, 0x00, 0x04, 0x81, 0x00, 0x03, 0x0B, 0x73,
                0x74, 0x72, 0x69, 0x6E, 0x67, 0x56, 0x61, 0x6C, 0x75, 0x65, 0x60, 0x08, 0x69, 0x6E, 0x74, 0x56,
                0x61, 0x6C, 0x75, 0x65, 0x22, 0x0B, 0x64, 0x6F, 0x75, 0x62, 0x6C, 0x65, 0x56, 0x61, 0x6C, 0x75,
                0x65, 0x43, 0x0C, 0x76, 0x61, 0x72, 0x69, 0x61, 0x6E, 0x74, 0x55, 0x6E, 0x69, 0x6F, 0x6E, 0xFD,
                0x00, 0x05, 0x82];
            const buffer = Buffer.from(bufferArray);
            const result = decodeType(buffer, 0, ENDIAN.BIG);
            console.dir(result, { maxArrayLength: null, depth: null })
            expect(result).toEqual(
                {
                    typeIndex: '0x88',
                    name: 'exampleStructure',
                    id: 0x11,
                    tag: 0x12,
                    elementId: 1,
                    fields: {
                        value: { typeIndex: '0x28' },
                        boundedSizeArray: { typeIndex: '0x30', size: 16 },
                        fixedSizeArray: { typeIndex: '0x38', size: 4 },
                        timeStamp: {
                            id: 2,
                            typeIndex: '0x80',
                            name: 'time_t',
                            fields: {
                                secondsPastEpoch: { typeIndex: '0x23' },
                                nanoseconds: { typeIndex: '0x22' },
                                userTag: { typeIndex: '0x22' }
                            }
                        },
                        alarm: {
                            id: 3,
                            typeIndex: '0x80',
                            name: 'alarm_t',
                            fields: {
                                severity: { typeIndex: '0x22' },
                                status: { typeIndex: '0x22' },
                                message: { typeIndex: '0x60' }
                            }
                        },
                        valueUnion: {
                            id: 4,
                            typeIndex: '0x81',
                            name: '',
                            fields: {
                                stringValue: { typeIndex: '0x60' },
                                intValue: { typeIndex: '0x22' },
                                doubleValue: { typeIndex: '0x43' }
                            }
                        },
                        variantUnion: { id: 5, typeIndex: '0x82' }
                    }
                }
            )
        })

        it("failed case -- we are not attaching a struct type in buffer", () => {

            let bufferArray = [
                0x88,
                0xFD, 0x00, 0x01, 0x28];
            const buffer = Buffer.from(bufferArray);
            expect(() => { decodeType(buffer, 0, ENDIAN.BIG) }).toThrow();
        })


        it("failed case -- we are attaching a union", () => {

            let bufferArray = [
                0xFC,
                0x00, 0x11, // ID
                0x00, 0x00, 0x00, 0x12, // TAG
                0x88, // type index
                0xFD, 0x00, 0x01, 0x81, // we are attaching a union
                0x10, 0x65, 0x78, 0x61, 0x6D, 0x70, 0x6C, 0x65, 0x53, 0x74, 0x72, 0x75,
                0x63, 0x74, 0x75, 0x72, 0x65, 0x07, 0x05, 0x76, 0x61, 0x6C, 0x75, 0x65, 0x28, 0x10, 0x62, 0x6F,
                0x75, 0x6E, 0x64, 0x65, 0x64, 0x53, 0x69, 0x7A, 0x65, 0x41, 0x72, 0x72, 0x61, 0x79, 0x30, 0x10,
                0x0E, 0x66, 0x69, 0x78, 0x65, 0x64, 0x53, 0x69, 0x7A, 0x65, 0x41, 0x72, 0x72, 0x61, 0x79, 0x38,
                0x04, 0x09, 0x74, 0x69, 0x6D, 0x65, 0x53, 0x74, 0x61, 0x6D, 0x70, 0xFD, 0x00, 0x02, 0x80, 0x06,
                0x74, 0x69, 0x6D, 0x65, 0x5F, 0x74, 0x03, 0x10, 0x73, 0x65, 0x63, 0x6F, 0x6E, 0x64, 0x73, 0x50,
                0x61, 0x73, 0x74, 0x45, 0x70, 0x6F, 0x63, 0x68, 0x23, 0x0B, 0x6E, 0x61, 0x6E, 0x6F, 0x73, 0x65,
                0x63, 0x6F, 0x6E, 0x64, 0x73, 0x22, 0x07, 0x75, 0x73, 0x65, 0x72, 0x54, 0x61, 0x67, 0x22, 0x05,
                0x61, 0x6C, 0x61, 0x72, 0x6D, 0xFD, 0x00, 0x03, 0x80, 0x07, 0x61, 0x6C, 0x61, 0x72, 0x6D, 0x5F,
                0x74, 0x03, 0x08, 0x73, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0x06, 0x73, 0x74, 0x61,
                0x74, 0x75, 0x73, 0x22, 0x07, 0x6D, 0x65, 0x73, 0x73, 0x61, 0x67, 0x65, 0x60, 0x0A, 0x76, 0x61,
                0x6C, 0x75, 0x65, 0x55, 0x6E, 0x69, 0x6F, 0x6E, 0xFD, 0x00, 0x04, 0x81, 0x00, 0x03, 0x0B, 0x73,
                0x74, 0x72, 0x69, 0x6E, 0x67, 0x56, 0x61, 0x6C, 0x75, 0x65, 0x60, 0x08, 0x69, 0x6E, 0x74, 0x56,
                0x61, 0x6C, 0x75, 0x65, 0x22, 0x0B, 0x64, 0x6F, 0x75, 0x62, 0x6C, 0x65, 0x56, 0x61, 0x6C, 0x75,
                0x65, 0x43, 0x0C, 0x76, 0x61, 0x72, 0x69, 0x61, 0x6E, 0x74, 0x55, 0x6E, 0x69, 0x6F, 0x6E, 0xFD,
                0x00, 0x05, 0x82];
            const buffer = Buffer.from(bufferArray);
            expect(() => { decodeType(buffer, 0, ENDIAN.BIG) }).toThrow();
        })
    })

    describe("complex_scalar_boundedString, 0x83", () => {
        it("normal case", () => {
            const bufferArray = [0x83, 0x05];
            const buffer = Buffer.from(bufferArray);
            const result = decodeType(buffer, 0, ENDIAN.BIG);
            expect(result).toEqual({
                typeIndex: typeIndexEnum.complex_scalar_boundedString,
                size: 5,
            })
        })

        it("normal case -- bound is 0", () => {
            const bufferArray = [0x83, 0x00];
            const buffer = Buffer.from(bufferArray);
            const result = decodeType(buffer, 0, ENDIAN.BIG);
            expect(result).toEqual({
                typeIndex: typeIndexEnum.complex_scalar_boundedString,
                size: 0,
            })
        })

        it("failed case -- size does not exist", () => {
            const bufferArray = [0x83];
            const buffer = Buffer.from(bufferArray);
            expect(() => { decodeType(buffer, 0, ENDIAN.BIG) }).toThrow();
        })

        it("normal case -- has an ID", () => {
            const bufferArray = [0xfd, 0x00, 0x01, 0x83, 0x05];
            const buffer = Buffer.from(bufferArray);
            const result = decodeType(buffer, 0, ENDIAN.BIG);
            expect(result).toEqual({
                id: 1,
                typeIndex: "0x83",
                size: 5,
            })
        })

        it("normal case -- has an ID and a TAG", () => {
            const bufferArray = [0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x23, 0x83, 0x05];
            const buffer = Buffer.from(bufferArray);
            const result = decodeType(buffer, 0, ENDIAN.BIG);
            expect(result).toEqual({
                id: 1,
                tag: 0x23,
                typeIndex: "0x83",
                size: 5,
            })
        })


        it("failed case -- has an ID and a TAG, but TAG is encoded as short", () => {
            const bufferArray = [0xfc, 0x00, 0x01, 0x00, 0x23, 0x83, 0x05];
            const buffer = Buffer.from(bufferArray);
            expect(() => { decodeType(buffer, 0, ENDIAN.BIG) }).toThrow();
        })

    })

    describe("complex_scalar_variantUnion, 0x82", () => {

        it("normal case", () => {
            const bufferArray = [0x82];
            const buffer = Buffer.from(bufferArray);
            const result = decodeType(buffer, 0, ENDIAN.BIG);
            expect(result).toEqual({
                typeIndex: "0x82",
            })
        })

        it("normal case -- with and ID and TAG", () => {
            const bufferArray = [0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x02, 0x82];
            const buffer = Buffer.from(bufferArray);
            const result = decodeType(buffer, 0, ENDIAN.BIG);
            expect(result).toEqual({
                typeIndex: "0x82",
                id: 1,
                tag: 2,
            })
        })

        it("normal case -- with and ID ", () => {
            const bufferArray = [0xfd, 0x00, 0x01, 0x82];
            const buffer = Buffer.from(bufferArray);
            const result = decodeType(buffer, 0, ENDIAN.BIG);
            expect(result).toEqual({
                typeIndex: "0x82",
                id: 1,
            })
        })

    })

    describe("complex_scalar_union, 0x81, test cases are similar to struct 0x80", () => {
        it("union from strcut -- PV Access protocol: Example 1, page 17", () => {

            const bufferArray = [0xFD, 0x00, 0x01, 0x81, 0x0B, 0x74, 0x69, 0x6D, 0x65, 0x53, 0x74, 0x61, 0x6D, 0x70, 0x5F, 0x74,
                0x03, 0x10, 0x73, 0x65, 0x63, 0x6F, 0x6E, 0x64, 0x73, 0x50, 0x61, 0x73, 0x74, 0x45, 0x70, 0x6F,
                0x63, 0x68, 0x23, 0x0B, 0x6E, 0x61, 0x6E, 0x6F, 0x53, 0x65, 0x63, 0x6F, 0x6E, 0x64, 0x73, 0x22,
                0x07, 0x75, 0x73, 0x65, 0x72, 0x54, 0x61, 0x67, 0x22];
            const buffer = Buffer.from(bufferArray);
            const result = decodeType(buffer, 0, ENDIAN.BIG);
            expect(result).toEqual({
                id: 1,
                typeIndex: '0x81',
                name: 'timeStamp_t',
                fields: {
                    secondsPastEpoch: { typeIndex: '0x23' },
                    nanoSeconds: { typeIndex: '0x22' },
                    userTag: { typeIndex: '0x22' }
                }
            })
        })


        it("PV Access protocol: Example 2, page 17", () => {

            let bufferArray = [0xFD, 0x00, 0x01, 0x81, 0x10, 0x65, 0x78, 0x61, 0x6D, 0x70, 0x6C, 0x65, 0x53, 0x74, 0x72, 0x75,
                0x63, 0x74, 0x75, 0x72, 0x65, 0x07, 0x05, 0x76, 0x61, 0x6C, 0x75, 0x65, 0x28, 0x10, 0x62, 0x6F,
                0x75, 0x6E, 0x64, 0x65, 0x64, 0x53, 0x69, 0x7A, 0x65, 0x41, 0x72, 0x72, 0x61, 0x79, 0x30, 0x10,
                0x0E, 0x66, 0x69, 0x78, 0x65, 0x64, 0x53, 0x69, 0x7A, 0x65, 0x41, 0x72, 0x72, 0x61, 0x79, 0x38,
                0x04, 0x09, 0x74, 0x69, 0x6D, 0x65, 0x53, 0x74, 0x61, 0x6D, 0x70, 0xFD, 0x00, 0x02, 0x80, 0x06,
                0x74, 0x69, 0x6D, 0x65, 0x5F, 0x74, 0x03, 0x10, 0x73, 0x65, 0x63, 0x6F, 0x6E, 0x64, 0x73, 0x50,
                0x61, 0x73, 0x74, 0x45, 0x70, 0x6F, 0x63, 0x68, 0x23, 0x0B, 0x6E, 0x61, 0x6E, 0x6F, 0x73, 0x65,
                0x63, 0x6F, 0x6E, 0x64, 0x73, 0x22, 0x07, 0x75, 0x73, 0x65, 0x72, 0x54, 0x61, 0x67, 0x22, 0x05,
                0x61, 0x6C, 0x61, 0x72, 0x6D, 0xFD, 0x00, 0x03, 0x80, 0x07, 0x61, 0x6C, 0x61, 0x72, 0x6D, 0x5F,
                0x74, 0x03, 0x08, 0x73, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0x06, 0x73, 0x74, 0x61,
                0x74, 0x75, 0x73, 0x22, 0x07, 0x6D, 0x65, 0x73, 0x73, 0x61, 0x67, 0x65, 0x60, 0x0A, 0x76, 0x61,
                0x6C, 0x75, 0x65, 0x55, 0x6E, 0x69, 0x6F, 0x6E, 0xFD, 0x00, 0x04, 0x81, 0x00, 0x03, 0x0B, 0x73,
                0x74, 0x72, 0x69, 0x6E, 0x67, 0x56, 0x61, 0x6C, 0x75, 0x65, 0x60, 0x08, 0x69, 0x6E, 0x74, 0x56,
                0x61, 0x6C, 0x75, 0x65, 0x22, 0x0B, 0x64, 0x6F, 0x75, 0x62, 0x6C, 0x65, 0x56, 0x61, 0x6C, 0x75,
                0x65, 0x43, 0x0C, 0x76, 0x61, 0x72, 0x69, 0x61, 0x6E, 0x74, 0x55, 0x6E, 0x69, 0x6F, 0x6E, 0xFD,
                0x00, 0x05, 0x82];
            const buffer = Buffer.from(bufferArray);
            const result = decodeType(buffer, 0, ENDIAN.BIG);
            expect(result).toEqual(
                {
                    id: 1,
                    typeIndex: '0x81',
                    name: 'exampleStructure',
                    fields: {
                        value: { typeIndex: '0x28' },
                        boundedSizeArray: { typeIndex: '0x30', size: 16 },
                        fixedSizeArray: { typeIndex: '0x38', size: 4 },
                        timeStamp: {
                            id: 2,
                            typeIndex: '0x80',
                            name: 'time_t',
                            fields: {
                                secondsPastEpoch: { typeIndex: '0x23' },
                                nanoseconds: { typeIndex: '0x22' },
                                userTag: { typeIndex: '0x22' }
                            }
                        },
                        alarm: {
                            id: 3,
                            typeIndex: '0x80',
                            name: 'alarm_t',
                            fields: {
                                severity: { typeIndex: '0x22' },
                                status: { typeIndex: '0x22' },
                                message: { typeIndex: '0x60' }
                            }
                        },
                        valueUnion: {
                            id: 4,
                            typeIndex: '0x81',
                            name: '',
                            fields: {
                                stringValue: { typeIndex: '0x60' },
                                intValue: { typeIndex: '0x22' },
                                doubleValue: { typeIndex: '0x43' }
                            }
                        },
                        variantUnion: { id: 5, typeIndex: '0x82' }
                    }
                }
            )
        })


        it("NTNDArray: https://docs.epics-controls.org/en/latest/pv-access/Normative-Types-Specification.html#ntndarray", () => {

            const bufferArray = [
                0xfd, 0x01,
                0x00, 0x81, 0x16, 0x65, 0x70, 0x69, 0x63, 0x73, 0x3a, 0x6e, 0x74, 0x2f, 0x4e, 0x54, 0x4e, 0x44, 0x41, 0x72, 0x72, 0x61, 0x79, 0x3a, 0x31, 0x2e,
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
            ];
            const buffer = Buffer.from(bufferArray);
            const result = decodeType(buffer, 0, ENDIAN.LITTLE);

            expect(result).toEqual(
                {
                    id: 1,
                    typeIndex: '0x81',
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
                }
            );
        })

        it("epics:nt/NTScalar:1.0, from pvget", () => {
            const bufferArray = [0xfd, 0x1, 0x0, 0x81, 0x15, 0x65, 0x70, 0x69, 0x63, 0x73, 0x3a, 0x6e, 0x74, 0x2f, 0x4e, 0x54, 0x53, 0x63, 0x61, 0x6c, 0x61, 0x72, 0x3a, 0x31, 0x2e, 0x30, 0x6, 0x5, 0x76, 0x61, 0x6c, 0x75, 0x65, 0x43, 0x5, 0x61, 0x6c, 0x61, 0x72, 0x6d, 0xfd, 0x2, 0x0, 0x80, 0x7, 0x61, 0x6c, 0x61, 0x72, 0x6d, 0x5f, 0x74, 0x3, 0x8, 0x73, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0x6, 0x73, 0x74, 0x61, 0x74, 0x75, 0x73, 0x22, 0x7, 0x6d, 0x65, 0x73, 0x73, 0x61, 0x67, 0x65, 0x60, 0x9, 0x74, 0x69, 0x6d, 0x65, 0x53, 0x74, 0x61, 0x6d, 0x70, 0xfd, 0x3, 0x0, 0x80, 0x0, 0x3, 0x10, 0x73, 0x65, 0x63, 0x6f, 0x6e, 0x64, 0x73, 0x50, 0x61, 0x73, 0x74, 0x45, 0x70, 0x6f, 0x63, 0x68, 0x23, 0xb, 0x6e, 0x61, 0x6e, 0x6f, 0x73, 0x65, 0x63, 0x6f, 0x6e, 0x64, 0x73, 0x22, 0x7, 0x75, 0x73, 0x65, 0x72, 0x54, 0x61, 0x67, 0x22, 0x7, 0x64, 0x69, 0x73, 0x70, 0x6c, 0x61, 0x79, 0xfd, 0x4, 0x0, 0x80, 0x0, 0x6, 0x8, 0x6c, 0x69, 0x6d, 0x69, 0x74, 0x4c, 0x6f, 0x77, 0x43, 0x9, 0x6c, 0x69, 0x6d, 0x69, 0x74, 0x48, 0x69, 0x67, 0x68, 0x43, 0xb, 0x64, 0x65, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x69, 0x6f, 0x6e, 0x60, 0x5, 0x75, 0x6e, 0x69, 0x74, 0x73, 0x60, 0x9, 0x70, 0x72, 0x65, 0x63, 0x69, 0x73, 0x69, 0x6f, 0x6e, 0x22, 0x4, 0x66, 0x6f, 0x72, 0x6d, 0xfd, 0x5, 0x0, 0x80, 0x6, 0x65, 0x6e, 0x75, 0x6d, 0x5f, 0x74, 0x2, 0x5, 0x69, 0x6e, 0x64, 0x65, 0x78, 0x22, 0x7, 0x63, 0x68, 0x6f, 0x69, 0x63, 0x65, 0x73, 0x68, 0x7, 0x63, 0x6f, 0x6e, 0x74, 0x72, 0x6f, 0x6c, 0xfd, 0x6, 0x0, 0x80, 0x9, 0x63, 0x6f, 0x6e, 0x74, 0x72, 0x6f, 0x6c, 0x5f, 0x74, 0x3, 0x8, 0x6c, 0x69, 0x6d, 0x69, 0x74, 0x4c, 0x6f, 0x77, 0x43, 0x9, 0x6c, 0x69, 0x6d, 0x69, 0x74, 0x48, 0x69, 0x67, 0x68, 0x43, 0x7, 0x6d, 0x69, 0x6e, 0x53, 0x74, 0x65, 0x70, 0x43, 0xa, 0x76, 0x61, 0x6c, 0x75, 0x65, 0x41, 0x6c, 0x61, 0x72, 0x6d, 0xfd, 0x7, 0x0, 0x80, 0xc, 0x76, 0x61, 0x6c, 0x75, 0x65, 0x41, 0x6c, 0x61, 0x72, 0x6d, 0x5f, 0x74, 0xa, 0x6, 0x61, 0x63, 0x74, 0x69, 0x76, 0x65, 0x0, 0xd, 0x6c, 0x6f, 0x77, 0x41, 0x6c, 0x61, 0x72, 0x6d, 0x4c, 0x69, 0x6d, 0x69, 0x74, 0x43, 0xf, 0x6c, 0x6f, 0x77, 0x57, 0x61, 0x72, 0x6e, 0x69, 0x6e, 0x67, 0x4c, 0x69, 0x6d, 0x69, 0x74, 0x43, 0x10, 0x68, 0x69, 0x67, 0x68, 0x57, 0x61, 0x72, 0x6e, 0x69, 0x6e, 0x67, 0x4c, 0x69, 0x6d, 0x69, 0x74, 0x43, 0xe, 0x68, 0x69, 0x67, 0x68, 0x41, 0x6c, 0x61, 0x72, 0x6d, 0x4c, 0x69, 0x6d, 0x69, 0x74, 0x43, 0x10, 0x6c, 0x6f, 0x77, 0x41, 0x6c, 0x61, 0x72, 0x6d, 0x53, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0x12, 0x6c, 0x6f, 0x77, 0x57, 0x61, 0x72, 0x6e, 0x69, 0x6e, 0x67, 0x53, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0x13, 0x68, 0x69, 0x67, 0x68, 0x57, 0x61, 0x72, 0x6e, 0x69, 0x6e, 0x67, 0x53, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0x11, 0x68, 0x69, 0x67, 0x68, 0x41, 0x6c, 0x61, 0x72, 0x6d, 0x53, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0xa, 0x68, 0x79, 0x73, 0x74, 0x65, 0x72, 0x65, 0x73, 0x69, 0x73, 0x20];
            const buffer = Buffer.from(bufferArray);
            const result = decodeType(buffer, 0, ENDIAN.LITTLE);
            expect(result).toEqual(
                {
                    id: 1,
                    typeIndex: '0x81',
                    name: 'epics:nt/NTScalar:1.0',
                    fields: {
                        value: { typeIndex: '0x43' },
                        alarm: {
                            id: 2,
                            typeIndex: '0x80',
                            name: 'alarm_t',
                            fields: {
                                severity: { typeIndex: '0x22' },
                                status: { typeIndex: '0x22' },
                                message: { typeIndex: '0x60' }
                            }
                        },
                        timeStamp: {
                            id: 3,
                            typeIndex: '0x80',
                            name: '',
                            fields: {
                                secondsPastEpoch: { typeIndex: '0x23' },
                                nanoseconds: { typeIndex: '0x22' },
                                userTag: { typeIndex: '0x22' }
                            }
                        },
                        display: {
                            id: 4,
                            typeIndex: '0x80',
                            name: '',
                            fields: {
                                limitLow: { typeIndex: '0x43' },
                                limitHigh: { typeIndex: '0x43' },
                                description: { typeIndex: '0x60' },
                                units: { typeIndex: '0x60' },
                                precision: { typeIndex: '0x22' },
                                form: {
                                    id: 5,
                                    typeIndex: '0x80',
                                    name: 'enum_t',
                                    fields: { index: { typeIndex: '0x22' }, choices: { typeIndex: '0x68' } }
                                }
                            }
                        },
                        control: {
                            id: 6,
                            typeIndex: '0x80',
                            name: 'control_t',
                            fields: {
                                limitLow: { typeIndex: '0x43' },
                                limitHigh: { typeIndex: '0x43' },
                                minStep: { typeIndex: '0x43' }
                            }
                        },
                        valueAlarm: {
                            id: 7,
                            typeIndex: '0x80',
                            name: 'valueAlarm_t',
                            fields: {
                                active: { typeIndex: '0x0' },
                                lowAlarmLimit: { typeIndex: '0x43' },
                                lowWarningLimit: { typeIndex: '0x43' },
                                highWarningLimit: { typeIndex: '0x43' },
                                highAlarmLimit: { typeIndex: '0x43' },
                                lowAlarmSeverity: { typeIndex: '0x22' },
                                lowWarningSeverity: { typeIndex: '0x22' },
                                highWarningSeverity: { typeIndex: '0x22' },
                                highAlarmSeverity: { typeIndex: '0x22' },
                                hysteresis: { typeIndex: '0x20' }
                            }
                        }
                    }
                }
            )

        })


        it("failed case, epics:nt/NTScalar:1.0, from pvget -- number of fields too long", () => {
            const bufferArray = [0xfd, 0x1, 0x0, 0x81, 0x15, 0x65, 0x70, 0x69, 0x63, 0x73, 0x3a, 0x6e, 0x74, 0x2f, 0x4e, 0x54, 0x53, 0x63, 0x61, 0x6c, 0x61, 0x72, 0x3a, 0x31, 0x2e, 0x30, 0x8, 0x5, 0x76, 0x61, 0x6c, 0x75, 0x65, 0x43, 0x5, 0x61, 0x6c, 0x61, 0x72, 0x6d, 0xfd, 0x2, 0x0, 0x80, 0x7, 0x61, 0x6c, 0x61, 0x72, 0x6d, 0x5f, 0x74, 0x3, 0x8, 0x73, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0x6, 0x73, 0x74, 0x61, 0x74, 0x75, 0x73, 0x22, 0x7, 0x6d, 0x65, 0x73, 0x73, 0x61, 0x67, 0x65, 0x60, 0x9, 0x74, 0x69, 0x6d, 0x65, 0x53, 0x74, 0x61, 0x6d, 0x70, 0xfd, 0x3, 0x0, 0x80, 0x0, 0x3, 0x10, 0x73, 0x65, 0x63, 0x6f, 0x6e, 0x64, 0x73, 0x50, 0x61, 0x73, 0x74, 0x45, 0x70, 0x6f, 0x63, 0x68, 0x23, 0xb, 0x6e, 0x61, 0x6e, 0x6f, 0x73, 0x65, 0x63, 0x6f, 0x6e, 0x64, 0x73, 0x22, 0x7, 0x75, 0x73, 0x65, 0x72, 0x54, 0x61, 0x67, 0x22, 0x7, 0x64, 0x69, 0x73, 0x70, 0x6c, 0x61, 0x79, 0xfd, 0x4, 0x0, 0x80, 0x0, 0x6, 0x8, 0x6c, 0x69, 0x6d, 0x69, 0x74, 0x4c, 0x6f, 0x77, 0x43, 0x9, 0x6c, 0x69, 0x6d, 0x69, 0x74, 0x48, 0x69, 0x67, 0x68, 0x43, 0xb, 0x64, 0x65, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x69, 0x6f, 0x6e, 0x60, 0x5, 0x75, 0x6e, 0x69, 0x74, 0x73, 0x60, 0x9, 0x70, 0x72, 0x65, 0x63, 0x69, 0x73, 0x69, 0x6f, 0x6e, 0x22, 0x4, 0x66, 0x6f, 0x72, 0x6d, 0xfd, 0x5, 0x0, 0x80, 0x6, 0x65, 0x6e, 0x75, 0x6d, 0x5f, 0x74, 0x2, 0x5, 0x69, 0x6e, 0x64, 0x65, 0x78, 0x22, 0x7, 0x63, 0x68, 0x6f, 0x69, 0x63, 0x65, 0x73, 0x68, 0x7, 0x63, 0x6f, 0x6e, 0x74, 0x72, 0x6f, 0x6c, 0xfd, 0x6, 0x0, 0x80, 0x9, 0x63, 0x6f, 0x6e, 0x74, 0x72, 0x6f, 0x6c, 0x5f, 0x74, 0x3, 0x8, 0x6c, 0x69, 0x6d, 0x69, 0x74, 0x4c, 0x6f, 0x77, 0x43, 0x9, 0x6c, 0x69, 0x6d, 0x69, 0x74, 0x48, 0x69, 0x67, 0x68, 0x43, 0x7, 0x6d, 0x69, 0x6e, 0x53, 0x74, 0x65, 0x70, 0x43, 0xa, 0x76, 0x61, 0x6c, 0x75, 0x65, 0x41, 0x6c, 0x61, 0x72, 0x6d, 0xfd, 0x7, 0x0, 0x80, 0xc, 0x76, 0x61, 0x6c, 0x75, 0x65, 0x41, 0x6c, 0x61, 0x72, 0x6d, 0x5f, 0x74, 0xa, 0x6, 0x61, 0x63, 0x74, 0x69, 0x76, 0x65, 0x0, 0xd, 0x6c, 0x6f, 0x77, 0x41, 0x6c, 0x61, 0x72, 0x6d, 0x4c, 0x69, 0x6d, 0x69, 0x74, 0x43, 0xf, 0x6c, 0x6f, 0x77, 0x57, 0x61, 0x72, 0x6e, 0x69, 0x6e, 0x67, 0x4c, 0x69, 0x6d, 0x69, 0x74, 0x43, 0x10, 0x68, 0x69, 0x67, 0x68, 0x57, 0x61, 0x72, 0x6e, 0x69, 0x6e, 0x67, 0x4c, 0x69, 0x6d, 0x69, 0x74, 0x43, 0xe, 0x68, 0x69, 0x67, 0x68, 0x41, 0x6c, 0x61, 0x72, 0x6d, 0x4c, 0x69, 0x6d, 0x69, 0x74, 0x43, 0x10, 0x6c, 0x6f, 0x77, 0x41, 0x6c, 0x61, 0x72, 0x6d, 0x53, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0x12, 0x6c, 0x6f, 0x77, 0x57, 0x61, 0x72, 0x6e, 0x69, 0x6e, 0x67, 0x53, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0x13, 0x68, 0x69, 0x67, 0x68, 0x57, 0x61, 0x72, 0x6e, 0x69, 0x6e, 0x67, 0x53, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0x11, 0x68, 0x69, 0x67, 0x68, 0x41, 0x6c, 0x61, 0x72, 0x6d, 0x53, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0xa, 0x68, 0x79, 0x73, 0x74, 0x65, 0x72, 0x65, 0x73, 0x69, 0x73, 0x20];
            //                                                                                                                                                                              ^ should be 7
            const buffer = Buffer.from(bufferArray);
            expect(() => { decodeType(buffer, 0, ENDIAN.LITTLE); }).toThrow();

        })

        it("empty union with empty name", () => {
            const bufferArray = [0x81, 0x00, 0x00];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = decodeType(buffer, 0, endian);
            expect(result).toEqual({
                typeIndex: "0x81",
                name: "",
                fields: {}
            })
        })

        it("failed case -- empty union with empty name, but miss field number", () => {
            const bufferArray = [0x81, 0x00]; // <-- number of fields missing
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            expect(() => { decodeType(buffer, 0, endian) }).toThrow();
        })

        it("failed case -- name encoding wrong, causing following fields cannot be decoded", () => {
            const bufferArray = [0x81, 0x01, 0x31, 0x32, 0x00];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            expect(() => { decodeType(buffer, 0, endian) }).toThrow();
        })
    })

    describe("complex_scalar_structure, 0x80", () => {
        it("PV Access protocol: Example 1, page 17", () => {

            const bufferArray = [0xFD, 0x00, 0x01, 0x80, 0x0B, 0x74, 0x69, 0x6D, 0x65, 0x53, 0x74, 0x61, 0x6D, 0x70, 0x5F, 0x74,
                0x03, 0x10, 0x73, 0x65, 0x63, 0x6F, 0x6E, 0x64, 0x73, 0x50, 0x61, 0x73, 0x74, 0x45, 0x70, 0x6F,
                0x63, 0x68, 0x23, 0x0B, 0x6E, 0x61, 0x6E, 0x6F, 0x53, 0x65, 0x63, 0x6F, 0x6E, 0x64, 0x73, 0x22,
                0x07, 0x75, 0x73, 0x65, 0x72, 0x54, 0x61, 0x67, 0x22];
            const buffer = Buffer.from(bufferArray);
            const result = decodeType(buffer, 0, ENDIAN.BIG);
            expect(result).toEqual({
                id: 1,
                typeIndex: '0x80',
                name: 'timeStamp_t',
                fields: {
                    secondsPastEpoch: { typeIndex: '0x23' },
                    nanoSeconds: { typeIndex: '0x22' },
                    userTag: { typeIndex: '0x22' }
                }
            })
        })

        it("PV Access protocol: Example 2, page 17", () => {

            let bufferArray = [0xFD, 0x00, 0x01, 0x80, 0x10, 0x65, 0x78, 0x61, 0x6D, 0x70, 0x6C, 0x65, 0x53, 0x74, 0x72, 0x75,
                0x63, 0x74, 0x75, 0x72, 0x65, 0x07, 0x05, 0x76, 0x61, 0x6C, 0x75, 0x65, 0x28, 0x10, 0x62, 0x6F,
                0x75, 0x6E, 0x64, 0x65, 0x64, 0x53, 0x69, 0x7A, 0x65, 0x41, 0x72, 0x72, 0x61, 0x79, 0x30, 0x10,
                0x0E, 0x66, 0x69, 0x78, 0x65, 0x64, 0x53, 0x69, 0x7A, 0x65, 0x41, 0x72, 0x72, 0x61, 0x79, 0x38,
                0x04, 0x09, 0x74, 0x69, 0x6D, 0x65, 0x53, 0x74, 0x61, 0x6D, 0x70, 0xFD, 0x00, 0x02, 0x80, 0x06,
                0x74, 0x69, 0x6D, 0x65, 0x5F, 0x74, 0x03, 0x10, 0x73, 0x65, 0x63, 0x6F, 0x6E, 0x64, 0x73, 0x50,
                0x61, 0x73, 0x74, 0x45, 0x70, 0x6F, 0x63, 0x68, 0x23, 0x0B, 0x6E, 0x61, 0x6E, 0x6F, 0x73, 0x65,
                0x63, 0x6F, 0x6E, 0x64, 0x73, 0x22, 0x07, 0x75, 0x73, 0x65, 0x72, 0x54, 0x61, 0x67, 0x22, 0x05,
                0x61, 0x6C, 0x61, 0x72, 0x6D, 0xFD, 0x00, 0x03, 0x80, 0x07, 0x61, 0x6C, 0x61, 0x72, 0x6D, 0x5F,
                0x74, 0x03, 0x08, 0x73, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0x06, 0x73, 0x74, 0x61,
                0x74, 0x75, 0x73, 0x22, 0x07, 0x6D, 0x65, 0x73, 0x73, 0x61, 0x67, 0x65, 0x60, 0x0A, 0x76, 0x61,
                0x6C, 0x75, 0x65, 0x55, 0x6E, 0x69, 0x6F, 0x6E, 0xFD, 0x00, 0x04, 0x81, 0x00, 0x03, 0x0B, 0x73,
                0x74, 0x72, 0x69, 0x6E, 0x67, 0x56, 0x61, 0x6C, 0x75, 0x65, 0x60, 0x08, 0x69, 0x6E, 0x74, 0x56,
                0x61, 0x6C, 0x75, 0x65, 0x22, 0x0B, 0x64, 0x6F, 0x75, 0x62, 0x6C, 0x65, 0x56, 0x61, 0x6C, 0x75,
                0x65, 0x43, 0x0C, 0x76, 0x61, 0x72, 0x69, 0x61, 0x6E, 0x74, 0x55, 0x6E, 0x69, 0x6F, 0x6E, 0xFD,
                0x00, 0x05, 0x82];
            const buffer = Buffer.from(bufferArray);
            const result = decodeType(buffer, 0, ENDIAN.BIG);
            expect(result).toEqual(
                {
                    id: 1,
                    typeIndex: '0x80',
                    name: 'exampleStructure',
                    fields: {
                        value: { typeIndex: '0x28' },
                        boundedSizeArray: { typeIndex: '0x30', size: 16 },
                        fixedSizeArray: { typeIndex: '0x38', size: 4 },
                        timeStamp: {
                            id: 2,
                            typeIndex: '0x80',
                            name: 'time_t',
                            fields: {
                                secondsPastEpoch: { typeIndex: '0x23' },
                                nanoseconds: { typeIndex: '0x22' },
                                userTag: { typeIndex: '0x22' }
                            }
                        },
                        alarm: {
                            id: 3,
                            typeIndex: '0x80',
                            name: 'alarm_t',
                            fields: {
                                severity: { typeIndex: '0x22' },
                                status: { typeIndex: '0x22' },
                                message: { typeIndex: '0x60' }
                            }
                        },
                        valueUnion: {
                            id: 4,
                            typeIndex: '0x81',
                            name: '',
                            fields: {
                                stringValue: { typeIndex: '0x60' },
                                intValue: { typeIndex: '0x22' },
                                doubleValue: { typeIndex: '0x43' }
                            }
                        },
                        variantUnion: { id: 5, typeIndex: '0x82' }
                    }
                }
            )
        })


        it("NTNDArray: https://docs.epics-controls.org/en/latest/pv-access/Normative-Types-Specification.html#ntndarray", () => {

            const bufferArray = [
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
            ];
            const buffer = Buffer.from(bufferArray);
            const result = decodeType(buffer, 0, ENDIAN.LITTLE);

            expect(result).toEqual(
                {
                    id: 1,
                    typeIndex: '0x80',
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
                }
            );
        })

        it("epics:nt/NTScalar:1.0, from pvget", () => {
            const bufferArray = [0xfd, 0x1, 0x0, 0x80, 0x15, 0x65, 0x70, 0x69, 0x63, 0x73, 0x3a, 0x6e, 0x74, 0x2f, 0x4e, 0x54, 0x53, 0x63, 0x61, 0x6c, 0x61, 0x72, 0x3a, 0x31, 0x2e, 0x30, 0x6, 0x5, 0x76, 0x61, 0x6c, 0x75, 0x65, 0x43, 0x5, 0x61, 0x6c, 0x61, 0x72, 0x6d, 0xfd, 0x2, 0x0, 0x80, 0x7, 0x61, 0x6c, 0x61, 0x72, 0x6d, 0x5f, 0x74, 0x3, 0x8, 0x73, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0x6, 0x73, 0x74, 0x61, 0x74, 0x75, 0x73, 0x22, 0x7, 0x6d, 0x65, 0x73, 0x73, 0x61, 0x67, 0x65, 0x60, 0x9, 0x74, 0x69, 0x6d, 0x65, 0x53, 0x74, 0x61, 0x6d, 0x70, 0xfd, 0x3, 0x0, 0x80, 0x0, 0x3, 0x10, 0x73, 0x65, 0x63, 0x6f, 0x6e, 0x64, 0x73, 0x50, 0x61, 0x73, 0x74, 0x45, 0x70, 0x6f, 0x63, 0x68, 0x23, 0xb, 0x6e, 0x61, 0x6e, 0x6f, 0x73, 0x65, 0x63, 0x6f, 0x6e, 0x64, 0x73, 0x22, 0x7, 0x75, 0x73, 0x65, 0x72, 0x54, 0x61, 0x67, 0x22, 0x7, 0x64, 0x69, 0x73, 0x70, 0x6c, 0x61, 0x79, 0xfd, 0x4, 0x0, 0x80, 0x0, 0x6, 0x8, 0x6c, 0x69, 0x6d, 0x69, 0x74, 0x4c, 0x6f, 0x77, 0x43, 0x9, 0x6c, 0x69, 0x6d, 0x69, 0x74, 0x48, 0x69, 0x67, 0x68, 0x43, 0xb, 0x64, 0x65, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x69, 0x6f, 0x6e, 0x60, 0x5, 0x75, 0x6e, 0x69, 0x74, 0x73, 0x60, 0x9, 0x70, 0x72, 0x65, 0x63, 0x69, 0x73, 0x69, 0x6f, 0x6e, 0x22, 0x4, 0x66, 0x6f, 0x72, 0x6d, 0xfd, 0x5, 0x0, 0x80, 0x6, 0x65, 0x6e, 0x75, 0x6d, 0x5f, 0x74, 0x2, 0x5, 0x69, 0x6e, 0x64, 0x65, 0x78, 0x22, 0x7, 0x63, 0x68, 0x6f, 0x69, 0x63, 0x65, 0x73, 0x68, 0x7, 0x63, 0x6f, 0x6e, 0x74, 0x72, 0x6f, 0x6c, 0xfd, 0x6, 0x0, 0x80, 0x9, 0x63, 0x6f, 0x6e, 0x74, 0x72, 0x6f, 0x6c, 0x5f, 0x74, 0x3, 0x8, 0x6c, 0x69, 0x6d, 0x69, 0x74, 0x4c, 0x6f, 0x77, 0x43, 0x9, 0x6c, 0x69, 0x6d, 0x69, 0x74, 0x48, 0x69, 0x67, 0x68, 0x43, 0x7, 0x6d, 0x69, 0x6e, 0x53, 0x74, 0x65, 0x70, 0x43, 0xa, 0x76, 0x61, 0x6c, 0x75, 0x65, 0x41, 0x6c, 0x61, 0x72, 0x6d, 0xfd, 0x7, 0x0, 0x80, 0xc, 0x76, 0x61, 0x6c, 0x75, 0x65, 0x41, 0x6c, 0x61, 0x72, 0x6d, 0x5f, 0x74, 0xa, 0x6, 0x61, 0x63, 0x74, 0x69, 0x76, 0x65, 0x0, 0xd, 0x6c, 0x6f, 0x77, 0x41, 0x6c, 0x61, 0x72, 0x6d, 0x4c, 0x69, 0x6d, 0x69, 0x74, 0x43, 0xf, 0x6c, 0x6f, 0x77, 0x57, 0x61, 0x72, 0x6e, 0x69, 0x6e, 0x67, 0x4c, 0x69, 0x6d, 0x69, 0x74, 0x43, 0x10, 0x68, 0x69, 0x67, 0x68, 0x57, 0x61, 0x72, 0x6e, 0x69, 0x6e, 0x67, 0x4c, 0x69, 0x6d, 0x69, 0x74, 0x43, 0xe, 0x68, 0x69, 0x67, 0x68, 0x41, 0x6c, 0x61, 0x72, 0x6d, 0x4c, 0x69, 0x6d, 0x69, 0x74, 0x43, 0x10, 0x6c, 0x6f, 0x77, 0x41, 0x6c, 0x61, 0x72, 0x6d, 0x53, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0x12, 0x6c, 0x6f, 0x77, 0x57, 0x61, 0x72, 0x6e, 0x69, 0x6e, 0x67, 0x53, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0x13, 0x68, 0x69, 0x67, 0x68, 0x57, 0x61, 0x72, 0x6e, 0x69, 0x6e, 0x67, 0x53, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0x11, 0x68, 0x69, 0x67, 0x68, 0x41, 0x6c, 0x61, 0x72, 0x6d, 0x53, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0xa, 0x68, 0x79, 0x73, 0x74, 0x65, 0x72, 0x65, 0x73, 0x69, 0x73, 0x20];
            const buffer = Buffer.from(bufferArray);
            const result = decodeType(buffer, 0, ENDIAN.LITTLE);
            expect(result).toEqual(
                {
                    id: 1,
                    typeIndex: '0x80',
                    name: 'epics:nt/NTScalar:1.0',
                    fields: {
                        value: { typeIndex: '0x43' },
                        alarm: {
                            id: 2,
                            typeIndex: '0x80',
                            name: 'alarm_t',
                            fields: {
                                severity: { typeIndex: '0x22' },
                                status: { typeIndex: '0x22' },
                                message: { typeIndex: '0x60' }
                            }
                        },
                        timeStamp: {
                            id: 3,
                            typeIndex: '0x80',
                            name: '',
                            fields: {
                                secondsPastEpoch: { typeIndex: '0x23' },
                                nanoseconds: { typeIndex: '0x22' },
                                userTag: { typeIndex: '0x22' }
                            }
                        },
                        display: {
                            id: 4,
                            typeIndex: '0x80',
                            name: '',
                            fields: {
                                limitLow: { typeIndex: '0x43' },
                                limitHigh: { typeIndex: '0x43' },
                                description: { typeIndex: '0x60' },
                                units: { typeIndex: '0x60' },
                                precision: { typeIndex: '0x22' },
                                form: {
                                    id: 5,
                                    typeIndex: '0x80',
                                    name: 'enum_t',
                                    fields: { index: { typeIndex: '0x22' }, choices: { typeIndex: '0x68' } }
                                }
                            }
                        },
                        control: {
                            id: 6,
                            typeIndex: '0x80',
                            name: 'control_t',
                            fields: {
                                limitLow: { typeIndex: '0x43' },
                                limitHigh: { typeIndex: '0x43' },
                                minStep: { typeIndex: '0x43' }
                            }
                        },
                        valueAlarm: {
                            id: 7,
                            typeIndex: '0x80',
                            name: 'valueAlarm_t',
                            fields: {
                                active: { typeIndex: '0x0' },
                                lowAlarmLimit: { typeIndex: '0x43' },
                                lowWarningLimit: { typeIndex: '0x43' },
                                highWarningLimit: { typeIndex: '0x43' },
                                highAlarmLimit: { typeIndex: '0x43' },
                                lowAlarmSeverity: { typeIndex: '0x22' },
                                lowWarningSeverity: { typeIndex: '0x22' },
                                highWarningSeverity: { typeIndex: '0x22' },
                                highAlarmSeverity: { typeIndex: '0x22' },
                                hysteresis: { typeIndex: '0x20' }
                            }
                        }
                    }
                }
            )

        })

        it("empty struct with empty name", () => {
            const bufferArray = [0x80, 0x00, 0x00];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = decodeType(buffer, 0, endian);
            expect(result).toEqual({
                typeIndex: "0x80",
                name: "",
                fields: {}
            })
        })

        it("failed case -- empty struct with empty name, but miss field number", () => {
            const bufferArray = [0x80, 0x00]; // <-- number of fields missing
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            expect(() => { decodeType(buffer, 0, endian) }).toThrow();
        })

        it("failed case -- name encoding wrong, causing following fields cannot be decoded", () => {
            const bufferArray = [0x80, 0x01, 0x31, 0x32, 0x00];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            expect(() => { decodeType(buffer, 0, endian) }).toThrow();
        })

        it("decode a pv request -- `pvget -r proton_charge`", () => {
            const bufferArray = [
                // 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x08, 
                0xFD, 0x01, 0x00, 0x80, 0x00, 0x01, 0x05,
                0x66, 0x69, 0x65, 0x6C, 0x64, 0xFD, 0x02, 0x00, 0x80, 0x00, 0x01, 0x0D, 0x70, 0x72, 0x6F, 0x74,
                0x6F, 0x6E, 0x5F, 0x63, 0x68, 0x61, 0x72, 0x67, 0x65, 0xFD, 0x03, 0x00, 0x80, 0x00, 0x00,];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.LITTLE;
            const result = decodeType(buffer, 0, endian);

            expect(result).toEqual(
                {
                    typeIndex: '0x80',
                    id: 1,
                    name: '',
                    fields: {
                        field: {
                            typeIndex: '0x80',
                            id: 2,
                            name: '',
                            fields: {
                                proton_charge: { typeIndex: '0x80', id: 3, name: '', fields: {} },
                            }
                        }
                    }
                }
            )
        })


        it("decode a pv request -- `pvget -r 'proton_charge,pixel`, `pvget -r 'field(proton_charge,pixel)`", () => {
            const bufferArray = [
                // 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x08, 
                0xFD, 0x01, 0x00, 0x80, 0x00, 0x01, 0x05,
                0x66, 0x69, 0x65, 0x6C, 0x64, 0xFD, 0x02, 0x00, 0x80, 0x00, 0x02, 0x0D, 0x70, 0x72, 0x6F, 0x74,
                0x6F, 0x6E, 0x5F, 0x63, 0x68, 0x61, 0x72, 0x67, 0x65, 0xFD, 0x03, 0x00, 0x80, 0x00, 0x00, 0x05,
                0x70, 0x69, 0x78, 0x65, 0x6C, 0xFE, 0x03, 0x00];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.LITTLE;
            const result = decodeType(buffer, 0, endian);

            expect(result).toEqual(
                {
                    typeIndex: '0x80',
                    id: 1,
                    name: '',
                    fields: {
                        field: {
                            typeIndex: '0x80',
                            id: 2,
                            name: '',
                            fields: {
                                proton_charge: { typeIndex: '0x80', id: 3, name: '', fields: {} },
                                pixel: { typeIndex: '0x80', id: 3, name: '', fields: {} }
                            }
                        }
                    }
                }
            )
        })

        it("decode a pv request -- `pvget -r 'field(proton_charge,pixel,timeStamp.userTag)' neutrons`", () => {
            const bufferArray = [
                // 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x08, 
                0xFD, 0x01, 0x00, 0x80, 0x00, 0x01, 0x05,
                0x66, 0x69, 0x65, 0x6C, 0x64, 0xFD, 0x02, 0x00, 0x80, 0x00, 0x03, 0x0D, 0x70, 0x72, 0x6F, 0x74,
                0x6F, 0x6E, 0x5F, 0x63, 0x68, 0x61, 0x72, 0x67, 0x65, 0xFD, 0x03, 0x00, 0x80, 0x00, 0x00, 0x05,
                0x70, 0x69, 0x78, 0x65, 0x6C, 0xFE, 0x03, 0x00, 0x09, 0x74, 0x69, 0x6D, 0x65, 0x53, 0x74, 0x61,
                0x6D, 0x70, 0xFD, 0x04, 0x00, 0x80, 0x00, 0x01, 0x07, 0x75, 0x73, 0x65, 0x72, 0x54, 0x61, 0x67,
                0xFE, 0x03, 0x00,];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.LITTLE;
            const result = decodeType(buffer, 0, endian);

            expect(result).toEqual(
                {
                    typeIndex: '0x80',
                    id: 1,
                    name: '',
                    fields: {
                        field: {
                            typeIndex: '0x80',
                            id: 2,
                            name: '',
                            fields: {
                                proton_charge: { typeIndex: '0x80', id: 3, name: '', fields: {} },
                                pixel: { typeIndex: '0x80', id: 3, name: '', fields: {} },
                                timeStamp: {
                                    typeIndex: '0x80', id: 4, name: '', fields: {
                                        userTag: { typeIndex: '0x80', id: 3, name: '', fields: {} }
                                    }
                                }
                            }
                        }
                    }
                }
            )
        })

        it(`decode a pv request -- pvmonitor  "-r record[pipeline:1]field(value)" demo`, () => {
            const bufferArray = [
                // 0xCA, 0x02, 0x80, 0x0D, 0x00, 0x00, 0x00, 0x56, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
                // 0x88, 
                0xFD, 0x00, 0x02, 0x80, 0x00, 0x02, 0x06, 0x72, 0x65, 0x63, 0x6F, 0x72, 0x64, 0xFD, 0x00,
                0x03, 0x80, 0x00, 0x01, 0x08, 0x5F, 0x6F, 0x70, 0x74, 0x69, 0x6F, 0x6E, 0x73, 0xFD, 0x00, 0x04,
                0x80, 0x00, 0x01, 0x08, 0x70, 0x69, 0x70, 0x65, 0x6C, 0x69, 0x6E, 0x65, 0x60, 0x05, 0x66, 0x69,
                0x65, 0x6C, 0x64, 0xFD, 0x00, 0x05, 0x80, 0x00, 0x01, 0x05, 0x76, 0x61, 0x6C, 0x75, 0x65, 0xFD,
                0x00, 0x06, 0x80, 0x00, 0x00,
                // 0x04, 0x74, 0x72, 0x75, 0x65, 0x00, 0x00, 0x00, 0x02,
            ];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = decodeType(buffer, 0, endian);

            expect(result).toEqual(
                {
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
                }
            )
        })


    })

    describe("string_fixedSizeArray, 0x78", () => {
        it("normal case", () => {
            const bufferArray = [0x78, 0x02];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = decodeType(buffer, 0, endian);
            expect(result).toEqual({
                typeIndex: "0x78",
                size: 2
            });
        })

        it("normal case -- 0 size", () => {
            const bufferArray = [0x78, 0x00];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = decodeType(buffer, 0, endian);
            expect(result).toEqual({
                typeIndex: "0x78",
                size: 0
            });
        })


        it("normal case -- large size", () => {
            const bufferArray = [0x78, 0xff, 0x12, 0x34, 0x56, 0x78];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = decodeType(buffer, 0, endian);
            expect(result).toEqual({
                typeIndex: "0x78",
                size: 0x12345678
            });
        })

        it("failed case -- missing size", () => {
            const bufferArray = [0x78];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            expect(() => { decodeType(buffer, 0, endian) }).toThrow();
        })
    })

    describe("string_boundedSizeArray, 0x70 -- it is similar to string_fixedSizeArray, 0x78", () => {

        it("normal case", () => {
            const bufferArray = [0x70, 0x02];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = decodeType(buffer, 0, endian);
            expect(result).toEqual({
                typeIndex: "0x70",
                size: 2
            });
        })

        it("normal case -- 0 size", () => {
            const bufferArray = [0x70, 0x00];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = decodeType(buffer, 0, endian);
            expect(result).toEqual({
                typeIndex: "0x70",
                size: 0
            });
        })


        it("normal case -- large size", () => {
            const bufferArray = [0x70, 0xff, 0x12, 0x34, 0x56, 0x78];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = decodeType(buffer, 0, endian);
            expect(result).toEqual({
                typeIndex: "0x70",
                size: 0x12345678
            });
        })

        it("failed case -- missing size", () => {
            const bufferArray = [0x70];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            expect(() => { decodeType(buffer, 0, endian) }).toThrow();
        })
    })

    describe("string_variableSizeArray, 0x68", () => {

        it("normal case -- large size", () => {
            const bufferArray = [0x68];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = decodeType(buffer, 0, endian);
            expect(result).toEqual({
                typeIndex: "0x68",
            });
        })

        it("normal case -- with an ID and a TAG", () => {
            const bufferArray = [0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x68];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = decodeType(buffer, 0, endian);
            expect(result).toEqual({
                typeIndex: "0x68",
                id: 0x01,
                tag: 0x01,
            });
        })
    })

    describe("string_scalar, 0x60", () => {

        it("normal case", () => {
            const bufferArray = [0x60];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = decodeType(buffer, 0, endian);
            expect(result).toEqual({
                typeIndex: "0x60",
            });
        })

        it("normal case -- with an ID and a TAG", () => {
            const bufferArray = [0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x60];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = decodeType(buffer, 0, endian);
            expect(result).toEqual({
                typeIndex: "0x60",
                id: 0x01,
                tag: 0x01,
            });
        })

    })


    describe("number fixed/bounded size array, 0x5b/5a,53/52/3f--30/", () => {
        it("normal case", () => {
            const bufferArray = [
                0x5b, 0x05,
                0x5a, 0x05,
                0x3f, 0x05,
                0x3e, 0x05,
                0x3d, 0x05,
                0x3c, 0x05,
                0x3b, 0x05,
                0x3a, 0x05,
                0x39, 0x05,
                0x38, 0x05,
                0x37, 0x05,
                0x36, 0x05,
                0x35, 0x05,
                0x34, 0x05,
                0x33, 0x05,
                0x32, 0x05,
                0x31, 0x05,
                0x30, 0x05,
            ];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const results: any[] = [];
            let offset = 0;
            for (let ii = 0; ii < 18; ii++) {
                const result = decodeType(buffer, offset, endian);
                offset = getDecodingTypeNewOffset();
                results.push(result)
            }
            expect(results).toEqual([
                { typeIndex: "0x5b", size: 0x05 },
                { typeIndex: "0x5a", size: 0x05 },
                { typeIndex: "0x3f", size: 0x05 },
                { typeIndex: "0x3e", size: 0x05 },
                { typeIndex: "0x3d", size: 0x05 },
                { typeIndex: "0x3c", size: 0x05 },
                { typeIndex: "0x3b", size: 0x05 },
                { typeIndex: "0x3a", size: 0x05 },
                { typeIndex: "0x39", size: 0x05 },
                { typeIndex: "0x38", size: 0x05 },
                { typeIndex: "0x37", size: 0x05 },
                { typeIndex: "0x36", size: 0x05 },
                { typeIndex: "0x35", size: 0x05 },
                { typeIndex: "0x34", size: 0x05 },
                { typeIndex: "0x33", size: 0x05 },
                { typeIndex: "0x32", size: 0x05 },
                { typeIndex: "0x31", size: 0x05 },
                { typeIndex: "0x30", size: 0x05 },
            ])
        });

        it("normal case -- with ID and TAG", () => {
            const bufferArray = [
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x5b, 0x05,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x5a, 0x05,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x3f, 0x05,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x3e, 0x05,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x3d, 0x05,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x3c, 0x05,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x3b, 0x05,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x3a, 0x05,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x39, 0x05,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x38, 0x05,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x37, 0x05,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x36, 0x05,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x35, 0x05,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x34, 0x05,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x33, 0x05,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x32, 0x05,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x31, 0x05,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x30, 0x05,
            ];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const results: any[] = [];
            let offset = 0;
            for (let ii = 0; ii < 18; ii++) {
                const result = decodeType(buffer, offset, endian);
                offset = getDecodingTypeNewOffset();
                results.push(result)
            }
            expect(results).toEqual([
                { typeIndex: "0x5b", id: 0x01, tag: 0x03, size: 0x05 },
                { typeIndex: "0x5a", id: 0x01, tag: 0x03, size: 0x05 },
                { typeIndex: "0x3f", id: 0x01, tag: 0x03, size: 0x05 },
                { typeIndex: "0x3e", id: 0x01, tag: 0x03, size: 0x05 },
                { typeIndex: "0x3d", id: 0x01, tag: 0x03, size: 0x05 },
                { typeIndex: "0x3c", id: 0x01, tag: 0x03, size: 0x05 },
                { typeIndex: "0x3b", id: 0x01, tag: 0x03, size: 0x05 },
                { typeIndex: "0x3a", id: 0x01, tag: 0x03, size: 0x05 },
                { typeIndex: "0x39", id: 0x01, tag: 0x03, size: 0x05 },
                { typeIndex: "0x38", id: 0x01, tag: 0x03, size: 0x05 },
                { typeIndex: "0x37", id: 0x01, tag: 0x03, size: 0x05 },
                { typeIndex: "0x36", id: 0x01, tag: 0x03, size: 0x05 },
                { typeIndex: "0x35", id: 0x01, tag: 0x03, size: 0x05 },
                { typeIndex: "0x34", id: 0x01, tag: 0x03, size: 0x05 },
                { typeIndex: "0x33", id: 0x01, tag: 0x03, size: 0x05 },
                { typeIndex: "0x32", id: 0x01, tag: 0x03, size: 0x05 },
                { typeIndex: "0x31", id: 0x01, tag: 0x03, size: 0x05 },
                { typeIndex: "0x30", id: 0x01, tag: 0x03, size: 0x05 },
            ])
        });

        it("normal case -- large size", () => {
            const bufferArray = [
                0x5b, 0xff, 0x12, 0x34, 0x56, 0x78,
                0x5a, 0xff, 0x12, 0x34, 0x56, 0x78,
                0x3f, 0xff, 0x12, 0x34, 0x56, 0x78,
                0x3e, 0xff, 0x12, 0x34, 0x56, 0x78,
                0x3d, 0xff, 0x12, 0x34, 0x56, 0x78,
                0x3c, 0xff, 0x12, 0x34, 0x56, 0x78,
                0x3b, 0xff, 0x12, 0x34, 0x56, 0x78,
                0x3a, 0xff, 0x12, 0x34, 0x56, 0x78,
                0x39, 0xff, 0x12, 0x34, 0x56, 0x78,
                0x38, 0xff, 0x12, 0x34, 0x56, 0x78,
                0x37, 0xff, 0x12, 0x34, 0x56, 0x78,
                0x36, 0xff, 0x12, 0x34, 0x56, 0x78,
                0x35, 0xff, 0x12, 0x34, 0x56, 0x78,
                0x34, 0xff, 0x12, 0x34, 0x56, 0x78,
                0x33, 0xff, 0x12, 0x34, 0x56, 0x78,
                0x32, 0xff, 0x12, 0x34, 0x56, 0x78,
                0x31, 0xff, 0x12, 0x34, 0x56, 0x78,
                0x30, 0xff, 0x12, 0x34, 0x56, 0x78,
            ];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const results: any[] = [];
            let offset = 0;
            for (let ii = 0; ii < 18; ii++) {
                const result = decodeType(buffer, offset, endian);
                offset = getDecodingTypeNewOffset();
                results.push(result)
            }
            expect(results).toEqual([
                { typeIndex: "0x5b", size: 0x12345678 },
                { typeIndex: "0x5a", size: 0x12345678 },
                { typeIndex: "0x3f", size: 0x12345678 },
                { typeIndex: "0x3e", size: 0x12345678 },
                { typeIndex: "0x3d", size: 0x12345678 },
                { typeIndex: "0x3c", size: 0x12345678 },
                { typeIndex: "0x3b", size: 0x12345678 },
                { typeIndex: "0x3a", size: 0x12345678 },
                { typeIndex: "0x39", size: 0x12345678 },
                { typeIndex: "0x38", size: 0x12345678 },
                { typeIndex: "0x37", size: 0x12345678 },
                { typeIndex: "0x36", size: 0x12345678 },
                { typeIndex: "0x35", size: 0x12345678 },
                { typeIndex: "0x34", size: 0x12345678 },
                { typeIndex: "0x33", size: 0x12345678 },
                { typeIndex: "0x32", size: 0x12345678 },
                { typeIndex: "0x31", size: 0x12345678 },
                { typeIndex: "0x30", size: 0x12345678 },
            ])
        });

        it("failed case -- size missing in Buffer", () => {
            const bufferArray = [
                0x5b,
                0x5a,
                0x3f,
                0x3e,
                0x3d,
                0x3c,
                0x3b,
                0x3a,
                0x39,
                0x38,
                0x37,
                0x36,
                0x35,
                0x34,
                0x33,
                0x32,
                0x31,
                0x30,
            ];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;

            expect(() => {
                const results: any[] = [];
                let offset = 0;
                for (let ii = 0; ii < 18; ii++) {
                    const result = decodeType(buffer, offset, endian);
                    offset = getDecodingTypeNewOffset();
                    results.push(result)
                }
            }).toThrow();
        });

        it("failed case -- size encoding wrong", () => {
            const bufferArray = [
                0x5b, 0xff, 0x99, 0x00, 0x00, 0x00, // size shoudl never exceed 0x7f ff ff ff
                0x5a, 0xff, 0x99, 0x00, 0x00, 0x00,
                0x3f, 0xff, 0x99, 0x00, 0x00, 0x00,
                0x3e, 0xff, 0x99, 0x00, 0x00, 0x00,
                0x3d, 0xff, 0x99, 0x00, 0x00, 0x00,
                0x3c, 0xff, 0x99, 0x00, 0x00, 0x00,
                0x3b, 0xff, 0x99, 0x00, 0x00, 0x00,
                0x3a, 0xff, 0x99, 0x00, 0x00, 0x00,
                0x39, 0xff, 0x99, 0x00, 0x00, 0x00,
                0x38, 0xff, 0x99, 0x00, 0x00, 0x00,
                0x37, 0xff, 0x99, 0x00, 0x00, 0x00,
                0x36, 0xff, 0x99, 0x00, 0x00, 0x00,
                0x35, 0xff, 0x99, 0x00, 0x00, 0x00,
                0x34, 0xff, 0x99, 0x00, 0x00, 0x00,
                0x33, 0xff, 0x99, 0x00, 0x00, 0x00,
                0x32, 0xff, 0x99, 0x00, 0x00, 0x00,
                0x31, 0xff, 0x99, 0x00, 0x00, 0x00,
                0x30, 0xff, 0x99, 0x00, 0x00, 0x00,
            ];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;

            expect(() => {
                const results: any[] = [];
                let offset = 0;
                for (let ii = 0; ii < 18; ii++) {
                    const result = decodeType(buffer, offset, endian);
                    offset = getDecodingTypeNewOffset();
                    results.push(result)
                }
            }).toThrow();
        });

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
            const bufferArray = [
                0x4b,
                0x4a,
                0x43,
                0x42,
                0x2f,
                0x2e,
                0x2d,
                0x2c,
                0x2b,
                0x2a,
                0x29,
                0x28,
                0x27,
                0x26,
                0x25,
                0x24,
                0x23,
                0x22,
                0x21,
                0x20,
            ];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const results: any[] = [];
            let offset = 0;
            for (let ii = 0; ii < 20; ii++) {
                const result = decodeType(buffer, offset, endian);
                offset = getDecodingTypeNewOffset();
                results.push(result)
            }
            expect(results).toEqual([
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
            ])
        });

        it("normal case -- with ID and TAG", () => {
            const bufferArray = [
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x4b,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x4a,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x43,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x42,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x2f,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x2e,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x2d,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x2c,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x2b,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x2a,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x29,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x28,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x27,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x26,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x25,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x24,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x23,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x22,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x21,
                0xfc, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x20,
            ];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const results: any[] = [];
            let offset = 0;
            for (let ii = 0; ii < 20; ii++) {
                const result = decodeType(buffer, offset, endian);
                offset = getDecodingTypeNewOffset();
                results.push(result)
            }
            expect(results).toEqual([
                { typeIndex: "0x4b", id: 0x01, tag: 0x03 },
                { typeIndex: "0x4a", id: 0x01, tag: 0x03 },
                { typeIndex: "0x43", id: 0x01, tag: 0x03 },
                { typeIndex: "0x42", id: 0x01, tag: 0x03 },
                { typeIndex: "0x2f", id: 0x01, tag: 0x03 },
                { typeIndex: "0x2e", id: 0x01, tag: 0x03 },
                { typeIndex: "0x2d", id: 0x01, tag: 0x03 },
                { typeIndex: "0x2c", id: 0x01, tag: 0x03 },
                { typeIndex: "0x2b", id: 0x01, tag: 0x03 },
                { typeIndex: "0x2a", id: 0x01, tag: 0x03 },
                { typeIndex: "0x29", id: 0x01, tag: 0x03 },
                { typeIndex: "0x28", id: 0x01, tag: 0x03 },
                { typeIndex: "0x27", id: 0x01, tag: 0x03 },
                { typeIndex: "0x26", id: 0x01, tag: 0x03 },
                { typeIndex: "0x25", id: 0x01, tag: 0x03 },
                { typeIndex: "0x24", id: 0x01, tag: 0x03 },
                { typeIndex: "0x23", id: 0x01, tag: 0x03 },
                { typeIndex: "0x22", id: 0x01, tag: 0x03 },
                { typeIndex: "0x21", id: 0x01, tag: 0x03 },
                { typeIndex: "0x20", id: 0x01, tag: 0x03 },
            ])
        });
    })

    describe("floatingPoint_variableSizeArray_binary64, 0x4b -- already covered", () => {

    })

    describe("floatingPoint_variableSizeArray_binary32, 0x4a -- already covered", () => {

    })

    describe("floatingPoint_scalar_binary64, 0x43 -- already covered", () => {

    })

    describe("floatingPoint_scalar_binary32, 0x42 -- already covered", () => {

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

    })

    describe("integer_scalar_signedByte, 0x20 -- already covered", () => {

    })

    describe("boolean_fixedSizeArray, 0x18", () => {

        it("normal case", () => {
            const bufferArray = [0x18, 0x05];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = decodeType(buffer, 0, endian);
            expect(result).toEqual({
                typeIndex: "0x18",
                size: 0x05,
            });
        })

        it("normal case -- long size", () => {
            const bufferArray = [0x18, 0xff, 0x12, 0x34, 0x56, 0x78];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = decodeType(buffer, 0, endian);
            expect(result).toEqual({
                typeIndex: "0x18",
                size: 0x12345678,
            });
        })

        it("failed case -- size incorrectly formated missing in buffer", () => {
            const bufferArray = [0x18, 0xff, 0x12, 0x34, 0x56]; // 0x78 missing
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            expect(() => { decodeType(buffer, 0, endian) }).toThrow();
        })

        it("failed case -- size missing", () => {
            const bufferArray = [0x18];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            expect(() => { decodeType(buffer, 0, endian) }).toThrow();
        })
    })

    describe("boolean_boundedSizeArray, 0x10", () => {

        it("normal case", () => {
            const bufferArray = [0x10, 0x05];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = decodeType(buffer, 0, endian);
            expect(result).toEqual({
                typeIndex: "0x10",
                size: 0x05,
            });
        })

        it("normal case -- long size", () => {
            const bufferArray = [0x10, 0xff, 0x12, 0x34, 0x56, 0x78];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = decodeType(buffer, 0, endian);
            expect(result).toEqual({
                typeIndex: "0x10",
                size: 0x12345678,
            });
        })

        it("failed case -- size incorrectly formated missing in buffer", () => {
            const bufferArray = [0x10, 0xff, 0x12, 0x34, 0x56]; // 0x78 missing
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            expect(() => { decodeType(buffer, 0, endian) }).toThrow();
        })

        it("failed case -- size missing", () => {
            const bufferArray = [0x10];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            expect(() => { decodeType(buffer, 0, endian) }).toThrow();
        })
    })

    describe("boolean_variableSizeArray, 0x8", () => {

        it("normal case", () => {
            const bufferArray = [0x08];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = decodeType(buffer, 0, endian);
            expect(result).toEqual({
                typeIndex: "0x8",
            });
        })

    })

    describe("boolean_scalar, 0x0", () => {

        it("normal case", () => {
            const bufferArray = [0x00];
            const buffer = Buffer.from(bufferArray);
            const endian = ENDIAN.BIG;
            const result = decodeType(buffer, 0, endian);
            expect(result).toEqual({
                typeIndex: "0x0",
            });
        })
    })


})

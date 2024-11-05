
// import {  } from "../PvaData/DataDecoder";
import { decodeBitSets } from "../PvaData/DataDecoder";
import { encodeBitSets } from "../PvaData/DataEncoder";
import { typeIndexEnum } from "../PvaData/PvaData_typeEncoding"

import { ENDIAN } from "../PvaData/PvaMethods"
import { decodeType, reduceStructTypeWithBitSets } from "../PvaData/TypeDecoder";

describe("decode a type buffer", () => {

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

    describe("reduce a type according to BitSets", () => {
        it("reduce regular fields", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_structure,
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                    val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                    val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                }
            }

            const bitSets = [1];
            const reducedType = reduceStructTypeWithBitSets(type, bitSets, true);
            console.log("redued type", reducedType)
            expect(reducedType).toEqual(
                {
                    typeIndex: '0x80',
                    name: '',
                    fields: { val1: { typeIndex: '0x38' } }
                }
            )
        })

        it("keep the whole fields", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_structure,
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                    val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                    val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
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
                        val1: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                        val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                        val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                    }
                }
            )
        })

        it("keep the whole struct", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_structure,
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                    val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                    val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                }
            }

            const bitSets = [0];
            const reducedType = reduceStructTypeWithBitSets(type, bitSets, true);
            expect(reducedType).toEqual(
                {
                    typeIndex: typeIndexEnum.complex_scalar_structure,
                    name: "",
                    fields: {
                        val1: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                        val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                        val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                    }
                }
            )
        })


        it("keep the whole struct", () => {
            const type = {
                typeIndex: typeIndexEnum.complex_scalar_structure,
                name: "",
                fields: {
                    val1: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                    val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                    val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                }
            }

            const bitSets = [0, 1, 3];
            const reducedType = reduceStructTypeWithBitSets(type, bitSets, true);
            expect(reducedType).toEqual(
                {
                    typeIndex: typeIndexEnum.complex_scalar_structure,
                    name: "",
                    fields: {
                        val1: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                        val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                        val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
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
                            val11: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                            val12: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                        }
                    },
                    val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                    val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                }
            }

            const bitSets = [0, 1, 3];
            const reducedType = reduceStructTypeWithBitSets(type, bitSets, true);
            expect(reducedType).toEqual(
                type
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
                            val11: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                            val12: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                        }
                    },
                    val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                    val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
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
                                val11: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                                val12: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
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
                            val11: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                            val12: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                        }
                    },
                    val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                    val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
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
                                val12: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
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
                            val11: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                            val12: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                        }
                    },
                    val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                    val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
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
                                val11: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                                val12: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                            }
                        },
                        val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
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
                            val11: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                            val12: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                        }
                    },
                    val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                    val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                }
            }

            const bitSets = [4, 5];
            const reducedType = reduceStructTypeWithBitSets(type, bitSets, true);
            expect(reducedType).toEqual(
                {
                    typeIndex: '0x80',
                    name: '',
                    fields: {
                        val2: { typeIndex: '0x38' },
                        val3: { typeIndex: '0x38' }
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
                            val11: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                            val12: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                        }
                    },
                    val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                    val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
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
                                val12: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                            }
                        },
                        val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
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
                            val11: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                            val12: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                        }
                    },
                    val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                    val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
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
                            val11: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                            val12: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                        }
                    },
                    val2: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
                    val3: { typeIndex: typeIndexEnum.integer_fixedSizeArray_signedByte },
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

    describe("complex_variableSizeArray_variantUnion, 0x8a", () => {

    })

    describe("complex_variableSizeArray_union, 0x89", () => {
        it("ok", () => {
            const endian = ENDIAN.BIG;
            const bufferArray = [0xfd, 0x00, 0x07, 0x89, 0xfd, 0x00, 0x16, 0x81, 0x00, 0x03, 12, 116, 101, 109, 112, 101, 114, 97, 116, 117, 114, 101, 115, 0x30, 0x32, 13, 97, 100, 109, 105, 110, 105, 115, 116, 114, 97, 116, 111, 114, 0x83, 0x32, 3, 105, 100, 115, 0x2f];
            const buffer = Buffer.from(bufferArray);
            const type = decodeType(buffer, 0, endian);
            expect(type).toEqual({
                typeIndex: "0x89",
                name: "",
                id: 7,
                elementId: 22,
                fields: {
                    temperatures: { typeIndex: "0x30", size: 50 },
                    administrator: { typeIndex: "0x83", size: 50 },
                    ids: { typeIndex: "0x2f" }
                }
            });
        })

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

    describe("boolean_scalar, 0x0", () => {

    })


})

enum Bit7to5_TYPES {
	complex = 0b100,
	string = 0b011,
	floatingPoint = 0b010,
	integer = 0b001,
	boolean = 0b000,
}

enum Bit4to3_TYPES {
	fixedSizeArray = 0b11,
	boundedSizeArray = 0b10,
	variableSizeArray = 0b01,
	scalar = 0b00,
}

enum Bit2to0_integer_TYPES {
	unsignedLong = 0b111,
	unsignedInt = 0b110,
	unsignedShort = 0b101,
	unsignedByte = 0b100,
	signedLong = 0b011,
	signedInt = 0b010,
	signedShort = 0b001,
	signedByte = 0b000,
}

enum Bit2to0_floatingPoint_TYPES {
	binary128 = 0b100,
	binary64 = 0b011,
	binary32 = 0b010,
}

enum Bit2to0_complex_TYPES {
	boundedString = 0b011,
	variantUnion = 0b010,
	union = 0b001,
	structure = 0b000,
}

/**
 * The "field introspection description (FieldDesc)"
 * 
 * Each represents a type of data.
 */
// manually produced by PvData_typeEncoding.obtain_PvaData_TYPES()
export enum FieldDesc {
	complex_fixedSizeArray_boundedString = 0x9b,
	complex_fixedSizeArray_variantUnion = 0x9a,
	complex_fixedSizeArray_union = 0x99,
	complex_fixedSizeArray_structure = 0x98,
	complex_boundedSizeArray_boundedString = 0x93,
	complex_boundedSizeArray_variantUnion = 0x92,
	complex_boundedSizeArray_union = 0x91,
	complex_boundedSizeArray_structure = 0x90,
	complex_variableSizeArray_boundedString = 0x8b,
	complex_variableSizeArray_variantUnion = 0x8a,
	complex_variableSizeArray_union = 0x89,
	complex_variableSizeArray_structure = 0x88,
	complex_scalar_boundedString = 0x83,
	complex_scalar_variantUnion = 0x82,
	complex_scalar_union = 0x81,
	complex_scalar_structure = 0x80,
	string_fixedSizeArray = 0x78,
	string_boundedSizeArray = 0x70,
	string_variableSizeArray = 0x68,
	string_scalar = 0x60,
	floatingPoint_fixedSizeArray_binary128 = 0x5c,
	floatingPoint_fixedSizeArray_binary64 = 0x5b,
	floatingPoint_fixedSizeArray_binary32 = 0x5a,
	floatingPoint_boundedSizeArray_binary128 = 0x54,
	floatingPoint_boundedSizeArray_binary64 = 0x53,
	floatingPoint_boundedSizeArray_binary32 = 0x52,
	floatingPoint_variableSizeArray_binary128 = 0x4c,
	floatingPoint_variableSizeArray_binary64 = 0x4b,
	floatingPoint_variableSizeArray_binary32 = 0x4a,
	floatingPoint_scalar_binary128 = 0x44,
	floatingPoint_scalar_binary64 = 0x43,
	floatingPoint_scalar_binary32 = 0x42,
	integer_fixedSizeArray_unsignedLong = 0x3f,
	integer_fixedSizeArray_unsignedInt = 0x3e,
	integer_fixedSizeArray_unsignedShort = 0x3d,
	integer_fixedSizeArray_unsignedByte = 0x3c,
	integer_fixedSizeArray_signedLong = 0x3b,
	integer_fixedSizeArray_signedInt = 0x3a,
	integer_fixedSizeArray_signedShort = 0x39,
	integer_fixedSizeArray_signedByte = 0x38,
	integer_boundedSizeArray_unsignedLong = 0x37,
	integer_boundedSizeArray_unsignedInt = 0x36,
	integer_boundedSizeArray_unsignedShort = 0x35,
	integer_boundedSizeArray_unsignedByte = 0x34,
	integer_boundedSizeArray_signedLong = 0x33,
	integer_boundedSizeArray_signedInt = 0x32,
	integer_boundedSizeArray_signedShort = 0x31,
	integer_boundedSizeArray_signedByte = 0x30,
	integer_variableSizeArray_unsignedLong = 0x2f,
	integer_variableSizeArray_unsignedInt = 0x2e,
	integer_variableSizeArray_unsignedShort = 0x2d,
	integer_variableSizeArray_unsignedByte = 0x2c,
	integer_variableSizeArray_signedLong = 0x2b,
	integer_variableSizeArray_signedInt = 0x2a,
	integer_variableSizeArray_signedShort = 0x29,
	integer_variableSizeArray_signedByte = 0x28,
	integer_scalar_unsignedLong = 0x27,
	integer_scalar_unsignedInt = 0x26,
	integer_scalar_unsignedShort = 0x25,
	integer_scalar_unsignedByte = 0x24,
	integer_scalar_signedLong = 0x23,
	integer_scalar_signedInt = 0x22,
	integer_scalar_signedShort = 0x21,
	integer_scalar_signedByte = 0x20,
	boolean_fixedSizeArray = 0x18,
	boolean_boundedSizeArray = 0x10,
	boolean_variableSizeArray = 0x8,
	boolean_scalar = 0x0,
}

export class PvData_typeEncoding {
	// readonly encodingValue: number;
	// readonly encodingString: string;
	// constructor(input: val) {
	//     this.en
	// }

	// it is sololy used for defining "enum PvaData_TYPES"
	private static convertValueToString = (encodingValue: number): string | undefined => {
		// const encodingValue = 0x80;

		let bit7to5String = undefined;
		let bit7to5Value = -1;
		let bit4to3String = undefined;
		let bit4to3Value = -1;
		let bit2to0String = undefined;
		let bit2to0Value = -1;

		bit7to5Value = (encodingValue & 0b11100000) >> 5;
		bit7to5String = Bit7to5_TYPES[bit7to5Value];

		bit4to3Value = (encodingValue & 0b00011000) >> 3;
		bit4to3String = Bit4to3_TYPES[bit4to3Value];

		bit2to0Value = (encodingValue & 0b00000111) >> 0;
		if (bit7to5Value === Bit7to5_TYPES.complex) {
			bit2to0String = Bit2to0_complex_TYPES[bit2to0Value];
		} else if (bit7to5Value === Bit7to5_TYPES.floatingPoint) {
			bit2to0String = Bit2to0_floatingPoint_TYPES[bit2to0Value];
		} else if (bit7to5Value === Bit7to5_TYPES.integer) {
			bit2to0String = Bit2to0_integer_TYPES[bit2to0Value];
		} else if (bit7to5Value === Bit7to5_TYPES.boolean || bit7to5Value === Bit7to5_TYPES.string) {
			if (bit2to0Value !== 0b000) {
				bit2to0String = undefined;
			} else {
				bit2to0String = "null";
			}
		}

		if (bit7to5String === undefined || bit4to3String === undefined || bit2to0String === undefined) {
			return undefined;
		}

		return bit7to5String + "_" + bit4to3String + (bit2to0String === "null" ? "" : "_" + bit2to0String);
	};

	static obtain_PvaData_TYPES = () => {
		console.log("export enum PvaData_TYPES {");
		for (let ii = 255; ii >= 0; ii--) {
			const str = PvData_typeEncoding.convertValueToString(ii);
			if (str !== undefined) {
				console.log("   ", str, "=", `0x${ii.toString(16)},`);
			}
		}
		console.log("}");
	};
}


// class A {
//     constructor(){}
//     fun1 = () => {
//         console.log("this is fun1()");
//     }
// }

// // type A1 = new () => Omit<A| "fun1">;

// type A1 = new () => A;
// type A2 = {new (): A};
// type A3 = typeof A;
// type A4<K> = new () => K;
// interface A5<T> extends Function {
//     new (): T
// }
// interface A6<T> {
//     new (): T
// }
// interface A7<T> extends A4<T> {};
// // "An interface can only extend an identifier/qualified-name with optional type arguments.ts(2499)"
// // it means the anonymouse function signature "new () => T" cannot be extended by an interface
// // only named function can be extended by an interface
// interface A7Error<T> extends (new () => T) {};

// const create1 = <T>(constructorFun: new () => T): T => {return new constructorFun()}
// const create4 = (constructorFun: A4<A>): A => {return new constructorFun()}
// const create5 = <T>(constructorFun: A4<T>): T => {return new constructorFun()}

// class B extends (A as A4<A>) {
//     input: string;
//     constructor(input: string) {
//         super();
//         this.input = input;
//     }
//     // fun1 = (input: string) => {
//     //     console.log("this is B.fun1()", input)
//     // }
// }

// let b1 = new B("abc");
// // b1.fun1()

// // function create<T>(constructorFun: new () => T): T {return new constructorFun()}
// // function create1<T>(constructorFun: {new () : T}): T {return new constructorFun()}

// // let a2 = create1<A>(A);
// // a2.fun1()

// -------------------------------

// manually produced by PvData_typeEncoding.obtain_PvaData_TYPES()
export enum PvaData_TYPES {
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

// type PvaData_TYPES_structure = "complex_scalar_structure";
// type PvaData_TYPES_union = "complex_scalar_union";
// type PvaData_TYPES_sizedArray =
// 	| "complex_fixedSizeArray_boundedString"
// 	| "complex_fixedSizeArray_variantUnion"
// 	| "complex_fixedSizeArray_union"
// 	| "complex_fixedSizeArray_structure"
// 	| "complex_boundedSizeArray_boundedString"
// 	| "complex_boundedSizeArray_variantUnion"
// 	| "complex_boundedSizeArray_union"
// 	| "complex_boundedSizeArray_structure"
// 	| "string_fixedSizeArray"
// 	| "string_boundedSizeArray"
// 	| "floatingPoint_fixedSizeArray_binary128"
// 	| "floatingPoint_fixedSizeArray_binary64"
// 	| "floatingPoint_fixedSizeArray_binary32"
// 	| "floatingPoint_boundedSizeArray_binary128"
// 	| "floatingPoint_boundedSizeArray_binary64"
// 	| "floatingPoint_boundedSizeArray_binary32"
// 	| "integer_fixedSizeArray_unsignedLong"
// 	| "integer_fixedSizeArray_unsignedInt"
// 	| "integer_fixedSizeArray_unsignedShort"
// 	| "integer_fixedSizeArray_unsignedByte"
// 	| "integer_fixedSizeArray_signedLong"
// 	| "integer_fixedSizeArray_signedInt"
// 	| "integer_fixedSizeArray_signedShort"
// 	| "integer_fixedSizeArray_signedByte"
// 	| "integer_boundedSizeArray_unsignedLong"
// 	| "integer_boundedSizeArray_unsignedInt"
// 	| "integer_boundedSizeArray_unsignedShort"
// 	| "integer_boundedSizeArray_unsignedByte"
// 	| "integer_boundedSizeArray_signedLong"
// 	| "integer_boundedSizeArray_signedInt"
// 	| "integer_boundedSizeArray_signedShort"
// 	| "integer_boundedSizeArray_signedByte"
// 	| "boolean_fixedSizeArray"
// 	| "boolean_boundedSizeArray";

// type PvaData_TYPES_boundedString = "complex_scalar_boundedString";
// type PvaData_TYPES_variableSizeArray =
// 	| "complex_variableSizeArray_boundedString"
// 	| "complex_variableSizeArray_variantUnion"
// 	| "complex_variableSizeArray_union"
// 	| "complex_variableSizeArray_structure"
// 	| "string_variableSizeArray"
// 	| "floatingPoint_variableSizeArray_binary128"
// 	| "floatingPoint_variableSizeArray_binary64"
// 	| "floatingPoint_variableSizeArray_binary32"
// 	| "integer_variableSizeArray_unsignedLong"
// 	| "integer_variableSizeArray_unsignedInt"
// 	| "integer_variableSizeArray_unsignedShort"
// 	| "integer_variableSizeArray_unsignedByte"
// 	| "integer_variableSizeArray_signedLong"
// 	| "integer_variableSizeArray_signedInt"
// 	| "integer_variableSizeArray_signedShort"
// 	| "integer_variableSizeArray_signedByte"
// 	| "boolean_variableSizeArray";

// type PvaData_TYPES_primitive =
// 	| "complex_scalar_variantUnion"
// 	| "string_scalar"
// 	| "floatingPoint_scalar_binary128"
// 	| "floatingPoint_scalar_binary64"
// 	| "floatingPoint_scalar_binary32"
// 	| "integer_scalar_unsignedLong"
// 	| "integer_scalar_unsignedInt"
// 	| "integer_scalar_unsignedShort"
// 	| "integer_scalar_unsignedByte"
// 	| "integer_scalar_signedLong"
// 	| "integer_scalar_signedInt"
// 	| "integer_scalar_signedShort"
// 	| "integer_scalar_signedByte"
// 	| "boolean_scalar";

const PvaData_TYPES_structure_1 = ["complex_scalar_structure"] as const;
type PvaData_TYPES_structure = typeof PvaData_TYPES_structure_1[number];

const PvaData_TYPES_union_1 = ["complex_scalar_union"] as const;
type PvaData_TYPES_union = typeof PvaData_TYPES_union_1[number];
const PvaData_TYPES_sizedArray_1 = [
	"complex_fixedSizeArray_variantUnion",
	"complex_boundedSizeArray_variantUnion",
	"string_fixedSizeArray",
	"string_boundedSizeArray",
	"floatingPoint_fixedSizeArray_binary128",
	"floatingPoint_fixedSizeArray_binary64",
	"floatingPoint_fixedSizeArray_binary32",
	"floatingPoint_boundedSizeArray_binary128",
	"floatingPoint_boundedSizeArray_binary64",
	"floatingPoint_boundedSizeArray_binary32",
	"integer_fixedSizeArray_unsignedLong",
	"integer_fixedSizeArray_unsignedInt",
	"integer_fixedSizeArray_unsignedShort",
	"integer_fixedSizeArray_unsignedByte",
	"integer_fixedSizeArray_signedLong",
	"integer_fixedSizeArray_signedInt",
	"integer_fixedSizeArray_signedShort",
	"integer_fixedSizeArray_signedByte",
	"integer_boundedSizeArray_unsignedLong",
	"integer_boundedSizeArray_unsignedInt",
	"integer_boundedSizeArray_unsignedShort",
	"integer_boundedSizeArray_unsignedByte",
	"integer_boundedSizeArray_signedLong",
	"integer_boundedSizeArray_signedInt",
	"integer_boundedSizeArray_signedShort",
	"integer_boundedSizeArray_signedByte",
	"boolean_fixedSizeArray",
	"boolean_boundedSizeArray",
] as const;
type PvaData_TYPES_sizedArray = typeof PvaData_TYPES_sizedArray_1[number];

const PvaData_TYPES_sizedArrayComplex_1 = [
	"complex_fixedSizeArray_boundedString",
	"complex_fixedSizeArray_union",
	"complex_fixedSizeArray_structure",
	"complex_boundedSizeArray_boundedString",
	"complex_boundedSizeArray_union",
	"complex_boundedSizeArray_structure",
] as const;
type PvaData_TYPES_sizedArrayComplex = typeof PvaData_TYPES_sizedArrayComplex_1[number];

const PvaData_TYPES_boundedString_1 = ["complex_scalar_boundedString"] as const;
type PvaData_TYPES_boundedString = typeof PvaData_TYPES_boundedString_1[number];

const PvaData_TYPES_variableSizeArray_1 = [
	"complex_variableSizeArray_variantUnion",
	"string_variableSizeArray",
	"floatingPoint_variableSizeArray_binary128",
	"floatingPoint_variableSizeArray_binary64",
	"floatingPoint_variableSizeArray_binary32",
	"integer_variableSizeArray_unsignedLong",
	"integer_variableSizeArray_unsignedInt",
	"integer_variableSizeArray_unsignedShort",
	"integer_variableSizeArray_unsignedByte",
	"integer_variableSizeArray_signedLong",
	"integer_variableSizeArray_signedInt",
	"integer_variableSizeArray_signedShort",
	"integer_variableSizeArray_signedByte",
	"boolean_variableSizeArray",
] as const;
type PvaData_TYPES_variableSizeArray = typeof PvaData_TYPES_variableSizeArray_1[number];

const PvaData_TYPES_variableSizeArrayComplex_1 = [
	"complex_variableSizeArray_boundedString",
	"complex_variableSizeArray_union",
	"complex_variableSizeArray_structure",
] as const;
type PvaData_TYPES_variableSizeArrayComplex = typeof PvaData_TYPES_variableSizeArrayComplex_1[number];

const PvaData_TYPES_primitive_1 = [
	"complex_scalar_variantUnion",
	"string_scalar",
	"floatingPoint_scalar_binary128",
	"floatingPoint_scalar_binary64",
	"floatingPoint_scalar_binary32",
	"integer_scalar_unsignedLong",
	"integer_scalar_unsignedInt",
	"integer_scalar_unsignedShort",
	"integer_scalar_unsignedByte",
	"integer_scalar_signedLong",
	"integer_scalar_signedInt",
	"integer_scalar_signedShort",
	"integer_scalar_signedByte",
	"boolean_scalar",
] as const;
type PvaData_TYPES_primitive = typeof PvaData_TYPES_primitive_1[number];

type PvaData_TYPES_all =
	| PvaData_TYPES_primitive
	| PvaData_TYPES_sizedArray
	| PvaData_TYPES_variableSizeArray
	| PvaData_TYPES_sizedArrayComplex
	| PvaData_TYPES_variableSizeArrayComplex
	| PvaData_TYPES_boundedString
	| PvaData_TYPES_union
	| PvaData_TYPES_structure;

export type PvaAllTypesObj =
	| PvaIdTypeObj
	| PvaPrimitiveTypeObj
	| PvaBoundedStringTypeObj
	| PvaStructureTypeObj
	| PvaUnionTypeObj
	| PvaVariableSizeArrayTypeObj
	| PvaVariableSizeArrayComplexTypeObj
	| PvaSizedArrayTypeObj
	| PvaSizedArrayComplexTypeObj;

export type PvaIdTypeObj = {
	id: number;
};

export interface PvaPrimitiveTypeObj {
	// narrowed
	type: PvaData_TYPES_primitive;
	id?: number;
}

export interface PvaBoundedStringTypeObj {
	// narrowed
	type: PvaData_TYPES_boundedString;
	size: number;
	id?: number;
}

export interface PvaStructureTypeObj {
	// narrowed
	type: PvaData_TYPES_structure;
	name: string;
	fields: Record<string, PvaAllTypesObj>;
	id?: number;
}

export interface PvaUnionTypeObj {
	// narrowed
	type: PvaData_TYPES_union;
	fields: Record<string, PvaAllTypesObj>;
	id?: number;
}

export interface PvaVariableSizeArrayTypeObj {
	// narrowed
	type: PvaData_TYPES_variableSizeArray;
	element?: PvaPrimitiveTypeObj;
	id?: number;
}

export interface PvaVariableSizeArrayComplexTypeObj {
	// narrowed
	type: PvaData_TYPES_variableSizeArrayComplex;
	element: PvaBoundedStringTypeObj | PvaUnionTypeObj | PvaStructureTypeObj;
	id?: number;
}

export interface PvaSizedArrayTypeObj {
	// narrowed
	type: PvaData_TYPES_sizedArray;
	size: number;
	element?: PvaPrimitiveTypeObj;
	id?: number;
}

export interface PvaSizedArrayComplexTypeObj {
	// narrowed
	type: PvaData_TYPES_sizedArrayComplex;
	size: number;
	element: PvaBoundedStringTypeObj | PvaUnionTypeObj | PvaStructureTypeObj;
	id?: number;
}

// id guard
const guard_PvaId = (input: any): boolean => {
	// id, must be the only element if "type" does not exist
	if (input.type == undefined) {
		if (Object.keys(input).length !== 1) {
			return false;
		}
		if (typeof input.id !== "number") {
			return false;
		} else {
			return true;
		}
	}
	return true;
};

// type guard
const guard_PvaSizedArrayTypeObj = (input: any): input is PvaSizedArrayTypeObj => {
	// id, must be the only element if "type" does not exist
	if (guard_PvaId(input) === false) {
		return false;
	}

	// type
	if (!PvaData_TYPES_sizedArray_1.includes(input.type)) {
		return false;
	}
	// size
	if (typeof input.size !== "number") {
		return false;
	}
	// element, optional, but if it exists, it must be primitive type
	if (input.element !== undefined) {
		return guard_PvaPrimitiveTypeObj(input.element);
	}
	return true;
};

const guard_PvaPrimitiveTypeObj = (input: any): input is PvaPrimitiveTypeObj => {
	// id, must be the only element if "type" does not exist
	if (guard_PvaId(input) === false) {
		return false;
	}
	// type
	if (!PvaData_TYPES_primitive_1.includes(input.type)) {
		return false;
	}
	return true;
};

// type guard
const guard_PvaSizedArrayComplexTypeObj = (input: any): input is PvaSizedArrayComplexTypeObj => {
	// id, must be the only element if "type" does not exist
	if (guard_PvaId(input) === false) {
		return false;
	}

	// type
	if (!PvaData_TYPES_sizedArrayComplex_1.includes(input.type)) {
		return false;
	}
	// size
	if (typeof input.size !== "number") {
		return false;
	}
	// element, optional, but if it exists, it must be primitive type
	if (input.element !== undefined) {
		return guard_PvaPrimitiveTypeObj(input.element);
	}
	return true;
};

// type guard
const guard_PvaStructureTypeObj = (input: any): input is PvaStructureTypeObj => {
	// id, must be the only element if "type" does not exist
	if (guard_PvaId(input) === false) {
		return false;
	}

	// type
	if (!PvaData_TYPES_structure_1.includes(input.type)) {
		return false;
	}
	// fields, optional
	if (input.fields !== undefined) {
		return guard_PvaAllTypeObj(input.element);
	}
	return true;
};

let a5 = {
	type: "floatingPoint_fixedSizeArray_binary32",
	size: 5,
	element: "PvaData_TYPES_primitive",
	id: 9,
};

console.log(guard_PvaSizedArrayTypeObj(a5));

import { off } from "process";
import { PvaGlobalMethods, Pva_MESSAGE_ENDIANNESS } from "../Global/PvaGlobalMethods";
import { PvaData_TYPES } from "./PvaData_typeEncoding";

/**
 *
 *	string_scalar = 0x60,
 *	boolean_scalar = 0x0,
 *	integer_scalar_unsignedLong = 0x27,
 *	integer_scalar_unsignedInt = 0x26,
 *	integer_scalar_unsignedShort = 0x25,
 *	integer_scalar_unsignedByte = 0x24,
 *	integer_scalar_signedLong = 0x23,
 *	integer_scalar_signedInt = 0x22,
 *	integer_scalar_signedShort = 0x21,
 *	integer_scalar_signedByte = 0x20,
 *	floatingPoint_scalar_binary128 = 0x44,
 *	floatingPoint_scalar_binary64 = 0x43,
 *	floatingPoint_scalar_binary32 = 0x42,
 *   - fully represented by the "field description code", no other thing
 *
 *  complex_scalar_boundedString = 0x83,
 *   - 0xfd + id + field description code (0x83) + bounded size
 *	complex_scalar_variantUnion = 0x82,
 *   - 0xfd + id + field description code (0x82)
 *  complex_scalar_union = 0x81,
 *   - 0xfd + id + field description code (0x81) + number of choices (2 byte short, always BIG endian) + choice 1 + choice 2 + ...
 *   - choice i: name (string) + "a type"
 *  complex_scalar_structure = 0x80,
 *   - 0xfd + id + field description code (0x80) + number of properties (encoded in "size") + property 1 + property 2 + ...
 *   - property i: name (string) + "a type"
 *
 *	complex_fixedSizeArray_boundedString = 0x9b,
 *	complex_fixedSizeArray_variantUnion = 0x9a,
 *	complex_fixedSizeArray_union = 0x99,
 *	complex_fixedSizeArray_structure = 0x98,
 *	string_fixedSizeArray = 0x78,
 *	floatingPoint_fixedSizeArray_binary128 = 0x5c,
 *	floatingPoint_fixedSizeArray_binary64 = 0x5b,
 *	floatingPoint_fixedSizeArray_binary32 = 0x5a,
 *	integer_fixedSizeArray_unsignedLong = 0x3f,
 *	integer_fixedSizeArray_unsignedInt = 0x3e,
 *	integer_fixedSizeArray_unsignedShort = 0x3d,
 *	integer_fixedSizeArray_unsignedByte = 0x3c,
 *	integer_fixedSizeArray_signedLong = 0x3b,
 *	integer_fixedSizeArray_signedInt = 0x3a,
 *	integer_fixedSizeArray_signedShort = 0x39,
 *	integer_fixedSizeArray_signedByte = 0x38,
 *	boolean_fixedSizeArray = 0x18,
 *   - 0xfd + id + field description code (0xXX) + size (encoded in "size") + element type
 *     element type: if started with "0xfd/0xfc/0xfe", call readType(),
 *                   if started with others number, it means the element type is a primitive,
 *                   call readType()
 *
 *  complex_boundedSizeArray_boundedString = 0x93,
 *	complex_boundedSizeArray_variantUnion = 0x92,
 *	complex_boundedSizeArray_union = 0x91,
 *	complex_boundedSizeArray_structure = 0x90,
 *	string_boundedSizeArray = 0x70,
 *	floatingPoint_boundedSizeArray_binary128 = 0x54,
 *	floatingPoint_boundedSizeArray_binary64 = 0x53,
 *	floatingPoint_boundedSizeArray_binary32 = 0x52,
 *	integer_boundedSizeArray_unsignedLong = 0x37,
 *	integer_boundedSizeArray_unsignedInt = 0x36,
 *	integer_boundedSizeArray_unsignedShort = 0x35,
 *	integer_boundedSizeArray_unsignedByte = 0x34,
 *	integer_boundedSizeArray_signedLong = 0x33,
 *	integer_boundedSizeArray_signedInt = 0x32,
 *	integer_boundedSizeArray_signedShort = 0x31,
 *	integer_boundedSizeArray_signedByte = 0x30,
 *	boolean_boundedSizeArray = 0x10,
 *   - 0xfd + id + field description code (0xXX) + bounded size (encoded in "size") + element type
 *   - element type: if started with "0xfd/0xfc/0xfe", call readType(),
 *                   if started with others number, it means the element type is a primitive,
 *                   then call readType()
 *
 *  complex_variableSizeArray_boundedString = 0x8b,
 *	complex_variableSizeArray_variantUnion = 0x8a,
 *	complex_variableSizeArray_union = 0x89,
 *	complex_variableSizeArray_structure = 0x88,
 *	string_variableSizeArray = 0x68,
 *	floatingPoint_variableSizeArray_binary128 = 0x4c,
 *	floatingPoint_variableSizeArray_binary64 = 0x4b,
 *	floatingPoint_variableSizeArray_binary32 = 0x4a,
 *	integer_variableSizeArray_unsignedLong = 0x2f,
 *	integer_variableSizeArray_unsignedInt = 0x2e,
 *	integer_variableSizeArray_unsignedShort = 0x2d,
 *	integer_variableSizeArray_unsignedByte = 0x2c,
 *	integer_variableSizeArray_signedLong = 0x2b,
 *	integer_variableSizeArray_signedInt = 0x2a,
 *	integer_variableSizeArray_signedShort = 0x29,
 *	integer_variableSizeArray_signedByte = 0x28,
 *	boolean_variableSizeArray = 0x8,
 *   - 0xfd + id + field description code (0xXX) + bounded size (encoded in "size") + element type
 *   - element type: if started with "0xfd/0xfc/0xfe", call readType()
 *                   if started with others number, it means the element type is a primitive,
 *                   then call readType()
 */

export type type_def = Record<string, any> & {
	type?: string | undefined;
    id?: number | undefined;
    // for union and structure
    fields?: Record<string, type_def>,
    // for array, bounded string
    size?: number | undefined,
    // for array
    element?: type_def,
	newOffset?: number;
};

export class PvaData_type {
	//todo: each Pva server has one typesById, so, each TcpTransport should have one such
	//todo: it will be an input argument of constructor()
	typesById: Record<string, type_def | undefined> = {};
	endianness: Pva_MESSAGE_ENDIANNESS;
	buffer: Buffer;
	typeObj: type_def;
	type: string;
	id: number;
	name: string;

	constructor(buffer: Buffer, endianness: Pva_MESSAGE_ENDIANNESS) {
		this.buffer = buffer;
		this.endianness = endianness;

		// must set typesById to static class
		PvaData_type_methods.setTypesById(this.typesById);
		this.typeObj = PvaData_type_methods.readType(buffer, 0, this.endianness);
		// reset typesById

		this.type = this.typeObj.type;
		this.id = this.typeObj.id;
		this.name = this.typesById[this.id.toString()]?.name;
		console.dir(this.typeObj, { depth: null });
		console.dir(this.typesById, { depth: null });
		// PvaData_type_methods.setTypesById({});
	}
	isThisType = (data: any) => {
		return PvaData_type_methods.checkType(data, this.typeObj);
	};

	decodeBufferData = (bufferData: Buffer, start: number) => {
		let offset = start;
		const result = PvaData_type_methods.decodeBufferData(this.typeObj, bufferData, offset, this.endianness);
		console.dir(result, { depth: null });
	};
}

export class PvaData_type_methods {
	static typesById: Record<string, type_def | undefined> = {};
	static setTypesById = (typesById: Record<string, type_def | undefined>) => {
		this.typesById = typesById;
	};
	// read a size
	static readSize = (buffer: Buffer, offset: number, endianness: Pva_MESSAGE_ENDIANNESS): { newOffset: number; size: number } => {
		const byte1: number = PvaGlobalMethods.bufferReadUInt8(buffer, endianness, offset);
		if (byte1 === 0xff) {
			return {
				newOffset: offset + 1,
				size: 0,
			};
		} else if (byte1 < 0xfe) {
			return {
				newOffset: offset + 1,
				size: byte1,
			};
		}

		// if byte1 === 0xfe, read next 4 bytes as signed integer
		const int1 = PvaGlobalMethods.bufferReadInt32(buffer, endianness, 1 + offset);
		if (int1 < 0x7fffffff) {
			return {
				newOffset: offset + 1,
				size: int1,
			};
		}

		// if int1 === 0x7fffffff, read next 8 bytes as signed integer
		const int2 = PvaGlobalMethods.bufferReadBigInt64(buffer, endianness, 5 + offset);
		if (int1 < 0x7fffffffffffffff) {
			//todo
			throw new Error("Buffer too large");
			// return this.buffer.toString("utf8", 13, BigInt(13) + int2);
		}

		throw new Error("Buffer cannot be serialized");
	};

	// returns new offset
	static writeSize = (size: number | undefined, buffer: Buffer, offset: number, endianness: Pva_MESSAGE_ENDIANNESS): number => {
		if (size === undefined) {
			PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, 0xff, offset);
			offset = offset + 1;
		} else if (size >= 0 && size < 0xfe) {
			PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, size, offset);
			offset = offset + 1;
		} else if (size < 0x7fffffff) {
			PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, 0xfe, offset);
			offset = offset + 1;
			PvaGlobalMethods.bufferWriteInt32(buffer, endianness, size, offset);
			offset = offset + 4;
		} else if (size < 0x7fffffffffffffff) {
			PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, 0xfe, offset);
			offset = offset + 1;
			PvaGlobalMethods.bufferWriteInt32(buffer, endianness, 0x7fffffff, offset);
			offset = offset + 4;
			// leave next 8 bytes 0
			offset = offset + 8;
		}

		return offset;
	};

	static readString = (buffer: Buffer, offset: number, endianness: Pva_MESSAGE_ENDIANNESS): { newOffset: number; str: string } => {
		const tmp = this.readSize(buffer, offset, endianness);
		const strSize = tmp.size;
		const newOffset = tmp.newOffset;
		const str = buffer.toString("utf8", newOffset, newOffset + strSize);
		return {
			newOffset: offset + 1 + strSize,
			str: str,
		};
	};

	// --------------------------------------------

	// read a type: either primitive or user-defined type (structure, bounded string, array, union, ...)
	// we should know it is a "type definition"
	// The "type definition" does not include anything like structure property name or union choice name, it is part of
	// the structure or union, not part of a "type definition"
	// start = location of 0xfd/0xfc/0xfe or a primitive "field description code"
	static readType = (
		buffer: Buffer,
		start: number,
		endianness: Pva_MESSAGE_ENDIANNESS
		// typeTag: number | undefined = undefined
	): type_def => {
		let result: type_def = { type: "", newOffset: -1 };

		let offset = start;
		// "value" is either 0xfd/0xfc/0xfe, or directly a "field description code"
		const value = PvaGlobalMethods.bufferReadUInt8(buffer, endianness, offset);

		offset = offset + 1;
		if (!(Object.values(PvaData_TYPES).includes(value) || value === 0xfd || value === 0xfc || value === 0xfe || value === 0xff)) {
			const errorMsg = `Not recognized type: 0x${value.toString(16)}`;
			throw new Error(errorMsg);
		}
		// 0xfd/0xfc/0xfe are
		if (value === 0xfd || value === 0xfc) {
			// 0xfd + ID + "field description code" + [if it is a user-defined type, the type definition (a must)]
			// read ID: 2-type unsigned short
			const id = PvaGlobalMethods.bufferReadUInt16(buffer, endianness, offset);
			offset = offset + 2;
			this.typesById[id.toString()] = undefined;
			// if 0xfc, there is a 4-byte integer type tag
			let tag: number | undefined = undefined;
			if (value === 0xfc) {
				tag = PvaGlobalMethods.bufferReadInt32(buffer, endianness, offset);
				offset = offset + 4;
			}

			// "offset" is at the location of "field description code"
			result = this.readType(buffer, offset, endianness);

			// add id and tag
			result.id = id;
			result.tag = tag;

			// find if there is an existing id, "id" is read from buffer
			const existingResult = this.typesById[id.toString()];
			if (
				existingResult !== undefined &&
				existingResult.id === id &&
				existingResult.tag !== undefined &&
				tag !== undefined &&
				existingResult.tag === tag
			) {
				// do not override when (1) the id and tag are same, and (2) the tag is not "undefined"
			} else {
				this.typesById[id.toString()] = JSON.parse(JSON.stringify(result));
			}

			// clean up the "result", only keep type, newOffset, id, tag
			for (let propName in result) {
				if (propName !== "type" && propName !== "newOffset" && propName !== "id" && propName !== "tag") {
					delete result[propName];
				}
			}
		} else if (value === 0xfe) {
			// 0xfe + id, that's all
			// read unsigned short, the ID, size = 2 bytes
			const id = PvaGlobalMethods.bufferReadUInt16(buffer, endianness, offset);
			offset = offset + 2;
			const dataType = this.typesById[id.toString()];
			if (dataType === undefined) {
				const errorMsg = `Type ID ${id} does not exist.`;
				throw new Error(errorMsg);
			}
			result = { type: dataType.type, id: id, newOffset: offset };
		} else if (value === 0xff) {
			// NULL_TYPE_CODE, no introspection data (also implies no data)
			result = { type: "NULL", newOffset: offset };
		} else if (PvaData_TYPES[value].split("_")[1] === "scalar" && PvaData_TYPES[value].split("_")[2] === "structure") {
			result = this.readType_ScalarStructure(buffer, offset - 1, endianness);
		} else if (PvaData_TYPES[value].split("_")[1] === "scalar" && PvaData_TYPES[value].split("_")[2] === "union") {
			result = this.readType_ScalarUnion(buffer, offset - 1, endianness);
		} else if (PvaData_TYPES[value].split("_")[1] === "scalar" && PvaData_TYPES[value].split("_")[2] === "variantUnion") {
			result = this.readType_ScalarVariantUnion(buffer, offset - 1, endianness);
		}
		// "value" is the "field description code"
		// "arrays" have 51 types
		else if (PvaData_TYPES[value].split("_")[1] === "fixedSizeArray") {
			result = this.readType_fixedSizeArray(buffer, offset - 1, endianness);
		} else if (PvaData_TYPES[value].split("_")[1] === "variableSizeArray") {
			result = this.readType_variableSizeArray(buffer, offset - 1, endianness);
		} else if (PvaData_TYPES[value].split("_")[1] === "boundedSizeArray") {
			result = this.readType_boundedSizeArray(buffer, offset - 1, endianness);
		} else if (PvaData_TYPES[value].split("_")[1] === "scalar" && PvaData_TYPES[value].split("_")[2] === "boundedString") {
			// 	complex_scalar_boundedString = 0x83,
			result = this.readType_ScalarBoundedString(buffer, offset - 1, endianness);
		} else {
			// "field description code" can fully describe the data type
			result = { type: PvaData_TYPES[value], newOffset: offset - 1 + 1 };
		}
		return result;
	};

	// "field description code" + bounded size
	// new field: size
	static readType_ScalarBoundedString = (buffer: Buffer, start: number, endianness: Pva_MESSAGE_ENDIANNESS): type_def => {
		const result: type_def = { type: "", newOffset: -1 };
		let offset = start;

		// "field description code"
		let fieldDescCode = PvaGlobalMethods.bufferReadUInt8(buffer, endianness, offset);
		offset = offset + 1;
		result.type = PvaData_TYPES[fieldDescCode];
		result.newOffset = offset;

		// bounded size
		let sizeTmp = this.readSize(buffer, offset, endianness);
		result.newOffset = sizeTmp.newOffset;
		result.size = sizeTmp.size;

		return result;
	};

	// "field description code" + array size + [user-defined type]
	// new field: size
	static readType_fixedSizeArray = (buffer: Buffer, start: number, endianness: Pva_MESSAGE_ENDIANNESS): type_def => {
		const result: type_def = { type: "", newOffset: -1 };
		let offset = start;

		// "field description code"
		let fieldDescCode = PvaGlobalMethods.bufferReadUInt8(buffer, endianness, offset);
		offset = offset + 1;
		result.type = PvaData_TYPES[fieldDescCode];
		result.newOffset = offset;

		// size
		let sizeTmp = this.readSize(buffer, offset, endianness);
		result.size = sizeTmp.size;
		offset = sizeTmp.newOffset;
		result.newOffset = offset;

		// check next byte: if it is 0xfd/0xfc/0xfe, then readType(), if not, continue
		let nextByteValue = PvaGlobalMethods.bufferReadUInt8(buffer, endianness, offset);
		if (nextByteValue === 0xfd || nextByteValue === 0xfc || nextByteValue === 0xfe || nextByteValue === 0xff) {
			// element type
			const element = this.readType(buffer, offset, endianness);
			result.element = element;
			result.newOffset = element.newOffset;
		} else {
			const element = { type: result.type.replace("fixedSizeArray", "scalar"), newOffset: result.newOffset };
			result.element = element;
		}

		return result;
	};

	static readType_boundedSizeArray = (buffer: Buffer, start: number, endianness: Pva_MESSAGE_ENDIANNESS): type_def => {
		const result: type_def = { type: "", newOffset: -1 };
		let offset = start;

		// "field description code"
		let fieldDescCode = PvaGlobalMethods.bufferReadUInt8(buffer, endianness, offset);
		offset = offset + 1;
		result.type = PvaData_TYPES[fieldDescCode];
		result.newOffset = offset;

		// size
		let sizeTmp = this.readSize(buffer, offset, endianness);
		result.size = sizeTmp.size;
		offset = sizeTmp.newOffset;
		result.newOffset = offset;

		// check next byte: if it is 0xfd/0xfc/0xfe, then readType(), if not, continue
		let nextByteValue = PvaGlobalMethods.bufferReadUInt8(buffer, endianness, offset);
		if (nextByteValue === 0xfd || nextByteValue === 0xfc || nextByteValue === 0xfe || nextByteValue === 0xff) {
			// element type
			const element = this.readType(buffer, offset, endianness);
			result.element = element;
			result.newOffset = element.newOffset;
		} else {
			const element = { type: result.type.replace("boundedSizeArray", "scalar"), newOffset: result.newOffset };
			result.element = element;
		}

		return result;
	};

	// "field description code" + [user-defined type], no size
	// new field: element (type of element)
	static readType_variableSizeArray = (buffer: Buffer, start: number, endianness: Pva_MESSAGE_ENDIANNESS): type_def => {
		const result: type_def = { type: "", newOffset: -1 };
		let offset = start;

		// "field description code"
		let fieldDescCode = PvaGlobalMethods.bufferReadUInt8(buffer, endianness, offset);
		offset = offset + 1;
		result.type = PvaData_TYPES[fieldDescCode];
		result.newOffset = offset;

		// check next byte: if it is 0xfd/0xfc/0xfe, then readType(), if not, continue
		let nextByteValue = PvaGlobalMethods.bufferReadUInt8(buffer, endianness, offset);
		if (nextByteValue === 0xfd || nextByteValue === 0xfc || nextByteValue === 0xfe || nextByteValue === 0xff) {
			// element type
			const element = this.readType(buffer, offset, endianness);
			result.element = element;
			result.newOffset = element.newOffset;
		} else {
			const element = { type: result.type.replace("variableSizeArray", "scalar"), newOffset: result.newOffset };
			result.element = element;
		}

		return result;
	};

	// start = location of the "field description code" 0x80
	// new field: properties, name, id, tag, numProps
	static readType_ScalarStructure = (buffer: Buffer, start: number, endianness: Pva_MESSAGE_ENDIANNESS): type_def => {
		const result: type_def = { type: "", newOffset: -1 };
		result["properties"] = {} as Record<string, any>;

		let offset = start;

		// "field description code"
		let fieldDescCode = PvaGlobalMethods.bufferReadUInt8(buffer, endianness, offset);
		offset = offset + 1;
		result.type = PvaData_TYPES[fieldDescCode];

		// type name
		let nameTmp: any = this.readString(buffer, offset, endianness);
		offset = nameTmp.newOffset;
		result["name"] = nameTmp.str;

		// read number of properties
		let numPropsTmp = this.readSize(buffer, offset, endianness);
		offset = numPropsTmp.newOffset;
		const numProps = numPropsTmp.size;
		// result["numProps"] = numProps;

		for (let propIndex = 0; propIndex < numProps; propIndex++) {
			// it is a prop, contains name and type and more
			let prop = this.readType_ScalarStructure_Prop(buffer, offset, endianness);
			result["properties"][prop.name] = prop.def;
			offset = prop.def.newOffset;
			result.newOffset = prop.def.newOffset;
		}

		return result;
	};

	// start = location after the number of structure properties
	// name (string) + type
	static readType_ScalarStructure_Prop = (
		buffer: Buffer,
		start: number,
		endianness: Pva_MESSAGE_ENDIANNESS
	): {
		name: string;
		def: type_def;
		newOffset: number;
	} => {
		let offset = start;
		let result: Record<string, any> = {};

		// property name
		let nameTmp = this.readString(buffer, offset, endianness);
		offset = nameTmp.newOffset;
		result["name"] = nameTmp.str;

		// read the type
		let typeTmp = this.readType(buffer, offset, endianness);
		result.def = typeTmp;
		result.newOffset = typeTmp.newOffset;

		return result as {
			name: string;
			def: type_def;
			newOffset: number;
		};
	};

	// start = location of the "field description code" 0x81
	static readType_ScalarUnion = (buffer: Buffer, start: number, endianness: Pva_MESSAGE_ENDIANNESS): type_def => {
		const result: type_def = { type: "", newOffset: -1 };
		result["choices"] = {} as Record<string, any>;

		let offset = start;

		// "field description code", must be 0x81
		let fieldDescCode = PvaGlobalMethods.bufferReadUInt8(buffer, endianness, offset);
		offset = offset + 1;
		result.type = PvaData_TYPES[fieldDescCode];

		// number of choices
		// todo: is it a short or size? what is the endianness? seems like always BIG
		let numChoices = PvaGlobalMethods.bufferReadUInt16(buffer, Pva_MESSAGE_ENDIANNESS.BIG, offset);
		offset = offset + 2;
		// result["numChoices"] = numChoices;

		for (let choiceIndex = 0; choiceIndex < numChoices; choiceIndex++) {
			let choice = this.readType_ScalarUnion_Choice(buffer, offset, endianness);
			result["choices"][choice.name] = choice.def;
			offset = choice.def.newOffset;
			result.newOffset = offset;
		}

		return result;
	};

	// start = location after the number of structure properties
	// name (string) + type
	static readType_ScalarUnion_Choice = (
		buffer: Buffer,
		start: number,
		endianness: Pva_MESSAGE_ENDIANNESS
	): {
		name: string;
		newOffset: number;
		def: type_def;
	} => {
		let offset = start;
		let result: Record<string, any> = {};

		// property name
		let nameTmp = this.readString(buffer, offset, endianness);
		offset = nameTmp.newOffset;
		result["name"] = nameTmp.str;

		// read the type
		let typeTmp = this.readType(buffer, offset, endianness);
		result.def = typeTmp;
		result.newOffset = typeTmp.newOffset;
		return result as {
			name: string;
			newOffset: number;
			def: type_def;
		};
	};

	// start = location of the "field description code" 0x82
	// no additional info
	static readType_ScalarVariantUnion = (buffer: Buffer, start: number, endianness: Pva_MESSAGE_ENDIANNESS): type_def => {
		const result: type_def = { type: "", newOffset: -1 };
		let offset = start;

		// "field description code"
		let fieldDescCode = PvaGlobalMethods.bufferReadUInt8(buffer, endianness, offset);
		offset = offset + 1;
		result.type = PvaData_TYPES[fieldDescCode];
		result.newOffset = offset;

		return result;
	};

	// ------------------ check type ------------------------

	// get the real typeDef
	static getTypeDefFull = (typeDef: type_def): type_def => {
		let typeDefFull = typeDef;
		if (typeDef.id !== undefined) {
			let tmp = this.typesById[typeDef.id.toString()];
			if (tmp !== undefined) {
				typeDefFull = tmp;
			}
		}
		return typeDefFull;
	};

	// check if "data" is of type "id"
	static checkStructure = (data: any, typeDef: type_def): boolean => {
		const typeDefFull = this.getTypeDefFull(typeDef);
		// check number of properties
		if (Object.keys(data).length !== Object.keys(typeDefFull.properties).length) {
			return false;
		}
		// check property names
		for (let ii = 0; ii < Object.keys(data).length; ii++) {
			if (Object.keys(data)[ii] !== Object.keys(typeDefFull.properties)[ii]) {
				return false;
			}
		}
		// check each property's type
		const propertyNames = Object.keys(typeDefFull.properties);
		for (let ii = 0; ii < Object.keys(data).length; ii++) {
			const propertyName = propertyNames[ii];
			if (this.checkType(data[propertyName], typeDefFull.properties[propertyName]) === false) {
				return false;
			}
		}
		return true;
	};

	// data = {choice # : value}
	static checkUnion = (data: any, typeDef: type_def): boolean => {
		const typeDefFull = this.getTypeDefFull(typeDef);

		// the "data" must be an object
		if ((typeof data).toLocaleLowerCase() !== "object") {
			return false;
		}
		// the "data" must be an object with one field
		if (Object.keys(data).length !== 1) {
			return false;
		}
		// the "data"'s field key must be a number smaller than number of choices
		const choiceStr = Object.keys(data)[0];
		const choice = parseInt(choiceStr);
		if (isNaN(choice)) {
			return false;
		}
		if (choice >= Object.keys(typeDefFull.choices).length) {
			return false;
		}

		// check the value's type
		let choiceName = Object.keys(typeDefFull.choices)[choice];

		const choiceTypeDef = typeDefFull.choices[choiceName];
		return this.checkType(Object.values(data)[0], choiceTypeDef);
	};

	static checkVariantUnion = (data: any, typeDef: type_def): boolean => {
		//todo
		return true;
	};
	static checkBoundedString = (data: any, typeDef: type_def): boolean => {
		const typeDefFull = this.getTypeDefFull(typeDef);

		const size = typeDefFull.size;
		if (typeof data !== "string" || data.length > size) {
			return false;
		}
		return true;
	};

	static checkFixedSizeArray = (data: any, typeDef: type_def): boolean => {
		const typeDefFull = this.getTypeDefFull(typeDef);

		if (!Array.isArray(data)) {
			return false;
		} else {
			// get array element's type
			const elementTypeDef = typeDefFull.element;
			// check size
			const size = typeDefFull.size;
			if (data.length !== size) {
				return false;
			}
			// check each element's type
			for (let element of data) {
				if (this.checkType(element, elementTypeDef) === false) {
					return false;
				}
			}
		}
		return true;
	};

	static checkBoundedSizeArray = (data: any, typeDef: type_def): boolean => {
		const typeDefFull = this.getTypeDefFull(typeDef);

		if (!Array.isArray(data)) {
			return false;
		} else {
			// check size
			const size = typeDefFull.size;
			if (data.length > size) {
				return false;
			}
			// get array element's type
			const elementTypeDef = typeDefFull.element;
			// check each element's type
			for (let element of data) {
				if (this.checkType(element, elementTypeDef) === false) {
					return false;
				}
			}
		}
		return true;
	};

	static checkVariableSizeArray = (data: any, typeDef: type_def): boolean => {
		const typeDefFull = this.getTypeDefFull(typeDef);

		if (!Array.isArray(data)) {
			return false;
		} else {
			// get array element's type, can never be "undefined"
			const elementTypeDef = typeDefFull.element;
			// user-defined element type
			// check each element's type
			for (let element of data) {
				if (this.checkType(element, elementTypeDef) === false) {
					return false;
				}
			}
		}
		return true;
	};

	static checkPrimitiveType = (data: any, typeDef: type_def): boolean => {
		const typeDefFull = this.getTypeDefFull(typeDef);

		switch (typeDefFull.type) {
			case "string_scalar":
				if (typeof data === "string") {
					return true;
				}
				break;
			case "boolean_scalar":
				// treated as unsigned one byte data
				if (typeof data === "number" && data < 256 && data >= 0) {
					return true;
				}
				break;
			case "integer_scalar_signedLong":
				// signed 8 byte
				if (typeof data === "number" && data < 0x8000000000000000 && data >= -0x8000000000000000) {
					return true;
				}
				break;
			case "integer_scalar_signedInt":
				// signed 4 byte
				if (typeof data === "number" && data < 0x80000000 && data >= -0x80000000) {
					return true;
				}
				break;
			case "integer_scalar_signedShort":
				// signed 2 byte
				if (typeof data === "number" && data < 0x8000 && data >= -0x8000) {
					return true;
				}
				break;
			case "integer_scalar_signedByte":
				// signed 1 byte
				if (typeof data === "number" && data < 0x80 && data >= -0x80) {
					return true;
				}
				break;
			// too big!
			case "floatingPoint_scalar_binary128":
			case "floatingPoint_scalar_binary64":
				// 8 byte floating
				if (typeof data === "number" && data < Number.MAX_VALUE && data >= -Number.MAX_VALUE) {
					return true;
				}
				break;
			case "floatingPoint_scalar_binary32":
				// 4 byte floating
				if (typeof data === "number" && data < 3.402823466e38 && data >= -3.402823466e38) {
					return true;
				}
				break;
			case "integer_scalar_unsignedLong":
				// unsigned 8 byte
				if (typeof data === "number" && data < 0xffffffffffffffff && data >= 0) {
					return true;
				}
				break;
			case "integer_scalar_unsignedInt":
				// unsigned 4 byte
				if (typeof data === "number" && data < 0xffffffff && data >= 0) {
					return true;
				}
				break;
			case "integer_scalar_unsignedShort":
				// unsigned 2 byte
				if (typeof data === "number" && data < 0xffff && data >= 0) {
					return true;
				}
				break;
			case "integer_scalar_unsignedByte":
				// unsigned 1 byte
				if (typeof data === "number" && data < 0xff && data >= 0) {
					return true;
				}
				break;
		}
		return false;
	};

	static decodeBufferData = (
		typeDef: type_def,
		buffer: Buffer,
		start: number,
		endianness: Pva_MESSAGE_ENDIANNESS
	): { newOffset: number; result: string | number | string[] | number[] | bigint | bigint[] | undefined | Record<string, any> } => {
		let offset = start;
		let result: any;

		const primitiveTypes = [
			"string_scalar",
			"boolean_scalar",
			"integer_scalar_unsignedLong",
			"integer_scalar_unsignedInt",
			"integer_scalar_unsignedShort",
			"integer_scalar_unsignedByte",
			"integer_scalar_signedLong",
			"integer_scalar_signedInt",
			"integer_scalar_signedShort",
			"integer_scalar_signedByte",
			"floatingPoint_scalar_binary128",
			"floatingPoint_scalar_binary64",
			"floatingPoint_scalar_binary32",
		];

		// data is simply a string/number
		if (primitiveTypes.includes(typeDef.type)) {
			result = this.decodePrimitiveBufferData(typeDef, buffer, endianness, offset);
		}

		// complex_fixedSizeArray_boundedString = 0x9b,
		// complex_fixedSizeArray_variantUnion = 0x9a,
		// complex_fixedSizeArray_union = 0x99,
		// complex_fixedSizeArray_structure = 0x98,
		// string_fixedSizeArray = 0x78,
		// floatingPoint_fixedSizeArray_binary128 = 0x5c,
		// floatingPoint_fixedSizeArray_binary64 = 0x5b,
		// floatingPoint_fixedSizeArray_binary32 = 0x5a,
		// integer_fixedSizeArray_unsignedLong = 0x3f,
		// integer_fixedSizeArray_unsignedInt = 0x3e,
		// integer_fixedSizeArray_unsignedShort = 0x3d,
		// integer_fixedSizeArray_unsignedByte = 0x3c,
		// integer_fixedSizeArray_signedLong = 0x3b,
		// integer_fixedSizeArray_signedInt = 0x3a,
		// integer_fixedSizeArray_signedShort = 0x39,
		// integer_fixedSizeArray_signedByte = 0x38,
		// boolean_fixedSizeArray = 0x18,
		else if (typeDef.type.includes("fixedSizeArray")) {
			result = this.decodeFixedSizeArrayBufferData(typeDef, buffer, endianness, offset);
		}

		// complex_variableSizeArray_boundedString = 0x8b,
		// complex_variableSizeArray_variantUnion = 0x8a,
		// complex_variableSizeArray_union = 0x89,
		// complex_variableSizeArray_structure = 0x88,
		// string_variableSizeArray = 0x68,
		// floatingPoint_variableSizeArray_binary128 = 0x4c,
		// floatingPoint_variableSizeArray_binary64 = 0x4b,
		// floatingPoint_variableSizeArray_binary32 = 0x4a,
		// integer_variableSizeArray_unsignedLong = 0x2f,
		// integer_variableSizeArray_unsignedInt = 0x2e,
		// integer_variableSizeArray_unsignedShort = 0x2d,
		// integer_variableSizeArray_unsignedByte = 0x2c,
		// integer_variableSizeArray_signedLong = 0x2b,
		// integer_variableSizeArray_signedInt = 0x2a,
		// integer_variableSizeArray_signedShort = 0x29,
		// integer_variableSizeArray_signedByte = 0x28,
		// boolean_variableSizeArray = 0x8,
		else if (typeDef.type.includes("variableSizeArray")) {
			result = this.decodeVariableSizeArrayBufferData(typeDef, buffer, endianness, offset);
		}

		// complex_boundedSizeArray_boundedString = 0x93,
		// complex_boundedSizeArray_variantUnion = 0x92,
		// complex_boundedSizeArray_union = 0x91,
		// complex_boundedSizeArray_structure = 0x90,
		// string_boundedSizeArray = 0x70,
		// floatingPoint_boundedSizeArray_binary128 = 0x54,
		// floatingPoint_boundedSizeArray_binary64 = 0x53,
		// floatingPoint_boundedSizeArray_binary32 = 0x52,
		// integer_boundedSizeArray_unsignedLong = 0x37,
		// integer_boundedSizeArray_unsignedInt = 0x36,
		// integer_boundedSizeArray_unsignedShort = 0x35,
		// integer_boundedSizeArray_unsignedByte = 0x34,
		// integer_boundedSizeArray_signedLong = 0x33,
		// integer_boundedSizeArray_signedInt = 0x32,
		// integer_boundedSizeArray_signedShort = 0x31,
		// integer_boundedSizeArray_signedByte = 0x30,
		// boolean_boundedSizeArray = 0x10,
		else if (typeDef.type.includes("boundedSizeArray")) {
			result = this.decodeBoundedSizeArrayBufferData(typeDef, buffer, endianness, offset);
		}
		// complex_scalar_boundedString = 0x83,
		else if (typeDef.type === "complex_scalar_boundedString") {
			result = this.decodeBoundedStringBufferData(typeDef, buffer, endianness, offset);
		}
		// complex_scalar_variantUnion = 0x82,
		else if (typeDef.type === "complex_scalar_variantUnion") {
			result = this.decodeVariantUnionBufferData(typeDef, buffer, endianness, offset);
		}
		// complex_scalar_union = 0x81,
		else if (typeDef.type === "complex_scalar_union") {
			result = this.decodeUnionBufferData(typeDef, buffer, endianness, offset);
		}
		// complex_scalar_structure = 0x80,
		else if (typeDef.type === "complex_scalar_structure") {
			result = this.decodeStructureBufferData(typeDef, buffer, endianness, offset);
		} else {
			//todo
			throw new Error("Wrong!");
		}
		return result;
	};

	static decodeFixedSizeArrayBufferData = (
		typeDef: type_def,
		buffer: Buffer,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number
	): { result: number[] | string[] | undefined | bigint[] | Record<string, any>[]; newOffset: number } => {
		const typeDefFull = this.getTypeDefFull(typeDef);
		let result: any[] = [];
		let offset = start;

		let arraySize = typeDefFull.size;
		for (let ii = 0; ii < arraySize; ii++) {
			const elementTypeDef = typeDefFull.element;
			const elementData = this.decodeBufferData(elementTypeDef, buffer, offset, endianness);
			result.push(elementData.result);
			offset = elementData.newOffset;
		}
		return { result: result as number[] | string[] | undefined | bigint[] | Record<string, any>[], newOffset: offset };
	};

	static decodeVariableSizeArrayBufferData = (
		typeDef: type_def,
		buffer: Buffer,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number
	): { result: number[] | string[] | undefined | bigint[] | Record<string, any>[]; newOffset: number } => {
		const typeDefFull = this.getTypeDefFull(typeDef);
		let result: any[] = [];
		let offset = start;

		// read size of array
		const sizeTmp = this.readSize(buffer, offset, endianness);
		const arraySize = sizeTmp.size;
		offset = sizeTmp.newOffset;

		// variable size structure array, element: 0x00/0x01 + data
		for (let ii = 0; ii < arraySize; ii++) {
			if (typeDefFull.type.split("_")[2] === "structure") {
				const elementExist = PvaGlobalMethods.bufferReadUInt8(buffer, endianness, offset) === 0x01 ? true : false;
				offset = offset + 1;
				// if element does not exist, return {}
				if (!elementExist) {
					result.push({});
					continue;
				}
			}

			const elementTypeDef = this.getTypeDefFull(typeDefFull.element);
			const elementData = this.decodeBufferData(elementTypeDef, buffer, offset, endianness);
			result.push(elementData.result);
			offset = elementData.newOffset;
		}
		return { result: result as number[] | string[] | undefined | bigint[] | Record<string, any>[], newOffset: offset };
	};

	static decodeBoundedSizeArrayBufferData = (
		typeDef: type_def,
		buffer: Buffer,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number
	): { result: number[] | string[] | undefined | bigint[] | Record<string, any>[]; newOffset: number } => {
		const typeDefFull = this.getTypeDefFull(typeDef);
		let result: any[] = [];
		let offset = start;

		// read size of array
		const sizeTmp = this.readSize(buffer, offset, endianness);
		const arraySize = sizeTmp.size;
		offset = sizeTmp.newOffset;

		// get upper limit of the array size
		const arraySizeBound = typeDefFull.size;
		// ensure the size is within bound
		if (arraySize > arraySizeBound) {
			throw new Error("Bounded array size overflow");
		}

		for (let ii = 0; ii < arraySize; ii++) {
			const elementTypeDef = typeDefFull.element;
			const elementData = this.decodeBufferData(elementTypeDef, buffer, offset, endianness);
			result.push(elementData.result);
			offset = elementData.newOffset;
		}
		return { result: result as number[] | string[] | undefined | bigint[] | Record<string, any>[], newOffset: offset };
	};

	static decodeBoundedStringBufferData = (
		typeDef: type_def,
		buffer: Buffer,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number
	): { result: string; newOffset: number } => {
		const typeDefFull = this.getTypeDefFull(typeDef);
		let result: string = "";
		let offset = start;

		// read size of array
		const sizeTmp = this.readSize(buffer, offset, endianness);
		const arraySize = sizeTmp.size;
		offset = sizeTmp.newOffset;

		// get upper limit of the array size
		const arraySizeBound = typeDefFull.size;
		// ensure the size is within bound
		if (arraySize > arraySizeBound) {
			throw new Error("Bounded array size overflow");
		}

		result = buffer.toString("utf8", offset, offset + arraySize);
		offset = offset + arraySize;

		return { result: result, newOffset: offset };
	};

	static decodeVariantUnionBufferData = (
		typeDef: type_def,
		buffer: Buffer,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number
	): { result: number[] | string[] | undefined | bigint[] | Record<string, any>[]; newOffset: number } => {
		const typeDefFull = this.getTypeDefFull(typeDef);
		let result: any;
		let offset = start;

		// read type
		const choiceTypeDef = this.readType(buffer, offset, endianness);
		offset = choiceTypeDef.newOffset;

		// special case: type = 0xff, no data
		if (choiceTypeDef.type === "NULL") {
			return { result: undefined, newOffset: offset };
		}

		// decode buffer data
		const resultTmp = this.decodeBufferData(choiceTypeDef, buffer, offset, endianness);
		offset = resultTmp.newOffset;
		result = resultTmp.result;
		return { result: result as number[] | string[] | undefined | bigint[] | Record<string, any>[], newOffset: offset };
	};

	static decodeUnionBufferData = (
		typeDef: type_def,
		buffer: Buffer,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number
	): { result: Record<string, any>; newOffset: number } => {
		const typeDefFull = this.getTypeDefFull(typeDef);
		let result: any;
		let offset = start;

		// read choice index
		const choiceIndexTmp = this.readSize(buffer, offset, endianness);
		offset = choiceIndexTmp.newOffset;
		const choiceIndex = choiceIndexTmp.size;
		const choiceName = Object.keys(typeDefFull.choices)[choiceIndex];

		// get choice type def
		const choiceTypeDef = typeDefFull.choices[choiceName];

		// decode buffer data
		const resultTmp = this.decodeBufferData(choiceTypeDef, buffer, offset, endianness);
		offset = resultTmp.newOffset;
		result = resultTmp.result;

		let unionWrapper: Record<string, any> = {};
		// there must be a wrapper indicating the choice
		unionWrapper[choiceName] = result;

		// return { result: result as number[] | string[] | undefined | bigint[] | Record<string, any>[], newOffset: offset };
		return { result: unionWrapper, newOffset: offset };
	};

	static decodeStructureBufferData = (
		typeDef: type_def,
		buffer: Buffer,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number
	): { result: number[] | string[] | undefined | bigint[] | Record<string, any>[]; newOffset: number } => {
		const typeDefFull = this.getTypeDefFull(typeDef);
		let result: Record<string, any> = {};
		let offset = start;

		const propertyNames = Object.keys(typeDefFull.properties);
		for (let ii = 0; ii < propertyNames.length; ii++) {
			const propertyName = propertyNames[ii];
			const propertyTypeDef = typeDefFull.properties[propertyName];
			const resultTmp = this.decodeBufferData(propertyTypeDef, buffer, offset, endianness);
			offset = resultTmp.newOffset;
			result[propertyName] = resultTmp.result;
		}

		return { result: result as number[] | string[] | undefined | bigint[] | Record<string, any>[], newOffset: offset };
	};

	static decodePrimitiveBufferData = (
		typeDef: type_def,
		buffer: Buffer,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number
	): { result: number | string | undefined | bigint; newOffset: number } => {
		const typeDefFull = this.getTypeDefFull(typeDef);
		let result: number | string | undefined | bigint = undefined;
		let offset = start;
		let newOffset = start;

		switch (typeDefFull.type) {
			case "string_scalar":
				const sizeTmp = this.readSize(buffer, offset, endianness);
				const size = sizeTmp.size;
				const newOffsetTmp = sizeTmp.newOffset;
				result = buffer.toString("utf8", newOffsetTmp, newOffsetTmp + size);
				newOffset = newOffsetTmp + size;
				break;
			case "boolean_scalar":
				// treated as unsigned one byte data
				result = PvaGlobalMethods.bufferReadUInt8(buffer, endianness, offset);
				newOffset = offset + 1;
				break;
			case "integer_scalar_signedLong":
				// signed 8 byte
				result = PvaGlobalMethods.bufferReadBigInt64(buffer, endianness, offset);
				newOffset = offset + 8;
				break;
			case "integer_scalar_signedInt":
				// signed 4 byte
				result = PvaGlobalMethods.bufferReadInt32(buffer, endianness, offset);
				newOffset = offset + 4;
				break;
			case "integer_scalar_signedShort":
				// signed 2 byte
				result = PvaGlobalMethods.bufferReadInt16(buffer, endianness, offset);
				newOffset = offset + 2;
				break;
			case "integer_scalar_signedByte":
				// signed 1 byte
				result = PvaGlobalMethods.bufferReadInt8(buffer, endianness, offset);
				newOffset = offset + 1;
				break;
			// too big!
			case "floatingPoint_scalar_binary128":
				result = 0;
				newOffset = offset + 16;
				break;
			case "floatingPoint_scalar_binary64":
				// 8 byte floating
				result = PvaGlobalMethods.bufferReadDouble(buffer, endianness, offset);
				newOffset = offset + 8;
				break;
			case "floatingPoint_scalar_binary32":
				// 4 byte floating
				result = PvaGlobalMethods.bufferReadFloat(buffer, endianness, offset);
				newOffset = offset + 4;
				break;
			case "integer_scalar_unsignedLong":
				// unsigned 8 byte
				result = PvaGlobalMethods.bufferReadBigUInt64(buffer, endianness, offset);
				newOffset = offset + 8;
				break;
			case "integer_scalar_unsignedInt":
				// unsigned 4 byte
				result = PvaGlobalMethods.bufferReadUInt32(buffer, endianness, offset);
				newOffset = offset + 4;
				break;
			case "integer_scalar_unsignedShort":
				// unsigned 2 byte
				result = PvaGlobalMethods.bufferReadUInt16(buffer, endianness, offset);
				newOffset = offset + 2;
				break;
			case "integer_scalar_unsignedByte":
				// unsigned 1 byte
				result = PvaGlobalMethods.bufferReadUInt8(buffer, endianness, offset);
				newOffset = offset + 1;
				break;
		}
		return { result: result, newOffset: newOffset };
	};

	static checkType = (data: any, typeDef: type_def): boolean => {
		const primitiveTypes = [
			"string_scalar",
			"boolean_scalar",
			"integer_scalar_unsignedLong",
			"integer_scalar_unsignedInt",
			"integer_scalar_unsignedShort",
			"integer_scalar_unsignedByte",
			"integer_scalar_signedLong",
			"integer_scalar_signedInt",
			"integer_scalar_signedShort",
			"integer_scalar_signedByte",
			"floatingPoint_scalar_binary128",
			"floatingPoint_scalar_binary64",
			"floatingPoint_scalar_binary32",
		];

		// data is simply a string/number
		if (primitiveTypes.includes(typeDef.type)) {
			return this.checkPrimitiveType(data, typeDef);
		}

		// complex_fixedSizeArray_boundedString = 0x9b,
		// complex_fixedSizeArray_variantUnion = 0x9a,
		// complex_fixedSizeArray_union = 0x99,
		// complex_fixedSizeArray_structure = 0x98,
		// string_fixedSizeArray = 0x78,
		// floatingPoint_fixedSizeArray_binary128 = 0x5c,
		// floatingPoint_fixedSizeArray_binary64 = 0x5b,
		// floatingPoint_fixedSizeArray_binary32 = 0x5a,
		// integer_fixedSizeArray_unsignedLong = 0x3f,
		// integer_fixedSizeArray_unsignedInt = 0x3e,
		// integer_fixedSizeArray_unsignedShort = 0x3d,
		// integer_fixedSizeArray_unsignedByte = 0x3c,
		// integer_fixedSizeArray_signedLong = 0x3b,
		// integer_fixedSizeArray_signedInt = 0x3a,
		// integer_fixedSizeArray_signedShort = 0x39,
		// integer_fixedSizeArray_signedByte = 0x38,
		// boolean_fixedSizeArray = 0x18,
		else if (typeDef.type.includes("fixedSizeArray")) {
			return this.checkFixedSizeArray(data, typeDef);
		}

		// complex_variableSizeArray_boundedString = 0x8b,
		// complex_variableSizeArray_variantUnion = 0x8a,
		// complex_variableSizeArray_union = 0x89,
		// complex_variableSizeArray_structure = 0x88,
		// string_variableSizeArray = 0x68,
		// floatingPoint_variableSizeArray_binary128 = 0x4c,
		// floatingPoint_variableSizeArray_binary64 = 0x4b,
		// floatingPoint_variableSizeArray_binary32 = 0x4a,
		// integer_variableSizeArray_unsignedLong = 0x2f,
		// integer_variableSizeArray_unsignedInt = 0x2e,
		// integer_variableSizeArray_unsignedShort = 0x2d,
		// integer_variableSizeArray_unsignedByte = 0x2c,
		// integer_variableSizeArray_signedLong = 0x2b,
		// integer_variableSizeArray_signedInt = 0x2a,
		// integer_variableSizeArray_signedShort = 0x29,
		// integer_variableSizeArray_signedByte = 0x28,
		// boolean_variableSizeArray = 0x8,
		else if (typeDef.type.includes("_variableSizeArray_")) {
			return this.checkVariableSizeArray(data, typeDef);
		}

		// complex_boundedSizeArray_boundedString = 0x93,
		// complex_boundedSizeArray_variantUnion = 0x92,
		// complex_boundedSizeArray_union = 0x91,
		// complex_boundedSizeArray_structure = 0x90,
		// string_boundedSizeArray = 0x70,
		// floatingPoint_boundedSizeArray_binary128 = 0x54,
		// floatingPoint_boundedSizeArray_binary64 = 0x53,
		// floatingPoint_boundedSizeArray_binary32 = 0x52,
		// integer_boundedSizeArray_unsignedLong = 0x37,
		// integer_boundedSizeArray_unsignedInt = 0x36,
		// integer_boundedSizeArray_unsignedShort = 0x35,
		// integer_boundedSizeArray_unsignedByte = 0x34,
		// integer_boundedSizeArray_signedLong = 0x33,
		// integer_boundedSizeArray_signedInt = 0x32,
		// integer_boundedSizeArray_signedShort = 0x31,
		// integer_boundedSizeArray_signedByte = 0x30,
		// boolean_boundedSizeArray = 0x10,
		else if (typeDef.type.includes("_boundedSizeArray_")) {
			return this.checkBoundedSizeArray(data, typeDef);
		}
		// complex_scalar_boundedString = 0x83,
		else if (typeDef.type === "complex_scalar_boundedString") {
			return this.checkBoundedString(data, typeDef);
		}
		// complex_scalar_variantUnion = 0x82,
		else if (typeDef.type === "complex_scalar_variantUnion") {
			return this.checkVariantUnion(data, typeDef);
		}
		// complex_scalar_union = 0x81,
		else if (typeDef.type === "complex_scalar_union") {
			return this.checkUnion(data, typeDef);
		}
		// complex_scalar_structure = 0x80,
		else if (typeDef.type === "complex_scalar_structure") {
			return this.checkStructure(data, typeDef);
		} else {
			//todo
			throw new Error("Wrong!");
		}
	};

	// -------------------- encode data ---------------------

	// return new offset
	static encodePrimitiveBufferData = (
		data: string | number | bigint,
		typeDef: type_def,
		buffer: Buffer,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number
	): number => {
		const typeDefFull = this.getTypeDefFull(typeDef);
		let offset = start;
		// string type
		if (typeDefFull.type === "string_scalar") {
			if (typeof data !== "string") {
				throw new Error("wrong type, should be string");
			}
			// write string size
            offset = this.writeString(data, buffer, endianness, offset);
			return offset;
		}

		// all other types are number
		if (typeof data !== "number") {
			throw new Error("wrong type, should be number");
		}

		switch (typeDefFull.type) {
			case "boolean_scalar":
				// treated as unsigned one byte data
				// throw an exception if oversize
				PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, data, offset);
				offset = offset + 1;
				break;
			case "integer_scalar_signedLong":
				// signed 8 byte
				PvaGlobalMethods.bufferWriteBigInt64(buffer, endianness, data, offset);
				offset = offset + 8;
				break;
			case "integer_scalar_signedInt":
				// signed 4 byte
				PvaGlobalMethods.bufferWriteInt32(buffer, endianness, data, offset);
				offset = offset + 4;
				break;
			case "integer_scalar_signedShort":
				// signed 2 byte
				PvaGlobalMethods.bufferWriteInt16(buffer, endianness, data, offset);
				offset = offset + 2;
				break;
			case "integer_scalar_signedByte":
				// signed 1 byte
				PvaGlobalMethods.bufferWriteInt8(buffer, endianness, data, offset);
				offset = offset + 1;
				break;
			// too big!
			case "floatingPoint_scalar_binary128":
				// 16 byte, more than double, return 0
				offset = offset + 16;
				break;
			case "floatingPoint_scalar_binary64":
				// 8 byte floating
				PvaGlobalMethods.bufferWriteDouble(buffer, endianness, data, offset);
				offset = offset + 8;
				break;
			case "floatingPoint_scalar_binary32":
				// 4 byte floating
				PvaGlobalMethods.bufferWriteFloat(buffer, endianness, data, offset);
				offset = offset + 4;
				break;
			case "integer_scalar_unsignedLong":
				// unsigned 8 byte
				PvaGlobalMethods.bufferWriteBigUInt64(buffer, endianness, data, offset);
				offset = offset + 8;
				break;
			case "integer_scalar_unsignedInt":
				// unsigned 4 byte
				PvaGlobalMethods.bufferWriteUInt32(buffer, endianness, data, offset);
				offset = offset + 4;
				break;
			case "integer_scalar_unsignedShort":
				// unsigned 2 byte
				PvaGlobalMethods.bufferWriteUInt16(buffer, endianness, data, offset);
				offset = offset + 2;
				break;
			case "integer_scalar_unsignedByte":
				// unsigned 1 byte
				PvaGlobalMethods.bufferWriteInt8(buffer, endianness, data, offset);
				offset = offset + 1;
				break;
		}
		return offset;
	};

	static encodeFixedSizeArrayBufferData = (
		data: number[] | string[] | bigint[] | Record<string, any>[],
		typeDef: type_def,
		buffer: Buffer,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number
	): number => {
		const typeDefFull = this.getTypeDefFull(typeDef);
		let offset = start;

		// get actual array size
		let arraySize = data.length;

		// get defined array size
		let arraySizeDef = typeDefFull.size;

		// if the defined and actual array sizes do not match, throw an error
		if (arraySize !== arraySizeDef) {
			throw new Error("Array actual size and defined size not match");
		}

		for (let ii = 0; ii < arraySize; ii++) {
			const elementTypeDef = typeDefFull.element;
			offset = this.encodeBufferData(data[ii], elementTypeDef, buffer, endianness, offset);
		}
		return offset;
	};

	static encodeVariableSizeArrayBufferData = (
		data: number[] | string[] | bigint[] | Record<string, any>[],
		typeDef: type_def,
		buffer: Buffer,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number
	): number => {
		const typeDefFull = this.getTypeDefFull(typeDef);
		let offset = start;

		// get actual array size
		let arraySize = data.length;

		// write array size to buffer
		offset = this.writeSize(arraySize, buffer, offset, endianness);

		// write each element
		for (let ii = 0; ii < arraySize; ii++) {
			// special treatment for variable size structure array
			if (typeDefFull.type.split("_")[2] === "structure") {
				const elementExist = Object.keys(data[ii]).length > 0 ? true : false;
				if (!elementExist) {
					// write 0x00, indicating there is not such structure
					PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, 0x00, offset);
					offset = offset + 1;
					continue;
				} else {
					// write 0x01, indicating the structure exists
					PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, 0x01, offset);
					offset = offset + 1;
				}
			}

			const elementTypeDef = typeDefFull.element;
			offset = this.encodeBufferData(data[ii], elementTypeDef, buffer, endianness, offset);
		}
		return offset;
	};

	static encodeBoundedSizeArrayBufferData = (
		data: number[] | string[] | bigint[] | Record<string, any>[],
		typeDef: type_def,
		buffer: Buffer,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number
	): number => {
		const typeDefFull = this.getTypeDefFull(typeDef);
		let offset = start;

		// get actual array size
		let arraySize = data.length;

		// get bounded array size
		let arraySizeDef = typeDefFull.size;

		// if the defined and actual array sizes do not match, throw an error
		if (arraySize > arraySizeDef) {
			throw new Error("Array actual size larger than bounded size");
		}

		// write array size to buffer
		offset = this.writeSize(arraySize, buffer, offset, endianness);

		// write each element
		for (let ii = 0; ii < arraySize; ii++) {
			const elementTypeDef = typeDefFull.element;
			offset = this.encodeBufferData(data[ii], elementTypeDef, buffer, endianness, offset);
		}
		return offset;
	};

	static encodeBoundedStringBufferData = (
		data: string,
		typeDef: type_def,
		buffer: Buffer,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number
	): number => {
		const typeDefFull = this.getTypeDefFull(typeDef);
		let offset = start;

		// read size of array
		const arraySize = data.length;

		// get upper limit of the string
		const arraySizeBound = typeDefFull.size;

		// ensure the size is within bound
		if (arraySize > arraySizeBound) {
			throw new Error("String too long");
		}

        offset = this.writeString(data, buffer, endianness, offset);
		// offset = this.writeSize(arraySize, buffer, offset, endianness);
		// buffer.write(data, offset, offset + arraySize, "utf8");
		// offset = offset + arraySize;

		return offset;
	};

	// todo: not finished yet!
	static encodeVariantUnionBufferData = (
		data: string | number | string[] | number[] | bigint | bigint[] | undefined | Record<string, any>,
		typeDef: type_def,
		buffer: Buffer,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number
	): number => {
		const typeDefFull = this.getTypeDefFull(typeDef);
		let offset = start;

		// todo: encode typeDefFull to buffer, inverse of readType()
		// todo: this.encodeType(typeDefFull, buffer, start)

		// write to buffer according to the typeDef
		offset = this.encodeBufferData(data, typeDef, buffer, endianness, offset);
		return offset;
	};

	// data: {choiceName: choiceData}
	static encodeUnionBufferData = (
		data: Record<string, string | number | string[] | number[] | bigint | bigint[] | undefined | Record<string, any>>,
		typeDef: type_def,
		buffer: Buffer,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number
	): number => {
		const typeDefFull = this.getTypeDefFull(typeDef);
		let offset = start;

		// read choice index
		const choiceName = Object.keys(data)[0];
		const choiceIndex = Object.keys(typeDefFull.choices).indexOf(choiceName);
		const choiceData = Object.values(data)[0];
		// write choice index
		offset = this.writeSize(choiceIndex, buffer, offset, endianness);

		// get type def for the choice
		const choiceTypeDef = typeDefFull.choices[choiceName];

		// write data['choiceIndex'] to buffer
		offset = this.encodeBufferData(choiceData, choiceTypeDef, buffer, endianness, offset);

		return offset;
	};

	static encodeStructureBufferData = (
		data: Record<string, string | number | string[] | number[] | bigint | bigint[] | undefined | Record<string, any>>,
		typeDef: type_def,
		buffer: Buffer,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number
	): number => {
		const typeDefFull = this.getTypeDefFull(typeDef);
		let offset = start;

		// write each property
		for (let propertyName in data) {
			const propertyData = data[propertyName];
			const propertyTypeDef = typeDefFull.properties[propertyName];
			offset = this.encodeBufferData(propertyData, propertyTypeDef, buffer, endianness, offset);
		}
		return offset;
	};

	static encodeBufferData = (
		data: string | number | string[] | number[] | bigint | bigint[] | undefined | Record<string, any>,
		typeDef: type_def,
		buffer: Buffer,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number
	): number => {
		let offset = start;

		const primitiveTypes = [
			"string_scalar",
			"boolean_scalar",
			"integer_scalar_unsignedLong",
			"integer_scalar_unsignedInt",
			"integer_scalar_unsignedShort",
			"integer_scalar_unsignedByte",
			"integer_scalar_signedLong",
			"integer_scalar_signedInt",
			"integer_scalar_signedShort",
			"integer_scalar_signedByte",
			"floatingPoint_scalar_binary128",
			"floatingPoint_scalar_binary64",
			"floatingPoint_scalar_binary32",
		];

		// data is simply a string/number
		if (primitiveTypes.includes(typeDef.type)) {
			offset = this.encodePrimitiveBufferData(data as string | number | bigint, typeDef, buffer, endianness, offset);
		}

		// complex_fixedSizeArray_boundedString = 0x9b,
		// complex_fixedSizeArray_variantUnion = 0x9a,
		// complex_fixedSizeArray_union = 0x99,
		// complex_fixedSizeArray_structure = 0x98,
		// string_fixedSizeArray = 0x78,
		// floatingPoint_fixedSizeArray_binary128 = 0x5c,
		// floatingPoint_fixedSizeArray_binary64 = 0x5b,
		// floatingPoint_fixedSizeArray_binary32 = 0x5a,
		// integer_fixedSizeArray_unsignedLong = 0x3f,
		// integer_fixedSizeArray_unsignedInt = 0x3e,
		// integer_fixedSizeArray_unsignedShort = 0x3d,
		// integer_fixedSizeArray_unsignedByte = 0x3c,
		// integer_fixedSizeArray_signedLong = 0x3b,
		// integer_fixedSizeArray_signedInt = 0x3a,
		// integer_fixedSizeArray_signedShort = 0x39,
		// integer_fixedSizeArray_signedByte = 0x38,
		// boolean_fixedSizeArray = 0x18,
		else if (typeDef.type.includes("fixedSizeArray")) {
			offset = this.encodeFixedSizeArrayBufferData(
				data as number[] | string[] | bigint[] | Record<string, any>[],
				typeDef,
				buffer,
				endianness,
				offset
			);
		}

		// complex_variableSizeArray_boundedString = 0x8b,
		// complex_variableSizeArray_variantUnion = 0x8a,
		// complex_variableSizeArray_union = 0x89,
		// complex_variableSizeArray_structure = 0x88,
		// string_variableSizeArray = 0x68,
		// floatingPoint_variableSizeArray_binary128 = 0x4c,
		// floatingPoint_variableSizeArray_binary64 = 0x4b,
		// floatingPoint_variableSizeArray_binary32 = 0x4a,
		// integer_variableSizeArray_unsignedLong = 0x2f,
		// integer_variableSizeArray_unsignedInt = 0x2e,
		// integer_variableSizeArray_unsignedShort = 0x2d,
		// integer_variableSizeArray_unsignedByte = 0x2c,
		// integer_variableSizeArray_signedLong = 0x2b,
		// integer_variableSizeArray_signedInt = 0x2a,
		// integer_variableSizeArray_signedShort = 0x29,
		// integer_variableSizeArray_signedByte = 0x28,
		// boolean_variableSizeArray = 0x8,
		else if (typeDef.type.includes("variableSizeArray")) {
			offset = this.encodeVariableSizeArrayBufferData(
				data as number[] | string[] | bigint[] | Record<string, any>[],
				typeDef,
				buffer,
				endianness,
				offset
			);
		}

		// complex_boundedSizeArray_boundedString = 0x93,
		// complex_boundedSizeArray_variantUnion = 0x92,
		// complex_boundedSizeArray_union = 0x91,
		// complex_boundedSizeArray_structure = 0x90,
		// string_boundedSizeArray = 0x70,
		// floatingPoint_boundedSizeArray_binary128 = 0x54,
		// floatingPoint_boundedSizeArray_binary64 = 0x53,
		// floatingPoint_boundedSizeArray_binary32 = 0x52,
		// integer_boundedSizeArray_unsignedLong = 0x37,
		// integer_boundedSizeArray_unsignedInt = 0x36,
		// integer_boundedSizeArray_unsignedShort = 0x35,
		// integer_boundedSizeArray_unsignedByte = 0x34,
		// integer_boundedSizeArray_signedLong = 0x33,
		// integer_boundedSizeArray_signedInt = 0x32,
		// integer_boundedSizeArray_signedShort = 0x31,
		// integer_boundedSizeArray_signedByte = 0x30,
		// boolean_boundedSizeArray = 0x10,
		else if (typeDef.type.includes("boundedSizeArray")) {
			offset = this.encodeBoundedSizeArrayBufferData(
				data as number[] | string[] | bigint[] | Record<string, any>[],
				typeDef,
				buffer,
				endianness,
				offset
			);
		}
		// complex_scalar_boundedString = 0x83,
		else if (typeDef.type === "complex_scalar_boundedString") {
			offset = this.encodeBoundedStringBufferData(data as string, typeDef, buffer, endianness, offset);
		}
		// complex_scalar_variantUnion = 0x82,
		else if (typeDef.type === "complex_scalar_variantUnion") {
			//todo: this is very hard to do
			offset = this.encodeVariantUnionBufferData(data, typeDef, buffer, endianness, offset);
		}
		// complex_scalar_union = 0x81,
		else if (typeDef.type === "complex_scalar_union") {
			offset = this.encodeUnionBufferData(
				data as Record<string, string | number | string[] | number[] | bigint | bigint[] | undefined | Record<string, any>>,
				typeDef,
				buffer,
				endianness,
				offset
			);
		}
		// complex_scalar_structure = 0x80,
		else if (typeDef.type === "complex_scalar_structure") {
			offset = this.encodeStructureBufferData(
				data as Record<string, string | number | string[] | number[] | bigint | bigint[] | undefined | Record<string, any>>,
				typeDef,
				buffer,
				endianness,
				offset
			);
		} else {
			//todo
			throw new Error("Wrong!");
		}
		return offset;
	};

	// -------------------- encode type ---------------------
	// convert type def object to buffer

	static encodePrimitiveBufferTypeDef = (typeDef: type_def, buffer: Buffer, endianness: Pva_MESSAGE_ENDIANNESS, start: number): number => {
		const typeDefFull = this.getTypeDefFull(typeDef);
		const type = typeDefFull.type;
		//todo: how to eliminate the error
		const fieldDescCode: PvaData_TYPES = PvaData_TYPES[type];
		let offset = start;

		// write "field description code"
		// primitive type is represented by a 1-byte number
		PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, fieldDescCode, offset);
		offset = offset + 1;
		return offset;
	};

	static encodeFixedSizeArrayBufferType = (typeDef: type_def, buffer: Buffer, endianness: Pva_MESSAGE_ENDIANNESS, start: number) => {
		const typeDefFull = this.getTypeDefFull(typeDef);
		const type = typeDefFull.type;
		//todo: how to eliminate the error
		const fieldDescCode: PvaData_TYPES = PvaData_TYPES[type];
		let offset = start;

		// if the typeDef contains an ID property, it means it must be encoded as 0xfe/0xfd/0xfc format
		const hasAnId: boolean = typeDefFull.id === undefined ? false : true;
		if (hasAnId) {
			// write 0xfd
			PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, 0xfd, offset);
			offset = offset + 1;
			// write id as a 2-byte short
			PvaGlobalMethods.bufferWriteUInt16(buffer, endianness, typeDefFull.id, offset);
			offset = offset + 2;
		}
		// write "field description code"
		PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, fieldDescCode, offset);
        offset = offset + 1;

		// write array size as a size
		offset = this.writeSize(typeDefFull.size, buffer, offset, endianness);

		// write the element type
		const elementTypeDef = typeDefFull.element;
		offset = this.encodeBufferTypeDef(elementTypeDef, buffer, endianness, offset);
		return offset;
	};

	static encodeBoundedSizeArrayBufferType = (typeDef: type_def, buffer: Buffer, endianness: Pva_MESSAGE_ENDIANNESS, start: number) => {
		const typeDefFull = this.getTypeDefFull(typeDef);
		const type = typeDefFull.type;
		//todo: how to eliminate the error
		const fieldDescCode: PvaData_TYPES = PvaData_TYPES[type];
		let offset = start;

		// if the typeDef contains an ID property, it means it must be encoded as 0xfe/0xfd/0xfc format
		const hasAnId: boolean = typeDefFull.id === undefined ? false : true;
		if (hasAnId) {
			// write 0xfd
			PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, 0xfd, offset);
			offset = offset + 1;
			// write id as a 2-byte short
			PvaGlobalMethods.bufferWriteUInt16(buffer, endianness, typeDefFull.id, offset);
			offset = offset + 2;
		}
		// write "field description code"
		PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, fieldDescCode, offset);
        offset = offset + 1;

		// write array size bound as a size
		offset = this.writeSize(typeDefFull.size, buffer, offset, endianness);

		// write the element type
		const elementTypeDef = typeDefFull.element;
		offset = this.encodeBufferTypeDef(elementTypeDef, buffer, endianness, offset);
		return offset;
	};

	static encodeVariableSizeArrayBufferType = (typeDef: type_def, buffer: Buffer, endianness: Pva_MESSAGE_ENDIANNESS, start: number) => {
		const typeDefFull = this.getTypeDefFull(typeDef);
		const type = typeDefFull.type;
		//todo: how to eliminate the error
		const fieldDescCode: PvaData_TYPES = PvaData_TYPES[type];
		let offset = start;

		// if the typeDef contains an ID property, it means it must be encoded as 0xfe/0xfd/0xfc format
		const hasAnId: boolean = typeDefFull.id === undefined ? false : true;
		if (hasAnId) {
			// write 0xfd
			PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, 0xfd, offset);
			offset = offset + 1;
			// write id as a 2-byte short
			PvaGlobalMethods.bufferWriteUInt16(buffer, endianness, typeDefFull.id, offset);
			offset = offset + 2;
		}
		// write "field description code"
		PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, fieldDescCode, offset);
        offset = offset + 1;

		// write the element type
		const elementTypeDef = typeDefFull.element;
		offset = this.encodeBufferTypeDef(elementTypeDef, buffer, endianness, offset);
		return offset;
	};

	static encodeBoundedStringBufferType = (typeDef: type_def, buffer: Buffer, endianness: Pva_MESSAGE_ENDIANNESS, start: number) => {
		const typeDefFull = this.getTypeDefFull(typeDef);
		const type = typeDefFull.type;
		//todo: how to eliminate the error
		const fieldDescCode: PvaData_TYPES = PvaData_TYPES[type];
		let offset = start;

		// write "field description code"
		PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, fieldDescCode, offset);
        offset = offset + 1;

		// write string length bound as a size
		offset = this.writeSize(typeDefFull.size, buffer, offset, endianness);
		return offset;
	};

	static encodeVariantUnionBufferType = (typeDef: type_def, buffer: Buffer, endianness: Pva_MESSAGE_ENDIANNESS, start: number) => {
		const typeDefFull = this.getTypeDefFull(typeDef);
		const type = typeDefFull.type;
		//todo: how to eliminate the error
		const fieldDescCode: PvaData_TYPES = PvaData_TYPES[type];
		let offset = start;

		// if the typeDef contains an ID property, it means it must be encoded as 0xfe/0xfd/0xfc format
		const hasAnId: boolean = typeDefFull.id === undefined ? false : true;
		if (hasAnId) {
			// write 0xfd
			PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, 0xfd, offset);
			offset = offset + 1;
			// write id as a 2-byte short
			PvaGlobalMethods.bufferWriteUInt16(buffer, endianness, typeDefFull.id, offset);
			offset = offset + 2;
		}
		// write "field description code"
		PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, fieldDescCode, offset);
        offset = offset + 1;

		// variant union does not have any chioce, its type def is encoded in the data

		return offset;
	};

	static encodeUnionBufferType = (typeDef: type_def, buffer: Buffer, endianness: Pva_MESSAGE_ENDIANNESS, start: number) => {
		const typeDefFull = this.getTypeDefFull(typeDef);
		const type = typeDefFull.type;
		//todo: how to eliminate the error
		const fieldDescCode: PvaData_TYPES = PvaData_TYPES[type];
		let offset = start;

		// if the typeDef contains an ID property, it means it must be encoded as 0xfe/0xfd/0xfc format
		const hasAnId: boolean = typeDefFull.id === undefined ? false : true;
		if (hasAnId) {
			// write 0xfd
			PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, 0xfd, offset);
			offset = offset + 1;
			// write id as a 2-byte short
			PvaGlobalMethods.bufferWriteUInt16(buffer, endianness, typeDefFull.id, offset);
			offset = offset + 2;
		}
		// write "field description code"
		PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, fieldDescCode, offset);
        offset = offset + 1;

		// write number of choices as a size
		const choiceNames = Object.keys(typeDefFull.choices);
		const numChoices = choiceNames.length;
        offset = this.writeSize(numChoices, buffer, offset, endianness);

        for (let ii = 0; ii < numChoices; ii++) {
            // write choice name
            const choiceName = choiceNames[ii];
            offset = this.writeString(choiceName, buffer, endianness, offset)
            // write choice type def
            const choiceTypeDef = typeDefFull.choices[choiceName];
            offset = this.encodeBufferTypeDef(choiceTypeDef, buffer, endianness, offset);
        }
		return offset;
	};

	static encodeStructureBufferType = (typeDef: type_def, buffer: Buffer, endianness: Pva_MESSAGE_ENDIANNESS, start: number) => {
		const typeDefFull = this.getTypeDefFull(typeDef);
		const type = typeDefFull.type;
		//todo: how to eliminate the error
		const fieldDescCode: PvaData_TYPES = PvaData_TYPES[type];
		let offset = start;

		// if the typeDef contains an ID property, it means it must be encoded as 0xfe/0xfd/0xfc format
		const hasAnId: boolean = typeDefFull.id === undefined ? false : true;
		if (hasAnId) {
			// write 0xfd
			PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, 0xfd, offset);
			offset = offset + 1;
			// write id as a 2-byte short
			PvaGlobalMethods.bufferWriteUInt16(buffer, endianness, typeDefFull.id, offset);
			offset = offset + 2;
		}
		// write "field description code"
		PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, fieldDescCode, offset);
        offset = offset + 1;

        // write structure type name, e.g. "time_t"
        const structName = typeDefFull.name;
        offset = this.writeString(structName, buffer, endianness, offset);

		// write number of properties as size
		const propNames = Object.keys(typeDefFull.properties);
		const numProps = propNames.length;
        offset = this.writeSize(numProps, buffer, offset, endianness);

        for (let ii = 0; ii < numProps; ii++) {
            // write property name
            const propName = propNames[ii];
            offset = this.writeString(propName, buffer, endianness, offset)
            // write property type def
            const propTypeDef = typeDefFull.properties[propName];
            offset = this.encodeBufferTypeDef(propTypeDef, buffer, endianness, offset);
        }
		return offset;
	};

    static writeString = (str: string, buffer: Buffer, endianness: Pva_MESSAGE_ENDIANNESS, offset: number): number => {
        // write size as size
        offset = this.writeSize(str.length, buffer, offset, endianness);
        // write string body
        buffer.write(str, offset, offset + str.length, "utf8");
        offset = offset + str.length;
        return offset;
    }

	static encodeBufferTypeDef = (typeDef: type_def, buffer: Buffer, endianness: Pva_MESSAGE_ENDIANNESS, start: number): number => {
		let offset = start;

		const primitiveTypes = [
			"string_scalar",
			"boolean_scalar",
			"integer_scalar_unsignedLong",
			"integer_scalar_unsignedInt",
			"integer_scalar_unsignedShort",
			"integer_scalar_unsignedByte",
			"integer_scalar_signedLong",
			"integer_scalar_signedInt",
			"integer_scalar_signedShort",
			"integer_scalar_signedByte",
			"floatingPoint_scalar_binary128",
			"floatingPoint_scalar_binary64",
			"floatingPoint_scalar_binary32",
		];

		// data is simply a string/number
		if (primitiveTypes.includes(typeDef.type)) {
			offset = this.encodePrimitiveBufferTypeDef(typeDef, buffer, endianness, offset);
		}

		// complex_fixedSizeArray_boundedString = 0x9b,
		// complex_fixedSizeArray_variantUnion = 0x9a,
		// complex_fixedSizeArray_union = 0x99,
		// complex_fixedSizeArray_structure = 0x98,
		// string_fixedSizeArray = 0x78,
		// floatingPoint_fixedSizeArray_binary128 = 0x5c,
		// floatingPoint_fixedSizeArray_binary64 = 0x5b,
		// floatingPoint_fixedSizeArray_binary32 = 0x5a,
		// integer_fixedSizeArray_unsignedLong = 0x3f,
		// integer_fixedSizeArray_unsignedInt = 0x3e,
		// integer_fixedSizeArray_unsignedShort = 0x3d,
		// integer_fixedSizeArray_unsignedByte = 0x3c,
		// integer_fixedSizeArray_signedLong = 0x3b,
		// integer_fixedSizeArray_signedInt = 0x3a,
		// integer_fixedSizeArray_signedShort = 0x39,
		// integer_fixedSizeArray_signedByte = 0x38,
		// boolean_fixedSizeArray = 0x18,
		else if (typeDef.type.includes("fixedSizeArray")) {
			offset = this.encodeFixedSizeArrayBufferType(typeDef, buffer, endianness, offset);
		}

		// complex_variableSizeArray_boundedString = 0x8b,
		// complex_variableSizeArray_variantUnion = 0x8a,
		// complex_variableSizeArray_union = 0x89,
		// complex_variableSizeArray_structure = 0x88,
		// string_variableSizeArray = 0x68,
		// floatingPoint_variableSizeArray_binary128 = 0x4c,
		// floatingPoint_variableSizeArray_binary64 = 0x4b,
		// floatingPoint_variableSizeArray_binary32 = 0x4a,
		// integer_variableSizeArray_unsignedLong = 0x2f,
		// integer_variableSizeArray_unsignedInt = 0x2e,
		// integer_variableSizeArray_unsignedShort = 0x2d,
		// integer_variableSizeArray_unsignedByte = 0x2c,
		// integer_variableSizeArray_signedLong = 0x2b,
		// integer_variableSizeArray_signedInt = 0x2a,
		// integer_variableSizeArray_signedShort = 0x29,
		// integer_variableSizeArray_signedByte = 0x28,
		// boolean_variableSizeArray = 0x8,
		else if (typeDef.type.includes("variableSizeArray")) {
			offset = this.encodeVariableSizeArrayBufferType(typeDef, buffer, endianness, offset);
		}

		// complex_boundedSizeArray_boundedString = 0x93,
		// complex_boundedSizeArray_variantUnion = 0x92,
		// complex_boundedSizeArray_union = 0x91,
		// complex_boundedSizeArray_structure = 0x90,
		// string_boundedSizeArray = 0x70,
		// floatingPoint_boundedSizeArray_binary128 = 0x54,
		// floatingPoint_boundedSizeArray_binary64 = 0x53,
		// floatingPoint_boundedSizeArray_binary32 = 0x52,
		// integer_boundedSizeArray_unsignedLong = 0x37,
		// integer_boundedSizeArray_unsignedInt = 0x36,
		// integer_boundedSizeArray_unsignedShort = 0x35,
		// integer_boundedSizeArray_unsignedByte = 0x34,
		// integer_boundedSizeArray_signedLong = 0x33,
		// integer_boundedSizeArray_signedInt = 0x32,
		// integer_boundedSizeArray_signedShort = 0x31,
		// integer_boundedSizeArray_signedByte = 0x30,
		// boolean_boundedSizeArray = 0x10,
		else if (typeDef.type.includes("boundedSizeArray")) {
			offset = this.encodeBoundedSizeArrayBufferType(typeDef, buffer, endianness, offset);
		}
		// complex_scalar_boundedString = 0x83,
		else if (typeDef.type === "complex_scalar_boundedString") {
			offset = this.encodeBoundedStringBufferType(typeDef, buffer, endianness, offset);
		}
		// complex_scalar_variantUnion = 0x82,
		else if (typeDef.type === "complex_scalar_variantUnion") {
			offset = this.encodeVariantUnionBufferType(typeDef, buffer, endianness, offset);
		}
		// complex_scalar_union = 0x81,
		else if (typeDef.type === "complex_scalar_union") {
			offset = this.encodeUnionBufferType(typeDef, buffer, endianness, offset);
		}
		// complex_scalar_structure = 0x80,
		else if (typeDef.type === "complex_scalar_structure") {
			offset = this.encodeStructureBufferType(typeDef, buffer, endianness, offset);
		} else {
			//todo
			throw new Error("Wrong!");
		}
		return offset;
	};
}
// ---------------------------------------------

//todo: eliminate newOffset

// ----------------- test reading type buffer ----------------------
// little endian, data from 0x46
// let input1 = [
// 	0x02, 0x00, 0x00, 0x00, 0x45, 0x00, 0x02, 0x34, 0x00, 0x00, 0x40, 0x00, 0x40, 0x06, 0x00, 0x00, 0x0a, 0x01, 0x14, 0x74, 0x0a, 0x01, 0x14, 0x74,
// 	0xd0, 0x49, 0xe6, 0x2d, 0x81, 0x23, 0x30, 0x2f, 0xc9, 0x24, 0xd5, 0x71, 0x80, 0x18, 0x18, 0xea, 0x3f, 0x10, 0x00, 0x00, 0x01, 0x01, 0x08, 0x0a,
// 	0xfb, 0xa6, 0xab, 0xe7, 0x6c, 0x29, 0x37, 0x8d, 0xca, 0x02, 0x40, 0x0a, 0xf8, 0x01, 0x00, 0x00, 0x51, 0x60, 0x70, 0x80, 0x08, 0xff, 0xfd, 0x01,
// 	0x00, 0x80, 0x16, 0x65, 0x70, 0x69, 0x63, 0x73, 0x3a, 0x6e, 0x74, 0x2f, 0x4e, 0x54, 0x4e, 0x44, 0x41, 0x72, 0x72, 0x61, 0x79, 0x3a, 0x31, 0x2e,
// 	0x30, 0x09, 0x05, 0x76, 0x61, 0x6c, 0x75, 0x65, 0xfd, 0x02, 0x00, 0x81, 0x00, 0x0b, 0x0c, 0x62, 0x6f, 0x6f, 0x6c, 0x65, 0x61, 0x6e, 0x56, 0x61,
// 	0x6c, 0x75, 0x65, 0x08, 0x09, 0x62, 0x79, 0x74, 0x65, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x28, 0x0a, 0x73, 0x68, 0x6f, 0x72, 0x74, 0x56, 0x61, 0x6c,
// 	0x75, 0x65, 0x29, 0x08, 0x69, 0x6e, 0x74, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x2a, 0x09, 0x6c, 0x6f, 0x6e, 0x67, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x2b,
// 	0x0a, 0x75, 0x62, 0x79, 0x74, 0x65, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x2c, 0x0b, 0x75, 0x73, 0x68, 0x6f, 0x72, 0x74, 0x56, 0x61, 0x6c, 0x75, 0x65,
// 	0x2d, 0x09, 0x75, 0x69, 0x6e, 0x74, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x2e, 0x0a, 0x75, 0x6c, 0x6f, 0x6e, 0x67, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x2f,
// 	0x0a, 0x66, 0x6c, 0x6f, 0x61, 0x74, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x4a, 0x0b, 0x64, 0x6f, 0x75, 0x62, 0x6c, 0x65, 0x56, 0x61, 0x6c, 0x75, 0x65,
// 	0x4b, 0x05, 0x63, 0x6f, 0x64, 0x65, 0x63, 0xfd, 0x03, 0x00, 0x80, 0x07, 0x63, 0x6f, 0x64, 0x65, 0x63, 0x5f, 0x74, 0x02, 0x04, 0x6e, 0x61, 0x6d,
// 	0x65, 0x60, 0x0a, 0x70, 0x61, 0x72, 0x61, 0x6d, 0x65, 0x74, 0x65, 0x72, 0x73, 0xfd, 0x04, 0x00, 0x82, 0x0e, 0x63, 0x6f, 0x6d, 0x70, 0x72, 0x65,
// 	0x73, 0x73, 0x65, 0x64, 0x53, 0x69, 0x7a, 0x65, 0x23, 0x10, 0x75, 0x6e, 0x63, 0x6f, 0x6d, 0x70, 0x72, 0x65, 0x73, 0x73, 0x65, 0x64, 0x53, 0x69,
// 	0x7a, 0x65, 0x23, 0x09, 0x64, 0x69, 0x6d, 0x65, 0x6e, 0x73, 0x69, 0x6f, 0x6e, 0xfd, 0x05, 0x00, 0x88, 0xfd, 0x06, 0x00, 0x80, 0x0b, 0x64, 0x69,
// 	0x6d, 0x65, 0x6e, 0x73, 0x69, 0x6f, 0x6e, 0x5f, 0x74, 0x05, 0x04, 0x73, 0x69, 0x7a, 0x65, 0x22, 0x06, 0x6f, 0x66, 0x66, 0x73, 0x65, 0x74, 0x22,
// 	0x08, 0x66, 0x75, 0x6c, 0x6c, 0x53, 0x69, 0x7a, 0x65, 0x22, 0x07, 0x62, 0x69, 0x6e, 0x6e, 0x69, 0x6e, 0x67, 0x22, 0x07, 0x72, 0x65, 0x76, 0x65,
// 	0x72, 0x73, 0x65, 0x00, 0x08, 0x75, 0x6e, 0x69, 0x71, 0x75, 0x65, 0x49, 0x64, 0x22, 0x0d, 0x64, 0x61, 0x74, 0x61, 0x54, 0x69, 0x6d, 0x65, 0x53,
// 	0x74, 0x61, 0x6d, 0x70, 0xfd, 0x07, 0x00, 0x80, 0x06, 0x74, 0x69, 0x6d, 0x65, 0x5f, 0x74, 0x03, 0x10, 0x73, 0x65, 0x63, 0x6f, 0x6e, 0x64, 0x73,
// 	0x50, 0x61, 0x73, 0x74, 0x45, 0x70, 0x6f, 0x63, 0x68, 0x23, 0x0b, 0x6e, 0x61, 0x6e, 0x6f, 0x73, 0x65, 0x63, 0x6f, 0x6e, 0x64, 0x73, 0x22, 0x07,
// 	0x75, 0x73, 0x65, 0x72, 0x54, 0x61, 0x67, 0x22, 0x09, 0x61, 0x74, 0x74, 0x72, 0x69, 0x62, 0x75, 0x74, 0x65, 0xfd, 0x08, 0x00, 0x88, 0xfd, 0x09,
// 	0x00, 0x80, 0x18, 0x65, 0x70, 0x69, 0x63, 0x73, 0x3a, 0x6e, 0x74, 0x2f, 0x4e, 0x54, 0x41, 0x74, 0x74, 0x72, 0x69, 0x62, 0x75, 0x74, 0x65, 0x3a,
// 	0x31, 0x2e, 0x30, 0x05, 0x04, 0x6e, 0x61, 0x6d, 0x65, 0x60, 0x05, 0x76, 0x61, 0x6c, 0x75, 0x65, 0xfe, 0x04, 0x00, 0x0a, 0x64, 0x65, 0x73, 0x63,
// 	0x72, 0x69, 0x70, 0x74, 0x6f, 0x72, 0x60, 0x0a, 0x73, 0x6f, 0x75, 0x72, 0x63, 0x65, 0x54, 0x79, 0x70, 0x65, 0x22, 0x06, 0x73, 0x6f, 0x75, 0x72,
// 	0x63, 0x65, 0x60, 0x09, 0x74, 0x69, 0x6d, 0x65, 0x53, 0x74, 0x61, 0x6d, 0x70, 0xfe, 0x07, 0x00,
// ];

// // big endian
// let input2 = [
// 	0xfd, 0x00, 0x01, 0x80, 0x10, 0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65, 0x53, 0x74, 0x72, 0x75, 0x63, 0x74, 0x75, 0x72, 0x65, 0x07, 0x05, 0x76,
// 	0x61, 0x6c, 0x75, 0x65, 0x28, 0x10, 0x62, 0x6f, 0x75, 0x6e, 0x64, 0x65, 0x64, 0x53, 0x69, 0x7a, 0x65, 0x41, 0x72, 0x72, 0x61, 0x79, 0x30, 0x10,
// 	0x0e, 0x66, 0x69, 0x78, 0x65, 0x64, 0x53, 0x69, 0x7a, 0x65, 0x41, 0x72, 0x72, 0x61, 0x79, 0x38, 0x04, 0x09, 0x74, 0x69, 0x6d, 0x65, 0x53, 0x74,
// 	0x61, 0x6d, 0x70, 0xfd, 0x00, 0x02, 0x80, 0x06, 0x74, 0x69, 0x6d, 0x65, 0x5f, 0x74, 0x03, 0x10, 0x73, 0x65, 0x63, 0x6f, 0x6e, 0x64, 0x73, 0x50,
// 	0x61, 0x73, 0x74, 0x45, 0x70, 0x6f, 0x63, 0x68, 0x23, 0x0b, 0x6e, 0x61, 0x6e, 0x6f, 0x73, 0x65, 0x63, 0x6f, 0x6e, 0x64, 0x73, 0x22, 0x07, 0x75,
// 	0x73, 0x65, 0x72, 0x54, 0x61, 0x67, 0x22, 0x05, 0x61, 0x6c, 0x61, 0x72, 0x6d, 0xfd, 0x00, 0x03, 0x80, 0x07, 0x61, 0x6c, 0x61, 0x72, 0x6d, 0x5f,
// 	0x74, 0x03, 0x08, 0x73, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0x06, 0x73, 0x74, 0x61, 0x74, 0x75, 0x73, 0x22, 0x07, 0x6d, 0x65, 0x73,
// 	0x73, 0x61, 0x67, 0x65, 0x60, 0x0a, 0x76, 0x61, 0x6c, 0x75, 0x65, 0x55, 0x6e, 0x69, 0x6f, 0x6e, 0xfd, 0x00, 0x04, 0x81, 0x00, 0x03, 0x0b, 0x73,
// 	0x74, 0x72, 0x69, 0x6e, 0x67, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x60, 0x08, 0x69, 0x6e, 0x74, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x22, 0x0b, 0x64, 0x6f,
// 	0x75, 0x62, 0x6c, 0x65, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x43, 0x0c, 0x76, 0x61, 0x72, 0x69, 0x61, 0x6e, 0x74, 0x55, 0x6e, 0x69, 0x6f, 0x6e, 0xfd,
// 	0x00, 0x05, 0x82,
// ];

// const buffer1 = Buffer.from(input1).slice(0x46);
// const a = new PvaData_type(buffer1, Pva_MESSAGE_ENDIANNESS.LITTLE);
// const k = {
// 	value: { "3": [98] },
// 	codec: { name: "utf8", parameters: {} },
// 	compressedSize: 998,
// 	uncompressedSize: 999,
// 	dimension: [
// 		{
// 			size: 10,
// 			offset: 9,
// 			fullSize: 8,
// 			binning: 7,
// 			reverse: 6,
// 		},
// 		{
// 			size: 10,
// 			offset: 9,
// 			fullSize: 8,
// 			binning: 7,
// 			reverse: 6,
// 		},
// 	],
// 	uniqueId: 4,
// 	dataTimeStamp: {
// 		secondsPastEpoch: 88,
// 		nanoseconds: 89,
// 		userTag: 5,
// 	},
// 	attribute: [
// 		{
// 			name: "attribute1",
// 			value: {},
// 			descriptor: "abcd",
// 			sourceType: -5,
// 			source: "camera",
// 		},
// 		{
// 			name: "attribute1",
// 			value: {},
// 			descriptor: "abcd",
// 			sourceType: -5,
// 			source: "camera",
// 		},
// 	],
// 	timeStamp: {
// 		secondsPastEpoch: 88,
// 		nanoseconds: 89,
// 		userTag: 5,
// 	},
// };
// console.log(a.isThisType(k));

// const k3 = [
// 	0x02, 0x00, 0x00, 0x00, 0x45, 0x00, 0x00, 0xda, 0x00, 0x00, 0x40, 0x00, 0x40, 0x06, 0x00, 0x00, 0x0a, 0x9f, 0xdb, 0x98, 0x0a, 0x9f, 0xdb, 0x98,
// 	0xcc, 0x91, 0xcc, 0xbb, 0xe2, 0x63, 0x09, 0xac, 0xfd, 0x6c, 0xe1, 0x5d, 0x80, 0x18, 0x18, 0xe9, 0xcd, 0x3b, 0x00, 0x00, 0x01, 0x01, 0x08, 0x0a,
// 	0x3c, 0x30, 0xa9, 0xb0, 0xed, 0xcc, 0x2e, 0x68, 0xca, 0x02, 0x40, 0x0a, 0x9e, 0x00, 0x00, 0x00, 0x51, 0x60, 0x70, 0x80, 0x00, 0xff, 0x01, 0x01,
// 	0x02, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0xff, 0xff,
// 	0x00, 0x00, 0x00, 0xff, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x01, 0x03, 0x00,
// 	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x01, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
// 	0x04, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0xbd, 0xff, 0xff, 0xff, 0xc5, 0x72, 0x93, 0x63, 0x00, 0x00, 0x00, 0x00, 0x78, 0xe0, 0xf4,
// 	0x16, 0x00, 0x00, 0x00, 0x00, 0x01, 0x01, 0x09, 0x43, 0x6f, 0x6c, 0x6f, 0x72, 0x4d, 0x6f, 0x64, 0x65, 0x22, 0x00, 0x00, 0x00, 0x00, 0x0a, 0x43,
// 	0x6f, 0x6c, 0x6f, 0x72, 0x20, 0x6d, 0x6f, 0x64, 0x65, 0x00, 0x00, 0x00, 0x00, 0x00, 0xc5, 0x72, 0x93, 0x63, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf4,
// 	0xf4, 0x16, 0x00, 0x00, 0x00, 0x00,
// ];

// const k4 = Buffer.from(k3);

// a.decodeBufferData(k4, 0x48);

// --------------------

// const buffer2 = Buffer.from(input2);
// const b = new PvaData_type(buffer2, Pva_MESSAGE_ENDIANNESS.BIG);
// const k2 = {
// 	value: [22, 38],
// 	boundedSizeArray: [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4],
// 	fixedSizeArray: [1, 2, 3, 4],
// 	timeStamp: {
// 		secondsPastEpoch: 999,
// 		nanoseconds: 998,
// 		userTag: 23,
// 	},
// 	alarm: {
// 		severity: 9,
// 		status: 8,
// 		message: "error",
// 	},
// 	valueUnion: { "1": 27 },
// 	variantUnion: {},
// };
// console.log(b.isThisType(k2));

// const j = [
// 	0x03, 0x01, 0x02, 0x03, 0x05, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0xaa, 0xbb,
// 	0xcc, 0xdd, 0xee, 0xee, 0xee, 0xee, 0x11, 0x11, 0x11, 0x11, 0x22, 0x22, 0x22, 0x22, 0x0b, 0x41, 0x6c, 0x6c, 0x6f, 0x2c, 0x20, 0x41, 0x6c, 0x6c,
// 	0x6f, 0x21, 0x01, 0x33, 0x33, 0x33, 0x33, 0x60, 0x1c, 0x53, 0x74, 0x72, 0x69, 0x6e, 0x67, 0x20, 0x69, 0x6e, 0x73, 0x69, 0x64, 0x65, 0x20, 0x76,
// 	0x61, 0x72, 0x69, 0x61, 0x6e, 0x74, 0x20, 0x75, 0x6e, 0x69, 0x6f, 0x6e, 0x2e,
// ];
// const j1 = Buffer.from(j);

// b.decodeBufferData(j1, 0);

const type1 = {
	type: "complex_scalar_structure",
	newOffset: 498,
	id: 1,
	tag: undefined,
};
const typesById1 = {
	"1": {
		type: "complex_scalar_structure",
		newOffset: 498,
		properties: {
			value: { type: "integer_scalar_signedInt", newOffset: 171 },
			value2: { type: "floatingPoint_scalar_binary64", newOffset: 171 },
			array1: { type: "floatingPoint_fixedSizeArray_binary32", newOffset: 171, id: 2 },
			union1: { type: "complex_scalar_union", newOffset: 171, id: 3 },
			variableSizeArray1: { type: "complex_variableSizeArray_structure", newOffset: 171, id: 4 },
		},
		name: "epics:nt/NTNDArray:1.0",
		id: 1,
	},
	"2": {
		type: "floatingPoint_fixedSizeArray_binary32",
		newOffset: 171,
		size: 10,
		element: { type: "floatingPoint_scalar_binary32", newOffset: 171 },
		id: 2,
	},
	"3": {
		type: "complex_scalar_union",
		newOffset: 171,
		id: 3,
		choices: {
			choice1: { type: "integer_scalar_signedInt", newOffset: 171 },
			choice2: { type: "floatingPoint_scalar_binary64", newOffset: 171 },
		},
	},
	"4": {
		type: "complex_variableSizeArray_structure",
		newOffset: 171,
		id: 4,
		element: { type: "complex_scalar_structure", id: 5, newOffset: 171 },
	},
	"5": {
		type: "complex_scalar_structure",
		id: 5,
		newOffset: 171,
		properties: {
			prop1: { type: "integer_scalar_signedInt", newOffset: 171 },
			prop2: { type: "string_scalar", newOffset: 171 },
		},
        name: "abc",
	},
};

const data = {
	value: 55,
	value2: 38,
	array1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
	union1: {
		choice2: 97,
	},
	variableSizeArray1: [{ prop1: 9, prop2: "nam1" }, {}, { prop1: 10, prop2: "nam2" }],
};

PvaData_type_methods.setTypesById(typesById1);
const buffer = Buffer.alloc(200);
PvaData_type_methods.encodeBufferTypeDef(type1, buffer, Pva_MESSAGE_ENDIANNESS.BIG, 0);
console.log(buffer.toString("hex").match(/../g).join(" "));

// PvaData_type_methods.setTypesById(typesById1);
// const buffer = Buffer.alloc(100);
// PvaData_type_methods.encodeBufferData(data, type1, buffer, Pva_MESSAGE_ENDIANNESS.BIG, 0);
// // console.log(buffer)

// console.log(buffer.toString("hex").match(/../g).join(" "));

// const l1 = [
// 	0x00, 0x00, 0x00, 0x37, 0x40, 0x43, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x3f, 0x80, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00, 0x40, 0x40, 0x00, 0x00,
// 	0x40, 0x80, 0x00, 0x00, 0x40, 0xa0, 0x00, 0x00, 0x40, 0xc0, 0x00, 0x00, 0x40, 0xe0, 0x00, 0x00, 0x41, 0x00, 0x00, 0x00, 0x41, 0x10, 0x00, 0x00,
// 	0x41, 0x20, 0x00, 0x00, 0x01, 0x40, 0x58, 0x40, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x01, 0x00, 0x00, 0x00, 0x09, 0x04, 0x6e, 0x61, 0x6d, 0x31,
// 	0x00, 0x01, 0x00, 0x00, 0x00, 0x0a, 0x04, 0x6e, 0x61, 0x6d, 0x32, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
// 	0x00, 0x00, 0x00, 0x00,
// ];

// const l2 = Buffer.from(l1);

// console.dir(PvaData_type_methods.decodeBufferData(type1, l2, 0, Pva_MESSAGE_ENDIANNESS.BIG), { depth: null });

// ----------------- test checking type ----------------------

//todo: show where is it wrong, and what is wrong
//todo: think high level work: how to organize data and functions
//todo: type def --> buffer

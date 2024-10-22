import { PvaGlobalMethods, Pva_MESSAGE_ENDIANNESS } from "../Global/PvaGlobalMethods";
import { PvaData_TYPES } from "./PvaData_typeEncoding";
import { type_def } from "./PvaType";
import { PvaTypes } from "./unused/PvaTypeSerializer";

export class PvaTypeStaticMethods1 {
    constructor() {}

	// ---------------- deserialize a type ------------------------

	// The "type definition" does not include anything like structure property name or union choice name, it is part of
	// the structure or union, not part of a "type definition"
	// start = location of 0xfd/0xfc/0xfe or a primitive "field description code"
	 deserialize = (
		buffer: Buffer,
		start: number,
		endianness: Pva_MESSAGE_ENDIANNESS,
		typesById: Record<string, type_def | undefined>
	): type_def => {
		let result: type_def = { type: "", newOffset: -1 };

		let offset = start;
		// 0xfd/0xfc/0xfe/0xff, or a primitive "field description code"
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
			typesById[id.toString()] = undefined;
			// if 0xfc, there is a 4-byte integer type tag
			let tag: number | undefined = undefined;
			if (value === 0xfc) {
				tag = PvaGlobalMethods.bufferReadInt32(buffer, endianness, offset);
				offset = offset + 4;
			}

			// "offset" is at the location of "field description code"
			result = this.deserialize(buffer, offset, endianness, typesById);

			// add id and tag
			result.id = id;
			result.tag = tag;

			// find if there is an existing id, "id" is read from buffer
			const existingResult = typesById[id.toString()];
			if (
				existingResult !== undefined &&
				existingResult.id === id &&
				existingResult.tag !== undefined &&
				tag !== undefined &&
				existingResult.tag === tag
			) {
				// do not override when (1) the id and tag are same, and (2) the tag is not "undefined"
			} else {
				typesById[id.toString()] = JSON.parse(JSON.stringify(result));
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
			const dataType = typesById[id.toString()];
			if (dataType === undefined) {
				const errorMsg = `Type ID ${id} does not exist.`;
				throw new Error(errorMsg);
			}
			result = { type: dataType.type, id: id, newOffset: offset };
		} else if (value === 0xff) {
			// NULL_TYPE_CODE, no introspection data (also implies no data)
			result = { type: "NULL", newOffset: offset };
		} else if (PvaData_TYPES[value].split("_")[1] === "scalar" && PvaData_TYPES[value].split("_")[2] === "structure") {
			result = this.deserializeScalarStructure(buffer, offset - 1, endianness, typesById);
		} else if (PvaData_TYPES[value].split("_")[1] === "scalar" && PvaData_TYPES[value].split("_")[2] === "union") {
			result = this.deserializeScalarUnion(buffer, offset - 1, endianness, typesById);
		} else if (PvaData_TYPES[value].split("_")[1] === "scalar" && PvaData_TYPES[value].split("_")[2] === "variantUnion") {
			result = this.deserializeScalarVariantUnion(buffer, offset - 1, endianness, typesById);
		}
		// "value" is the "field description code"
		// "arrays" have 51 types
		else if (PvaData_TYPES[value].split("_")[1] === "fixedSizeArray") {
			result = this.deserializeFixedSizeArray(buffer, offset - 1, endianness, typesById);
		} else if (PvaData_TYPES[value].split("_")[1] === "variableSizeArray") {
			result = this.deserializeVariableSizeArray(buffer, offset - 1, endianness, typesById);
		} else if (PvaData_TYPES[value].split("_")[1] === "boundedSizeArray") {
			result = this.deserializeBoundedSizeArray(buffer, offset - 1, endianness, typesById);
		} else if (PvaData_TYPES[value].split("_")[1] === "scalar" && PvaData_TYPES[value].split("_")[2] === "boundedString") {
			// 	complex_scalar_boundedString = 0x83,
			result = this.deserializeScalarBoundedString(buffer, offset - 1, endianness, typesById);
		} else {
			// "field description code" can fully describe the data type
			result = { type: PvaData_TYPES[value], newOffset: offset - 1 + 1 };
		}
		return result;
	};

	// "field description code" + bounded size
	// new field: size
	 deserializeScalarBoundedString = (
		buffer: Buffer,
		start: number,
		endianness: Pva_MESSAGE_ENDIANNESS,
		typesById: Record<string, type_def | undefined>
	): type_def => {
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
	 deserializeFixedSizeArray = (
		buffer: Buffer,
		start: number,
		endianness: Pva_MESSAGE_ENDIANNESS,
		typesById: Record<string, type_def | undefined>
	): type_def => {
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
			const element = this.deserialize(buffer, offset, endianness, typesById);
			result.element = element;
			result.newOffset = element.newOffset;
		} else {
			const element = { type: result.type.replace("fixedSizeArray", "scalar"), newOffset: result.newOffset };
			result.element = element;
		}

		return result;
	};

	 deserializeBoundedSizeArray = (
		buffer: Buffer,
		start: number,
		endianness: Pva_MESSAGE_ENDIANNESS,
		typesById: Record<string, type_def | undefined>
	): type_def => {
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
			const element = this.deserialize(buffer, offset, endianness, typesById);
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
	 deserializeVariableSizeArray = (
		buffer: Buffer,
		start: number,
		endianness: Pva_MESSAGE_ENDIANNESS,
		typesById: Record<string, type_def | undefined>
	): type_def => {
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
			const element = this.deserialize(buffer, offset, endianness, typesById);
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
	 deserializeScalarStructure = (
		buffer: Buffer,
		start: number,
		endianness: Pva_MESSAGE_ENDIANNESS,
		typesById: Record<string, type_def | undefined>
	): type_def => {
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
			let prop = this.deserializeScalarStructureProp(buffer, offset, endianness, typesById);
			result["properties"][prop.name] = prop.def;
			offset = prop.def.newOffset;
			result.newOffset = prop.def.newOffset;
		}

		return result;
	};

	// start = location after the number of structure properties
	// name (string) + type
	 deserializeScalarStructureProp = (
		buffer: Buffer,
		start: number,
		endianness: Pva_MESSAGE_ENDIANNESS,
		typesById: Record<string, type_def | undefined>
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
		let typeTmp = this.deserialize(buffer, offset, endianness, typesById);
		result.def = typeTmp;
		result.newOffset = typeTmp.newOffset;

		return result as {
			name: string;
			def: type_def;
			newOffset: number;
		};
	};

	// start = location of the "field description code" 0x81
	 deserializeScalarUnion = (
		buffer: Buffer,
		start: number,
		endianness: Pva_MESSAGE_ENDIANNESS,
		typesById: Record<string, type_def | undefined>
	): type_def => {
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
			let choice = this.deserializeScalarUnionChoice(buffer, offset, endianness, typesById);
			result["choices"][choice.name] = choice.def;
			offset = choice.def.newOffset;
			result.newOffset = offset;
		}

		return result;
	};

	// start = location after the number of structure properties
	// name (string) + type
	 deserializeScalarUnionChoice = (
		buffer: Buffer,
		start: number,
		endianness: Pva_MESSAGE_ENDIANNESS,
		typesById: Record<string, type_def | undefined>
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
		let typeTmp = this.deserialize(buffer, offset, endianness, typesById);
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
	 deserializeScalarVariantUnion = (
		buffer: Buffer,
		start: number,
		endianness: Pva_MESSAGE_ENDIANNESS,
		typesById: Record<string, type_def | undefined>
	): type_def => {
		const result: type_def = { type: "", newOffset: -1 };
		let offset = start;

		// "field description code"
		let fieldDescCode = PvaGlobalMethods.bufferReadUInt8(buffer, endianness, offset);
		offset = offset + 1;
		result.type = PvaData_TYPES[fieldDescCode];
		result.newOffset = offset;

		return result;
	};

	// --------------- serialize a type ----------------
	private  serializedIds: number[] = [];

	 serializePrimitive = (
		typeDef: type_def,
		buffer: Buffer,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number,
		typesById: Record<string, type_def | undefined>
	): number => {
		const typeDefFull = this.getTypeDefFull(typeDef, typesById);
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

	 serializeFixedSizeArray = (
		typeDef: type_def,
		buffer: Buffer,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number,
		typesById: Record<string, type_def | undefined>
	) => {
		const typeDefFull = this.getTypeDefFull(typeDef, typesById);
		const type = typeDefFull.type;
		//todo: how to eliminate the error
		const fieldDescCode: PvaData_TYPES = PvaData_TYPES[type];
		let offset = start;

		// if the typeDef contains an ID property, it means it must be encoded as 0xfe/0xfd/0xfc format
		const hasAnId: boolean = typeDefFull.id === undefined ? false : true;
		if (hasAnId) {
			if (this.serializedIds.includes(typeDefFull.id)) {
				// write 0xfe
				PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, 0xfe, offset);
				offset = offset + 1;
				// write id as a 2-byte short
				PvaGlobalMethods.bufferWriteUInt16(buffer, endianness, typeDefFull.id, offset);
				offset = offset + 2;
				return offset;
			} else {
				this.serializedIds.push(typeDefFull.id);
				// write 0xfd
				PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, 0xfd, offset);
				offset = offset + 1;
				// write id as a 2-byte short
				PvaGlobalMethods.bufferWriteUInt16(buffer, endianness, typeDefFull.id, offset);
				offset = offset + 2;
			}
		}
		// write "field description code"
		PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, fieldDescCode, offset);
		offset = offset + 1;

		// write array size as a size
		offset = this.writeSize(typeDefFull.size, buffer, offset, endianness);

		if (hasAnId) {
			// write the element type
			const elementTypeDef = typeDefFull.element;
			offset = this.serialize(elementTypeDef, buffer, endianness, offset, typesById);
		}
		return offset;
	};

	 serializeBoundedSizeArray = (
		typeDef: type_def,
		buffer: Buffer,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number,
		typesById: Record<string, type_def | undefined>
	) => {
		const typeDefFull = this.getTypeDefFull(typeDef, typesById);
		const type = typeDefFull.type;
		//todo: how to eliminate the error
		const fieldDescCode: PvaData_TYPES = PvaData_TYPES[type];
		let offset = start;

		// if the typeDef contains an ID property, it means it must be encoded as 0xfe/0xfd/0xfc format
		const hasAnId: boolean = typeDefFull.id === undefined ? false : true;
		if (hasAnId) {
			if (this.serializedIds.includes(typeDefFull.id)) {
				// write 0xfe
				PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, 0xfe, offset);
				offset = offset + 1;
				// write id as a 2-byte short
				PvaGlobalMethods.bufferWriteUInt16(buffer, endianness, typeDefFull.id, offset);
				offset = offset + 2;
				return offset;
			} else {
				this.serializedIds.push(typeDefFull.id);
				// write 0xfd
				PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, 0xfd, offset);
				offset = offset + 1;
				// write id as a 2-byte short
				PvaGlobalMethods.bufferWriteUInt16(buffer, endianness, typeDefFull.id, offset);
				offset = offset + 2;
			}
		}
		// write "field description code"
		PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, fieldDescCode, offset);
		offset = offset + 1;

		// write array size bound as a size
		offset = this.writeSize(typeDefFull.size, buffer, offset, endianness);

		if (hasAnId) {
			// write the element type
			const elementTypeDef = typeDefFull.element;
			offset = this.serialize(elementTypeDef, buffer, endianness, offset, typesById);
		}
		return offset;
	};

	 serializeVariableSizeArray = (
		typeDef: type_def,
		buffer: Buffer,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number,
		typesById: Record<string, type_def | undefined>
	) => {
		const typeDefFull = this.getTypeDefFull(typeDef, typesById);
		const type = typeDefFull.type;
		//todo: how to eliminate the error
		const fieldDescCode: PvaData_TYPES = PvaData_TYPES[type];
		let offset = start;

		// if the typeDef contains an ID property, it means it must be encoded as 0xfe/0xfd/0xfc format
		const hasAnId: boolean = typeDefFull.id === undefined ? false : true;
		if (hasAnId) {
			if (this.serializedIds.includes(typeDefFull.id)) {
				// write 0xfe
				PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, 0xfe, offset);
				offset = offset + 1;
				// write id as a 2-byte short
				PvaGlobalMethods.bufferWriteUInt16(buffer, endianness, typeDefFull.id, offset);
				offset = offset + 2;
				return offset;
			} else {
				this.serializedIds.push(typeDefFull.id);
				// write 0xfd
				PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, 0xfd, offset);
				offset = offset + 1;
				// write id as a 2-byte short
				PvaGlobalMethods.bufferWriteUInt16(buffer, endianness, typeDefFull.id, offset);
				offset = offset + 2;
			}
		}
		// write "field description code"
		PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, fieldDescCode, offset);
		offset = offset + 1;

		if (hasAnId) {
			// write the element type
			const elementTypeDef = typeDefFull.element;
			offset = this.serialize(elementTypeDef, buffer, endianness, offset, typesById);
		}
		return offset;
	};

	 serializeBoundedString = (
		typeDef: type_def,
		buffer: Buffer,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number,
		typesById: Record<string, type_def | undefined>
	) => {
		const typeDefFull = this.getTypeDefFull(typeDef, typesById);
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

	 serializeVariantUnion = (
		typeDef: type_def,
		buffer: Buffer,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number,
		typesById: Record<string, type_def | undefined>
	) => {
		const typeDefFull = this.getTypeDefFull(typeDef, typesById);
		const type = typeDefFull.type;
		//todo: how to eliminate the error
		const fieldDescCode: PvaData_TYPES = PvaData_TYPES[type];
		let offset = start;

		// if the typeDef contains an ID property, it means it must be encoded as 0xfe/0xfd/0xfc format
		const hasAnId: boolean = typeDefFull.id === undefined ? false : true;
		if (hasAnId) {
			if (this.serializedIds.includes(typeDefFull.id)) {
				// write 0xfe
				PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, 0xfe, offset);
				offset = offset + 1;
				// write id as a 2-byte short
				PvaGlobalMethods.bufferWriteUInt16(buffer, endianness, typeDefFull.id, offset);
				offset = offset + 2;
				return offset;
			} else {
				this.serializedIds.push(typeDefFull.id);
				// write 0xfd
				PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, 0xfd, offset);
				offset = offset + 1;
				// write id as a 2-byte short
				PvaGlobalMethods.bufferWriteUInt16(buffer, endianness, typeDefFull.id, offset);
				offset = offset + 2;
			}
		}
		// write "field description code"
		PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, fieldDescCode, offset);
		offset = offset + 1;

		// variant union does not have any chioce, its type def is encoded in the data

		return offset;
	};

	 serializeUnion = (
		typeDef: type_def,
		buffer: Buffer,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number,
		typesById: Record<string, type_def | undefined>
	) => {
		const typeDefFull = this.getTypeDefFull(typeDef, typesById);
		const type = typeDefFull.type;
		//todo: how to eliminate the error
		const fieldDescCode: PvaData_TYPES = PvaData_TYPES[type];
		let offset = start;

		// if the typeDef contains an ID property, it means it must be encoded as 0xfe/0xfd/0xfc format
		const hasAnId: boolean = typeDefFull.id === undefined ? false : true;
		if (hasAnId) {
			if (this.serializedIds.includes(typeDefFull.id)) {
				// write 0xfe
				PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, 0xfe, offset);
				offset = offset + 1;
				// write id as a 2-byte short
				PvaGlobalMethods.bufferWriteUInt16(buffer, endianness, typeDefFull.id, offset);
				offset = offset + 2;
				return offset;
			} else {
				this.serializedIds.push(typeDefFull.id);
				// write 0xfd
				PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, 0xfd, offset);
				offset = offset + 1;
				// write id as a 2-byte short
				PvaGlobalMethods.bufferWriteUInt16(buffer, endianness, typeDefFull.id, offset);
				offset = offset + 2;
			}
		}
		// write "field description code"
		PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, fieldDescCode, offset);
		offset = offset + 1;

		// write number of choices as a size
		// todo: not likely! Seems like in format of BIG endian with short. Need to clarify!!
		const choiceNames = Object.keys(typeDefFull.choices);
		const numChoices = choiceNames.length;
		// offset = this.writeSize(numChoices, buffer, offset, endianness);
		PvaGlobalMethods.bufferWriteUInt16(buffer, Pva_MESSAGE_ENDIANNESS.BIG, numChoices, offset);
		offset = offset + 2;

		for (let ii = 0; ii < numChoices; ii++) {
			// write choice name
			const choiceName = choiceNames[ii];
			offset = this.writeString(choiceName, buffer, endianness, offset);
			// write choice type def
			const choiceTypeDef = typeDefFull.choices[choiceName];
			offset = this.serialize(choiceTypeDef, buffer, endianness, offset, typesById);
		}
		return offset;
	};

	 serializeStructure = (
		typeDef: type_def,
		buffer: Buffer,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number,
		typesById: Record<string, type_def | undefined>
	) => {
		const typeDefFull = this.getTypeDefFull(typeDef, typesById);
		const type = typeDefFull.type;
		//todo: how to eliminate the error
		const fieldDescCode: PvaData_TYPES = PvaData_TYPES[type];
		let offset = start;

		// if the typeDef contains an ID property, it means it must be encoded as 0xfe/0xfd/0xfc format
		const hasAnId: boolean = typeDefFull.id === undefined ? false : true;
		if (hasAnId) {
			if (this.serializedIds.includes(typeDefFull.id)) {
				// write 0xfe
				PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, 0xfe, offset);
				offset = offset + 1;
				// write id as a 2-byte short
				PvaGlobalMethods.bufferWriteUInt16(buffer, endianness, typeDefFull.id, offset);
				offset = offset + 2;
				return offset;
			} else {
				this.serializedIds.push(typeDefFull.id);
				// write 0xfd
				PvaGlobalMethods.bufferWriteUInt8(buffer, endianness, 0xfd, offset);
				offset = offset + 1;
				// write id as a 2-byte short
				PvaGlobalMethods.bufferWriteUInt16(buffer, endianness, typeDefFull.id, offset);
				offset = offset + 2;
			}
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
			offset = this.writeString(propName, buffer, endianness, offset);
			// write property type def
			const propTypeDef = typeDefFull.properties[propName];
			offset = this.serialize(propTypeDef, buffer, endianness, offset, typesById);
		}
		return offset;
	};

	 serialize = (
		typeDef: type_def,
		buffer: Buffer,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number,
		typesById: Record<string, type_def | undefined>
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
			offset = this.serializePrimitive(typeDef, buffer, endianness, offset, typesById);
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
			offset = this.serializeFixedSizeArray(typeDef, buffer, endianness, offset, typesById);
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
			offset = this.serializeVariableSizeArray(typeDef, buffer, endianness, offset, typesById);
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
			offset = this.serializeBoundedSizeArray(typeDef, buffer, endianness, offset, typesById);
		}
		// complex_scalar_boundedString = 0x83,
		else if (typeDef.type === "complex_scalar_boundedString") {
			offset = this.serializeBoundedString(typeDef, buffer, endianness, offset, typesById);
		}
		// complex_scalar_variantUnion = 0x82,
		else if (typeDef.type === "complex_scalar_variantUnion") {
			offset = this.serializeVariantUnion(typeDef, buffer, endianness, offset, typesById);
		}
		// complex_scalar_union = 0x81,
		else if (typeDef.type === "complex_scalar_union") {
			offset = this.serializeUnion(typeDef, buffer, endianness, offset, typesById);
		}
		// complex_scalar_structure = 0x80,
		else if (typeDef.type === "complex_scalar_structure") {
			offset = this.serializeStructure(typeDef, buffer, endianness, offset, typesById);
		} else {
			//todo
			throw new Error("Wrong!");
		}
		return offset;
	};

	// --------------- check if a data is a particular type --------------------

	// check if "data" is of type "id"
	 checkStructure = (data: any, typeDef: type_def, typesById: Record<string, type_def | undefined>): boolean => {
		const typeDefFull = this.getTypeDefFull(typeDef, typesById);
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
			if (this.checkType(data[propertyName], typeDefFull.properties[propertyName], typesById) === false) {
				return false;
			}
		}
		return true;
	};

	// data = {choice # : value}
	 checkUnion = (data: any, typeDef: type_def, typesById: Record<string, type_def | undefined>): boolean => {
		const typeDefFull = this.getTypeDefFull(typeDef, typesById);

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
		return this.checkType(Object.values(data)[0], choiceTypeDef, typesById);
	};

	 checkVariantUnion = (data: any, typeDef: type_def, typesById: Record<string, type_def | undefined>): boolean => {
		//todo
		return true;
	};
	 checkBoundedString = (data: any, typeDef: type_def, typesById: Record<string, type_def | undefined>): boolean => {
		const typeDefFull = this.getTypeDefFull(typeDef, typesById);

		const size = typeDefFull.size;
		if (typeof data !== "string" || data.length > size) {
			return false;
		}
		return true;
	};

	 checkFixedSizeArray = (data: any, typeDef: type_def, typesById: Record<string, type_def | undefined>): boolean => {
		const typeDefFull = this.getTypeDefFull(typeDef, typesById);

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
				if (this.checkType(element, elementTypeDef, typesById) === false) {
					return false;
				}
			}
		}
		return true;
	};

	 checkBoundedSizeArray = (data: any, typeDef: type_def, typesById: Record<string, type_def | undefined>): boolean => {
		const typeDefFull = this.getTypeDefFull(typeDef, typesById);

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
				if (this.checkType(element, elementTypeDef, typesById) === false) {
					return false;
				}
			}
		}
		return true;
	};

	 checkVariableSizeArray = (data: any, typeDef: type_def, typesById: Record<string, type_def | undefined>): boolean => {
		const typeDefFull = this.getTypeDefFull(typeDef, typesById);

		if (!Array.isArray(data)) {
			return false;
		} else {
			// get array element's type, can never be "undefined"
			const elementTypeDef = typeDefFull.element;
			// user-defined element type
			// check each element's type
			for (let element of data) {
				if (this.checkType(element, elementTypeDef, typesById) === false) {
					return false;
				}
			}
		}
		return true;
	};

	 checkPrimitive = (data: any, typeDef: type_def, typesById: Record<string, type_def | undefined>): boolean => {
		const typeDefFull = this.getTypeDefFull(typeDef, typesById);

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

	 checkType = (data: any, typeDef: type_def, typesById: Record<string, type_def | undefined>): boolean => {
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
			return this.checkPrimitive(data, typeDef, typesById);
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
			return this.checkFixedSizeArray(data, typeDef, typesById);
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
			return this.checkVariableSizeArray(data, typeDef, typesById);
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
			return this.checkBoundedSizeArray(data, typeDef, typesById);
		}
		// complex_scalar_boundedString = 0x83,
		else if (typeDef.type === "complex_scalar_boundedString") {
			return this.checkBoundedString(data, typeDef, typesById);
		}
		// complex_scalar_variantUnion = 0x82,
		else if (typeDef.type === "complex_scalar_variantUnion") {
			return this.checkVariantUnion(data, typeDef, typesById);
		}
		// complex_scalar_union = 0x81,
		else if (typeDef.type === "complex_scalar_union") {
			return this.checkUnion(data, typeDef, typesById);
		}
		// complex_scalar_structure = 0x80,
		else if (typeDef.type === "complex_scalar_structure") {
			return this.checkStructure(data, typeDef, typesById);
		} else {
			//todo
			throw new Error("Wrong!");
		}
	};

	// ---------------  methods ------------------
	// todo: find a proper class  for below methods
	// read a size
	 readSize = (buffer: Buffer, offset: number, endianness: Pva_MESSAGE_ENDIANNESS): { newOffset: number; size: number } => {
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
	 writeSize = (size: number | undefined, buffer: Buffer, offset: number, endianness: Pva_MESSAGE_ENDIANNESS): number => {
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

	 readString = (buffer: Buffer, offset: number, endianness: Pva_MESSAGE_ENDIANNESS): { newOffset: number; str: string } => {
		const tmp = this.readSize(buffer, offset, endianness);
		const strSize = tmp.size;
		const newOffset = tmp.newOffset;
		const str = buffer.toString("utf8", newOffset, newOffset + strSize);
		return {
			newOffset: offset + 1 + strSize,
			str: str,
		};
	};

	 writeString = (str: string, buffer: Buffer, endianness: Pva_MESSAGE_ENDIANNESS, offset: number): number => {
		// write size as size
		offset = this.writeSize(str.length, buffer, offset, endianness);
		// write string body
		buffer.write(str, offset, offset + str.length, "utf8");
		offset = offset + str.length;
		return offset;
	};

	// get the full typeDef
	 getTypeDefFull = (typeDef: type_def, typesById: Record<string, type_def | undefined>): type_def => {
		let typeDefFull = typeDef;
		if (typeDef.id !== undefined) {
			let tmp = typesById[typeDef.id.toString()];
			if (tmp !== undefined) {
				typeDefFull = tmp;
			}
		}
		return typeDefFull;
	};
}

// ---------------------- test 1 -------------------

// little endian, data from 0x46
// let buf1Array = [
// 	0xfd, 0x01, 0x00, 0x80, 0x16, 0x65, 0x70, 0x69, 0x63, 0x73, 0x3a, 0x6e, 0x74, 0x2f, 0x4e, 0x54, 0x4e, 0x44, 0x41, 0x72, 0x72, 0x61, 0x79, 0x3a,
// 	0x31, 0x2e, 0x30, 0x09, 0x05, 0x76, 0x61, 0x6c, 0x75, 0x65, 0xfd, 0x02, 0x00, 0x81, 0x00, 0x0b, 0x0c, 0x62, 0x6f, 0x6f, 0x6c, 0x65, 0x61, 0x6e,
// 	0x56, 0x61, 0x6c, 0x75, 0x65, 0x08, 0x09, 0x62, 0x79, 0x74, 0x65, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x28, 0x0a, 0x73, 0x68, 0x6f, 0x72, 0x74, 0x56,
// 	0x61, 0x6c, 0x75, 0x65, 0x29, 0x08, 0x69, 0x6e, 0x74, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x2a, 0x09, 0x6c, 0x6f, 0x6e, 0x67, 0x56, 0x61, 0x6c, 0x75,
// 	0x65, 0x2b, 0x0a, 0x75, 0x62, 0x79, 0x74, 0x65, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x2c, 0x0b, 0x75, 0x73, 0x68, 0x6f, 0x72, 0x74, 0x56, 0x61, 0x6c,
// 	0x75, 0x65, 0x2d, 0x09, 0x75, 0x69, 0x6e, 0x74, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x2e, 0x0a, 0x75, 0x6c, 0x6f, 0x6e, 0x67, 0x56, 0x61, 0x6c, 0x75,
// 	0x65, 0x2f, 0x0a, 0x66, 0x6c, 0x6f, 0x61, 0x74, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x4a, 0x0b, 0x64, 0x6f, 0x75, 0x62, 0x6c, 0x65, 0x56, 0x61, 0x6c,
// 	0x75, 0x65, 0x4b, 0x05, 0x63, 0x6f, 0x64, 0x65, 0x63, 0xfd, 0x03, 0x00, 0x80, 0x07, 0x63, 0x6f, 0x64, 0x65, 0x63, 0x5f, 0x74, 0x02, 0x04, 0x6e,
// 	0x61, 0x6d, 0x65, 0x60, 0x0a, 0x70, 0x61, 0x72, 0x61, 0x6d, 0x65, 0x74, 0x65, 0x72, 0x73, 0xfd, 0x04, 0x00, 0x82, 0x0e, 0x63, 0x6f, 0x6d, 0x70,
// 	0x72, 0x65, 0x73, 0x73, 0x65, 0x64, 0x53, 0x69, 0x7a, 0x65, 0x23, 0x10, 0x75, 0x6e, 0x63, 0x6f, 0x6d, 0x70, 0x72, 0x65, 0x73, 0x73, 0x65, 0x64,
// 	0x53, 0x69, 0x7a, 0x65, 0x23, 0x09, 0x64, 0x69, 0x6d, 0x65, 0x6e, 0x73, 0x69, 0x6f, 0x6e, 0xfd, 0x05, 0x00, 0x88, 0xfd, 0x06, 0x00, 0x80, 0x0b,
// 	0x64, 0x69, 0x6d, 0x65, 0x6e, 0x73, 0x69, 0x6f, 0x6e, 0x5f, 0x74, 0x05, 0x04, 0x73, 0x69, 0x7a, 0x65, 0x22, 0x06, 0x6f, 0x66, 0x66, 0x73, 0x65,
// 	0x74, 0x22, 0x08, 0x66, 0x75, 0x6c, 0x6c, 0x53, 0x69, 0x7a, 0x65, 0x22, 0x07, 0x62, 0x69, 0x6e, 0x6e, 0x69, 0x6e, 0x67, 0x22, 0x07, 0x72, 0x65,
// 	0x76, 0x65, 0x72, 0x73, 0x65, 0x00, 0x08, 0x75, 0x6e, 0x69, 0x71, 0x75, 0x65, 0x49, 0x64, 0x22, 0x0d, 0x64, 0x61, 0x74, 0x61, 0x54, 0x69, 0x6d,
// 	0x65, 0x53, 0x74, 0x61, 0x6d, 0x70, 0xfd, 0x07, 0x00, 0x80, 0x06, 0x74, 0x69, 0x6d, 0x65, 0x5f, 0x74, 0x03, 0x10, 0x73, 0x65, 0x63, 0x6f, 0x6e,
// 	0x64, 0x73, 0x50, 0x61, 0x73, 0x74, 0x45, 0x70, 0x6f, 0x63, 0x68, 0x23, 0x0b, 0x6e, 0x61, 0x6e, 0x6f, 0x73, 0x65, 0x63, 0x6f, 0x6e, 0x64, 0x73,
// 	0x22, 0x07, 0x75, 0x73, 0x65, 0x72, 0x54, 0x61, 0x67, 0x22, 0x09, 0x61, 0x74, 0x74, 0x72, 0x69, 0x62, 0x75, 0x74, 0x65, 0xfd, 0x08, 0x00, 0x88,
// 	0xfd, 0x09, 0x00, 0x80, 0x18, 0x65, 0x70, 0x69, 0x63, 0x73, 0x3a, 0x6e, 0x74, 0x2f, 0x4e, 0x54, 0x41, 0x74, 0x74, 0x72, 0x69, 0x62, 0x75, 0x74,
// 	0x65, 0x3a, 0x31, 0x2e, 0x30, 0x05, 0x04, 0x6e, 0x61, 0x6d, 0x65, 0x60, 0x05, 0x76, 0x61, 0x6c, 0x75, 0x65, 0xfe, 0x04, 0x00, 0x0a, 0x64, 0x65,
// 	0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x6f, 0x72, 0x60, 0x0a, 0x73, 0x6f, 0x75, 0x72, 0x63, 0x65, 0x54, 0x79, 0x70, 0x65, 0x22, 0x06, 0x73, 0x6f,
// 	0x75, 0x72, 0x63, 0x65, 0x60, 0x09, 0x74, 0x69, 0x6d, 0x65, 0x53, 0x74, 0x61, 0x6d, 0x70, 0xfe, 0x07, 0x00,
// ];

// const buf1 = Buffer.from(buf1Array);
// let typesById = {};

// // deserialize buf1
// const type1 = PvaTypeStaticMethods.deserialize(buf1, 0, Pva_MESSAGE_ENDIANNESS.LITTLE, typesById);
// console.log(typesById);
// console.log(type1);

// // serialize buf1
// const buf1a = Buffer.alloc(1000);
// const endPosition1 = PvaTypeStaticMethods.serialize(type1, buf1a, Pva_MESSAGE_ENDIANNESS.LITTLE, 0, typesById);
// const buf1aArray = [...buf1a.slice(0, endPosition1)];

// for (let ii = 0; ii < Math.max(buf1Array.length, endPosition1); ii++) {
// 	console.log(ii, buf1aArray[ii].toString(16) === buf1Array[ii].toString(16));
// 	// console.log(buf1aArray[ii].toString(16));
// }

// console.log(buf1Array.length, endPosition1);
// ---------------------- test 2 -------------------



// // big endian
// let buf2Array = [
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


// const buf2 = Buffer.from(buf2Array);
// let typesById = {};

// // deserialize buf2
// const type2 = PvaTypeStaticMethods.deserialize(buf2, 0, Pva_MESSAGE_ENDIANNESS.BIG, typesById);
// console.log(typesById);
// console.log(type2);

// // serialize buf2
// const buf2a = Buffer.alloc(1000);
// const endPosition2 = PvaTypeStaticMethods.serialize(type2, buf2a, Pva_MESSAGE_ENDIANNESS.BIG, 0, typesById);
// const buf2aArray = [...buf2a.slice(0, endPosition2)];
// console.log(buf2a)

// for (let ii = 0; ii < Math.max(buf2Array.length, endPosition2); ii++) {
// 	console.log(ii, buf2aArray[ii].toString(16) === buf2Array[ii].toString(16));
// }

// console.log(buf2Array.length, endPosition2);


// ----------------- test 3: memory usage test ----------------------

// const buf3 = Buffer.alloc(buf2Array.length);
// buf2.copy(buf3);

// const type3 = PvaTypeStaticMethods.deserialize(buf3, 0, Pva_MESSAGE_ENDIANNESS.BIG, typesById);

// // serialize buf2
// const buf3a = Buffer.alloc(1000);
// PvaTypeStaticMethods.serialize(type3, buf3a, Pva_MESSAGE_ENDIANNESS.BIG, 0, typesById);


let a: PvaTypeStaticMethods1[] = [];

for (let ii = 0; ii < 500000; ii++) {
    a.push(new PvaTypeStaticMethods1());
}

setTimeout(() => {
    console.log("OK");
}, 5000);
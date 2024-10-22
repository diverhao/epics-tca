import { PvaGlobalMethods, Pva_MESSAGE_ENDIANNESS } from "../Global/PvaGlobalMethods";
import { PvaData_TYPES } from "./PvaData_typeEncoding";
import { PvaData_type_methods, type_def } from "./PvaType";

// type type_primitive_data = number | string | boolean;
// type type_array_data = type_primitive_data[];
// type type_structure_data = Record<string, type_primitive_data | type_array_data | type_structure_data>;
// type type_pvaData = Record<string, any> | Record<string, any>[] | number | string | boolean | number[] | string[] | boolean[];
type type_pvaData = any;

// represents a type with an ID
export abstract class PvaType {
	// pvaTypesById: Record<string, PvaType | undefined>;
	// typesById: Record<string, type_def | undefined>;
	// buffersById: Record<string, Buffer>;
	pvaTypes: PvaTypes;

	endianness: Pva_MESSAGE_ENDIANNESS;

	buffer: Buffer = Buffer.alloc(0);
	bufferStart = 0;
	bufferEnd = 0;
	bufferOffset: number = 0;
	obj: type_def | undefined = undefined;

	id: number | undefined = undefined;
	// empty type is undefined
	type: string | undefined = undefined;

	constructor(
		input: Buffer | type_def,
		pvaTypes: PvaTypes,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number = 0,
		id: number | undefined = undefined
	) {
		this.pvaTypes = pvaTypes;
		this.endianness = endianness;

		if (input instanceof Buffer) {
			// no copy
			this.buffer = input;
			this.bufferStart = start;
			this.bufferOffset = start;
			this.bufferEnd = start;
			this.id = id;
		} else {
			this.obj = JSON.parse(JSON.stringify(input));
			// this.type = input.type;
			// this.id = input.id;
		}
	}

	abstract deserialize: (deserializedIDs?: number[]) => type_def;
	abstract serialize: (serializedIds?: number[]) => Buffer;

	abstract initFromBuffer: () => void;
	abstract initFromObj: () => void;

	abstract deserializeData: (dataBuffer: Buffer, offset: number) => { data: any; newOffset: number };
	abstract serializeData: (dataObj: type_pvaData) => Buffer;

	// abstract generateShortObj: () => Record<string, any> & { type: string | undefined; id: number | undefined };
	// ------------------- create and build from buffer -----------------

	static createFromBuffer = (
		buffer: Buffer,
		start: number,
		endianness: Pva_MESSAGE_ENDIANNESS,
		pvaTypes: PvaTypes,
		id: number | undefined = undefined
	): PvaType => {
		// const buffer = pvaType.buffer;
		// const endianness = pvaType.endianness;
		const pvaTypesById = pvaTypes.pvaTypesById;
		// const pvaTypes = pvaType.pvaTypes;

		if (buffer.length === 0) {
			throw new Error("Buffer length is 0");
		}

		let offset = start;
		// 0xfd/0xfc/0xfe/0xff, or a primitive "field description code"
		const value = PvaGlobalMethods.bufferReadUInt8(buffer, endianness, offset);
		offset = offset + 1;

		if (!(Object.values(PvaData_TYPES).includes(value) || value === 0xfd || value === 0xfc || value === 0xfe || value === 0xff)) {
			const errorMsg = `Not recognized field description ID: 0x${value.toString(16)}`;
			throw new Error(errorMsg);
		}

		// 0xfd/0xfc/0xfe + id + tag + field description code + type def
		// comes with raw definition of a type with an ID, always override the existing definition
		if (value === 0xfd || value === 0xfc || value === 0xfe) {
			// read ID: 2-byte short (not a size), unique for each (TCP) connection
			const id = PvaGlobalMethods.bufferReadInt16(buffer, endianness, offset);
			offset = offset + 2;

			if (value === 0xfc) {
				// read tag, integer type
				const tag = PvaGlobalMethods.bufferReadInt32(buffer, endianness, offset);
				offset = offset + 4;
			}

			if (value === 0xfd) {
				// 0xfd + ID + field description code + ...
				const newPvaType = this.createFromBuffer(buffer, offset, endianness, pvaTypes, id);
				//todo !!: notify everyone that this ID type is updated
				pvaTypesById[id.toString()] = newPvaType;
				return newPvaType;
			} else if (value === 0xfc) {
				// 0xfc + tag + ID + field description code + ...
				// todo: use tag info
				// const newPvaType = PvaTypes.deserialize(buffer, offset, endianness, pvaTypes, id);
				const newPvaType = this.createFromBuffer(buffer, offset, endianness, pvaTypes, id);
				pvaTypesById[id.toString()] = newPvaType;
				return newPvaType;
			} else {
				// 0xfe + ID
				const existingPvaType = pvaTypes.pvaTypesById[id.toString()];
				if (existingPvaType !== undefined) {
					// update .bufferEnd for next field
					existingPvaType.bufferEnd = offset;
					return existingPvaType;
				} else {
					const errorMsg = `ID ${id} does not exist`;
					throw new Error(errorMsg);
				}
			}
		} else if (value === 0xff) {
			// 0xff
			// special empty type, nothing
			const newPvaType = new PvaEmptyType(buffer, pvaTypes, endianness, start, id);
			newPvaType.initFromBuffer();
			return newPvaType;
		} else {
			// field description code + ...
			// id = undefined
			// const newPvaType = PvaType.createInstanceFromBuffer(buffer, offset - 1, endianness, pvaTypes, id);
			// ---------------------------------------------------
			// go back by 1 byte
			offset = offset - 1;
			const fieldDescCode = PvaGlobalMethods.bufferReadUInt8(buffer, endianness, offset);
			const fieldDescName = PvaData_TYPES[fieldDescCode];

			let newPvaType: PvaType | undefined = undefined;
			if (fieldDescName === "complex_scalar_structure" || fieldDescName === "complex_scalar_union") {
				// buffer starts at 0x80 or 0x81, id may be undefined
				newPvaType = new PvaStructureUnionType(buffer, pvaTypes, endianness, offset, id);
			} else if (
				fieldDescName.split("_")[1] === "fixedSizeArray" ||
				fieldDescName.split("_")[1] === "boundedSizeArray" ||
				fieldDescName.split("_")[1] === "variableSizeArray"
			) {
				newPvaType = new PvaArrayType(buffer, pvaTypes, endianness, offset, id);
			} else {
				// primitive types, bounded string and variant union, "field description code" can fully describe the data type
				newPvaType = new PvaPrimitiveType(buffer, pvaTypes, endianness, offset, id);
			}

			newPvaType.initFromBuffer();
			return newPvaType;
		}
	};

	static createFromObj = (obj: type_def, endianness: Pva_MESSAGE_ENDIANNESS, pvaTypes: PvaTypes): PvaType => {
		// like 0xfe
		if (typeof obj.id === "number" && Object.keys(obj).length === 1) {
			const existingType = pvaTypes.pvaTypesById[obj.id.toString()];
			if (existingType === undefined) {
				const errorMsg = `Type with ID ${obj.id} does exist`;
				throw new Error(errorMsg);
			} else {
				return existingType;
			}
		}

		// full def: like 0xfd or others

		const fieldDescName = obj.type;

		let newPvaType: PvaType | undefined = undefined;

		// "empty" type
		if (fieldDescName === undefined) {
			newPvaType = new PvaEmptyType(obj, pvaTypes, endianness);
		} else if (fieldDescName === "complex_scalar_structure" || fieldDescName === "complex_scalar_union") {
			newPvaType = new PvaStructureUnionType(obj, pvaTypes, endianness);
		} else if (
			fieldDescName.split("_")[1] === "fixedSizeArray" ||
			fieldDescName.split("_")[1] === "boundedSizeArray" ||
			fieldDescName.split("_")[1] === "variableSizeArray"
		) {
			newPvaType = new PvaArrayType(obj, pvaTypes, endianness);
		} else {
			// primitive types, bounded string and variant union, "field description code" can fully describe the data type
			newPvaType = new PvaPrimitiveType(obj, pvaTypes, endianness);
		}

		// like 0xfd, add to or override pvaTypesById
		if (typeof obj.id === "number") {
			pvaTypes.pvaTypesById[obj.id.toString()] = newPvaType;
		}

		newPvaType.initFromObj();

		return newPvaType;
	};
}

// for 0xff, empty type
export class PvaEmptyType extends PvaType {
	constructor(
		input: Buffer | type_def,
		pvaTypes: PvaTypes,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number = 0,
		id: number | undefined = undefined
	) {
		super(input, pvaTypes, endianness, start, id);
	}
	initFromBuffer = (): void => {};

	initFromObj = (): void => {};
	deserialize = (deserializedIDs: number[] = []): type_def => {
		return { type: this.type, id: undefined };
	};
	serialize = (serializedIDs: number[] = []): Buffer => {
		return Buffer.from([0xff]);
	};
	deserializeData = (dataBuffer: Buffer, offset: number): { data: any; newOffset: number } => {
		return { data: undefined, newOffset: offset };
	};
	serializeData = (pvaDataObj: type_pvaData): Buffer => {
		return Buffer.alloc(0);
	};
}

export class PvaPrimitiveType extends PvaType {
	// dedicated for "complex_scalar_boundedString"
	size: number | undefined = undefined;
	constructor(
		input: Buffer | type_def,
		pvaTypes: PvaTypes,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number = 0,
		id: number | undefined = undefined
	) {
		super(input, pvaTypes, endianness, start, id);
	}

	initFromBuffer = (): void => {
		const fieldDescCode = PvaGlobalMethods.bufferReadUInt8(this.buffer, this.endianness, this.bufferOffset);
		this.bufferOffset = this.bufferOffset + 1;
		this.type = PvaData_TYPES[fieldDescCode];

		// not exactly a "primitive" type
		if (this.type === "scalar_boundedString") {
			// bounded size of string
			let sizeTmp = PvaTypes.readSize(this.buffer, this.bufferOffset, this.endianness);
			this.bufferOffset = sizeTmp.newOffset;
			this.size = sizeTmp.size;
		}

		this.bufferEnd = this.bufferOffset;
	};

	// FULLY expand the type
	deserialize = (deserializedIDs: number[] = []) => {
		const result: type_def = {};

		// if the type has an ID, and this ID has been included, only return the ID
		if (this.id !== undefined && deserializedIDs.includes(this.id)) {
			result.id = this.id;
			return result;
		}

		// if we have an ID, and the ID has not been included
		if (this.id !== undefined) {
			deserializedIDs.push(this.id);
			result.id = this.id;
		}
		result.type = this.type;

		// for "bounded string"
		if (this.size !== undefined) {
			result.size = this.size;
		}

		return result;
	};

	// id has been taken care of
	serialize = (serializedIDs: number[] = []): Buffer => {
		let buffer = Buffer.alloc(0);
		if (this.id !== undefined) {
			if (serializedIDs.includes(this.id)) {
				// this id has been in the buffer, 0xfe
				buffer = PvaGlobalMethods.createBufferWriteUInt8(this.endianness, 0xfe, 0);
				// ID: 2-byte short (not a size), unique for each (TCP) connection
				buffer = Buffer.concat([buffer, PvaGlobalMethods.createBufferWriteInt16(this.endianness, this.id, 0)]);
				return buffer;
			} else {
				serializedIDs.push(this.id);
				// this id has been in the buffer, 0xfd
				buffer = PvaGlobalMethods.createBufferWriteUInt8(this.endianness, 0xfd, 0);
				// ID: 2-byte short (not a size), unique for each (TCP) connection
				buffer = Buffer.concat([buffer, PvaGlobalMethods.createBufferWriteInt16(this.endianness, this.id, 0)]);
				// continue
			}
		}

		// write field description code
		buffer = Buffer.concat([
			buffer,
			PvaGlobalMethods.createBufferWriteUInt8(this.endianness, PvaData_TYPES[this.type as keyof typeof PvaData_TYPES], 0),
		]);

		// special treatment for bounded string
		if (this.type === "scalar_boundedString") {
			buffer = Buffer.concat([buffer, PvaTypes.writeSize(this.size, this.endianness)]);
		}

		return buffer;
	};

	// 0xfd or regular def (not 0xfe)
	initFromObj = (): void => {
		if (this.obj === undefined) {
			throw new Error("Object cannot be undefined");
		}

		// there must be a type
		if (this.obj.type === undefined) {
			throw new Error("There must be a type");
		}
		this.type = this.obj.type;

		// "id" could be undefined
		this.id = this.obj.id;

		if (this.type === "scalar_boundedString") {
			if (typeof this.obj.size !== "number") {
				throw new Error("There must be a size property");
			} else {
				this.size = this.obj.size;
			}
		}
	};

	// need to read data buffer
	deserializeData = (dataBuffer: Buffer, offset: number): { data: any; newOffset: number } => {
		if (this.type === undefined) {
			throw new Error("Type not defined");
		}

		const result: { data: any; newOffset: number } = { data: undefined, newOffset: offset };
		let newOffset = offset;

		switch (this.type) {
			case "complex_scalar_boundedString":
			case "string_scalar":
				// read string actual size
				let sizeTmp = PvaTypes.readSize(dataBuffer, newOffset, this.endianness);
				let size = sizeTmp.size;
				newOffset = sizeTmp.newOffset;
				// bounded string
				if (this.type === "complex_scalar_boundedString") {
					if (this.size === undefined) {
						throw new Error("Size not defined in bounded string");
					}
					if (size > this.size) {
						throw new Error("Bounded string oversized");
					}
				}
				result.data = dataBuffer.toString("utf8", newOffset, newOffset + size);
				newOffset = newOffset + size;
				result.newOffset = newOffset;
				break;
			case "floatingPoint_scalar_binary128":
				//todo: 128-bit, too large
				result.data = PvaGlobalMethods.bufferReadDouble(dataBuffer, this.endianness, newOffset);
				result.newOffset = newOffset + 16;
				break;
			case "floatingPoint_scalar_binary64":
				result.data = PvaGlobalMethods.bufferReadDouble(dataBuffer, this.endianness, newOffset);
				result.newOffset = newOffset + 8;
				break;
			case "floatingPoint_scalar_binary32":
				result.data = PvaGlobalMethods.bufferReadFloat(dataBuffer, this.endianness, newOffset);
				result.newOffset = newOffset + 4;
				break;
			case "integer_scalar_unsignedLong":
				result.data = PvaGlobalMethods.bufferReadBigUInt64(dataBuffer, this.endianness, newOffset);
				result.newOffset = newOffset + 8;
				break;
			case "integer_scalar_unsignedInt":
				result.data = PvaGlobalMethods.bufferReadUInt32(dataBuffer, this.endianness, newOffset);
				result.newOffset = newOffset + 4;
				break;
			case "integer_scalar_unsignedShort":
				result.data = PvaGlobalMethods.bufferReadUInt16(dataBuffer, this.endianness, newOffset);
				result.newOffset = newOffset + 2;
				break;
			case "integer_scalar_unsignedByte":
				result.data = PvaGlobalMethods.bufferReadUInt8(dataBuffer, this.endianness, newOffset);
				result.newOffset = newOffset + 1;
				break;
			case "integer_scalar_signedLong":
				result.data = PvaGlobalMethods.bufferReadBigInt64(dataBuffer, this.endianness, newOffset);
				result.newOffset = newOffset + 8;
				break;
			case "integer_scalar_signedInt":
				result.data = PvaGlobalMethods.bufferReadInt32(dataBuffer, this.endianness, newOffset);
				result.newOffset = newOffset + 4;
				break;
			case "integer_scalar_signedShort":
				result.data = PvaGlobalMethods.bufferReadInt16(dataBuffer, this.endianness, newOffset);
				result.newOffset = newOffset + 2;
				break;
			case "integer_scalar_signedByte":
				result.data = PvaGlobalMethods.bufferReadInt8(dataBuffer, this.endianness, newOffset);
				result.newOffset = newOffset + 1;
				break;
			case "boolean_scalar":
				result.data = PvaGlobalMethods.bufferReadUInt8(dataBuffer, this.endianness, newOffset) === 0 ? false : true;
				result.newOffset = newOffset + 1;
				break;
			case "complex_scalar_variantUnion":
				// read data type inside variant union
				const pvaTypeInsideVariantUnion = PvaType.createFromBuffer(dataBuffer, newOffset, this.endianness, this.pvaTypes);
				newOffset = pvaTypeInsideVariantUnion.bufferEnd;
				// read data
				const dataTmp = pvaTypeInsideVariantUnion.deserializeData(dataBuffer, newOffset);
				result.data = {
					variantUnionType: pvaTypeInsideVariantUnion.deserialize(),
					variantUnionData: dataTmp.data,
				};
				result.newOffset = dataTmp.newOffset;
				break;
			default:
				throw new Error("Data must be primitive type");
		}
		return result;
	};

	serializeData = (pvaDataObj: type_pvaData): Buffer => {
		if (this.type === undefined) {
			throw new Error("Type not defined");
		}

		let result: Buffer = Buffer.alloc(0);

		switch (this.type) {
			case "complex_scalar_boundedString":
			case "string_scalar":
				// write string size
				result = Buffer.concat([result, PvaTypes.writeSize((pvaDataObj as string).length, this.endianness)]);
				// write string
				result = Buffer.concat([result, Buffer.from(pvaDataObj as string)]);
				break;
			case "floatingPoint_scalar_binary128":
				//todo: 128-bit, too large
				result = Buffer.alloc(16);
				PvaGlobalMethods.bufferWriteDouble(result, this.endianness, pvaDataObj as number, 0);
				break;
			case "floatingPoint_scalar_binary64":
				result = Buffer.alloc(8);
				PvaGlobalMethods.bufferWriteDouble(result, this.endianness, pvaDataObj as number, 0);
				break;
			case "floatingPoint_scalar_binary32":
				result = Buffer.alloc(4);
				PvaGlobalMethods.bufferWriteFloat(result, this.endianness, pvaDataObj as number, 0);
				break;
			case "integer_scalar_unsignedLong":
				result = Buffer.alloc(8);
				PvaGlobalMethods.bufferWriteBigUInt64(result, this.endianness, pvaDataObj as number, 0);
				break;
			case "integer_scalar_unsignedInt":
				result = Buffer.alloc(4);
				PvaGlobalMethods.bufferWriteUInt32(result, this.endianness, pvaDataObj as number, 0);
				break;
			case "integer_scalar_unsignedShort":
				result = Buffer.alloc(2);
				PvaGlobalMethods.bufferWriteUInt16(result, this.endianness, pvaDataObj as number, 0);
				break;
			case "integer_scalar_unsignedByte":
				result = Buffer.alloc(1);
				PvaGlobalMethods.bufferWriteUInt8(result, this.endianness, pvaDataObj as number, 0);
				break;
			case "integer_scalar_signedLong":
				result = Buffer.alloc(8);
				PvaGlobalMethods.bufferWriteBigInt64(result, this.endianness, pvaDataObj as number, 0);
				break;
			case "integer_scalar_signedInt":
				result = Buffer.alloc(4);
				PvaGlobalMethods.bufferWriteInt32(result, this.endianness, pvaDataObj as number, 0);
				break;
			case "integer_scalar_signedShort":
				result = Buffer.alloc(2);
				PvaGlobalMethods.bufferWriteInt16(result, this.endianness, pvaDataObj as number, 0);
				break;
			case "integer_scalar_signedByte":
				result = Buffer.alloc(1);
				PvaGlobalMethods.bufferWriteInt8(result, this.endianness, pvaDataObj as number, 0);
				break;
			case "boolean_scalar":
				result = Buffer.alloc(1);
				PvaGlobalMethods.bufferWriteInt8(result, this.endianness, (pvaDataObj as number) === 0 ? 0 : 1, 0);
				break;
			case "complex_scalar_variantUnion":
				const variantUnionType = pvaDataObj.variantUnionType;
				const variantUnionData = pvaDataObj.variantUnionData;
				// write data type inside variant union to buffer
				const pvaTypeInsideVariantUnion = PvaType.createFromObj(variantUnionType, this.endianness, this.pvaTypes);
				const typeBuffer = pvaTypeInsideVariantUnion.serialize();
				result = Buffer.concat([result, typeBuffer]);
				// write data to buffer
				result = Buffer.concat([result, pvaTypeInsideVariantUnion.serializeData(variantUnionData)]);
				break;
			default:
				throw new Error("Data must be primitive type");
		}
		return result;
	};
}

export class PvaStructureUnionType extends PvaType {
	fields: Record<string, PvaType> = {};
	name: string | undefined = undefined;
	constructor(
		input: Buffer | type_def,
		pvaTypes: PvaTypes,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number = 0,
		id: number | undefined = undefined
	) {
		super(input, pvaTypes, endianness, start, id);
	}

	initFromBuffer = (): void => {
		// "field description code" + structure name + number of properties + each property
		const fieldDescCode = PvaGlobalMethods.bufferReadUInt8(this.buffer, this.endianness, this.bufferOffset);
		this.bufferOffset++;
		// string representation of structure type
		this.type = PvaData_TYPES[fieldDescCode];

		if (this.type !== "complex_scalar_structure" && this.type !== "complex_scalar_union") {
			throw new Error("Must be complex_scalar_structure or complex_scalar_union");
		}

		// structure name
		if (this.type === "complex_scalar_structure") {
			let nameTmp: any = PvaTypes.readString(this.buffer, this.bufferOffset, this.endianness);
			this.bufferOffset = nameTmp.newOffset;
			this.name = nameTmp.str;
		}

		// number of fields, encoded as size
		let numFields = 0;
		if (this.type === "complex_scalar_structure") {
			let numTmp = PvaTypes.readSize(this.buffer, this.bufferOffset, this.endianness);
			this.bufferOffset = numTmp.newOffset;
			numFields = numTmp.size;
		} else {
			//todo: to confirm the union's size is a short
			numFields = PvaGlobalMethods.bufferReadUInt16(this.buffer, Pva_MESSAGE_ENDIANNESS.BIG, this.bufferOffset);
			this.bufferOffset = this.bufferOffset + 2;
		}

		// each field
		for (let index = 0; index < numFields; index++) {
			// field name
			let fieldNameTmp = PvaTypes.readString(this.buffer, this.bufferOffset, this.endianness);
			this.bufferOffset = fieldNameTmp.newOffset;
			const fieldName = fieldNameTmp.str;
			let fieldType = PvaType.createFromBuffer(this.buffer, this.bufferOffset, this.endianness, this.pvaTypes);
			// update anyway
			this.fields[fieldName] = fieldType;
			this.bufferOffset = fieldType.bufferEnd;
		}

		this.bufferEnd = this.bufferOffset;
	};

	deserialize = (deserializedIDs: number[] = []) => {
		const result: type_def = {};

		// if the type has an ID, and this ID has been included, only return the ID
		if (this.id !== undefined && deserializedIDs.includes(this.id)) {
			return { id: this.id };
		}

		// structure has a name
		if (this.name !== undefined) {
			result.name = this.name;
		}

		// if we have an ID, and the ID has not been included
		if (this.id !== undefined) {
			deserializedIDs.push(this.id);
			result.id = this.id;
		}

		result.type = this.type;

		// if there is no field, then the .fields is {}, not undefined
		result.fields = {};
		for (let fieldName in this.fields) {
			const field = this.fields[fieldName];
			result.fields[fieldName] = field.deserialize(deserializedIDs);
		}
		return result;
	};

	serialize = (serializedIDs: number[] = []): Buffer => {
		let buffer = Buffer.alloc(0);
		if (this.id !== undefined) {
			if (serializedIDs.includes(this.id)) {
				// this id has been in the buffer, 0xfe
				buffer = PvaGlobalMethods.createBufferWriteUInt8(this.endianness, 0xfe, 0);
				// ID: 2-byte short (not a size), unique for each (TCP) connection
				buffer = Buffer.concat([buffer, PvaGlobalMethods.createBufferWriteInt16(this.endianness, this.id, 0)]);
				return buffer;
			} else {
				serializedIDs.push(this.id);
				// this id has been in the buffer, 0xfd
				buffer = PvaGlobalMethods.createBufferWriteUInt8(this.endianness, 0xfd, 0);
				// ID: 2-byte short (not a size), unique for each (TCP) connection
				buffer = Buffer.concat([buffer, PvaGlobalMethods.createBufferWriteInt16(this.endianness, this.id, 0)]);
				// continue
			}
		}

		// write field description code
		buffer = Buffer.concat([
			buffer,
			PvaGlobalMethods.createBufferWriteUInt8(this.endianness, PvaData_TYPES[this.type as keyof typeof PvaData_TYPES], 0),
		]);

		// if it has a name (a structure)
		if (this.name !== undefined) {
			buffer = Buffer.concat([buffer, PvaTypes.createStringBuffer(this.name, this.endianness)]);
		}

		const fieldsSize = Object.keys(this.fields).length;
		if (this.type === "complex_scalar_structure") {
			// write number of fields as a size
			buffer = Buffer.concat([buffer, PvaTypes.writeSize(fieldsSize, this.endianness)]);
		} else {
			// write number of fields as a short when it is a Union
			//todo: why??
			buffer = Buffer.concat([buffer, PvaGlobalMethods.createBufferWriteInt16(this.endianness, fieldsSize, 0)]);
		}

		// write all properties
		for (let fieldName in this.fields) {
			const field = this.fields[fieldName];
			// write field name
			buffer = Buffer.concat([buffer, PvaTypes.createStringBuffer(fieldName, this.endianness)]);
			// write field buffer
			buffer = Buffer.concat([buffer, field.serialize(serializedIDs)]);
		}
		return buffer;
	};

	// 0xfd or regular def (not 0xfe)
	// input object: {type: string, name?: string, id?: number, fields:{}}
	//               or {id: number}
	initFromObj = (): void => {
		if (this.obj === undefined) {
			throw new Error("Object cannot be undefined");
		}

		// there must be a type
		if (this.obj.type === undefined) {
			throw new Error("There must be a type");
		}
		this.type = this.obj.type;

		// id could be undefined
		this.id = this.obj.id;

		// structure name, if it is a union, this.obj.name === undefined, which is acceptable
		if (this.obj.type === "complex_scalar_structure" && this.obj.name === undefined) {
			throw new Error("Structure must have a name");
		} else {
			this.name = this.obj.name;
		}

		// fieldsObj must be {} or more, cannot be "undefined"
		const fieldsObj = this.obj.fields;
		if (fieldsObj === undefined) {
			throw new Error("Fields cannot be undefined, at least should be an empty object {}");
		} else {
			// each field
			for (let fieldName in fieldsObj) {
				// field name
				const fieldObj = fieldsObj[fieldName];
				let fieldType = PvaType.createFromObj(fieldObj, this.endianness, this.pvaTypes);
				// update anyway
				this.fields[fieldName] = fieldType;
			}
		}
	};

	// do not need to read buffer data
	deserializeData = (dataBuffer: Buffer, offset: number): { data: any; newOffset: number } => {
		let result: { data: any; newOffset: number } = { data: undefined, newOffset: offset };
		let newOffset = offset;

		if (this.type === "complex_scalar_structure") {
			const data: Record<string, any> = {};
			for (let fieldName in this.fields) {
				const field = this.fields[fieldName];
				const dataTmp = field.deserializeData(dataBuffer, newOffset);
				data[fieldName] = dataTmp.data;
				newOffset = dataTmp.newOffset;
			}
			result.data = data;
			result.newOffset = newOffset;
		} else if (this.type === "complex_scalar_union") {
			const sizeTmp = PvaTypes.readSize(dataBuffer, newOffset, this.endianness);
			newOffset = sizeTmp.newOffset;
			const choiceIndex = sizeTmp.size;
			const choiceType = Object.values(this.fields)[choiceIndex];
			const choiceDeserializedObj = choiceType.deserializeData(dataBuffer, newOffset);
			const data = {
				choiceIndex: choiceIndex,
				choiceData: choiceDeserializedObj.data,
			};
			result = {
				data: data,
				newOffset: choiceDeserializedObj.newOffset,
			};
		} else {
			const errorMsg = "Type must be complex_scalar_structure or complex_scalar_union";
			throw new Error(errorMsg);
		}
		return result;
	};

	serializeData = (pvaDataObj: type_pvaData): Buffer => {
		if (this.type === undefined) {
			throw new Error("Type not defined");
		}

		let result: Buffer = Buffer.alloc(0);

		if (this.type === "complex_scalar_structure") {
			for (let fieldName in this.fields) {
				const field = this.fields[fieldName];
				const fieldObj = pvaDataObj[fieldName];
				result = Buffer.concat([result, field.serializeData(fieldObj)]);
			}
		} else if (this.type === "complex_scalar_union") {
			// write choice index
			const choiceIndex = pvaDataObj.choiceIndex;
			result = Buffer.concat([result, PvaTypes.writeSize(choiceIndex, this.endianness)]);
			// write data
			const choiceData = pvaDataObj.choiceData;
			const choiceType = Object.values(this.fields)[choiceIndex];
			result = Buffer.concat([result, choiceType.serializeData(choiceData)]);
		} else {
			const errorMsg = "Type must be complex_scalar_structure or complex_scalar_union";
			throw new Error(errorMsg);
		}
		return result;
	};
}

export class PvaArrayType extends PvaType {
	size: number | undefined = undefined;
	// element exists when the element type (1) has an ID, or (2)
	// element: (Record<string, any> & { type: string | undefined; id: number | undefined }) | undefined = undefined;
	element: PvaType | undefined = undefined;
	constructor(
		input: Buffer | type_def,
		pvaTypes: PvaTypes,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number = 0,
		id: number | undefined = undefined
	) {
		super(input, pvaTypes, endianness, start, id);
	}
	initFromBuffer = (): void => {
		const fieldDescCode = PvaGlobalMethods.bufferReadUInt8(this.buffer, this.endianness, this.bufferOffset);
		this.bufferOffset = this.bufferOffset + 1;
		this.type = PvaData_TYPES[fieldDescCode];

		// size for fixed size array and bounded size array
		if (this.type.includes("fixedSizeArray") || this.type.includes("boundedSizeArray")) {
			let sizeTmp = PvaTypes.readSize(this.buffer, this.bufferOffset, this.endianness);
			this.size = sizeTmp.size;
			this.bufferOffset = sizeTmp.newOffset;
		}

		// structure/union/variant union/bounded stirng array must come with a def, other types are with another type of customized def
		// todo: is this always correct?
		if (
			this.type.includes("_structure") ||
			this.type.includes("_union") ||
			this.type.includes("_variantUnion") ||
			this.type.includes("_boundedString")
		) {
			const elementType = PvaType.createFromBuffer(this.buffer, this.bufferOffset, this.endianness, this.pvaTypes);
			// update anyway
			this.element = elementType;
			this.bufferEnd = elementType.bufferEnd;
		} else {
			// element is not customized
			const elementType = this.type
				.replace("variableSizeArray", "scalar")
				.replace("fixedSizeArray", "scalar")
				.replace("boundedSizeArray", "scalar");
			const elementTypeNum = PvaData_TYPES[elementType as keyof typeof PvaData_TYPES];
			const bufferTmp = Buffer.from([elementTypeNum as number]);
			this.element = PvaType.createFromBuffer(bufferTmp, 0, this.endianness, this.pvaTypes);
			this.bufferEnd = this.bufferOffset;
		}
	};

	deserialize = (deserializedIDs: number[] = []): type_def => {
		const result: type_def = {};

		// if the type has an ID, and this ID has been included
		if (this.id !== undefined && deserializedIDs.includes(this.id)) {
			return { id: this.id };
		}

		// if we have an ID
		if (this.id !== undefined) {
			deserializedIDs.push(this.id);
			result.id = this.id;
		}
		result.type = this.type;

		// for fixed size array and bounded size array
		if (this.size !== undefined) {
			result.size = this.size;
		}

		// if we have custom element type, practically for structure, union, and bounded string
		if (this.element !== undefined) {
			result.element = this.element.deserialize(deserializedIDs);
		}
		return result;
	};

	serialize = (serializedIDs: number[] = []): Buffer => {
		let buffer = Buffer.alloc(0);
		if (this.id !== undefined) {
			if (serializedIDs.includes(this.id)) {
				// this id has been in the buffer, 0xfe
				buffer = PvaGlobalMethods.createBufferWriteUInt8(this.endianness, 0xfe, 0);
				// ID: 2-byte short (not a size), unique for each (TCP) connection
				buffer = Buffer.concat([buffer, PvaGlobalMethods.createBufferWriteInt16(this.endianness, this.id, 0)]);
				return buffer;
			} else {
				serializedIDs.push(this.id);
				// this id has been in the buffer, 0xfd
				buffer = PvaGlobalMethods.createBufferWriteUInt8(this.endianness, 0xfd, 0);
				// ID: 2-byte short (not a size), unique for each (TCP) connection
				buffer = Buffer.concat([buffer, PvaGlobalMethods.createBufferWriteInt16(this.endianness, this.id, 0)]);
				// continue
			}
		}

		// write field description code
		buffer = Buffer.concat([
			buffer,
			PvaGlobalMethods.createBufferWriteUInt8(this.endianness, PvaData_TYPES[this.type as keyof typeof PvaData_TYPES], 0),
		]);

		if (this.size !== undefined) {
			// write number of element as a size
			buffer = Buffer.concat([buffer, PvaTypes.writeSize(this.size, this.endianness)]);
		}

		if (this.element !== undefined) {
			buffer = Buffer.concat([buffer, this.element.serialize(serializedIDs)]);
		}
		return buffer;
	};

	initFromObj = (): void => {
		if (this.obj === undefined) {
			throw new Error("Object cannot be undefined");
		}

		// there must be a type
		if (this.obj.type === undefined) {
			throw new Error("There must be a type");
		}
		this.type = this.obj.type;

		// id could be undefined
		this.id = this.obj.id;

		// there must be a "size" for fixed size array or bounded size array
		if (this.type.includes("fixedSizeArray") || this.type.includes("boundedSizeArray")) {
			if (typeof this.obj.size !== "number") {
				const errorMsg = `${this.type} must have a size`;
				throw new Error(errorMsg);
			} else {
				this.size = this.obj.size;
			}
		}

		// this.element could be undefined
		// structure/union/variant union/bounded stirng array must come with a customized element def,
		// other types do not need
		// todo: is this always correct?
		if (
			this.type.includes("_structure") ||
			this.type.includes("_union") ||
			this.type.includes("_variantUnion") ||
			this.type.includes("_boundedString")
		) {
			const elementObj = this.obj.element;
			if (elementObj !== undefined) {
				const element = PvaType.createFromObj(elementObj, this.endianness, this.pvaTypes);
				// update anyway
				this.element = element;
			}
		} else {
			// element is not customized, we create one
			const elementType = this.type
				.replace("variableSizeArray", "scalar")
				.replace("fixedSizeArray", "scalar")
				.replace("boundedSizeArray", "scalar");
			const elementObj = { type: elementType };
			if (elementObj !== undefined) {
				const element = PvaType.createFromObj(elementObj, this.endianness, this.pvaTypes);
				// update anyway
				this.element = element;
			}
		}
	};

	// need to read data buffer
	deserializeData = (dataBuffer: Buffer, offset: number): { data: any; newOffset: number } => {
		if (this.type === undefined) {
			throw new Error("Array type not defined");
		}
		if (this.element === undefined) {
			throw new Error("Array element not defined");
		}

		if (this.type.includes("bounded") || this.type.includes("fixed")) {
			if (this.size === undefined) {
				throw new Error("Bouned/fixed size array has no size info");
			}
		}

		let size = this.size;
		let newOffset = offset;
		if (this.type.includes("bounded") || this.type.includes("variable")) {
			let sizeTmp = PvaTypes.readSize(dataBuffer, newOffset, this.endianness);
			size = sizeTmp.size;
			newOffset = sizeTmp.newOffset;
		} else if (this.type.includes("fixed")) {
			size = this.size;
		}

		if (size === undefined) {
			throw new Error("Array size must be known");
		}

		// check bounded array size
		if (this.type.includes("bounded")) {
			if (this.size !== undefined) {
				if (size > this.size) {
					const errorMsg = `Bounded array oversized. Max ${this.size}, but has ${size}`;
					throw new Error(errorMsg);
				}
			}
		}

		const result: { data: any; newOffset: number } = { data: [], newOffset: offset };
		for (let ii = 0; ii < size; ii++) {
			const dataTmp = this.element.deserializeData(dataBuffer, newOffset);
			newOffset = dataTmp.newOffset;
			result.data.push(dataTmp.data);
			result.newOffset = newOffset;
		}
		return result;
	};

	serializeData = (pvaDataObj: type_pvaData): Buffer => {
		if (this.type === undefined) {
			throw new Error("Type not defined");
		}
		if (this.element === undefined) {
			throw new Error("Array element not defined");
		}

		// pvDataObj must be an array
		if (!Array.isArray(pvaDataObj)) {
			throw new Error("Must be an array");
		}
		const size = pvaDataObj.length as number;

		if (this.type.includes("bounded") || this.type.includes("fixed")) {
			if (this.size === undefined) {
				throw new Error("Bouned/fixed size array has no size info");
			}
		}

		if (this.type.includes("bounded")) {
			if (this.size === undefined) {
				throw new Error();
			}
			if (size > this.size) {
				throw new Error();
			}
		}

		if (this.type.includes("fixed")) {
			if (this.size === undefined) {
				throw new Error();
			}
			if (size !== this.size) {
				throw new Error();
			}
		}

		let result: Buffer = Buffer.alloc(0);

        // write size
		if (this.type.includes("bounded") || this.type.includes("variable")) {
            result = Buffer.concat([result, PvaTypes.writeSize(size, this.endianness)]);
		}

        for (let pvaDataElement of pvaDataObj) {
			result = Buffer.concat([result, this.element.serializeData(pvaDataElement)]);
		}
		return result;
	};
}

export class PvaTypes {
	pvaTypesById: Record<string, PvaType>;
	constructor() {
		this.pvaTypesById = {};
	}
	// --------------- static methods ------------------
	// todo: find a proper class  for below methods
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
	static writeSize = (size: number | undefined, endianness: Pva_MESSAGE_ENDIANNESS): Buffer => {
		const buffer = Buffer.alloc(10);
		let offset = 0;
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

		return buffer.slice(0, offset);
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

	static createStringBuffer = (str: string, endianness: Pva_MESSAGE_ENDIANNESS): Buffer => {
		// write size as size
		let buffer = this.writeSize(str.length, endianness);
		// write string body
		buffer = Buffer.concat([buffer, Buffer.from(str, "utf8")]);
		return buffer;
	};

	static createBufferFromString = (str: string, endianness: Pva_MESSAGE_ENDIANNESS): Buffer => {
		// write size as size
		let buffer = this.writeSize(str.length, endianness);
		// write string body
		buffer = Buffer.concat([buffer, Buffer.from(str, "utf8")]);
		return buffer;
	};
}

// // ---------------------- test 1 -------------------

// little endian, data from 0x46
let buf1Array = [
	0xfd, 0x01, 0x00, 0x80, 0x16, 0x65, 0x70, 0x69, 0x63, 0x73, 0x3a, 0x6e, 0x74, 0x2f, 0x4e, 0x54, 0x4e, 0x44, 0x41, 0x72, 0x72, 0x61, 0x79, 0x3a,
	0x31, 0x2e, 0x30, 0x09, 0x05, 0x76, 0x61, 0x6c, 0x75, 0x65, 0xfd, 0x02, 0x00, 0x81, 0x00, 0x0b, 0x0c, 0x62, 0x6f, 0x6f, 0x6c, 0x65, 0x61, 0x6e,
	0x56, 0x61, 0x6c, 0x75, 0x65, 0x08, 0x09, 0x62, 0x79, 0x74, 0x65, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x28, 0x0a, 0x73, 0x68, 0x6f, 0x72, 0x74, 0x56,
	0x61, 0x6c, 0x75, 0x65, 0x29, 0x08, 0x69, 0x6e, 0x74, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x2a, 0x09, 0x6c, 0x6f, 0x6e, 0x67, 0x56, 0x61, 0x6c, 0x75,
	0x65, 0x2b, 0x0a, 0x75, 0x62, 0x79, 0x74, 0x65, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x2c, 0x0b, 0x75, 0x73, 0x68, 0x6f, 0x72, 0x74, 0x56, 0x61, 0x6c,
	0x75, 0x65, 0x2d, 0x09, 0x75, 0x69, 0x6e, 0x74, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x2e, 0x0a, 0x75, 0x6c, 0x6f, 0x6e, 0x67, 0x56, 0x61, 0x6c, 0x75,
	0x65, 0x2f, 0x0a, 0x66, 0x6c, 0x6f, 0x61, 0x74, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x4a, 0x0b, 0x64, 0x6f, 0x75, 0x62, 0x6c, 0x65, 0x56, 0x61, 0x6c,
	0x75, 0x65, 0x4b, 0x05, 0x63, 0x6f, 0x64, 0x65, 0x63, 0xfd, 0x03, 0x00, 0x80, 0x07, 0x63, 0x6f, 0x64, 0x65, 0x63, 0x5f, 0x74, 0x02, 0x04, 0x6e,
	0x61, 0x6d, 0x65, 0x60, 0x0a, 0x70, 0x61, 0x72, 0x61, 0x6d, 0x65, 0x74, 0x65, 0x72, 0x73, 0xfd, 0x04, 0x00, 0x82, 0x0e, 0x63, 0x6f, 0x6d, 0x70,
	0x72, 0x65, 0x73, 0x73, 0x65, 0x64, 0x53, 0x69, 0x7a, 0x65, 0x23, 0x10, 0x75, 0x6e, 0x63, 0x6f, 0x6d, 0x70, 0x72, 0x65, 0x73, 0x73, 0x65, 0x64,
	0x53, 0x69, 0x7a, 0x65, 0x23, 0x09, 0x64, 0x69, 0x6d, 0x65, 0x6e, 0x73, 0x69, 0x6f, 0x6e, 0xfd, 0x05, 0x00, 0x88, 0xfd, 0x06, 0x00, 0x80, 0x0b,
	0x64, 0x69, 0x6d, 0x65, 0x6e, 0x73, 0x69, 0x6f, 0x6e, 0x5f, 0x74, 0x05, 0x04, 0x73, 0x69, 0x7a, 0x65, 0x22, 0x06, 0x6f, 0x66, 0x66, 0x73, 0x65,
	0x74, 0x22, 0x08, 0x66, 0x75, 0x6c, 0x6c, 0x53, 0x69, 0x7a, 0x65, 0x22, 0x07, 0x62, 0x69, 0x6e, 0x6e, 0x69, 0x6e, 0x67, 0x22, 0x07, 0x72, 0x65,
	0x76, 0x65, 0x72, 0x73, 0x65, 0x00, 0x08, 0x75, 0x6e, 0x69, 0x71, 0x75, 0x65, 0x49, 0x64, 0x22, 0x0d, 0x64, 0x61, 0x74, 0x61, 0x54, 0x69, 0x6d,
	0x65, 0x53, 0x74, 0x61, 0x6d, 0x70, 0xfd, 0x07, 0x00, 0x80, 0x06, 0x74, 0x69, 0x6d, 0x65, 0x5f, 0x74, 0x03, 0x10, 0x73, 0x65, 0x63, 0x6f, 0x6e,
	0x64, 0x73, 0x50, 0x61, 0x73, 0x74, 0x45, 0x70, 0x6f, 0x63, 0x68, 0x23, 0x0b, 0x6e, 0x61, 0x6e, 0x6f, 0x73, 0x65, 0x63, 0x6f, 0x6e, 0x64, 0x73,
	0x22, 0x07, 0x75, 0x73, 0x65, 0x72, 0x54, 0x61, 0x67, 0x22, 0x09, 0x61, 0x74, 0x74, 0x72, 0x69, 0x62, 0x75, 0x74, 0x65, 0xfd, 0x08, 0x00, 0x88,
	0xfd, 0x09, 0x00, 0x80, 0x18, 0x65, 0x70, 0x69, 0x63, 0x73, 0x3a, 0x6e, 0x74, 0x2f, 0x4e, 0x54, 0x41, 0x74, 0x74, 0x72, 0x69, 0x62, 0x75, 0x74,
	0x65, 0x3a, 0x31, 0x2e, 0x30, 0x05, 0x04, 0x6e, 0x61, 0x6d, 0x65, 0x60, 0x05, 0x76, 0x61, 0x6c, 0x75, 0x65, 0xfe, 0x04, 0x00, 0x0a, 0x64, 0x65,
	0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x6f, 0x72, 0x60, 0x0a, 0x73, 0x6f, 0x75, 0x72, 0x63, 0x65, 0x54, 0x79, 0x70, 0x65, 0x22, 0x06, 0x73, 0x6f,
	0x75, 0x72, 0x63, 0x65, 0x60, 0x09, 0x74, 0x69, 0x6d, 0x65, 0x53, 0x74, 0x61, 0x6d, 0x70, 0xfe, 0x07, 0x00,
];

let buf2Array = [
	0xfd, 0x00, 0x01, 0x80, 0x10, 0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65, 0x53, 0x74, 0x72, 0x75, 0x63, 0x74, 0x75, 0x72, 0x65, 0x07, 0x05, 0x76,
	0x61, 0x6c, 0x75, 0x65, 0x28, 0x10, 0x62, 0x6f, 0x75, 0x6e, 0x64, 0x65, 0x64, 0x53, 0x69, 0x7a, 0x65, 0x41, 0x72, 0x72, 0x61, 0x79, 0x30, 0x10,
	0x0e, 0x66, 0x69, 0x78, 0x65, 0x64, 0x53, 0x69, 0x7a, 0x65, 0x41, 0x72, 0x72, 0x61, 0x79, 0x38, 0x04, 0x09, 0x74, 0x69, 0x6d, 0x65, 0x53, 0x74,
	0x61, 0x6d, 0x70, 0xfd, 0x00, 0x02, 0x80, 0x06, 0x74, 0x69, 0x6d, 0x65, 0x5f, 0x74, 0x03, 0x10, 0x73, 0x65, 0x63, 0x6f, 0x6e, 0x64, 0x73, 0x50,
	0x61, 0x73, 0x74, 0x45, 0x70, 0x6f, 0x63, 0x68, 0x23, 0x0b, 0x6e, 0x61, 0x6e, 0x6f, 0x73, 0x65, 0x63, 0x6f, 0x6e, 0x64, 0x73, 0x22, 0x07, 0x75,
	0x73, 0x65, 0x72, 0x54, 0x61, 0x67, 0x22, 0x05, 0x61, 0x6c, 0x61, 0x72, 0x6d, 0xfd, 0x00, 0x03, 0x80, 0x07, 0x61, 0x6c, 0x61, 0x72, 0x6d, 0x5f,
	0x74, 0x03, 0x08, 0x73, 0x65, 0x76, 0x65, 0x72, 0x69, 0x74, 0x79, 0x22, 0x06, 0x73, 0x74, 0x61, 0x74, 0x75, 0x73, 0x22, 0x07, 0x6d, 0x65, 0x73,
	0x73, 0x61, 0x67, 0x65, 0x60, 0x0a, 0x76, 0x61, 0x6c, 0x75, 0x65, 0x55, 0x6e, 0x69, 0x6f, 0x6e, 0xfd, 0x00, 0x04, 0x81, 0x00, 0x03, 0x0b, 0x73,
	0x74, 0x72, 0x69, 0x6e, 0x67, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x60, 0x08, 0x69, 0x6e, 0x74, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x22, 0x0b, 0x64, 0x6f,
	0x75, 0x62, 0x6c, 0x65, 0x56, 0x61, 0x6c, 0x75, 0x65, 0x43, 0x0c, 0x76, 0x61, 0x72, 0x69, 0x61, 0x6e, 0x74, 0x55, 0x6e, 0x69, 0x6f, 0x6e, 0xfd,
	0x00, 0x05, 0x82,
];

const buf1 = Buffer.from(buf2Array);
const pvaTypes1 = new PvaTypes();
const result1 = PvaType.createFromBuffer(buf1, 0, Pva_MESSAGE_ENDIANNESS.BIG, pvaTypes1);
let obj1 = result1.deserialize();
console.dir(obj1, { depth: null });
let buf1S = result1.serialize();
// for (let ii = 0; ii < buf1.length; ii++) {
// 	console.log(ii, buf1[ii].toString(16), buf1S[ii].toString(16));
// }

// --------------------------------------------------------

const pvaTypes2 = new PvaTypes();
const result2 = PvaType.createFromObj(obj1, Pva_MESSAGE_ENDIANNESS.BIG, pvaTypes2);
let obj2 = result2.deserialize([]);
// // console.dir(obj2, {depth: null})
let buf2S = result2.serialize();
console.log(Buffer.compare(buf1S, buf2S));

// ---------------------------------------------------------

let dataBuf2 = [
	0x03, 0x01, 0x02, 0x03, 0x05, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0xaa, 0xbb,
	0xcc, 0xdd, 0xee, 0xee, 0xee, 0xee, 0x11, 0x11, 0x11, 0x11, 0x22, 0x22, 0x22, 0x22, 0x0b, 0x41, 0x6c, 0x6c, 0x6f, 0x2c, 0x20, 0x41, 0x6c, 0x6c,
	0x6f, 0x21, 0x01, 0x33, 0x33, 0x33, 0x33, 0x60, 0x1c, 0x53, 0x74, 0x72, 0x69, 0x6e, 0x67, 0x20, 0x69, 0x6e, 0x73, 0x69, 0x64, 0x65, 0x20, 0x76,
	0x61, 0x72, 0x69, 0x61, 0x6e, 0x74, 0x20, 0x75, 0x6e, 0x69, 0x6f, 0x6e, 0x2e,
];

console.log(result2.deserializeData(Buffer.from(dataBuf2), 0).data);

// -----------

let data2 = {
	value: [1, 2, 3],
	boundedSizeArray: [4, 5, 6, 7, 8],
	fixedSizeArray: [9, 10, 11, 12],
	timeStamp: {
		secondsPastEpoch: 1234605616436508552n,
		nanoseconds: -1430532899,
		userTag: -286331154,
	},
	alarm: { severity: 286331153, status: 572662306, message: "Allo, Allo!" },
	valueUnion: { choiceIndex: 1, choiceData: 858993459 },
	variantUnion: {
		variantUnionType: { type: "string_scalar" },
		variantUnionData: "String inside variant union.",
	},
};

// console.log(result2.serializeData(data2).toString("hex"));

const dataBuf2Converted = result2.serializeData(data2);

for (let ii = 0; ii < dataBuf2.length; ii++) {
    console.log(dataBuf2[ii] === dataBuf2Converted[ii]);
}

// console.log(JSON.stringify(obj1) === JSON.stringify(obj2));

// console.log(Buffer.compare(result1Buf, buf1));

// const pvaTypes2 = new PvaTypes();
// obj1.properties.dimension.element.properties.size.type = "integer_scalar_signedInt";
// const result2 = PvaType.createFromObj(obj1, Pva_MESSAGE_ENDIANNESS.LITTLE, pvaTypes1);
// console.dir(pvaTypes.pvaTypesById["7"], { depth: null });
// // console.log(result.properties)
// console.dir(a, {depth: null})
// console.dir(result.deserialize([]), {depth: null})
// const obj2 = result2.deserialize([]);
// console.dir(obj2, {depth: null})
// console.log(JSON.stringify(obj1) === JSON.stringify(obj2))

// // // deserialize buf1
// // const type1 = PvaTypeStaticMethods.deserialize(buf1, 0, Pva_MESSAGE_ENDIANNESS.LITTLE, typesById);
// // console.log(typesById);
// // console.log(type1);

// // // serialize buf1
// // const buf1a = Buffer.alloc(1000);
// // const endPosition1 = PvaTypeStaticMethods.serialize(type1, buf1a, Pva_MESSAGE_ENDIANNESS.LITTLE, 0, typesById);
// // const buf1aArray = [...buf1a.slice(0, endPosition1)];

// // for (let ii = 0; ii < Math.max(buf1Array.length, endPosition1); ii++) {
// // 	console.log(ii, buf1aArray[ii].toString(16) === buf1Array[ii].toString(16));
// // 	// console.log(buf1aArray[ii].toString(16));
// // }

// // console.log(buf1Array.length, endPosition1);
// // ---------------------- test 2 -------------------

// // big endian

// // const buf2 = Buffer.from(buf2Array);

// // let pvaTypes = new PvaTypes();

// // // deserialize buf2
// // const type2 = PvaTypes.deserialize(buf2, 0, Pva_MESSAGE_ENDIANNESS.BIG, pvaTypes.typesById, pvaTypes.buffersById);
// // console.log(pvaTypes.typesById);
// // console.log(type2);
// // console.log(pvaTypes.buffersById);

// // // serialize buf2
// // const buf2a = Buffer.alloc(1000);
// // PvaTypes.initSerialization();
// // const endPosition2 = PvaTypes.serialize(type2, buf2a, Pva_MESSAGE_ENDIANNESS.BIG, 0, pvaTypes.typesById);
// // const buf2aArray = [...buf2a.slice(0, endPosition2)];
// // console.log(buf2a);

// // for (let ii = 0; ii < Math.max(buf2Array.length, endPosition2); ii++) {
// // 	console.log(ii, buf2aArray[ii].toString(16) === buf2Array[ii].toString(16));
// // }

// // console.log(buf2Array.length, endPosition2);

// // ---------------------- test 3: PvaType class -----------------------

// const buf = Buffer.from(buf1Array);

// let types = new PvaTypes();
// const type = new PvaType(buf, types, Pva_MESSAGE_ENDIANNESS.LITTLE);

// console.log(type.buffer);
// console.log(type.typeDef);
// console.log(type.typesById);

// let types1 = new PvaTypes();
// const newDef = JSON.parse(JSON.stringify(type.getTypeDefExpanded()));
// console.log(newDef);

// const type1 = new PvaType(newDef, types, Pva_MESSAGE_ENDIANNESS.LITTLE);
// console.log(type1.buffer);

// for (let ii = 0; ii < type1.buffer.length; ii++) {
// 	console.log(ii, type1.buffer[ii] === type.buffer[ii], type1.buffer[ii].toString(16), type.buffer[ii].toString(16));
// }

// // console.log(Buffer.compare(type1.buffer, type.buffer))

// // console.log(type1.buffer)
// // console.log( type.buffer)

// // console.log(type.buffer);
// // console.log(type.typeDef);
// // console.log(type.getTypeDefFull());
// // // console.dir(pvaType3.typesById, { depth: null });
// // // console.log(pvaType3.buffersById);

// // const newDef = JSON.parse(JSON.stringify(types.typesById["2"]));

// // // console.log(newDef)

// // newDef.choices.intValue.type = "integer_scalar_unsignedInt";

// // // console.log(newDef);
// // types = new PvaTypes();
// // let b = new PvaType(newDef, types, Pva_MESSAGE_ENDIANNESS.LITTLE);
// // // console.log(types.typesById);

// // // console.log(b.getTypeDefFull())

// // // // const pvaNewType = new PvaType(newDef, pvaTypes3, Pva_MESSAGE_ENDIANNESS.BIG);
// // // // console.log(pvaNewType.getTypeDefFull());

// // // // console.log(type.typeDef)
// // // // // console.log(pvaNewType.typesById["4"])

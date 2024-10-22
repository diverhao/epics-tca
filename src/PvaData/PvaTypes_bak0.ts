import { PvaGlobalMethods, Pva_MESSAGE_ENDIANNESS } from "../Global/PvaGlobalMethods";
import { PvaData_TYPES } from "./PvaData_typeEncoding";
import { PvaData_type_methods, type_def } from "./PvaType";

// represents a type with an ID
export abstract class PvaType {
	pvaTypesById: Record<string, PvaType | undefined>;
	// typesById: Record<string, type_def | undefined>;
	// buffersById: Record<string, Buffer>;
	pvaTypes: PvaTypes;

	endianness: Pva_MESSAGE_ENDIANNESS;

	buffer: Buffer = Buffer.alloc(0);
	bufferStart = 0;
	bufferEnd = 0;
	bufferOffset: number = 0;

	id: number | undefined;
	type: string = "";

	obj: type_def = { type: "", newOffset: 0 };

	constructor(
		input: Buffer | type_def,
		pvaTypes: PvaTypes,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number = 0,
		id: number | undefined = undefined
	) {
		this.pvaTypes = pvaTypes;
		this.pvaTypesById = pvaTypes.pvaTypesById;
		this.endianness = endianness;
		this.id = id;

		if (input instanceof Buffer) {
			// no copy
			this.buffer = input;
			this.bufferStart = start;
			this.bufferOffset = start;
			this.bufferEnd = start;
		} else {
			this.obj = JSON.parse(JSON.stringify(input));
			this.type = this.obj.type;
			this.id = this.obj.id;
		}
	}

	abstract deserialize: (deserializedIds?: number[]) => type_def;
	abstract serialize: (serializedIds?: number[]) => Buffer;

	abstract buildFromBuffer: () => void;
	abstract buildFromObj: () => void;

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
				// const newPvaType = PvaTypes.deserialize(buffer, offset, endianness, pvaTypes, id);
				const newPvaType = this.createFromBuffer(buffer, offset, endianness, pvaTypes, id);
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
			newPvaType.buildFromBuffer();
			return newPvaType;
		} else {
			// field description code + ...
			// id = undefined
			const newPvaType = PvaType.createInstanceFromBuffer(buffer, offset - 1, endianness, pvaTypes, id);
			newPvaType.buildFromBuffer();
			return newPvaType;
		}
	};

	private static createInstanceFromBuffer = (
		buffer: Buffer,
		start: number,
		endianness: Pva_MESSAGE_ENDIANNESS,
		pvaTypes: PvaTypes,
		id: number | undefined = undefined
	): any => {
		const fieldDescCode = PvaGlobalMethods.bufferReadUInt8(buffer, endianness, start);
		const fieldDescName = PvaData_TYPES[fieldDescCode];

		if (fieldDescName.split("_")[1] === "scalar" && fieldDescName.split("_")[2] === "structure") {
			const newPvaType = new PvaStructureType(buffer, pvaTypes, endianness, start, id);
			return newPvaType;
		} else if (fieldDescName.split("_")[1] === "scalar" && fieldDescName.split("_")[2] === "union") {
			const newPvaType = new PvaUnionType(buffer, pvaTypes, endianness, start, id);
			return newPvaType;
		}
		// "arrays" have 51 types
		else if (
			fieldDescName.split("_")[1] === "fixedSizeArray" ||
			fieldDescName.split("_")[1] === "boundedSizeArray" ||
			fieldDescName.split("_")[1] === "variableSizeArray"
		) {
			const newPvaType = new PvaArrayType(buffer, pvaTypes, endianness, start, id);
			return newPvaType;
		} else {
			// primitive types, bounded string and variant union, "field description code" can fully describe the data type
			const newPvaType = new PvaPrimitiveType(buffer, pvaTypes, endianness, start, id);
			return newPvaType;
		}
	};

	static createStructureUnionFieldsFromBuffer = (pvaType: PvaUnionType | PvaStructureType) => {
		// structure name
		if (pvaType instanceof PvaStructureType) {
			let nameTmp: any = PvaTypes.readString(pvaType.buffer, pvaType.bufferOffset, pvaType.endianness);
			pvaType.bufferOffset = nameTmp.newOffset;
			pvaType.name = nameTmp.str;
		}

		// number of properties/choices, encoded as size
		let num = 0;
		if (pvaType instanceof PvaStructureType) {
			let numTmp = PvaTypes.readSize(pvaType.buffer, pvaType.bufferOffset, pvaType.endianness);
			pvaType.bufferOffset = numTmp.newOffset;
			num = numTmp.size;
		} else {
			num = PvaGlobalMethods.bufferReadUInt16(pvaType.buffer, Pva_MESSAGE_ENDIANNESS.BIG, pvaType.bufferOffset);
			pvaType.bufferOffset = pvaType.bufferOffset + 2;
		}

		// each field (property/choice)
		for (let index = 0; index < num; index++) {
			// property/choice name
			let fieldNameTmp = PvaTypes.readString(pvaType.buffer, pvaType.bufferOffset, pvaType.endianness);
			pvaType.bufferOffset = fieldNameTmp.newOffset;
			const name = fieldNameTmp.str;

			// field type
			// let fieldType = PvaTypes.deserialize(pvaType.buffer, pvaType.bufferOffset, pvaType.endianness, pvaType.pvaTypes);
			let fieldType = this.createFromBuffer(pvaType.buffer, pvaType.bufferOffset, pvaType.endianness, pvaType.pvaTypes);
			// if there is an ID, the type must be "undefined", because the type of this ID may be changed without any notification
			// only use type and id to represent a type of a field, do not use object, because the object may be disgarded without any notification
			const fieldTypeStr: Record<string, any> & { type: string | undefined; id: number | undefined } = {
				type: fieldType.id === undefined ? fieldType.type : undefined,
				id: fieldType.id,
			};

			const size = fieldType.size;

            if (size !== undefined) {
				fieldTypeStr.size = size;
			}

			if (pvaType instanceof PvaStructureType) {
				pvaType.properties[name] = fieldTypeStr;
			} else {
				pvaType.choices[name] = fieldTypeStr;
			}

			pvaType.bufferOffset = fieldType.bufferEnd;
		}
	};

	// ------------------- create and build from object -----------------

	static createFromObj = (obj: type_def, endianness: Pva_MESSAGE_ENDIANNESS, pvaTypes: PvaTypes): PvaType => {
		if (obj.useID === true) {
			const id = obj.id;
			if (id !== undefined) {
				const existingType = pvaTypes.pvaTypesById[id.toString()];
				if (existingType !== undefined) {
					return existingType;
				} else {
					const errorMsg = `ID ${id} does not exist`;
					throw new Error(errorMsg);
				}
			} else {
				throw new Error("There must be an ID in object");
			}
		}

		const newPvaType = PvaType.createInstanceFromObj(obj, endianness, pvaTypes);
		if (obj.id !== undefined) {
			pvaTypes.pvaTypesById[obj.id.toString()] = newPvaType;
		}
		newPvaType.buildFromObj();
		return newPvaType;
	};

	private static createInstanceFromObj = (obj: type_def, endianness: Pva_MESSAGE_ENDIANNESS, pvaTypes: PvaTypes): any => {
		const fieldDescName = obj.type;

		if (fieldDescName.split("_")[1] === "scalar" && fieldDescName.split("_")[2] === "structure") {
			const newPvaType = new PvaStructureType(obj, pvaTypes, endianness, 0, obj.id);
			return newPvaType;
		} else if (fieldDescName.split("_")[1] === "scalar" && fieldDescName.split("_")[2] === "union") {
			const newPvaType = new PvaUnionType(obj, pvaTypes, endianness, 0, obj.id);
			return newPvaType;
		}
		// "arrays" have 51 types
		else if (
			fieldDescName.split("_")[1] === "fixedSizeArray" ||
			fieldDescName.split("_")[1] === "boundedSizeArray" ||
			fieldDescName.split("_")[1] === "variableSizeArray"
		) {
			const newPvaType = new PvaArrayType(obj, pvaTypes, endianness, 0, obj.id);
			return newPvaType;
		} else {
			// primitive types, bounded string and variant union, "field description code" can fully describe the data type
			const newPvaType = new PvaPrimitiveType(obj, pvaTypes, endianness, 0, obj.id);
			return newPvaType;
		}
	};

	static createStructureUnionFieldsFromObj = (pvaType: PvaUnionType | PvaStructureType) => {
		// structure name
		let fields: Record<string, any> = {};
		if (pvaType instanceof PvaStructureType) {
			pvaType.name = pvaType.obj.name;
			fields = pvaType.obj.properties;
		} else {
			fields = pvaType.obj.choices;
		}

		// obj.properties or obj.choices may not exist, because the ID may be already defined

		if (fields === undefined) {
			if (pvaType.id === undefined) {
				throw new Error("One of fields or ID must be there.");
			} else {
				//
				return;
			}
		}

		// each field (property/choice)
		for (let name of Object.keys(fields)) {
			// field type
			const fieldObj = fields[name];
			let fieldType = PvaType.createFromObj(fieldObj, pvaType.endianness, pvaType.pvaTypes);

			// if there is an ID, the type must be "undefined", because the type of this ID may be changed without any notification
			// only use type and id to represent a type of a field, do not use object, because the object may be disgarded without any notification
			const fieldTypeStr = { type: fieldType.id === undefined ? fieldType.type : undefined, id: fieldType.id };
			if (pvaType instanceof PvaStructureType) {
				pvaType.properties[name] = fieldTypeStr;
			} else if (pvaType instanceof PvaUnionType) {
				pvaType.choices[name] = fieldTypeStr;
			}
			// // console.log(fieldType.type, fieldObj.name)
			// if (fieldType.name === "time_t") {
			//     console.log(fieldType.name, fieldType.properties, fieldType === pvaType.pvaTypes.pvaTypesById["7"]);
			// 	// console.log(pvaType.pvaTypes.pvaTypesById["7"].properties === fieldType.properties, fieldType.properties);
			// }
		}
	};

	deserializeStructureUnionFields = (fields: Record<string, { type: string | undefined; id: number | undefined }>, deserializedIDs: number[]) => {
		const result: Record<string, any> = {};
		for (let fieldName in fields) {
			const field = fields[fieldName];
			if (field.id === undefined) {
				// no ID, mostly primitive type
				result[fieldName] = JSON.parse(JSON.stringify(field));
			} else {
				// has an ID
				const fieldType = this.pvaTypesById[field.id.toString()];
				if (fieldType !== undefined) {
					result[fieldName] = fieldType.deserialize(deserializedIDs);
				} else {
					// has an ID,  but not defined
					const errorMsg = `ID ${field.id} does not exist`;
					throw new Error(errorMsg);
				}
			}
		}
		return result;
	};

	static serializeStructureUnionFields = (pvaType: PvaType, serializedIDs: number[]): Buffer => {
		let buffer = Buffer.alloc(0);

		// write field types
		let fields: Record<string, { type: string | undefined; id: number | undefined }> = {};

		if (pvaType instanceof PvaStructureType) {
			fields = pvaType.properties;
		} else if (pvaType instanceof PvaUnionType) {
			fields = pvaType.choices;
		}

		for (let fieldName in fields) {
			// write field name
			buffer = Buffer.concat([buffer, PvaTypes.createBufferFromString(fieldName, pvaType.endianness)]);
			// write field type
			const fieldObj = fields[fieldName];

			buffer = Buffer.concat([buffer, PvaType.serializeType(fieldObj, pvaType.pvaTypes, serializedIDs)]);
		}
		return buffer;
	};

	// serialize a type without an ID
	static serializeType = (obj: { type: string | undefined; id: number | undefined }, pvaTypes: PvaTypes, serializedIDs: number[]): Buffer => {
		if (obj.id === undefined) {
			// create a new object in a new context!
			const pvaTypesTmp = new PvaTypes();
			const newPvaType = PvaType.createFromObj(obj as type_def, Pva_MESSAGE_ENDIANNESS.BIG, pvaTypesTmp);
			return newPvaType.serialize(serializedIDs);
		} else {
			const existingPvaType = pvaTypes.pvaTypesById[obj.id.toString()];
			if (existingPvaType === undefined) {
				throw new Error("Cannot find ID");
			} else {
				return existingPvaType.serialize(serializedIDs);
			}
		}
	};
}

// for 0xff, empty type
export class PvaEmptyType extends PvaType {
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
	buildFromBuffer = (): void => {};
	buildFromObj = (): void => {};
	deserialize = (deserializedIDs: number[] = []): type_def => {
		return { type: this.type };
	};
	serialize = (serializedIDs: number[] = []): Buffer => {
		return Buffer.from([0xff]);
	};
}
export class PvaPrimitiveType extends PvaType {
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
	buildFromBuffer = (): void => {
		const fieldDescCode = PvaGlobalMethods.bufferReadUInt8(this.buffer, this.endianness, this.bufferOffset);
		this.bufferOffset = this.bufferOffset + 1;
		this.type = PvaData_TYPES[fieldDescCode];

		if (this.type === "scalar_boundedString") {
			// number of properties/choices
			let sizeTmp = PvaTypes.readSize(this.buffer, this.bufferOffset, this.endianness);
			this.bufferOffset = sizeTmp.newOffset;
			this.size = sizeTmp.size;
		}

		this.bufferEnd = this.bufferOffset;
	};
	deserialize = (deserializedIDs: number[] = []) => {
		const result: type_def = { type: this.type };

		if (this.type === "scalar_boundedString") {
			result.size = this.size;
		}

		if (this.id !== undefined) {
			result.id = this.id;
			if (deserializedIDs.includes(this.id)) {
				result.useID = true;
			} else {
				deserializedIDs.push(this.id);
				// no further action
			}
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

	// more like initialize "this" from this.obj
	buildFromObj = (): void => {
		this.type = this.obj.type;

		if (this.type === "scalar_boundedString") {
			this.size = this.obj.size;
		}
	};
}

export class PvaStructureType extends PvaType {
	properties: Record<string, Record<string, any> & { type: string | undefined; id: number | undefined }> = {};
	name: string = "";
	constructor(
		input: Buffer | type_def,
		pvaTypes: PvaTypes,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number = 0,
		id: number | undefined = undefined
	) {
		super(input, pvaTypes, endianness, start, id);
	}

	buildFromBuffer = (): void => {
		// "field description code" + structure name + number of properties + each property
		const fieldDescCode = PvaGlobalMethods.bufferReadUInt8(this.buffer, this.endianness, this.bufferOffset);
		this.bufferOffset++;
		// string representation of structure type
		this.type = PvaData_TYPES[fieldDescCode];

		PvaType.createStructureUnionFieldsFromBuffer(this);
		this.bufferEnd = this.bufferOffset;
	};

	deserialize = (deserializedIDs: number[] = []) => {
		const result: type_def = { type: this.type, name: this.name };

		if (this.id === undefined) {
			const errorMsg = `ID is undefined`;
			throw new Error(errorMsg);
		} else {
			result.id = this.id;
			if (deserializedIDs.includes(this.id)) {
				result.useID = true;
			} else {
				deserializedIDs.push(this.id);
				result.properties = this.deserializeStructureUnionFields(this.properties, deserializedIDs);
			}
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

		if (this instanceof PvaStructureType) {
			// write structure name
			buffer = Buffer.concat([buffer, PvaTypes.createStringBuffer(this.name, this.endianness)]);
		}

		// write number of properties as a size
		const propSize = Object.keys(this.properties).length;
		buffer = Buffer.concat([buffer, PvaTypes.writeSize(propSize, this.endianness)]);

		// write all properties
		buffer = Buffer.concat([buffer, PvaType.serializeStructureUnionFields(this, serializedIDs)]);

		return buffer;
	};

	buildFromObj = (): void => {
		this.type = this.obj.type;
		PvaType.createStructureUnionFieldsFromObj(this);
	};
}

export class PvaUnionType extends PvaType {
	choices: Record<string, Record<string, any> & { type: string | undefined; id: number | undefined }> = {};
	constructor(
		input: Buffer | type_def,
		pvaTypes: PvaTypes,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number = 0,
		id: number | undefined = undefined
	) {
		super(input, pvaTypes, endianness, start, id);
	}

	buildFromBuffer = (): void => {
		// "field description code"
		const fieldDescCode = PvaGlobalMethods.bufferReadUInt8(this.buffer, this.endianness, this.bufferOffset);
		this.bufferOffset++;
		// string representation of union type
		this.type = PvaData_TYPES[fieldDescCode];

		PvaType.createStructureUnionFieldsFromBuffer(this);

		this.bufferEnd = this.bufferOffset;
	};

	deserialize = (deserializedIDs: number[] = []) => {
		const result: type_def = { type: this.type };

		if (this.id === undefined) {
			const errorMsg = `ID is undefined`;
			throw new Error(errorMsg);
		} else {
			result.id = this.id;
			if (deserializedIDs.includes(this.id)) {
				result.useID = true;
			} else {
				deserializedIDs.push(this.id);
				result.choices = this.deserializeStructureUnionFields(this.choices, deserializedIDs);
			}
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

		if (this instanceof PvaStructureType) {
			// write structure name
			buffer = Buffer.concat([buffer, PvaTypes.createStringBuffer(this.name, this.endianness)]);
		}

		// write number of properties as a size
		const choiceSize = Object.keys(this.choices).length;
		//todo:
		// buffer = Buffer.concat([buffer, PvaTypes.writeSize(choiceSize, this.endianness)]);
		buffer = Buffer.concat([buffer, PvaGlobalMethods.createBufferWriteUInt16(Pva_MESSAGE_ENDIANNESS.BIG, choiceSize, 0)]);

		// write all properties
		buffer = Buffer.concat([buffer, PvaType.serializeStructureUnionFields(this, serializedIDs)]);

		return buffer;
	};

	buildFromObj = (): void => {
		// "field description code"
		this.type = this.obj.type;
		PvaType.createStructureUnionFieldsFromObj(this);
	};
}

// fixed size array, bounded size array, variable size array,
export class PvaArrayType extends PvaType {
	size: number | undefined = undefined;
	element: { type: string | undefined; id: number | undefined } = { type: undefined, id: undefined };
	constructor(
		input: Buffer | type_def,
		pvaTypes: PvaTypes,
		endianness: Pva_MESSAGE_ENDIANNESS,
		start: number = 0,
		id: number | undefined = undefined
	) {
		super(input, pvaTypes, endianness, start, id);
	}
	buildFromBuffer = (): void => {
		const fieldDescCode = PvaGlobalMethods.bufferReadUInt8(this.buffer, this.endianness, this.bufferOffset);
		this.bufferOffset = this.bufferOffset + 1;
		this.type = PvaData_TYPES[fieldDescCode];

		// size
		if (this.type.includes("fixedSizeArray") || this.type.includes("boundedSizeArray")) {
			let sizeTmp = PvaTypes.readSize(this.buffer, this.bufferOffset, this.endianness);
			this.size = sizeTmp.size;
            this.bufferOffset = sizeTmp.newOffset;
		}

		// additional def for element type, other types are already finished
		if (this.type.includes("_structure") || this.type.includes("_union") || this.type.includes("_boundedString")) {
			// element type
			const elementType = PvaType.createFromBuffer(this.buffer, this.bufferOffset, this.endianness, this.pvaTypes);

			//  do not use "this" object, only use type string and id
			this.element = { type: elementType.id === undefined ? elementType.type : undefined, id: elementType.id };
			this.bufferEnd = elementType.bufferEnd;
		} else {
			this.bufferEnd = this.bufferOffset;
		}
	};

	deserialize = (deserializedIDs: number[] = []): type_def => {
		const result: type_def = { type: this.type };

		if (this.size !== undefined) {
			result.size = this.size;
		}

		if (this.id !== undefined) {
			result.id = this.id;
			if (deserializedIDs.includes(this.id)) {
				result.useID = true;
			} else {
				// structure must have an ID
				deserializedIDs.push(this.id);
				if (this.element.id !== undefined) {
					const element = this.pvaTypesById[this.element.id];
					result.element = element?.deserialize(deserializedIDs);
				} else {
					result.element = { type: this.element.type };
				}
			}
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

		// write element type
		if (this.element.type !== undefined || this.element.id !== undefined) {
			const elementTypeObj = this.element;
			buffer = Buffer.concat([buffer, PvaType.serializeType(elementTypeObj, this.pvaTypes, serializedIDs)]);
		}

		return buffer;
	};

	buildFromObj = (): void => {
		this.type = this.obj.type;

		// size
		if (this.type.includes("fixedSizeArray") || this.type.includes("boundedSizeArray")) {
			this.size = this.obj.size;
		}

		// additional def for element type, other types are already finished
		if (this.type.includes("_structure") || this.type.includes("_union") || this.type.includes("_boundedString")) {
			// element type
			const elementType = PvaType.createFromObj(this.obj.element, this.endianness, this.pvaTypes);
			//  do not use "this" object, only use type string and id
			this.element = { type: elementType.id === undefined ? elementType.type : undefined, id: elementType.id };
		} else {
			// do nothing
		}
	};
}

export class PvaTypes {
	pvaTypesById: Record<string, PvaType | undefined>;
	// typesById: Record<string, type_def>;
	// buffersById: Record<string, Buffer>;
	constructor() {
		// this.typesById = {};
		// this.buffersById = {};
		this.pvaTypesById = {};
	}

	// // --------------- check if a data is a particular type --------------------

	// // check if "data" is of type "id"
	// static checkStructure = (data: any, typeDef: type_def, typesById: Record<string, type_def | undefined>): boolean => {
	// 	const typeDefFull = this.getTypeDefFull(typeDef, typesById);
	// 	// check number of properties
	// 	if (Object.keys(data).length !== Object.keys(typeDefFull.properties).length) {
	// 		return false;
	// 	}
	// 	// check property names
	// 	for (let ii = 0; ii < Object.keys(data).length; ii++) {
	// 		if (Object.keys(data)[ii] !== Object.keys(typeDefFull.properties)[ii]) {
	// 			return false;
	// 		}
	// 	}
	// 	// check each property's type
	// 	const propertyNames = Object.keys(typeDefFull.properties);
	// 	for (let ii = 0; ii < Object.keys(data).length; ii++) {
	// 		const propertyName = propertyNames[ii];
	// 		if (this.checkType(data[propertyName], typeDefFull.properties[propertyName], typesById) === false) {
	// 			return false;
	// 		}
	// 	}
	// 	return true;
	// };

	// // data = {choice # : value}
	// static checkUnion = (data: any, typeDef: type_def, typesById: Record<string, type_def | undefined>): boolean => {
	// 	const typeDefFull = this.getTypeDefFull(typeDef, typesById);

	// 	// the "data" must be an object
	// 	if ((typeof data).toLocaleLowerCase() !== "object") {
	// 		return false;
	// 	}
	// 	// the "data" must be an object with one field
	// 	if (Object.keys(data).length !== 1) {
	// 		return false;
	// 	}
	// 	// the "data"'s field key must be a number smaller than number of choices
	// 	const choiceStr = Object.keys(data)[0];
	// 	const choice = parseInt(choiceStr);
	// 	if (isNaN(choice)) {
	// 		return false;
	// 	}
	// 	if (choice >= Object.keys(typeDefFull.choices).length) {
	// 		return false;
	// 	}

	// 	// check the value's type
	// 	let choiceName = Object.keys(typeDefFull.choices)[choice];

	// 	const choiceTypeDef = typeDefFull.choices[choiceName];
	// 	return this.checkType(Object.values(data)[0], choiceTypeDef, typesById);
	// };

	// static checkVariantUnion = (data: any, typeDef: type_def, typesById: Record<string, type_def | undefined>): boolean => {
	// 	//todo
	// 	return true;
	// };
	// static checkBoundedString = (data: any, typeDef: type_def, typesById: Record<string, type_def | undefined>): boolean => {
	// 	const typeDefFull = this.getTypeDefFull(typeDef, typesById);

	// 	const size = typeDefFull.size;
	// 	if (typeof data !== "string" || data.length > size) {
	// 		return false;
	// 	}
	// 	return true;
	// };

	// static checkFixedSizeArray = (data: any, typeDef: type_def, typesById: Record<string, type_def | undefined>): boolean => {
	// 	const typeDefFull = this.getTypeDefFull(typeDef, typesById);

	// 	if (!Array.isArray(data)) {
	// 		return false;
	// 	} else {
	// 		// get array element's type
	// 		const elementTypeDef = typeDefFull.element;
	// 		// check size
	// 		const size = typeDefFull.size;
	// 		if (data.length !== size) {
	// 			return false;
	// 		}
	// 		// check each element's type
	// 		for (let element of data) {
	// 			if (this.checkType(element, elementTypeDef, typesById) === false) {
	// 				return false;
	// 			}
	// 		}
	// 	}
	// 	return true;
	// };

	// static checkBoundedSizeArray = (data: any, typeDef: type_def, typesById: Record<string, type_def | undefined>): boolean => {
	// 	const typeDefFull = this.getTypeDefFull(typeDef, typesById);

	// 	if (!Array.isArray(data)) {
	// 		return false;
	// 	} else {
	// 		// check size
	// 		const size = typeDefFull.size;
	// 		if (data.length > size) {
	// 			return false;
	// 		}
	// 		// get array element's type
	// 		const elementTypeDef = typeDefFull.element;
	// 		// check each element's type
	// 		for (let element of data) {
	// 			if (this.checkType(element, elementTypeDef, typesById) === false) {
	// 				return false;
	// 			}
	// 		}
	// 	}
	// 	return true;
	// };

	// static checkVariableSizeArray = (data: any, typeDef: type_def, typesById: Record<string, type_def | undefined>): boolean => {
	// 	const typeDefFull = this.getTypeDefFull(typeDef, typesById);

	// 	if (!Array.isArray(data)) {
	// 		return false;
	// 	} else {
	// 		// get array element's type, can never be "undefined"
	// 		const elementTypeDef = typeDefFull.element;
	// 		// user-defined element type
	// 		// check each element's type
	// 		for (let element of data) {
	// 			if (this.checkType(element, elementTypeDef, typesById) === false) {
	// 				return false;
	// 			}
	// 		}
	// 	}
	// 	return true;
	// };

	// static checkPrimitive = (data: any, typeDef: type_def, typesById: Record<string, type_def | undefined>): boolean => {
	// 	const typeDefFull = this.getTypeDefFull(typeDef, typesById);

	// 	switch (typeDefFull.type) {
	// 		case "string_scalar":
	// 			if (typeof data === "string") {
	// 				return true;
	// 			}
	// 			break;
	// 		case "boolean_scalar":
	// 			// treated as unsigned one byte data
	// 			if (typeof data === "number" && data < 256 && data >= 0) {
	// 				return true;
	// 			}
	// 			break;
	// 		case "integer_scalar_signedLong":
	// 			// signed 8 byte
	// 			if (typeof data === "number" && data < 0x8000000000000000 && data >= -0x8000000000000000) {
	// 				return true;
	// 			}
	// 			break;
	// 		case "integer_scalar_signedInt":
	// 			// signed 4 byte
	// 			if (typeof data === "number" && data < 0x80000000 && data >= -0x80000000) {
	// 				return true;
	// 			}
	// 			break;
	// 		case "integer_scalar_signedShort":
	// 			// signed 2 byte
	// 			if (typeof data === "number" && data < 0x8000 && data >= -0x8000) {
	// 				return true;
	// 			}
	// 			break;
	// 		case "integer_scalar_signedByte":
	// 			// signed 1 byte
	// 			if (typeof data === "number" && data < 0x80 && data >= -0x80) {
	// 				return true;
	// 			}
	// 			break;
	// 		// too big!
	// 		case "floatingPoint_scalar_binary128":
	// 		case "floatingPoint_scalar_binary64":
	// 			// 8 byte floating
	// 			if (typeof data === "number" && data < Number.MAX_VALUE && data >= -Number.MAX_VALUE) {
	// 				return true;
	// 			}
	// 			break;
	// 		case "floatingPoint_scalar_binary32":
	// 			// 4 byte floating
	// 			if (typeof data === "number" && data < 3.402823466e38 && data >= -3.402823466e38) {
	// 				return true;
	// 			}
	// 			break;
	// 		case "integer_scalar_unsignedLong":
	// 			// unsigned 8 byte
	// 			if (typeof data === "number" && data < 0xffffffffffffffff && data >= 0) {
	// 				return true;
	// 			}
	// 			break;
	// 		case "integer_scalar_unsignedInt":
	// 			// unsigned 4 byte
	// 			if (typeof data === "number" && data < 0xffffffff && data >= 0) {
	// 				return true;
	// 			}
	// 			break;
	// 		case "integer_scalar_unsignedShort":
	// 			// unsigned 2 byte
	// 			if (typeof data === "number" && data < 0xffff && data >= 0) {
	// 				return true;
	// 			}
	// 			break;
	// 		case "integer_scalar_unsignedByte":
	// 			// unsigned 1 byte
	// 			if (typeof data === "number" && data < 0xff && data >= 0) {
	// 				return true;
	// 			}
	// 			break;
	// 	}
	// 	return false;
	// };

	// static checkType = (data: any, typeDef: type_def, typesById: Record<string, type_def | undefined>): boolean => {
	// 	const primitiveTypes = [
	// 		"string_scalar",
	// 		"boolean_scalar",
	// 		"integer_scalar_unsignedLong",
	// 		"integer_scalar_unsignedInt",
	// 		"integer_scalar_unsignedShort",
	// 		"integer_scalar_unsignedByte",
	// 		"integer_scalar_signedLong",
	// 		"integer_scalar_signedInt",
	// 		"integer_scalar_signedShort",
	// 		"integer_scalar_signedByte",
	// 		"floatingPoint_scalar_binary128",
	// 		"floatingPoint_scalar_binary64",
	// 		"floatingPoint_scalar_binary32",
	// 	];

	// 	// data is simply a string/number
	// 	if (primitiveTypes.includes(typeDef.type)) {
	// 		return this.checkPrimitive(data, typeDef, typesById);
	// 	}

	// 	// complex_fixedSizeArray_boundedString = 0x9b,
	// 	// complex_fixedSizeArray_variantUnion = 0x9a,
	// 	// complex_fixedSizeArray_union = 0x99,
	// 	// complex_fixedSizeArray_structure = 0x98,
	// 	// string_fixedSizeArray = 0x78,
	// 	// floatingPoint_fixedSizeArray_binary128 = 0x5c,
	// 	// floatingPoint_fixedSizeArray_binary64 = 0x5b,
	// 	// floatingPoint_fixedSizeArray_binary32 = 0x5a,
	// 	// integer_fixedSizeArray_unsignedLong = 0x3f,
	// 	// integer_fixedSizeArray_unsignedInt = 0x3e,
	// 	// integer_fixedSizeArray_unsignedShort = 0x3d,
	// 	// integer_fixedSizeArray_unsignedByte = 0x3c,
	// 	// integer_fixedSizeArray_signedLong = 0x3b,
	// 	// integer_fixedSizeArray_signedInt = 0x3a,
	// 	// integer_fixedSizeArray_signedShort = 0x39,
	// 	// integer_fixedSizeArray_signedByte = 0x38,
	// 	// boolean_fixedSizeArray = 0x18,
	// 	else if (typeDef.type.includes("fixedSizeArray")) {
	// 		return this.checkFixedSizeArray(data, typeDef, typesById);
	// 	}

	// 	// complex_variableSizeArray_boundedString = 0x8b,
	// 	// complex_variableSizeArray_variantUnion = 0x8a,
	// 	// complex_variableSizeArray_union = 0x89,
	// 	// complex_variableSizeArray_structure = 0x88,
	// 	// string_variableSizeArray = 0x68,
	// 	// floatingPoint_variableSizeArray_binary128 = 0x4c,
	// 	// floatingPoint_variableSizeArray_binary64 = 0x4b,
	// 	// floatingPoint_variableSizeArray_binary32 = 0x4a,
	// 	// integer_variableSizeArray_unsignedLong = 0x2f,
	// 	// integer_variableSizeArray_unsignedInt = 0x2e,
	// 	// integer_variableSizeArray_unsignedShort = 0x2d,
	// 	// integer_variableSizeArray_unsignedByte = 0x2c,
	// 	// integer_variableSizeArray_signedLong = 0x2b,
	// 	// integer_variableSizeArray_signedInt = 0x2a,
	// 	// integer_variableSizeArray_signedShort = 0x29,
	// 	// integer_variableSizeArray_signedByte = 0x28,
	// 	// boolean_variableSizeArray = 0x8,
	// 	else if (typeDef.type.includes("_variableSizeArray_")) {
	// 		return this.checkVariableSizeArray(data, typeDef, typesById);
	// 	}

	// 	// complex_boundedSizeArray_boundedString = 0x93,
	// 	// complex_boundedSizeArray_variantUnion = 0x92,
	// 	// complex_boundedSizeArray_union = 0x91,
	// 	// complex_boundedSizeArray_structure = 0x90,
	// 	// string_boundedSizeArray = 0x70,
	// 	// floatingPoint_boundedSizeArray_binary128 = 0x54,
	// 	// floatingPoint_boundedSizeArray_binary64 = 0x53,
	// 	// floatingPoint_boundedSizeArray_binary32 = 0x52,
	// 	// integer_boundedSizeArray_unsignedLong = 0x37,
	// 	// integer_boundedSizeArray_unsignedInt = 0x36,
	// 	// integer_boundedSizeArray_unsignedShort = 0x35,
	// 	// integer_boundedSizeArray_unsignedByte = 0x34,
	// 	// integer_boundedSizeArray_signedLong = 0x33,
	// 	// integer_boundedSizeArray_signedInt = 0x32,
	// 	// integer_boundedSizeArray_signedShort = 0x31,
	// 	// integer_boundedSizeArray_signedByte = 0x30,
	// 	// boolean_boundedSizeArray = 0x10,
	// 	else if (typeDef.type.includes("_boundedSizeArray_")) {
	// 		return this.checkBoundedSizeArray(data, typeDef, typesById);
	// 	}
	// 	// complex_scalar_boundedString = 0x83,
	// 	else if (typeDef.type === "complex_scalar_boundedString") {
	// 		return this.checkBoundedString(data, typeDef, typesById);
	// 	}
	// 	// complex_scalar_variantUnion = 0x82,
	// 	else if (typeDef.type === "complex_scalar_variantUnion") {
	// 		return this.checkVariantUnion(data, typeDef, typesById);
	// 	}
	// 	// complex_scalar_union = 0x81,
	// 	else if (typeDef.type === "complex_scalar_union") {
	// 		return this.checkUnion(data, typeDef, typesById);
	// 	}
	// 	// complex_scalar_structure = 0x80,
	// 	else if (typeDef.type === "complex_scalar_structure") {
	// 		return this.checkStructure(data, typeDef, typesById);
	// 	} else {
	// 		//todo
	// 		throw new Error("Wrong!");
	// 	}
	// };

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

const buf1 = Buffer.from(buf1Array);
const pvaTypes1 = new PvaTypes();
const result1 = PvaType.createFromBuffer(buf1, 0, Pva_MESSAGE_ENDIANNESS.LITTLE, pvaTypes1);
// let obj1 = result1.deserialize();
// console.log(obj1)
let result1Buf = result1.serialize();

for (let ii = 0; ii < buf1.length; ii++) {
	console.log(ii, buf1[ii].toString(16), result1Buf[ii].toString(16));
}

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

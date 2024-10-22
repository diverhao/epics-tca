import { Pva_MESSAGE_ENDIANNESS } from "../Global/PvaGlobalMethods";
import { PvaData_basic } from "./PvaData_basic";
import { PvaGlobalMethods } from "../Global/PvaGlobalMethods";

// buffer: size + contents (without 0-termination)

export class PvaData_string extends PvaData_basic {
	readonly buffer: Buffer;
	readonly str: string;
	constructor(input: string | Buffer, endianness: Pva_MESSAGE_ENDIANNESS) {
		super(endianness);
		if (typeof input === "string") {
			this.str = input;
			this.buffer = this.deserialize();
		} else {
			this.buffer = Buffer.alloc(input.length);
			input.copy(this.buffer);
			this.str = this.serialize();
		}
	}


    // ----------------- only expose Buffer and string to outside ---------

    getBuffer = (): Buffer => {
        return this.buffer;
    }
    getString = (): string => {
        return this.str;
    }

    // -------------------- serialize and deserialize --------------------

	// buffer to string
	private serialize = (): string => {
		const byte1: number = PvaGlobalMethods.bufferReadUInt8(this.buffer, this.endianness);
		if (byte1 === 0xff) {
			return "";
		} else if (byte1 < 0xfe) {
            return this.buffer.toString("utf8", 1, 1 + byte1);
		}
        
        // if byte1 === 0xfe, read next 4 bytes as signed integer
        const int1 = PvaGlobalMethods.bufferReadInt32(this.buffer, this.endianness, 1);
		if (int1 < 0x7fffffff) {
			return this.buffer.toString("utf8", 5, 5 + int1);
		} 

        // if int1 === 0x7fffffff, read next 8 bytes as signed integer
        const int2 = PvaGlobalMethods.bufferReadBigInt64(this.buffer, this.endianness, 1);
		if (int1 < 0x7fffffff) {
            //todo
            throw new Error("Buffer too large");
			// return this.buffer.toString("utf8", 13, BigInt(13) + int2);
		}

        throw new Error("Buffer cannot be serialized");
	};
	// string to buffer
	private deserialize = () => {
		const header = this.getBufferHeaderContents();
		const body = Buffer.from(this.str);
		return Buffer.concat([header, body]);
	};

	// -------------- sizes ---------------------
	// string real size, # of bytes occupied in Buffer, no trailing 0, this is the actual number in
	private getStringSize = (): number => {
		return this.str.length;
	};
	private getBufferHeaderSize = (): number => {
		return this.getArrayBufferHeaderSize(this.getStringSize());
	};
	private getBufferSize = (): number => {
		return this.getBufferHeaderSize() + this.getStringSize();
	};

	private getBufferHeaderContents = (): Buffer => {
		return this.getArrayBufferHeaderContents(this.getStringSize());
	};

}

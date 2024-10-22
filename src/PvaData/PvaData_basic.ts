import { PvaGlobalMethods, Pva_MESSAGE_ENDIANNESS } from "../Global/PvaGlobalMethods";

export class PvaData_basic {
    endianness: Pva_MESSAGE_ENDIANNESS;
    constructor (endianness: Pva_MESSAGE_ENDIANNESS) {
        this.endianness = endianness;
    }

    protected getArrayBufferHeaderSize = (arrayLength: number): number => {
        if (arrayLength === 0) {
            return 1;
        }
        else if (arrayLength < 0xfe) {
            return 1;
        }
        else if (arrayLength < 0x7fffffff) {
            return 5;
        }
        else if (arrayLength < 0x7FFFFFFFFFFFFFFF) {
            return 13;
        }
        else {
            throw new Error("Array size overflow");
        }
    }

    // returns a buffer
    protected getArrayBufferHeaderContents = (arrayLength: number): Buffer => {
        if (arrayLength === 0) {
            let buffer = Buffer.alloc(1);
            PvaGlobalMethods.bufferWriteUInt8(buffer, this.endianness, 0xff, 0);
            return buffer;
        }
        else if (arrayLength < 0xfe) {
            let buffer = Buffer.alloc(1);
            PvaGlobalMethods.bufferWriteUInt8(buffer, this.endianness, arrayLength, 0);
            return buffer;
        }
        else if (arrayLength < 0x7fffffff) {
            let buffer = Buffer.alloc(5);
            PvaGlobalMethods.bufferWriteUInt8(buffer, this.endianness, 0xfe, 0);
            PvaGlobalMethods.bufferWriteInt32(buffer, this.endianness, arrayLength, 1);
            return buffer;
        }
        //todo: the MAX_SAFE_INTEGER is 2^53 - 1, in here arrayLength is < 2^64 - 1
        else if (arrayLength < 0x7FFFFFFFFFFFFFFF) {
            let buffer = Buffer.alloc(13);
            PvaGlobalMethods.bufferWriteUInt8(buffer, this.endianness, 0xfe, 0);
            PvaGlobalMethods.bufferWriteInt32(buffer, this.endianness, 0x7fffffff, 1);
            PvaGlobalMethods.bufferWriteBigInt64(buffer, this.endianness, arrayLength, 5);
            return buffer;
        }
        else {
            throw new Error("Array size overflow");
        }
    }
}
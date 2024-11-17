import { SIZE_TYPE } from "./PvaData_typeEncoding";

export enum ENDIAN {
    LITTLE,
    BIG,
}



// -------------------------- size ----------------------------------
/**
 * Encode a size to buffer
 * 
 * @returns {number} new offset in the buffer
 * 
 * @throws when the size is wrong, e.g. negative number or bigger than 2^63 - 1
 */
export const encodeSize = (size: number, buffer: Buffer, offset: number, endian: ENDIAN): number => {
    if (size >= 0 && size < 0xff) {
        // [0, 255)
        writeUInt8(size, buffer, offset, endian);
        offset = offset + 1;
    } else if (size < 0x7fffffff) {
        // [255, 2^31 -1)
        writeUInt8(0xff, buffer, offset, endian);
        offset = offset + 1;
        writeInt32(size, buffer, offset, endian);
        offset = offset + 4;
    } else if (size < 0x7fffffffffffffff) {
        // [2^31 - 1, 2^63 -1)
        writeUInt8(0xff, buffer, offset, endian);
        offset = offset + 1;
        writeInt32(0x7fffffff, buffer, offset, endian);
        offset = offset + 4;
        //! leave next 8 bytes 0 ???
        offset = offset + 8;
    } else {
        throw new Error(`Failed to encode size ${size}`);
    }
    return offset;
};

/**
 * Create a buffer that encodes a size
 * 
 * @returns {Buffer} a new buffer that has encoded size
 */
export const createSizeBuffer = (size: number, endian: ENDIAN, sizeType: SIZE_TYPE | undefined) => {
    if (sizeType === SIZE_TYPE.unsigned_short) {
        const buffer = Buffer.alloc(2);
        writeUInt16(size, buffer, 0, endian);
        return buffer;
    } else {
        const buffer = Buffer.alloc(13);
        const offset = encodeSize(size, buffer, 0, endian);
        return buffer.slice(0, offset);
    }
}


// ------------------- write number to buffer -----------------------

export const createUInt8Buffer = (num: number, endian: ENDIAN) => {
    let buffer = Buffer.alloc(1);
    writeUInt8(num, buffer, 0, endian);
    return buffer
};

export const createUInt16Buffer = (num: number, endian: ENDIAN) => {
    let buffer = Buffer.alloc(2);
    writeUInt16(num, buffer, 0, endian);
    return buffer
};

export const createInt16Buffer = (num: number, endian: ENDIAN) => {
    let buffer = Buffer.alloc(2);
    writeInt16(num, buffer, 0, endian);
    return buffer
};

export const writeDouble = (num: number, buffer: Buffer, offset: number, endian: ENDIAN) => {
    if (endian === ENDIAN.BIG) {
        buffer.writeDoubleBE(num, offset);
    } else {
        buffer.writeDoubleLE(num, offset);
    }
};

export const writeFloat = (num: number, buffer: Buffer, offset: number, endian: ENDIAN) => {
    if (endian === ENDIAN.BIG) {
        buffer.writeFloatBE(num, offset);
    } else {
        buffer.writeFloatLE(num, offset);
    }
};

export const writeInt8 = (num: number, buffer: Buffer, offset: number, endian: ENDIAN) => {
    buffer.writeInt8(num, offset);
};

export const writeUInt8 = (num: number, buffer: Buffer, offset: number, endian: ENDIAN) => {
    buffer.writeUInt8(num, offset);
};

export const writeInt16 = (num: number, buffer: Buffer, offset: number, endian: ENDIAN) => {
    if (endian === ENDIAN.BIG) {
        buffer.writeInt16BE(num, offset);
    } else {
        buffer.writeInt16LE(num, offset);
    }
};

export const writeUInt16 = (num: number, buffer: Buffer, offset: number, endian: ENDIAN) => {
    if (endian === ENDIAN.BIG) {
        buffer.writeUInt16BE(num, offset);
    } else {
        buffer.writeUInt16LE(num, offset);
    }
};


export const writeInt32 = (num: number, buffer: Buffer, offset: number, endian: ENDIAN) => {
    if (endian === ENDIAN.BIG) {
        buffer.writeInt32BE(num, offset);
    } else {
        buffer.writeInt32LE(num, offset);
    }
};

export const writeUInt32 = (num: number, buffer: Buffer, offset: number, endian: ENDIAN) => {
    if (endian === ENDIAN.BIG) {
        buffer.writeUInt32BE(num, offset);
    } else {
        buffer.writeUInt32LE(num, offset);
    }
};

export const writeInt64 = (num: number | bigint, buffer: Buffer, offset: number, endian: ENDIAN) => {
    // Buffer.writeBigInt64BE only accepts bigint, and we cannot convert a floating number to bigint
    if (typeof num === "number") {
        if (num < 0) {
            if (Math.abs(Math.floor(num) - num) < 0.0000001) { // for integer input, like -42 --> -42
                num = BigInt(Math.floor(num));
            } else {
                num = BigInt(Math.floor(num) + 1); // non-integer input, like -42.5 --> -42
            }
        } else {
            num = BigInt(Math.floor(num));
        }
    }

    if (endian === ENDIAN.BIG) {
        buffer.writeBigInt64BE(num, offset);
    } else {
        buffer.writeBigInt64LE(num, offset);
    }
};

export const writeUInt64 = (num: number | bigint, buffer: Buffer, offset: number, endian: ENDIAN) => {
    // Buffer.writeBigUInt64BE only accepts bigint, and we cannot convert a floating number to bigint
    if (typeof num === "number") {
        num = BigInt(Math.floor(num));
    }
    if (endian === ENDIAN.BIG) {
        buffer.writeBigUInt64BE(num, offset);
    } else {
        buffer.writeBigUInt64LE(num, offset);
    }
};

// -------------------- read number from buffer ---------------------

export const readDouble = (buffer: Buffer, offset: number, endian: ENDIAN) => {
    if (endian === ENDIAN.BIG) {
        const result = buffer.readDoubleBE(offset);
        if (Number.isNaN(result)) {
            return 0;
        } else {
            return result;
        }
    } else {
        const result = buffer.readDoubleLE(offset);
        if (Number.isNaN(result)) {
            return 0;
        } else {
            return result;
        }
    }
};

export const readFloat = (buffer: Buffer, offset: number, endian: ENDIAN) => {
    if (endian === ENDIAN.BIG) {
        const result = buffer.readFloatBE(offset);
        if (Number.isNaN(result)) {
            return 0;
        } else {
            return result;
        }
    } else {
        const result = buffer.readFloatLE(offset);
        if (Number.isNaN(result)) {
            return 0;
        } else {
            return result;
        }
    }
};

export const readInt8 = (buffer: Buffer, offset: number, endian: ENDIAN) => {
    const result = buffer.readInt8(offset);
    if (Number.isNaN(result)) {
        return 0;
    } else {
        return result;
    }
};

export const readUInt8 = (buffer: Buffer, offset: number, endian: ENDIAN) => {
    const result = buffer.readUInt8(offset);
    if (Number.isNaN(result)) {
        return 0;
    } else {
        return result;
    }
};

export const readInt16 = (buffer: Buffer, offset: number, endian: ENDIAN) => {
    if (endian === ENDIAN.BIG) {
        const result = buffer.readInt16BE(offset);
        if (Number.isNaN(result)) {
            return 0;
        } else {
            return result;
        }
    } else {
        const result = buffer.readInt16LE(offset);
        if (Number.isNaN(result)) {
            return 0;
        } else {
            return result;
        }
    }
};

export const readUInt16 = (buffer: Buffer, offset: number, endian: ENDIAN) => {
    if (endian === ENDIAN.BIG) {
        const result = buffer.readUInt16BE(offset);
        if (Number.isNaN(result)) {
            return 0;
        } else {
            return result;
        }
    } else {
        const result = buffer.readUInt16LE(offset);
        if (Number.isNaN(result)) {
            return 0;
        } else {
            return result;
        }
    }
};

export const readInt32 = (buffer: Buffer, offset: number, endian: ENDIAN) => {
    if (endian === ENDIAN.BIG) {
        const result = buffer.readInt32BE(offset);
        if (Number.isNaN(result)) {
            return 0;
        } else {
            return result;
        }
    } else {
        const result = buffer.readInt32LE(offset);
        if (Number.isNaN(result)) {
            return 0;
        } else {
            return result;
        }
    }
};

export const readUInt32 = (buffer: Buffer, offset: number, endian: ENDIAN) => {
    if (endian === ENDIAN.BIG) {
        const result = buffer.readUInt32BE(offset);
        if (Number.isNaN(result)) {
            return 0;
        } else {
            return result;
        }
    } else {
        const result = buffer.readUInt32LE(offset);
        if (Number.isNaN(result)) {
            return 0;
        } else {
            return result;
        }
    }
};

export const readInt64 = (buffer: Buffer, offset: number, endian: ENDIAN) => {
    if (endian === ENDIAN.BIG) {
        const result = buffer.readBigInt64BE(offset);
        if (Number.isNaN(result)) {
            return 0;
        } else {
            return result;
        }
    } else {
        const result = buffer.readBigInt64LE(offset);
        if (Number.isNaN(result)) {
            return 0;
        } else {
            return result;
        }
    }
};

export const readUInt64 = (buffer: Buffer, offset: number, endian: ENDIAN) => {
    if (endian === ENDIAN.BIG) {
        const result = buffer.readBigUInt64BE(offset);
        if (Number.isNaN(result)) {
            return 0;
        } else {
            return result;
        }
    } else {
        const result = buffer.readBigUInt64LE(offset);
        if (Number.isNaN(result)) {
            return 0;
        } else {
            return result;
        }
    }
};
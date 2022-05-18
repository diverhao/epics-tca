import { Buffer } from 'buffer';
import { CA_MSG_HEADER_SIZE, CA_EXT_MSG_HEADER_SIZE, CA_MSG_HEADER_OFFSETS, CA_EXT_MSG_HEADER_OFFSETS } from "./global"

export class GlobalMethods {

    static DEBUG: boolean = true;
    static SHOWINFO: boolean = true;
    static SHOWERROR: boolean = true;

    static debugLog(...args: any[]) {
        if (GlobalMethods.DEBUG === true) {
            console.log(`\x1b[36m`, `[DEBUG]:`, `\x1b[0m`, ...args);
        }
    }

    static infoLog(...args: any[]) {
        if (GlobalMethods.SHOWINFO === true) {
            console.log(`\x1b[34m`, `[INFO]: `, `\x1b[0m`, ...args);
        }
    }

    static errorLog(...args: any[]) {
        if (GlobalMethods.SHOWERROR === true) {
            console.log(`\x1b[31m`, `[ERROR]:`, `\x1b[0m`, ...args);
        }
    }

    static ipString2Int(ip: string): number {
        return ip.split('.').reduce(function (ipInt, octet) { return (ipInt << 8) + parseInt(octet, 10) }, 0) >>> 0;
    }

    static ipInt2String(ip: number): string {
        let d = `${ip % 256}`;
        for (var i = 3; i > 0; i--) {
            ip = Math.floor(ip / 256);
            d = `${ip % 256}.${d}`;
        }
        return d;
    }

    static getBufferPaddedSize(buffer: Buffer) {
        let ii;
        for (ii = buffer.length - 1; ii >= 0; ii--) {
            if (buffer[ii] !== 0x00) {
                break;
            }
        }
        return (ii + 2) % 8 === 0 ? ii + 2 : Math.ceil((ii + 2) / 8) * 8;
    }
    static getStringPaddedSize(str: string) {
        let size = str.length;
        if (size % 8 === 0) {
            return size;
        }
        else {
            return Math.floor(Math.ceil(size / 8) * 8 + 0.01);
        }
    }

    static splitMessage(msg: Buffer) {
        let messages: Buffer[] = [];
        let offset = 0;
        while (offset < msg.length) {
            let command = msg.readUInt16BE(offset + CA_MSG_HEADER_OFFSETS.command);
            let version = msg.readUInt16BE(offset + CA_MSG_HEADER_OFFSETS.dataCount);
            if (command === 0x00 && version === 0x00) {
                break;
            }

            let payloadSize = msg.readUInt16BE(offset + CA_MSG_HEADER_OFFSETS.payloadSize);
            let headerSize = CA_MSG_HEADER_SIZE;
            // extended header 
            if (GlobalMethods.isExtendedMessageHeader(msg, offset)) {
                headerSize = CA_EXT_MSG_HEADER_SIZE;
                payloadSize = msg.readUInt32BE(offset + CA_EXT_MSG_HEADER_OFFSETS.payloadSize);
            }
            messages.push(msg.slice(offset, offset + headerSize + payloadSize));
            offset = offset + headerSize + payloadSize;
        }
        return messages;
    }

    static isExtendedMessageHeader(msg: Buffer, offset: number) {
        let payloadSize = msg.readUInt16BE(offset + CA_MSG_HEADER_OFFSETS.payloadSize);
        // extended header 
        if (payloadSize === 0xFFFF) {
            return true;
        }
        else {
            return false;
        }

    }

}


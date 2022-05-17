import { Buffer } from 'buffer';

export class GlobalMethods {

    static DEBUG: boolean = true;

    static debugLog(...args: any[]) {
        if (GlobalMethods.DEBUG === true) {
            console.log(`\x1b[36m`, `[DEBUG]:`, `\x1b[0m`, ...args);
        }
    }

    static infoLog(...args: any[]) {
        console.log(`\x1b[34m`, `[INFO]: `, `\x1b[0m`, ...args);
    }

    static errorLog(...args: any[]) {
        console.log(`\x1b[31m`, `[ERROR]:`, `\x1b[0m`, ...args);
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
        return (ii + 2) % 8 === 0 ? ii + 2: Math.ceil((ii + 2) /8) * 8;
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
}
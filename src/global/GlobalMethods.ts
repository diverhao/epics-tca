import { Buffer } from 'buffer';
import { CA_MSG_HEADER_SIZE, CA_COMMANDS, CA_EXT_MSG_HEADER_SIZE, CA_MSG_HEADER_OFFSETS, CA_EXT_MSG_HEADER_OFFSETS, CA_COMMANDS_INV, msgNames, CA_MSG_HEADER_SIZES } from "../Global/Constants";


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
}
export function ipString2Int(ip: string): number {
    return ip.split('.').reduce(function (ipInt, octet) { return (ipInt << 8) + parseInt(octet, 10) }, 0) >>> 0;
}

export function ipInt2String(ip: number): string {
    let d = `${ip % 256}`;
    for (var i = 3; i > 0; i--) {
        ip = Math.floor(ip / 256);
        d = `${ip % 256}.${d}`;
    }
    return d;
}

export function getBufferPaddedSize(buffer: Buffer) {
    let ii;
    for (ii = buffer.length - 1; ii >= 0; ii--) {
        if (buffer[ii] !== 0x00) {
            break;
        }
    }
    return (ii + 2) % 8 === 0 ? ii + 2 : Math.ceil((ii + 2) / 8) * 8;
}
export function getStringPaddedSize(str: string) {
    let size = str.length;
    if (size % 8 === 0) {
        return size + 8;
    }
    else {
        return Math.floor(Math.ceil(size / 8) * 8 + 0.01);
    }
}

export function splitMessage(msg: Buffer): [Buffer[], Buffer] {
    let messages: Buffer[] = [];
    let residualMessage: Buffer = Buffer.from("");
    let offset = 0;

    while (offset < msg.length) {
        if (msg.length - offset < 16) {
            residualMessage = msg.slice(offset);
            GlobalMethods.infoLog("TCP packet not on CA command boundary!");
            break;
        }
        else {
            let command = msg.readUInt16BE(offset + CA_MSG_HEADER_OFFSETS.command);
            let version = msg.readUInt16BE(offset + CA_MSG_HEADER_OFFSETS.dataCount);
            // todo: try to understand it, for UDP packet ??
            if (command === 0x00 && version === 0x00) {
                break;
            }

            let payloadSize = msg.readUInt16BE(offset + CA_MSG_HEADER_OFFSETS.payloadSize);
            let headerSize = CA_MSG_HEADER_SIZE;
            // extended header 
            if (isExtendedMessageHeader(msg, offset)) {
                headerSize = CA_EXT_MSG_HEADER_SIZE;
                payloadSize = msg.readUInt32BE(offset + CA_EXT_MSG_HEADER_OFFSETS.payloadSize);
            }
            if (offset + headerSize + payloadSize > msg.length) {
                residualMessage = msg.slice(offset);
                GlobalMethods.infoLog("TCP packet not on CA command boundary!");
                break;
            }
            messages.push(msg.slice(offset, offset + headerSize + payloadSize));
            offset = offset + headerSize + payloadSize;
        }
    }
    return [messages, residualMessage];
}

export function isExtendedMessageHeader(msg: Buffer, offset: number) {
    let payloadSize = msg.readUInt16BE(offset + CA_MSG_HEADER_OFFSETS.payloadSize);
    // extended header 
    if (payloadSize === 0xFFFF) {
        return true;
    }
    else {
        return false;
    }

}

export function generateCAHeader(buffer: Buffer, offset: number, command: number, payloadSize: number, dataType: number, dataCount: number, pararmeter1: number, pararmeter2: number) {
    // payloadSize >= 65535 Bytes and dataCount === 0
    const useExtendedHeader: boolean = payloadSize >= 0xFFFF && dataCount === 0x0;
    const requiredSize = useExtendedHeader ? CA_EXT_MSG_HEADER_SIZE : CA_MSG_HEADER_SIZE;
    // let buffer: Buffer = Buffer.alloc(Constants.CA_MESSAGE_HEADER_SIZE);
    if (buffer.length < requiredSize) {
        buffer = Buffer.alloc(requiredSize);
    }
    if (!useExtendedHeader) {
        buffer.writeUInt16BE(command, offset + CA_MSG_HEADER_OFFSETS.command);
        buffer.writeUInt16BE(payloadSize, offset + CA_MSG_HEADER_OFFSETS.payloadSize);
        buffer.writeUInt16BE(dataType, offset + CA_MSG_HEADER_OFFSETS.dataType);
        buffer.writeUInt16BE(dataCount, offset + CA_MSG_HEADER_OFFSETS.dataCount);
        buffer.writeUInt32BE(pararmeter1, offset + CA_MSG_HEADER_OFFSETS.parameter1);
        buffer.writeUInt32BE(pararmeter2, offset + CA_MSG_HEADER_OFFSETS.parameter2);
    }
    else {
        buffer.writeUInt16BE(command, offset + CA_EXT_MSG_HEADER_OFFSETS.command);
        buffer.writeUInt16BE(0xFFFF, offset + 2);
        buffer.writeUInt16BE(dataType, offset + CA_EXT_MSG_HEADER_OFFSETS.dataType);
        buffer.writeUInt16BE(0x0000, offset + 6);
        buffer.writeUInt32BE(pararmeter1, offset + CA_EXT_MSG_HEADER_OFFSETS.parameter1);
        buffer.writeUInt32BE(pararmeter2, offset + CA_EXT_MSG_HEADER_OFFSETS.parameter2);
        buffer.writeUInt32BE(payloadSize, offset + CA_EXT_MSG_HEADER_OFFSETS.payloadSize);
        buffer.writeUInt32BE(dataCount, offset + CA_EXT_MSG_HEADER_OFFSETS.dataCount);
    }
    return buffer;
}

export function isInBrowser() {
    if (typeof window === 'undefined') {
        GlobalMethods.infoLog("Running locally in node.js");
        return false;
    } else {
        GlobalMethods.infoLog("Running in web brwoser");
        return true;
    }

}


export const isIPaddr = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/gi;


export const printMsg = (
    msg: Buffer,
    info: Record<string, any> = {},
    sendOrReceive: string = "Sending",
    showRawMsg: boolean = false,
    showAnyway: boolean = false
) => {
    if (!showAnyway) {
        if (!GlobalMethods.SHOWINFO) {
            return;
        }
    }

    if (msg.length < CA_MSG_HEADER_SIZE) {
        console.log(`Unknown packet: ${msg.toString("hex")}`, info);
        return;
    }
    try {
        let msgStr = msg.toString("hex");
        if (showRawMsg) {
            console.log(msgStr);
        }
        const command = msg.readUInt16BE(CA_MSG_HEADER_OFFSETS.command);
        const commandName = CA_COMMANDS_INV[command.toString()];

        let tmp: Record<string, any> = {};
        let jj = 1;
        for (let ii in CA_MSG_HEADER_OFFSETS) {
            let name = msgNames[commandName][ii];
            if (name === "Reserved") {
                name = name + jj.toString();
                jj = jj + 1;
            }

            if (ii === "command") {
                tmp[name] = commandName;
            } else {
                // 2 character corresponds to 1 hex digit
                tmp[name] = msgStr.slice(2 * CA_MSG_HEADER_OFFSETS[ii], 2 * (CA_MSG_HEADER_OFFSETS[ii] + CA_MSG_HEADER_SIZES[ii]));
            }
        }
        console.log("");
        console.log("-- Package begins -- ");
        console.log(new Date(Date.now()).toISOString());
        console.log(sendOrReceive, ":", info);
        console.log(tmp);
        if (msgStr.length > CA_MSG_HEADER_SIZE * 2) {
            console.log("Payload:");
            console.log(msgStr.slice(CA_MSG_HEADER_SIZE * 2));
        }
        console.log("-- Package ends -- ");
        console.log("");
    } catch (e) {
        GlobalMethods.errorLog(`UDP message "${msg}" not recognized.`);
        GlobalMethods.errorLog(e);
    }
};
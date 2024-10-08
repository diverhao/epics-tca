import { Buffer } from 'buffer';
import { CA_MSG_HEADER_SIZE, CA_COMMANDS, CA_EXT_MSG_HEADER_SIZE, CA_MSG_HEADER_OFFSETS, CA_EXT_MSG_HEADER_OFFSETS, CA_COMMANDS_INV, msgNames, CA_MSG_HEADER_SIZES, CA_EXT_MSG_HEADER_SIZES } from "../Global/Constants";


// ------------- log ---------------------

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

// -------------------- ip address ---------------

export function ipString2Int(ip: string): number | undefined {
    const isValidIp = isIPaddr(ip);
    if (isValidIp) {
        return ip.split('.').reduce(function (ipInt, octet) { return (ipInt << 8) + parseInt(octet, 10) }, 0) >>> 0;
    } else {
        return undefined;
    }
}

export function ipInt2String(ip: number): string {
    let d = `${ip % 256}`;
    for (var i = 3; i > 0; i--) {
        ip = Math.floor(ip / 256);
        d = `${ip % 256}.${d}`;
    }
    return d;
}

export const isIPaddr = (ip: string) => {
    // /^(25[0-5]|2[0-4]\d|1\d{2}|\d{1,2})(\.(25[0-5]|2[0-4]\d|1\d{2}|\d{1,2})){3}$/;
    const regex = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/gi;
    return regex.test(ip);
}

// -------------- buffer ----------------------

/**
 * Calculate the size of the string block whose size is padded to multiple of 8
 */
export function getStringPaddedSize(str: string) {
    let size = str.length;
    if (size % 8 === 0) {
        return size + 8;
    }
    else {
        return Math.floor(Math.ceil(size / 8) * 8 + 0.01);
    }
}

/**
 * Split a message buffer to one or multiple Channel Access messages
 * 
 * The message buffer may come in with multiple CA messages together.
 * 
 * @returns {{ messages: Buffer[], residualMessage: Buffer }}
 */
export function splitMessage(msg: Buffer): { messages: Buffer[], residualMessage: Buffer } {
    let messages: Buffer[] = [];
    let residualMessage: Buffer = Buffer.from("");
    let offset = 0;

    while (offset < msg.length) {
        const extendedMessageHeader = isExtendedMessageHeader(msg, offset);
        let headerSize = extendedMessageHeader ? CA_EXT_MSG_HEADER_SIZE : CA_MSG_HEADER_SIZE;

        if (offset + headerSize > msg.length) {
            // header exceeds boundary
            residualMessage = msg.slice(offset);
            GlobalMethods.infoLog("Packet header over boundary!");
            break;
        }
        else {
            // payload size
            let payloadSize = 0;
            const payloadSizeHeaderOffset = extendedMessageHeader ? CA_EXT_MSG_HEADER_OFFSETS.payloadSize : CA_MSG_HEADER_OFFSETS.payloadSize;
            const payloadSizeHeaderSize = extendedMessageHeader ? CA_EXT_MSG_HEADER_SIZES.payloadSize : CA_MSG_HEADER_SIZES.payloadSize;
            if (offset + payloadSizeHeaderOffset + payloadSizeHeaderSize > msg.length) {
                residualMessage = msg.slice(offset);
                GlobalMethods.infoLog("Packet header over boundary!");
                break;
            } else {
                payloadSize = extendedMessageHeader ? msg.readUInt32BE(offset + payloadSizeHeaderOffset) : msg.readUInt16BE(offset + payloadSizeHeaderOffset);
            }

            if (offset + headerSize + payloadSize > msg.length) {
                // payload exceeds boundary
                residualMessage = msg.slice(offset);
                GlobalMethods.infoLog("Packet payload over boundary!");
                break;
            } else {
                // normal case
                let command = msg.readUInt16BE(offset + CA_MSG_HEADER_OFFSETS.command);
                let version = msg.readUInt16BE(offset + CA_MSG_HEADER_OFFSETS.dataCount);
                if (command === 0x00 && version === 0x00) {
                    break;
                }
                messages.push(msg.slice(offset, offset + headerSize + payloadSize));
                offset = offset + headerSize + payloadSize;
            }
        }
    }
    return {
        messages: messages,
        residualMessage: residualMessage
    };
}

export function isExtendedMessageHeader(msg: Buffer, offset: number) {
    try {
        let payloadSize = msg.readUInt16BE(offset + CA_MSG_HEADER_OFFSETS.payloadSize);
        // extended header 
        if (payloadSize === 0xFFFF) {
            return true;
        }
        else {
            return false;
        }
    } catch (e) {
        // readUInt16BE() throws if reading range exceeds size
        return false;
    }
}

/**
 * Regular CA message can handle 64 kB payload, extended CA message can handle 4 GB payload
 */
export function generateCAHeader(command: number, payloadSize: number, dataType: number, dataCount: number, pararmeter1: number, pararmeter2: number) {
    // payloadSize >= 65535 Bytes and dataCount === 0
    const useExtendedHeader: boolean = payloadSize >= 0xFFFF || dataCount >= 0xFFFF;
    const requiredSize = useExtendedHeader ? CA_EXT_MSG_HEADER_SIZE : CA_MSG_HEADER_SIZE;
    const buffer = Buffer.alloc(requiredSize);

    if (!useExtendedHeader) {
        buffer.writeUInt16BE(command, CA_MSG_HEADER_OFFSETS.command);
        buffer.writeUInt16BE(payloadSize, CA_MSG_HEADER_OFFSETS.payloadSize);
        buffer.writeUInt16BE(dataType, CA_MSG_HEADER_OFFSETS.dataType);
        buffer.writeUInt16BE(dataCount, CA_MSG_HEADER_OFFSETS.dataCount);
        buffer.writeUInt32BE(pararmeter1, CA_MSG_HEADER_OFFSETS.parameter1);
        buffer.writeUInt32BE(pararmeter2, CA_MSG_HEADER_OFFSETS.parameter2);
    }
    else {
        buffer.writeUInt16BE(command, CA_EXT_MSG_HEADER_OFFSETS.command);
        buffer.writeUInt16BE(0xFFFF, 2);
        buffer.writeUInt16BE(dataType, CA_EXT_MSG_HEADER_OFFSETS.dataType);
        buffer.writeUInt16BE(0x0000, 6);
        buffer.writeUInt32BE(pararmeter1, CA_EXT_MSG_HEADER_OFFSETS.parameter1);
        buffer.writeUInt32BE(pararmeter2, CA_EXT_MSG_HEADER_OFFSETS.parameter2);
        buffer.writeUInt32BE(payloadSize, CA_EXT_MSG_HEADER_OFFSETS.payloadSize);
        buffer.writeUInt32BE(dataCount, CA_EXT_MSG_HEADER_OFFSETS.dataCount);
    }
    return buffer;
}

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

// --------------- others ----------------

export function isInBrowser() {
    if (typeof window === 'undefined') {
        GlobalMethods.infoLog("Running locally in node.js");
        return false;
    } else {
        GlobalMethods.infoLog("Running in web brwoser");
        return true;
    }

}
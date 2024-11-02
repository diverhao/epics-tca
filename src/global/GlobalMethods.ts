import * as net from "net";
import { Buffer } from 'buffer';
import { CA_MSG_HEADER_SIZE, CA_COMMANDS, CA_EXT_MSG_HEADER_SIZE, CA_MSG_HEADER_OFFSETS, CA_EXT_MSG_HEADER_OFFSETS, CA_MSG_HEADER_SIZES, CA_EXT_MSG_HEADER_SIZES, PVA_PROTOCOL_VERSION, PVA_MESSAGE_TYPE, PVA_MESSAGE_SEGMENT_TYPE, PVA_ENDIAN, PVA_MSG_HEADER_SIZE, PVA_MSG_HEADER_OFFSETS } from "../Global/Constants";
import { ENDIAN, readInt8, readUInt32, readUInt8, writeUInt32 } from '../PvaData/PvaMethods';


// ------------- log ---------------------

export class GlobalMethods {

    static DEBUG: boolean = true;
    static SHOWINFO: boolean = true;
    static SHOWWARN: boolean = true;
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

    static warnLog(...args: any[]) {
        if (GlobalMethods.SHOWERROR === true) {
            console.log(`\x1b[33m`, `[WARN a]:`, `\x1b[0m`, ...args);
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
export function splitCaMessage(msg: Buffer): { messages: Buffer[], residualMessage: Buffer } {
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


export function splitPvaMessage(msg: Buffer): { messages: Buffer[], residualMessage: Buffer } {
    let messages: Buffer[] = [];
    let residualMessage: Buffer = Buffer.from("");
    let offset = 0;

    while (offset < msg.length) {
        let headerSize = PVA_MSG_HEADER_SIZE;

        if (offset + headerSize > msg.length) {
            // header exceeds boundary
            residualMessage = msg.slice(offset);
            GlobalMethods.infoLog("Packet header over boundary!");
            break;
        }
        else {
            // payload size
            const payloadSize = readUInt32(msg, offset + PVA_MSG_HEADER_OFFSETS.payloadSize, PVA_ENDIAN);
            if (offset + headerSize + payloadSize > msg.length) {
                // payload exceeds boundary
                residualMessage = msg.slice(offset);
                GlobalMethods.infoLog("Packet payload over boundary!");
                break;
            } else {
                // normal case
                // must start from a magic number
                const magicNumber = readUInt8(msg, offset, PVA_ENDIAN);
                if (magicNumber !== 0xca) {
                    // ignore all rest of the messages
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

/**
 * Generate a PVA message header. Payload size is not encoded
 * 
 * Endian is BIG
 * 
 * Version 2
 * 
 * 
 * 
 */
export function generatePvaHeader(command: number, messageType: PVA_MESSAGE_TYPE, segmentType: PVA_MESSAGE_SEGMENT_TYPE) {
    const buffer = Buffer.alloc(8);

    // magic number
    buffer.writeUInt8(0xca, 0);

    // pva version
    buffer.writeUInt8(PVA_PROTOCOL_VERSION, 1);

    // flags
    const messageTypeBit = messageType.valueOf();
    const segmentTypeBits = segmentType.valueOf();
    const messageSourceBit = 0; // always from client
    const endianBit = PVA_ENDIAN === ENDIAN.LITTLE ? 0x0 : 0x1;
    const flag = 0b00000000 | (messageTypeBit & 0xff) | (segmentTypeBits & 0xff) << 4 | (messageSourceBit & 0xff) << 6 | (endianBit & 0xff) << 7;
    buffer.writeUInt8(flag, 2);

    // command
    buffer.writeUInt8(command, 3);

    // payload size is 0 at this moment

    return buffer;
}

export function setPayloadSizeInPvaHeader(buffer: Buffer, payloadSize: number) {
    const flag = buffer.toJSON().data[2];
    const endian = ((flag & 0x80) >> 7) === 0 ? ENDIAN.LITTLE : ENDIAN.BIG;
    writeUInt32(payloadSize, buffer, 4, endian);
}


// used by printMsg()
const CA_COMMANDS_INV: Record<string, string> = {
    0x00: "CA_PROTO_VERSION",
    0x06: "CA_PROTO_SEARCH",
    0x0e: "CA_PROTO_NOT_FOUND",
    0x17: "CA_PROTO_ECHO",
    0x0d: "CA_PROTO_RSRV_IS_UP",
    0x11: "CA_REPEATER_CONFIRM",
    0x18: "CA_REPEATER_REGISTER",
    0x01: "CA_PROTO_EVENT_ADD",
    0x02: "CA_PROTO_EVENT_CANCEL",
    0x03: "CA_PROTO_READ",
    0x04: "CA_PROTO_WRITE",
    0x05: "CA_PROTO_SNAPSHOT",
    0x07: "CA_PROTO_BUILD",
    0x08: "CA_PROTO_EVENTS_OFF",
    0x09: "CA_PROTO_EVENTS_ON",
    0x0a: "CA_PROTO_READ_SYNC",
    0x0b: "CA_PROTO_ERROR",
    0x0c: "CA_PROTO_CLEAR_CHANNEL",
    0x0f: "CA_PROTO_READ_NOTIFY",
    0x10: "CA_PROTO_READ_BUILD",
    0x12: "CA_PROTO_CREATE_CHAN",
    0x13: "CA_PROTO_WRITE_NOTIFY",
    0x14: "CA_PROTO_CLIENT_NAME",
    0x15: "CA_PROTO_HOST_NAME",
    0x16: "CA_PROTO_ACCESS_RIGHTS",
    0x19: "CA_PROTO_SIGNAL",
    0x1a: "CA_PROTO_CREATE_CH_FAIL",
    0x1b: "CA_PROTO_SERVER_DISCONN",
};

// used by printMsg()
const msgNames: Record<string, Record<string, string>> = {
    CA_PROTO_VERSION: {
        command: "Command",
        payloadSize: "PayloadSize",
        dataType: "Priority",
        dataCount: "Version",
        parameter1: "Reserved",
        parameter2: "Reserved",
    },
    CA_PROTO_SEARCH: {
        command: "Command",
        payloadSize: "PayloadSize",
        dataType: "Reply",
        dataCount: "Version",
        parameter1: "SearchID",
        parameter2: "SearchID",
    },
    CA_PROTO_NOT_FOUND: {
        command: "Command",
        payloadSize: "Reserved",
        dataType: "ReplyFlag",
        dataCount: "Version",
        parameter1: "SearchID",
        parameter2: "SearchID",
    },
    CA_PROTO_ECHO: {
        command: "Command",
        payloadSize: "Reserved",
        dataType: "Reserved",
        dataCount: "Reserved",
        parameter1: "Reserved",
        parameter2: "Reserved",
    },
    CA_PROTO_RSRV_IS_UP: {
        command: "Command",
        payloadSize: "Reserved",
        dataType: "Version",
        dataCount: "ServerPort",
        parameter1: "BeaconID",
        parameter2: "Address",
    },
    CA_REPEATER_CONFIRM: {
        command: "Command",
        payloadSize: "Reserved",
        dataType: "Reserved",
        dataCount: "Reserved",
        parameter1: "Reserved",
        parameter2: "IPAddress",
    },
    CA_REPEATER_REGISTER: {
        command: "Command",
        payloadSize: "Reserved",
        dataType: "Reserved",
        dataCount: "Reserved",
        parameter1: "Reserved",
        parameter2: "IPAddress",
    },
    CA_PROTO_EVENT_ADD: {
        command: "Command",
        payloadSize: "PayloadSize",
        dataType: "DBRType",
        dataCount: "ElementNumber",
        parameter1: "ServerID",
        parameter2: "ClientSubscriptionID",
    },
    CA_PROTO_EVENT_CANCEL: {
        command: "Command",
        payloadSize: "PayloadSize",
        dataType: "DBRType",
        dataCount: "ElementNumber",
        parameter1: "ServerChannelID",
        parameter2: "ClientSubscriptionID",
    },
    CA_PROTO_READ: {
        command: "Command",
        payloadSize: "Obsolete",
        dataType: "Obsolete",
        dataCount: "Obsolete",
        parameter1: "Obsolete",
        parameter2: "Obsolete",
    },
    CA_PROTO_WRITE: {
        command: "Command",
        payloadSize: "PayloadSize",
        dataType: "DBRType",
        dataCount: "ElementNumber",
        parameter1: "ServerChannelID",
        parameter2: "ClientIOID",
    },
    CA_PROTO_SNAPSHOT: {
        command: "Command",
        payloadSize: "Obsolete",
        dataType: "Obsolete",
        dataCount: "Obsolete",
        parameter1: "Obsolete",
        parameter2: "Obsolete",
    },
    CA_PROTO_BUILD: {
        command: "Command",
        payloadSize: "Obsolete",
        dataType: "Obsolete",
        dataCount: "Obsolete",
        parameter1: "Obsolete",
        parameter2: "Obsolete",
    },
    CA_PROTO_EVENTS_OFF: {
        command: "Command",
        payloadSize: "Obsolete",
        dataType: "Obsolete",
        dataCount: "Obsolete",
        parameter1: "Obsolete",
        parameter2: "Obsolete",
    },
    CA_PROTO_EVENTS_ON: {
        command: "Command",
        payloadSize: "Reserved",
        dataType: "Reserved",
        dataCount: "Reserved",
        parameter1: "Reserved",
        parameter2: "Reserved",
    },
    CA_PROTO_READ_SYNC: {
        command: "Command",
        payloadSize: "Obsolete",
        dataType: "Obsolete",
        dataCount: "Obsolete",
        parameter1: "Obsolete",
        parameter2: "Obsolete",
    },
    CA_PROTO_ERROR: {
        command: "Command",
        payloadSize: "ErrorHeaderSize",
        dataType: "Reserved",
        dataCount: "Reserved",
        parameter1: "ClientChannelID",
        parameter2: "ErrorStatusCode(ECA)",
    },
    CA_PROTO_CLEAR_CHANNEL: {
        command: "Command",
        payloadSize: "Reserved",
        dataType: "Reserved",
        dataCount: "Reserved",
        parameter1: "ServerChannelID",
        parameter2: "ClientChannelID",
    },
    CA_PROTO_READ_NOTIFY: {
        command: "Command",
        payloadSize: "PayloadSize",
        dataType: "DBRType",
        dataCount: "ElementNumber",
        parameter1: "ServerChannelID",
        parameter2: "ClientIOID",
    },
    CA_PROTO_READ_BUILD: {
        command: "Command",
        payloadSize: "Obsolete",
        dataType: "Obsolete",
        dataCount: "Obsolete",
        parameter1: "Obsolete",
        parameter2: "Obsolete",
    },
    CA_PROTO_CREATE_CHAN: {
        command: "Command",
        payloadSize: "PayloadSize",
        dataType: "Reserved",
        dataCount: "Reserved",
        parameter1: "ClientChannelID",
        parameter2: "CAVersion",
    },
    CA_PROTO_WRITE_NOTIFY: {
        command: "Command",
        payloadSize: "PayloadSize",
        dataType: "DBRType",
        dataCount: "ElementNumber",
        parameter1: "ServerChannelID",
        parameter2: "ClientIOID",
    },
    CA_PROTO_CLIENT_NAME: {
        command: "Command",
        payloadSize: "PayloadSize",
        dataType: "Reserved",
        dataCount: "Reserved",
        parameter1: "Reserved",
        parameter2: "Reserved",
    },
    CA_PROTO_HOST_NAME: {
        command: "Command",
        payloadSize: "PayloadSize",
        dataType: "Reserved",
        dataCount: "Reserved",
        parameter1: "Reserved",
        parameter2: "Reserved",
    },
    CA_PROTO_ACCESS_RIGHTS: {
        command: "Command",
        payloadSize: "PayloadSize",
        dataType: "Reserved",
        dataCount: "Reserved",
        parameter1: "ClientChannelID",
        parameter2: "AccessRight",
    },
    CA_PROTO_SIGNAL: {
        command: "Command",
        payloadSize: "Obsolete",
        dataType: "Obsolete",
        dataCount: "Obsolete",
        parameter1: "Obsolete",
        parameter2: "Obsolete",
    },
    CA_PROTO_CREATE_CH_FAIL: {
        command: "Command",
        payloadSize: "Reserved",
        dataType: "Reserved",
        dataCount: "Reserved",
        parameter1: "ClientChannelID",
        parameter2: "Reserved",
    },
    CA_PROTO_SERVER_DISCONN: {
        command: "Command",
        payloadSize: "Reserved",
        dataType: "Reserved",
        dataCount: "Reserved",
        parameter1: "ClientChannelID",
        parameter2: "Reserved",
    },
};

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

export const isPowerOfTwo = (n: number) => {
    let cnt = 0;
    while (n > 0) {
        if ((n & 1) == 1) {
            cnt++; // if n&1 == 1 keep incrementing cnt
            // variable
        }
        n = n >> 1; // keep dividing n by 2 using right
        // shift operator
    }
    if (cnt == 1) {
        // if cnt = 1 only then it is power of 2
        return true;
    }
    return false;
};


export function ipv4ToIpv6HexArray(ipv4: string) {
    // Split the IPv4 address into its octets
    const octets = ipv4.split('.').map(Number);

    // Define the IPv4-mapped IPv6 prefix: `::ffff:`
    const ipv6Prefix = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff];

    // Add the IPv4 address in hexadecimal format
    const ipv6Address = [
        ...ipv6Prefix,
        ...octets  // Append the IPv4 octets directly as they are in decimal
    ];

    return ipv6Address;
}


/**
 * Convert a 16-byte number array to a IPv4 or IPv6 address represeted by a string.
 * 
 * @returns {string} the IPv4 or IPv6 address string
 */
export function ipv6NumberArrayToString(hexArray: number[]) {
    let isIpv4 = true;
    for (let ii = 0; ii < 12; ii++) {
        const val = hexArray[ii];
        if (ii < 10 && val === 0) {
        } else if ((ii === 10 || ii === 11) && val === 0xff) {

        } else {
            isIpv4 = false;
            break;
        }
    }

    if (isIpv4) {
        const a = hexArray[12];
        const b = hexArray[13];
        const c = hexArray[14];
        const d = hexArray[15];
        return `${a}.${b}.${c}.${d}`;
    } else {
        const ipv6Buffer = Buffer.from(hexArray);
        const parts = [];
        for (let i = 0; i < ipv6Buffer.length; i += 2) {
            parts.push(ipv6Buffer.readUInt16BE(i).toString(16));
        }
        return parts.join(':').replace(/(:0+)+/g, '::').replace(/:{3,}/g, '::');

    }
}

export function readPvaEndian(message: Buffer, offset: number) {
    const flags = readUInt8(message, offset + PVA_MSG_HEADER_OFFSETS.flags, PVA_ENDIAN);
    const endian = flags >> 7;
    if (endian === 1) {
        return ENDIAN.BIG;
    } else {
        return ENDIAN.LITTLE;
    }
}

// https://epics.anl.gov/base/R3-16/0-docs/CAproto/index.html#_message_structure

import { GlobalMethods } from "../GlobalMethods"

export const CA_MSG_HEADER_OFFSETS: Record<string, number> = {
    command: 0,
    payloadSize: 2,
    dataType: 4,
    dataCount: 6,
    parameter1: 8,
    parameter2: 12,

}

export const CA_MSG_HEADER_SIZES: Record<string, number> = {
    command: 2,
    payloadSize: 2,
    dataType: 2,
    dataCount: 2,
    parameter1: 4,
    parameter2: 4,

}

export const CA_EXT_MSG_HEADER_OFFSETS: Record<string, number> = {
    command: 0,
    dataType: 4,
    parameter1: 8,
    parameter2: 12,
    payloadSize: 16,
    dataCount: 20,
}

export const CA_EXT_MSG_HEADER_SIZES: Record<string, number> = {
    command: 2,
    dataType: 2,
    parameter1: 4,
    parameter2: 4,
    payloadSize: 4,
    dataCount: 4,
}


export const CA_COMMANDS: Record<string, number> = {
    CA_PROTO_VERSION: 0x00,
    CA_PROTO_SEARCH: 0x06,
    CA_PROTO_NOT_FOUND: 0x0E,
    CA_PROTO_ECHO: 0x17,
    CA_PROTO_RSRV_IS_UP: 0x0D,
    CA_REPEATER_CONFIRM: 0x11,
    CA_REPEATER_REGISTER: 0x18,
    CA_PROTO_EVENT_ADD: 0x01,
    CA_PROTO_EVENT_CANCEL: 0x02,
    CA_PROTO_READ: 0x03,
    CA_PROTO_WRITE: 0x04,
    CA_PROTO_SNAPSHOT: 0x05,
    CA_PROTO_BUILD: 0x07,
    CA_PROTO_EVENTS_OFF: 0x08,
    CA_PROTO_EVENTS_ON: 0x09,
    CA_PROTO_READ_SYNC: 0x0A,
    CA_PROTO_ERROR: 0x0B,
    CA_PROTO_CLEAR_CHANNEL: 0x0C,
    CA_PROTO_READ_NOTIFY: 0x0F,
    CA_PROTO_READ_BUILD: 0x10,
    CA_PROTO_CREATE_CHAN: 0x12,
    CA_PROTO_WRITE_NOTIFY: 0x13,
    CA_PROTO_CLIENT_NAME: 0x14,
    CA_PROTO_HOST_NAME: 0x15,
    CA_PROTO_ACCESS_RIGHTS: 0x16,
    CA_PROTO_SIGNAL: 0x19,
    CA_PROTO_CREATE_CH_FAIL: 0x1A,
    CA_PROTO_SERVER_DISCONN: 0x1B,
}

export const CA_COMMANDS_INV: Record<string, string> = {
    0x00: "CA_PROTO_VERSION",
    0x06: "CA_PROTO_SEARCH",
    0x0E: "CA_PROTO_NOT_FOUND",
    0x17: "CA_PROTO_ECHO",
    0x0D: "CA_PROTO_RSRV_IS_UP",
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
    0x0A: "CA_PROTO_READ_SYNC",
    0x0B: "CA_PROTO_ERROR",
    0x0C: "CA_PROTO_CLEAR_CHANNEL",
    0x0F: "CA_PROTO_READ_NOTIFY",
    0x10: "CA_PROTO_READ_BUILD",
    0x12: "CA_PROTO_CREATE_CHAN",
    0x13: "CA_PROTO_WRITE_NOTIFY",
    0x14: "CA_PROTO_CLIENT_NAME",
    0x15: "CA_PROTO_HOST_NAME",
    0x16: "CA_PROTO_ACCESS_RIGHTS",
    0x19: "CA_PROTO_SIGNAL",
    0x1A: "CA_PROTO_CREATE_CH_FAIL",
    0x1B: "CA_PROTO_SERVER_DISCONN",
};

export const CA_MSG_HEADER_SIZE: number = 16;
export const CA_EXT_MSG_HEADER_SIZE: number = 24;

// export const CA_REPEATER_REGISTER: number = 0x18;
// export const CA_PROTO_RSRV_IS_UP: number = 0x0d;
// export const CA_REPEATER_CONFIRM: number = 0x11;
// export const CA_PROTO_VERSION: number = 0x00;


export const CA_REPEATER_PORT_DEFAULT: number = 5065;

export const msgNames: Record<string, Record<string, string>> = {
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


export const printMsg = (msg: Buffer, info: Record<string, any> = {}, sendOrReceive: string = "Sending", showRawMsg: boolean = false) => {
    if (!GlobalMethods.SHOWINFO) {
        return;
    }
    if (msg.length < CA_MSG_HEADER_SIZE) {
        console.log(`Unknown packet: ${msg.toString("hex")}`, info);
        return;
    }
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
        }
        else {
            // 2 character corresponds to 1 hex digit
            tmp[name] = msgStr.slice(2 * CA_MSG_HEADER_OFFSETS[ii], 2 * (CA_MSG_HEADER_OFFSETS[ii] + CA_MSG_HEADER_SIZES[ii]));
        }
    }
    console.log("")
    console.log("-- Package begins -- ")
    console.log((new Date(Date.now())).toISOString());
    console.log(sendOrReceive, ":", info);
    console.log(tmp);
    if (msgStr.length > CA_MSG_HEADER_SIZE * 2) {
        console.log("Payload:");
        console.log(msgStr.slice(CA_MSG_HEADER_SIZE * 2));
    }
    console.log("-- Package ends -- ")
    console.log("")
}


export type type_env = {
    EPICS_CA_ADDR_LIST: string[],
    EPICS_CA_AUTO_ADDR_LIST: boolean,
    EPICS_CA_NAME_SERVERS: string[],
    EPICS_CA_CONN_TMO: number,
    EPICS_CA_BEACON_PERIOD: number,
    EPICS_CA_REPEATER_PORT: number,
    EPICS_CA_SERVER_PORT: number,
    EPICS_CA_MAX_ARRAY_BYTES: number,
    EPICS_CA_MAX_SEARCH_PERIOD: number,
    EPICS_TS_MIN_WEST: number,
}

export const epicsEnv: Partial<type_env> = {
    // export const epicsEnv: Record<string, any> = {
    EPICS_CA_ADDR_LIST: [],
    EPICS_CA_AUTO_ADDR_LIST: true,
    EPICS_CA_NAME_SERVERS: [],
    EPICS_CA_CONN_TMO: 30,
    EPICS_CA_BEACON_PERIOD: 15,
    EPICS_CA_REPEATER_PORT: 5065,
    EPICS_CA_SERVER_PORT: 5064,
    EPICS_CA_MAX_ARRAY_BYTES: 16384,
    EPICS_CA_MAX_SEARCH_PERIOD: 300,
    EPICS_TS_MIN_WEST: 360,
}

export const epicsEnvCustom: Record<string, any> = {
    EPICS_CA_MIN_SEARCH_PERIOD: 0.025, // second, counter part of EPICS_CA_MAX_SEARCH_PERIOD
    EPICS_CA_GET_TIMEOUT_DEFAUTL: 2, // second
    EPICS_CA_SCHEDULING_PRIORITY_DEFAULT: 0,
    EPICS_CA_TCP_RE_SEARCH_CHAN_TIMESPAN: 2, // 2 second, 2 seconds span * random(0,1)
    EPICS_CA_TCP_RE_SEARCH_CHAN_TIMEOUT: 0.2, // when TCPTransport is destroyed, wait until re-search a channel
    EPICS_CA_REPEATER_REGISTER_TIMEOUT: 1, // send CA_REPEATER every second
    EPICS_CA_TCP_INACTIVE_TIMEOUT: 30, // > twice of EPICS_CA_BEACON_PERIOD
    EPICS_CA_BEACON_TIMEOUT: 30, // > twice of EPICS_CA_BEACON_PERIOD

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

export const isIPaddr = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/gi;


export const DBR = {
    STRING: 0,
    INT: 1,
    SHORT: 1,
    FLOAT: 2,
    ENUM: 3,
    CHAR: 4,
    LONG: 5,
    DOUBLE: 6,
    STS_STRING: 7,
    STS_INT: 8,
    STS_SHORT: 8,
    STS_FLOAT: 9,
    STS_ENUM: 10,
    STS_CHAR: 11,
    STS_LONG: 12,
    STS_DOUBLE: 13,
    TIME_STRING: 14,
    TIME_INT: 15,
    TIME_SHORT: 15,
    TIME_FLOAT: 16,
    TIME_ENUM: 17,
    TIME_CHAR: 18,
    TIME_LONG: 19,
    TIME_DOUBLE: 20,
    GR_STRING: 21,
    GR_INT: 22,
    GR_SHORT: 22,
    GR_FLOAT: 23,
    GR_ENUM: 24,
    GR_CHAR: 25,
    GR_LONG: 26,
    GR_DOUBLE: 27,
    CTRL_STRING: 28,
    CTRL_INT: 29,
    CTRL_SHORT: 29,
    CTRL_FLOAT: 30,
    CTRL_ENUM: 31,
    CTRL_CHAR: 32,
    CTRL_LONG: 33,
    CTRL_DOUBLE: 34,
    PUT_ACKT: 35,
    PUT_ACKS: 36,
    STSACK_STRING: 37,
    CLASS_NAME: 38,
}
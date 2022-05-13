// https://epics.anl.gov/base/R3-16/0-docs/CAproto/index.html#_message_structure

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
}


export const printMsg = (msg: Buffer, info: Record<string, any> = {}, showRawMsg: boolean = false) => {
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
    console.log((new Date(Date.now())).toISOString());
    console.log(info);
    console.log(tmp);
    if (msgStr.length > CA_MSG_HEADER_SIZE * 2) {
        console.log("Payload:");
        console.log(msgStr.slice(CA_MSG_HEADER_SIZE * 2));
    }
}

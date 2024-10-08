
/**
 * CA protocol major revision (implemented by this library).
 */
export const CA_MAJOR_PROTOCOL_REVISION = 4;

/**
 * CAC (client) protocol minor revision (implemented by this library).
 */
export const CA_MINOR_PROTOCOL_REVISION = 13;

/**
 * CAS (server) protocol minor revision (implemented by this library).
 */
export const CAS_MINOR_PROTOCOL_REVISION = 11;

/**
 * Unknown CA protocol minor revision.
 */
export const CA_UNKNOWN_MINOR_PROTOCOL_REVISION = 0;

/**
 * CA protocol port base.
 */
export const CA_PORT_BASE = 5056;

/**
 * Default CA server port.
 */
export const CA_SERVER_PORT = CA_PORT_BASE + 2 * CA_MAJOR_PROTOCOL_REVISION;

/**
 * Default CA repeater port.
 */
export const CA_REPEATER_PORT = CA_PORT_BASE + 2 * CA_MAJOR_PROTOCOL_REVISION + 1;

/**
 * CA protocol message header size.
 */
export const CA_MESSAGE_HEADER_SIZE = 16;

/**
 * CA protocol message extedned header size.
 */
export const CA_EXTENDED_MESSAGE_HEADER_SIZE = CA_MESSAGE_HEADER_SIZE + 8;

/**
 * UDP maximum send message size.
 * MAX_UDP: 1500 (max of ethernet and 802.{2,3} MTU) - 20(IP) - 8(UDP) 
 * (the MTU of Ethernet is currently independent of its speed varient)
 */
export const MAX_UDP_SEND = 1024;

/**
 * UDP maximum receive message size.
 */
export const MAX_UDP_RECV = 0xFFFF + 16;

/**
 * TCP maximum receive message size.
 */
export const MAX_TCP_RECV = 1024 * 16 + CA_EXTENDED_MESSAGE_HEADER_SIZE;

/**
 * Default priority (corresponds to POSIX SCHED_OTHER)
 */
export const CA_DEFAULT_PRIORITY = 0;

/**
 * Read access right mask.
 */
export const CA_PROTO_ACCESS_RIGHT_READ = 1 << 0;

/**
 * Write access right mask.
 */
export const CA_PROTO_ACCESS_RIGHT_WRITE = 1 << 1;

/**
 * Do not require response for CA search request.
 */
export const CA_SEARCH_DONTREPLY = 5;

/**
 * Require response (even if not found) for CA search request over TCP.
 */
export const CA_SEARCH_DOREPLY = 10;

/**
 * Echo (state-of-health message) reponse timeput in ms.
 */
export const CA_ECHO_TIMEOUT = 5000;

/**
 * Max. (requested) string size.
 */
export const MAX_STRING_SIZE = 40;

/**
 * Unreasonable channel name length.
 */
export const UNREASONABLE_CHANNEL_NAME_LENGTH = 500;

export const CA_REPEATER_REGISTER = 0x18;


export const CA_MSG_HEADER_OFFSETS: Record<string, number> = {
    command: 0,
    payloadSize: 2,
    dataType: 4,
    dataCount: 6,
    parameter1: 8,
    parameter2: 12,
};

export const CA_MSG_HEADER_SIZES: Record<string, number> = {
    command: 2,
    payloadSize: 2,
    dataType: 2,
    dataCount: 2,
    parameter1: 4,
    parameter2: 4,
};

export const CA_EXT_MSG_HEADER_OFFSETS: Record<string, number> = {
    command: 0,
    dataType: 4,
    parameter1: 8,
    parameter2: 12,
    payloadSize: 16,
    dataCount: 20,
};

export const CA_EXT_MSG_HEADER_SIZES: Record<string, number> = {
    command: 2,
    dataType: 2,
    parameter1: 4,
    parameter2: 4,
    payloadSize: 4,
    dataCount: 4,
};

export const CA_COMMANDS: Record<string, number> = {
    CA_PROTO_VERSION: 0x00,
    CA_PROTO_SEARCH: 0x06,
    CA_PROTO_NOT_FOUND: 0x0e,
    CA_PROTO_ECHO: 0x17,
    CA_PROTO_RSRV_IS_UP: 0x0d,
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
    CA_PROTO_READ_SYNC: 0x0a,
    CA_PROTO_ERROR: 0x0b,
    CA_PROTO_CLEAR_CHANNEL: 0x0c,
    CA_PROTO_READ_NOTIFY: 0x0f,
    CA_PROTO_READ_BUILD: 0x10,
    CA_PROTO_CREATE_CHAN: 0x12,
    CA_PROTO_WRITE_NOTIFY: 0x13,
    CA_PROTO_CLIENT_NAME: 0x14,
    CA_PROTO_HOST_NAME: 0x15,
    CA_PROTO_ACCESS_RIGHTS: 0x16,
    CA_PROTO_SIGNAL: 0x19,
    CA_PROTO_CREATE_CH_FAIL: 0x1a,
    CA_PROTO_SERVER_DISCONN: 0x1b,
};

export const CA_COMMANDS_INV: Record<string, string> = {
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

// bytes
export const CA_MSG_HEADER_SIZE: number = 16;
export const CA_EXT_MSG_HEADER_SIZE: number = 24;

// export const CA_REPEATER_REGISTER: number = 0x18;
// export const CA_PROTO_RSRV_IS_UP: number = 0x0d;
// export const CA_REPEATER_CONFIRM: number = 0x11;
// export const CA_PROTO_VERSION: number = 0x00;

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
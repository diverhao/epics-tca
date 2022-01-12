export class Constants {

    /**
     * CA protocol major revision (implemented by this library).
     */
    static readonly CA_MAJOR_PROTOCOL_REVISION = 4;

    /**
     * CAC (client) protocol minor revision (implemented by this library).
     */
    static readonly CA_MINOR_PROTOCOL_REVISION = 13;

    /**
     * CAS (server) protocol minor revision (implemented by this library).
     */
    static readonly CAS_MINOR_PROTOCOL_REVISION = 11;

    /**
     * Unknown CA protocol minor revision.
     */
    static readonly CA_UNKNOWN_MINOR_PROTOCOL_REVISION = 0;

    /**
     * CA protocol port base.
     */
    static readonly CA_PORT_BASE = 5056;

    /**
     * Default CA server port.
     */
    static readonly CA_SERVER_PORT = Constants.CA_PORT_BASE + 2 * Constants.CA_MAJOR_PROTOCOL_REVISION;

    /**
     * Default CA repeater port.
     */
    static readonly CA_REPEATER_PORT = Constants.CA_PORT_BASE + 2 * Constants.CA_MAJOR_PROTOCOL_REVISION + 1;

    /**
     * CA protocol message header size.
     */
    static readonly CA_MESSAGE_HEADER_SIZE = 16;

    /**
     * CA protocol message extedned header size.
     */
    static readonly CA_EXTENDED_MESSAGE_HEADER_SIZE = Constants.CA_MESSAGE_HEADER_SIZE + 8;

    /**
     * UDP maximum send message size.
     * MAX_UDP: 1500 (max of ethernet and 802.{2,3} MTU) - 20(IP) - 8(UDP) 
     * (the MTU of Ethernet is currently independent of its speed varient)
     */
    static readonly MAX_UDP_SEND = 1024;

    /**
     * UDP maximum receive message size.
     */
    static readonly MAX_UDP_RECV = 0xFFFF + 16;

    /**
     * TCP maximum receive message size.
     */
    static readonly MAX_TCP_RECV = 1024 * 16 + Constants.CA_EXTENDED_MESSAGE_HEADER_SIZE;

    /**
     * Default priority (corresponds to POSIX SCHED_OTHER)
     */
    static readonly CA_DEFAULT_PRIORITY = 0;

    /**
     * Read access right mask.
     */
    static readonly CA_PROTO_ACCESS_RIGHT_READ = 1 << 0;

    /**
     * Write access right mask.
     */
    static readonly CA_PROTO_ACCESS_RIGHT_WRITE = 1 << 1;

    /**
     * Do not require response for CA search request.
     */
    static readonly CA_SEARCH_DONTREPLY = 5;

    /**
     * Require response (even if not found) for CA search request over TCP.
     */
    static readonly CA_SEARCH_DOREPLY = 10;

    /**
     * Echo (state-of-health message) reponse timeput in ms.
     */
    static readonly CA_ECHO_TIMEOUT = 5000;

    /**
     * Max. (requested) string size.
     */
    static readonly MAX_STRING_SIZE = 40;

    /**
     * Unreasonable channel name length.
     */
    static readonly UNREASONABLE_CHANNEL_NAME_LENGTH = 500;

    static readonly CA_REPEATER_REGISTER = 0x18;
}

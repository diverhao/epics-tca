import { Context, Context_STATES } from "../Context/Context";
import { ChannelMonitor, ChannelMonitor_STATES } from "../Channel/ChannelMonitor";
import { CA_ALARM_SEVRITY, CA_ALARM_STATUS, Channel, Channel_DBR_TYPES, Channel_STATES } from "../Channel/Channel";
import { createServer, Socket } from "net";
import { isPowerOfTwo } from "../Global/GlobalMethods";
import { ECA, ECA_SEVERITIES } from "../ECA/ECA";
import { TCPTransport_STATES } from "../TCPTransport/TCPTransport";
import { ENDIAN, readDouble } from "../PvaData/PvaMethods";


const contex = new Context();
contex.initialize().then(async () => {
    const channel = await contex.createChannel("valwf1", "ca");
    if (channel !== undefined) {
        console.log("Good!")
        // const result = await channel.get();
        // console.log(result)
        const monitor = channel.createMonitor(undefined, (abc: ChannelMonitor) => {
            console.log("OKOKOK")
            console.log(abc.getChannel().getDbrData())
        });
    }
    

}
)

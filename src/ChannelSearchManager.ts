// abandoned

// import {Buffer} from 'buffer';
// import {Constants} from './Constants';
// import { Context } from './Context';

// export class ChannelSearchManager {
//     minSearchInterval: number;
//     maxSearchInterval: number;
//     searchIntervalMultiplier: number;
//     sendBuffer: Buffer;
//     constructor(context: Context) {
//         this.minSearchInterval = 0.1; // second
//         this.maxSearchInterval = 120;
//         this.searchIntervalMultiplier = 2;
//         //todo: update it?
//         this.sendBuffer = Buffer.alloc(Constants.MAX_UDP_SEND); // 1024 bytes
//     }
    
//     generateChannelSearchMessage(channelClientID: number) {
//         this.sendBuffer.fill("\0");
//         // version request, "command 0x00"
//         Context.generateCAHeader(this.sendBuffer, 0, 0x00, 0x00, 0x01, 0x0d, 0x00, 0x00);
//         // search channel request, "command 0x06"
//         Context.generateCAHeader(this.sendBuffer, 16, 0x06, 0x08, 0x05, 0x0d, channelClientID, channelClientID);
//     }

// }
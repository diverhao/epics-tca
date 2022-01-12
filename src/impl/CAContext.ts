import { LoggerProvider } from "../util/logging/LoggerProvider";


import {Reactor} from 

export interface CAContext extends LoggerProvider {
    getReactor(): Reactor;
    getLeaderFollowersThreadPool(): LeaderFollowersThreadPool;
    getTransportRegistry(): CATransportRegistry;
    getCachedBufferAllocator(): CachedByteBufferAllocator;
    getTimer(): Timer;
    getServerPort(): number;
    getBroadcastPort(): number;
    getBroadcastTransport(): BroadcastTransport;
    invalidateLastReceivedSequence(): void;
    getUserName(): string;
}
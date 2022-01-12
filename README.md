
# refs

 - [CA protocol specification](https://epics.anl.gov/base/R3-16/0-docs/CAproto/index.html)

# todo

 - refactor code, 
   - clearly define which function should be where and what task it does
   - remove old folders
   - complete functionalities, and test them thoroughly, make sure they work in all scenarios
   - test all edgy conditions: multiple CA servers, multiple PV names, offline, re-connect, long wait time ...
 - beaconResponse: basically beacon anomaly, refer to CABeaconHandler.java, done
 - caput(), done
   - writeNotify,  0x13 <-- 1/10, monday
   - write
 - camonitor(), implement event_add, 0x01, done
 - timeout wait time, see `caget -h`, or `caput -h`, 
   - the implementation in Java CA: `pendIO(5)`, quit after 5 seconds
   - in Typescript, we can call `promiseReject()` inside a `setTimeout(() => {},5000)`
 - ---------------------------------------
 - refactor code
   - clarify logic: what could happen
   - write simple test codes, refer to JCA `~/projects2/jca-src/test/com/cosylab/epics/caj/test`, read all codes, which should have covered almost all scenarios
   - think of edgy situations: connect-disconnect-connect, empty situation, synchronization
   - pressure test


When we see a beacon anormaly, restart unresolved channel search.


# notes:

The SID in response table for CA_PROTO_READ_NOTIFY in CA protocol reference is wrong. It says `SID`, actually it is actually `Status`. The CA_PROTO_WRITE_NOTIFY is correct. See https://epics.anl.gov/base/R3-16/0-docs/CAproto/index.html

This is corrected in `TCPTransport.ts`

 - Commands (TCP and UDP)
   - <span style="color:green"> CA_PROTO_VERSION </span>
   - <span style="color:green"> CA_PROTO_SEARCH </span>
   - CA_PROTO_NOT_FOUND
   - CA_PROTO_ECHO
 - Commands (UDP)
   - <span style="color:green"> CA_PROTO_RSRV_IS_UP
   - <span style="color:green"> CA_REPEATER_CONFIRM </span>
   - <span style="color:green"> CA_REPEATER_REGISTER </span>
 - Commands (TCP)
   - <span style="color:green"> CA_PROTO_EVENT_ADD </span>
   - <span style="color:green"> CA_PROTO_EVENT_CANCEL </span>
   - ~~CA_PROTO_READ~~
   - <span style="color: green"> CA_PROTO_WRITE </span>
   - ~~CA_PROTO_SNAPSHOT~~
   - ~~CA_PROTO_BUILD~~
   - <span style="color:green"> CA_PROTO_EVENTS_OFF </span>
   - <span style="color:green"> CA_PROTO_EVENTS_ON </span>
   - ~~CA_PROTO_READ_SYNC~~
   - CA_PROTO_ERROR
   - CA_PROTO_CLEAR_CHANNEL
   - <span style="color:green"> CA_PROTO_READ_NOTIFY </span>
   - ~~CA_PROTO_READ_BUILD~~
   - <span style="color:green"> CA_PROTO_CREATE_CHAN </span>
   - <span style="color:green"> CA_PROTO_WRITE_NOTIFY </span>
   - <span style="color:green"> CA_PROTO_CLIENT_NAME </span>
   - <span style="color:green"> CA_PROTO_HOST_NAME  </span>
   - <span style="color:green"> CA_PROTO_ACCESS_RIGHTS </span>
   - ~~CA_PROTO_SIGNAL~~
   - CA_PROTO_CREATE_CH_FAIL
   - CA_PROTO_SERVER_DISCONN


# JavaCA structure

```
1h7@mac113788 : ~/projects2/jca-src/src  
$ tree
.
├── ant
│   └── gov
│       └── aps
│           └── ant
│               └── taskdefs
│                   ├── ApplyEx.java
│                   └── TargetArch.java
├── core
│   ├── JCALibrary.properties
│   ├── com
│   │   └── cosylab
│   │       └── epics
│   │           └── caj
│   │               ├── CAJChannel.java
│   │               ├── CAJConstants.java
│   │               ├── CAJContext.java, extends Context implements CAContext, CAJConstants, Configurable
│   │               ├── CAJMonitor.java
│   │               ├── CARepeater.java
│   │               ├── JNIRepeater.java
│   │               ├── cas
│   │               │   ├── BeaconEmitter.java
│   │               │   ├── CAJServerContext.java
│   │               │   ├── CASAcceptor.java
│   │               │   ├── CASResponseHandler.java
│   │               │   ├── CASServerMonitor.java
│   │               │   ├── CASTransport.java
│   │               │   ├── ProcessVariableEventDispatcher.java
│   │               │   ├── handlers
│   │               │   │   ├── AbstractCASResponseHandler.java
│   │               │   │   ├── BadResponse.java
│   │               │   │   ├── ClearChannelResponse.java
│   │               │   │   ├── CreateChannelResponse.java
│   │               │   │   ├── EchoResponse.java
│   │               │   │   ├── EventAddResponse.java
│   │               │   │   ├── EventCancelResponse.java
│   │               │   │   ├── EventsOffResponse.java
│   │               │   │   ├── EventsOnResponse.java
│   │               │   │   ├── HostnameResponse.java
│   │               │   │   ├── NoopResponse.java
│   │               │   │   ├── ReadNotifyResponse.java
│   │               │   │   ├── SearchResponse.java
│   │               │   │   ├── UsernameResponse.java
│   │               │   │   ├── VersionResponse.java
│   │               │   │   ├── WriteNotifyResponse.java
│   │               │   │   └── WriteResponse.java
│   │               │   ├── requests
│   │               │   │   ├── AccessRightsRequest.java
│   │               │   │   ├── BeaconRequest.java
│   │               │   │   ├── ClearChannelRequest.java
│   │               │   │   ├── CreateChannelFailedRequest.java
│   │               │   │   ├── CreateChannelRequest.java
│   │               │   │   ├── EchoRequest.java
│   │               │   │   ├── EventAddRequest.java
│   │               │   │   ├── EventCancelRequest.java
│   │               │   │   ├── ExceptionRequest.java
│   │               │   │   ├── ReadNotifyRequest.java
│   │               │   │   ├── SearchFailedRequest.java
│   │               │   │   ├── SearchRequest.java
│   │               │   │   └── WriteNotifyRequest.java
│   │               │   └── util
│   │               │       ├── DefaultServerImpl.java
│   │               │       ├── EnumProcessVariable.java
│   │               │       ├── FloatingDecimalProcessVariable.java
│   │               │       ├── MemoryProcessVariable.java
│   │               │       ├── NumericProcessVariable.java
│   │               │       ├── StringProcessVariable.java
│   │               │       └── examples
│   │               │           └── CounterProcessVariable.java
│   │               ├── impl
│   │               │   ├── BroadcastConnector.java
│   │               │   ├── BroadcastTransport.java
│   │               │   ├── CABeaconHandler.java
│   │               │   ├── CAConnector.java
│   │               │   ├── CAConstants.java
│   │               │   ├── CAContext.java
│   │               │   ├── CAJNameClient.java
│   │               │   ├── CAResponseHandler.java
│   │               │   ├── CATransport.java
│   │               │   ├── CATransportRegistry.java
│   │               │   ├── CachedByteBufferAllocator.java
│   │               │   ├── ChannelSearchManager.java
│   │               │   ├── ConnectionException.java
│   │               │   ├── Connector.java
│   │               │   ├── DBRDecoder.java
│   │               │   ├── DBREncoder.java
│   │               │   ├── ExceptionHandler.java
│   │               │   ├── NotifyResponseRequest.java
│   │               │   ├── RepeaterRegistrationTask.java
│   │               │   ├── Request.java
│   │               │   ├── ResponseHandler.java
│   │               │   ├── ResponseRequest.java
│   │               │   ├── Transport.java
│   │               │   ├── TransportClient.java
│   │               │   ├── handlers
│   │               │   │   ├── AbstractCAJResponseHandler.java
│   │               │   │   ├── AbstractCAResponseHandler.java
│   │               │   │   ├── AccessRightsResponse.java
│   │               │   │   ├── BadResponse.java
│   │               │   │   ├── BeaconResponse.java
│   │               │   │   ├── ChannelDisconnectedResponse.java
│   │               │   │   ├── ClearChannelResponse.java
│   │               │   │   ├── CreateChannelFailedResponse.java
│   │               │   │   ├── CreateChannelResponse.java
│   │               │   │   ├── EchoResponse.java
│   │               │   │   ├── EventAddResponse.java
│   │               │   │   ├── EventCancelResponse.java
│   │               │   │   ├── ExceptionResponse.java
│   │               │   │   ├── NoopResponse.java
│   │               │   │   ├── ReadNotifyResponse.java
│   │               │   │   ├── RepeaterConfirmResponse.java
│   │               │   │   ├── ResponseRequestExceptionHandler.java
│   │               │   │   ├── SearchResponse.java
│   │               │   │   ├── VersionResponse.java
│   │               │   │   └── WriteNotifyResponse.java
│   │               │   ├── reactor
│   │               │   │   ├── Reactor.java
│   │               │   │   ├── ReactorHandler.java
│   │               │   │   └── lf
│   │               │   │       ├── LeaderFollowersHandler.java
│   │               │   │       └── LeaderFollowersThreadPool.java
│   │               │   ├── requests
│   │               │   │   ├── AbstractCARequest.java
│   │               │   │   ├── ClearChannelRequest.java
│   │               │   │   ├── CreateChannelRequest.java
│   │               │   │   ├── EchoRequest.java
│   │               │   │   ├── EventAddRequest.java
│   │               │   │   ├── EventCancelRequest.java
│   │               │   │   ├── EventsOffRequest.java
│   │               │   │   ├── EventsOnRequest.java
│   │               │   │   ├── HostNameRequest.java
│   │               │   │   ├── ReadNotifyRequest.java
│   │               │   │   ├── RepeaterRegisterRequest.java
│   │               │   │   ├── SearchRequest.java
│   │               │   │   ├── SubscriptionUpdateRequest.java
│   │               │   │   ├── UserNameRequest.java
│   │               │   │   ├── VersionRequest.java
│   │               │   │   ├── WriteNotifyRequest.java
│   │               │   │   └── WriteRequest.java
│   │               │   └── sync
│   │               │       ├── NamedLockPattern.java
│   │               │       └── ReferenceCountingLock.java
│   │               └── util
│   │                   ├── HexDump.java
│   │                   ├── InetAddressUtil.java
│   │                   ├── IntHashMap.java
│   │                   ├── SearchTimer.java
│   │                   ├── Timer.java
│   │                   ├── logging
│   │                   │   ├── ConsoleLogFormatter.java
│   │                   │   ├── ConsoleLogHandler.java
│   │                   │   └── LoggerProvider.java <- interface, implemented by CAContext.java, almost empty, empty in ts
│   │                   └── nif
│   │                       └── InetAddressUtilV6.java
│   └── gov
│       └── aps
│           └── jca
│               ├── CAException.java
│               ├── CASeverity.java
│               ├── CAStatus.java
│               ├── CAStatusException.java
│               ├── Channel.java
│               ├── Context.java <-- abstract class, implemented by CAJContext.java, done
│               ├── Enum.java
│               ├── JCALibrary.java
│               ├── JCALibrary.properties
│               ├── Monitor.java
│               ├── TimeoutException.java
│               ├── ValuedEnum.java
│               ├── Version.java
│               ├── cas
│               │   ├── CompletionCallback.java
│               │   ├── ProcessVariable.java
│               │   ├── ProcessVariableAttachCallback.java
│               │   ├── ProcessVariableEventCallback.java
│               │   ├── ProcessVariableExistanceCallback.java
│               │   ├── ProcessVariableExistanceCompletion.java
│               │   ├── ProcessVariableReadCallback.java
│               │   ├── ProcessVariableWriteCallback.java
│               │   ├── Server.java
│               │   ├── ServerChannel.java
│               │   ├── ServerContext.java
│               │   └── ServerMonitor.java
│               ├── configuration
│               │   ├── AbstractConfiguration.java
│               │   ├── Configurable.java
│               │   ├── Configuration.java
│               │   ├── ConfigurationException.java
│               │   ├── DefaultConfiguration.java
│               │   ├── DefaultConfigurationBuilder.java
│               │   ├── DefaultConfigurationSerializer.java
│               │   ├── NamespacedSAXConfigurationHandler.java
│               │   ├── Reconfigurable.java
│               │   └── SAXConfigurationHandler.java
│               ├── dbr
│               │   ├── ACK.java
│               │   ├── BYTE.java
│               │   ├── CTRL.java
│               │   ├── DBR.java
│               │   ├── DBRFactory.java
│               │   ├── DBRType.java
│               │   ├── DBR_Byte.java
│               │   ├── DBR_CTRL_Byte.java
│               │   ├── DBR_CTRL_Double.java
│               │   ├── DBR_CTRL_Enum.java
│               │   ├── DBR_CTRL_Float.java
│               │   ├── DBR_CTRL_Int.java
│               │   ├── DBR_CTRL_Short.java
│               │   ├── DBR_CTRL_String.java
│               │   ├── DBR_Double.java
│               │   ├── DBR_Enum.java
│               │   ├── DBR_Float.java
│               │   ├── DBR_GR_Byte.java
│               │   ├── DBR_GR_Double.java
│               │   ├── DBR_GR_Float.java
│               │   ├── DBR_GR_Int.java
│               │   ├── DBR_GR_Short.java
│               │   ├── DBR_GR_String.java
│               │   ├── DBR_Int.java
│               │   ├── DBR_LABELS_Enum.java
│               │   ├── DBR_PRECISION_Double.java
│               │   ├── DBR_PRECISION_Float.java
│               │   ├── DBR_PutAckS.java
│               │   ├── DBR_PutAckT.java
│               │   ├── DBR_STSACK_String.java
│               │   ├── DBR_STS_Byte.java
│               │   ├── DBR_STS_Double.java
│               │   ├── DBR_STS_Enum.java
│               │   ├── DBR_STS_Float.java
│               │   ├── DBR_STS_Int.java
│               │   ├── DBR_STS_Short.java
│               │   ├── DBR_STS_String.java
│               │   ├── DBR_Short.java
│               │   ├── DBR_String.java
│               │   ├── DBR_TIME_Byte.java
│               │   ├── DBR_TIME_Double.java
│               │   ├── DBR_TIME_Enum.java
│               │   ├── DBR_TIME_Float.java
│               │   ├── DBR_TIME_Int.java
│               │   ├── DBR_TIME_LABELS_Enum.java
│               │   ├── DBR_TIME_Short.java
│               │   ├── DBR_TIME_String.java
│               │   ├── DOUBLE.java
│               │   ├── ENUM.java
│               │   ├── FLOAT.java
│               │   ├── GR.java
│               │   ├── INT.java
│               │   ├── LABELS.java
│               │   ├── PRECISION.java
│               │   ├── SHORT.java
│               │   ├── STRING.java
│               │   ├── STS.java
│               │   ├── Severity.java
│               │   ├── Status.java
│               │   ├── TIME.java
│               │   └── TimeStamp.java
│               └── event
│                   ├── AbstractEventDispatcher.java
│                   ├── AccessRightsEvent.java
│                   ├── AccessRightsListener.java
│                   ├── CAEvent.java
│                   ├── ConnectionEvent.java
│                   ├── ConnectionListener.java
│                   ├── ContextExceptionEvent.java
│                   ├── ContextExceptionListener.java
│                   ├── ContextMessageEvent.java
│                   ├── ContextMessageListener.java
│                   ├── ContextVirtualCircuitExceptionEvent.java
│                   ├── DefaultContextExceptionListener.java
│                   ├── DefaultContextMessageListener.java
│                   ├── DirectEventDispatcher.java
│                   ├── EventDispatcher.java
│                   ├── GetEvent.java
│                   ├── GetListener.java
│                   ├── LatestMonitorOnlyQueuedEventDispatcher.java
│                   ├── MonitorEvent.java
│                   ├── MonitorListener.java
│                   ├── PutEvent.java
│                   ├── PutListener.java
│                   ├── QueuedEventDispatcher.java
│                   └── SynchronizedLimitedInt.java
└── site
    ├── apt
    │   └── index.apt
    └── site.xml

33 directories, 251 files
```

# refs

 - [CA protocol specification](https://epics.anl.gov/base/R3-16/0-docs/CAproto/index.html)



# todo
 - what if the readback value is very very long, which has more than 1 tcp packet?

 - Beacon 
 - monitor
 - improve parallel capabilities, faster!!! It's too slow for 2000 channels.

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

# exception strategies

Most of th exceptions are related to the network.


# notes:

The SID in response table for CA_PROTO_READ_NOTIFY in CA protocol reference is wrong. It says `SID`, actually it is actually `Status`. The CA_PROTO_WRITE_NOTIFY is correct. See https://epics.anl.gov/base/R3-16/0-docs/CAproto/index.html

This is corrected in `TCPTransport.ts`

 - Commands (TCP and UDP)
   - <span style="color:green"> CA_PROTO_VERSION </span>
   - <span style="color:green"> CA_PROTO_SEARCH </span>
   - CA_PROTO_NOT_FOUND
   - <span style="color:green"> CA_PROTO_ECHO </span>
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
   - <span style="color:green"> CA_PROTO_ERROR </span>
   - <span style="color:green"> CA_PROTO_CLEAR_CHANNEL </span>
   - <span style="color:green"> CA_PROTO_READ_NOTIFY </span>
   - ~~CA_PROTO_READ_BUILD~~
   - <span style="color:green"> CA_PROTO_CREATE_CHAN </span>
   - <span style="color:green"> CA_PROTO_WRITE_NOTIFY </span>
   - <span style="color:green"> CA_PROTO_CLIENT_NAME </span>
   - <span style="color:green"> CA_PROTO_HOST_NAME  </span>
   - <span style="color:green"> CA_PROTO_ACCESS_RIGHTS </span>
   - ~~CA_PROTO_SIGNAL~~
   - <span style="color:green"> CA_PROTO_CREATE_CH_FAIL </span>
   - <span style="color:green"> CA_PROTO_SERVER_DISCONN </span>


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
│   │               │   ├── BeaconEmitter.java, used by CAJServerContext.java
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

# CARepeater

Nomenlectures:
 - client: Channel Access client program, `caget`, `camonitor`, `edm`
 - server, Channel Access server program, typically the IOC (soft, vme, ...)
 - CARepeater, a program that runs on the same computer as the client

Relationship between the client and the CARepeater:

  1. The client starts
  2. client checks the port `5065` on this computer. If this port is being used, the EPICS would assume that the CARepeater is running. If this port is not used, then the client MUST start the CARepeater. The CARepeater has a UDP socket, this socket binds to a dedicated `5065` port (or a modified `CA_REPEATER_PORT`, but I have never seen it changed), listening and send packets to/from this port. 
  3. After the CARepeater starts, the client sends a `CA_REPEATER_REGISTER 0x18` using a random UDP port (e.g. `1234`) to the CARepeater's `5065` port. The information carried on this UDP packet is simply client's IP address, which could be `localhost`, `127.0.0.1`, or a real IP address. Note that the port `1234` is not included in the UDP payload. 
  4. After received `CA_REPEATER_REGISTER 0x18`, the CARepeater add the client's IP and port to a list. If this IP:port already exist, always replace it. 
  5. The CARepeater creates a UDP socket, this socket is bound to a random port, e.g. `5678`. This port is dedicated to this client. The UDP socket uses port `5678` sending a `CA_REPEATER_CONFIRM 0x11` packet to `1234` port of the client's IP. This UDP packet only contains a `127.0.0.1`, which indicates the IP address of the CARepeater. The UDP port of the CARepeater `5065` or the dedicated port `5678` for this client is not included at all. 
  6. At this point, the client should feel safe to establish TCP connection with server.

We can see:
  - port `5065` of the CARepeater only receives, it never sends out
  - there is only one-round of talk: `client:1234` --> `CARepeater:5065`, and `CARepeater:5678` --> `client:1234`

Relationship between server and CARepeater:
  1. the CARepeater starts, with port `5065` listening 
  2. the server starts (most probably on another computer), it periodically sends out beacon signal through a dedicated UDP port `5064`. If `5064` is occupied, the server will use a random UDP port, e.g `9527`. So, unlike the hard-coded `5065` which cannot be changed, the `5064` is flexible, it can be a different nubmer. 
  3. The beacon signal sent from server's UDP `5064` (or `9527` if `5064` is occupied) port is `CA_PROTO_RSRV_IS_UP 0x0D`, its payload contains: 
     1. CA protocol version, 
     2. server's UDP port `5064` (or `9527` if `5064` is occupied), 
     3. beacon ID, a unique sequencial number indicating which beacon it is 
     4. address of the server, may be 0
  4. After received this `CA_PROTO_RSRV_IS_UP 0x0d` packet, the CARepeater re-route this packet to all its clients. The re-route is carried out via Repeater's dedicated port for each client, e.g. `5678`. 
  5. At this point, 


We can see:
  - port `5065` of the CARepeater only receives, it never sends out
  - the data flow: `server:5064` --> `CARepeater:5065`, `CARepeater:5678` --> `client:1234`

Here is the note from `CARepeaters.ts`, keep it here:
```
        // this socket is associated to this.address:this.port which are of client's
        // this socket will send packet to this.address:this.port by default
        // and this socket will receive the packet only from this.address:this.port
        // it is different from .bind(port, address), where the socket will
        // listen to the specified port from the specified ip address
        // repeaterSocket is bound to a random local port when .connect()
        // is executed. This port is never exposed to the CARepeater client
        // The CARepeater client only knows the 5065 (CA_REPEATER_PORT) port
        // (1) the CARepeater runs, with a UDP port listening on port 5065
        // (2) the CARepeater starts to listen to network packets via port 5065
        // (3) the CARepeater may receive the network packet from CA server
        //     with "command 0x0d" (CA_PROTO_RSRV_IS_UP) via port 5065. This packet is
        //     also called as "CA server beacon". At this moment, the CARepeater does
        //     nothing upon receiving "CA server beacon"
        //     The "CA server beacon" is from a random port, e.g. 54758, of CA server.
        //     However, when we send data back to CA server, we should send to a 
        //     desganated port 5064.
        // (4) the CARepeater client runs, using a random UDP port, e.g. 53565
        // (5) the CARepeater client sends a packet to 127.0.0.1:5065 in the blind
        //     with "command 0x18" (CA_REPEATER_REGISTER) via port 53565
        // (6) the CARepeater receives the "command 0x18" packet from CARepeater client
        //     It decodes the packet, obtaining the following info:
        //     (a) the CARepeater client's IP address: 127.0.0.1
        //     (b) the CARepeater client's port: 53565
        // (7) Using the above 2 pieces of info, the CARepeater creates a "Client" object
        //     and add this object to an array in CARepeater. This "Client" object 
        //     has its own UDP socket, with a random port, e.g. 127.0.0.1:59614
        //     Now we have a 1-to-1 correspondance: client is 127.0.0.1:53565, and
        //     the corresponding "Client" object is 127.0.0.1:59614
        //     From now on: all the data exchange are this way: 
        //     (a) client --> CARepeater: 53565 --> 5065
        //     (b) CARepeater --> client: 59614 --> 53565
        //     (c) CA server --> CARepeater: 54758 --> 5065
        //     (d) CARepeater --> CA server: no such a thing
        // (8) Then, the CARepeater sends a packet with "command 0x11" (CA_REPEATER_CONFIRM)
        //     back to client's address:port, e.g. 127.0.0.1:53565, via this client's
        //     desgnated "Client" object's port 59614
        // (9) The CARepeater client will response to the CA_REPEATER_CONFIRM command
        // The client sends message to 127.0.0.1:5065, then the CARepeater
        // knows the messages is from 127.0.0.1:53565

```

# JCA

```
~/projects2/jca-src
```


Compile:

```
mvn -DskipTests -Dmaven.javadoc.skip=true clean package
```

Result is a `.jar` file (a library):

```
~/projects2/jca-src/target/jca-2.4.7-SNAPSHOT.jar
```

We can use load this `.jar` file into our own code:

```
java -cp '.:jca-2.4.7-SNAPSHOT.jar' BasicExample val2
```

The command above will connect PV name `val2`.

The `-cp` means `-classpath`, this path has 2 components: `.` and `jca-2.4.7-SNAPSHOT.jar`. This tells the `java` command to search the java classes (binaries) in these 2 folders (we know `.jar` is a zip file, which can be treated as a folder). 

We know that a `java` command starts to execute from a `main()` function inside a class (binary). This class can be any name. In our case, the `main()` function is inside `BasicExample.class`. If we run 

```
java -cp 'jca-2.4.7-SNAPSHOT.jar' BasicExample val2
```

The `java` program won't be able to locate `BasicExample.class` file, and will issue an error:

```
Error: Could not find or load main class BasicExample
Caused by: java.lang.ClassNotFoundException: BasicExample
```

Yes, it is weired, `java` won't automatically search current folder `.` for `BasicExample.class` file if `-cp` is used. However, if there is no `-cp`, then `java` will search the current folder for `BasicExample.class`.

If we run it as 

```
java -cp '.' BasicExample val2
```

there is an error

```
Error: Unable to initialize main class BasicExample
Caused by: java.lang.NoClassDefFoundError: gov/aps/jca/event/GetListener
```

It says `unable to initialize BasicExample`, because the `GetListener` is not found. Yes, because `java` program cannot find the location for `GetListener` class. This location is `jca-2.4.7-SNAPSHOT.jar`. 

Here is an example: we can create a simple program:

```java
// Test01.java
public class Test01 {
    public static void main(String[] args) {
        System.out.println("hahahah");
    }
}
```

Then compile it:

```
javac Test01.java
```

Then run it: 

```
java Test01
```

However, if we have to use `-cp` option, we must include `.` in it. Otherwise, it will generate an error like above.
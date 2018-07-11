# node-red-contrib-mytimeout Readme
Node-red-contrib-mytimeout is a countdown timer that can be trigged by sending it input. It can be turned off, stopped or cancelled with the correct input. It can be 'tickled' (restarted) with any other command not listed below. You can dynamically change the timeout and warning values by sending the appropriate JSON to the input.

Node-red-contrib-mytimeout can send and receive to the same topic (if the input matches the output and the message is skipped to avoid an endless loop).

**Note:** Versions before **2.0.0** had incorrect code. The code has changed the input from /timer/ to /timeout/ to match the documentation.

Was:

```
{
    "payload": "on",
    "timer": 3600,
    "warning": 300
}
```
is now

```
{
    "payload": "on",
    "timeout": 3600,
    "warning": 300
}
```

If the older message is sent, the timer will trigger but it will run with the default timer settings from the node and not the values passed in the JSON message.

If the node property 'Warning state payload' is not set or the property 'Warning (sec)' is set to 0, then no warning message will be sent.

If the timer is not currently running and a **stop** or **cancel** is sent to the timer, no output will be sent. An **on** will trigger the timer to begin running. If an **off** is sent while the timer is not running, an off message will be sent.

Also I've added a second output which sends out the time left on the timer.

```
{"payload":30,"state":1,"flag":"ticks > 0"}
or
{"payload":10,"state":2,"flag":"warn >= ticks"}
or
{"payload":0,"state":0,"flag":"off"}
or
{"payload":-1,"state":0,"flag":"stop"}
or
{"payload":-1,"state":0,"flag":"cancel"}
or
{"payload": -1, "state": 0, "flag": "unknown"}
```

When the **off** is sent or timeout occurs, the output 2 message is the same.
The **unknown** should never occur but is left in in case something breaks.

## myTimeout
MyTimeout started as hacked timer code I stole from Pete Scargill. The code would start a timer running if you sent it any trigger (tickle the timer). It would continue to run if further triggers were sent before the timeout occurred. A trigger was anything sent to the input of the timer.

My code goes some steps further. It allows you to tickle the timer, turn it off, stop it or cancel the timer. It also allows you to send JSON (see below) to override the timer, to turn off the timer or to cancel or stop the timer. It still retains some of Pete's behaviors. You can still send almost anything to tickle the timer with the exception of the JSON below which will cause the timer to do specific things.

You can configure the timeout module with the settings for the Safe and Unsafe messages. Safe is sent on the start of the timer, the unsafe message sent when the timeout occurs.

* Name
* Output topic
* On state payload
* Warning state payload
* Off state payload
* Countdown (sec)
* Warning (sec)

All of this is very useful for things like lights that are motion activated. If motion is detected, the Safe payload is sent (On or 1). The timer can be started when motion is detected and as long as the motion continues there will be no timeout (if motion occurs more often than the default timeout). When the timeout occurs the Unsafe payload is sent (Off or 0). When the timeout warning time (n seconds before the timeout) occurs the warning message is sent on output 1.

If you set the warning seconds to 0 or leave the warning payload empty then the timer will skip sending a warning message and simply do a countdown. Setting the warning time in the JSON input to 0 will do the same thing.

## MyTimeout
The simple payload is just a string consisting of:

* "on" or 1 - which turns on the timer and uses the default settings in the node (and issues an "on" on the output)
* "off" or 0 - which turns off the timer (and issues an "off" on the output)
* "stop" - which stops the timer (and issues a "stop" on the output)
* "cancel" - which cancels the timer (and does not send any output)

My additions to the code allows the user to send JSON in the triggers. You can override the timeout and warning times. 

```
{
    "payload": "on",
    "timeout": 3600,
    "warning": 300
}

{
    "payload": "off"
}

{
    "payload": "stop"
}

{
    "payload": "cancel"
}
```

Ths "payload" behaves like the simple string payload above.

### The second output
This is a new feature in v2.x.x of node-red-contrib-mytimeout. It is the countdown information.

```
{"payload":30,"state":1,"flag":"ticks > 0"}
{"payload":5,"state":2,"flag":"warn >= ticks"}
{"payload": -1, "state": 0, "flag": "stop"}
{"payload": 0, "state": 0, "flag": "off"}
{"payload": -1, "state": 0, "flag": "cancel"}
{"payload": -1, "state": 0, "flag": "unknown"}
```

The "payload" is the number of seconds left on the timer, if 0 that means it is off, -1 means it was stopped, cancelled or the unknown has occurred.

### Payload
* **on** - turns on the timer. The addition fields *timeout* and *warning* are optional and allow the user to change the defaults. Both field values are integers and are in seconds. This payload will cause the timer to send a *Timer on payload* message in the msg.payload output
* **off** - turns off the timer. This payload will cause the timer to send a *Timer off payload* in the msg.payload output
* **stop** - stops the timer. This payload will cause the timer to send *stop* in the msg.payload output
* **cancel** - cancels the timer. This payload will cause the timer to cancel but send nothing in the msg.payload output
* If something other that the above (including no payload) it will be treated as a default **on** message. This allows messages to tickle the timer.

When sending the JSON **on** message, payload, timeout and warning are
all optional. When not present, the default node values will be
used. The JSON message **off** will immediately cause the timer node
to send an *Timer off payload* as the message and stop the timer. The
JSON **stop** message will stop the timer and send the stop as the
message. The JSON **cancel** message will stop the timeout and not
send a message. There is very little difference in the *off*, *stop*
and *cancel* behaviors other than what is sent or not sent to the
output 1. They all stop the timer.

# Sample flow

I put together a [sample flow](https://flows.nodered.org/flow/a391edfb38b959122d2dd42242ddd950) that should help with using the node.


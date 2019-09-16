# node-red-contrib-mytimeout Readme
Node-red-contrib-mytimeout is a countdown timer that can be trigged by sending it input. It will run until the timer runs out where it will turn off. It can be turned off, stopped or cancelled with the correct input. It can be 'tickled' (restarted) with an on message or any other command not listed below. Meaning, if you send it junk, you have tickled the timer to continue to run. You can dynamically change the timeout and warning values by sending the appropriate Javacript object to the input.

Node-red-contrib-mytimeout can send and receive to the same MQTT topic. If the input matches the previously sent output, the message is ignored to avoid an endless loop.

## myTimeout
MyTimeout started as hacked timer code I stole from Pete Scargill. Pete's code would start a timer running if you sent it any trigger (tickle the timer). It would continue to run if further triggers were sent before the timeout occurred. A trigger was anything sent to the input of the timer.

My code goes a few steps further. It allows you to tickle the timer, turn off, stop or cancel the timer. It also allows you to send a Javascript object (see below) to override the timer's default values. Allowing you to turn off, to cancel or stop the timer. It still retains some of Pete's behaviors. You can still send almost anything to tickle the timer with the exception of the Javascript objects below which will cause the timer to do specific things.

You can configure the timeout module with the settings for the Safe and Unsafe messages. Safe is sent on the start of the timer, the unsafe message sent when the timeout occurs.

* Name
* Output topic (optional)
* On state payload
* Warning state payload (optional)
* Off state payload
* Countdown (seconds, integer)
* Warning (seconds, integer)

**Please note:** The countdown and warning values must be whole, integer numbers. Using floating point numbers can cause the timer to not send the appropriate off state payload.

All of this is very useful for things like lights that are motion activated. If motion is detected, the Safe payload is sent (default is "on"). The timer can be started when motion is detected and as long as the motion continues there will be no timeout (if motion occurs more often than the default timeout). When the timeout occurs the Unsafe payload is sent (default is "off"). When the timeout warning time (n seconds before the timeout) occurs the warning message is sent on output 1.

If you set the warning seconds to 0 or leave the warning payload empty then the timer will skip sending a warning message and simply do a countdown. Setting the warning time in the Javascript object input to 0 will do the same.

## MyTimeout inputs Preferred method

Like any Node-Red node, MyTimeout accepts the normal Javascript object. The payload attribute and value are expected and two additional attributes are optional. The payload value can be:

* "on" or 1 - which turns on the timer and uses the default settings in the node (and issues an "on" on the output)
* "off" or 0 - which turns off the timer (and issues an "off" on the output)
* "stop" - which stops the timer (and issues a "stop" on the output)
* "cancel" - which cancels the timer (and does not send any output)
* Anything not listed above will be considered an on condition (a kicker if you will)

A minimal Javascript object looks like this:

`
{
   "payload": "on"
}
`

With this message the timer and will run with the default settings in the timer node (timeout is defaulted to 30 seconds and warning is defaulted to 10 seconds).

You can override the timeout and warning times with:

`
{
    "payload": "on",
    "timeout": 3600,
    "warning": 300
}
`

This will restart the time, setting it to timeout in 3600 seconds and issue a warning 300 seconds before the timer turns off.

```
{
    "payload": "on",
    "warning": 0
}
```

Here the timer is turned on, using the default timeout. With the warning set to 0 seconds, the warning message will no longer be sent.

**Please note:** The timeout and warning values must be whole, integer numbers. Using floating point numbers can cause the timer to not send the appropriate off state payload. Both attributes are optional and either can be used to override the default settings.

Other triggers (inputs) are:

```
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

These will stop the timer. See above for the output description.

If the node property 'Warning state payload' is not set in the edit node dialog or the property 'Warning (sec)' is set to 0, then no warning message will be sent.

If the timer is not currently running and a **stop** or **cancel** is sent to the timer, no output will be sent. An **on** will trigger the timer to begin running. If an **off** is sent while the timer is not running, an off message will be sent.

## The first output
The first (primary) output sends msg.payload of on, off, warning or stop. An input of cancel, does not send any output.

```
{
    "_msgid":"eed69e39.50a2a",
    "topic":"",
    "payload":"off"
}
```

Here is an off example.

## The second output
This is a new feature in v2.0.0 of node-red-contrib-mytimeout. It is the countdown information.

Example output:
```
{"payload":30,"state":1,"flag":"ticks > 0"}
{"payload":5,"state":2,"flag":"warn >= ticks"}
{"payload": -1, "state": 0, "flag": "stop"}
{"payload": 0, "state": 0, "flag": "off"}
{"payload": -1, "state": 0, "flag": "cancel"}
{"payload": -1, "state": 0, "flag": "unknown"}
```

The "payload" is the number of seconds left on the timer, if 0 that means it is off, -1 means it was stopped, cancelled or the unknown has occurred.

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

Then the **off** is sent or timeout occurs, the output 2 message is the same.
The **unknown** should never occur but is left in in case something breaks.

The states are:
*  0 = off, stopped or cancel (timer not running)
*  1 = on (timer is running)
*  2 = warning (timer is running and in the warning period)

If you find any other state, open an issue.
[node-red-contrib-mytimeout Issues](https://github.com/linuxha/node-red-contrib-mytimeout/issues)

Actual output:
```
{
    "payload":4,
    "state":2,
    "flag":"warn >= ticks",
    "_msgid":"17b809b8.85c0d6"
}
```

### Payload
* **on** - turns on the timer. The addition fields *timeout* and *warning* are optional and allow the user to change the defaults. Both field values are integers and are in seconds. This payload will cause the timer to send a *Timer on payload* message in the msg.payload output
* **off** - turns off the timer. This payload will cause the timer to send a *Timer off payload* in the msg.payload output
* **stop** - stops the timer. This payload will cause the timer to send *stop* in the msg.payload output
* **cancel** - cancels the timer. This payload will cause the timer to cancel but send no msg output
* If something other that the above (including no payload) it will be treated as a default **on** message. This allows messages to tickle the timer.

# Sample flow

I put together a [sample flow](https://flows.nodered.org/flow/a391edfb38b959122d2dd42242ddd950) that should help with using the node.

## Notes on usage
One user setup 12 timers in one flow and began having issues (currently being investigated) with timers being left in the on state but not running. He moved each timer to it's own flow and gave each timer a unique name. I'm not sure if this is a usable work around but hope to test this soon.

# Credits
- Pete Scargill (the original timeout node and Big Timer)
- Colin Law (for pointing out and correcting my terminology in this Readme)

# Todo
- Force accepted values to integer
- Add input checking on the config page

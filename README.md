# node-red-contrib-mytimeout Readme
This is a fork of Peter Scargill's node-red-contrib-timeout module for node-red. I have different ideas of what a timer should do and how it should operate so I've taken to butchering Pete's code until it does what I want.

## Timeout
Pete's code would start a timer running if you sent it any trigger. It would contiunue to run if further triggers were sent before the timeout occurred.

You can configure the timeout module with the settings for the Safe and Unsafe messages. Safe is sent on the start of the timer, the unsafe message sent when the timeout occurs.

* Name
* Output topic
* Safe state payload
* Warning state payload
* Unsafe state payload
* Warning (sec)
* Countdown (sec)

* [ ] Repeat message every second
* [ ] Auto-restart when timed out

All of this is very useful for things like lights that are motion activated. If motion is detected, the Safe payload is sent (On or 1). The timer can be started when motion is detected and as long as the motion continues there will be no timeout. When the timeout occurs the Unsafe payload is sent (Off or 0). When the timeout warning time (n seconds before the timeout).

## MyTimeout
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
```

When sending the JSON on message, payload, timeout and warning are required. The JSON message off will immediately cause a timeout sending the off as the message. The JSON stop (or cancel) message will stop the timeout and send the stop as the message.

# Timeout (original Readme)

A simple timeout by Peter Scargill (pete@scargill.org). After setting the topic and both safe and unsafe messages, for, for example MQTT (or simply puttting 1 and 0 into the two messages) the node is triggered by any input and will send the SAFE message out. If continually triggered nothing more will happen but if allowed to timeout, the UNSAFE message will be sent. Hence this can be used as a watchdog. 

For more IOT, visit https://tech.scargill.net

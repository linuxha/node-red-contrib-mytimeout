// Author: Neil Cherry <ncherry@linuxha.com>

// I'd be much better off with a state machine
// https://www.smashingmagazine.com/2018/01/rise-state-machines/

// the on/off trigger string below whould be user configurable
//
// Inputs:
//  msg.payload = {
//    "payload": "on",
//    "timeout": 3600,
//    "warning": 300
//  }
//
// The above can be used to change the timeout and warning
//
// or
//
//  {
//    "payload": "on"
//  }
//
//  {
//    "payload": <Don't care> 
//  }
//
// The above gets treated as an on condition
//
//  {
//    "payload": "off"
//  }
//
//  {
//    "payload": "off"
//  }
//
//  {
//    "payload": "stop"
//  }
//
//  {
//    "payload": "cancel"
//  }
//
//  {
//    "payload": "tick"
//  }

// Initial is stop
// STOP => RUN => STOP (via timeout)

module.exports = function(RED) {
    "use strict";

    /*
      node-input-name
      node-input-outtopic
      node-input-outsafe
      node-input-outwarning
      node-input-warning
      node-input-timer
      node-input-limit
      node-input-repeat
      node-input-again
      node-input-atStart
    */
    function countdownNode(n) {
        var wflag       = false;
        var ticks       = -1;           //
        var lastPayload = 'not sent';   // 

        var timeout     = parseInt(n.timer||30);    // 
        var warn        = parseInt(n.warning||10);  // 

        var dbgCount    = 0;            // This is temporary to make sure we don't have a runaway process

        var line        = {};

        var BUG = 1;

        RED.nodes.createNode(this, n);

        // =====================================================================
        // There can be:
        // payload = "on" or 1 or "1" or anthing else except off/stop/cancel/debug
        //
        // @FIXME: If an on is sent it uses the current ticks (not the initial ticks sent with the message)
        //
        function on(msg) {
            // My intention is to move all the calculations for
            // these variables to here. At the moment they're all over
            // the place and confusing
            node.log("    node.timer: " + node.timer);
            node.log("    node.warn:  " + node.warn);
            node.log("    timeout:    " + timeout);
            node.log("    warn:       " + warn);
            node.log("    ticks:      " + ticks);
            if(msg) {
                // There are 3 sets of variables
                // default values (node.timer, node.warn)
                // passed values  (timeout, warn - if any)
                // running values (ticks)
                if(typeof(msg) === "object") {
                    node.log("msg: " + JSON.stringify(msg));
                    // if the message has msg.timeout
                    // if the message has msg.warning
                    if(msg.timeout) {
                        timeout = msg.timeout;
                        if(msg.warning) {
                            warn = msg.warning;
                        }
                    }
                } else {
                    node.log("msg: " + msg);
                    //then we should use the defaults
                    timeout = parseInt(timeout||node.timer);
                    warn    = parseInt(warn||node.warn);
                }
            } else {
                node.log("No msg");
                timeout = parseInt(timeout||node.time);
                warn    = parseInt(warn||node.warn);
            }

            ticks = timeout;

            node.log("");
            node.log("    node.timer: " + node.timer);
            node.log("    node.warn:  " + node.warn);
            node.log("    timeout:    " + timeout);
            node.log("    warn:       " + warn);
            node.log("    ticks:      " + ticks);

            node.log("Count timer on");
            node.status({
                fill  : "green",
                shape : "dot",
                text  : "Running: " + ticks // provide a visual countdown
            });

            node.payload = node.outsafe;

            lastPayload = node.payload;
            node.log("Send green: " + lastPayload);
            node.send([node, null]);

            state = 'run';

            wflag = false;      // rest the warning flag
        } // on(msg)

        function off() {
            node.log("off!");
            ticks = -1;
            stop('off');
        } // off()

        // I'm about to make this a bit complicated
        // In: off    out: off
        // In: stop   out: stop
        // In: cancel out: (nothing)
        function stop(s) {
            if(!s) {
                node.log("Empty stop");
                s = 'stop';
            }

            node.log(s + "! A");
            ticks = 0;
            state = s;

            node.status({
                fill  : "red",
                shape : "dot",
                text  : "Stopped: " + s // provide a visual countdown
            });

            // Stop or off can send, not cancel
            switch(s) {
                case 'stop':
                    node.payload = "stop";
                    lastPayload = node.payload;
                    node.log("Send red: " + lastPayload);

                    var tremain = { "payload": {"payload": -1, "state": 0, "flag": "stop"}};
                    node.send([node, tremain]);
                    break;

                case 'off':
                    node.payload = node.outunsafe;
                    lastPayload = node.payload;
                    node.log("Send red: " + lastPayload);

                    var tremain = { "payload": {"payload": 0, "state": 0, "flag": "off"}};
                    node.send([node, tremain]);
                    break;

                case 'cancel':
                    node.log("Send red: null");
                    var tremain = { "payload": {"payload": -1, "state": 0, "flag": "cancel"}};
                    lastPayload = "";
                    node.send([null, tremain]);
                    break;

                default:
                    node.log("Send red: ???");
                    var tremain = { "payload": {"payload": -1, "state": 0, "flag": "unknown"}};
                    lastPayload = "";
                    node.send([null, tremain]);
                    break;
            }

            state = 'stop';
            ticks = -1;
            timeout = parseInt(node.timer);
            warn    = parseInt(node.warn);
        }

        function cancel() {
            node.log("cancel!");
            stop('cancel');
            ticks = -1;
        }

        function doNothing() {
            node.log("doNothing!");
            state = 'stop';
            ticks = -1;
        }

        var states = {
            // Not sure if this is what I want in the long run but this is good for now
            stop: { on: on, off: off, stop: doNothing, cancel: doNothing }, 
            run:  { on: on, off: off, stop: stop, cancel: cancel }, 
        };

        var state = 'stop';

        var node = this;

        // GUI variables
        node.timer     = parseInt(n.timer)||30;
        node.state     = 'stop';                // For now it's a string, later an object?
        /*
          This is the Edit dialog for this node
          node properties
          Name                      Countdown timer
          Output Topic              topic <- if blank no output topic
          Timer On payload          on
          Warning state payload     Warning
          Timer Off payload         off
          Warning (secs)            5
          Countdown (secs)          30
          Rate Limit (msg/secs)     30
          [ ] Repeat message every second <- This doesn't seem like a good idea (???)
          [ ] Auto-restart when timed out
          [ ] Run at start

        */
        node.name      = n.name;               // node-input-name       - Name
        node.warn      = parseInt(n.warning)||5;// node-input-warning    - time in seconds (?)
        node.topic     = n.outtopic;           // node-input-outtopic   - Output topic
        node.outsafe   = n.outsafe || "on";    // node-input-outsafe    - Timer on payload
        node.outwarn   = n.outwarning;         // node-input-outwarning - Warning state payload
        node.outunsafe = n.outunsafe || "off"; // node-input-outunsafe  - Timer off payload
        //                                     // node-input-warning    - warning seconds
        //                                     // node-input-timer      - countdown seconds
        //                                     // node-input-repeat     - Rate limit seconds
        node.repeat    = n.repeat;             // node-input-repeat     - Repeat message every second
        node.again     = n.again;              // node-input-again      - Auto restart when timed out
        node.atStart   = n.atStart;            // node-input-atStart    - Run at start

        // -------------------------------------------------------------------------------
        // Commands
        // TIX
        node.on("TIX", function(inMsg) {
            lastPayload = "";
            if(ticks > 0) {
                // A blank outwarning means don't send
                if((warn >= ticks) && (node.outwarn !== "")) {
                    // a warn of 0 seconds also means don't send
                    if (warn) {
                        // Timer at warning
                        node.status({
                            fill  : "yellow",
                            shape : "dot",
                            text  : "Warning: " + ticks // provide a visual countdown
                        });

                        if(!wflag) {
                            node.payload = node.outwarn;

                            lastPayload = node.payload;
                            node.log("Send yellow: " + lastPayload);
                            node.send([node, null]);
                            wflag = true;
                        }
                    } // warn if there's a warn message

                    var tremain = { "payload": {"payload": ticks, "state": 2, "flag": "warn >= ticks"}};
                    node.send([null, tremain]);
                } else {
                    // HOW does this get sent out?
                    node.status({
                        fill  : "green",
                        shape : "dot",
                        text  : "Running: " + ticks // provide a visual countdown
                    });

                    var tremain = { "payload": {"payload": ticks, "state": 1, "flag": "ticks > 0"}};
                    node.send([null, tremain]);
                }
                ticks--;
            } else if(ticks == 0){
                node.log("ticks == 0");
                stop("off");

                //var tremain = { "payload": {"payload": 0, "state": 0, "flag": "ticks == 0"}};
                //node.send([null, tremain]);

                ticks = -1;
            } else {
                // Do nothing
            }
        });

        // @FIXME: We're not seeing the warning when warning is set but when defaults is not
        // Stop         (initial state at start up and when not running)
        // On           (timer reset to default value and running, on sent)
        // Off          (timer off, off sent, return to Stop)
        // CANCEL       (timer off, nothing sent, return to Stop)
        // Warning      (timer still on, warning sent)
        // Timeout      (timer off, off sent, return to Stop
        node.on( "input", function(inMsg) {
            // inMsg = {"topic":"home/test/countdown-in-b","payload":"{ \"payload\":\"on\",\"timeout\":6,\"warning\":3}","qos":0,"retain":false,"_msgid":"10ea6e2f.68fb32"}
            // inMsg = {"topic":"home/test/countdown-in-b","payload":"on","qos":0,"retain":false,"_msgid":"fd875a01.526a68"}
            node.log('================================================================================');
            node.log('1 node.input("input");');
            node.log("1 inMsg = " + JSON.stringify(inMsg));
            node.log("1 State = " + state);
            node.log("1 timeout = " + node.timer + " - node.timer");
            node.log("1 timeout = " + timeout + " - timeout");
            node.log("1 warning = " + node.warn);

            // =================================================================
            // First we need to drop any message than matches the last message
            // sent. This will keep us from getting into an infinite loop.
            // =================================================================

            //
            // This is taken from myTimeout.js (node-red-contrib-mytimeout)
            // It's purposed is to stop from repeating the same message from
            // being resent (an endless loop). For some reason this is on the
            // isString() check ... hmmm
            // =================================================================
// ================================================================================
            // =========================================================
            // Okay here's what I expect, user sends something (anything)
            // node send node.outsafe,
            // if node sees the exact string node.outstring just sent
            // then drop it
            // If the timer goes off then the lastPayload should be cleared
            if(typeof(inMsg.payload) === "string") {
                // this helps ignore message I just sent out
                if(lastPayload !== "") {
                    /*
                       26 Jun 02:22:23 - [info] [mytimeout:B] 4 TO: In != Out match, pass (off/{"payload": "off})
                       26 Jun 02:22:23 - [info] [mytimeout:B] 5 TO: {"payload": "off}
                    */
                    if(lastPayload === inMsg.payload) {
                        node.log("4 TO: In == Out match, skip (" + lastPayload + "/" + inMsg.payload + ")");
                        node.log("4  TO: State = " + state);
                        node.log("return !");
                        //ticks = timeout || node.timer;
                        return ; //
                    } else {
                        node.log("4 TO: In != Out match, pass (" + lastPayload + "/" + inMsg.payload + ")");
                    }
                    ticks = parseInt(timeout || node.timer);
                    lastPayload = "";
                }

                // Argh! The object is inside the msg.payload
                node.log("5 TO: " + inMsg.payload);


                // > var msg = {"payload":100}
                // > /.*"payload".*/.test(msg.payload)
                // false
                // > var msg = {"payload":'"payload":"on", "timeout":600,"warning":0}'} // this is a string not an object
                // undefined
                // > /.*"payload".*/.test(msg.payload)
                // true
                if(/.*"payload".*/.test(inMsg.payload)) {
                    node.log("inMsg.payload = " + inMsg.payload);
                    try {
                        //
                        // Convert the msg.payload to the inmsg.payload (string -> object)
                        inMsg.payload = JSON.parse(inMsg.payload);
                        if(inMsg.payload.timer === undefined) {
                            inMsg.payload.timer = node.timer;
                        }
                        if(inMsg.payload.warning === undefined) {
                            inMsg.payload.warning = node.warn;
                        }
                        line = inMsg.payload;
                    } catch(e) {
                        // Okay, now what do we do?
                        node.log("countdown.js: payload string to object conversion failed");
                        line = inMsg.payload;
                    } /* */
                } else {
                    line = inMsg;
                }
            } else { // it's an object
                node.log("5aTO: " + JSON.stringify(inMsg.payload));
                line = inMsg.payload;
            } // if((typeof(inMsg.payload) === "string")) {

            // When we get here I expect (what???)
            // it will either be a "any string"
            // or
            // an object of '{ "payload":"..." ... }

            // =========================================================
            // Okay now we need to deal with what just arrived
            //
            // We can have on of the following:
            // 'any string' - trigger/retrigger the timer - start the timer, issue the On message
            // 'clear' - being used in my debugging       - don't bother the timer, issue nothing
            //
            // Object or string (need to handle both)
            // '{ "payload": "on", "timer": 69, "warning": 15 }' - start the timer, issue the On message
            // '{ "payload": "off" }'    - stop the timer, issue an 'off'
            // '{ "payload": "stop" }'   - stop the timer, issue a 'stop'
            // '{ "payload": "cancel" }' - stop the timer, issue nothing
            // =========================================================
            // =================================================================

            if(line.payload === "on") {
                // =============================================================
                // 'on' - here is the only place where you can change the
                // defaults
                // And this get tricky
                // =============================================================
                ticks   = parseInt(timeout || node.timer);
                timeout = ticks;
                if(line.warning === "0") {
                    // 0 is used to override the sending of a warning message
                    warn = 0;
                } else {
                    warn = parseInt(warn || node.warn);
                }
            }
// ================================================================================
            try {
                // Where are state and line defined?
                node.log("2 states[" + state + "][" + line.payload.toLowerCase() + "]()");
                node.log("2 timeout = " + node.timer);
                node.log("2 timeout = " + timeout);
                node.log("2 warning = " + node.warn);
                node.log("2 warning = " + warn);

                // line.payload.toLowerCase()
                states[state][line.payload](inMsg.payload);
            } catch(err) {
                // =============================================================
                // 'on' - here is the only place where you can change the
                // defaults
                // And this get tricky
                // =============================================================
                ticks   = timeout || node.timeout;
                timeout = ticks;
                warn    = parseInt(warn || node.warn);

                node.log("states catch: " + err + "(" + ticks + "/" + warn + ")");
                // If it's not an existing state then treat it as an on
                // that way anthing can be used as a kicker to keep the timer
                // running
                on(inMsg.payload);
            }
        }); // node.on("input", ... )

        // Once the node is instantiated this keeps running
        // I'd like to change this to run when only needed
        var tick = setInterval(function() {
            var msg = { payload:'TIX', topic:""};
            node.emit("TIX", msg);
        }, 1000); // trigger every 1 sec

        node.on("close", function() {
            if (tick) {
                clearInterval(tick);
            }
        });

    } // function myTimeoutNode(n);
    RED.nodes.registerType("mytimeout", countdownNode);
} // module.exports


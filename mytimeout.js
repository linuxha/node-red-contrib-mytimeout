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

        var line        = {};

        RED.nodes.createNode(this, n);

        // =====================================================================
        // There can be:
        // payload = "on" or 1 or "1" or anthing else except off/stop/cancel/debug
        function on(msg) {
            // My intention is to move all the calculations for
            // these variables to here. At the moment they're all over
            // the place and confusing
            node.log("    msg:        " + JSON.stringify(msg));
            node.log("    msg:        " + typeof(msg));
            node.log("    node.timer: " + node.timer);
            node.log("    node.warn:  " + node.warn);
            try {
                node.log("    msg.timeout:" + msg.timeout);
                node.log("    msg.warning:" + msg.warning);
            } catch(e) {
                node.log("    msg.timeout:undefined");
                node.log("    msg.warning:undefined");
            }
            node.log("    timeout:    " + timeout);
            node.log("    warn:       " + warn);
            node.log("    ticks:      " + ticks);

            //
            // There are 3 sets of variables
            // default values (node.timer, node.warn)
            // passed values  (timeout, warn - if any)
            // running values (ticks)
            //
            ticks   = msg.timeout||timeout||node.timer;
            timeout = msg.timeout||timeout||node.timer;
            warn    = msg.warning||warn||node.warn;

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
            // if the main input routine calls this function, it will pass an
            // object (the input msg) which we don't care about really
            if(typeof(s) !== "string") {
                node.log("Empty stop");
                s = 'stop';
            }

            node.log(s + "! A");
            ticks = 0;

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

            node.log('=[ fini ]=======================================================================');
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

        function newMsg(msg) {
            var nMsg = msg;

            // x console.log("msg  = " + JSON.stringify(msg));
            // x console.log("nMsg = " + JSON.stringify(nMsg));

            switch(typeof(msg.payload)) {
                case "string":
                    if(/.*"payload".*/.test(msg.payload)) {
                        // string contain payload, convery to JSON
                        //
                        // in   = {"payload":"{ \"payload\":\"on\",\"timeout\":6,\"warning\":0}","qos":0}
                        // msg  = {"payload":"{ \"payload\":\"on\",\"timeout\":6,\"warning\":0}","qos":0}
                        // nMsg = {"payload":"{ \"payload\":\"on\",\"timeout\":6,\"warning\":0}","qos":0}
                        // msg  = {"payload":"on","timeout":6,"warning":0}
                        // nMsg = {"payload":"on","timeout":6,"warning":0}
                        // str msg  = {"payload":"on","timeout":6,"warning":0}
                        // str msg  = {"payload":"on","qos":0}
                        // out  = {"payload":"on","qos":0}
                        //
                        // > obj1 = { "payload": 1, "qos": 0 };
                        // > obj2 = { "payload": "on", "timeout": 60 };
                        // > var result = Object.assign({},obj1, obj2);
                        // { payload: 'on', qos: 0, timeout: 60 }
                        //
                        // x console.log("str msg = " + JSON.stringify(msg));
                        var t = newMsg(JSON.parse(msg.payload));
                        //nMsg.payload = t.payload;
                        nMsg = Object.assign({}, msg, t);
                    } else {
                        // x console.log("Not a /.*\"payload\".*/")
                        //nMsgpayload = msg.payload;
                    }
                    // x console.log("str msg  = " + JSON.stringify(nMsg));
                    // x console.log("typeof   = " + typeof(nMsg));
                    // x console.log("str msg  = " + JSON.stringify(nMsg.payload));
                    // x console.log("typeof   = " + typeof(nMsg.payload));

                    try{
                        nMsg.payload = nMsg.payload.toLowerCase();
                    } catch(e) {
                        nMsg.payload = nMsg.payload.toString().toLowerCase();
                    }
                    break;

                case "number":
                    nMsg.payload = msg.payload.toString();
                    // x console.log("num msg  = " + JSON.stringify(nMsg));
                    break;

                case "object":
                    // x console.log("obj msg  = " + JSON.stringify(msg));
                    msg.payload = msg.payload.payload;
                    t = newMsg(msg);
                    nMsg = t.payload;
                    // x console.log("obj nmsg = " + JSON.stringify(nMsg));
                    break;

                default:
                    node.log("??? msg  = " + JSON.stringify(msg));
                    node.log("??? msg  = " + typeof(msg.payload));
                    nMsg = { "payload": "" };
                    // x console.log("??? msg  = " + JSON.stringify(nMsg));
                    break;
            }

            return(nMsg);
        }

        var states = {
            // Not sure if this is what I want in the long run but this is good for now
            stop: { 0: off, on: on, off: off, stop: doNothing, cancel: doNothing }, 
            run:  { 0: off, on: on, off: off, stop: stop, cancel: cancel }, 
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
          Countdown (secs)          30
          Warning (secs)            5

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

        // Stop         (initial state at start up and when not running)
        // On           (timer reset to default value and running, on sent)
        // Off          (timer off, off sent, return to Stop)
        // CANCEL       (timer off, nothing sent, return to Stop)
        // Warning      (timer still on, warning sent)
        // Timeout      (timer off, off sent, return to Stop
        node.on( "input", function(inMsg) {
            // inMsg = {"topic":"home/test/countdown-in-b","payload":"{ \"payload\":\"on\",\"timeout\":6,\"warning\":3}","qos":0,"retain":false,"_msgid":"10ea6e2f.68fb32"}
            // inMsg = {"topic":"home/test/countdown-in-b","payload":"on","qos":0,"retain":false,"_msgid":"fd875a01.526a68"}
            node.log('=[ input ]======================================================================');
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

            // From here to the try { } catch {} we should only need to get the
            // inMsg's payload into line.payload (could be a string or object)


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

            // We only send a simple message ('on', 'off', 'stop' or 'cancel')
            if(lastPayload === inMsg.payload) {
                // So it's the same message as what was previously sent
                node.log("4 TO: In == Out match, skip (" + lastPayload + "/" + inMsg.payload + ")");
                node.log('=[ Skip ]=======================================================================');
                return ; //
            }

if(0) {
            // =================================================================
            // Okay now we need to deal with what just arrived
            //
            // We can have on of the following:
            // 'any string' - trigger/retrigger the timer - start the timer, issue the On message
            // 'clear' - being used in my debugging       - don't bother the timer, issue nothing
            //
            // Object or string (need to handle both)
            // '{ "payload": "on", "timeout": 69, "warning": 15 }' - start the timer, issue the On message
            // '{ "payload": "off" }'    - stop the timer, issue an 'off'
            // '{ "payload": "stop" }'   - stop the timer, issue a 'stop'
            // '{ "payload": "cancel" }' - stop the timer, issue nothing
            // =================================================================
            /*
            ** Wow, this is ugly!
            ** I can get a string, a number or an object
            ** but the string can contain a payload (needs to be converted to JSON)
            ** and then it can be a string, a number
              > j = { "payload": 0 }
                { payload: 0 }
              > typeof(j.payload)
                'number'
              > 
              > j = { "payload": "0" }
                { payload: '0' }
              > typeof(j.payload)
                'string'
              > 
              > j = { "payload": "{ \"payload\":0}" }
                { payload: '{ "payload":0}' }
              > typeof(j.payload)
                'string'
              > 
              > j = { "payload": {"payload": 0 }}
                { payload: { payload: 0 } }
              > typeof(j.payload)
                'object'
              > 
              > j = { "payload": {"payload": "0" }}
                { payload: { payload: '0' } }
              > typeof(j.payload)
                'object'
              > 
            */
            // =================================================================
            switch(typeof(inMsg.payload)) {
                case "string":
                    // Argh! The object is inside the msg.payload
                    node.log("5 TO: str " + inMsg.payload);

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
                            node.log("> inMsg typeof  = " + typeof(inMsg.payload));
                            line = JSON.parse(inMsg.payload);
                            node.log("< inMsg.payload = " + line);
                            node.log("< inMsg typeof  = " + typeof(line));
                        } catch(e) {
                            // Okay, now what do we do?
                            node.log("countdown.js: payload string to object conversion failed");
                            line = inMsg.payload;
                        } /* */
                    } else {
                        line = inMsg;
                    } // if(/.*"payload".*/.test(inMsg.payload))
                    break;
                case "number":
                    // It's a number so nothing to do here
                    node.log("5 TO: num " + inMsg.payload);
                    line = inMsg.payload;
                    break;
                case "object":
                    // it's an object, now we need to see what's in there
                    node.log("5 TO: obj " + inMsg.payload);
                    node.log("5aTO: " + JSON.stringify(inMsg.payload));
                    line = inMsg.payload;
                    break;
                default:
                    node.log("5 TO: ??? " + inMsg.payload);
                    console.log("inMsg.payload isn't a string, a number or an object");
                    break;
            } // if((typeof(inMsg.payload) === "string")) {


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
} else {
            line = newMsg(inMsg);
            node.log("line = " + JSON.stringify(line));
}
// ================================================================================
            var s = "nada";
            try {
                if(typeof(line.payload) == 'string') {
                    s = ("states catch: line " + line.payload);
                    states[state][line.payload](line);
                } else {
                    // Hopefully I've converted all the input to a string and
                    // to lower case.
                    s = ("states catch: line " + line.payload.payload);
                    states[state][line.payload.payload](line);
                }
            } catch(err) {
                // =============================================================
                // @FIXME: Need this moved into the on() function
                // 'on' - here is the only place where you can change the
                // defaults
                // And this get tricky
                // =============================================================
                node.log(s);
                node.log("states catch: " + err + "(" + ticks + "/" + warn + ")");
                // If it's not an existing state then treat it as an on
                // that way anthing can be used as a kicker to keep the timer
                // running
                on(line);
            }
// ================================================================================
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

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
    var countdownNode = function(n) {
        // Local variables
        var node        = this;
        
        var state       = 'stop';
        var wflag       = false;
        var ticks       = -1;           //
        var lastPayload = Date.now();;   // 

        var timeout     = parseInt(n.timer||30);    // 
        var warn        = parseInt(n.warning||10);  // 

        var ignoreCase  = '';

        var line        = {};
        var version     = '3.2.0'; //

        RED.nodes.createNode(this, n);

        // GUI variables
        node.timer     = parseInt(n.timer||30); // Need to build checking into the html file
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
        node.warnT     = parseInt(n.warning)||5;// node-input-warning    - time in seconds (?)
        node.topic     = n.outtopic;           // node-input-outtopic   - Output topic
        node.outsafe   = n.outsafe;            // node-input-outsafe    - Timer on payload
        node.outwarn   = n.outwarning;         // node-input-outwarning - Warning state payload
        node.outunsafe = n.outunsafe || "off"; // node-input-outunsafe  - Timer off payload
        //                                     // node-input-warning    - warning seconds
        //                                     // node-input-timer      - countdown seconds
        //                                     // node-input-repeat     - Rate limit seconds
        node.repeat    = n.repeat;             // node-input-repeat     - Repeat message every second
        node.again     = n.again;              // node-input-again      - Auto restart when timed out
        node.atStart   = n.atStart;            // node-input-atStart    - Run at start

        //
        function ndebug(s){
            // debug is either true or false
            if(n.ndebug) {      // only if true do we debug
                node.log(s); // Can't use the obj this here, used obj node
            }
        }

        if(n.ignoreCase) {      // Only if true do we ignore case
            ignoreCase = 'i';
        }

        // this.log("Debug = (" + n.ndebug + ")"); // Can't use the obj node here, use obj this
        this.status({
            fill  : "red",
            shape : "dot",
            text  : "Stopped: init"
        });

        // =====================================================================
        // There can be:
        // payload = "on" or 1 or "1" or anthing else except off/stop/cancel/debug
        function on(msg) {
            // My intention is to move all the calculations for
            // these variables to here. At the moment they're all over
            // the place and confusing
            if(n.ndebug) {
                ndebug("    msg:        " + JSON.stringify(msg));
                ndebug("    msg:        " + typeof(msg));
                ndebug("    node.timer: " + node.timer);
                ndebug("    node.warnT: " + node.warnT);
                try {
                    ndebug("    msg.timeout:" + msg.timeout);
                    ndebug("    msg.warning:" + msg.warning);
                } catch(e) {
                    ndebug("    msg.timeout:undefined");
                    ndebug("    msg.warning:undefined");
                }
                ndebug("    timeout:    " + timeout);
                ndebug("    warn:       " + warn);
                ndebug("    ticks:      " + ticks);
            }
            //
            // There are 3 sets of variables
            // default values (node.timer, node.warnT)
            // passed values  (timeout, warn - if any)
            // running values (ticks)
            //
            timeout = msg.timeout||timeout||node.timer;
            timeout = parseInt(timeout);                // ncherry@linuxha.com parseInt()
            if(msg.warning != 0) {
                warn = msg.warning||warn||node.warnT;
            } else {
                warn = 0;
            }
            warn    = parseInt(warn);                   // ncherry@linuxha.com parseInt()

            ticks = timeout;

            if(n.ndebug) {
                ndebug("");
                ndebug("    node.timer: " + node.timer);
                ndebug("    node.warnT: " + node.warnT);
                ndebug("    timeout:    " + timeout);
                ndebug("    warn:       " + warn);
                ndebug("    ticks:      " + ticks);

                ndebug("Count timer on");
            }
            node.status({
                fill  : "green",
                shape : "dot",
                text  : "Running: " + ticks // provide a visual countdown
            });

            // @Feature: no on msg
            if(msg.payload) {
                msg.payload = node.outsafe;
            }
            msg.topic   = node.topic;
            lastPayload = msg.payload;
            ndebug("Send Green: " + lastPayload || "''");
            if(msg.payload) {                             // @FEATURE: no on msg
                node.send([msg, null]);
            }

            state = 'run';

            wflag = false;      // rest the warning flag
        } // on(msg)

        function off() {
            ndebug("off!");
            ticks = -1;
            stop('off');
        } // off()

        // I'm about to make this a bit complicated
        // In: off    out: off
        // In: stop   out: stop
        // In: cancel out: (nothing)
        function stop(s) {
            // The states are only called from the node.on("input", ...)
            // That's where I define the line obj after I massage the incoming
            // message
            var msg = line;     // This is a biy of a risk, I'll leave it for now
            // if the main input routine calls this function, it will pass an
            // object (the input msg) which we don't care about really
            if(typeof(s) !== "string") {
                ndebug("Empty stop");
                s = 'stop';
            }

            ndebug(s + "! A");
            ticks = 0;

            node.status({
                fill  : "red",
                shape : "dot",
                text  : "Stopped: " + s // provide a visual countdown
            });

            // Stop or off can send, not cancel
            switch(s) {
                case 'stop':
                    msg.payload = "stop";
                    lastPayload = msg.payload;
                    ndebug("Send Red: " + lastPayload);

                    var tremain = {"payload": -1, "state": 0, "flag": "stop"};
                    node.send([msg, tremain]);
                    break;

                case 'off':
                    msg.payload = node.outunsafe;
                    msg.topic = node.topic;
                    lastPayload = msg.payload;
                    ndebug("Send red: " + lastPayload);

                    var tremain = { "payload": 0, "state": 0, "flag": "off"};
                    node.send([msg, tremain]);
                    break;

                case 'cancel':
                    ndebug("Send red: null");
                    var tremain = { "payload": -1, "state": 0, "flag": "cancel"};
                    lastPayload = Date.now();
                    node.send([null, tremain]);
                    break;

                default:
                    ndebug("Send red: ???");
                    var tremain = { "payload": -1, "state": 0, "flag": "unknown"};
                    lastPayload = Date.now();
                    node.send([null, tremain]);
                    break;
            }

            state = 'stop';
            ticks = -1;
            timeout = parseInt(node.timer);
            warn    = parseInt(node.warnT);

            ndebug('=[ fini ]=======================================================================');
        }

        function cancel() {
            ndebug("cancel!");
            stop('cancel');
            ticks = -1;
        }

        function doNothing() {
            ndebug("doNothing!");
            state = 'stop';
            ticks = -1;
        }

        // @TODO: This should return the original msg with as few changes as possible
        function newMsg(msg) {
            // Pretty much a deep clone but I don't think it
            // will copy things like sockets
            //nMsg.payload = JSON.parse(JSON.stringify(msg));
            var nMsg = Object.assign(msg, {}); // create a copy perhaps use this: JSON.parse(JSON.stringify(msg));

            // Okay now I need to figure out the format
            // is it?
            // A: { "payload": "on", "timeout": 30, ... }
            // or
            // B: { "payload": { "payload": "on", "timeout": 30, ... } }
            // or
            // C: { "payload": "{ \"payload\": \"on\", \"timeout\": 30, \"extra\":\"inside\" }", "other":"other", "extra": "outside" }
            switch(typeof(msg.payload)) {
                case "string":
                    ndebug("Str msg  = " + JSON.stringify(msg));
                    if(/.*"payload".*/.test(msg.payload)) {
                        ndebug(" msg.payload  = " + JSON.stringify(msg.payload));

                        // string contain payload, convery to JSON
                        var t = newMsg(JSON.parse(msg.payload));
                        nMsg = Object.assign(msg, t); // Perhaps I should use nMsg instead msg (and copy msg to nMsg above)?
                    }

                    //
                    try{
                        nMsg.payload = nMsg.payload.toLowerCase();
                    } catch(e) {
                        nMsg.payload = nMsg.payload.toString().toLowerCase();
                    }
                    break;

                case "number":
                    ndebug("Num msg  = " + JSON.stringify(msg));
                    nMsg.payload = msg.payload.toString();
                    break;

                case "object":
                    var m = msg.payload;
                    ndebug("Obj msg  = " + JSON.stringify(m));
                    t    = JSON.parse(JSON.stringify(m));
                    ndebug("obj m    = " + JSON.stringify(m));
                    nMsg = Object.assign(msg, t);
                    ndebug("obj t    = " + JSON.stringify(t));
                    ndebug("obj nmsg = " + JSON.stringify(nMsg));
                    break;

                default:
                    ndebug("??? msg  = " + JSON.stringify(msg));
                    ndebug("??? msg  = " + typeof(msg.payload));
                    nMsg.payload = "";
                    break;
            }
            ndebug("RTN msg  = " + JSON.stringify(nMsg));
            
            return nMsg;
        }

        // Leave this here, need the functions ref from above
        var states = {
            // Not sure if this is what I want in the long run but this is good for now
            stop: { 0: off, on: on, off: off, stop: doNothing, cancel: doNothing }, 
            run:  { 0: off, on: on, off: off, stop: stop, cancel: cancel }
        };

        // -------------------------------------------------------------------------------
        // Commands
        // TIX
        node.on("TIX", function(inMsg) {
            lastPayload = Date.now();
            var msg = {};

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
                            msg = Object.assign(msg, line); // Copy the original attributes into the new msg

                            msg.payload = node.outwarn;
                            msg.topic   = node.topic;
                            lastPayload = msg.payload;
                            ndebug("Send Yellow: " + lastPayload);
                            node.send([msg, null]);
                            wflag = true;
                        }
                    } // warn if there's a warn message

                    var tremain = { "payload": ticks, "state": 2, "flag": "warn >= ticks"};
                    node.send([null, tremain]);
                } else {
                    // HOW does this get sent out?
                    node.status({
                        fill  : "green",
                        shape : "dot",
                        text  : "Running: " + ticks // provide a visual countdown
                    });

                    var tremain = { "payload": ticks, "state": 1, "flag": "ticks > 0"};
                    node.send([null, tremain]);
                }
                ticks--;
            } else if(ticks == 0) {
                ndebug("ticks == 0");
                stop("off");

                //var tremain = { "payload": 0, "state": 0, "flag": "ticks == 0"}};
                //node.send([null, tremain]);

                ticks = -1;
            } else {
                // Do nothing
            }
        }); // node.on("TIX", function {});

        // Stop         (initial state at start up and when not running)
        // On           (timer reset to default value and running, on sent)
        // Off          (timer off, off sent, return to Stop)
        // Cancel       (timer off, nothing sent, return to Stop)
        // Warning      (timer still on, warning sent)
        // Timeout      (timer off, off sent, return to Stop
        node.on( "input", function(inMsg) {
            // inMsg = {"topic":"home/test/countdown-in-b","payload":"{ \"payload\":\"on\",\"timeout\":6,\"warning\":3}","qos":0,"retain":false,"_msgid":"10ea6e2f.68fb32"}
            // inMsg = {"topic":"home/test/countdown-in-b","payload":"on","qos":0,"retain":false,"_msgid":"fd875a01.526a68"}
            if(n.ndebug) {
                ndebug('=[ input ]======================================================================');
                ndebug('1 node.input("input");');
                ndebug("1 inMsg = " + JSON.stringify(inMsg));
                ndebug("1 State = " + state);
                ndebug("1 timeout = " + node.timer + " - node.timer");
                ndebug("1 timeout = " + timeout + " - timeout");
                ndebug("1 warning = " + node.warnT);
            }
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
            var regex = new RegExp('^' + lastPayload + '$', ignoreCase);
            //if(lastPayload === inMsg.payload) {
            if(regex.test(inMsg.payload)) {
                // So it's the same message as what was previously sent
                ndebug("4 TO: In == Out match, skip (" + lastPayload + "/" + inMsg.payload + ")");
                ndebug('=[ Skip ]=======================================================================');
                lastPayload = Date.now();
                return ; //
            }

            try {
                line = newMsg(inMsg);
            } catch (err) {
                // Basically treat the unknown payload as an on (i.e. anything can
                // tickle the timer as long as it's not off, 0, stop or cancel)
                node.warn("L477: newMsg(inMsg): " + err + " <" + JSON.stringify(inMsg) + ">");
            }
            ndebug("line = " + JSON.stringify(line));

// ================================================================================
            var s = "nada";
            
            try {
                states[state][line.payload](line);
            } catch(err) {
                // =============================================================
                // Anything that is not an existing state/function is treated as
                // an on request.
                // =============================================================
                ndebug("state = <" + line.payload + ">" + " (this is not an error - treated as 'on')");
                ndebug("states catch: " + err + " (" + ticks + "/" + warn + " - this is not an error)");
                // If it's not an existing state then treat it as an on
                // that way anthing can be used as a kicker to keep the timer
                // running
                on(line);
            }

            /* This is handled in newMsg(msg) above
            try {
                if(typeof(line.payload) == 'string') {
                    s = ("1 states catch: line \"" + line.payload);
                    states[state][line.payload](line);
                } else {
                    // Hopefully I've converted all the input to a string and
                    // to lower case.
                    s = ("2 states catch: line  \"" + line.payload.payload);
                    states[state][line.payload.payload](line);
                }
            } catch(err) {
                // =============================================================
                // Anything that is not an existing state/function is treated as
                // an on request.
                // =============================================================
                ndebug(s  + "\" (this is not an error)");
                ndebug("states catch: " + err + " (" + ticks + "/" + warn + " - this is not an error)");
                // If it's not an existing state then treat it as an on
                // that way anthing can be used as a kicker to keep the timer
                // running
                on(line);
            } /* */
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

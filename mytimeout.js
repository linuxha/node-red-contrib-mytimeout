// 
// I'd be much better off with a state machine

// changed = 0 means countdown
// changed = 1 means timeout
// changed = 2 means warn
// changed = 3 means stop
// changed = 4 means off
// changed = 5 means cancel

// Initial is TIMEOUT
// TIMEOUT => COUNTDOWN => WARN => TIMEOUT/STOP/CANCEL/OFF
// We can return to COUNTDOWN while in WARN
module.exports = function(RED) {
    "use strict";
    
    function myTimeoutNode(n) {
	var timeout     = 30;
	var oldTimeout  = 30;
	var timedown    = 0;	// was 30
	var warning     = 12;
	var oldWarning  = 12;
	//	var changed     = -1;
	var lastPayload = '';
	var dbgCount    = 0;	// This is temporary to make sure we don't have a runaway process

	var state = {
	    NOTRUNNING: 6,
	    COUNTDOWN:  0,
	    WARNING:    1,
	    TIMEOUT:    2,
	    STOP:       3,
	    OFF:        4,
	    CANCEL:     5
	};
	var stateStr = [
	    "COUNTDOWN",
	    "WARNING",
	    "TIMEOUT",
	    "STOP",
	    "OFF",
	    "CANCEL",
	    "NOTRUNNING"
	];
	var current = {
	    state: state.NOTRUNNING
	};

	RED.nodes.createNode(this, n);

	var node = this;

	// GUI variables
	node.timer     = n.timer;
	node.warn      = n.warning;
	node.topic     = n.outtopic;
	node.outsafe   = n.outsafe || "on";
	node.outwarn   = n.outwarning;
	node.outunsafe = n.outunsafe || "off";
	node.repeat    = n.repeat;
	node.again     = n.again;
	node.atStart   = n.atStart;

	// This is currently cleared by a setTimeout
	// I really wonder if I need this, for now it stays
	function clrLastPayloadFlag() {
	    lastPayload = '';
	}

	// @FIXME: Need to not start on initialize
	// @FIXME: Need to not send out a WARNING before the first ON
	// This may be the source of my initial warning troubles
	// But it's purpose was to keep the timer from starting when first
	// initialized
	if (node.timer != 0) {
	    timeout = parseInt(node.timer);
	    if(node.atStart) {
		timedown = parseInt(node.timer);
	    }
	    //	    } else {
	    //		changed = 1;
	    //	    }
	}

	node.status({
	    fill  : "red",
	    shape : "dot",
	    text  : "Not started"
	});

	// =====================================================================
	// the above only gets call on start up
	// once for each node running (so careful using global variables!)
	// =[ Fini Init code ]==================================================

	// =====================================================================
	// This gets called each time something is sent to this node
	// The setInteval runs every 1000 ms (continuously)
	//
	// <[ TOPIC ]>---<[ UI Timer sw ]>---<[ Function ]>---<[ myTimer ]>---<[ TOPIC ]>
	node.on( "input", function(inmsg) {
	    // Limits runaway, if it occurs
	    if(dbgCount > 15) {
		if(inmsg.payload == 'clear') {
		    node.log("1 TO: dbgCount cleared");
		    dbgCount = 0;

		    current.state = state.NOTRUNNING;

		    node.log("Cleared: " + dbgCount);
		    return ; //
		} else {
		    if(typeof(inmsg.payload) == 'object') {
			node.log("3 TO: dbgCount exceeded obj(" + JSON.stringify(inmsg.payload) + ")");
		    } else {
			node.log("3 TO: dbgCount exceeded " + dbgCount + " str(" + inmsg.payload + ")");
		    }

		    if(dbgCount < 17) {
			node.payload = undefined;
			node.status({
			    fill  : "grey",
			    shape : "dot",
			    text  : "Count exceeded"
			});
		    } else {
			if(dbgCount < 18) {
			    dbgCount++;
			}
		    }

		    //node.send(node);
		    return ; // this doesn't seem to work
		}
	    }
	    // At this poing we can see the following:
	    // msg.payload = "TIMINGXX" (timer tick), special handling
	    // msg.payload = JSON string (not yet an obj), special handling
	    //               sent via the mosquitto_pub cmd
	    // msg.payload = object,  special handling
	    //               sent via something like the 
	    // msg.payload = * - any string, tickles the timer to restart
	    if (inmsg.payload != "TIMINGXX") {
		// Timer turns the 
		if(typeof(inmsg.payload) == 'object') {
		    node.log("2 TO: HEY!");
		    node.log("2 TO: HEY! node.on inmsg.payload is: " + typeof(inmsg.payload));
		    inmsg.payload = JSON.stringify(inmsg.payload);
		    node.log("2 TO: HEY! " + inmsg.payload);
		}
		// =========================================================
		// Temporary code until I'm done testing
		dbgCount++;

		// =========================================================

		// =========================================================
		// Okay here's what I expect, user sends something (anything)
		// node send node.outsafe,
		// if node sees the exact string node.outstring just sent
		// then drop it
		// If the timer goes off then the lastPayload should be cleared
		if((typeof(inmsg.payload) == 'string')) {
		    // this helps ignore message I just sent out
		    if(lastPayload != '') {
			if(lastPayload == inmsg.payload) {
			    node.log("4 TO: In == Out match, skip (" + lastPayload + "/" + inmsg.payload + ")");
			    //lastPayload = '';
			    //inmsg.payload = '{"payload":"ignore"}';
			    node.log("  TO: State = " + stateStr[current.state]);
			    return ; //
			} else {
			    node.log("4 TO: In != Out match, pass (" + lastPayload + "/" + inmsg.payload + ")");
			}
			lastPayload = '';
		    }

		    node.log("5 TO: " + inmsg.payload);

		    if(/.*\"payload\".*/.test(inmsg.payload)) {
			try {
			    inmsg.payload = JSON.parse(inmsg.payload);
			    if(inmsg.payload.timer == undefined) {
				inmsg.payload.timer = node.timer;
			    }
			    if(inmsg.payload.warning == undefined) {
				inmsg.payload.warning = node.warning;
			    }
			} catch(e) {
			    // Okay, now what do we do?
			}
		    }
		} else { // it's an object
		    node.log("5aTO: " + JSON.stringify(inmsg.payload));
		} // if((typeof(inmsg.payload) == 'string')) {

		// When we get here I expect (what???)
		// it will either be a 'any string'
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

		// all other messages

		// We're only concerned with inmsg.payload being 'on', 'off', 'stop, or 'cancel) (or are we?)
		// more liklely node.outSafe, node.outwarning, node.outunsafe, 'stop', 'cancel'
		if(typeof(inmsg.payload) == 'object') {
		    node.log("6 TO: '" + lastPayload + "'='" + inmsg.payload.payload + "'");
		    node.log("  TO: '" + lastPayload + "'='" + JSON.stringify(inmsg.payload) + "' " + typeof(inmsg.payload));
		} else {
		    node.log("6 TO: '" + lastPayload + "'='" + inmsg.payload + "' " + typeof(inmsg.payload));
		}
		// This provides support for "on"
		if(inmsg.payload.payload != undefined) {
		    node.log("7 TO: switch("+inmsg.payload.payload+")");
		    switch(inmsg.payload.payload) {
		    case 1:
		    case "1":
		    case "On":
		    case "on":
			node.log("7aTO: " + inmsg.payload.timer + ", " + JSON.stringify(inmsg.payload));

			oldTimeout = timeout;
			oldWarning = warning;
			// We need to check for a valid timer and warning value
			timeout = timedown = inmsg.payload.timer||node.timer;
			node.log("  TO: Setting timedown to: " + timedown);
			warning = inmsg.payload.warning||node.warn; // 118
			break;

		    case 0:
		    case "0":
		    case "Off":
		    case "off":
			if(timedown == 0) {
			    //changed = 1; // It's already stopped
			    current.state = state.TIMEOUT;
			    node.log("s1TO: changing state: " + current.state);
			    node.log("7aTO: off, already timedown = 0")
			    return ;
			} 
			// Run out of time, but still in countdown
			// This should send the off
			// Turn it off right now
			current.state = state.OFF;
			node.log("s2TO: changing state: " + current.state);
			timedown = 0;
			//changed  = 0;
			break;

		    case "Cancel":
		    case "cancel":
			// Timer cancelled
                        current.state = state.CANCEL
			node.log("s3TO: changing state: " + current.state);
			timedown = 0;
			break;

		    case "Stop":
		    case "stop":
			// Timer cancelled
                        current.state = state.STOP;
			node.log("s4TO: changing state: " + current.state);
			timedown = 0;
			break;

		    case "ignore":
		    case "warning":
			break;

		    default:
			// Oops, don't know what happened
			node.log("? TO: unknown payload.payload " + inmsg.payload.payload);
			//
			timedown = timeout;
			break;
		    }
		    if(isNaN(timedown)) { timeout = oldTimeout; }
		} else {
		    node.log("7bTO: switch("+inmsg.payload+")");
		    switch(inmsg.payload) {
		    case 1:
		    case "1":
		    case "On":
		    case "on":
			node.log("7 TO: " + inmsg.payload.timer + ", " + JSON.stringify(inmsg.payload));

			oldTimeout = timeout;
			oldWarning = warning;
			// We need to check for a valid timer and warning value
			timeout = timedown = inmsg.payload.timer||node.timer;
			warning = inmsg.payload.warning||node.warn; // 118
			break;

		    case 0:
		    case "0":
		    case "Off":
		    case "off":
			if(timedown == 0) {
			    //changed = 1; // It's already stopped
			    current.state = state.TIMEOUT;
			    node.log("s5TO: changing state: " + current.state);
			    node.log("7aTO: off, already timedown = 0")
			    return ;
			} 
			// Run out of time, but still in countdown
			// This should send the off
			// Turn it off right now
			node.log("s6TO: changing state: " + current.state);
			current.state = state.OFF;
			timedown = 0;
			//changed  = 0;
			break;

		    case "clear":
		    case "Cancel":
		    case "cancel":
		    case "Stop":
		    case "stop":
		    case "Warning":
		    case "warning":
		    case "ignore":
			break;

		    //This is anything not handled by the switch
                    default:
		        timedown = timeout;
			break;
		    }
		}

		node.log("9 TO: timedown=" + timedown);
		node.log("  TO: timeout =" + timeout);
		//node.log("  TO: changed =" + changed);
		node.log("  TO: state   =" + current.state);
		node.log("  TO: warning =" + warning);
		// Let the default handle this
		// Otherwise anything can trip this
		// And I'd really like the switch statement to filter out some
		// of those statements
		//timedown = timeout; // Reset the timer (Really)
	    }			    // if (inmsg.payload != "TIMINGXX") {

	    // =================================================================
	    // From here on timedown and changed determine what happens
	    // =================================================================
	    if (timedown == 0) {
		var stopText;
		// Timer stopped, now determine why
		// Remember it's possible to be in state.WARN and the timedown == 0
		// COUNTDOWN -> WARN -> TIMEOUT or
		// COUNTDOWN -> STOP   (which is TIMEOUT) or
		// COUNTDOWN -> CANCEL (which is TIMEOUT but we don't say anything) or
		// COUNTDOWN -> OFF    (which is TIMEOUT)
		switch(current.state) {
		    case state.NOTRUNNING:
		        node.payload = "Not running";
		        break;
		    case state.TIMEOUT:
		        stopText = "Timed out";
		        node.payload = node.outunsafe;
		        break;
		    case state.WARNING:
		        //
		        stopText = "Timed out (warning)";
		        node.payload = node.outunsafe;
		        break;
		    case state.STOP:
		        stopText = "Stop";
		        node.payload = "stop";
		        break;
		    case state.OFF:
		        stopText = "Off";
		        node.payload = node.outunsafe;
		        break;
		    case state.CANCEL:
		        stopText = "Cancelled!";
		        //current.state = state.NOTRUNNING;
		        current.state = state.NOTRUNNING;
			node.log("s8TO: changing state: " + current.state);
		        node.payload = '';
		        break;
		    case state.COUNTDOWN: // This shouldn't be possible
		        stopText = "Countdown (?)";
		        node.payload = node.outunsafe;
		        break;
		    default:
		        stopText = "Unknown (?)";
		        node.payload = node.outunsafe;
		        break;
		}

		if(current.state != state.NOTRUNNING) {
		    node.log("RaTO: state: (99) != " + current.state + "(1/3/4/5)");
		    node.log("R TO: text:          " + stopText);
		    node.status({
			fill  : "red",
			shape : "dot",
			text  : stopText
		    });

		    timeout = oldTimeout;
		    // @FIXME: We're not seeing the default timer reset to the UI setting
		    /*
		      oldTimeout = node.timer;
		      timeout  = oldTimeout;
		      timedown = oldTimeout;
		      warning  = oldWarning;
		    */
		    // TIMEOUT, STOP, CANCEL, and OFF should be TIMEOUT when done
		    if ((current.state == state.WARNING) || (current.state == state.STOP) || (current.state == state.OFF) || (current.state == state.TIMEOUT)) {
			current.state = state.NOTRUNNING;
			lastPayload = node.payload;

			node.log("Send red: " + lastPayload);
			node.send(node);
		    }
		}
	    } else { // red above
		//if ((timedown <= node.warn) && (node.outwarn != "")) {
		//if ((timedown <= node.warn) && ((current.state != state.WARNING) || (current.state = state.TIMEOUT))) {
		if(timedown <= warning)  {
		    if (current.state != state.WARNING) {
			node.log("Y TO: state = " + current.state);
		    }

		    if (node.outwarn != "") {
			// Timer at warning
			node.status({
			    fill  : "yellow",
			    shape : "dot",
			    text  : "Warning: " + timedown // provide a visual countdown
			});

			timedown--;

			node.payload = node.outwarn;

			//if ((changed!=2)||(node.repeat)) {
			if (current.state == state.COUNTDOWN) {
			    //changed=2;
			    //setTimeout(clrLastPayloadFlag, 1002); //
			    current.state = state.WARNING;
			    lastPayload = node.payload;
			    node.log("Send yellow: " + lastPayload);
			    node.send(node);
			}
		    } // warn if there's a warn message
		} else { // warn if not in warn or timeout // yellow and green
		    // Timer running
		    if(current.state != state.WARNING) {
			node.status({
			    fill  : "green",
			    shape : "dot",
			    text  : "Counting: " + timedown // provide a visual countdown
			});

			node.payload = node.outsafe;

			//if ((current.state != state.COUNTDOWN) || (current.state != state.WARNING)) {
			//if ((current.state != state.COUNTDOWN) && (current.state != state.WARNING)) {
			if (current.state != state.COUNTDOWN) {
			    lastPayload = node.payload;
			    current.state = state.COUNTDOWN;
			    node.log("G TO: Send green: " + lastPayload);
			    node.send(node);
			}
		    }

		    timedown--;
		}
            } // this should be the
	}); // node.on()

	//
	var tick = setInterval(function() {
	    var msg = { payload:'TIMINGXX', topic:""};
	    node.emit("input", msg);
	}, 1000); // trigger every 1 sec

	node.on("close", function() {
	    if (tick) {
		clearInterval(tick);
	    }
	});

    } // function myTimeoutNode(n)
    RED.nodes.registerType("mytimeout", myTimeoutNode);
}


/*
8 Oct 22:58:48 - [info] [mytimeout:My Timeout] 5 TO: {"payload":"on","timer":20,"warning":15}
8 Oct 22:58:48 - [info] [mytimeout:My Timeout] 6 TO: ''='on'
8 Oct 22:58:48 - [info] [mytimeout:My Timeout]   TO: ''='{"payload":"on","timer":20,"warning":15}' object
8 Oct 22:58:48 - [info] [mytimeout:My Timeout] 7 TO: switch(on)
8 Oct 22:58:48 - [info] [mytimeout:My Timeout] 7aTO: 20, {"payload":"on","timer":20,"warning":15}
8 Oct 22:58:48 - [info] [mytimeout:My Timeout] 9 TO: timedown=20
8 Oct 22:58:48 - [info] [mytimeout:My Timeout]   TO: timeout =20
8 Oct 22:58:48 - [info] [mytimeout:My Timeout]   TO: state   =99
8 Oct 22:58:48 - [info] [mytimeout:My Timeout]   TO: warning =15
8 Oct 22:58:48 - [info] [mytimeout:My Timeout] G TO: Send green: on
8 Oct 22:58:48 - [info] [mytimeout:My Timeout] 4 TO: In == Out match, skip (on/on)



8 Oct 22:58:53 - [info] [mytimeout:My Timeout] Y TO: state = 0
8 Oct 22:58:53 - [info] [mytimeout:My Timeout] Send yellow: Warning
8 Oct 22:58:53 - [info] [mytimeout:My Timeout] 4 TO: In == Out match, skip (Warning/Warning)
8 Oct 22:59:08 - [info] [mytimeout:My Timeout] RaTO: state: (99) != 1(1/3/4/5)
8 Oct 22:59:08 - [info] [mytimeout:My Timeout] R TO: text:          Timed out (warning)
8 Oct 22:59:08 - [info] [mytimeout:My Timeout] Send red: off
8 Oct 22:59:08 - [info] [mytimeout:My Timeout] 4 TO: In == Out match, skip (off/off)

Hmm 2 seconds later, another off is sent

8 Oct 22:59:10 - [info] [mytimeout:My Timeout] 5 TO: off
8 Oct 22:59:10 - [info] [mytimeout:My Timeout] 6 TO: ''='off' string
8 Oct 22:59:10 - [info] [mytimeout:My Timeout] 7bTO: switch(off)
8 Oct 22:59:10 - [info] [mytimeout:My Timeout] s5TO: changing state: 2
8 Oct 22:59:10 - [info] [mytimeout:My Timeout] 7aTO: off, already timedown = 0

8 Oct 22:59:11 - [info] [mytimeout:My Timeout] RaTO: state: (99) != 2(1/3/4/5)
8 Oct 22:59:11 - [info] [mytimeout:My Timeout] R TO: text:          Timed out
8 Oct 22:59:11 - [info] [mytimeout:My Timeout] Send red: off
8 Oct 22:59:11 - [info] [mytimeout:My Timeout] 4 TO: In == Out match, skip (off/off)
*/

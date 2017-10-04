// Neil's modified version
// bash ~/dev/shell/nr-timeout-test.sh 2>&1 | tee /tmp/foo.njc
/*
Hmm huge problem

What I want is:

<topic A> ----- <[ mytimeout ]> ----- <topic A>

So an msg.payload="on" starts the timer. So will a 
msg.payload = '{ "payload": "on", "timer": 600, "warning": 60 }'
the issue is that if I send an "on" out to the same topic I get
a reset of the start of the time. Similar issue for "off", "stop"
and "cancel"

So how do we stop commands arriving as quickly as we send them?
Perhaps a timer? Wait n seconds before allowing the next?

Right now I'm experimenting with a lastPayload that is cleared with a timer.
I've set it for 1.002 seconds. I have no idea if this is a good idea or
not.

*/
module.exports = function(RED) {
    "use strict";
    
    function myTimeoutNode(n) {

	var timeout     = 30;
	var oldTimeout  = 30;
	var timedown    = 0;	// was 30
	var changed     = -1;
	var lastPayload = '';
	var dbgCount    = 0;`	// This is temporary to make sure we don't have a runaway process

	RED.nodes.createNode(this, n);

	var node = this;

	node.timer     = n.timer;
	node.warn      = n.warning;
	node.topic     = n.outtopic;
	node.outsafe   = n.outsafe;
	node.outwarn   = n.outwarning;
	node.outunsafe = n.outunsafe;
	node.repeat    = n.repeat;
	node.again     = n.again;
	node.atStart   = n.atStart;

	// This is currently cleared by a setTimeout
	// I really wonder if I need this, for now it stays
	function clrLastPayloadFlag() {
	    lastPayload = '';
	}

	if (node.timer!=0) {
	    timeout = parseInt(node.timer);
	    if(node.atStart) {
		timedown = parseInt(node.timer);
	    } else {
		changed = 1;
	    }
	}

	node.on(
	    "input",
	    function(inmsg) {
		if (inmsg.payload != "TIMINGXX") {
		    // Okay here's what I expect, user sends something (anything)
		    // node send node.outsafe,
		    // if node sees the exact string node.outstring just sent
		    // then drop it
		    // If the timer goes off then the lastPayload should be cleared
		    if((typeof(inmsg.payload) == 'string') && lastPayload == inmsg.payload) {
			lastPayload = '';
			return ;
		    }

		    // Temporary code until I'm done testing
		    // Limits runaway, if it occurs
		    if(dbgCount > 10) {
			if(inmsg.payload == 'clear') {
			    node.log("1 TO: dbgCount cleared");
			    dbgCount = 0;
			} else {
			    node.log("2 TO: dbgCount exceeded");
			}

			return ;
		    } else {
			dbgCount++;
		    }

		    // all other messages

		    // We're only concerned with inmsg.payload being 'on', 'off', 'stop, or 'cancel) (or are we?)
		    // more liklely node.outSafe, node.outwarning, node.outunsafe, 'stop', 'cancel'
		    node.log("3 TOa: " + dbgCount);
		    node.log("4 TOb: " + lastPayload);
		    //node.log("5 TOc: " + JSON.stringify(lastPayload));
		    node.log("6 TOd: " + inmsg.payload);

		    node.log("7 TOe: " + typeof(inmsg.payload));
		    /*
		      Send a 'stop' message
		      1 Oct 13:15:44 - [info] [timeout:30 Timeout] TO: string
		      1 Oct 13:15:44 - [info] [timeout:30 Timeout] TO: stop
		      Send a '{ "payload": "stop" }'
		      1 Oct 13:16:22 - [info] [timeout:30 Timeout] TO: string
		      1 Oct 13:16:22 - [info] [timeout:30 Timeout] TO: { "payload": "stop" }
		      Send a '{ "payload": "stop" }' thru a <[ JSON ]> node
		      1 Oct 13:20:13 - [info] [timeout:30 Timeout] TO: object
		     */
		    if(typeof(inmsg.payload) != 'object') {
			node.log("8 TO: " + inmsg.payload);

			// Okay at this point I want to take the existing inmsge.payload
			// '{ "payload": "...", ... }' // String
			// and parse it into inmsg.payload = { "payload": "...", ... } // object
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

		    // This provides support for "on"
		    if(inmsg.payload.payload != undefined) {
			// {
			//   "payload": "on",
			//   "timer":   nn,
			//   "warning": nn
			// }
			switch(inmsg.payload.payload) {
			    case 1:
			    case "1":
			    case "On":
			    case "on":
			        node.log("9 TO: " + inmsg.payload.timer)||node.timer;
			        oldTimeout = timeout;
			        // We need to check for a valid timer and warning value
			        timeout = timedown = inmsg.payload.timer||node.timer;
			        break;

			    case 0:
			    case "0":
			    case "Off":
			    case "off":
			        if(timedown == 0) {
				    changed = 1; // It's already stopped
			        }
			        // Turn it off right now
			        timedown = 0;
			        changed  = 0;
			        break;

			    case "Cancel":
			    case "cancel":
			        // Stop or cancel the whole thing (don't turn anything off)
			        timedown = 0;
			        changed  = 1; // causes nothing to be sent
			        break;

			    case "Stop":
			    case "stop":
			        // Stop or cancel the whole thing (don't turn anything off)
			        timedown = 0;
			        changed  = 3; // causes the stop message to be sent
			        break;

			    default:
			        // Oops, don't know what happened
			        node.log("A TO: unknown payload.paylaod" + inmsg.payload.payload);
			}
			if(isNaN(timedown)) { timeout = oldTimeout; }
		    } else {
			timedown = timeout;
		    }
		}

		if (timedown==0) {
		    node.status({
			fill  : "red",
			shape : "dot",
			text  : "Timeout!",
		    });

		    node.payload = node.outunsafe;
		    timeout = oldTimeout;
		    // @FIXME: We're not seeing the default timer reset to the UI setting
		    oldTimeout = node.timer;
		    
		    /*
		      1 Oct 16:03:09 - [info] [timeout:30 Timeout] TO: timeout=30
		      1 Oct 16:03:09 - [info] [timeout:30 Timeout] TO: timedown=0
		      1 Oct 16:03:09 - [info] [timeout:30 Timeout] TO: oldTimeout30
		      1 Oct 16:03:09 - [info] [timeout:30 Timeout] TO: node.timer=30

		    node.log("TO: timeout=" + timeout);
		    node.log("TO: timedown=" + timedown);
		    node.log("TO: oldTimeout" + oldTimeout);
		    node.log("TO: node.timer=" + node.timer);
		    */

		    if (changed==3) { node.payload = "STOP"; }
		    if ((changed!=1)||(node.repeat)) {
			changed = 1;
			lastPayload = node.payload;
			setTimeout(clrLastPayloadFlag, 1002); //
			node.send(node);
		    }
		    if (node.again) { timedown=timeout; changed=-1; }
		} else {
		    if ((timedown <= node.warn) && (node.outwarn!="")) {
			node.status({
			    fill  : "yellow",
			    shape : "dot",
			    text  : "Warning: " + timedown,
			});

			timedown--;
			node.payload = node.outwarn;

			if ((changed!=2)||(node.repeat)) {
			    changed=2;
			    setTimeout(clrLastPayloadFlag, 1002); //
			    lastPayload = node.payload;
			    node.send(node);
			}
		    } else {
			node.status({
			    fill  : "green",
			    shape : "dot",
			    text  : "Counting: " + timedown,
			});

			timedown--;
			node.payload = node.outsafe;

			if (((changed!==0)||(node.repeat)) && (node.outsafe!="")) {
			    changed=0;
			    setTimeout(clrLastPayloadFlag, 1002); //
			    lastPayload = node.payload;
			    node.send(node);
			}
		    }
		}
	    });

	var tick = setInterval(function() {
	    var msg = { payload:'TIMINGXX', topic:""};
	    node.emit("input", msg);
	}, 1000); // trigger every 1 sec

	node.on("close", function() {
	    
	    if (tick) {
		clearInterval(tick);
	    }
	});
    }
    RED.nodes.registerType("mytimeout", myTimeoutNode);
}

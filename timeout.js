// Neil's modified version
// bash ~/dev/shell/nr-timeout-test.sh 2>&1 | tee /tmp/foo.njc
module.exports = function(RED) {
    "use strict";

    
    function TimeoutNode(n) {

	var timeout=30;
	var oldTimeout = 30;
	var timedown=0; // was 30
	var changed=-1;
	
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
		    node.log("TO: " + typeof(inmsg.payload));
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
			node.log("TO: " + inmsg.payload);
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
			    case "on":
			        node.log("TO: " + inmsg.payload.timer)||node.timer;
			        oldTimeout = timeout;
			        // We need to check for a valid timer and warning value
			        timeout = timedown = inmsg.payload.timer||node.timer;
			        break;
			    case "off":
			        if(timedown == 0) {
				    changed = 1; // It's already stopped
			        }
			        // Turn it off right now
			        timedown = 0;
			        changed  = 0;
			        break;
			    case "cancel":
			    case "stop":
			        // Stop or cancel the whole thing (don't turn anything off)
			        timedown = 0;
			        //changed  = 1; //This says nothing
			        changed  = 3; // hopefully this will say stop
			        break;
			    default:
			        // Oops, don't know what happened
			        node.log("TO: unknown payload.paylaod" + inmsg.payload.payload);
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
		    if ((changed!=1)||(node.repeat)) { changed=1; node.send(node); }
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
    RED.nodes.registerType("timeout", TimeoutNode);
}

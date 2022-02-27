// -*- mode: js; js-indent-level: 2; -*- 
/*
*/
"use strict";

const should = require("should");
var   helper = require('node-red-node-test-helper');
var   myNode = require('../mytimeout.js');

helper.init(require.resolve('node-red'));

var nom =  'MyTimeout';

describe('* 0030 - Complex pause test case for mytimeout Node', function () {

  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    /* */
    helper.unload();
    helper.stopServer(done);
    /* */
  });
  /* */

  /* */
  // TC01 might work as a good example TC
  // 1. send on, timer starts
  // 2. wait n sec, then send pause, timer pauses
  // 3. wait n sec, then send pause, timer continues
  // 4. timer ends normally
  // 5. verify normal results
  // ===========================================================================================
  //
  it("TC01 - Should turn on/pause/suspend, Tx on/pause/suspend", function (done) { // ???
    //
    // setup n2.on() to get cmnds[]
    // setup n3.on() to get ticks[]
    // Send an on with n1.receive()
    // setup the timeout to process all cmnds[] and ticks[]
    // wait for 2 ticks (seconds) by using  n3.on() to count ticks and send the message
    // wait for the timeout, then process the results
    //
    //       /           \ -> n2 (cmnds[])
    // n1 -> [ mytimeout ]
    //       \           / -> n3 (ticks[])
    var testCase = "0001";
    var smsg = [];
    var nmsg = { payload: "on",    extra: 'extra1', testCase: testCase };
    var pmsg = { payload: "pause", extra: 'extra1', testCase: testCase };
    var umsg = { payload: "suspend", extra: 'extra1', testCase: testCase };

    var timeOutID = 0; // Do I really need these?
    var pauseID   = 0;

    var pause   = 2;
    var p       = 2;
    var timeOut = 7 + pause;

    var cmnds = [];
    var ticks = [];
    var s = 0;
    var t = 0;
    var c = 0;

    this.timeout((timeOut+2+6)*1000); // run timer for 30 plus 2 seconds overrun

    // 
    const On  = "on";
    const Off = "off";
    const Pause = "pause";

    var flow = [
      { id: "n1", type: "mytimeout", name: nom,
        outsafe: On,                  // If blank we should get no on msg
        outwarning: "warning",        // 
        outunsafe: Off,               // 
        timer: timeOut,               // 5 seconds
        warning: 2,                   // 2 seconds
        debug: "0",
        wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" },   // Output commands
      { id: "n3", type: "helper" }  /* Output state of ticks */
    ];

    helper.load(myNode, flow, function () {
      var fini = 0;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        msg.t = Date.now();
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)
      });

      n3.on("input", function (msg) {
        msg.t = Date.now();
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)
        if(t == 2) { // Wait for the second tick, then send another on
          n1.payload = '';
          pmsg.t = Date.now();
          console.log("Sent in n3 " + JSON.stringify(pmsg));
          n1.receive(pmsg);
          smsg[s++] = pmsg;
        }
      });

      nmsg.t = Date.now();
      console.log("Sent in n1 " + JSON.stringify(nmsg));
      n1.receive(nmsg);
      smsg[s++] = nmsg;

      //* */
      timeOutID = setTimeout(function() {
        umsg.t = Date.now();
        console.log("Sent in TO " + JSON.stringify(umsg));
        n1.receive(umsg);
        smsg[s++] = umsg;
      }, (p)*1000);
      
      timeOutID = setTimeout(function() {
        //
        // This is what we should get
        //
        try {
          try {
            //
            // cmnds check
            //
            cmnds.should.have.lengthOf(4);

            //
            cmnds[0].should.have.properties({"payload": On,        "extra": 'extra1', "testCase": testCase});
            cmnds[1].should.have.properties({"payload": "pause",   "extra": 'extra1', "testCase": testCase});
            cmnds[2].should.have.properties({"payload": "warning", "extra": 'extra1', "testCase": testCase});
            cmnds[3].should.have.properties({"payload": Off,       "extra": 'extra1', "testCase": testCase});
            // done();
          } catch(err) {
            console.log("Cmnds Err: " + err + " (" + timeOut + "/_)");

            throw(err);
          }

          try {
            //
            // ticks check
            //
            ticks.should.have.lengthOf(11, "Ooops ... "); // The second on causes 3 2 3 2 1 0 = 6 = 3 + 1 + 2

            // Okay this gets a bit complex
            /*
            // [
            //   { "payload": 9, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 8, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 7, "state": 3, "flag": "pause" },
            //   { "payload": 7, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 6, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 5, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 4, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 3, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 2, "state": 2, "flag": "warn >= ticks" },
            //   { "payload": 1, "state": 2, "flag": "warn >= ticks" },
            //   { "payload": 0, "state": 0, "flag": "off" }
            // ]
            var timeOutOrg = timeOut;
            ticks[0].should.have.properties({"payload":timeOut,"state":1,"flag":"ticks > 0"});      // 3 ticks
            --timeOut;
            ticks[1].should.have.properties({"payload":timeOut,"state":2,"flag":"warn >= ticks"});  // 2
            // just sent a new on
            timeOut = timeOutOrg;
            ticks[2].should.have.properties({"payload":timeOut,"state":1,"flag":"ticks > 0"});      // 3
            --timeOut;
            ticks[3].should.have.properties({"payload":timeOut,"state":2,"flag":"warn >= ticks"});  // 2
            --timeOut
            ticks[4].should.have.properties({"payload":timeOut,"state":2,"flag":"warn >= ticks"});  // 1
            --timeOut
            ticks[5].should.have.properties({"payload":timeOut,"state":0,"flag":"off"});            // 0
            */
            ticks[0].should.have.properties( { "payload": 9, "state": 1, "flag": "ticks > 0" });
            ticks[1].should.have.properties( { "payload": 8, "state": 1, "flag": "ticks > 0" });
            ticks[2].should.have.properties( { "payload": 7, "state": 3, "flag": "pause" });        // <- This is the anomaly
            ticks[3].should.have.properties( { "payload": 7, "state": 1, "flag": "ticks > 0" });
            ticks[4].should.have.properties( { "payload": 6, "state": 1, "flag": "ticks > 0" });
            ticks[5].should.have.properties( { "payload": 5, "state": 1, "flag": "ticks > 0" });
            ticks[6].should.have.properties( { "payload": 4, "state": 1, "flag": "ticks > 0" });
            ticks[7].should.have.properties( { "payload": 3, "state": 1, "flag": "ticks > 0" });
            ticks[8].should.have.properties( { "payload": 2, "state": 2, "flag": "warn >= ticks" });
            ticks[9].should.have.properties( { "payload": 1, "state": 2, "flag": "warn >= ticks" });
            ticks[10].should.have.properties({ "payload": 0, "state": 0, "flag": "off" });
            
            done();
          } catch(err) {
            console.log("Ticks Err: " + err);
            console.log("Sent:  " + JSON.stringify(smsg,  null, 2));
            console.log("Cmnds: " + JSON.stringify(cmnds, null, 2));
            console.log("Ticks: " + JSON.stringify(ticks, null, 2));

            throw(err);
          }
        } catch(err) {
          console.log("Cmnds Err: " + err + " (" + timeOut + "/_)");
          console.log("Sent:  " + JSON.stringify(smsg,  null, 2));
          console.log("Cmnds: " + JSON.stringify(cmnds, null, 2));
          console.log("Ticks: " + JSON.stringify(ticks, null, 2));          

          done(err);
        }
      }, (timeOut+2+1+1)*1000);
      // x = 0; y = 3; for(; x < 3; x++, y--) { console.log(`X = ${x}\nY = ${y}`); }
      /* */
    });
  });
  /* */

  /* */
  // TC01 might work as a good example TC
  // 1. send on, timer starts
  // 2. wait n sec, then send pause, timer pauses
  // 3. wait n sec, then send pause, timer continues
  // 4. timer ends normally
  // 5. verify normal results
  // ===========================================================================================
  //
  it("TC02 - Should turn on/pause/continue, Tx on/pause/continue", function (done) { // ???
    //
    // setup n2.on() to get cmnds[]
    // setup n3.on() to get ticks[]
    // Send an on with n1.receive()
    // setup the timeout to process all cmnds[] and ticks[]
    // wait for 2 ticks (seconds) by using  n3.on() to count ticks and send the message
    // wait for the timeout, then process the results
    //
    //       /           \ -> n2 (cmnds[])
    // n1 -> [ mytimeout ]
    //       \           / -> n3 (ticks[])
    var testCase = "0002";
    var smsg = [];
    var nmsg = { payload: "on",       extra: 'extra1', testCase: testCase };
    var pmsg = { payload: "pause",    extra: 'extra1', testCase: testCase };
    var umsg = { payload: "continue", extra: 'extra1', testCase: testCase };

    var timeOutID = 0; // Do I really need these?
    var pauseID   = 0;

    var pause   = 2;
    var p       = 2;
    var timeOut = 7 + pause;

    var cmnds = [];
    var ticks = [];
    var s = 0;
    var t = 0;
    var c = 0;

    this.timeout((timeOut+2+6)*1000); // run timer for 30 plus 2 seconds overrun

    // 
    const On  = "on";
    const Off = "off";
    const Pause = "pause";

    var flow = [
      { id: "n1", type: "mytimeout", name: nom,
        outsafe: On,                  // If blank we should get no on msg
        outwarning: "warning",        // 
        outunsafe: Off,               // 
        timer: timeOut,               // 5 seconds
        warning: 2,                   // 2 seconds
        debug: "0",
        wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" },   // Output commands
      { id: "n3", type: "helper" }  /* Output state of ticks */
    ];

    helper.load(myNode, flow, function () {
      var fini = 0;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        msg.t = Date.now();
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)
      });

      n3.on("input", function (msg) {
        msg.t = Date.now();
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)
        if(t == 2) { // Wait for the second tick, then send another on
          n1.payload = '';
          pmsg.t = Date.now();
          console.log("Sent in n3 " + JSON.stringify(pmsg));
          n1.receive(pmsg);
          smsg[s++] = pmsg;
        }
      });

      nmsg.t = Date.now();
      console.log("Sent in n1 " + JSON.stringify(nmsg));
      n1.receive(nmsg);
      smsg[s++] = nmsg;

      //* */
      timeOutID = setTimeout(function() {
        umsg.t = Date.now();
        console.log("Sent in TO " + JSON.stringify(umsg));
        n1.receive(umsg);
        smsg[s++] = umsg;
      }, (p)*1000);
      
      timeOutID = setTimeout(function() {
        //
        // This is what we should get
        //
        try {
          try {
            //
            // cmnds check
            //
            cmnds.should.have.lengthOf(4);

            //
            cmnds[0].should.have.properties({"payload": On,        "extra": 'extra1', "testCase": testCase});
            cmnds[1].should.have.properties({"payload": "pause",   "extra": 'extra1', "testCase": testCase});
            cmnds[2].should.have.properties({"payload": "warning", "extra": 'extra1', "testCase": testCase});
            cmnds[3].should.have.properties({"payload": Off,       "extra": 'extra1', "testCase": testCase});
            // done();
          } catch(err) {
            console.log("Cmnds Err: " + err + " (" + timeOut + "/_)");

            throw(err);
          }

          try {
            //
            // ticks check
            //
            ticks.should.have.lengthOf(11, "Ooops ... "); // The second on causes 3 2 3 2 1 0 = 6 = 3 + 1 + 2

            // Okay this gets a bit complex
            /*
            // [
            //   { "payload": 9, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 8, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 7, "state": 3, "flag": "pause" },
            //   { "payload": 7, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 6, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 5, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 4, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 3, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 2, "state": 2, "flag": "warn >= ticks" },
            //   { "payload": 1, "state": 2, "flag": "warn >= ticks" },
            //   { "payload": 0, "state": 0, "flag": "off" }
            // ]
            var timeOutOrg = timeOut;
            ticks[0].should.have.properties({"payload":timeOut,"state":1,"flag":"ticks > 0"});      // 3 ticks
            --timeOut;
            ticks[1].should.have.properties({"payload":timeOut,"state":2,"flag":"warn >= ticks"});  // 2
            // just sent a new on
            timeOut = timeOutOrg;
            ticks[2].should.have.properties({"payload":timeOut,"state":1,"flag":"ticks > 0"});      // 3
            --timeOut;
            ticks[3].should.have.properties({"payload":timeOut,"state":2,"flag":"warn >= ticks"});  // 2
            --timeOut
            ticks[4].should.have.properties({"payload":timeOut,"state":2,"flag":"warn >= ticks"});  // 1
            --timeOut
            ticks[5].should.have.properties({"payload":timeOut,"state":0,"flag":"off"});            // 0
            */
            ticks[0].should.have.properties( { "payload": 9, "state": 1, "flag": "ticks > 0" });
            ticks[1].should.have.properties( { "payload": 8, "state": 1, "flag": "ticks > 0" });
            ticks[2].should.have.properties( { "payload": 7, "state": 3, "flag": "pause" });        // <- This is the anomaly
            ticks[3].should.have.properties( { "payload": 7, "state": 1, "flag": "ticks > 0" });
            ticks[4].should.have.properties( { "payload": 6, "state": 1, "flag": "ticks > 0" });
            ticks[5].should.have.properties( { "payload": 5, "state": 1, "flag": "ticks > 0" });
            ticks[6].should.have.properties( { "payload": 4, "state": 1, "flag": "ticks > 0" });
            ticks[7].should.have.properties( { "payload": 3, "state": 1, "flag": "ticks > 0" });
            ticks[8].should.have.properties( { "payload": 2, "state": 2, "flag": "warn >= ticks" });
            ticks[9].should.have.properties( { "payload": 1, "state": 2, "flag": "warn >= ticks" });
            ticks[10].should.have.properties({ "payload": 0, "state": 0, "flag": "off" });
            
            done();
          } catch(err) {
            console.log("Ticks Err: " + err);
            console.log("Sent:  " + JSON.stringify(smsg,  null, 2));
            console.log("Cmnds: " + JSON.stringify(cmnds, null, 2));
            console.log("Ticks: " + JSON.stringify(ticks, null, 2));

            throw(err);
          }
        } catch(err) {
          console.log("Cmnds Err: " + err + " (" + timeOut + "/_)");
          console.log("Sent:  " + JSON.stringify(smsg,  null, 2));
          console.log("Cmnds: " + JSON.stringify(cmnds, null, 2));
          console.log("Ticks: " + JSON.stringify(ticks, null, 2));          

          done(err);
        }
      }, (timeOut+2+1+1)*1000);
    });
  });
  /* */

  /* */
  // TC01 might work as a good example TC
  // 1. send on, timer starts
  // 2. wait n sec, then send pause, timer pauses
  // 3. wait n sec, then send pause, timer continues
  // 4. timer ends normally
  // 5. verify normal results
  // ===========================================================================================
  //
  it("TC03 - Should turn on/pause/pause, Tx on/pause x2", function (done) { // ???
    //
    // setup n2.on() to get cmnds[]
    // setup n3.on() to get ticks[]
    // Send an on with n1.receive()
    // setup the timeout to process all cmnds[] and ticks[]
    // wait for 2 ticks (seconds) by using  n3.on() to count ticks and send the message
    // wait for the timeout, then process the results
    //
    //       /           \ -> n2 (cmnds[])
    // n1 -> [ mytimeout ]
    //       \           / -> n3 (ticks[])
    var testCase = "0003";
    var smsg = [];
    var nmsg = { payload: "on",    extra: 'extra1', testCase: testCase };
    var pmsg = { payload: "pause", extra: 'extra1', testCase: testCase };
    var umsg = { payload: "pause", extra: 'extra1', testCase: testCase };

    var timeOutID = 0; // Do I really need these?
    var pauseID   = 0;

    var pause   = 2;
    var p       = 2;
    var timeOut = 7 + pause;

    var cmnds = [];
    var ticks = [];
    var s = 0;
    var t = 0;
    var c = 0;

    this.timeout((timeOut+2+6)*1000); // run timer for 30 plus 2 seconds overrun

    // 
    const On  = "on";
    const Off = "off";
    const Pause = "pause";

    var flow = [
      { id: "n1", type: "mytimeout", name: nom,
        outsafe: On,                  // If blank we should get no on msg
        outwarning: "warning",        // 
        outunsafe: Off,               // 
        timer: timeOut,               // 5 seconds
        warning: 2,                   // 2 seconds
        debug: "0",
        wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" },   // Output commands
      { id: "n3", type: "helper" }  /* Output state of ticks */
    ];

    helper.load(myNode, flow, function () {
      var fini = 0;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        msg.t = Date.now();
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)
      });

      n3.on("input", function (msg) {
        msg.t = Date.now();
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)
        if(t == 2) { // Wait for the second tick, then send another on
          n1.payload = '';
          pmsg.t = Date.now();
          console.log("Sent in n3 " + JSON.stringify(pmsg));
          n1.receive(pmsg);
          smsg[s++] = pmsg;
        }
      });

      nmsg.t = Date.now();
      console.log("Sent in n1 " + JSON.stringify(nmsg));
      n1.receive(nmsg);
      smsg[s++] = nmsg;

      //* */
      timeOutID = setTimeout(function() {
        umsg.t = Date.now();
        console.log("Sent in TO " + JSON.stringify(umsg));
        n1.receive(umsg);
        smsg[s++] = umsg;
      }, (p)*1000);
      
      timeOutID = setTimeout(function() {
        //
        // This is what we should get
        //
        try {
          try {
            //
            // cmnds check
            //
            cmnds.should.have.lengthOf(4);

            //
            cmnds[0].should.have.properties({"payload": On,        "extra": 'extra1', "testCase": testCase});
            cmnds[1].should.have.properties({"payload": "pause",   "extra": 'extra1', "testCase": testCase});
            cmnds[2].should.have.properties({"payload": "warning", "extra": 'extra1', "testCase": testCase});
            cmnds[3].should.have.properties({"payload": Off,       "extra": 'extra1', "testCase": testCase});
            // done();
          } catch(err) {
            console.log("Cmnds Err: " + err + " (" + timeOut + "/_)");

            throw(err);
          }

          try {
            //
            // ticks check
            //
            ticks.should.have.lengthOf(11, "Ooops ... "); // The second on causes 3 2 3 2 1 0 = 6 = 3 + 1 + 2

            // Okay this gets a bit complex
            /*
            // [
            //   { "payload": 9, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 8, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 7, "state": 3, "flag": "pause" },
            //   { "payload": 7, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 6, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 5, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 4, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 3, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 2, "state": 2, "flag": "warn >= ticks" },
            //   { "payload": 1, "state": 2, "flag": "warn >= ticks" },
            //   { "payload": 0, "state": 0, "flag": "off" }
            // ]
            var timeOutOrg = timeOut;
            ticks[0].should.have.properties({"payload":timeOut,"state":1,"flag":"ticks > 0"});      // 3 ticks
            --timeOut;
            ticks[1].should.have.properties({"payload":timeOut,"state":2,"flag":"warn >= ticks"});  // 2
            // just sent a new on
            timeOut = timeOutOrg;
            ticks[2].should.have.properties({"payload":timeOut,"state":1,"flag":"ticks > 0"});      // 3
            --timeOut;
            ticks[3].should.have.properties({"payload":timeOut,"state":2,"flag":"warn >= ticks"});  // 2
            --timeOut
            ticks[4].should.have.properties({"payload":timeOut,"state":2,"flag":"warn >= ticks"});  // 1
            --timeOut
            ticks[5].should.have.properties({"payload":timeOut,"state":0,"flag":"off"});            // 0
            */
            ticks[0].should.have.properties( { "payload": 9, "state": 1, "flag": "ticks > 0" });
            ticks[1].should.have.properties( { "payload": 8, "state": 1, "flag": "ticks > 0" });
            ticks[2].should.have.properties( { "payload": 7, "state": 3, "flag": "pause" });        // <- This is the anomaly
            ticks[3].should.have.properties( { "payload": 7, "state": 1, "flag": "ticks > 0" });
            ticks[4].should.have.properties( { "payload": 6, "state": 1, "flag": "ticks > 0" });
            ticks[5].should.have.properties( { "payload": 5, "state": 1, "flag": "ticks > 0" });
            ticks[6].should.have.properties( { "payload": 4, "state": 1, "flag": "ticks > 0" });
            ticks[7].should.have.properties( { "payload": 3, "state": 1, "flag": "ticks > 0" });
            ticks[8].should.have.properties( { "payload": 2, "state": 2, "flag": "warn >= ticks" });
            ticks[9].should.have.properties( { "payload": 1, "state": 2, "flag": "warn >= ticks" });
            ticks[10].should.have.properties({ "payload": 0, "state": 0, "flag": "off" });
            
            done();
          } catch(err) {
            console.log("Ticks Err: " + err);
            console.log("Sent:  " + JSON.stringify(smsg,  null, 2));
            console.log("Cmnds: " + JSON.stringify(cmnds, null, 2));
            console.log("Ticks: " + JSON.stringify(ticks, null, 2));

            throw(err);
          }
        } catch(err) {
          console.log("Cmnds Err: " + err + " (" + timeOut + "/_)");
          console.log("Sent:  " + JSON.stringify(smsg,  null, 2));
          console.log("Cmnds: " + JSON.stringify(cmnds, null, 2));
          console.log("Ticks: " + JSON.stringify(ticks, null, 2));          

          done(err);
        }
      }, (timeOut+2+1+1)*1000);
      // x = 0; y = 3; for(; x < 3; x++, y--) { console.log(`X = ${x}\nY = ${y}`); }
      /* */
    });
  });
  /* */

  /* */
  // TC04 might work as a good example TC
  // 1. send on, timer starts
  // 2. wait n sec, then send pause, timer pauses
  // 3. wait n sec, then send pause, timer continues
  // 4. timer ends normally
  // 5. verify normal results
  // ===========================================================================================
  //
  it("TC04 - Should turn on/suspend/suspend, Tx on/suspend x2", function (done) { // ???
    //
    // setup n2.on() to get cmnds[]
    // setup n3.on() to get ticks[]
    // Send an on with n1.receive()
    // setup the timeout to process all cmnds[] and ticks[]
    // wait for 2 ticks (seconds) by using  n3.on() to count ticks and send the message
    // wait for the timeout, then process the results
    //
    //       /           \ -> n2 (cmnds[])
    // n1 -> [ mytimeout ]
    //       \           / -> n3 (ticks[])
    var testCase = "0004";
    var smsg = [];
    var nmsg = { payload: "on",      extra: 'extra1', testCase: testCase };
    var pmsg = { payload: "suspend", extra: 'extra1', testCase: testCase };
    var umsg = { payload: "suspend", extra: 'extra1', testCase: testCase };

    var timeOutID = 0; // Do I really need these?
    var pauseID   = 0;

    var pause   = 2;
    var p       = 2;
    var timeOut = 7 + pause;

    var cmnds = [];
    var ticks = [];
    var s = 0;
    var t = 0;
    var c = 0;

    this.timeout((timeOut+2+6)*1000); // run timer for 30 plus 2 seconds overrun

    // 
    const On  = "on";
    const Off = "off";
    const Pause = "pause";

    var flow = [
      { id: "n1", type: "mytimeout", name: nom,
        outsafe: On,                  // If blank we should get no on msg
        outwarning: "warning",        // 
        outunsafe: Off,               // 
        timer: timeOut,               // 5 seconds
        warning: 2,                   // 2 seconds
        debug: "0",
        wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" },   // Output commands
      { id: "n3", type: "helper" }  /* Output state of ticks */
    ];

    helper.load(myNode, flow, function () {
      var fini = 0;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        msg.t = Date.now();
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)
      });

      n3.on("input", function (msg) {
        msg.t = Date.now();
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)
        if(t == 2) { // Wait for the second tick, then send another on
          n1.payload = '';
          pmsg.t = Date.now();
          console.log("Sent in n3 " + JSON.stringify(pmsg));
          n1.receive(pmsg);
          smsg[s++] = pmsg;
        }
      });

      nmsg.t = Date.now();
      console.log("Sent in n1 " + JSON.stringify(nmsg));
      n1.receive(nmsg);
      smsg[s++] = nmsg;

      //* */
      timeOutID = setTimeout(function() {
        umsg.t = Date.now();
        console.log("Sent in TO " + JSON.stringify(umsg));
        n1.receive(umsg);
        smsg[s++] = umsg;
      }, (p)*1000);
      
      timeOutID = setTimeout(function() {
        //
        // This is what we should get
        //
        try {
          try {
            //
            // cmnds check
            //
            cmnds.should.have.lengthOf(4);

            //
            cmnds[0].should.have.properties({"payload": On,        "extra": 'extra1', "testCase": testCase});
            cmnds[1].should.have.properties({"payload": "pause",   "extra": 'extra1', "testCase": testCase});
            cmnds[2].should.have.properties({"payload": "warning", "extra": 'extra1', "testCase": testCase});
            cmnds[3].should.have.properties({"payload": Off,       "extra": 'extra1', "testCase": testCase});
            // done();
          } catch(err) {
            console.log("Cmnds Err: " + err + " (" + timeOut + "/_)");

            throw(err);
          }

          try {
            //
            // ticks check
            //
            ticks.should.have.lengthOf(11, "Ooops ... "); // The second on causes 3 2 3 2 1 0 = 6 = 3 + 1 + 2

            // Okay this gets a bit complex
            /*
            // [
            //   { "payload": 9, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 8, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 7, "state": 3, "flag": "pause" },
            //   { "payload": 7, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 6, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 5, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 4, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 3, "state": 1, "flag": "ticks > 0" },
            //   { "payload": 2, "state": 2, "flag": "warn >= ticks" },
            //   { "payload": 1, "state": 2, "flag": "warn >= ticks" },
            //   { "payload": 0, "state": 0, "flag": "off" }
            // ]
            var timeOutOrg = timeOut;
            ticks[0].should.have.properties({"payload":timeOut,"state":1,"flag":"ticks > 0"});      // 3 ticks
            --timeOut;
            ticks[1].should.have.properties({"payload":timeOut,"state":2,"flag":"warn >= ticks"});  // 2
            // just sent a new on
            timeOut = timeOutOrg;
            ticks[2].should.have.properties({"payload":timeOut,"state":1,"flag":"ticks > 0"});      // 3
            --timeOut;
            ticks[3].should.have.properties({"payload":timeOut,"state":2,"flag":"warn >= ticks"});  // 2
            --timeOut
            ticks[4].should.have.properties({"payload":timeOut,"state":2,"flag":"warn >= ticks"});  // 1
            --timeOut
            ticks[5].should.have.properties({"payload":timeOut,"state":0,"flag":"off"});            // 0
            */
            ticks[0].should.have.properties( { "payload": 9, "state": 1, "flag": "ticks > 0" });
            ticks[1].should.have.properties( { "payload": 8, "state": 1, "flag": "ticks > 0" });
            ticks[2].should.have.properties( { "payload": 7, "state": 3, "flag": "pause" });        // <- This is the anomaly
            ticks[3].should.have.properties( { "payload": 7, "state": 1, "flag": "ticks > 0" });
            ticks[4].should.have.properties( { "payload": 6, "state": 1, "flag": "ticks > 0" });
            ticks[5].should.have.properties( { "payload": 5, "state": 1, "flag": "ticks > 0" });
            ticks[6].should.have.properties( { "payload": 4, "state": 1, "flag": "ticks > 0" });
            ticks[7].should.have.properties( { "payload": 3, "state": 1, "flag": "ticks > 0" });
            ticks[8].should.have.properties( { "payload": 2, "state": 2, "flag": "warn >= ticks" });
            ticks[9].should.have.properties( { "payload": 1, "state": 2, "flag": "warn >= ticks" });
            ticks[10].should.have.properties({ "payload": 0, "state": 0, "flag": "off" });
            
            done();
          } catch(err) {
            console.log("Ticks Err: " + err);
            console.log("Sent:  " + JSON.stringify(smsg,  null, 2));
            console.log("Cmnds: " + JSON.stringify(cmnds, null, 2));
            console.log("Ticks: " + JSON.stringify(ticks, null, 2));

            throw(err);
          }
        } catch(err) {
          console.log("Cmnds Err: " + err + " (" + timeOut + "/_)");
          console.log("Sent:  " + JSON.stringify(smsg,  null, 2));
          console.log("Cmnds: " + JSON.stringify(cmnds, null, 2));
          console.log("Ticks: " + JSON.stringify(ticks, null, 2));          

          done(err);
        }
      }, (timeOut+2+1+1)*1000);
      // x = 0; y = 3; for(; x < 3; x++, y--) { console.log(`X = ${x}\nY = ${y}`); }
      /* */
    });
  });
  /* */
});


// -*- mode: js; js-indent-level: 2; -*- 
/*
*/
"use strict";

const should = require("should");
var   helper = require('node-red-node-test-helper');
var   myNode = require('../mytimeout.js');

helper.init(require.resolve('node-red'));

var nom =  'MyTimeout';

describe('* 0000 - Basic mytimeout Node', function () {

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

  //
  // ===========================================================================================
  //
  it('TC00 - should be loaded', function (done) {
    // select in node-red editor the node to test, then hamburger, then export, then copy to clipboard, then paste here:
    /* */
    var flow1 = [{
      "id":         'n1', // was"abf332d4.4e",
      "type":       "mytimeout",
      "z":          "b431bcd1.51942",
      "name":       nom,
      "outtopic":   "",
      "outsafe":    "on",
      "outwarning": "Warning",
      "outunsafe":  "off",
      "warning":    "5",        // ??? shouldn't this be warning
      "timer":      "30",
      "debug":      false,
      "ndebug":     false,
      "ignoreCase": false,
      "repeat":     false,
      "again":      false,
      "x":          600,
      "y":          840,
      "wires":[
        ["ba562635.2144c8","6b9eec06.608274"],
        ["2b13443d.b2b27c","e1f06422.544ee8"]
      ]
    }];
    /* */

    var flow = [{ id: "n1", type: "mytimeout", name: nom }];
    // 
    helper.load(myNode, flow, function () {
      var n1 = helper.getNode("n1");


      try {
        // Default flow (with no config) doesn't set the outsafe value (so we don't send the on-msg when payload is blank)
        n1.should.have.properties({
          "name":      nom,
          "outunsafe": "off",
          "timer":     30,   // Defaults
          "warning":   5     // Defaults
        });
        done();
      } catch(err) {
        done(err);
      }
    });
  });
  /* */
  
  // sleep 3; mosquitto_pub -t 'home/test/mytimeout' -m '{"payload": "on", "timeout": 2, "warning": 1, testCase: "0101" }'
  /* */
  //
  // ===========================================================================================
  //
  it('TC01 - timed on, minimal time (2/1), TX on', function (done) {
    var testCase = "0001";
    
    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    var timeout = 2;
    var warn    = 1;

    this.timeout(10*1000); // run timer for timeOut plus 2 seconds overrun

    var flow = [
      { id: "n1", type: "mytimeout",
        name:       "myTimeout",
        timer:      5,
        warning:    2,
        outsafe:    "on",
        outwarning: "warning",
        outunsafe:  "off",
        qos:        0,
        retain:     false,
        topic:      "",
        wires:      [["n2"], ["n3"]] },
      { id: "n2", type: "helper" },
      { id: "n3", type: "helper" }
    ];

    helper.load(myNode, flow, function() {
      var timeOutID;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Okay the fini++ seems like a good idea but if I get 2 n2 or 2 n3 I might gets a false done
      n2.on("input", function (msg) {
        msg.t = Date.now();
        cmnds[c++] = JSON.parse(JSON.stringify(msg));
        //
        // Just collect the inputs. This time we'll get on/warning/off
        //
        
      });

      n3.on("input", function (msg) {
        msg.t = Date.now();
        ticks[t++] = JSON.parse(JSON.stringify(msg));
        //
        //  Just collect the inputs.
        //
      });
      
      var nmsg = { payload: "on", timeout: timeout, warning: warn, testCase: testCase};
      n1.receive( nmsg );

      //
      // ---------------------------------------------------------------------------------------
      // Timer
      //
      timeOutID = setTimeout(function() {
        //
        // This is what we should get
        //
        try {
          // Now check the cmnds
          cmnds.should.have.lengthOf((3));

          cmnds[0].should.have.properties({"payload": "on",      "timeout": timeout, warning: warn, testCase: testCase});
          cmnds[1].should.have.properties({"payload": "warning", "timeout": timeout, warning: warn, testCase: testCase});
          cmnds[2].should.have.properties({"payload": "off",     "timeout": timeout, warning: warn, testCase: testCase});

          // Now check the ticks
          ticks.should.have.lengthOf(timeout+1);

          ticks[0].should.have.properties({"payload":timeout,"state":1,"flag":"ticks > 0"});
          --timeout;
          ticks[1].should.have.properties({"payload":timeout,"state":2,"flag":"warn >= ticks"});
          --timeout;
          ticks[2].should.have.properties({"payload":timeout,"state":0,"flag":"off"});

          done();
        } catch(err) {
          console.log(`Cmnds Err: ${err} (${timeout}/${warn})`);
          console.log("Sent:  " + JSON.stringify(nmsg));
          console.log("Cmnds: " + JSON.stringify(cmnds));
          console.log("Ticks: " + JSON.stringify(ticks));          
          done(err);
        }
      }, (timeout+2)*1000);
    });
  });
  /* */

  /* */
  //
  // ===========================================================================================
  //
  it("TC02 - stop, should be timed, TX stop", function (done) {
    var testCase = "0002";
    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    var timeOut = 2;

    this.timeout(7*1000); // run timer for timeOut plus 2 seconds overrun

    var flow = [
      { id: "n1", type: "mytimeout", name: nom, timer:timeOut, warning:1, outusafe:"on", outunsafe:"off", wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" },
      { id: "n3", type: "helper" }
    ];

    helper.load(myNode, flow, function() {
      var timeOutID;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      n2.on("input", function (msg) {
        msg.t = Date.now();
        cmnds[c++] = JSON.parse(JSON.stringify(msg));
      });

      n3.on("input", function (msg) {
        msg.t = Date.now();
        ticks[t++] = JSON.parse(JSON.stringify(msg));
      });

      n1.receive({ payload: "stop", testCase: testCase });

      timeOutID = setTimeout(function() {
        //
        // This is what we should get
        //
        try {
          cmnds.should.have.lengthOf(0);
          ticks.should.have.lengthOf(0);

          done();
        } catch(err) {
          console.log("\tCmnds Err: " + err);
          console.log("Cmnds: " + JSON.stringify(cmnds));
          console.log("Ticks: " + JSON.stringify(ticks));          
          done(err);
        }
      }, (timeOut)*1000);
    });
  });
  /* */

  /* */
  //
  // ===========================================================================================
  //
  it("TC03 - cancel, should be timed, TX cancel", function (done) {
    var testCase = "0003";
    
    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    var timeout = 2;

    this.timeout(7*1000); // run timer for timeOut plus 2 seconds overrun

    var flow = [
      { id: "n1", type: "mytimeout", name: nom, timer:2, warning:1, outusafe:"on", outwarning: "warning", outunsafe:"off", wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" },
      { id: "n3", type: "helper" }
    ];

    helper.load(myNode, flow, function() {
      var timeOutID;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      n2.on("input", function (msg) {
        msg.t = Date.now();
        cmnds[c++] = JSON.parse(JSON.stringify(msg));
      });

      n3.on("input", function (msg) {
        msg.t = Date.now();
        ticks[t++] = JSON.parse(JSON.stringify(msg));
      });

      n1.receive({ payload: "cancel", testCase: testCase });

      timeOutID = setTimeout(function() {
        //
        // This is what we should get
        //
        try {
          cmnds.should.have.lengthOf(0);
          ticks.should.have.lengthOf(0);

          done();
        } catch(err) {
          console.log("Cmnds Err: " + err);
          console.log("Cmnds: " + JSON.stringify(cmnds));
          console.log("Ticks: " + JSON.stringify(ticks));          

          done(err);
        }
      }, (timeout)*1000);
    });
  });
  /* */

  /* */
  //
  // ===========================================================================================
  //
  it(`TC04 - Test with empty payload "" and no warning msg, TX ""`, function (done) {
    /*
      Setup:  outwarning: "" everything the defaults
      msg:    payload:    "" and testCase
      Result: cmnds: only off, ticks: on, ticks and off no warning
    */
    var testCase = "0004";
    var nmsg = { payload: "", testCase: testCase};

    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    var timeout = 2;

    this.timeout(7*1000); // run timer for timeOut plus 2 seconds overrun

    var flow = [
      { id: "n1", type: "mytimeout",
        name:       "myTimeout",
        outsafe:    "on", /* If blank we should get no on msg */
        outwarning: "",
        outunsafe:  "off",
        timer:      2,
        warning:    1,
        wires:      [["n2"], ["n3"]] },
      { id: "n2", type: "helper" },
      { id: "n3", type: "helper" }
    ];

    helper.load(myNode, flow, function() {
      var timeOutID;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      n2.on("input", function (msg) {
        msg.t = Date.now();
        cmnds[c++] = JSON.parse(JSON.stringify(msg));
      });

      n3.on("input", function (msg) {
        msg.t = Date.now();
        ticks[t++] = JSON.parse(JSON.stringify(msg));
      });

      //
      //
      //
      n1.receive(nmsg);

      //
      //
      //
      timeOutID = setTimeout(function() {
        //
        // This is what we should get
        //
        try {
          //
          //
          //
          cmnds.should.have.lengthOf(1);

          cmnds[0].should.have.properties({"payload": "off", testCase: testCase});

          //
          //
          //
          ticks.should.have.lengthOf(timeout+1);

          ticks[0].should.have.properties({"payload": timeout,"state": 1, flag: "ticks > 0"});
          --timeout;
          ticks[1].should.have.properties({"payload": timeout,"state": 1, flag: "ticks > 0"});
          --timeout;
          ticks[2].should.have.properties({"payload": timeout,"state": 0, flag: "off"});

          done();
        } catch(err) {
          console.log("Cmnds Err: " + err);
          console.log("Sent:  " + JSON.stringify(nmsg));
          console.log("Cmnds: " + JSON.stringify(cmnds));
          console.log("Ticks: " + JSON.stringify(ticks));          

          done(err);
        }
      }, (timeout+2)*1000);
    });
  });
  /* */

  /* */
  //
  // ===========================================================================================
  //
  it("TC05 - Should turn off, Tx off", function (done) { // Passes
    /*
      Setup:  everything the defaults
      msg:    payload:    "" and testCase
      Result: cmnds: only off, ticks: on, ticks and off no warning
    */
    var testCase = "0005";
    var nmsg = { payload: "off", testCase: testCase};

    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    var timeout = 2;

    this.timeout(5*1000); // run timer for timeOut plus 2 seconds overrun

    var flow = [
      { id: "n1", type: "mytimeout",
        name:       "myTimeout",
        outsafe:    "on", /* If blank we should get no on msg */
        outwarning: "warning",
        outunsafe:  "off",
        timer:      2,
        warning:    1,
        wires:      [["n2"], ["n3"]] },
      { id: "n2", type: "helper" },
      { id: "n3", type: "helper" }
    ];

    helper.load(myNode, flow, function() {
      var timeOutID;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      n2.on("input", function (msg) {
        msg.t = Date.now();
        cmnds[c++] = JSON.parse(JSON.stringify(msg));
      });

      n3.on("input", function (msg) {
        msg.t = Date.now();
        ticks[t++] = JSON.parse(JSON.stringify(msg));
      });

      //
      //
      //
      n1.receive(nmsg);

      //
      //
      //
      timeOutID = setTimeout(function() {
        //
        // This is what we should get
        //
        try {
          //
          //
          //
          cmnds.should.have.lengthOf(1);

          cmnds[0].should.have.properties({"payload": "off", testCase: testCase});

          //
          //
          //
          ticks.should.have.lengthOf(1);

          ticks[0].should.have.properties({"payload": 0,"state": 0, flag: "off"});

          done();
        } catch(err) {
          console.log("Cmnds Err: " + err);
          console.log("Sent:  " + JSON.stringify(nmsg));
          console.log("Cmnds: " + JSON.stringify(cmnds));
          console.log("Ticks: " + JSON.stringify(ticks));          

          done(err);
        }
      }, (timeout)*1000);
    });
  });
  /* */

  /* */
  //
  // ===========================================================================================
  //
  it("TC06 - Should turn off, Tx 0", function (done) {
    var testCase = "0006";
    /*
      Setup:  everything the defaults
      msg:    payload:    "" and testCase
      Result: cmnds: only off, ticks: on, ticks and off no warning
    */
    var nmsg = { payload: 0, testCase: testCase};

    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    var timeout = 2;

    this.timeout(5*1000); // run timer for timeOut plus 2 seconds overrun

    var flow = [
      { id: "n1", type: "mytimeout",
        name:       "myTimeout",
        outsafe:    "on", /* If blank we should get no on msg */
        outwarning: "warning",
        outunsafe:  "off",
        timer:      2,
        warning:    1,
        wires:      [["n2"], ["n3"]] },
      { id: "n2", type: "helper" },
      { id: "n3", type: "helper" }
    ];

    helper.load(myNode, flow, function() {
      var timeOutID;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      n2.on("input", function (msg) {
        msg.t = Date.now();
        cmnds[c++] = JSON.parse(JSON.stringify(msg));
      });

      n3.on("input", function (msg) {
        msg.t = Date.now();
        ticks[t++] = JSON.parse(JSON.stringify(msg));
      });

      //
      //
      //
      n1.receive(nmsg);

      //
      //
      //
      timeOutID = setTimeout(function() {
        //
        // This is what we should get
        //
        try {
          //
          //
          //
          cmnds.should.have.lengthOf(1);

          cmnds[0].should.have.properties({"payload": "off", testCase: testCase});

          //
          //
          //
          ticks.should.have.lengthOf(1);

          ticks[0].should.have.properties({"payload": 0,"state": 0, flag: "off"});

          done();
        } catch(err) {
          console.log("Cmnds Err: " + err);
          console.log("Sent:  " + JSON.stringify(nmsg));
          console.log("Cmnds: " + JSON.stringify(cmnds));
          console.log("Ticks: " + JSON.stringify(ticks));          

          done(err);
        }
      }, (timeout)*1000);
    });
  });
  /* */

  /* */
  //
  // ===========================================================================================
  //
  it(`TC06 - Should turn off, Tx "0"`, function (done) {
    var testCase = "0006";
    var nmsg = { payload: "0", testCase: testCase };

    var timeOut = 3;
    var warn    = 2;

    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    this.timeout(10*1000); // Make sure this is longer than the actual timer

    const On  = "on";
    const Off = "off";

    var flow = [
      { id: "n1", type: "mytimeout",
        name:       "myTimeout",
        timer:      timeOut,
        warning:    warn,
        outsafe:    "on",
        outwarning: "warning",
        outunsafe:  "off",
        wires:      [["n2"], ["n3"]] },
      { id: "n2", type: "helper" },
      { id: "n3", type: "helper" }
    ];

    helper.load(myNode, flow, function () {
      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      n2.on("input", function (msg) {
        msg.t = Date.now();
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)
      });

      n3.on("input", function (msg) {
        msg.t = Date.now();
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)
      });

      n1.receive( nmsg );

      timeOutID = setTimeout(function() {
        //
        // This is what we should get
        //
        try {
          //
          // cmnds check
          //
          cmnds.should.have.lengthOf(1);

          cmnds[0].should.have.properties( { payload: Off, testCase: testCase });

          //
          // ticks check
          //
          ticks.should.have.lengthOf(1);

          ticks[0].should.have.properties({payload: 0, state: 0, flag: "off"});

          done();
        } catch(err) {
          console.log(`Cmnds Err: ${err} (${timeOut}/${warn})`);
          console.log("Sent:  " + JSON.stringify(nmsg));
          console.log("Cmnds: " + JSON.stringify(cmnds));
          console.log("Ticks: " + JSON.stringify(ticks));          

          done(err);
        }
      }, (timeOut+1)*1000);
    });
  });
  /* */

  /* */
  //
  // ===========================================================================================
  //
  it("TC07 - Should on with no warning (warning value as an integer), Tx on", function (done) { //
    var testCase = "0007";

    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    var timeOut = 2;
    var warn    = 1;

    this.timeout(10*1000); // Make sure this is longer than the actual timer

    const On  = "on";
    const Off = "off";

    var nmsg = {payload: "on", timeout: timeOut, warning: warn, extraAttr: "Extra attributes", testCase: testCase };

    var flow = [
      { id: "n1", type: "mytimeout",
        name:       "myTimeout",
        timer:      5,
        warning:    2,
        outsafe:    On,
        outwarning: "",
        outunsafe:  Off,
        qos:        0,
        retain:     false,
        topic:      "",
        wires:      [["n2"], ["n3"]] },
      { id: "n2", type: "helper" }, // Output commands
      { id: "n3", type: "helper" }  // Output state of ticks
    ];

    helper.load(myNode, flow, function () {
      var timeOutID;
      
      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      // Just store the results, we test in the timeout callback
      n2.on("input", function (msg) {
        msg.t = Date.now();
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)
      });

      // Just store the results, we test in the timeout callback
      n3.on("input", function (msg) {
        msg.t = Date.now();
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)
      });

      // Should on with no warning (warning value as an integer), Tx on
      n1.receive( nmsg );

      timeOutID = setTimeout(function() {
        //
        // This is what we should get
        //
        try {
          //
          // cmnds check
          //
          cmnds.should.have.lengthOf(2);

          cmnds[0].should.have.property("payload", On);
          //cmnds[1].should.have.property("payload", "warning");
          cmnds[1].should.have.property("payload", Off);

          //
          // ticks check
          //
          ticks.should.have.lengthOf(timeOut+1);

          ticks[0].should.have.properties({"payload":timeOut,"state":1,"flag":"ticks > 0"});
          --timeOut;
          ticks[1].should.have.properties({"payload":timeOut,"state":1,"flag":"ticks > 0"});
          --timeOut;
          ticks[2].should.have.properties({"payload":timeOut,"state":0,"flag":"off"});

          done();
        } catch(err) {
          console.log(`Cmnds Err: ${err} (${timeOut}/${warn})`);
          console.log("Sent:  " + JSON.stringify(nmsg));
          console.log("Cmnds: " + JSON.stringify(cmnds));
          console.log("Ticks: " + JSON.stringify(ticks));          

          done(err);
        }
      }, (timeOut+2)*1000);
    });
  });
  /* */

  // @FIXME: TC09 should go here
  // @FIXME: TC10 should go here

  /* */
  //
  // ===========================================================================================
  //
  it("TC11 - Should turn on/on, Tx on", function (done) { // ???
    /*
    */
    var testCase = "0011";
    var nmsg = { payload: "on", extra: 'extra1', testCase: testCase };

    var timeOutID = 0;

    var timeOut = 3;

    var cmnds = [];
    var ticks = [];
    var t = 0;
    var c = 0;

    this.timeout((timeOut+2+6)*1000); // run timer for 30 plus 2 seconds overrun

    // 
    const On  = "on";
    const Off = "off";

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
        if(t == 2) {
          n1.payload = '';
          n1.receive(nmsg);
        }
      });

      n1.receive(nmsg);

      /* */
      timeOutID = setTimeout(function() {
        //
        // This is what we should get
        //
        try {
          try {
            //
            // cmnds check
            //
            cmnds.should.have.lengthOf(5);

            //
            cmnds[0].should.have.properties({"payload": On,        "extra": 'extra1', "testCase": testCase});
            cmnds[1].should.have.properties({"payload": "warning", "extra": 'extra1', "testCase": testCase});
            cmnds[2].should.have.properties({"payload": On,        "extra": 'extra1', "testCase": testCase});
            cmnds[3].should.have.properties({"payload": "warning", "extra": 'extra1', "testCase": testCase});
            cmnds[4].should.have.properties({"payload": Off,       "extra": 'extra1', "testCase": testCase});
            // done();
          } catch(err) {
            console.log("Cmnds Err: " + err + " (" + timeOut + "/_)");

            throw(err);
          }

          try {
            //
            // ticks check
            //
            ticks.should.have.lengthOf(timeOut+1+2, "Ooops ... "); // The second on causes 3 2 3 2 1 0 = 6 = 3 + 1 + 2

            //
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

            done();
          } catch(err) {
            console.log("Ticks Err: " + err);
            console.log("Sent:  " + JSON.stringify(nmsg));
            console.log("Cmnds: " + JSON.stringify(cmnds));
            console.log("Ticks: " + JSON.stringify(ticks));          

            throw(err);
          }
        } catch(err) {
          console.log("Cmnds Err: " + err + " (" + timeOut + "/_)");
          console.log("Sent:  " + JSON.stringify(nmsg));
          console.log("Cmnds: " + JSON.stringify(cmnds));
          console.log("Ticks: " + JSON.stringify(ticks));          

          done(err);
        }
      }, (timeOut+2+1+1)*1000);
      // x = 0; y = 3; for(; x < 3; x++, y--) { console.log(`X = ${x}\nY = ${y}`); }
      /* */
    });
  });
  /* */

  /* */
  //
  // ===========================================================================================
  //
  it("TC11a- Should turn on/'' with warning, Tx on ", function (done) { // ???
    /*
    */
    var testCase = "0011a";
    var nmsg = { payload: "on", extra: 'extra1', testCase: testCase };

    var timeOutID = 0;

    var timeOut = 3;

    var cmnds = [];
    var ticks = [];
    var t = 0;
    var c = 0;

    this.timeout((timeOut+2+6)*1000); // run timer for 30 plus 2 seconds overrun

    // 
    const On  = "on";
    const Off = "off";

    var flow = [
      { id: "n1", type: "mytimeout", name: nom,
        outsafe: On,                  // If blank we should get no on msg
        outwarning: "warning",        // 
        outunsafe: Off,               // 
        timer: timeOut,               // 5 seconds
        warning: 2,                   // 2 seconds
        debug: "0",
        /* output: 2, */
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
        if(t == 2) {
          nmsg.payload = '';
          n1.receive(nmsg);
        }
      });

      n1.receive(nmsg);

      /* */
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
            cmnds[1].should.have.properties({"payload": "warning", "extra": 'extra1', "testCase": testCase});
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
            ticks.should.have.lengthOf(timeOut+1+2, "Ooops ... "); // The second on causes 3 2 3 2 1 0 = 6 = 3 + 1 + 2

            //
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

            /*
              Sent:  {"payload":"off","extra":"extra1","testCase":"0011a","_msgid":"8a31e254.81e29","t":1612144537172}
              Cmnds: [{"payload":"on","extra":"extra1","testCase":"0011a","_msgid":"8a31e254.81e29","t":1612144531167},
                      {"payload":"warning","extra":"extra1","testCase":"0011a","_msgid":"8a31e254.81e29","t":1612144533168},
                      {"payload":"warning","extra":"extra1","testCase":"0011a","_msgid":"8a31e254.81e29","t":1612144535170},
                      {"payload":"off","extra":"extra1","testCase":"0011a","_msgid":"8a31e254.81e29","t":1612144537172}]
              Ticks: [{"payload":3,"state":1,"flag":"ticks > 0","_msgid":"6219081f.8cc0e8","t":1612144532167},
                      {"payload":2,"state":2,"flag":"warn >= ticks","_msgid":"ad947561.477bf8","t":1612144533168},
                      {"payload":3,"state":1,"flag":"ticks > 0","_msgid":"e2026928.655418","t":1612144534169},
                      {"payload":2,"state":2,"flag":"warn >= ticks","_msgid":"fa1c5182.5af12","t":1612144535171},
                      {"payload":1,"state":2,"flag":"warn >= ticks","_msgid":"bd669cc8.90fb","t":1612144536171},
                      {"payload":0,"state":0,"flag":"off","_msgid":"8a31e254.81e29","t":1612144537172}]
            */
            done();
          } catch(err) {
            console.log("Ticks Err: " + err);
            console.log("Sent:  " + JSON.stringify(nmsg));
            console.log("Cmnds: " + JSON.stringify(cmnds));
            console.log("Ticks: " + JSON.stringify(ticks));          

            throw(err);
          }
        } catch(err) {
          console.log("Cmnds Err: " + err + " (" + timeOut + "/_)");
          console.log("Sent:  " + JSON.stringify(nmsg));
          console.log("Cmnds: " + JSON.stringify(cmnds));
          console.log("Ticks: " + JSON.stringify(ticks));          

          done(err);
        }
      }, (timeOut+2+1+1)*1000);
      // x = 0; y = 3; for(; x < 3; x++, y--) { console.log(`X = ${x}\nY = ${y}`); }
      /* */
    });
  });
  /* */

  /* */
  //
  // ===========================================================================================
  //
  it("TC11b- Should turn on/'' with no warning, Tx on ", function (done) { // ???
    /*
    */
    var testCase = "0011b";
    var nmsg = { payload: "on", extra: 'extra1', testCase: testCase };

    var timeOutID = 0;

    var timeOut = 3;

    var cmnds = [];
    var ticks = [];
    var t = 0;
    var c = 0;

    this.timeout((timeOut+2+6)*1000); // run timer for 30 plus 2 seconds overrun

    // 
    const On  = "on";
    const Off = "off";

    var flow = [
      { id: "n1", type: "mytimeout", name: nom,
        outsafe: On,                  // If blank we should get no on msg
        outwarning: "",               // 
        outunsafe: Off,               // 
        timer: timeOut,               // 5 seconds
        warning: 0,                   // 2 seconds (Notice this doesn't stop the warning when "warning"
        debug: "0",
        /* output: 2, */
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
        if(t == 2) {
          nmsg.payload = '';
          n1.receive(nmsg);
        }
      });

      n1.receive(nmsg);

      /* */
      timeOutID = setTimeout(function() {
        //
        // This is what we should get
        //
        try {
          try {
            //
            // cmnds check
            //
            cmnds.should.have.lengthOf(2);

            //
            cmnds[0].should.have.properties({"payload": On,        "extra": 'extra1', "testCase": testCase});
            cmnds[1].should.have.properties({"payload": Off,       "extra": 'extra1', "testCase": testCase});
            // done();
          } catch(err) {
            console.log("Cmnds Err: " + err + " (" + timeOut + "/_)");

            throw(err);
          }

          try {
            //
            // ticks check
            //
            ticks.should.have.lengthOf(timeOut+1+2); // The second on causes 3 2 3 2 1 0 = 6 = 3 + 1 + 2

            //
            var timeOutOrg = timeOut;
            ticks[0].should.have.properties({"payload":timeOut,"state":1,"flag":"ticks > 0"}); // 3 ticks
            --timeOut;
            ticks[1].should.have.properties({"payload":timeOut,"state":1,"flag":"ticks > 0"}); // 2
            // just sent a new on
            timeOut = timeOutOrg;
            ticks[2].should.have.properties({"payload":timeOut,"state":1,"flag":"ticks > 0"}); // 3
            --timeOut;
            ticks[3].should.have.properties({"payload":timeOut,"state":1,"flag":"ticks > 0"}); // 2
            --timeOut
            ticks[4].should.have.properties({"payload":timeOut,"state":1,"flag":"ticks > 0"}); // 1
            --timeOut
            ticks[5].should.have.properties({"payload":timeOut,"state":0,"flag":"off"});       // 0

            /*
              X Promise tests
              Cmnds Err: TypeError: Cannot read property 'should' of undefined (3/_)
              Cmnds Err: TypeError: Cannot read property 'should' of undefined (3/_)
              Sent:  {"payload":"off","extra":"extra1","testCase":"0011b","_msgid":"f8ae4116.eead3","t":1612147403745}
              Cmnds: [{"payload":"on","extra":"extra1","testCase":"0011b","_msgid":"f8ae4116.eead3","t":1612147397742},
                      {"payload":"off","extra":"extra1","testCase":"0011b","_msgid":"f8ae4116.eead3","t":1612147403745}]
              Ticks: [{"payload":3,"state":1,"flag":"ticks > 0","_msgid":"11d23a6d.8d5f96","t":1612147398739},
                      {"payload":2,"state":1,"flag":"ticks > 0","_msgid":"6888159b.88553c","t":1612147399739},
                      {"payload":3,"state":1,"flag":"ticks > 0","_msgid":"8d4c946f.86fea8","t":1612147400740},
                      {"payload":2,"state":1,"flag":"ticks > 0","_msgid":"6a9c45b5.7e77cc","t":1612147401741},
                      {"payload":1,"state":1,"flag":"ticks > 0","_msgid":"73f5ab57.03f564","t":1612147402742},
                      {"payload":0,"state":0,"flag":"off","_msgid":"f8ae4116.eead3","t":1612147403745}]
                      1) TC11b- Should turn on/'' with no warning, Tx on
            */
            done();
          } catch(err) {
            console.log("Ticks Err: " + err);
            console.log("Sent:  " + JSON.stringify(nmsg));
            console.log("Cmnds: " + JSON.stringify(cmnds));
            console.log("Ticks: " + JSON.stringify(ticks));          

            throw(err);
          }
        } catch(err) {
          console.log("Cmnds Err: " + err + " (" + timeOut + "/_)");
          console.log("Sent:  " + JSON.stringify(nmsg));
          console.log("Cmnds: " + JSON.stringify(cmnds));
          console.log("Ticks: " + JSON.stringify(ticks));          

          done(err);
        }
      }, (timeOut+2+1+1)*1000);
      // x = 0; y = 3; for(; x < 3; x++, y--) { console.log(`X = ${x}\nY = ${y}`); }
      /* */
    });
  });
  /* */

  // @FIXME: TC12 should go here
  // @FIXME: TC13 should go here
  // @FIXME: TC14 should go here

  // stop and cancel should do nothing to the mytimeout node, working on a way to test that.

  //
  // ===========================================================================================
  //
  it("TC15 - Should turn on then off, Tx on", function (done) { // ???
    var testCase = "0015";

    var timeOut = 10;
    var turnOff = 7;
    var isDone  = false;

    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    this.timeout((timeOut+2)*1000); // run timer for timeOut plus 2 seconds overrun

    // Node 1:{"id":"n1","type":"mytimeout","_closeCallbacks":[null],"_inputCallbacks":null,"name":"MyTimeout","wires":[["n2"],["n3"]],"_wireCount":2,"timer":5,"state":"stop","warning":2,"outsafe":"on","outwarn":"warning","outunsafe":"off","_events":{},"_eventsCount":1}
    const On  = "on";
    const Off = "off";
    
    var flow = [
      { id: "n1", type: "mytimeout",
        name:       nom,
        outsafe:    On, /* If blank we should get no on msg */
        outwarning: "warning",
        outunsafe:  Off,
        timer:      timeOut,
        warning:    turnOff-2,
        wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" }, /* Output commands */
      { id: "n3", type: "helper" }  /* Output state of ticks */
    ];

    helper.load(myNode, flow, function () {
      var fini = 0;

      var n2 = helper.getNode("n2");
      var n3 = helper.getNode("n3");
      var n1 = helper.getNode("n1");

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)

        // do until payload = "off"
        try {
          if(msg.payload == Off) {
            //console.log("\nCmnds: " + JSON.stringify(cmnds));
            cmnds.should.have.length(2, "Number of commands issued");
            cmnds[0].should.have.property("payload", On);
            cmnds[1].should.have.property("payload", Off);
          }
        } catch(err) {
          //console.log ("Node 1:" + JSON.stringify(n1) + "\n");
          console.log("Cmnds: " + JSON.stringify(cmnds));
          console.log("Ticks: " + JSON.stringify(ticks) + `\nn1.timer: ${n1.timer}\n`);

          console.log("Cmnds Err: " + err);
          done("Cmnds Err:"  + err);
        }
      });

      n3.on("input", function (msg) {
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)

        if(msg.payload == turnOff) {
          n1.receive({ payload: "off", testCase: testCase });
        }

        // do until payload = 0
        if(msg.payload == 0) {
          try {
            var j = timeOut; // n1.timer - turnOff;
            var idx = n1.timer - turnOff + 1;
            for(let i = 0; i < idx ; i++) {
              ticks[i].payload.should.be.exactly(j--); // Count down to 0
            }
            // 10 - 7 = 3 + 1 = 4 (5th array element)
            ticks[idx].payload.should.be.exactly(0); //
            
            done();
          } catch(err) {
            console.log("Ticks: " + JSON.stringify(ticks) + `\nn1.timer: ${n1.timer}\n`);
            console.log("Ticks Err: " + err);
            done(err);
          }
        }
      });

      n1.receive({ payload: On, testCase: testCase });
    });
  });
  /* */

  //
  // ===========================================================================================
  //
  it("TC16 - Should turn on then stop, Tx on", function (done) { // ???
    var testCase = "0016";

    var timeOut = 10;
    var turnOff = 7;
    var isDone  = false;

    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    this.timeout((timeOut+2)*1000); // run timer for timeOut plus 2 seconds overrun

    // Node 1:{"id":"n1","type":"mytimeout","_closeCallbacks":[null],"_inputCallbacks":null,"name":"MyTimeout","wires":[["n2"],["n3"]],"_wireCount":2,"timer":5,"state":"stop","warning":2,"outsafe":"on","outwarn":"warning","outunsafe":"off","_events":{},"_eventsCount":1}
    const On     = "on";
    const Off    = "off";
    const myStop = "stop";
    
    var flow = [
      { id: "n1", type: "mytimeout",
        name:       nom,
        outsafe:    On, /* If blank we should get no on msg */
        outwarning: "warning",
        outunsafe:  Off,
        timer:      timeOut,
        warning:    turnOff-2,
        wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" }, /* Output commands */
      { id: "n3", type: "helper" }  /* Output state of ticks */
    ];

    helper.load(myNode, flow, function () {
      var fini = 0;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)

        try {
          if(msg.payload == myStop) {
            cmnds.should.have.length(2, "Number of commands issued");
            cmnds[0].should.have.property("payload", On);
            cmnds[1].should.have.property("payload", myStop);

            done();
          }

        } catch(err) {
          console.log("1 Node 1:" + JSON.stringify(n1) + "\n");
          console.log("1 Cmnds: " + JSON.stringify(cmnds));
          console.log("1 Ticks: " + JSON.stringify(ticks) + `\nn1.timer: ${n1.timer}\n`);

          console.log("Cmnds Err: " + err);
          done("Cmnds Err:"  + err);
        }
      });

      n3.on("input", function (msg) {
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)

        if(msg.payload == turnOff) {
          n1.receive({ payload: "stop", testCase: testCase });
        }

        // do until payload = -1
        // { payload: -1, state: 0, flag: "stop", _msgid: "92bf1534.39af58 }
        if(msg.payload == -1) {
          try {
            var j = n1.timer; // n1.timer - turnOff;
            var idx = n1.timer - turnOff + 1;
            for(let i = 0; i < idx ; i++) {
              ticks[i].payload.should.be.exactly(j--); // Count down to 0
            }
            // 10 - 7 = 3 + 1 = 4 (5th array element)
            ticks[idx].payload.should.be.exactly(-1);    // 
            ticks[idx].state.should.be.exactly(0); // 
            ticks[idx].flag.should.be.exactly(myStop); // 
            
            // Hmm, need to figure out why we don't note stop here
            //done();
          } catch(err) {
            console.log("Ticks: " + JSON.stringify(ticks) + `\nn1.timer: ${n1.timer}\n`);
            console.log("Ticks Err: " + err);
            done(err);
          }
        }
      });

      n1.receive({ payload: On, testCase: testCase });
    });
  });
  /* */

  // @FIXME: TC17 should go here
  // @FIXME: TC18 should go here

  //
  // ===========================================================================================
  //
  it("TC19 - Should turn on then cancel, Tx on", function (done) { // ???
    var testCase = "0019";

    var timeOut = 10;
    var turnOff = 7;
    var isDone  = false;

    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    this.timeout((timeOut+2)*1000); // run timer for timeOut plus 2 seconds overrun

    const On     = "on";
    const Off    = "off";
    const myStop = "stop";
    const cancel = "cancel";
    
    var flow = [
      { id: "n1", type: "mytimeout",
        name:       nom,
        outsafe:    On, /* If blank we should get no on msg */
        outwarning: "warning",
        outunsafe:  Off,
        timer:      timeOut,
        warning:    turnOff-2,
        wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" }, /* Output commands */
      { id: "n3", type: "helper" }  /* Output state of ticks */
    ];

    helper.load(myNode, flow, function () {
      var fini = 0;

      var n2 = helper.getNode("n2");
      var n3 = helper.getNode("n3");
      var n1 = helper.getNode("n1");

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)

        // do until payload = "stop"
        try {
          // {"payload":-1,"state":0,"flag":"cancel","_msgid":"3624644e.abf0cc"}
          if(msg.payload == myStop) {
            cmnds.should.have.length(1, "Number of commands issued");
            cmnds[0].should.have.property("payload", On);
          }

        } catch(err) {
          console.log("1 Node 1:" + JSON.stringify(n1) + "\n");
          console.log("1 Cmnds: " + JSON.stringify(cmnds));
          console.log("1 Ticks: " + JSON.stringify(ticks) + `\nn1.timer: ${n1.timer}\n`);

          console.log("Cmnds Err: " + err);
          done("Cmnds Err:"  + err);
        }
      });

      n3.on("input", function (msg) {
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)

        if(msg.payload == turnOff) {
          n1.receive({ payload: cancel, testCase: testCase });
        }

        // do until payload = -1
        // {"payload":-1,"state":0,"flag":"cancel","_msgid":"3624644e.abf0cc"}
        if(msg.payload == -1) {
          try {
            var j = n1.timer; // n1.timer - turnOff;
            var idx = n1.timer - turnOff + 1;
            for(let i = 0; i < idx ; i++) {
              ticks[i].payload.should.be.exactly(j--); // Count down to 0
            }
            // 10 - 7 = 3 + 1 = 4 (5th array element)
            ticks[idx].payload.should.be.exactly(-1);    // 
            ticks[idx].state.should.be.exactly(0); // 
            ticks[idx].flag.should.be.exactly(cancel); // 
            
            // Hmm, need to figure out why we don't note stop here
            done();
          } catch(err) {
            console.log("2 Ticks: " + JSON.stringify(ticks) + `\nn1.timer: ${n1.timer}\n`);
            console.log("2 Ticks Err: " + err);

            console.log("Ticks Err: " + err);
            done(err);
          }
        }
      });

      n1.receive({ payload: On , testCase: testCase});
    });
  });
  /* */

  //
  // ===========================================================================================
  //
  it("TCxx - Should turn on 2 Tx 1", function (done) { // ???
    var testCase = "00xx";

    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    var flow = [
      { id: "n1", type: "mytimeout", name: nom,
        outsafe:    "on",
        outwarning: "warning",
        outunsafe:  "off",
        warning:    "5",
        timer:      "10",
        debug:      "0",
        output:     2,
        wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" },
      { id: "n3", type: "helper" }
    ];
    helper.load(myNode, flow, function () {
      var fini = 0;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Okay the fini++ seems like a good idea but if I get 2 n2 or 2 n3 I might gets a false done
      n2.on("input", function (msg) {
        msg.should.have.property("payload", "on");
        fini++;
        if(fini > 1) {
          done();
        }
      });

      n3.on("input", function (msg) {
        msg.should.have.property("payload", 10);
        fini++;
        if(fini > 1) {
          done();
        }
      });

      n1.receive({ payload: "1", testCase: testCase });
    });
  });
  /* */

  //
  // ===========================================================================================
  //
  it("TC20?- Should turn on 2, complex Tx 1", function (done) { // ???
    var testCase = "0020?";

    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    var timeOut = 2;
    var warn    = 1;

    this.timeout(10*1000); // run timer for 30 plus 2 seconds overrun

    const On  = "on";
    const Off = "off";

    var flow = [
      { id: "n1", type: "mytimeout",
        name:       "myTimeout",
        timer:      5,
        warning:    2,
        outsafe:    On,
        outwarning: "warning",
        outunsafe:  Off,
        qos:        0,
        retain:     false,
        topic:      "",
        wires:      [["n2"], ["n3"]] },
      { id: "n2", type: "helper" }, /* Output commands */
      { id: "n3", type: "helper" }  /* Output state of ticks */
    ];

    helper.load(myNode, flow, function () {
      var timeOutID;
      
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
      });

      var nmsg = { payload: "on", timeout: timeOut, warning: warn, testCase: testCase};
      n1.receive( nmsg );

      timeOutID = setTimeout(function() {
        //
        // This is what we should get
        //
        try {
          cmnds.should.have.lengthOf(3);

          cmnds[0].should.have.property("payload", On);
          cmnds[1].should.have.property("payload", "warning");
          cmnds[2].should.have.property("payload", Off);

          ticks.should.have.lengthOf(timeOut+1);

          ticks[0].should.have.properties({"payload":timeOut,"state":1,"flag":"ticks > 0"});
          --timeOut;
          ticks[1].should.have.properties({"payload":timeOut,"state":2,"flag":"warn >= ticks"});
          --timeOut;
          ticks[2].should.have.properties({"payload":timeOut,"state":0,"flag":"off"});

          done();
        } catch(err) {
          console.log(`Cmnds Err: ${err} (${timeOut}/${warn})`);
          console.log("Sent:  " + JSON.stringify(nmsg));
          console.log("Cmnds: " + JSON.stringify(cmnds));
          console.log("Ticks: " + JSON.stringify(ticks));          

          done(err);
        }
      }, (timeOut+2)*1000);
    });
  });
  /* */

  /* */
  //
  // ===========================================================================================
  //
  it(`TC21 - Should turn on, Tx "0"`, function (done) {
    var testCase = "0021";
    
    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    var timeout = 2;
    var warn    = 1;

    var nmsg = { payload: "ON", timeout: timeout, warning: warn, testCase: testCase};
    this.timeout(10*1000); // run timer for timeOut plus 2 seconds overrun

    var flow = [
      { id: "n1", type: "mytimeout",
        name:         "myTimeout",
        timer:        timeout,
        warning:      2,
        outsafe:      "on",
        outwarning:   "warning",
        outunsafe:    "off",
        qos:          0,
        retain:       false,
        topic:        "",
        "debug":      false,
        "ndebug":     false,
        "ignoreCase": false,
        "repeat":     false,
        "again":      false,
        wires:        [["n2"], ["n3"]] },
      { id: "n2", type: "helper" },
      { id: "n3", type: "helper" }
    ];

    helper.load(myNode, flow, function() {
      var timeOutID;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Okay the fini++ seems like a good idea but if I get 2 n2 or 2 n3 I might gets a false done
      n2.on("input", function (msg) {
        msg.t = Date.now();
        cmnds[c++] = JSON.parse(JSON.stringify(msg));
        //
        // Just collect the inputs. This time we'll get on/warning/off
        //
        
      });

      n3.on("input", function (msg) {
        msg.t = Date.now();
        ticks[t++] = JSON.parse(JSON.stringify(msg));
        //
        //  Just collect the inputs.
        //
      });
      
      n1.receive( nmsg );

      //
      // ---------------------------------------------------------------------------------------
      // Timer
      //
      timeOutID = setTimeout(function() {
        //
        // This is what we should get
        //
        try {
          // Now check the cmnds
          cmnds.should.have.lengthOf((3));

          cmnds[0].should.have.properties({"payload": "on",      "timeout": timeout, warning: warn, testCase: testCase});
          cmnds[1].should.have.properties({"payload": "warning", "timeout": timeout, warning: warn, testCase: testCase});
          cmnds[2].should.have.properties({"payload": "off",     "timeout": timeout, warning: warn, testCase: testCase});

          // Now check the ticks
          ticks.should.have.lengthOf(timeout+1);

          ticks[0].should.have.properties({"payload":timeout,"state":1,"flag":"ticks > 0"});
          --timeout;
          ticks[1].should.have.properties({"payload":timeout,"state":2,"flag":"warn >= ticks"});
          --timeout;
          ticks[2].should.have.properties({"payload":timeout,"state":0,"flag":"off"});

          done();
        } catch(err) {
          console.log(`Cmnds Err: ${err} (${timeout}/${warn})`);
          console.log("Sent:  " + JSON.stringify(nmsg));
          console.log("Cmnds: " + JSON.stringify(cmnds));
          console.log("Ticks: " + JSON.stringify(ticks));          
          done(err);
        }
      }, (timeout+2)*1000);
    });
  });
  /* */

  /* */
  //
  // ===========================================================================================
  //
  it("TC21a- Should turn normal on/off, Tx on w/floats", function (done) { // ???
    var testCase = "0021a";

    var timeOut = 5;

    var cmnds = [];
    var ticks = [];
    var t = 0;
    var c = 0;

    this.timeout((timeOut+2)*1000); // run timer for 30 plus 2 seconds overrun

    // Node 1:{"id":"n1","type":"mytimeout","_closeCallbacks":[null],"_inputCallbacks":null,"name":"MyTimeout","wires":[["n2"],["n3"]],"_wireCount":2,"timer":5,"state":"stop","warning":2,"outsafe":"on","outwarn":"warning","outunsafe":"off","_events":{},"_eventsCount":1}
    const On  = "on";
    const Off = "off";

    var flow = [
      { id: "n1", type: "mytimeout", name: nom,
        outsafe: On, /* If blank we should get no on msg */
        outwarning: "warning",
        outunsafe: Off,
        timer: 5,
        warning: 2,
        debug: "0",
        /* output: 2, */
        wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" }, /* Output commands */
      { id: "n3", type: "helper" }  /* Output state of ticks */
    ];

    helper.load(myNode, flow, function () {
      var fini = 0;

      var n2 = helper.getNode("n2");
      var n3 = helper.getNode("n3");
      var n1 = helper.getNode("n1");

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)

        // do until payload = "off"
        try {
          if(msg.payload == Off) {
            //console.log('\nCmnds: ' + JSON.stringify(cmnds));
            cmnds[0].should.have.property("payload", On);
            cmnds[1].should.have.property("payload", "warning");
            cmnds[2].should.have.property("payload", Off);
            //done();
          }
        } catch(err) {
          console.log("Cmnds Err: " + err);
          done("Cmnds Err:"  + err);
        }
      });

      n3.on("input", function (msg) {
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)

        // do until payload = 0
        if(msg.payload == 0) {
          try {
            var j = timeOut;
            for(let i = 0; i <= n1.timer ; i++) {
              ticks[i].payload.should.be.exactly(j--); // Count down to 0
            }
            done();
          } catch(err) {
            console.log("Ticks Err: " + err);
            done(err);
          }
        }
      });

      var pl = { payload: "on", timeout: flow[0].timer+0.99, warning: flow[0].warning+0.99, extra: "extra", testCase: testCase };
      n1.receive(pl);
    });
  });
  /* */

  /* */
  //
  // ===========================================================================================
  //
  it("TC23 - Should turn on/on (2nd no payload), Tx on - TC xx", function (done) { // ???
    var testCase = "0023";

    /*
    */
    var timeOut = 10;

    var cmnds = [];
    var ticks = [];
    var t = 0;
    var c = 0;

    this.timeout((timeOut+2+6)*1000); // run timer for 30 plus 2 seconds overrun

    // Node 1:{"id":"n1","type":"mytimeout","_closeCallbacks":[null],"_inputCallbacks":null,"name":"MyTimeout","wires":[["n2"],["n3"]],"_wireCount":2,"timer":5,"state":"stop","warning":2,"outsafe":"on","outwarn":"warning","outunsafe":"off","_events":{},"_eventsCount":1}
    const On  = "on";
    const Off = "off";

    var flow = [
      { id: "n1", type: "mytimeout", name: nom,
        outsafe: On, /* If blank we should get no on msg */
        outwarning: "warning",
        outunsafe: Off,
        timer: timeOut,
        warning: 2,
        debug: "0",
        /* output: 2, */
        wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" }, /* Output commands */
      { id: "n3", type: "helper" }  /* Output state of ticks */
    ];

    helper.load(myNode, flow, function () {
      var fini = 0;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)

        // do until payload = "off"
        try {
          if(msg.payload == Off) {
            cmnds[0].should.have.property("payload", On);
            cmnds[1].should.have.property("payload", "warning"); //
            cmnds[2].should.have.property("payload", Off);
            //done();
          }
        } catch(err) {
          console.log("\tCmnds:     " + JSON.stringify(cmnds));
          console.log("\tTicks:     " + JSON.stringify(ticks));
          console.log("\tCmnds Err: " + err);
          done("Cmnds Err:"  + err);
        }
      });

      n3.on("input", function (msg) {
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)

        if(msg.payload == 7 && !fini) {
          fini++;
          n1.receive({ payload: "", extra: "extra2", testCase: testCase }); // Extra is in the msg (cool we can test for that then
        }
        
        // do until payload = 0
        if(msg.payload == 0) {
          try {
            var j = timeOut;
            var flag = 0;

            // I can manually figure it out but programatically it's a bit more difficult to to it correctly
            ticks.should.have.length(15, "Tick count should be 15"); // ??? 15? 10 9 8 7 10 9 8 7 6 5 4 3 2 1 0 10-7=3+10=13+1=14
            /* */
            for(let i = 0; i <= n1.timer ; i++) {
              ticks[i].payload.should.be.exactly(j); // Count down to 0
              if(j == 7 && !flag) {
                j = 10;
                flag++;
              } else {
                j--;
              }
            }
            //* */
            done();
          } catch(err) {
            console.log("\tCmnds:     " + JSON.stringify(cmnds));
            console.log("\tTicks:     " + JSON.stringify(ticks));
            console.log("Ticks Err: " + err);
            done(err);
          }
        }
      });

      n1.receive({ payload: "on", extra: "extra1", testCase: testCase });
    });
  });
  /* */

  //
  // ===========================================================================================
  //
  it("TC24 - Should turn on with junk, Tx junk", function (done) { //
    var testCase = "0024";

    var timeOut = 5;

    var cmnds = [];
    var ticks = [];
    var t = 0;
    var c = 0;

    this.timeout((timeOut+2)*1000); // run timer for 30 plus 2 seconds overrun

    // Node 1:{"id":"n1","type":"mytimeout","_closeCallbacks":[null],"_inputCallbacks":null,"name":"MyTimeout","wires":[["n2"],["n3"]],"_wireCount":2,"timer":5,"state":"stop","warning":2,"outsafe":"on","outwarn":"warning","outunsafe":"off","_events":{},"_eventsCount":1}
    const On  = "on";
    const Off = "off";

    var flow = [
      { id: "n1", type: "mytimeout", name: nom,
        outsafe: On, /* If blank we should get no on msg */
        outwarning: "warning",
        outunsafe: Off,
        timer: 5,
        warning: 2,
        debug: "0",
        /* output: 2, */
        wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" }, /* Output commands */
      { id: "n3", type: "helper" }  /* Output state of ticks */
    ];

    helper.load(myNode, flow, function () {
      var fini = 0;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)

        // do until payload = "off"
        try {
          if(msg.payload == Off) {
            cmnds[0].should.have.property("payload", On);
            cmnds[1].should.have.property("payload", "warning");
            cmnds[2].should.have.property("payload", Off);
            //done();
          }
        } catch(err) {
          console.log("Cmnds Err: " + err);
          done("Cmnds Err:"  + err);
        }
      });

      n3.on("input", function (msg) {
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)

        // do until ticks payload = 0, meaning the timer has stopped
        if(msg.payload == 0) {
          try {
            var j = timeOut;
            for(let i = 0; i <= n1.timer ; i++) {
              ticks[i].payload.should.be.exactly(j--); // Count down to 0
            }
            done();
          } catch(err) {
            console.log("Ticks Err: " + err);
            done(err);
          }
        }
      });

      n1.receive({ payload: "junk", testCase: testCase });
    });
  });
  /* */
  
  //
  // ===========================================================================================
  //
  it("TC25 - Should turn on with junk with no outwarning (''), Tx junk", function (done) { //
    var testCase = "0025";

    /*
      Cmnds# [{"payload":"oN","_msgid":"f9585a12.6b9dc8"},{"payload":"oFF","_msgid":"f9585a12.6b9dc8"}]
      Ticks: [{"payload":5,"state":1,"flag":"ticks > 0","_msgid":"5ee06bcf.685864"},{"payload":4,"state":1,"flag":"ticks > 0","_msgid":"b64db567.5a9e48"},
              {"payload":3,"state":1,"flag":"ticks > 0","_msgid":"89eb0cd7.1e599"}, {"payload":2,"state":1,"flag":"ticks > 0","_msgid":"23cf2964.d164e6"},
              {"payload":1,"state":1,"flag":"ticks > 0","_msgid":"c9e990ad.d40c4"}, {"payload":0,"state":0,"flag":"off","_msgid":"f9585a12.6b9dc8"}]
    */
    
    var timeOut = 5;

    var cmnds = [];
    var ticks = [];
    var t = 0;
    var c = 0;

    this.timeout((timeOut+2)*1000); // run timer for 30 plus 2 seconds overrun

    // Node 1:{"id":"n1","type":"mytimeout","_closeCallbacks":[null],"_inputCallbacks":null,"name":"MyTimeout","wires":[["n2"],["n3"]],"_wireCount":2,"timer":5,"state":"stop","warning":2,"outsafe":"on","outwarn":"warning","outunsafe":"off","_events":{},"_eventsCount":1}
    const On  = "on";
    const Off = "off";

    var flow = [
      { id: "n1", type: "mytimeout", name: nom,
        outsafe: On, /* If blank we should get no on msg */
        outwarning: "", // This turns off warning
        outunsafe: Off,
        timer: 5,
        warning: 2, // Setting to zero has not affect on turning off warning message?
        debug: "0",
        /* output: 2, */
        wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" }, /* Output commands */
      { id: "n3", type: "helper" }  /* Output state of ticks */
    ];

    helper.load(myNode, flow, function () {
      var fini = 0;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)

        // do until payload = "off"
        try {
          if(msg.payload == Off) {
            cmnds[0].should.have.property("payload", On);
            cmnds[1].should.have.property("payload", Off);
          }
        } catch(err) {
          console.log("\nCmnds# " + JSON.stringify(cmnds));
          console.log("Cmnds Err: " + err);
          done("Cmnds Err:"  + err);
        }
      });

      n3.on("input", function (msg) {
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)

        // do until ticks payload = 0, meaning the timer has stopped
        if(msg.payload == 0) {
          try {
            var j = timeOut;
            for(let i = 0; i <= n1.timer ; i++) {
              ticks[i].payload.should.be.exactly(j--); // Count down to 0
            }
            done();
          } catch(err) {
            console.log("Ticks Err: " + err);
            done(err);
          }
        }
      });

      n1.receive({ payload: "junk", testCase: testCase });
    });
  });
  /* */
  
  //
  // ===========================================================================================
  //
  it("TC26 - Should turn on with junk with outwarning not defined & warning (0), Tx junk", function (done) { //
    var testCase = "0025";

    var timeOut = 5;

    var cmnds = [];
    var ticks = [];
    var t = 0;
    var c = 0;

    var nmsg = { payload: "junk", timeout: timeOut, warning: 0, "extra": "extraValue", testCase: testCase };
    this.timeout((timeOut+2)*1000); // run timer for 30 plus 2 seconds overrun

    const On  = "on";
    const Off = "off";

    var flow = [
      { id: "n1", type: "mytimeout", name: nom,
        outsafe: On, /* If blank we should get no on msg */
        outwarning: "", // This turns off warning
        outunsafe: Off,
        timer: 5,
        warning: 0, // Setting to zero has not affect on turning off warning message?
        debug: "0",
        wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" }, /* Output commands */
      { id: "n3", type: "helper" }  /* Output state of ticks */
    ];

    helper.load(myNode, flow, function () {
      var fini = 0;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)

        // do until payload = "off"
        try {
          if(msg.payload == Off) {
            cmnds[0].should.have.property("payload", On);
            cmnds[1].should.have.property("payload", Off);
          }
        } catch(err) {
          console.log("\nCmnds# " + JSON.stringify(cmnds));
          console.log("Cmnds Err: " + err);
          done("Cmnds Err:"  + err);
        }
      });

      n3.on("input", function (msg) {
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)

        // do until ticks payload = 0, meaning the timer has stopped
        if(msg.payload == 0) {
          try {
            var j = timeOut;
            for(let i = 0; i <= n1.timer ; i++) {
              ticks[i].payload.should.be.exactly(j--); // Count down to 0
            }
            done();
          } catch(err) {
            console.log("Ticks Err: " + err);
            done(err);
          }
        }
      });

      n1.receive(nmsg);
    });
  });
  /* */
  
  //
  // ===========================================================================================
  //
  it("TC27 - Should turn on with junk with outwarning & warning defined, Tx junk & warning 0", function (done) { //
    /*
      Cmnds# [{"payload":"oN","_msgid":"57dc6145.bc9b7"},
              {"_msgid":"57dc6145.bc9b7"}, <-- not correct
              {"payload":"oFF","_msgid":"57dc6145.bc9b7"}]
      Ticks: [{"payload":5,"state":1,"flag":"ticks > 0","_msgid":"5ee06bcf.685864"},
              {"payload":4,"state":1,"flag":"ticks > 0","_msgid":"b64db567.5a9e48"},
              {"payload":3,"state":1,"flag":"ticks > 0","_msgid":"89eb0cd7.1e599"},
              {"payload":2,"state":1,"flag":"ticks > 0","_msgid":"23cf2964.d164e6"},
              {"payload":1,"state":1,"flag":"ticks > 0","_msgid":"c9e990ad.d40c4"},
              {"payload":0,"state":0,"flag":"off","_msgid":"f9585a12.6b9dc8"}]
    */
    
    var testCase = "0027";

    var timeOut = 5;

    var cmnds = [];
    var ticks = [];
    var t = 0;
    var c = 0;

    var nmsg = { payload: "junk", timeout: timeOut, warning: 0, "extra": "extraValue", testCase: testCase };

    this.timeout((timeOut+2)*1000); // run timer for 30 plus 2 seconds overrun

    //
    const On  = "on";
    const Off = "off";

    var flow = [
      { id: "n1", type: "mytimeout", name: nom,
        outsafe:    On, /* If blank we should get no on msg */
        outwarning: "warn", // This turns off warning
        outunsafe:  Off,
        timer:      timeOut,
        warning:    2, // Setting to zero has not affect on turning off warning message?
        wires:      [["n2"], ["n3"]] },
      { id: "n2", type: "helper" }, /* Output commands */
      { id: "n3", type: "helper" }  /* Output state of ticks */
    ];

    helper.load(myNode, flow, function () {
      var fini = 0;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)

        // do until payload = "off"
        try {
          if(msg.payload == Off) {
            cmnds[0].should.have.property("payload", On);
            cmnds[1].should.have.property("payload", Off);
          }
        } catch(err) {
          console.log("\nCmnds# " + JSON.stringify(cmnds));
          console.log("Cmnds Err: " + err);
          done("Cmnds Err:"  + err);
        }
      });

      n3.on("input", function (msg) {
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)

        // do until ticks payload = 0, meaning the timer has stopped
        if(msg.payload == 0) {
          try {
            var j = timeOut;
            ticks.should.have.length(timeOut+1, "Number of ticks issued");
            for(let i = 0; i <= n1.timer ; i++) {
              ticks[i].payload.should.be.exactly(j--); // Count down to 0
            }
            //console.log("Timeout = " + timeOut + "\nTicks length = " + ticks.length);
            done();
          } catch(err) {
            console.log("Ticks Err: " + err);
            done(err);
          }
        }
      });

      n1.receive(nmsg);
    });
  });
  /* */
  
});

// =[ Notes ]====================================================================================
/*

*/

// =[ Fini ]=====================================================================================
// -*- mode: js-mode; js-indent-level: 2; -*- 

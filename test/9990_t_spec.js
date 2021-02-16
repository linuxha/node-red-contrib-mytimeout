// -*- mode: js; js-indent-level: 2; -*- 
"use strict";

const should = require("should");
var   helper = require('node-red-node-test-helper');
var   myNode = require('../mytimeout.js');

helper.init(require.resolve('node-red'));

var nom =  'MyTimeout';
var rString = 'No reason.';

var timeoutID;

// Tried to use this in a catch(cb)
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
let cb = function(err) {
  console.log('\tPromise catch: '+ err);
}

// Returns a promise, this one has no resolve, just the reject that occurs immediately
let getFailingPromise = function() {
  return new Promise(function(resolve, reject) {
    // simply fail on the next tick
    timeoutID = setTimeout(function() {
      reject(new Error(rString));
    }); // If the delay parameter is omitted, a value of 0 is used, meaning execute "immediately", or more accurately, the next event cycle
    // The returned timeoutID is a positive integer value which identifies the timer created by the call to setTimeout(); this value can be passed to clearTimeout() to cancel the timeout.
    //}).catch(cb); // Fails if I do this (with a 2000 ms timeout)
  });
}

describe('* 9990 - T - timeout test', function () {
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
  it('TC01 - pass timeout test', function (done) {
    var testCase = "0001";
    
    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    var timeout = 2;
    var warn    = 1;

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
  }).timeout(10*1000);
  /* */

  //
  // ===========================================================================================
  //
  it('TC02 - pass timeout test', function (done) {
    var testCase = "0002";
    
    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    var timeOut = 5;
    var warn    = 1;

    var flow = [
      { id: "n1", type: "mytimeout",
        name:       "myTimeout",
        timer:      timeOut,
        warning:    warn,
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
      
      var nmsg = { payload: "on", testCase: testCase};
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

          cmnds[0].should.have.properties({"payload": "on",      "timeout": timeOut, warning: warn, testCase: testCase});
          cmnds[1].should.have.properties({"payload": "warning", "timeout": timeOut, warning: warn, testCase: testCase});
          cmnds[2].should.have.properties({"payload": "off",     "timeout": timeOut, warning: warn, testCase: testCase});

          // Now check the ticks
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
  }).timeout(5*1000);
  /* */

  /* */
  try {
    var cmnds = [];
    var ticks = [];

    //
    // ===========================================================================================
    //
    it('TC03 - fail timeout test', () => {
      var testCase = "0003";
    
      var t = 0;
      var c = 0;

      var timeout = 30;
      var warn    = 10;

      this.timeout(10*1000); // run timer for timeOut plus 2 seconds overrun

      var flow = [
        { id: "n1", type: "mytimeout",
          name:       "myTimeout",
          timer:      30,
          warning:    10,
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
        
        var nmsg = { payload: "on", testCase: testCase};
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

            consloe.log("We're good");
            done();
          } catch(err) {
            console.log(`Cmnds Err: ${err} (${timeout}/${warn})`);
            console.log("Sent:  " + JSON.stringify(nmsg));
            console.log("Cmnds: " + JSON.stringify(cmnds));
            console.log("Ticks: " + JSON.stringify(ticks));          
            //done(err); // done not defined ???
            throw(err);
          }
        }, (timeout+2)*1000);
      });
    }); //.timeout(10*1000);
  } catch(err) {
    console.log(`Caught me a timeout (I hope) ${err}`);
    console.log("Cmnds: " + JSON.stringify(cmnds));
    console.log("Ticks: " + JSON.stringify(ticks));          
    done();
  }
  /* */
});

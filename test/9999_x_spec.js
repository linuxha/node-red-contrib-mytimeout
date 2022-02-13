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

describe('* 9999 - X Promise tests', function () {
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
  it('TC01 - Dummy, should be true', function (done) {
    var flow = [
      { id: "n1", type: "mytimeout", name: nom, output: 2, wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" },
      { id: "n3", type: "helper" }
    ];

    try {
      helper.load(myNode, flow, function () {
        try {
          (true).should.be.true();
          done();
        } catch(err) {
          console.log('Ooops');
          done(err);
        }
      });
    } catch(err) {
      console.log(err);
      done();
    }
  });
  /* */

  //
  // ===========================================================================================
  //
  it('TC02 - Dummy, should be false', function (done) {
    var flow = [
      { id: "n1", type: "mytimeout", name: nom, output: 2, wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" },
      { id: "n3", type: "helper" }
    ];
        
    try {
      helper.load(myNode, flow, function () {
        try {
          (false).should.be.true();  // this will cause this test case to fail (and pass)
          //(true).should.be.true(); // This will cause this test case to succeed (and not pass)
          done("Nuts, should have failed!"); // If we get this, test case fails
        } catch(err) {
          //console.log('Not Ooops');          // If we get this, test case passes
          done();
        }
      });
      //console.log('Hmmm');
    } catch(err) {
      console.log(err);
      done();
    }
  });
  /* */

  
  it('TC03 - should fail and I should catch it', function(done) {
    let promise = getFailingPromise();
    promise.catch(function(err) {

      try {
        var a = err.message === rString;
        var b = err.message == rString;
        var s = '\t\terr.message === \'' + rString + '\' (' + a + ')';
        //console.log('err.message === \'' + rString + '\' (' + a + ')');  // => true *** DON'T DO THIS! ***
        //console.log(s);  // => true
        //console.log('\t\tError message:', err.message + '(' + a + '/' + b + ')');                                           // => Error message: No reason.
        //err.message.should.equal(rString);
        //done(err.message !== rString ? new Error('\tFailed (' + err + ')') : undefined);      // => Never reached.
        done();                                                                                 // => Never reached.
      } catch(err) {
        //done(err.message !== rString ? new Error('\tFailed without \'' + rString +'\' ;-) (' + err + ')') : undefined); // => Never reached.
        done(err)
      }        
    });
  });
  /* */

  // sleep 3; mosquitto_pub -t 'home/test/mytimeout' -m '{"payload": "on", "timeout": 2, "warning": 1, "TestNo":"'S0002'" }'
  /* */
  //
  // ===========================================================================================
  //
  it('TC04 - timed on, minimal time (2/1), TX on', function (done) {
    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    var timeOut = 2;
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
      
      var nmsg = { payload: 'on', timeout: timeOut, warning: warn, TestNo: '0004'};
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

          cmnds[0].should.have.properties({"payload": "on",      "timeout": timeOut, warning: warn, TestNo: "0004"});
          cmnds[1].should.have.properties({"payload": "warning", "timeout": timeOut, warning: warn, TestNo: "0004"});
          cmnds[2].should.have.properties({"payload": "off",     "timeout": timeOut, warning: warn, TestNo: "0004"});

          // Now check the ticks
          ticks.should.have.lengthOf(timeOut+1);

          ticks[0].should.have.properties({"payload":timeOut,"state":1,"flag":"ticks > 0"});
          --timeOut;
          ticks[1].should.have.properties({"payload":timeOut,"state":2,"flag":"warn >= ticks"});
          --timeOut;
          ticks[2].should.have.properties({"payload":timeOut,"state":0,"flag":"off"});

          done();
        } catch(err) {
          console.log("Cmnds Err: " + err);
          console.log('Sent:  ' + JSON.stringify(nmsg));
          console.log('Cmnds: ' + JSON.stringify(cmnds));
          console.log('Ticks: ' + JSON.stringify(ticks));          
          done(err);
        }
      }, (timeOut+2)*1000);
    });
  });
  /* */

  /* * /
  //
  // ===========================================================================================
  //
  it('failing test in resolved promise times out', function (done) {
    // https://github.com/tj/should.js/issues/71
    // this stopped the tests from the rest of the tests
    Model.ignite('foo')
    .then(function (flare) {
      true.should.be.false;
      done();
    }, done)
    .end();
  });
  /* * /

  //
  // ===========================================================================================
  //
  it('promise', function(done) {
    // https://github.com/tj/should.js/issues/71
    // this stopped the tests from the rest of the tests
    new Promise(function(resolve, inject){
      setTimeout(function(){
        resolve(false);
      }, 20);
    }).then(function(state) {
        state.should.be.ok;
        done();
    }).catch(done);
  });
  /* */

});

/*

// I ran these in js, and copied the js into the REPL

function get(url) {
  // Return a new promise.
  return new Promise(function(resolve, reject) {
    // Do the usual XHR stuff
    var req = new XMLHttpRequest();
    req.open('GET', url);

    req.onload = function() {
      // This is called even on 404 etc
      // so check the status
      if (req.status == 200) {
        // Resolve the promise with the response text
        resolve(req.response);
      }
      else {
        // Otherwise reject with the status text
        // which will hopefully be a meaningful error
        reject(Error(req.statusText));
      }
    };

    // Handle network errors
    req.onerror = function() {
      reject(Error("Network Error"));
    };

    // Make the request
    req.send();
  });
}



get('http://mozart.uucp/story.json').then(function(response) {
  console.log("Success!", response);
}, function(error) {
  console.error("Oh rats it Failed!", error);
})

// Results:
Promise {
  <pending>,
  domain:
   Domain {
     domain: null,
     _events:
      [Object: null prototype] {
        removeListener: [Function: updateExceptionCapture],
        newListener: [Function: updateExceptionCapture],
        error: [Function: debugDomainError] },
     _eventsCount: 3,
     _maxListeners: undefined,
     members: [],
     [Symbol(kWeak)]: WeakReference {} } }
> Oh rats it Failed! ReferenceError: XMLHttpRequest is not defined
    at repl:5:15
    at new Promise (<anonymous>)
    at get (repl:3:10)
    at repl:1:1
    at Script.runInThisContext (vm.js:122:20)
    at REPLServer.defaultEval (repl.js:332:29)
    at bound (domain.js:402:14)
    at REPLServer.runBound [as eval] (domain.js:415:12)
    at REPLServer.onLine (repl.js:642:10)
    at REPLServer.emit (events.js:203:15)

Attempt 2 but we'll catch the error and say it's not an error

function get(url) {
  // Return a new promise.
  return new Promise(function(resolve, reject) {
    // Do the usual XHR stuff
    try {
      var req = new XMLHttpRequest();
      req.open('GET', url);

      req.onload = function() {
        // This is called even on 404 etc
        // so check the status
        if (req.status == 200) {
          // Resolve the promise with the response text
          resolve(req.response);
        }
        else {
          // Otherwise reject with the status text
          // which will hopefully be a meaningful error
          reject(Error(req.statusText));
        }
      };

      // Handle network errors
      req.onerror = function() {
        reject(Error("Network Error"));
      };

      // Make the request
      req.send();
    } catch(err) {
      var msg = "Caught the error but ignoring it";
      console.log("Caught the error but ignoring it");
      resolve(msg);
    }
  });
}



get('http://mozart.uucp/story.json').then(function(response) {
  console.log("Success!", response);
}, function(error) {
  console.error("Oh rats it Failed!", error);
})

// Results
Caught the error but ignoring it
Promise {
  <pending>,
  domain:
   Domain {
     domain: null,
     _events:
      [Object: null prototype] {
        removeListener: [Function: updateExceptionCapture],
        newListener: [Function: updateExceptionCapture],
        error: [Function: debugDomainError] },
     _eventsCount: 3,
     _maxListeners: undefined,
     members: [],
     [Symbol(kWeak)]: WeakReference {} } }
> Success! Caught the error but ignoring it

smartthings/Snore Outlet/switch
smartthings/Snore Outlet/switch
smartthings/Snore Z-Wave/switch
~/dev/HA/SmartThings/smartthings-mqtt-bridge
*/

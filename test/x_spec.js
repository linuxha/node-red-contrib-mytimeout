"use strict";

const should = require("should");
var   helper = require('node-red-node-test-helper');
var   myNode = require('../mytimeout.js');

helper.init(require.resolve('node-red'));

var nom =  'MyTimeout';

var timeoutID;

// Returns a promise, this one has no resolve, just the reject that occurs immediately
let getFailingPromise = function() {

  return new Promise(function(resolve, reject) {
    // simply fail on the next tick
    timeoutID = setTimeout(function() {
      reject(new Error('No reason.'));
    }); // If the delay parameter is omitted, a value of 0 is used, meaning execute "immediately", or more accurately, the next event cycle
    // The returned timeoutID is a positive integer value which identifies the timer created by the call to setTimeout(); this value can be passed to clearTimeout() to cancel the timeout.
  });
}

describe('X Promise tests', function () {

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

  it('should fail and I should catch it', function(done) {
    let promise = getFailingPromise();
    promise.catch(function(err) {

      console.log('\tError message:', err.message); // => Error message: No reason.
      console.log(err.message === 'No reason.');  // => true
      err.message.should.equal('No reason.');
      done(err.message !== 'No reason.' ? new Error('Failed') : undefined); // => Never reached.
    });
  });
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

*/

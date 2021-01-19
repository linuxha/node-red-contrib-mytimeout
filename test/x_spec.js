"use strict";

const should = require("should");
var   helper = require('node-red-node-test-helper');
var   myNode = require('../mytimeout.js');

helper.init(require.resolve('node-red'));

var nom =  'MyTimeout';

let getFailingPromise = function() {

  return new Promise(function(resolve, reject) {

    // simply fail on the next tick
    setTimeout(function() {

      reject(new Error('No reason.'));
    });
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

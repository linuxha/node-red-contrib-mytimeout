// -*- mode: js; js-indent-level: 2; -*- 
/*
*/
"use strict";

const should = require("should");
var   helper = require('node-red-node-test-helper');
var   myNode = require('../mytimeout.js');

helper.init(require.resolve('node-red'));

var nom =  'MyTimeout';

describe('* 0030 - Complex pause test case for mytimeout Node (Dummy - WIP)', function () {

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
  
});

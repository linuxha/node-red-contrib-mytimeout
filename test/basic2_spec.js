// https://github.com/ksvan/node-red-contrib-verisure/wiki/Detailed-setup---automated-nodered-test
"use strict";

const should = require("should");
var   helper = require('node-red-node-test-helper');
var   myNode = require('../mytimeout.js');

helper.init(require.resolve('node-red'));

var nom =  'Timeout Test 2';

describe('mytimeout Node 2', function () {

  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    /* */
    helper.unload();
    helper.stopServer(done);
    /* */
  });

  /*
  ** Main output
  ** n2: {"_msgid":"65d8f152.8e917","payload":"on","topic":"","timeout":30}
  ** Ticks output
  ** n3: {"payload":30,"state":1,"flag":"ticks > 0","_msgid":"5e5dd4bf.1be32c"}
  */
  it('Should turn on', function (done) {
    var flow = [
      { id: "n1", type: "mytimeout", name: nom, wires:[["n2"]] },
      { id: "n2", type: "helper" }
    ];
    helper.load(myNode, flow, function () {
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      n2.on("input", function (msg) {
        console.log("NJC: msg.payload = " + msg.payload);
        console.log("NJC: msg = " + JSON.stringify(msg));
        msg.should.have.property('payload', 'on');
        done();
      });
      n1.receive({ payload: 1 });
    });
  });
  /* */
});

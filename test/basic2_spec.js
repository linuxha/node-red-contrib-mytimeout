/*
*/
"use strict";

const should = require("should");
var   helper = require('node-red-node-test-helper');
var   myNode = require('../mytimeout.js');

helper.init(require.resolve('node-red'));

var nom =  'MyTimeout';

describe('mytimeout Node', function () {

  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    helper.unload();
    helper.stopServer(done);
  });

  /* */

  it('Should turn on 2, complex Tx 1', function (done) { // ???
    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    this.timeout(32000); // run timer for 30 plus 2 seconds overrun

    // Node 1:{"id":"n1","type":"mytimeout","_closeCallbacks":[null],"_inputCallbacks":null,"name":"MyTimeout","wires":[["n2"],["n3"]],"_wireCount":2,"timer":5,"state":"stop","warning":2,"outsafe":"on","outwarn":"warning","outunsafe":"off","_events":{},"_eventsCount":1}
    const On  = 'oN';
    const Off = 'oFF';

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

      console.log ("Node 1:" + JSON.stringify(n1) +'\n');
      
      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        console.log("Msg #" + c + ": " + JSON.stringify(msg));
        cmnds[c] = msg;
        console.log("Cmnds[" + c + "]: " + JSON.stringify(cmnds[(c)]) );
        c++;
        // do until payload = 'off'
        if(msg.payload == Off) {
          console.log('\nCmnds: ' + JSON.stringify(cmnds));
          msg.should.have.property('payload', Off);
          //done();
        }
      });

      n3.on("input", function (msg) {
        ticks[t++] = msg;
        if(msg.payload == 0) {
          console.log('Ticks: ' + JSON.stringify(ticks));
          msg.should.have.property('payload', 0); // Count down to 0
          done();
        }
      });

      n1.receive({ payload: 1 });
    });
  });
});

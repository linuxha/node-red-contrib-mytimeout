// https://github.com/ksvan/node-red-contrib-verisure/wiki/Detailed-setup---automated-nodered-test
/*
mosquitto_sub -v -t home/test/switchTimer | awk '{ print strftime("%F_%T.%s"), "" $0; fflush(); }' | tee ${file} # ^Z
bg

mosquitto_pub -t 'home/test/switchTimer' -m '{ "payload": "junk", "timeout" : 4, "warning": 2 }'

2021-01-13_02:26:07.1610522767 home/test/switchTimer { "payload": "junk", "timer" : 4, "warning": 2 }
2021-01-13_02:26:07.1610522767 home/test/switchTimer on
2021-01-13_02:26:35.1610522795 home/test/switchTimer warning
2021-01-13_02:26:37.1610522797 home/test/switchTimer off

You have new mail in /var/mail/njc
(pts/27) njc@mozart:~/dev/git/mytimeout/t/dev-test$ fg
mosquitto_sub -v -t home/test/switchTimer | awk '{ print strftime("%F_%T.%s"), "" $0; fflush(); }' | tee ${file}
^C

*/
"use strict";

function delay(sec) {
  var millis = sec * 1000;

  var date = new Date();
  var curDate = null;

  do {
    curDate = new Date();
  } while(curDate-date < millis);
}

const should = require("should");
var   helper = require('node-red-node-test-helper');
var   myNode = require('../mytimeout.js');

helper.init(require.resolve('node-red'));

var nom =  'MyTimeout';
//var flow = [{ id: 'n1', type: 'mytimeout', name: nom }];

describe('mytimeout Node', function () {

  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    /* */
    helper.unload();
    helper.stopServer(done);
    /* */
  });

  it('should be loaded', function (done) {
    var flow = [{ id: "n1", type: "mytimeout", name: nom }];
    helper.load(myNode, flow, function () {
      var n1 = helper.getNode("n1");
      n1.should.have.property('name',    nom);
      //n1.should.have.property('timer',   30);
      //n1.should.have.property('warning', 10);
      done();
    });
  });

  it('Should turn off', function (done) {
    var flow = [
      { id: "n1", type: "mytimeout", name: nom, wires:[["n2"]] },
      { id: "n2", type: "helper" }
    ];
    helper.load(myNode, flow, function () {
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");
      n2.on("input", function (msg) {
        msg.should.have.property('payload', 'off');
        done();
      });
      n1.receive({ payload: '0' });
    });
  });
  /* * /

  it('Should be mytimeout ???', function (done) { // Fails
    var flow = [
      { id: "n1", type: "mytimeout", name: nom, wires:[["n2"]] },
      { id: "n2", type: "helper" }
    ];
    helper.load(myNode, flow, function () {
      helper.load(myNode, flow, function () {
        var n2 = helper.getNode("n2");
        var n1 = helper.getNode("n1");
        n2.on("input", function (msg) {
          msg.should.have.property('payload', 'off');
          done();
        });
        n1.receive({ payload: '0' });
      });
    });
  });
  /* */

  it('Should turn off 2', function (done) { // Passes
    var flow = [
      { id: "n1", type: "mytimeout", name: nom, output: 2, wires:[["n2"], ["n3"]] },
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
        msg.should.have.property('payload', 'off');
        fini++;
        if(fini > 1) {
          done();
        }
      });

      n3.on("input", function (msg) {
        msg.should.have.property('payload', 0);
        fini++;
        if(fini > 1) {
          done();
        }
      });

      n1.receive({ payload: '0' });
    });
  });
  /* */

  it('Should turn on with junk, simple', function (done) { // Fails
    var flow = [
      { id: "n1", type: "mytimeout", name: nom,
        outsafe:    "on",
        outwarning: "warning",
        outunsafe:  "off",
        warning:    "5",
        timer:      "30",
        debug:      "0",
        wires:[["n2"]] },
      { id: "n2", type: "helper" }
    ];
    helper.load(myNode, flow, function () {
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      n2.on("input", function (msg) {
        msg.should.have.property("payload", "on");
        done();
      });
      n1.receive({ payload: "junk" });
    });
  });
  /* */
  
  /*
  ** Main output
  ** n2: {"_msgid":"65d8f152.8e917","payload":"on","topic":"","timeout":30}
  ** Ticks output
  ** n3: {"payload":30,"state":1,"flag":"ticks > 0","_msgid":"5e5dd4bf.1be32c"}
  */
  it('Should turn on', function (done) {
    var flow = [
      { id: "n1", type: "mytimeout", name: nom,
        outsafe: "on",
        outwarning: "warning",
        outunsafe: "off",
        warning: "5",
        timer: "30",
        debug: "0",
        wires:[["n2"]] },
      { id: "n2", type: "helper" }
    ];
    helper.load(myNode, flow, function () {
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      n2.on("input", function (msg) {
        msg.should.have.property('payload', 'on');
        done();
      });
      n1.receive({ payload: 'on' });
    });
  });
  /* */
  
  it('Should turn on 2', function (done) { // ???
    var flow = [
      { id: "n1", type: "mytimeout", name: nom,
        outsafe: "on",
        outwarning: "warning",
        outunsafe: "off",
        warning: "5",
        timer: "30",
        debug: "0",
        output: 2,
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
        msg.should.have.property('payload', 'on');
        fini++;
        if(fini > 1) {
          done();
        }
      });

      n3.on("input", function (msg) {
        msg.should.have.property('payload', 30);
        fini++;
        if(fini > 1) {
          done();
        }
      });

      n1.receive({ payload: '1' });
    });
  });
  /* * /

  console.log("Sleeping 31 seconds");
  delay(31);

  it('Should turn on, complex', function (done) {
    var flow = [
      { id: "n1", type: "mytimeout", name: nom, wires:[["n2", "n3"]] },
      { id: "n2", type: "helper" },
      { id: "n3", type: "helper" }
    ];
    helper.load(myNode, flow, function () {
      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");
      
      n2.on("input", function (msg) {
        console.log("NJC: msg.payload = " + msg.payload);
        msg.should.have.property('payload', 'on');
        done();
      });

      n3.on("input", function (msg) {
        console.log("Msg: " + msg.payload);
        console.log("NJC: msg = " + JSON.stringify(msg));
        //msg.should.have.property('payload', 'on');
        done();
      });

      n1.receive({ payload: '1' });
    });
  });
  /* */
});

/*
helper.load(myNode, flow, function () {
  var n1 = helper.getNode('n1');
  n1.should.have.property('name', nom);
  done(); // coming back to this one later
});

/*
const verEmail = 'test@fest.no';
const verPassword = '12345';
var credentials = { n1: { 'username': verEmail, 'password': verPassword } };

helper.load(sureNode, flow, credentials, function () {
  var n1 = helper.getNode('n1');
  n1.should.have.property('displayName', 'Verisure Site');
  n1.credentials.should.have.property('username', verEmail);
  n1.credentials.should.have.property('password', verPassword);
  done(); // coming back to this one later
});
*/

// Name
// Output Topic
// Timer On Payload
// Warning state payload
// Timer Off payload
// Countdown (sec)
// Warning (sec)
// Debug logging
// Ignore Input case

/*
   "name": "Test Timeout",
   "outtopic": "",
   "outsafe": "on",
   "outwarning": "warning",
   "outunsafe": "off",
   "warning": "5",
   "timer": "30",
   "debug": "0",
   "ndebug": false,
   "ignoreCase": false,
   "repeat": false,
   "again": false,
*/

/*
const outTopic   = '';
const outSafe    = 'on';
const outWarning = 'warning';
const outUnsafe  = 'off';

var credentials = { n1: { 'outtopic': outTopic, 'outsafe': outSafe, 'outwarning': outWarning, '': outUnsafe } };

helper.load(myNode, flow, credentials, function () {
  var n1 = helper.getNode('n1');
  n1.should.have.property('displayName', nom);
  n1.credentials.should.have.property('outtopic',   outTopic);
  n1.credentials.should.have.property('outsafe',    outSafe);
  n1.credentials.should.have.property('outwarning', outWarning);
  n1.credentials.should.have.property('outunsafe',  outUnsafe);
  done(); // coming back to this one later
});
*/

// Need to fix this!
// Lo cal Variables: ***
// js-indent-level: 2
// En d: ***

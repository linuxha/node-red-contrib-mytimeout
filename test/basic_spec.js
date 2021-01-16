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
    /* */
    helper.unload();
    helper.stopServer(done);
    /* */
  });

  it('should be loaded', function (done) {
    // select in node-red editor the node to test, then hamburger, then export, then copy to clipboard, then paste here:
    /* */
    var flow1 = [{
      "id":         'n1', // was"abf332d4.4e",
      "type":       "mytimeout",
      "z":          "b431bcd1.51942",
      "name":       nom,
      "outtopic":   "",
      "outsafe":    'on',
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
    /*
    Node 1: {
      "id": "n1",
      "type": "mytimeout",
      "z": "b431bcd1.51942",
      "_closeCallbacks": [
        null
      ],
      "_inputCallbacks": null,
      "name": "MyTimeout",
      "wires": [
        [
          "ba562635.2144c8",
          "6b9eec06.608274"
        ],
        [
          "2b13443d.b2b27c",
          "e1f06422.544ee8"
        ]
      ],
      "_wireCount": 4,
      "timer": 30,
      "state": "stop",
      "warning": 5,
      "topic": "",
      "outsafe": "on",
      "outwarn": "Warning",
      "outunsafe": "off",
      "repeat": false,
      "again": false,
      "_events": null,
      "_eventsCount": 1
    }
    */
    var flow = [{ id: "n1", type: "mytimeout", name: nom }];
    // Node 1: {
    //   "id":"n1",
    //   "type":"mytimeout",
    //   "_closeCallbacks":[null],
    //   "_inputCallbacks":null,
    //   "name":"MyTimeout",
    //   "wires":[],
    //   "_wireCount":0,
    //   "timer":30,
    //   "state":"stop",
    //   "warning":5,
    //   "outunsafe":"off",
    //   "_events":{},
    //   "_eventsCount":1
    // }
    helper.load(myNode, flow, function () {
      var n1 = helper.getNode("n1");
      //console.log ("Node 1:" + JSON.stringify(n1));
      n1.should.have.properties({
        'name':    nom,
        "outunsafe": 'off',
        'timer':   30,   // Defaults
        'warning':   5     // Defaults
      });
      //n1.should.not.have.property('outsafe'); // This eventually needs to get there
      done();
    });
  });

  it('Should turn off Tx 0', function (done) {
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
  /* */

  it('Should turn off 2 Tx 0', function (done) { // Passes
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

  it('Should turn on with junk, simple Tx junk', function (done) { // Fails
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
        //console.log('Msg: ' + JSON.stringify(msg));
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
  it('Should turn on Tx on', function (done) {
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
  
  it('Should turn on 2 Tx 1', function (done) { // ???
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
        msg.should.have.property('payload', 'on');
        fini++;
        if(fini > 1) {
          done();
        }
      });

      n3.on("input", function (msg) {
        msg.should.have.property('payload', 10);
        fini++;
        if(fini > 1) {
          done();
        }
      });

      n1.receive({ payload: '1' });
    });
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

      //console.log ("Node 1:" + JSON.stringify(n1) +'\n');
      
      /* * /
      n1.should.have.properties({
        'name':    nom,
        "outunsafe": 'off',
        'timer':   10,   // Defaults
        'warning':   2     // Defaults
      });
      /* */

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)

        // do until payload = 'off'
        try {
          if(msg.payload == Off) {
            //console.log('\nCmnds: ' + JSON.stringify(cmnds));
            cmnds[0].should.have.property('payload', On);
            cmnds[1].should.have.property('payload', 'warning');
            cmnds[2].should.have.property('payload', Off);
            //done();
          }
        } catch(err) {
          done("Cmnds Err:"  + err);
        }
      });

      n3.on("input", function (msg) {
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)

        // do until payload = 0
        if(msg.payload == 0) {
          try {
            //console.log('Ticks: ' + JSON.stringify(ticks) + '\nn1.timer: ' + n1.timer);
            var j = 5;
            for(let i = 0; i <= n1.timer ; i++) {
              // These 3 actually don't work ???
              //ticks[i].should.have.property('payload', j--); // Count down to 0
              //ticks[i].should.have.value('payload', j--); // Count down to 0
              ticks[i].payload.should.be.exactly(j--); // Count down to 0
            }
            done();
          } catch(err) {
            console.log("Ticks Err: " + err);
            done(err);
          }
        }
      });

      n1.receive({ payload: '1' });
    });
  });
});

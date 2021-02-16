"use strict";

const should = require("should");
var   helper = require('node-red-node-test-helper');
var   myNode = require('../mytimeout.js');
var   mqtt   = require("@node-red/nodes/core/network/10-mqtt.js");

helper.init(require.resolve('node-red'));

var nom =  'MyTimeout';
/*
var topic = 'home/test/loop';
var mqttIn  = [{"id":"45e147c3.e863c8","type":"mqtt in","z":"a8691b08.399048","name":"Button","topic":"smartthings/irisOutlet/switch","qos":"1","broker":"4ea8322.ae0dacc","x":75,"y":1425.6666870117188,"wires":[["cdb83db7.6c633"]]},{"id":"4ea8322.ae0dacc","type":"mqtt-broker","broker":"192.168.24.2","port":"1883","clientid":"","usetls":false,"compatmode":false,"keepalive":"15","cleansession":true,"birthTopic":"","birthQos":"0","birthPayload":"","willTopic":"","willQos":"0","willPayload":""}]
var mqttOut = [{"id":"57903138.9f4ff","type":"mqtt out","z":"a8691b08.399048","name":"Button","topic":"smartthings/irisOutlet/switch","qos":"0","retain":"true","broker":"4ea8322.ae0dacc","x":741.6666598849827,"y":1426,"wires":[]},{"id":"4ea8322.ae0dacc","type":"mqtt-broker","broker":"192.168.24.2","port":"1883","clientid":"","usetls":false,"compatmode":false,"keepalive":"15","cleansession":true,"birthTopic":"","birthQos":"0","birthPayload":"","willTopic":"","willQos":"0","willPayload":""}]
var retain = 0;
*/
describe('* 9000 -mytimeout Node/MQTT flow test', function () {

  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    /* */
    helper.unload();
    helper.stopServer(done);
    /* */
  });

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
      Okay this is going to get weird!
      [ mqttIn ]      ---> [ mytimeout ] ---> [ mqttOut ] = entire flow
      [ helper1 ]     ---> [ mqttOut ]                    = Publish event to mytimeout (via mqtt topic home/test/loop)
      [ mytimeout 1 ] ---> [ helper2 ]                    = subscribe to the cmnds
      [ mytimeout 2 ] ---> [helper3 ]                     = subscribe to the ticks
    */
    var flow = [{ id: "n1", type: "mytimeout", name: nom }];
    helper.load(myNode, flow, function () {
      var n1 = helper.getNode("n1");

      // Default flow (with no config) doesn't set the outsafe value (so we don't send the on-msg when payload is blank)
      n1.should.have.properties({
        'name':    nom,
        "outunsafe": 'off',
        'timer':   30,   // Defaults
        'warning':   5     // Defaults
      });
      done();
    });
  });
  /* */
});

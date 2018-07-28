var should    = require("should");
var helper    = require("node-red-node-test-helper");
var lowerNode = require("../mytimeout.js");

helper.init(require.resolve('node-red'));

describe('mytimeout Node (don\'t trust these tests yet)', function () {
    
    afterEach(function () {
        helper.unload();
    });
    
    it('should be loaded', function (done) {
        var flow = [{ id: "n1", type: "mytimeout", name: "mytimeout" }];
        helper.load(lowerNode, flow, function () {
            var n1 = helper.getNode("n1");
            n1.should.have.property('name', 'mytimeout');
            done();
        });
    });
    
    it('should make payload on', function (done) {
        
        var flow = [
            { id: "n1", type: "mytimeout", name: "mytimeout",wires:[["n2"]] },
            { id: "n2", type: "helper" }
        ];
        helper.load(lowerNode, flow, function () {
            var n2 = helper.getNode("n2");
            var n1 = helper.getNode("n1");
            n2.on("input", function (msg) {
                msg.should.have.property('payload', 'on');
                done();
            });
            n1.receive({ payload: "UpperCase" });
        });
    });

    it('should make payload off', function (done) {
        var flow = [
            { id: "n1", type: "mytimeout", name: "mytimeout",wires:[["n2"]] },
            { id: "n2", type: "helper" }
        ];
        helper.load(lowerNode, flow, function () {
            var n2 = helper.getNode("n2");
            var n1 = helper.getNode("n1");
            n2.on("input", function (msg) {
                msg.should.have.property('payload', 'off');
                done();
            });
            n1.receive({ payload: "off" });
        });
    });

    // ***
    // *** Here's where I need help
    // ***
    console.log("W're good up to here, then we go off the tracks");
    
    it('should make payload on/stop', function (done) {
        var flow = [
            { id: "n1", type: "mytimeout", name: "mytimeout",wires:[["n2"]] },
            { id: "n2", type: "helper" }
        ];
        helper.load(lowerNode, flow, function () {
            var n2 = helper.getNode("n2");
            var n1 = helper.getNode("n1");
            n2.on("input", function (msg) {
                msg.should.have.property('payload', 'on');
                done();
            });
            n1.receive({ payload: "on" });

            n2.on("input", function (msg) {
                msg.should.have.property('payload', 'failr'); // This should be stop
                done();
            });
            n1.receive({ payload: "stop" });
        });
    });

    /*
    **
home/test/countdown-out-b-txt {"payload":0,"state":0,"flag":"off"}
home/test/countdown-out-a-txt {"payload":0,"state":0,"flag":"off"}
home/test/countdown-out-c-txt {"payload":0,"state":0,"flag":"off"}
home/test/countdown-out-D-txt {"payload":0,"state":0,"flag":"off"}
home/test/countdown-out-b on
home/test/countdown-out-b-txt {"payload":10,"state":1,"flag":"ticks > 0"}
home/test/countdown-out-b-txt {"payload":9,"state":1,"flag":"ticks > 0"}
home/test/countdown-out-b-txt {"payload":8,"state":1,"flag":"ticks > 0"}
home/test/countdown-out-b-txt {"payload":7,"state":1,"flag":"ticks > 0"}
home/test/countdown-out-b-txt {"payload":6,"state":1,"flag":"ticks > 0"}
home/test/countdown-out-b warn
home/test/countdown-out-b-txt {"payload":5,"state":2,"flag":"warn >= ticks"}
home/test/countdown-out-b-txt {"payload":4,"state":2,"flag":"warn >= ticks"}
home/test/countdown-out-b-txt {"payload":3,"state":2,"flag":"warn >= ticks"}
home/test/countdown-out-b-txt {"payload":2,"state":2,"flag":"warn >= ticks"}
home/test/countdown-out-b-txt {"payload":1,"state":2,"flag":"warn >= ticks"}
home/test/countdown-out-b off
home/test/countdown-out-b-txt {"payload":0,"state":0,"flag":"off"}
    */
    /*
    it('should make payload on and status', function (done) {
        
        var flow = [
            { id: "n1", type: "mytimeout", name: "mytimeout",wires:[["n2","n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(lowerNode, flow, function () {
            var n3 = helper.getNode("n3");
            var n2 = helper.getNode("n2");
            var n1 = helper.getNode("n1");

            n2.on("input", function (msg) {
                msg.should.have.property('payload', 'on');
                done();
            });

            n3.on("input", function (msg) {
                // This will fail right now
                //msg.should.have.property('payload.state', '1');
                //msg.should.have.property('payload');
                msg.should.have.prpertyByPath('payload', 'state').eql(2)
                done();
            });

            n1.receive({ payload: "UpperCase" });
        });
    });
    */

    console.log('Before: should make payload on and status (2nd)');
    /*
    it('should make payload on and status (2nd)', function (done) {
        console.log('After:  should make payload on and status (2nd)');
        var flow = [
            { id: "n1", type: "mytimeout", name: "mytimeout",wires:[["n2","n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];
        helper.load(lowerNode, flow, function () {
            var n3 = helper.getNode("n3");
            var n2 = helper.getNode("n2");
            var n1 = helper.getNode("n1");

            n2.on("input", function (msg) {
                console.log('msg: ' + JSON.stringy(msg));
                msg.should.have.property('payload', 'on');
                done();
            });
            n1.receive({ payload: "UpperCase" });

            n3.on("input", function (msg) {
                console.log('msg: ' + JSON.stringy(msg));
                // This will fail right now
                //msg.should.have.property('payload.state', '1');
                //msg.should.have.property('payload');
                msg.should.have.prpertyByPath('payload', 'state').eql(1)
                done();
            });
            n1.receive({ payload: "UpperCase" });
        });
    });
    */
});

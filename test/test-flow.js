[
    {
        "id": "69aa7235.b3844c",
        "type": "tab",
        "label": "Base Test - Manual",
        "disabled": false,
        "info": ""
    },
    {
        "id": "5a0653c5.14059c",
        "type": "inject",
        "z": "69aa7235.b3844c",
        "name": "",
        "topic": "",
        "payload": "",
        "payloadType": "date",
        "repeat": "",
        "crontab": "",
        "once": false,
        "onceDelay": 0.1,
        "x": 112.01420593261719,
        "y": 207.00567626953125,
        "wires": [
            [
                "b038dcb4.a1dfc",
                "29b99d45.202d52"
            ]
        ]
    },
    {
        "id": "29b99d45.202d52",
        "type": "debug",
        "z": "69aa7235.b3844c",
        "name": "dbgObj",
        "active": false,
        "tosidebar": true,
        "console": true,
        "tostatus": false,
        "complete": "true",
        "x": 993.0141410827637,
        "y": 211.0056610107422,
        "wires": []
    },
    {
        "id": "f9b1a714.22eed8",
        "type": "mytimeout",
        "z": "69aa7235.b3844c",
        "name": "My Timeout",
        "outtopic": "zTopic",
        "outsafe": "on",
        "outwarning": "warn",
        "outunsafe": "off",
        "warning": "2",
        "timer": "5",
        "debug": true,
        "ndebug": true,
        "ignoreCase": false,
        "repeat": false,
        "again": false,
        "x": 545.0142364501953,
        "y": 135.00567817687988,
        "wires": [
            [
                "bb3c1343.4c3bb"
            ],
            [
                "b7ef297a.1fd718"
            ]
        ]
    },
    {
        "id": "48e51f32.91b59",
        "type": "mqtt in",
        "z": "69aa7235.b3844c",
        "name": "",
        "topic": "home/test/base-test-cmdIn",
        "qos": "2",
        "broker": "ffefaf3.9c6ad5",
        "x": 136.78125,
        "y": 136.1931848526001,
        "wires": [
            [
                "b038dcb4.a1dfc",
                "8585e040.45b0d"
            ]
        ]
    },
    {
        "id": "5ac72d54.db1f24",
        "type": "mqtt out",
        "z": "69aa7235.b3844c",
        "name": "",
        "topic": "home/test/base-test-cmdOut",
        "qos": "2",
        "retain": "false",
        "broker": "ffefaf3.9c6ad5",
        "x": 1048.7897186279297,
        "y": 111.32669830322266,
        "wires": []
    },
    {
        "id": "b038dcb4.a1dfc",
        "type": "function",
        "z": "69aa7235.b3844c",
        "name": "",
        "func": "\nreturn msg;",
        "outputs": 1,
        "noerr": 0,
        "x": 371.7897491455078,
        "y": 135.22443389892578,
        "wires": [
            [
                "f9b1a714.22eed8"
            ]
        ]
    },
    {
        "id": "bb3c1343.4c3bb",
        "type": "function",
        "z": "69aa7235.b3844c",
        "name": "msg obj to payload",
        "func": "nMsg= {};\nnMsg.payload = JSON.parse(JSON.stringify(msg));\nreturn nMsg;",
        "outputs": 1,
        "noerr": 0,
        "x": 768.0142211914062,
        "y": 111.00568389892578,
        "wires": [
            [
                "29b99d45.202d52",
                "5ac72d54.db1f24"
            ]
        ]
    },
    {
        "id": "b7ef297a.1fd718",
        "type": "function",
        "z": "69aa7235.b3844c",
        "name": "msg obj to payload",
        "func": "nMsg= {};\nnMsg.payload = JSON.parse(JSON.stringify(msg));\nreturn nMsg;",
        "outputs": 1,
        "noerr": 0,
        "x": 769.0142211914062,
        "y": 160.00567626953125,
        "wires": [
            [
                "29b99d45.202d52",
                "1c4f8c2.0b29774"
            ]
        ]
    },
    {
        "id": "1c4f8c2.0b29774",
        "type": "mqtt out",
        "z": "69aa7235.b3844c",
        "name": "",
        "topic": "home/test/base-test-ticksOut",
        "qos": "2",
        "retain": "false",
        "broker": "ffefaf3.9c6ad5",
        "x": 1051.0140762329102,
        "y": 160.0056667327881,
        "wires": []
    },
    {
        "id": "fce35194.3ff8f",
        "type": "comment",
        "z": "69aa7235.b3844c",
        "name": "Base test",
        "info": "This is my base test node. I'm using it to\nexperiment with building a pair-wise test wuite\nfor mytimeout.js",
        "x": 86.78125,
        "y": 42.164772033691406,
        "wires": []
    },
    {
        "id": "8585e040.45b0d",
        "type": "debug",
        "z": "69aa7235.b3844c",
        "name": "dbgObj In",
        "active": true,
        "tosidebar": true,
        "console": true,
        "tostatus": false,
        "complete": "true",
        "x": 372.01422119140625,
        "y": 47.00568389892578,
        "wires": []
    },
    {
        "id": "6369325c.d301cc",
        "type": "mqtt in",
        "z": "69aa7235.b3844c",
        "name": "",
        "topic": "home/test/sameTopic",
        "qos": "2",
        "broker": "ffefaf3.9c6ad5",
        "x": 200.79261016845703,
        "y": 381.18177604675293,
        "wires": [
            [
                "11c04cbc.f96993"
            ]
        ]
    },
    {
        "id": "2caccdff.392782",
        "type": "mqtt out",
        "z": "69aa7235.b3844c",
        "name": "",
        "topic": "home/test/sameTopic",
        "qos": "0",
        "retain": "false",
        "broker": "ffefaf3.9c6ad5",
        "x": 683.7869033813477,
        "y": 375.3295211791992,
        "wires": []
    },
    {
        "id": "11c04cbc.f96993",
        "type": "mytimeout",
        "z": "69aa7235.b3844c",
        "name": "My Timeout",
        "outtopic": "zTopic",
        "outsafe": "on",
        "outwarning": "warn",
        "outunsafe": "off",
        "warning": "2",
        "timer": "5",
        "debug": true,
        "ndebug": true,
        "ignoreCase": false,
        "repeat": false,
        "again": false,
        "x": 420.01422119140625,
        "y": 381.00567626953125,
        "wires": [
            [
                "9e173da8.fb9b8",
                "2caccdff.392782",
                "72bbb1fa.e6362"
            ],
            []
        ]
    },
    {
        "id": "9e173da8.fb9b8",
        "type": "function",
        "z": "69aa7235.b3844c",
        "name": "msg obj to payload",
        "func": "nMsg= {};\nnMsg.payload = JSON.parse(JSON.stringify(msg));\nreturn nMsg;",
        "outputs": 1,
        "noerr": 0,
        "x": 674.0142364501953,
        "y": 423.0056552886963,
        "wires": [
            [
                "63679dfe.513b04"
            ]
        ]
    },
    {
        "id": "63679dfe.513b04",
        "type": "mqtt out",
        "z": "69aa7235.b3844c",
        "name": "",
        "topic": "home/test/diffTopic",
        "qos": "2",
        "retain": "false",
        "broker": "ffefaf3.9c6ad5",
        "x": 944.0142211914062,
        "y": 423.00565338134766,
        "wires": []
    },
    {
        "id": "72bbb1fa.e6362",
        "type": "debug",
        "z": "69aa7235.b3844c",
        "name": "dbgObj In",
        "active": true,
        "tosidebar": true,
        "console": true,
        "tostatus": false,
        "complete": "true",
        "x": 654.0142211914062,
        "y": 329.00567626953125,
        "wires": []
    },
    {
        "id": "2ae2a919.7ff4c6",
        "type": "comment",
        "z": "69aa7235.b3844c",
        "name": "Anti-Loopback test",
        "info": "This tests the anti-loopback feature.\n\nA loopback occurrs when the input and output topics are the same.\nThis causes the same message to be sent and received.\nThis causes an infinite loop of messages that will not stop.",
        "x": 189.01419830322266,
        "y": 302.00567054748535,
        "wires": []
    },
    {
        "id": "ffefaf3.9c6ad5",
        "type": "mqtt-broker",
        "z": "",
        "name": "127.0.0.1",
        "broker": "mozart",
        "port": "1883",
        "clientid": "",
        "usetls": false,
        "compatmode": true,
        "keepalive": "60",
        "cleansession": true,
        "birthTopic": "",
        "birthQos": "0",
        "birthPayload": "",
        "closeTopic": "",
        "closeQos": "0",
        "closePayload": "",
        "willTopic": "",
        "willQos": "0",
        "willPayload": ""
    }
]

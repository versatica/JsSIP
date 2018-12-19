<p align="center"><a href="http://jssip.net"><img src="http://jssip.net/images/jssip-banner-new.png"/></a></p>

[![Build Status](https://api.travis-ci.com/versatica/JsSIP.png)](https://travis-ci.com/versatica/JsSIP)
[![Code Quality: Javascript](https://img.shields.io/lgtm/grade/javascript/g/versatica/JsSIP.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/versatica/JsSIP/context:javascript)
[![Total Alerts](https://img.shields.io/lgtm/alerts/g/versatica/JsSIP.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/versatica/JsSIP/alerts)

## Overview

* Runs in the browser and Node.js.
* SIP over [WebSocket](http://jssip.net/documentation/misc/sip_websocket/) (use real SIP in your web apps)
* Audio/video calls ([WebRTC](http://jssip.net/documentation/misc/webrtc)) and instant messaging
* Lightweight!
* Easy to use and powerful user API
* Works with OverSIP, Kamailio, Asterisk. Mobicents and repro (reSIProcate) servers ([more info](http://jssip.net/documentation/misc/interoperability))
* Written by the authors of [RFC 7118 "The WebSocket Protocol as a Transport for SIP"](http://tools.ietf.org/html/rfc7118) and [OverSIP](http://oversip.net)


## NOTE

Starting from 3.0.0, JsSIP no longer includes the [rtcninja](https://github.com/eface2face/rtcninja.js/) module. However, the [jssip-rtcninja](https://www.npmjs.com/package/jssip-rtcninja) package is based on the `2.0.x` branch, which does include `rtcninja`.


## Support

* For questions or usage problems please use the **jssip** [public Google Group](https://groups.google.com/forum/#!forum/jssip).

* For bug reports or feature requests open an [Github issue](https://github.com/versatica/JsSIP/issues).


## Getting Started

The following simple JavaScript code creates a JsSIP User Agent instance and makes a SIP call:

```javascript
// Create our JsSIP instance and run it:

var socket = new JsSIP.WebSocketInterface('wss://sip.myhost.com');
var configuration = {
  sockets  : [ socket ],
  uri      : 'sip:alice@example.com',
  password : 'superpassword'
};

var ua = new JsSIP.UA(configuration);

ua.start();

// Register callbacks to desired call events
var eventHandlers = {
  'progress': function(e) {
    console.log('call is in progress');
  },
  'failed': function(e) {
    console.log('call failed with cause: '+ e.data.cause);
  },
  'ended': function(e) {
    console.log('call ended with cause: '+ e.data.cause);
  },
  'confirmed': function(e) {
    console.log('call confirmed');
  }
};

var options = {
  'eventHandlers'    : eventHandlers,
  'mediaConstraints' : { 'audio': true, 'video': true }
};

var session = ua.call('sip:bob@example.com', options);
```

Want to see more? Check the full documentation at http://jssip.net/documentation/.


## Online Demo

Check our **Tryit JsSIP** online demo:

* [tryit.jssip.net](https://tryit.jssip.net)


## Website and Documentation

* [jssip.net](http://jssip.net/)


## Download

* As Node module: `$ npm install jssip`
* As Bower module: `$ bower install jssip`
* Manually: [jssip.net/download](http://jssip.net/download/)


## Authors

#### José Luis Millán

* Main author. Core Designer and Developer.
* <jmillan@aliax.net> (Github [@jmillan](https://github.com/jmillan))

#### Iñaki Baz Castillo

* Core Designer and Developer.
* <ibc@aliax.net> (Github [@ibc](https://github.com/ibc))

#### Saúl Ibarra Corretgé

* Core Designer.
* <saghul@gmail.com> (Github [@saghul](https://github.com/saghul))


## License

JsSIP is released under the [MIT license](http://jssip.net/license).

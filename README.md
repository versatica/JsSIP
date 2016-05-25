<p align="center"><a href="http://jssip.net"><img src="http://jssip.net/images/jssip-banner-new.png"/></a></p>

[![Build Status](https://travis-ci.org/versatica/JsSIP.png?branch=new-design)](https://travis-ci.org/versatica/JsSIP)

## Overview

* Runs in the browser and Node.js.
* SIP over [WebSocket](http://jssip.net/documentation/misc/sip_websocket/) (use real SIP in your web apps)
* Audio/video calls ([WebRTC](http://jssip.net/documentation/misc/webrtc)) and instant messaging
* Lightweight!
* Easy to use and powerful user API
* Works with OverSIP, Kamailio, Asterisk. Mobicents and repro (reSIProcate) servers ([more info](http://jssip.net/documentation/misc/interoperability))
* Written by the authors of [RFC 7118 "The WebSocket Protocol as a Transport for SIP"](http://tools.ietf.org/html/rfc7118) and [OverSIP](http://oversip.net)


## Support

* For questions or usage problems please use the **jssip** [public Google Group](https://groups.google.com/forum/#!forum/jssip).

* For bug reports or feature requests open an [Github issue](https://github.com/versatica/JsSIP/issues).


## Getting Started

The following simple JavaScript code creates a JsSIP User Agent instance and makes a SIP call:

```javascript
// Create our JsSIP instance and run it:

var configuration = {
  'ws_servers': 'ws://sip-ws.example.com',
  'uri': 'sip:alice@example.com',
  'password': 'superpassword'
};

var ua = new JsSIP.UA(configuration);

ua.start();


// Make an audio/video call:
var session = null;

// HTML5 <video> elements in which local and remote video will be shown
var selfView =   document.getElementById('my-video');
var remoteView =  document.getElementById('peer-video');

// Register callbacks to desired call events
var eventHandlers = {
  'progress': function(e){
    console.log('call is in progress');
  },
  'failed': function(e){
    console.log('call failed with cause: '+ e.data.cause);
  },
  'ended': function(e){
    console.log('call ended with cause: '+ e.data.cause);
  },
  'confirmed': function(e){
    var local_stream = session.connection.getLocalStreams()[0];

    console.log('call confirmed');

    // Attach local stream to selfView
    selfView = JsSIP.rtcninja.attachMediaStream(selfView, local_stream);
  },
  'addstream': function(e){
    var stream = e.stream;

    console.log('remote stream added');

    // Attach remote stream to remoteView
    remoteView = JsSIP.rtcninja.attachMediaStream(remoteView, stream);
  }
};

var options = {
  'eventHandlers': eventHandlers,
  'mediaConstraints': {'audio': true, 'video': true}
};


session = ua.call('sip:bob@example.com', options);
```

Want to see more? Check the full documentation at http://jssip.net/documentation/.


## Online Demo

Check our **Tryit JsSIP** online demo:

* [tryit.jssip.net](http://tryit.jssip.net)


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

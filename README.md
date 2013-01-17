<a href="http://jssip.net"><img src="http://jssip.net/images/jssip-banner.png"/></a>

## Overview

* SIP over [WebSocket](http://jssip.net/documentation/misc/sip_websocket/) (use real SIP in your web apps)
* Audio/video calls ([WebRTC](http://jssip.net/documentation/misc/webrtc)), instant messaging and presence
* Lightweight! (~140KB)
* Easy to use and powerful user API
* Works with OverSIP, Kamailio and Asterisk servers ([more info](http://jssip.net/documentation/misc/interoperability))
* Written by the authors of [draft-ietf-sipcore-sip-websocket](http://tools.ietf.org/html/draft-ietf-sipcore-sip-websocket) and [OverSIP](http://www.oversip.net)


## Getting Started

The following simple JavaScript code creates a JsSIP User Agent instance and makes a SIP call:

```javascript
// Create our JsSIP instance and run it:

var configuration = {
  'outbound_proxy_set': 'ws://sip-ws.example.com',
  'uri':                'sip:alice@example.com',
  'password':           'superpassword'
};

var coolPhone = new JsSIP.UA(configuration);

coolPhone.start();


// Make an audio/video call:

var useAudio = true;
var useVideo = true;

// id attribute of existing HTML5 <video> elements in which local and remote video will be shown
var views = {
  'localView':  "my-cam",
  'remoteView': "peer-cam"
};

var eventHandlers = {
  'connecting': function(e){ // Your code here },
  'progress':   function(e){ // Your code here },
  'failed':     function(e){ // Your code here },
  'started':    function(e){ // Your code here },
  'ended':      function(e){ // Your code here }
};

coolPhone.call('sip:bob@example.com', useAudio, useVideo, eventHandlers, views);
```

Want to see more? Check the full [Getting Started](http://jssip.net/documentation/0.2.x/getting_started/) section in the project website and our nice [demos](https://github.com/versatica/jssip-demos).


## Website and Documentation

* [jssip.net](http://jssip.net/)


## Download

* [jssip.net/download](http://jssip.net/download/)


## Authors

### Main Author

* José Luis Millán (<jmillan@aliax.net> | [github](https://github.com/jmillan) | [twitter](https://twitter.com/jomivi))

### Contributors

* Iñaki Baz Castillo (<ibc@aliax.net> | [github](https://github.com/ibc) | [twitter](https://twitter.com/ibc_tw))
* Saúl Ibarra Corretgé (<saghul@gmail.com> | [github](https://github.com/saghul) | [twitter](https://twitter.com/saghul))


## License

JsSIP is released under the [MIT license](http://jssip.net/license).

CHANGELOG
=========

Version 2.0.6 (released in 2016-09-30)
--------------------------------------

* Improve library logs.


Version 2.0.5 (released in 2016-09-28)
--------------------------------------

* Update dependencies.


Version 2.0.4 (released in 2016-09-15)
--------------------------------------

* Fix #400. Corrupt NPM packege.


Version 2.0.3 (released in 2016-08-23)
--------------------------------------

* Fix #385. No CANCEL request sent for authenticated requests.


Version 2.0.2 (released in 2016-06-17)
--------------------------------------

* Fix `gulp-header` dependency version.


Version 2.0.1 (released in 2016-06-09)
--------------------------------------

* Export `JsSIP.WebSocketInterface`.


Version 2.0.0 (released in 2016-06-07)
--------------------------------------

* New 'contact_uri' configuration parameter.
* Remove Node websocket dependency.
* Fix #196. Improve 'hostname' parsing.
* Fix #370. Outgoing request instance being shared by two transactions.
* Fix #296. Abrupt transport disconnection on UA.stop().
* Socket interface. Make JsSIP socket agnostic.


Version 1.0.1 (released in 2016-05-17)
---------------------------------------

* Update dependencies.


Version 1.0.0 (released in 2016-05-11)
---------------------------------------

* `RTCSession`: new event on('sdp') to allow SDP modifications.


Version 0.7.23 (released in 2016-04-12)
---------------------------------------

* `RTCSession`: Allow multiple calls to `refer()` at the same time.


Version 0.7.22 (released in 2016-04-06)
---------------------------------------

* `UA`: `set()` allows changing user's display name.
* Ignore SDP answer in received ACK retransmissions (fix [367](https://github.com/versatica/JsSIP/issues/367)).


Version 0.7.21 (released in 2016-04-05)
---------------------------------------

* `RTCSession`: Also emit `peerconnection` event for incoming INVITE without SDP.


Version 0.7.20 (released in 2016-04-05)
---------------------------------------

* `RTCSession/ReferSubscriber`: Fix typo that breaks exposed API.


Version 0.7.19 (released in 2016-04-05)
---------------------------------------

* `RTCSession`: Make `refer()` method to return the corresponding instance of `ReferSubscriber` so the app can set and manage as many events as desired on it.


Version 0.7.18 (released in 2016-03-23)
---------------------------------------

* Add INFO method to allowed methods list
* Add SIP Code 424 RFC 6442


Version 0.7.17 (released in 2016-02-25)
---------------------------------------

* Apply changes of 0.7.16 also to browserified files under `dist/` folder.


Version 0.7.16 (released in 2016-02-24)
---------------------------------------

* Fix [337](https://github.com/versatica/JsSIP/issues/337). Consistenly indicate registration status through events.


Version 0.7.15 (released in 2016-02-24)
---------------------------------------

* Emit UA 'connected' event before sending REGISTER on transport connection
* Fix [355](https://github.com/versatica/JsSIP/pull/355 ). call to non existent `parsed.error` function. Thanks Stéphane Alnet @shimaore


Version 0.7.14 (released in 2016-02-17)
---------------------------------------

* Fix sips URI scheme parsing rule.


Version 0.7.13 (released in 2016-02-10)
---------------------------------------

* Fix. Don't lowercase URI parameter values. Thanks to Alexandr Dubovikov @adubovikov


Version 0.7.12 (released in 2016-02-05)
---------------------------------------

* Accept new `UA` configuration parameters `ha1` and `realm` to avoid plain SIP password handling ([issue 353](https://github.com/versatica/JsSIP/issues/353)).
* New `UA.set()` and `UA.get()` methods to set and retrieve computed configuration parameters in runtime.


Version 0.7.11 (released in 2015-12-17)
---------------------------------------

* Fix typo ("iceconnetionstatechange" => "iceconnectionstatechange"). Thanks to Vertika Srivastava.


Version 0.7.10 (released in 2015-12-01)
---------------------------------------

* Make `gulp` run on Node 4.0.X and 5.0.X.


Version 0.7.9 (released in 2015-10-16)
---------------------------------------

* `UA`: Add `set(parameter, value)` method to change a configuration setting in runtime (currently just "password" is implemented).


Version 0.7.8 (released in 2015-10-13)
---------------------------------------

* `RTCSession`: Add `resetLocalMedia()` method to reset the session local MediaStream by enabling both its audio and video tracks (unless the remote peer is on hold).


Version 0.7.7 (released in 2015-10-05)
---------------------------------------

* `RTCSession`: Add "sending" event to outgoing, a good chance for the app to mangle the INVITE or its SDP offer.


Version 0.7.6 (released in 2015-09-29)
---------------------------------------

* Update dependencies.
* Improve gulpfile.js.


Version 0.7.5 (released in 2015-09-15)
---------------------------------------

* Don't ask for `getUserMedia` in `RTCSession.answer()` if no `mediaConstraints` are provided.


Version 0.7.4 (released in 2015-08-10)
---------------------------------------

* Allow rejecting an in-dialog INVITE or UPDATE message.


Version 0.7.3 (released in 2015-07-29)
---------------------------------------

* FIX properly restart UA if start() is called while closing.


Version 0.7.2 (released in 2015-07-27)
---------------------------------------

* Update dependencies.


Version 0.7.1 (released in 2015-07-27)
---------------------------------------

* Update dependencies.


Version 0.7.0 (released in 2015-07-23)
---------------------------------------

* Add REFER support.


Version 0.6.33 (released in 2015-06-17)
---------------------------------------

* Don't keep URI params&headers in the registrar server URI.
* `RTCSession` emits `peerconnection` for outgoing calls once the `RTCPeerConnection` is created and before the SDP offer is generated (good chance to create a `RTCDataChannel` without requiring renegotiation).


Version 0.6.32 (released in 2015-06-16)
---------------------------------------

* Add callback to `update` and `reinvite` events.


Version 0.6.31 (released in 2015-06-16)
---------------------------------------

* Added a parser for Reason header.


Version 0.6.30 (released in 2015-06-09)
---------------------------------------

* Fix array iteration in `URI#toString()` to avoid Array prototype mangling by devil libraries such as Ember.


Version 0.6.29 (released in 2015-06-06)
---------------------------------------

* Auto-register on transport connection before emitting the event.


Version 0.6.28 (released in 2015-06-02)
---------------------------------------

* Update "rtcninja" dependencie.


Version 0.6.27 (released in 2015-06-02)
---------------------------------------

* Don't terminate SIP dialog if processing of 183 with SDP fails.
* Update dependencies.


Version 0.6.26 (released in 2015-04-17)
---------------------------------------

* Update "rtcninja" dependency.


Version 0.6.25 (released in 2015-04-16)
---------------------------------------

* Update "rtcninja" dependency.


Version 0.6.24 (released in 2015-04-14)
---------------------------------------

* RTCSession: Fix Invite Server transaction destruction.


Version 0.6.23 (released in 2015-04-14)
---------------------------------------

* RTCSession: Handle session timers before emitting "accepted".
* Fix issue with latest version of browserify.


Version 0.6.22 (released in 2015-04-13)
---------------------------------------

* Fix double "disconnected" event in some cases.


Version 0.6.21 (released in 2015-03-11)
---------------------------------------

* Don't iterate arrays with (for...in) to avoid problems with evil JS libraries that add stuff into the Array prototype.


Version 0.6.20 (released in 2015-03-09)
---------------------------------------

* Be more flexible receiving DTMF INFO bodies.


Version 0.6.19 (released in 2015-03-05)
---------------------------------------

* Update dependencies.
 

Version 0.6.18 (released in 2015-02-09)
--------------------------------------

* Terminate the call with a proper BYE/CANCEL/408/500 if request timeout, transport error or dialog error happens.
* Fix "rtcninja" dependency problem.


Version 0.6.17 (released in 2015-02-02)
--------------------------------------

* `RTCSession`: Improve `isReadyToReOffer()`.


Version 0.6.16 (released in 2015-02-02)
--------------------------------------

* `RTCSession`: Avoid calling hold()/unhold/renegotiate() if an outgoing renegotiation is not yet finished (return false).
* `RTCSession`: Add `options` and `done` arguments to hold()/unhold/renegotiate().
* `RTCSession`: New public method `isReadyToReOffer()`.


Version 0.6.15 (released in 2015-01-31)
--------------------------------------

* `RTCSession:` Emit `iceconnetionstatechange` event.
* Update "rtcninja" dependency to 0.4.0.


Version 0.6.14 (released in 2015-01-29)
--------------------------------------

* `RTCSession:` Include initially given `rtcOfferConstraints` in `sendReinvite()` and `sendUpdate()`.


Version 0.6.13 (released in 2015-01-29)
--------------------------------------

* Properly keep mute local audio/video if remote is on hold, and keep it even if we re-offer. Also fix SDP direction attributes in re-offers according to current local and remote "hold" status.


Version 0.6.12 (released in 2015-01-28)
--------------------------------------

* Update "rtcninja" dependency to 0.3.3 (fix "RTCOfferOptions").


Version 0.6.11 (released in 2015-01-27)
--------------------------------------

* Fix "Session-Expires" default value to 90 seconds.


Version 0.6.10 (released in 2015-01-27)
--------------------------------------

* Update "rtcninja" dependency to 0.3.2 (get the `rtcninja.canRenegotiate` attribute).


Version 0.6.9 (released in 2015-01-27)
--------------------------------------

* Don't reply 405 "Method Not Supported" to re-INVITE even if the UA's "newRTCSession" event is not set.
* `RTCSession`: Allow extraHeaders in `renegotiate()`.


Version 0.6.8 (released in 2015-01-26)
--------------------------------------

* `RTCSession`: Don't ask for `getUserMedia()` in outgoing calls if `mediaConstraints` is `{audio:false, video:false}`. It is user's responsability to, in that case, provide `offerToReceiveAudio/Video` in `rtcOfferConstraints`.


Version 0.6.7 (released in 2015-01-26)
--------------------------------------

* ' UA.call()': Return the `RTCSession` instance.
* ' UA.sendMessage()': Return the `Message` instance.


Version 0.6.6 (released in 2015-01-24)
--------------------------------------

* `RTCSession`: Don't process SDPs in retranmissions of 200 OK during reINVITE/UDATE.
* `RTCSession`: Emit 'reinvite' when a reINVITE is received.
* `RTCSession`: Emit 'update' when an UPDATE is received.


Version 0.6.5 (released in 2015-01-20)
--------------------------------------

* `RTCSession`: Don't override `this.data` on `answer()` (unless `options.data` is given).


Version 0.6.4 (released in 2015-01-19)
--------------------------------------

* `RTCSession#connect()`: Add `rtcAnswerContraints` options for later incoming reINVITE or UPDATE with SDP offer.
* `RTCSession#answer()`: Add `rtcOfferConstraints` options for later incoming reINVITE without SDP offer.
* `RTCSession#renegotiate()`: Add `rtcOfferConstraints` options for the UPDATE or reINVITE.
* `RTCSession#answer()`: Remove audio or video from the given `getUserMedia` mediaConstraints if the incoming SDP has no audio/video sections.


Version 0.6.3 (released in 2015-01-17)
--------------------------------------

* Bug fix. Properly cancel when only '100 trying' has been received.


Version 0.6.2 (released in 2015-01-16)
--------------------------------------

* Bug fix: Do not set "Content-Type: application/sdp" in body-less UPDATE requests.


Version 0.6.1 (released in 2015-01-16)
--------------------------------------

* Support for [Session Timers](https://tools.ietf.org/html/rfc4028).


Version 0.6.0 (released in 2015-01-13)
--------------------------------------

* [debug](https://github.com/visionmedia/debug) module.
* [rtcninja](https://github.com/ibc/rtcninja.js) module.
* Can renegotiate an ongoing session by means of a re-INVITE or UPDATE method (useful if the local stream attached to the `RTCPeerConnection` has been modified).
* Improved hold/unhold detection.
* New API options for `UA#call()` and `RTCSession#answer()`.


Version 0.5.0 (released in 2014-11-03)
--------------------------------------

* JsSIP runs in Node!
* The internal design of JsSIP has also been modified, becoming a real Node project in which the "browser version" (`jssip-0.5.0.js` or `jssip-0.5.0.min.js`) is generated with [browserify](http://browserify.org). This also means that the browser version can be loaded with AMD or CommonJS loaders.

Version 0.4.3 (released in 2014-10-29)
--------------------------------------

* [(3b1ee11)](https://github.com/versatica/JsSIP/commit/3b1ee11) Fix references to 'this'.


Version 0.4.2 (released in 2014-10-24)
--------------------------------------

* [(ca7702e)](https://github.com/versatica/JsSIP/commit/ca7702e) Fix #257. RTCMediaHandler: fire onIceCompleted() on next tick to avoid events race conditions in Firefox 33.

Version 0.4.1 (released in 2014-10-21)
--------------------------------------

This version is included into the [Bower](http://bower.io/) registry which means `$ bower install jssip`.


Version 0.4.0 (released in 2014-10-21)
--------------------------------------

* (http://jssip.net/documentation/0.4.x/api/session) Hold/Unhold implementation
* (http://jssip.net/documentation/0.4.x/api/session) Mute/Unmute implementation
* (http://jssip.net/documentation/0.4.x/api/ua_configuration_parameters/#instance_id) New 'instance_id' configuration parameter
* (http://jssip.net/documentation/0.4.x/api/ua_configuration_parameters/#log) New 'log' configuration parameter
* [(34b235c)](https://github.com/versatica/JsSIP/commit/34b235c) Fix #246. Increase the event emiter max listener number to 50
* [(9a1ebdf)](https://github.com/versatica/JsSIP/commit/9a1ebdf) Late SDP implementation. Handle SDP-less incoming INVITEs
* [(f0cc4c1)](https://github.com/versatica/JsSIP/commit/f0cc4c1) Fix #253. RTCSession: instead of "started" emit "accepted" when 2XX and "confirmed" when ACK
* [(f0cc4c1)](https://github.com/versatica/JsSIP/commit/f0cc4c1) Fix #253. RTCSession: accept SDP renegotiation on incoming UPDATE requests.
* [(177f38d)](https://github.com/versatica/JsSIP/commit/177f38d) Fix #248. Improve transaction handling on CANCEL
* [(f9ef522)](https://github.com/versatica/JsSIP/commit/f9ef522) Fix detection of incoming merged requests (don't generate 482 for retransmissions).
* [(3789d5b)](https://github.com/versatica/JsSIP/commit/3789d5b) Fix #245. Improve late CANCEL
* [(2274a7d)](https://github.com/versatica/JsSIP/commit/2274a7d) Add hack_via_ws option to force "WS" in Via header when the server has wss:// scheme.
* [(c9e8764)](https://github.com/versatica/JsSIP/commit/c9e8764) Fire 'progress' (originator = local) when receiving an incoming call.
* [(39949e0)](https://github.com/versatica/JsSIP/commit/39949e0) Fix #242. fine tune the ICE state check for createAnswer/createOffer
* [(80c32f3)](https://github.com/versatica/JsSIP/commit/80c32f3) Fix #240. ICE connection RTP timeout status fix
* [(1f4d36d)](https://github.com/versatica/JsSIP/commit/1f4d36d) Remove RFC 3261 18.1.2 sanity check (sent-by host mismatch in Via header).
* [(62e8323)](https://github.com/versatica/JsSIP/commit/62e8323) Fix #176. Update to the latest IceServer definition
* [(caf20f9)](https://github.com/versatica/JsSIP/commit/caf20f9) Fix #163. Stop transport revocery on UA.stop().
* [(2f3769b)](https://github.com/versatica/JsSIP/commit/2f3769b) Fix #148: WebSocket reconnection behaviour
* [(d7c3c9c)](https://github.com/versatica/JsSIP/commit/d7c3c9c) Use plain 'for' loops instead of 'for in' loops on arrays
* [(a327be3)](https://github.com/versatica/JsSIP/commit/a327be3) Fix. INFO-based DTMF fixes
* [(d141864)](https://github.com/versatica/JsSIP/commit/d141864) Fix #133. Incorrect REGISTER Contact header value  after transport disconnection
* [(f4a29e9)](https://github.com/versatica/JsSIP/commit/f4a29e9) Improvements to 2xx retransmission behaviour
* [(3fc4efa)](https://github.com/versatica/JsSIP/commit/3fc4efa) Fix #107. Stop spamming provisional responses
* [(7c2abe0)](https://github.com/versatica/JsSIP/commit/7c2abe0) Fix. Permit receiving a 200 OK to a INVITE before any 1XX provisional
* [(5c644a6)](https://github.com/versatica/JsSIP/commit/5c644a6) Improvements to min-expires fix
* [(4bfc34c)](https://github.com/versatica/JsSIP/commit/4bfc34c) Fix handling of 423 response to REGISTER
* [(3e84eaf)](https://github.com/versatica/JsSIP/commit/3e84eaf) Fix #112. Enhance CANCEL request processing
* [(1740e5e)](https://github.com/versatica/JsSIP/commit/1740e5e) Fix #117. Clear registration timer before re-setting it
* [(dad84a1)](https://github.com/versatica/JsSIP/commit/dad84a1) Fix #111. Create confirmed dialog before setting remote description.
* [(15d83bb)](https://github.com/versatica/JsSIP/commit/15d83bb) Fix #100. 'originator' property was missing in RTCSession 'started' event data object. Thanks @gavllew
* [(b5c08dc)](https://github.com/versatica/JsSIP/commit/b5c08dc) Fix #99. Do not close the RTCSession if it has been accepted and the WS disconnects
* [(46eef46)](https://github.com/versatica/JsSIP/commit/46eef46) Fix #90. Don't log password
* [(9ca4bc9)](https://github.com/versatica/JsSIP/commit/9ca4bc9) Fix #89. Do not send a To tag in '100 Trying' responses


Version 0.3.0 (released in 2013-03-18)
-------------------------------

* [(fea1326)](https://github.com/versatica/JsSIP/commit/fea1326) Don't validate configuration.password against SIP URI password BNF grammar (fix #74).
* [(3f84b30)](https://github.com/versatica/JsSIP/commit/3f84b30) Make RTCSession local_identity and remote_identity NameAddrHeader instances
* [(622f46a)](https://github.com/versatica/JsSIP/commit/622f46a) remove 'views' argument from UA.call()
* [(940fb34)](https://github.com/versatica/JsSIP/commit/940fb34) Refactored Session
* [(71572f7)](https://github.com/versatica/JsSIP/commit/71572f7) Rename causes.IN_DIALOG_408_OR_481 to causes.DIALOG_ERROR and add causes.RTP_TIMEOUT.
* [(c79037e)](https://github.com/versatica/JsSIP/commit/c79037e) Added 'registrar_server' UA configuration parameter.
* [(2584140)](https://github.com/versatica/JsSIP/commit/2584140) Don't allow SIP URI without username in configuration.uri.
* [(87357de)](https://github.com/versatica/JsSIP/commit/87357de) Digest authentication refactorized.
* [(6867f51)](https://github.com/versatica/JsSIP/commit/6867f51) Add 'cseq' and 'call_id' attributes to OutgoingRequest.
* [(cc97fee)](https://github.com/versatica/JsSIP/commit/cc97fee) Fix. Delete session from UA sessions collection when closing
* [(947b3f5)](https://github.com/versatica/JsSIP/commit/947b3f5) Remove RTCPeerConnection.onopen event handler
* [(6029e45)](https://github.com/versatica/JsSIP/commit/6029e45) Enclose every JsSIP component with an inmediate function
* [(7f523cc)](https://github.com/versatica/JsSIP/commit/7f523cc) JsSIP.Utils.MD5() renamed to JsSIP.Utils.calculateMD5() (a more proper name for a function).
* [(1b1ab73)](https://github.com/versatica/JsSIP/commit/1b1ab73) Fix. Reply '200' to a CANCEL 'before' replying 487 to the INVITE
* [(88fa9b6)](https://github.com/versatica/JsSIP/commit/88fa9b6) New way to handle Streams
* [(38d4312)](https://github.com/versatica/JsSIP/commit/38d4312) Add Travis CI support.
* [(50d7bf1)](https://github.com/versatica/JsSIP/commit/50d7bf1) New `grunt grammar` task for automatically building customized Grammar.js and Grammar.min.js.
* [(f19842b)](https://github.com/versatica/JsSIP/commit/f19842b) Fix #60, #61. Add optional parameters to ua.contact.toString(). Thanks @ibc
* [(8f5acb1)](https://github.com/versatica/JsSIP/commit/8f5acb1) Enhance self contact handling
* [(5e7d815)](https://github.com/versatica/JsSIP/commit/5e7d815) Fix. ACK was being replied when not pointing to us. Thanks @saghul
* [(1ab6df3)](https://github.com/versatica/JsSIP/commit/1ab6df3) New method JsSIP.NameAddrHeader.parse() which returns a JsSIP.NameAddrHeader instance.
* [(a7b69b8)](https://github.com/versatica/JsSIP/commit/a7b69b8) Use a random user in the UA's contact.
* [(f67872b)](https://github.com/versatica/JsSIP/commit/f67872b) Extend the use of the 'options' argument
* [(360c946)](https://github.com/versatica/JsSIP/commit/360c946) Test units for URI and NameAddrHeader classes.
* [(826ce12)](https://github.com/versatica/JsSIP/commit/826ce12) Improvements and some bug fixes in URI and NameAddrHeader classes.
* [(e385840)](https://github.com/versatica/JsSIP/commit/e385840) Make JsSIP.URI and JsSIP.NameAddrHeader more robust.
* [(b0603e3)](https://github.com/versatica/JsSIP/commit/b0603e3) Separate qunitjs tests with and without WebRTC. Make "grunt test" to run "grunt testNoWebRTC".
* [(659c331)](https://github.com/versatica/JsSIP/commit/659c331) New way to handle InvalidTargetErorr and WebRtcNotSupportedError
* [(d3bc91a)](https://github.com/versatica/JsSIP/commit/d3bc91a) Don't run qunit task by default (instead require "grunt test").
* [(e593396)](https://github.com/versatica/JsSIP/commit/e593396) Added qunitjs based test unit (for now a parser test) and integrate it in grunt.js.
* [(da58bff)](https://github.com/versatica/JsSIP/commit/da58bff) Enhance URI and NameAddrHeader
* [(df6dd98)](https://github.com/versatica/JsSIP/commit/df6dd98) Automate qunit tests into grunt process
* [(babc331)](https://github.com/versatica/JsSIP/commit/babc331) Fix. Accept multiple headers with same hader name in SIP URI.
* [(716d164)](https://github.com/versatica/JsSIP/commit/716d164) Pass full multi-header header fields to the grammar
* [(2e18a6b)](https://github.com/versatica/JsSIP/commit/2e18a6b) Fix contact match in 200 response to REGISTER
* [(3f7b02f)](https://github.com/versatica/JsSIP/commit/3f7b02f) Fix stun_host grammar rule.
* [(7867baf)](https://github.com/versatica/JsSIP/commit/7867baf) Allow using a JsSIP.URI instance everywhere specting a destination.
* [(a370c78)](https://github.com/versatica/JsSIP/commit/a370c78) Fix 'maddr' and 'method' URI parameters handling
* [(537d2f2)](https://github.com/versatica/JsSIP/commit/537d2f2) Give some love to "console.log|warn|info" messages missing the JsSIP class/module prefix.
* [(8cb6963)](https://github.com/versatica/JsSIP/commit/8cb6963) In case null, emptry string, undefined or NaN is passed as parameter value then its default value is applied. Also print to console the processed value of all the parameters after validating them.
* [(f306d3c)](https://github.com/versatica/JsSIP/commit/f306d3c) hack_ip_in_contact now generates a IP in the range of Test-Net as stated in RFC 5735 (192.0.2.0/24).
* [(528d989)](https://github.com/versatica/JsSIP/commit/528d989) Add DTMF feature
* [(777a48f)](https://github.com/versatica/JsSIP/commit/777a48f) Change API methods to make use of generic 'options' argument
* [(3a6971d)](https://github.com/versatica/JsSIP/commit/3a6971d) Fix #26. Fire 'unregistered' event correctly.
* [(5616837)](https://github.com/versatica/JsSIP/commit/5616837) Rename 'outbound_proxy_set' parameter by 'ws_servers'
* [(37fe9f4)](https://github.com/versatica/JsSIP/commit/37fe9f4) Fix #54. Allow configuration.uri username start with 'sip'
* [(a612987)](https://github.com/versatica/JsSIP/commit/a612987) Add 'stun_servers' and 'turn_servers' configuration parameters
* [(9fad09b)](https://github.com/versatica/JsSIP/commit/9fad09b) Add JsSIP.URI and JsSIP.NameAddrHeader classes
* [(f35376a)](https://github.com/versatica/JsSIP/commit/f35376a) Add 'Content-Length' header to every SIP response
* [(3081a21)](https://github.com/versatica/JsSIP/commit/3081a21) Enhance 'generic_param' grammar rule
* [(e589002)](https://github.com/versatica/JsSIP/commit/e589002) Fix. Allow case-insentivity in SIP grammar, when corresponds
* [(aec55a2)](https://github.com/versatica/JsSIP/commit/aec55a2) Enhance transport error handling
* [(d0dbde3)](https://github.com/versatica/JsSIP/commit/d0dbde3) New stun_servers and turn_servers parameters
* [(47cdb66)](https://github.com/versatica/JsSIP/commit/47cdb66) Add 'extraHeaders' parameter to UA.register() and UA.unregister() methods
* [(69fbdbd)](https://github.com/versatica/JsSIP/commit/69fbdbd) Enhance in-dialog request management
* [(da23790)](https://github.com/versatica/JsSIP/commit/da23790) Fix 'UTF8-NONASCII' grammar rule
* [(3f86b94)](https://github.com/versatica/JsSIP/commit/3f86b94) Require a single grunt task for packaging
* [(81595be)](https://github.com/versatica/JsSIP/commit/81595be) Add some log lines into sanity check code for clarity
* [(a8a7627)](https://github.com/versatica/JsSIP/commit/a8a7627) Enhance RTCPeerConnection SDP error handling. Thanks @ibc for reporting.
* [(3acc474)](https://github.com/versatica/JsSIP/commit/3acc474) Add turn configuration parameters for RTCPeerConnection
* [(9fccaf5)](https://github.com/versatica/JsSIP/commit/9fccaf5) Enhance 'boolean' comparison
* [(24fcdbb)](https://github.com/versatica/JsSIP/commit/24fcdbb) Make preloaded Route header optional.
* [(defeabe)](https://github.com/versatica/JsSIP/commit/defeabe) Automatic connection recovery.
* [(a45293b)](https://github.com/versatica/JsSIP/commit/a45293b) Improve reply() method.
* [(f05795b)](https://github.com/versatica/JsSIP/commit/f05795b) Fix. Prevent outgoing CANCEL messages from being authenticated
* [(5ed6122)](https://github.com/versatica/JsSIP/commit/5ed6122) Update credentials with the new authorization upon 401/407 reception
* [(2c9a310)](https://github.com/versatica/JsSIP/commit/2c9a310) Do not allow reject-ing a Message or Session with an incorrect status code
* [(35e5874)](https://github.com/versatica/JsSIP/commit/35e5874) Make optional the reason phrase when reply-ing
* [(85ca354)](https://github.com/versatica/JsSIP/commit/85ca354) Implement credential reuse
* [(351ca06)](https://github.com/versatica/JsSIP/commit/351ca06) Fix Contact header aggregation for incoming messages
* [(d6428e7)](https://github.com/versatica/JsSIP/commit/d6428e7) Fire UA 'newMessage' event for incoming MESSAGE requests regardless they are out of dialog or in-dialog.
* [(1ab3423)](https://github.com/versatica/JsSIP/commit/1ab3423) Intelligent 'Allow' header field value. Do not set a method in the 'Allow' header field if its corresponding event is not defined or has zero listeners.
* [(4e70a25)](https://github.com/versatica/JsSIP/commit/4e70a25) Allow 'text/plain' and 'text/html' content types for incoming SIP MESSAGE Fixed incoming SIP MESSAGE processing when the Content-Type header contains parameters
* [(d5f3432)](https://github.com/versatica/JsSIP/commit/d5f3432) Fixed the message header split when a parsing error occurs. Parsing error log enhanced.


Version 0.2.1 (released in 2012-11-15)
-------------------------------

* [(24e32c0)](https://github.com/versatica/JsSIP/commit/24e32c0d16ff5fcefd2319fc445a59d6fc2bcb59) UA configuration `password` parameter is now optional.
* [(ffe7af6)](https://github.com/versatica/JsSIP/commit/ffe7af6276915695af9fd00db281af51fec2714f) Bug fix: UA configuration `display_name` parameter.
* [(aa51291)](https://github.com/versatica/JsSIP/commit/aa512913733a4f63af066b0a9e12a8e38f2a5acb) Bug fix: Allows multibyte symbols in UA configuration `display_name` parameter (and require not to write it between double quotes).
* [(aa48201)](https://github.com/versatica/JsSIP/commit/aa48201) Bug fix: "cnonce" value value was not being quoted in Digest Authentication (reported by [vf1](https://github.com/vf1)).
* [(1ecabf5)](https://github.com/versatica/JsSIP/commit/1ecabf5) Bug fix: Fixed authentication for in-dialog requests (reported by [vf1](https://github.com/vf1)).
* [(11c6bb6)](https://github.com/versatica/JsSIP/commit/11c6bb6aeef9de3bf2a339263f620b1caf60d634) Allow receiving WebSocket binary messages (code provided by [vf1](https://github.com/vf1)).
* [(0e8c5cf)](https://github.com/versatica/JsSIP/commit/0e8c5cf) Bug fix: Fixed Contact and Record-Route header split (reported by Davide Corda).
* [(99243e4)](https://github.com/versatica/JsSIP/commit/99243e4) Fixed BYE and ACK error handling.
* [(0c91285)](https://github.com/versatica/JsSIP/commit/0c91285) Fixed failure causes in 'registrationFailed' UA event.


Version 0.2.0 (released in 2012-11-01)
--------------------------------------

* First stable release with full website and documentation.
* Refactored sessions, message and events API.


Version 0.1.0 (released in 2012-09-27)
--------------------------------------

* First release. No documentation.


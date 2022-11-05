CHANGELOG
=========

### 3.9.4


* Dialog/RequestSender: Avoid circular dependency (#788).
* Fixed REFER NOTIFY parsing in accordance to RFC 3515 section 2.4.5 (#767)


### 3.9.3


* UA: Add TS types for 'newOptions' event (closes #777).


### 3.9.2


* Dialog/RequestSender: Fix reference to undefined method (#787).


### 3.9.1


* Fix RTCSession 'confirmed' event type description (#770). Thanks @stefang42.


### 3.9.0


* Enable custom From-Header for outbound Message (#753). Thanks @gebsl.


### 3.8.2


* RTCSession: Fix for overlapping invites while refreshing session (PR #734). Credits to @makstheimba.



### 3.8.1


* RTCSession: allow SDP renegotiation before ICE gathering is completed. Credits to @markusatm.


### 3.8.0


* Add support for sending and responding to SIP OPTIONS. Credits to @simonlindberg.


### 3.7.11


* ReferSubscriber: fix, case sensitivity.


### 3.7.10


* RTCSession: allow overriding the Referred-By header on REFER. Credits to @jp1987.


### 3.7.9


* RTCSession: allow sending DTMFs if 1XX was received. Credits to @BlindChickens.


### 3.7.8


* Use a proper Logger class (fix from previous release)


### 3.7.7


* Use a proper Logger class.


### 3.7.6


* Registrator: Enhance Contact matching in Register 2XX reponse. Credits to @stefang42.


### 3.7.5


* WebSocketInterface: Fix values of UA.disconnected event (#701). Credits to @kkozlik.


### 3.7.2


* Support 2 bytes long UTF-8 chars in the SDP (#693). Credits to santa.lajos@gmail.com.


### 3.7.1


* RTCSession: close media stream even if session is in terminated (#683). Credits to @kkozlik.


### 3.7.0


* Enable custom From-Header for outbound calls (#677). Thanks @fabrykowski.


### 3.6.3


* Make authorization_jwt writable (#676). Thanks @fabrykowski.


### 3.6.2


* Add missing typescript definitions. Thanks @fabrykowski.


### 3.6.1


* RTCSession: Properly use RTCDtmf sender enqueue (#674). Thanks @ikq for reportig and testing.


### 3.6.0


* UA configuration option 'session_timers_force_refresher' (#671). Credits to @kkozlik.


### 3.5.11


* RTCsession: Fix, missing progress event for empty provisional responses. Credits to @stefang42.


### 3.5.10


* RTCSession: Fix, in dialog request processing error does not take the seesion into a failed state. Thanks @stefang42 for reportig.

### 3.5.9


* RTCSession: Fix, fire progress after setRemoteDescription. Credits to @wangduanduan.

### 3.5.8


* RTCSession: handle incoming BYE in WAITING_FOR_ANSWER state. #665. Credits to @karstenluedtke.

### 3.5.7


* Registrator: improve expires maths. Credits to Roman Shpount.

### 3.5.6


* Registrator: improve expires maths. Credits to Roman Shpount.

### 3.5.5


* JsSIP.d.ts: import and export in two steps. #651. Credits to @ashlanderDesign.

### 3.5.4


* Fix request cseq upon 491 response (#653). Credits to @mattdimeo.
* UA: Allow to change authorization_user (#652). Credits to @jose-lopes.

### 3.5.3


* RTCSession: force gather candidates when iceRestart is true (#641). Credits to @jose-lopes.
* Fix crash if the request does not have Content-Type header (#650). Credits to @hxl-dy

### 3.5.2


* Fix Via 'port' parser (#642).

### 3.5.1


* Export Socket interface (#637).

### 3.5.0


* Typescript typings (#627).

### 3.4.4


* Clone optional objects (#625). Credits to @acharlop.
* RTCSession: fix, allow initial INVITE no SDP/offer (#624). Credits to @mgoodenUK.

### 3.4.3


* Transactions: destroy transaction in Timer I after terminating. Thanks Juha Heinanen for reporting the issue.

### 3.4.2


* RTCSession: disable remote hold state when receiving an INVITE without SDP (#613). Credits to @RobyMcAndrew.


### 3.4.1


* RequestSender: fix Authorization header addition for jwt use.


### 3.4.0


* Add `authorization_jwt` configuration parameter (#610). Credits to @voicenter.


### 3.3.11


* RTCSession: don't relay on 'icecandidate' event with null candidate (#598). Thanks @skanizaj.


### 3.3.10


* RTCSession: honor BYE while in WAITING_FOR_ACK state (#597). Thanks @Egorikhin.


### 3.3.9


* Added NOTIFY to allowed methods (#593). Credits to @ikq.


### 3.3.8


* Move connection recovery defaults to Constants (#593). Credits to @KraftyKraft.


### 3.3.7


* Add referred-by header to refer messages (#572). Credits to @swysor.


### 3.3.6


* Fix NameAddrHeader `display_name` handling (#573). Credits to @nicketson.


### 3.3.5


* Add `.babelrc` into `.npmignore` (related to #489).
* Update deps.


### 3.3.4


* Add debugging logs in DigestAuthentication.js (related to #561).
* Update deps.


### 3.3.3


* Registrator: Don't check Contact header if final response is not 2XX (#558). Thanks @ikq for reporting.
* Update deps.


### 3.3.2


* Registrator. Support multiple entries in the same Contact header field (#544).


### 3.3.1


* RTCSession: fire 'sdp' event on renegotiation (#543).


### 3.3.0


* UA: new 'sipEvent' event for out of dialog NOTIFY requests.


### 3.2.17


* InviteClientTransaction: Add full route set to ACK and CANCEL requests. Thanks @nicketson.
* RTCSession: switch to tracks from deprecated stream API. Thanks @nicketson.


### 3.2.16


* Fix typos thanks to the [LGTM](https://lgtm.com/projects/g/versatica/JsSIP/alerts/?mode=list) project.
* Update deps.


### 3.2.15


* Remove `webrtc-adapter` dependency. It's up to the application developer whether to include it into his application or not.
* Update dependencies.


### 3.2.14


* Revert previous release. Requires a mayor version upgrade for such a cosmetic change.


### 3.2.13


* Close #521, #534. RTCSession: Fix 'connection' event order on outgoing calls.


### 3.2.12


* Update deps.
* Add missing `error` in 'getusermediafailed' event (thanks @jonastelzio).


### 3.2.11


* Close #519. Parser: Do not overwrite unknwon header fields. Thanks @rprinz08.


### 3.2.10


* Include the NPM **events** dependency for those who don't use **browserify** but **webpack**.


### 3.2.9


* RTCSession: Add Contact header to REFER request. Thanks Julien Royer for reporting.


### 3.2.8


* Fix #511. Add missing payload on 'UA:disconnected' event.


### 3.2.7


* Fix regression (#509): ua.call() not working if stream is given.


### 3.2.6


* RTCSession: custom local description trigger support


### 3.2.5


* RTCSession: prefer promises over callbacks for readability.


### 3.2.4


* Config: #494. Switch Socket check order. Thanks 'Igor Kolosov'.


### 3.2.3


* RTCSession: Fix #492. Add missing log line for RTCPeerConnection error.


### 3.2.2


* Remove wrong NPM dependencies.


### 3.2.1


* Fix parsing of NOTIFY bodies during a REFER transaction (fixes #493).


### 3.2.0


* Config: new configuration parameter 'user_agent'
* RTCSession/Info: Fix. Call session.sendRequest() with the correct parameters
* Config: Fix #491. Implement all documented flavours of 'sockets' parameter


### 3.1.4


* Fix #482 and cleanup Registrator.js


### 3.1.3


* Produce ES5 tree and expose it as main in package.json (related to #472)
* Fix #481. ReferSubscriber: properly access RTCSession non-public attributes


### 3.1.2


* RTCSession: emit 'sdp' event before creating offer/answer


### 3.1.1


* DigestAuthentication: fix 'auth-int' qop authentication
* DigestAuthentication: add tests


### 3.1.0


* New UA configuration parameter 'session_timers_refresh_method'. Thanks @michelepra


### 3.0.28


* Fix improper call to userMediaSucceeded. Thanks @iclems


### 3.0.27


* Registrator: add missing getter. Thanks Martin Ekblom.


### 3.0.26


* Fix #473. Typo. Thanks @ikq.


### 3.0.25


* Use promise chaining to prevent PeerConnection state race conditions. Thanks @davies147


### 3.0.24


* Fix #421. Fire RTCSession 'peerconnection' event as soon as its created


### 3.0.23


* Fix typo. Thanks @michelepra.


### 3.0.22


* Tests: enable test-UA-no-WebRTC tests.
* WebSocketInterface: uppercase the via_transport attribute.
* Fix #469. new method InitialOutgoingInviteRequest::clone().


### 3.0.21


* WebSocketInterface: Add 'via_transport' setter.


### 3.0.20


* Fix typo on ES6 transpiling.


### 3.0.19


* ES6 transpiling. Modernize full JsSIP code.


### 3.0.18


* Dialog: ACK to initial INVITE could have lower CSeq than current remote_cseq.


### 3.0.17


* RTCSession: process INFO in early state.


### 3.0.16


* Fix #457. Properly retrieve ReferSubscriber. Thanks @btaens.


### 3.0.15


* Fix #457. Support NOTIFY requests to REFER subscriptions without Event id parameter.


### 3.0.14


* Update dependencies.


### 3.0.13


* `Registrator`: Don't send a Register request if another is on progress. Thanks to Paul Grebenc.


### 3.0.12


* `UA`: Add `registrationExpiring` event (#442). Credits to @danjenkins.


### 3.0.11


* `RTCSession`: Emit "peerconnection" also for incoming calls.


### 3.0.10


* Emit SDP before new `RTCSessionDescription`. Thanks to @StarLeafRob.


### 3.0.8


* Generic SIP INFO support.


### 3.0.7


* Fix #431. Fix UA's `disconnect` event by properly providing an object with all the documente fields (thanks @nicketson for reporting it).


### 3.0.6


* Fix #428. Don't use `pranswer` for early media. Instead create an `answer` and do a workaround when the 200 arrives.


### 3.0.5


* Update deps.
* Add more debug logs into `RTCSession` class.


### 3.0.4


* Update deps.
* If ICE fails, terminate the session with status code 408.


### 3.0.3


* Fix #426. Properly emit DTMF events.


### 3.0.2


* Fix #418. Incorrect socket status on failure.


### 3.0.1


* Close #419. Allow sending the DTMF 'R' key. Used to report a hook flash.


### 3.0.0


* Remove `rtcninja` dependency. Instead use `webrtc-adapter`.
* `RTCSession:`: Remove `RTCPeerConnection` event wrappers. The app can access them via `session.connection`.
* `RTCSession:`: Emit WebRTC related events when internal calls to `getUserMedia()`, `createOffer()`, etc. fail.
* Use debug NPM fixed "2.0.0" version (until a pending bug in such a library is fixed).
* `UA`: Remove `ws_servers` option.
* `UA`: Allow immediate restart


### 2.0.6


* Improve library logs.


### 2.0.5


* Update dependencies.


### 2.0.4


* Fix #400. Corrupt NPM packege.


### 2.0.3


* Fix #385. No CANCEL request sent for authenticated requests.


### 2.0.2


* Fix `gulp-header` dependency version.


### 2.0.1


* Export `JsSIP.WebSocketInterface`.


### 2.0.0


* New 'contact_uri' configuration parameter.
* Remove Node websocket dependency.
* Fix #196. Improve 'hostname' parsing.
* Fix #370. Outgoing request instance being shared by two transactions.
* Fix #296. Abrupt transport disconnection on UA.stop().
* Socket interface. Make JsSIP socket agnostic.


### 1.0.1


* Update dependencies.


### 1.0.0


* `RTCSession`: new event on('sdp') to allow SDP modifications.


### 0.7.23


* `RTCSession`: Allow multiple calls to `refer()` at the same time.


### 0.7.22


* `UA`: `set()` allows changing user's display name.
* Ignore SDP answer in received ACK retransmissions (fix [367](https://github.com/versatica/JsSIP/issues/367)).


### 0.7.21


* `RTCSession`: Also emit `peerconnection` event for incoming INVITE without SDP.


### 0.7.20


* `RTCSession/ReferSubscriber`: Fix typo that breaks exposed API.


### 0.7.19


* `RTCSession`: Make `refer()` method to return the corresponding instance of `ReferSubscriber` so the app can set and manage as many events as desired on it.


### 0.7.18


* Add INFO method to allowed methods list
* Add SIP Code 424 RFC 6442


### 0.7.17


* Apply changes of 0.7.16 also to browserified files under `dist/` folder.


### 0.7.16


* Fix [337](https://github.com/versatica/JsSIP/issues/337). Consistenly indicate registration status through events.


### 0.7.15


* Emit UA 'connected' event before sending REGISTER on transport connection
* Fix [355](https://github.com/versatica/JsSIP/pull/355 ). call to non existent `parsed.error` function. Thanks Stéphane Alnet @shimaore


### 0.7.14


* Fix sips URI scheme parsing rule.


### 0.7.13


* Fix. Don't lowercase URI parameter values. Thanks to Alexandr Dubovikov @adubovikov


### 0.7.12


* Accept new `UA` configuration parameters `ha1` and `realm` to avoid plain SIP password handling ([issue 353](https://github.com/versatica/JsSIP/issues/353)).
* New `UA.set()` and `UA.get()` methods to set and retrieve computed configuration parameters in runtime.


### 0.7.11


* Fix typo ("iceconnetionstatechange" => "iceconnectionstatechange"). Thanks to Vertika Srivastava.


### 0.7.10


* Make `gulp` run on Node 4.0.X and 5.0.X.


### 0.7.9


* `UA`: Add `set(parameter, value)` method to change a configuration setting in runtime (currently just "password" is implemented).


### 0.7.8


* `RTCSession`: Add `resetLocalMedia()` method to reset the session local MediaStream by enabling both its audio and video tracks (unless the remote peer is on hold).


### 0.7.7


* `RTCSession`: Add "sending" event to outgoing, a good chance for the app to mangle the INVITE or its SDP offer.


### 0.7.6


* Update dependencies.
* Improve gulpfile.js.


### 0.7.5


* Don't ask for `getUserMedia` in `RTCSession.answer()` if no `mediaConstraints` are provided.


### 0.7.4


* Allow rejecting an in-dialog INVITE or UPDATE message.


### 0.7.3


* FIX properly restart UA if start() is called while closing.


### 0.7.2


* Update dependencies.


### 0.7.1


* Update dependencies.


### 0.7.0


* Add REFER support.


### 0.6.33


* Don't keep URI params&headers in the registrar server URI.
* `RTCSession` emits `peerconnection` for outgoing calls once the `RTCPeerConnection` is created and before the SDP offer is generated (good chance to create a `RTCDataChannel` without requiring renegotiation).


### 0.6.32


* Add callback to `update` and `reinvite` events.


### 0.6.31


* Added a parser for Reason header.


### 0.6.30


* Fix array iteration in `URI#toString()` to avoid Array prototype mangling by devil libraries such as Ember.


### 0.6.29


* Auto-register on transport connection before emitting the event.


### 0.6.28


* Update "rtcninja" dependencie.


### 0.6.27


* Don't terminate SIP dialog if processing of 183 with SDP fails.
* Update dependencies.


### 0.6.26


* Update "rtcninja" dependency.


### 0.6.25


* Update "rtcninja" dependency.


### 0.6.24


* RTCSession: Fix Invite Server transaction destruction.


### 0.6.23


* RTCSession: Handle session timers before emitting "accepted".
* Fix issue with latest version of browserify.


### 0.6.22


* Fix double "disconnected" event in some cases.


### 0.6.21


* Don't iterate arrays with (for...in) to avoid problems with evil JS libraries that add stuff into the Array prototype.


### 0.6.20


* Be more flexible receiving DTMF INFO bodies.


### 0.6.19


* Update dependencies.
 

### 0.6.18


* Terminate the call with a proper BYE/CANCEL/408/500 if request timeout, transport error or dialog error happens.
* Fix "rtcninja" dependency problem.


### 0.6.17


* `RTCSession`: Improve `isReadyToReOffer()`.


### 0.6.16


* `RTCSession`: Avoid calling hold()/unhold/renegotiate() if an outgoing renegotiation is not yet finished (return false).
* `RTCSession`: Add `options` and `done` arguments to hold()/unhold/renegotiate().
* `RTCSession`: New public method `isReadyToReOffer()`.


### 0.6.15


* `RTCSession:` Emit `iceconnetionstatechange` event.
* Update "rtcninja" dependency to 0.4.0.


### 0.6.14


* `RTCSession:` Include initially given `rtcOfferConstraints` in `sendReinvite()` and `sendUpdate()`.


### 0.6.13


* Properly keep mute local audio/video if remote is on hold, and keep it even if we re-offer. Also fix SDP direction attributes in re-offers according to current local and remote "hold" status.


### 0.6.12


* Update "rtcninja" dependency to 0.3.3.


### 0.6.11


* Fix "Session-Expires" default value to 90 seconds.


### 0.6.10


* Update "rtcninja" dependency to 0.3.2.


### 0.6.9


* Don't reply 405 "Method Not Supported" to re-INVITE even if the UA's "newRTCSession" event is not set.
* `RTCSession`: Allow extraHeaders in `renegotiate()`.


### 0.6.8


* `RTCSession`: Don't ask for `getUserMedia()` in outgoing calls if `mediaConstraints` is `{audio:false, video:false}`. It is user's responsability to, in that case, provide `offerToReceiveAudio/Video` in `rtcOfferConstraints`.


### 0.6.7


* ' UA.call()': Return the `RTCSession` instance.
* ' UA.sendMessage()': Return the `Message` instance.


### 0.6.6


* `RTCSession`: Don't process SDPs in retranmissions of 200 OK during reINVITE/UDATE.
* `RTCSession`: Emit 'reinvite' when a reINVITE is received.
* `RTCSession`: Emit 'update' when an UPDATE is received.


### 0.6.5


* `RTCSession`: Don't override `this.data` on `answer()` (unless `options.data` is given).


### 0.6.4


* `RTCSession#connect()`: Add `rtcAnswerContraints` options for later incoming reINVITE or UPDATE with SDP offer.
* `RTCSession#answer()`: Add `rtcOfferConstraints` options for later incoming reINVITE without SDP offer.
* `RTCSession#renegotiate()`: Add `rtcOfferConstraints` options for the UPDATE or reINVITE.
* `RTCSession#answer()`: Remove audio or video from the given `getUserMedia` mediaConstraints if the incoming SDP has no audio/video sections.


### 0.6.3


* Bug fix. Properly cancel when only '100 trying' has been received.


### 0.6.2


* Bug fix: Do not set "Content-Type: application/sdp" in body-less UPDATE requests.


### 0.6.1


* Support for [Session Timers](https://tools.ietf.org/html/rfc4028).


### 0.6.0


* [debug](https://github.com/visionmedia/debug) module.
* [rtcninja](https://github.com/ibc/rtcninja.js) module.
* Can renegotiate an ongoing session by means of a re-INVITE or UPDATE method (useful if the local stream attached to the `RTCPeerConnection` has been modified).
* Improved hold/unhold detection.
* New API options for `UA#call()` and `RTCSession#answer()`.


### 0.5.0


* JsSIP runs in Node!
* The internal design of JsSIP has also been modified, becoming a real Node project in which the "browser version" (`jssip-0.5.0.js` or `jssip-0.5.0.min.js`) is generated with [browserify](http://browserify.org). This also means that the browser version can be loaded with AMD or CommonJS loaders.

### 0.4.3


* [(3b1ee11)](https://github.com/versatica/JsSIP/commit/3b1ee11) Fix references to 'this'.


### 0.4.2


* [(ca7702e)](https://github.com/versatica/JsSIP/commit/ca7702e) Fix #257. RTCMediaHandler: fire onIceCompleted() on next tick to avoid events race conditions in Firefox 33.

### 0.4.1


* This version is included into the [Bower](https://bower.io/) registry which means `$ bower install jssip`.


### 0.4.0


* (https://jssip.net/documentation/0.4.x/api/session) Hold/Unhold implementation
* (https://jssip.net/documentation/0.4.x/api/session) Mute/Unmute implementation
* (https://jssip.net/documentation/0.4.x/api/ua_configuration_parameters/#instance_id) New 'instance_id' configuration parameter
* (https://jssip.net/documentation/0.4.x/api/ua_configuration_parameters/#log) New 'log' configuration parameter
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


### 0.3.0
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
* [(f306d3c)](https://github.com/versatica/JsSIP/commit/f306d3c) hack_ip_in_contact now generates a IP in the range of Test-Net as stated in RFC 5735.
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


### 0.2.1


* [(24e32c0)](https://github.com/versatica/JsSIP/commit/24e32c0d16ff5fcefd2319fc445a59d6fc2bcb59) UA configuration `password` parameter is now optional.
* [(ffe7af6)](https://github.com/versatica/JsSIP/commit/ffe7af6276915695af9fd00db281af51fec2714f) Bug fix: UA configuration `display_name` parameter.
* [(aa51291)](https://github.com/versatica/JsSIP/commit/aa512913733a4f63af066b0a9e12a8e38f2a5acb) Bug fix: Allows multibyte symbols in UA configuration `display_name` parameter (and require not to write it between double quotes).
* [(aa48201)](https://github.com/versatica/JsSIP/commit/aa48201) Bug fix: "cnonce" value value was not being quoted in Digest Authentication (reported by [vf1](https://github.com/vf1)).
* [(1ecabf5)](https://github.com/versatica/JsSIP/commit/1ecabf5) Bug fix: Fixed authentication for in-dialog requests (reported by [vf1](https://github.com/vf1)).
* [(11c6bb6)](https://github.com/versatica/JsSIP/commit/11c6bb6aeef9de3bf2a339263f620b1caf60d634) Allow receiving WebSocket binary messages (code provided by [vf1](https://github.com/vf1)).
* [(0e8c5cf)](https://github.com/versatica/JsSIP/commit/0e8c5cf) Bug fix: Fixed Contact and Record-Route header split (reported by Davide Corda).
* [(99243e4)](https://github.com/versatica/JsSIP/commit/99243e4) Fixed BYE and ACK error handling.
* [(0c91285)](https://github.com/versatica/JsSIP/commit/0c91285) Fixed failure causes in 'registrationFailed' UA event.


### 0.2.0


* First stable release with full website and documentation.
* Refactored sessions, message and events API.


### 0.1.0


* First release. No documentation.


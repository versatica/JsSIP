
/**
 * @fileoverview Server Invite Session
 */

/**
 * @augments JsSIP.Session
 * @class Class creating an incoming call.
 * @param {JsSIP.IncomingRequest} request
 * @param {JsSIP.UA} ua
 */
JsSIP.IncomingSession = function(ua, request) {
    this.ua = ua;
    this.from_tag = request.from_tag;
    this.status = JsSIP.c.SESSION_INVITE_RECEIVED;
    this.id = request.call_id + this.from_tag;

    this.initEvents(this.events);

    // Self contact value. _gruu_ or not.
    if (ua.contact.pub_gruu) {
      this.contact = ua.contact.pub_gruu;
    } else {
      this.contact = ua.contact.uri;
    }

    //Save the session into the ua sessions collection.
    this.ua.sessions[this.id] = this;

    this.receiveInitialRequest(ua, request);
};
JsSIP.IncomingSession.prototype = new JsSIP.Session();

JsSIP.IncomingSession.prototype.receiveInitialRequest = function(ua, request) {
  var body, contentType, expires,
    session = this;

  //Get the Expires header value if exists
  if(request.hasHeader('expires')) {
    expires = request.getHeader('expires') * 1000;
    this.expiresTimer = window.setTimeout(function() { session.expiresTimeout(request); }, expires);
  }

  // Process the INVITE request
  body = request.body;
  contentType = request.getHeader('Content-Type');

  // Request with sdp Offer
  if(body && (contentType === 'application/sdp')) {
    // ** Set the to_tag before replying a response code that will create a dialog
    request.to_tag = JsSIP.utils.newTag();

    if(!this.createEarlyDialog(request, 'UAS')) {
      return;
    }

    request.reply(180,
                  JsSIP.c.REASON_180, {
                    'Contact': '<' + this.contact + '>'}
                );

    this.status = JsSIP.c.SESSION_WAITING_FOR_ANSWER;

    this.userNoAnswerTimer = window.setTimeout(
      function() { session.userNoAnswerTimeout(request); },
      ua.configuration.no_answer_timeout
    );

    /**
    * Answer the call.
    * @param {HTMLVideoElement} selfView
    * @param {HTMLVideoElement} remoteView
    */
    this.answer = function(selfView, remoteView) {
      var offer, onMediaSuccess, onMediaFailure, onSdpFailure;

      if(session.status === JsSIP.c.SESSION_WAITING_FOR_ANSWER) {
        offer = request.body;

        onMediaSuccess = function() {
          var sdp = session.mediaSession.peerConnection.localDescription.sdp;

          if(!session.createConfirmedDialog(request, 'UAS')) {
            return;
          }

          request.reply(200, JsSIP.c.REASON_200, {
            'Contact': '<' + session.contact + '>'},
            sdp,
            // onSuccess
            function(){
              session.status = JsSIP.c.SESSION_WAITING_FOR_ACK;

              session.invite2xxTimer = window.setTimeout(
                function() {session.invite2xxRetransmission(1, request,sdp);},JsSIP.Timers.T1
              );

              window.clearTimeout(session.userNoAnswerTimer);

              session.ackTimer = window.setTimeout(
                function() { session.ackTimeout(); },
                JsSIP.Timers.TIMER_H
              );

              session.started('local');
            },
            // onFailure
            function() {
              this.failed('system', null, JsSIP.c.causes.CONNECTION_ERROR);
            }
          );
        };

        onMediaFailure = function(e) {
          // Unable to get User Media
          request.reply(486, JsSIP.c.REASON_486);
          this.failed('local', null, JsSIP.c.cuses.USER_DENIED_MEDIA_ACCESS);
        };

        onSdpFailure = function(e) {
          /* Bad SDP Offer
           * peerConnection.setRemoteDescription thows an exception
           */
          console.log(JsSIP.c.LOG_SERVER_INVITE_SESSION +'PeerConnection Creation Failed: --'+e+'--');
          request.reply(488, JsSIP.c.REASON_488);
          this.failed('remote', request, JsSIP.causes.BAD_MEDIA_DESCRIPTION);
        };

        //Initialize Media Session
        session.mediaSession = new JsSIP.MediaSession(session, selfView, remoteView);
        session.mediaSession.startCallee(onMediaSuccess, onMediaFailure, onSdpFailure, offer);
      } else {
        console.warn(JsSIP.c.LOG_SERVER_INVITE_SESSION +'No call waiting for answer');
      }
    };

    /**
    * Reject the call
    * @private
    */
    this.reject = function() {
      if (this.status === JsSIP.c.SESSION_WAITING_FOR_ANSWER) {
        request.reply(486, JsSIP.c.REASON_486);

        this.failed('local', null, JsSIP.c.causes.REJECTED);
      }
    };

    // Fire 'call' event callback
    this.new_session('remote', request);
  } else {
    request.reply(415, JsSIP.c.REASON_415);
  }
};

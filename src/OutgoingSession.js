
/**
 * @fileoverview Client Invite Session
 */

/**
 * @augments JsSIP.Session
 * @class Class creating an outgoing call
 *
 * @param {JsSIP.UA} ua
 * @param {String} target
 * @param {HTMLVideoElement} selfView
 * @param {HTMLVideoElement} remoteView
 * @param {Object} mediaType
 */
JsSIP.OutgoingSession = (function() {

  var OutgoingSession = function(ua, target, selfView, remoteView, mediaType) {
    var request;

    // Session parameter initialization
    this.ua = ua;
    this.from_tag = JsSIP.utils.newTag();
    this.status = JsSIP.c.SESSION_NULL;
    this.mediaSession = new JsSIP.MediaSession(this, selfView, remoteView);

    // OutgoingSession specific parameters
    this.isCanceled = false;
    this.received_100 = false;

    this.initEvents(this.events);

    // Self contact value. _gruu_ or not.
    if (ua.contact.pub_gruu) {
      this.contact = ua.contact.pub_gruu;
    } else {
      this.contact = ua.contact.uri;
    }

    request = new JsSIP.OutgoingRequest( JsSIP.c.INVITE, target, ua, {
      from_tag: this.from_tag }, {
        'contact': '<' + this.contact + ';ob>',
        'allow': JsSIP.c.ALLOWED_METHODS,
        'content-type': 'application/sdp'
      });

    this.id = request.headers['Call-ID'] + this.from_tag;

    //Save the session into the ua sessions collection.
    this.ua.sessions[this.id] = this;
    this.send = function() {
      new InitialRequestSender(this, ua, request, mediaType);
    };

    /**
    * @private
    */
    this.cancel = function() {
      if (this.status === JsSIP.c.SESSION_INVITE_SENT) {
        if(this.received_100) {
          request.cancel();
        } else {
          this.isCanceled = true;
        }
      } else if(this.status === JsSIP.c.SESSION_1XX_RECEIVED) {
        request.cancel();
      }
      this.close('terminate', [JsSIP.c.SESSION_TERMINATE_USER_CANCELED]);
    };
  };
  OutgoingSession.prototype = new JsSIP.Session();


  /**
  * This logic is applied for each received stimulus (100,1xx,10xx_answer, etc.)
  * for each possible Session status (invite_sent, early, etc.)
  *
  * @private
  */
  OutgoingSession.prototype.receiveInitialRequestResponse = function(label, response) {
    var session = this;

    if(this.status === JsSIP.c.SESSION_INVITE_SENT || this.status === JsSIP.c.SESSION_1XX_RECEIVED) {
      switch(label) {
        case 100:
          this.received_100 = true;
          break;
        case '1xx':
        // same logic for 1xx and 1xx_answer
        case '1xx_answer':
          // Create Early Dialog
          if(!this.createEarlyDialog(response, 'UAC')) {
            break;
          }

          this.status = JsSIP.c.SESSION_1XX_RECEIVED;
          this.emit('ring');
          break;
        case '2xx':
          // Dialog confirmed already
          if (this.dialog) {
            if (response.to_tag === this.to_tag) {
              console.log(JsSIP.c.LOG_CLIENT_INVITE_SESSION +'2xx retransmission received');
            } else {
              console.log(JsSIP.c.LOG_CLIENT_INVITE_SESSION +'2xx received from an endpoint not stablishing the dialog');
            }
            return;
          }

          this.acceptAndTerminate(response,'SIP ;cause= 400 ;text= "Missing session description"');
          this.close('terminate', [JsSIP.c.SESSION_TERMINATE_BAD_MEDIA_DESCRIPTION]);
          break;
        case '2xx_answer':
          // Dialog confirmed already
          if (this.dialog) {
            if (response.to_tag === this.to_tag) {
              console.log(JsSIP.c.LOG_CLIENT_INVITE_SESSION +'2xx_answer retransmission received');
            } else {
              console.log(JsSIP.c.LOG_CLIENT_INVITE_SESSION +'2xx_answer received from an endpoint not stablishing the dialog');
            }
            return;
          }

          this.mediaSession.onMessage(
            this.mediaSession.peerConnection.SDP_ANSWER,
            response.body,
            /*
            * OnSuccess.
            * SDP Answer fits with Offer. MediaSession will start.
            */
            function(){
              if(!session.createConfirmedDialog(response, 'UAC')) {
                return;
              }
              session.sendACK();
              session.status = JsSIP.c.SESSION_CONFIRMED;
              session.emit('answer');
            },
            /*
            * OnFailure.
            * SDP Answer does not fit with Offer. Accept the call and Terminate.
            */
            function(e) {
              console.warn(e);
              session.acceptAndTerminate(response, 'SIP ;cause= 488 ;text= "Not Acceptable Here"');
              session.close('terminate', [JsSIP.c.SESSION_TERMINATE_BAD_MEDIA_DESCRIPTION]);
            }
          );
          break;
        case 'failure':
          this.close('failure',[response.status_code, response.reason_phrase]);
          break;
      }
    }
  };

  /**
  * @private
  */
  var InitialRequestSender = function(session, ua, request, mediaType) {
    var
      self = this,
      label = null;

    this.request = request;

    function send() {
      var request_sender = new JsSIP.RequestSender(self, ua);

      self.receiveResponse = function(response) {
        switch(true) {
          case /^100$/.test(response.status_code):
            session.received_100 = true;
            break;
          case /^1[0-9]{2}$/.test(response.status_code):
            if(!response.to_tag) {
              // Do nothing with 1xx responses without To tag.
              break;
            }
            if(response.body) {
              label = '1xx_answer';
            } else {
              label = '1xx';
            }
            break;
          case /^2[0-9]{2}$/.test(response.status_code):
            if(response.body) {
              label = '2xx_answer';
            } else {
              label = '2xx';
            }
            break;
          default:
            label = 'failure';
        }

        // Proceed to cancelation if the user requested.
        if(session.isCanceled) {
          if(response.status_code >= 100 && response.status_code < 200) {
            self.request.cancel();
          } else if(response.status_code >= 200 && response.status_code < 299) {
            session.sendACK(request);
            session.sendBye();
            self.request.send();
          }
        // Process the response otherwhise.
        } else {
          session.receiveInitialRequestResponse(label, response);
        }
      };

      self.onRequestTimeout = function() {
        session.onRequestTimeout();
      };

      self.onTransportError = function() {
        session.onTransportError();
      };

      request_sender.send();
    }

    function onMediaSuccess() {
      if (session.status === JsSIP.c.SESSION_TERMINATED) {
        session.mediaSession.close();
        return;
      }

      // Set the body to the request and send it.
      request.body = session.mediaSession.peerConnection.localDescription.toSdp();
      session.status = JsSIP.c.SESSION_INVITE_SENT;
      send();
    }

    function onMediaFailure(fail,e) {
      if (fail === 'addStream') {
        console.log(JsSIP.c.LOG_CLIENT_INVITE_SESSION +'PeerConnection Creation Failed: '+ e);
        session.close('terminate', [JsSIP.c.SESSION_TERMINATE_BAD_MEDIA_DESCRIPTION]);
      } else if (fail === 'getUserMedia') {
        console.log(JsSIP.c.LOG_CLIENT_INVITE_SESSION +'Media Access denied');
        session.close('terminate', [JsSIP.c.SESSION_TERMINATE_USER_DENIED_MEDIA_ACCESS]);
      }
    }

    session.mediaSession.startCaller(mediaType, onMediaSuccess, onMediaFailure);
  };

  return OutgoingSession;
}());
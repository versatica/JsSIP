
/*global SessionDescription: false, webkitURL: false, webkitPeerConnection00: false*/

/**
 * @fileoverview SIP User Agent
 */

/**
 * @augments JsSIP
 * @class PeerConnection helper Class.
 * @param {JsSIP.OutgoingSession|JsSIP.IncomingSession} session
 * @param {HTMLVideoElement} selfView
 * @param {HTMLVideoElement} remoteView
 */
JsSIP.MediaSession = function(session, selfView, remoteView) {
  this.session = session;
  this.selfView = selfView || null;
  this.remoteView = remoteView || null;
  this.localMedia = null;
  this.peerConnection = null;
};

JsSIP.MediaSession.prototype = {
  /**
   * Stablish peerConnection for Caller.
   * <br> - Prompt the user for permission to use the Web cam or other video or audio input.
   * <br> -- If the user consents, create a peerConnection.
   * <br> -- If the user doesn't consent, fire onFailure callback.
   *
   * @param {Object} mediaType {audio:true/false, video:true/false}
   * @param {Function} onSuccess
   * @param {Function} onFailure
   */
  startCaller: function(mediaType, onSuccess, onFailure) {
    var self = this;

    /** @private */
    function onGetUserMediaSuccess(stream) {
      var offer;

      // Start peerConnection
      self.start(onSuccess, onFailure);

      // add stream to peerConnection
      try {
        self.peerConnection.addStream(stream);
      } catch (e) {
        onFailure('addSstream',e);
      }

      // Set local description and start Ice.
      offer = self.peerConnection.createOffer();
      self.peerConnection.setLocalDescription(self.peerConnection.SDP_OFFER, offer);
      self.peerConnection.startIce();
    }

    /** @private */
    function onGetUserMediaFailure() {
      onFailure('getUserMedia');
    }

    this.getUserMedia(mediaType, onGetUserMediaSuccess, onGetUserMediaFailure);
  },

  /**
  * Stablish peerConnection for Callee.
  * <br> - Prompt the user for permission to use the Web cam or other video or audio input.
  * <br> -- If the user consents, create a peerConnection.
  * <br> -- If the user doesn't consent, fire onMediaFailure callback.
  * <br>
  * <br> - Set the received SDP offer to the just created peerConnection.
  * <br> -- If the SDP offer is not valid, fire onSdpFailure callback.
  * <br> -- If the SDP offer is valid, fire onSuccess callback
  *
  * @param {Function} onSuccess
  * @param {Function} onMediaFailure
  * @param {Function} onSdpFailure
  * @param {String} sdp
  */
  startCallee: function(onSuccess, onMediaFailure, onSdpFailure, sdp) {
    var offer, mediaType,
      self = this;

    function onGetUserMediaSuccess(stream) {
      // add stream to peerConnection
      self.peerConnection.addStream(stream);

      // Create sdp answer
      var answer = self.peerConnection.createAnswer(sdp, mediaType);
      self.peerConnection.setLocalDescription(self.peerConnection.SDP_ANSWER, answer);

      self.peerConnection.startIce();
    }

    function onGetUserMediaFailure() {
      onMediaFailure();
    }

    this.start(onSuccess);

    this.peerConnection.onaddstream = function(mediaStreamEvent) {
      var audio, video;

      audio = (mediaStreamEvent.stream.audioTracks.length > 0)? true: false;
      video = (mediaStreamEvent.stream.videoTracks.length > 0)? true: false;

      mediaType = {'audio':audio, 'video':video};

      // Attach stream to remoteView
      self.remoteView.src = webkitURL.createObjectURL(mediaStreamEvent.stream);

      self.getUserMedia(mediaType, onGetUserMediaSuccess, onGetUserMediaFailure);
    };

    // Set the comming sdp offer as remoteDescription
    offer  = new SessionDescription(sdp);

    console.log(offer.toSdp());

    try {
      this.peerConnection.setRemoteDescription(this.peerConnection.SDP_OFFER, offer);
    } catch (e) {
      onSdpFailure(e);
    }
  },

  /**
  * peerConnection creation.
  * @param {Function} onSuccess Fired when there are no more ICE candidates
  */
  start: function(onSuccess) {
    var
      session = this,
      sent = false;

    this.peerConnection = new webkitPeerConnection00('STUN '+ this.session.ua.configuration.stun_server,
      function(candidate, more) {
        if (candidate) {
          console.log(JsSIP.c.LOG_MEDIA_SESSION +'ICE candidate received: '+ candidate.toSdp());
        }
        if (!more) {
          console.info(JsSIP.c.LOG_MEDIA_SESSION +'No more ICE candidate');
          console.log(JsSIP.c.LOG_MEDIA_SESSION +'Peerconnection status: '+ this.readyState);
          console.log(JsSIP.c.LOG_MEDIA_SESSION +'Ice Status: '+ this.iceState);
          if (!sent) { // Execute onSuccess just once.
            sent = true;
            onSuccess();
          }
        }
      }
    );

    this.peerConnection.onopen = function() {
      console.log(JsSIP.c.LOG_MEDIA_SESSION +'Media session oppened');
    };

    this.peerConnection.onaddstream = function(mediaStreamEvent) {

      console.warn('stream added');

      switch (this.readyState) {
        // 1st called when a stream arrives from caller.
        case this.OPENING:
          if (session.remoteView && this.remoteStreams.length > 0) {
            session.remoteView.src = webkitURL.createObjectURL(mediaStreamEvent.stream);
          }
          break;
        case this.ACTIVE:
          // Attach the stream to session`s remoteView
          // 1st called when a stream arrives from callee.
          if (session.remoteView && this.remoteStreams.length > 0) {
            session.remoteView.src = webkitURL.createObjectURL(mediaStreamEvent.stream);
          }
          break;
      }
    };

    this.peerConnection.onremovestream = function(stream) {
      console.log(JsSIP.c.LOG_MEDIA_SESSION +'Stream rmeoved: '+ stream);
    };

    this.peerConnection.onstatechange = function() {
      console.warn('Status changed to: '+ this.readyState);
      console.warn('ICE state is: '+ this.iceState);
    };
  },

  close: function() {
    console.log(JsSIP.c.LOG_MEDIA_SESSION +'Closing peerConnection');
    if(this.peerConnection) {
      this.peerConnection.close();

      if(this.localMedia) {
        this.localMedia.stop();
      }
    }
  },

  /**
  * @param {Function} onSuccess
  * @param {Function} onFailure
  * @param {Object} mediaType
  */
  getUserMedia: function(mediaType, onSuccess, onFailure) {
    var self = this;

    function getSuccess(stream) {
      console.log(JsSIP.c.LOG_MEDIA_SESSION +"Got stream " + stream);

      //Save the localMedia in order to revoke access to devices later.
      self.localMedia = stream;

      // Attach the stream to the view if it exists.
      if (self.selfView){
        self.selfView.src = webkitURL.createObjectURL(stream);
      }

      onSuccess(stream);
    }

    function getFailure() {
      onFailure();
    }

    // Get User Media
    console.log(JsSIP.c.LOG_MEDIA_SESSION +"Requesting access to local media.");
    navigator.webkitGetUserMedia(mediaType, getSuccess, getFailure);

  },

  /**
  * Message reception once PeerConnection is active.
  * @param {String} type
  * @param {String} sdp
  * @param {Function} onSuccess
  * @param {Function} onFailure
  */
  onMessage: function(type, sdp, onSuccess, onFailure) {
    if (type === this.peerConnection.SDP_OFFER) {
      console.log(JsSIP.c.LOG_MEDIA_SESSION +'re-Invite received');
    } else if (type === this.peerConnection.SDP_ANSWER) {
      var answer = new SessionDescription(sdp);

      console.log(answer.toSdp());
      try {
        this.peerConnection.setRemoteDescription(this.peerConnection.SDP_ANSWER, answer);
        onSuccess();
      } catch (e) {
        onFailure(e);
      }
    }
  }
};
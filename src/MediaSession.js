
/*global webkitURL: false, webkitRTCPeerConnection: false*/

/**
 * @fileoverview SIP User Agent
 */

/**
 * @augments JsSIP
 * @class PeerConnection helper Class.
 * @param {JsSIP.Session} session
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
   * Establish peerConnection for Caller.
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
      // Start peerConnection
      self.start(onSuccess);

      // add stream to peerConnection
      self.peerConnection.addStream(stream);

      // Set local description and start Ice.
      self.peerConnection.createOffer(function(sessionDescription){
        self.peerConnection.setLocalDescription(sessionDescription);
      });
    }

    /** @private */
    function onGetUserMediaFailure(e) {
      onFailure(e);
    }

    this.getUserMedia(mediaType, onGetUserMediaSuccess, onGetUserMediaFailure);
  },

  /**
  * Establish peerConnection for Callee.
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
    var self = this;

    function onGetUserMediaSuccess(stream) {
      // Start peerConnection
      self.start(onSuccess);

      // add stream to peerConnection
      self.peerConnection.addStream(stream);

      self.peerConnection.setRemoteDescription(
        new window.RTCSessionDescription({type:'offer', sdp:sdp}),
        function() {
          self.peerConnection.createAnswer(
            function(sessionDescription){
              self.peerConnection.setLocalDescription(sessionDescription);
            },
            onSdpFailure
          );
        },
        onSdpFailure
      );
    }

    function onGetUserMediaFailure(e) {
      onMediaFailure(e);
    }

    self.getUserMedia({'audio':true, 'video':true}, onGetUserMediaSuccess, onGetUserMediaFailure);
   },

  /**
  * peerConnection creation.
  * @param {Function} onSuccess Fired when there are no more ICE candidates
  */
  start: function(onSuccess) {
    var idx, server,
      session = this,
      sent = false,
      servers = [];

    for (idx in this.session.ua.configuration.stun_servers) {
      server = this.session.ua.configuration.stun_server[idx];
      servers.push({'url': server});
    }

    for (idx in this.session.ua.configuration.turn_servers) {
      server = this.session.ua.configuration.turn_servers[idx];
      servers.push({'url': server.username +'@'+ server.server, 'credential': server.password});
    }

    this.peerConnection = new webkitRTCPeerConnection({"iceServers": servers});

    this.peerConnection.onicecandidate = function(event) {
      if (event.candidate) {
        console.log(JsSIP.C.LOG_MEDIA_SESSION +'ICE candidate received: '+ event.candidate.candidate);
      } else {
        console.info(JsSIP.C.LOG_MEDIA_SESSION +'No more ICE candidate');
        console.log(JsSIP.C.LOG_MEDIA_SESSION +'Peerconnection status: '+ this.readyState);
        console.log(JsSIP.C.LOG_MEDIA_SESSION +'Ice Status: '+ this.iceState);
        if (!sent) { // Execute onSuccess just once.
          sent = true;
          onSuccess();
        }
      }
    };

    this.peerConnection.onopen = function() {
      console.log(JsSIP.C.LOG_MEDIA_SESSION +'Media session opened');
    };

    this.peerConnection.onaddstream = function(mediaStreamEvent) {
      console.warn('stream added');

      if (session.remoteView && this.remoteStreams.length > 0) {
        session.remoteView.src = webkitURL.createObjectURL(mediaStreamEvent.stream);
      }
    };

    this.peerConnection.onremovestream = function(stream) {
      console.log(JsSIP.C.LOG_MEDIA_SESSION +'Stream removed: '+ stream);
    };

    this.peerConnection.onstatechange = function() {
      console.warn('Status changed to: '+ this.readyState);
      console.warn('ICE state is: '+ this.iceState);
    };
  },

  close: function() {
    console.log(JsSIP.C.LOG_MEDIA_SESSION +'Closing peerConnection');
    if(this.peerConnection) {
      this.peerConnection.close();

      if(this.localMedia) {
        this.localMedia.stop();
      }
    }
  },

  /**
  * @param {Object} mediaType
  * @param {Function} onSuccess
  * @param {Function} onFailure
  */
  getUserMedia: function(mediaType, onSuccess, onFailure) {
    var self = this;

    function getSuccess(stream) {
      console.log(JsSIP.C.LOG_MEDIA_SESSION +"Got stream " + stream);

      //Save the localMedia in order to revoke access to devices later.
      self.localMedia = stream;

      // Attach the stream to the view if it exists.
      if (self.selfView){
        self.selfView.src = webkitURL.createObjectURL(stream);
      }

      onSuccess(stream);
    }

    function getFailure(e) {
      onFailure(e);
    }

    // Get User Media
    console.log(JsSIP.C.LOG_MEDIA_SESSION +"Requesting access to local media.");
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
    if (type === 'offer') {
      console.log(JsSIP.C.LOG_MEDIA_SESSION +'re-Invite received');
    } else if (type === 'answer') {
      this.peerConnection.setRemoteDescription(
        new window.RTCSessionDescription({type:'answer', sdp:sdp}), onSuccess, onFailure);
    }
  }
};
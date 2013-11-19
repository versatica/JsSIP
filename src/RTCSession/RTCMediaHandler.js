/**
 * @fileoverview RTCMediaHandler
 */

/* RTCMediaHandler
 * @class PeerConnection helper Class.
 * @param {JsSIP.RTCSession} session
 * @param {Object} [contraints]
 */
(function(JsSIP){

var RTCMediaHandler = function(session, constraints) {
  constraints = constraints || {};

  this.session = session;
  this.localMedia = null;
  this.peerConnection = null;

  this.init(constraints);
};

RTCMediaHandler.prototype = {

  createOffer: function(onSuccess, onFailure) {
    var
      self = this,
      sent = false;

    this.onIceCompleted = function() {
      if (!sent) {
        sent = true;
        onSuccess(self.peerConnection.localDescription.sdp);
      }
    };

    this.peerConnection.createOffer(
      function(sessionDescription){
        self.setLocalDescription(
          sessionDescription,
          onFailure
        );
      },
      function(e) {
        console.error(LOG_PREFIX +'unable to create offer');
        console.error(e);
        onFailure();
      }
    );
  },

  createAnswer: function(onSuccess, onFailure) {
    var
      self = this,
      sent = false;

    this.onIceCompleted = function() {
      if (!sent) {
        sent = true;
        onSuccess(self.peerConnection.localDescription.sdp);
      }
    };

    this.peerConnection.createAnswer(
      function(sessionDescription){
        self.setLocalDescription(
          sessionDescription,
          onFailure
        );
      },
      function(e) {
        console.error(LOG_PREFIX +'unable to create answer');
        console.error(e);
        onFailure();
      }
    );
  },

  setLocalDescription: function(sessionDescription, onFailure) {
    this.peerConnection.setLocalDescription(
      sessionDescription,
      function(){},
      function(e) {
        console.error(LOG_PREFIX +'unable to set local description');
        console.error(e);
        onFailure();
      }
    );
  },

  addStream: function(stream, onSuccess, onFailure, constraints) {
    try {
      this.peerConnection.addStream(stream, constraints);
    } catch(e) {
      console.error(LOG_PREFIX +'error adding stream');
      console.error(e);
      onFailure();
      return;
    }

    onSuccess();
  },

  /**
  * peerConnection creation.
  * @param {Function} onSuccess Fired when there are no more ICE candidates
  */
  init: function(constraints) {
    var idx, length, server,
      self = this,
      servers = [],
      config = this.session.ua.configuration;

    servers.push({'url': config.stun_servers});

    length = config.turn_servers.length;
    for (idx = 0; idx < length; idx++) {
      server = config.turn_servers[idx];
      servers.push({
        'url': server.urls,
        'username': server.username,
        'credential': server.password
      });
    }

    this.peerConnection = new JsSIP.WebRTC.RTCPeerConnection({'iceServers': servers}, constraints);

    this.peerConnection.onaddstream = function(e) {
      console.log(LOG_PREFIX +'stream added: '+ e.stream.id);
    };

    this.peerConnection.onremovestream = function(e) {
      console.log(LOG_PREFIX +'stream removed: '+ e.stream.id);
    };

    this.peerConnection.onicecandidate = function(e) {
      if (e.candidate) {
        console.log(LOG_PREFIX +'ICE candidate received: '+ e.candidate.candidate);
      } else if (self.onIceCompleted !== undefined) {
        self.onIceCompleted();
      }
    };

    // To be deprecated as per https://code.google.com/p/webrtc/issues/detail?id=1393
    this.peerConnection.ongatheringchange = function(e) {
      if (e.currentTarget && e.currentTarget.iceGatheringState === 'complete' && this.iceConnectionState !== 'closed') {
        self.onIceCompleted();
      }
    };

    this.peerConnection.onicechange = function() {
      console.log(LOG_PREFIX +'ICE connection state changed to "'+ this.iceConnectionState +'"');
    };

    this.peerConnection.onstatechange = function() {
      console.log(LOG_PREFIX +'PeerConnection state changed to "'+ this.readyState +'"');
    };
  },

  close: function() {
    console.log(LOG_PREFIX + 'closing PeerConnection');
    if(this.peerConnection) {
      this.peerConnection.close();

      if(this.localMedia) {
        this.localMedia.stop();
      }
    }
  },

  /**
  * @param {Object} mediaConstraints
  * @param {Function} onSuccess
  * @param {Function} onFailure
  */
  getUserMedia: function(onSuccess, onFailure, constraints) {
    var self = this;

    console.log(LOG_PREFIX + 'requesting access to local media');

    JsSIP.WebRTC.getUserMedia(constraints,
      function(stream) {
        console.log(LOG_PREFIX + 'got local media stream');
        self.localMedia = stream;
        onSuccess(stream);
      },
      function(e) {
        console.error(LOG_PREFIX +'unable to get user media');
        console.error(e);
        onFailure();
      }
    );
  },

  /**
  * Message reception.
  * @param {String} type
  * @param {String} sdp
  * @param {Function} onSuccess
  * @param {Function} onFailure
  */
  onMessage: function(type, body, onSuccess, onFailure) {
    this.peerConnection.setRemoteDescription(
      new JsSIP.WebRTC.RTCSessionDescription({type: type, sdp:body}),
      onSuccess,
      onFailure
    );
  }
};

// Return since it will be assigned to a variable.
return RTCMediaHandler;
}(JsSIP));

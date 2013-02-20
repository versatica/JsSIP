
/**
 * @fileoverview SIP User Agent
 */

/**
 * @augments JsSIP
 * @class PeerConnection helper Class.
 * @param {JsSIP.Session} session
 */
JsSIP.MediaSession = function(session, RTCConstraints) {
  RTCConstraints = RTCConstraints || {};

  this.session = session;
  this.localMedia = null;
  this.peerConnection = null;

  this.init(RTCConstraints);
};

JsSIP.MediaSession.prototype = {

  createOffer: function(onSuccess, onFailure, constraints) {
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
        self.peerConnection.setLocalDescription(
          sessionDescription,
          null,
          onFailure
        );
      },
      onFailure,
      constraints.offerConstraints
    );
  },

  createAnswer: function(onSuccess, onFailure, constraints) {
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
        self.peerConnection.setLocalDescription(
          sessionDescription,
          null,
          onFailure
        );
      },
      onFailure,
      constraints.answerConstraints
    );
  },

  addStream: function(onSuccess, onFailure, constraints) {
    var self = this;

    this.getUserMedia(constraints.userMediaConstraints,
      function(stream) {
        self.peerConnection.addStream(stream, constraints.streamConstraints);
        onSuccess();
      },
      function(e) {
        onFailure(e);
      }
    );
  },

  /**
  * peerConnection creation.
  * @param {Function} onSuccess Fired when there are no more ICE candidates
  */
  init: function(RTCConstraints) {
    var idx, server, scheme, url,
      self = this,
      servers = [];

    for (idx in this.session.ua.configuration.stun_servers) {
      server = this.session.ua.configuration.stun_servers[idx];
      servers.push({'url': server});
    }

    for (idx in this.session.ua.configuration.turn_servers) {
      server = this.session.ua.configuration.turn_servers[idx];
      url = server.server;
      scheme = url.substr(0, url.indexOf(':'));
      servers.push({
        'url': scheme + ':' + server.username + '@' + url.substr(scheme.length+1),
        'credential': server.password
      });
    }

    this.peerConnection = new JsSIP.WebRTC.RTCPeerConnection({'iceServers': servers}, RTCConstraints);

    this.peerConnection.mediaSession = self;

    this.peerConnection.onopen = function() {
      console.log(JsSIP.C.LOG_MEDIA_SESSION +'media session opened');
    };

    this.peerConnection.onaddstream = function(e) {
      console.log(JsSIP.C.LOG_MEDIA_SESSION +'stream added: '+ e.stream.id);
    };

    this.peerConnection.onremovestream = function(e) {
      console.log(JsSIP.C.LOG_MEDIA_SESSION +'stream removed: '+ e.stream.id);
    };

    this.peerConnection.onicecandidate = function(e) {
      if (e.candidate) {
        console.log(JsSIP.C.LOG_MEDIA_SESSION + 'ICE candidate received: '+ e.candidate.candidate);
      }
    };

    this.peerConnection.ongatheringchange = function(e) {
      if (e.currentTarget.iceGatheringState === 'complete' && this.iceConnectionState !== 'closed') {
        this.mediaSession.onIceCompleted();
      }
    };

    this.peerConnection.onicechange = function() {
      console.log(JsSIP.C.LOG_MEDIA_SESSION + 'ICE connection state changed to "'+ this.iceConnectionState +'"');
    };

    this.peerConnection.onstatechange = function() {
      console.log(JsSIP.C.LOG_MEDIA_SESSION + 'PeerConnection state changed to "'+ this.readyState +'"');
    };
  },

  close: function() {
    console.log(JsSIP.C.LOG_MEDIA_SESSION + 'closing PeerConnection');
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
  getUserMedia: function(mediaConstraints, onSuccess, onFailure) {
    var self = this;

    console.log(JsSIP.C.LOG_MEDIA_SESSION + 'requesting access to local media');

    JsSIP.WebRTC.getUserMedia(mediaConstraints,
      function(stream) {
        console.log(JsSIP.C.LOG_MEDIA_SESSION + 'got stream');
        self.localMedia = stream;
        onSuccess(stream);
      },
      function(e) {
        onFailure(e);
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
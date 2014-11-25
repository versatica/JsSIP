module.exports = RTCMediaHandler;

/**
 * Dependencies.
 */
var debug = require('debug')('JsSIP:RTCSession:RTCMediaHandler');
var JsSIP_C = require('../Constants');
var WebRTC = require('../WebRTC');


/* RTCMediaHandler
 * @class PeerConnection helper Class.
 * @param {RTCSession} session
 * @param {Object} [options]
 */
function RTCMediaHandler(session, options) {
  options = options || {};

  this.session = session;
  this.localMedia = null;
  this.peerConnection = null;
  this.ready = true;

  var idx, length, server,
    self = this,
    servers = [],
    constraints = options.constraints || {},
    stun_servers = options.stun_servers  || null,
    turn_servers = options.turn_servers || null,
    config = this.session.ua.configuration;

  if (!stun_servers) {
    stun_servers = config.stun_servers;
  }

  if (!turn_servers) {
    turn_servers = config.turn_servers;
  }

  /* Change 'url' to 'urls' whenever this issue is solved:
   * https://code.google.com/p/webrtc/issues/detail?id=2096
   */

  if (stun_servers.length > 0) {
    servers.push({'url': stun_servers});
  }

  length = turn_servers.length;
  for (idx = 0; idx < length; idx++) {
    server = turn_servers[idx];
    servers.push({
      'url': server.urls,
      'username': server.username,
      'credential': server.credential
    });
  }

  this.peerConnection = new WebRTC.RTCPeerConnection({'iceServers': servers}, constraints);

  this.peerConnection.onaddstream = function(e) {
    debug('stream added: '+ e.stream.id);
  };

  this.peerConnection.onremovestream = function(e) {
    debug('stream removed: '+ e.stream.id);
  };

  this.peerConnection.onicecandidate = function(e) {
    if (e.candidate) {
      debug('ICE candidate received: '+ e.candidate.candidate);
    } else if (self.onIceCompleted !== undefined) {
      self.onIceCompleted();
    }
  };

  this.peerConnection.oniceconnectionstatechange = function() {
    debug('ICE connection state changed to "'+ this.iceConnectionState +'"');

    if (this.iceConnectionState === 'failed') {
      self.session.terminate({
          cause: JsSIP_C.causes.RTP_TIMEOUT,
          status_code: 200,
          reason_phrase: JsSIP_C.causes.RTP_TIMEOUT
        });
    }
  };

  this.peerConnection.onstatechange = function() {
    debug('PeerConnection state changed to "'+ this.readyState +'"');
  };
}


RTCMediaHandler.prototype.isReady = function() {
  return this.ready;
};


RTCMediaHandler.prototype.getUserMedia = function(onSuccess, onFailure, constraints) {
  var self = this;

  debug('requesting access to local media');

  WebRTC.getUserMedia(constraints,
    function(stream) {
      debug('got local media stream');
      self.localMedia = stream;
      onSuccess(stream);
    },
    function(e) {
      debug('unable to get user media');
      debug(e);
      onFailure();
    }
  );
};


RTCMediaHandler.prototype.createOffer = function(onSuccess, onFailure, constraints) {
  var self = this;

  function onSetLocalDescriptionSuccess() {
    if (self.peerConnection.iceGatheringState === 'complete') {
      self.ready = true;
      onSuccess(self.peerConnection.localDescription.sdp);
    } else {
      self.onIceCompleted = function() {
        self.onIceCompleted = undefined;
        self.ready = true;
        onSuccess(self.peerConnection.localDescription.sdp);
      };
    }
  }

  this.ready = false;

  this.peerConnection.createOffer(
    function(sessionDescription){
      setLocalDescription.call(self,
        sessionDescription,
        onSetLocalDescriptionSuccess,
        function(e) {
          self.ready = true;
          onFailure(e);
        }
      );
    },
    function(e) {
      self.ready = true;
      debug('unable to create offer');
      debug(e);
      onFailure(e);
    },
    constraints
  );
};


RTCMediaHandler.prototype.createAnswer = function(onSuccess, onFailure, constraints) {
  var self = this;

  function onSetLocalDescriptionSuccess() {
    if (self.peerConnection.iceGatheringState === 'complete') {
      self.ready = true;
      onSuccess(self.peerConnection.localDescription.sdp);
    } else {
      self.onIceCompleted = function() {
        self.onIceCompleted = undefined;
        self.ready = true;
        onSuccess(self.peerConnection.localDescription.sdp);
      };
    }
  }

  this.ready = false;

  this.peerConnection.createAnswer(
    function(sessionDescription){
      setLocalDescription.call(self,
        sessionDescription,
        onSetLocalDescriptionSuccess,
        function(e) {
          self.ready = true;
          onFailure(e);
        }
      );
    },
    function(e) {
      self.ready = true;
      debug('unable to create answer');
      debug(e);
      onFailure(e);
    },
    constraints
  );
};


RTCMediaHandler.prototype.setRemoteDescription = function(type, body, onSuccess, onFailure) {
  this.peerConnection.setRemoteDescription(
    new WebRTC.RTCSessionDescription({type: type, sdp:body}),
    onSuccess,
    onFailure
  );
};


RTCMediaHandler.prototype.getRemoteDescription = function() {
  return this.peerConnection.remoteDescription || {};
};


RTCMediaHandler.prototype.addStream = function(stream, onSuccess, onFailure, constraints) {
  try {
    this.peerConnection.addStream(stream, constraints);
  } catch(e) {
    debug('error adding stream');
    debug(e);
    onFailure();
    return;
  }

  onSuccess();
};


RTCMediaHandler.prototype.getLocalStreams = function() {
  return this.peerConnection.getLocalStreams() || [];
};


RTCMediaHandler.prototype.getRemoteStreams = function() {
  return this.peerConnection.getRemoteStreams() || [];
};


RTCMediaHandler.prototype.close = function() {
  debug('closing PeerConnection');
  if(this.peerConnection) {
    this.peerConnection.close();

    if(this.localMedia) {
      this.localMedia.stop();
    }
  }
};


/**
 * Private API.
 */

function setLocalDescription(sessionDescription, onSuccess, onFailure) {
  this.peerConnection.setLocalDescription(
    sessionDescription,
    onSuccess,
    function(e) {
      debug('unable to set local description');
      debug(e);
      onFailure(e);
    }
  );
}

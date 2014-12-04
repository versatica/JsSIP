var WebRTC = {};

module.exports = WebRTC;


// getUserMedia
if (typeof navigator !== 'undefined' && navigator.webkitGetUserMedia) {
  WebRTC.getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
}
else if (typeof navigator !== 'undefined' && navigator.mozGetUserMedia) {
  WebRTC.getUserMedia = navigator.mozGetUserMedia.bind(navigator);
}
else if (typeof navigator !== 'undefined' && navigator.getUserMedia) {
  WebRTC.getUserMedia = navigator.getUserMedia.bind(navigator);
}

// RTCPeerConnection
if (typeof webkitRTCPeerConnection !== 'undefined') {
  WebRTC.RTCPeerConnection = webkitRTCPeerConnection;
}
else if (typeof mozRTCPeerConnection !== 'undefined') {
  WebRTC.RTCPeerConnection = mozRTCPeerConnection;
}
else if (typeof RTCPeerConnection !== 'undefined') {
  WebRTC.RTCPeerConnection = RTCPeerConnection;
}

// RTCSessionDescription
if (typeof webkitRTCSessionDescription !== 'undefined') {
  WebRTC.RTCSessionDescription = webkitRTCSessionDescription;
}
else if (typeof mozRTCSessionDescription !== 'undefined') {
  WebRTC.RTCSessionDescription = mozRTCSessionDescription;
}
else if (typeof RTCSessionDescription !== 'undefined') {
  WebRTC.RTCSessionDescription = RTCSessionDescription;
}

// New syntax for getting streams in Chrome M26.
if (WebRTC.RTCPeerConnection && WebRTC.RTCPeerConnection.prototype) {
  if (! WebRTC.RTCPeerConnection.prototype.getLocalStreams) {
    WebRTC.RTCPeerConnection.prototype.getLocalStreams = function() {
      return this.localStreams;
    };
    WebRTC.RTCPeerConnection.prototype.getRemoteStreams = function() {
      return this.remoteStreams;
    };
  }
}


WebRTC.setSupported = function() {
  WebRTC._isSupported = true;
};


WebRTC.isSupported = function() {
  if (WebRTC._isSupported) {
    return true;
  }
  else {
    return (WebRTC.getUserMedia && WebRTC.RTCPeerConnection && WebRTC.RTCSessionDescription);
  }
};

JsSIP.WebRTC = {

  isSupported: function() {
    if (JsSIP.WebRTC.getUserMedia && JsSIP.WebRTC.RTCPeerConnection && JsSIP.WebRTC.RTCSessionDescription) {
      return true;
    }
    else {
      return false;
    }
  }

};


// getUserMedia
if (window.navigator.webkitGetUserMedia) {
  JsSIP.WebRTC.getUserMedia = window.navigator.webkitGetUserMedia.bind(navigator);
}
else if (window.navigator.mozGetUserMedia) {
  JsSIP.WebRTC.getUserMedia = window.navigator.mozGetUserMedia.bind(navigator);
}
else if (window.navigator.getUserMedia) {
  JsSIP.WebRTC.getUserMedia = window.navigator.getUserMedia.bind(navigator);
}

// RTCPeerConnection
if (window.webkitRTCPeerConnection) {
  JsSIP.WebRTC.RTCPeerConnection = window.webkitRTCPeerConnection;
}
else if (window.mozRTCPeerConnection) {
  JsSIP.WebRTC.RTCPeerConnection = window.mozRTCPeerConnection;
}
else if (window.RTCPeerConnection) {
  JsSIP.WebRTC.RTCPeerConnection = window.RTCPeerConnection;
}

// RTCSessionDescription
if (window.webkitRTCSessionDescription) {
  JsSIP.WebRTC.RTCSessionDescription = window.webkitRTCSessionDescription;
}
else if (window.mozRTCSessionDescription) {
  JsSIP.WebRTC.RTCSessionDescription = window.mozRTCSessionDescription;
}
else if (window.RTCSessionDescription) {
  JsSIP.WebRTC.RTCSessionDescription = window.RTCSessionDescription;
}

// New syntax for getting streams in Chrome M26.
if (JsSIP.WebRTC.RTCPeerConnection) {
  if (!JsSIP.WebRTC.RTCPeerConnection.prototype.getLocalStreams) {
    JsSIP.WebRTC.RTCPeerConnection.prototype.getLocalStreams = function() {
      return this.localStreams;
    };
    JsSIP.WebRTC.RTCPeerConnection.prototype.getRemoteStreams = function() {
      return this.remoteStreams;
    };
  }
}
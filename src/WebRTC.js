/**
 * @fileoverview WebRTC
 */

(function(JsSIP) {
var WebRTC;

WebRTC = {};

// getUserMedia
if (window.navigator.webkitGetUserMedia) {
  WebRTC.getUserMedia = window.navigator.webkitGetUserMedia.bind(navigator);
}
else if (window.navigator.mozGetUserMedia) {
  WebRTC.getUserMedia = window.navigator.mozGetUserMedia.bind(navigator);
}
else if (window.navigator.getUserMedia) {
  WebRTC.getUserMedia = window.navigator.getUserMedia.bind(navigator);
}

// RTCPeerConnection
if (window.webkitRTCPeerConnection) {
  WebRTC.RTCPeerConnection = window.webkitRTCPeerConnection;
}
else if (window.mozRTCPeerConnection) {
  WebRTC.RTCPeerConnection = window.mozRTCPeerConnection;
}
else if (window.RTCPeerConnection) {
  WebRTC.RTCPeerConnection = window.RTCPeerConnection;
}

// RTCSessionDescription
if (window.webkitRTCSessionDescription) {
  WebRTC.RTCSessionDescription = window.webkitRTCSessionDescription;
}
else if (window.mozRTCSessionDescription) {
  WebRTC.RTCSessionDescription = window.mozRTCSessionDescription;
}
else if (window.RTCSessionDescription) {
  WebRTC.RTCSessionDescription = window.RTCSessionDescription;
}

// New syntax for getting streams in Chrome M26.
if (WebRTC.RTCPeerConnection && WebRTC.RTCPeerConnection.prototype) {
  if (!WebRTC.RTCPeerConnection.prototype.getLocalStreams) {
    WebRTC.RTCPeerConnection.prototype.getLocalStreams = function() {
      return this.localStreams;
    };
    WebRTC.RTCPeerConnection.prototype.getRemoteStreams = function() {
      return this.remoteStreams;
    };
  }
}

// isSupported attribute.
if (WebRTC.getUserMedia && WebRTC.RTCPeerConnection && WebRTC.RTCSessionDescription) {
  WebRTC.isSupported = true;
}
else {
  WebRTC.isSupported = false;
}

JsSIP.WebRTC = WebRTC;
}(JsSIP));

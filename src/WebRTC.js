/**
 * @fileoverview WebRTC
 */

(function(JsSIP) {
var WebRTC;

WebRTC = {};

// getUserMedia
if (window.navigator.webkitGetUserMedia) {
	WebRTC.getNewUserMedia = window.navigator.webkitGetUserMedia.bind(navigator);
}
else if (window.navigator.mozGetUserMedia) {
	WebRTC.getNewUserMedia = window.navigator.mozGetUserMedia.bind(navigator);
}
else if (window.navigator.getUserMedia) {
	WebRTC.getNewUserMedia = window.navigator.getUserMedia.bind(navigator);
}

if (WebRTC.getNewUserMedia) {
	WebRTC.cacheUserMedia = false;
	WebRTC.cachedStream = null;

	// Get shared user media if flagged, else new
	WebRTC.getUserMedia = function (constraints, onSuccess, onFailure) {
		var self = this;

		if (!this.cacheUserMedia || this.cachedStream == null) {
			// Get new user media
			WebRTC.getNewUserMedia(constraints, function (stream) {
				onSuccess(stream);

				if (self.cacheUserMedia) {
					// Store local stream for reuse if cacheUserMedia is set to true
					self.cachedStream = stream;
				}
				else if (self.cachedStream != null) {
					// Reset reusable local stream if cacheUserMedia is set to false
					self.cachedStream = null;
				}
			}, onFailure);
		}
		else {
			// Call success and pass through reusable local stream
			onSuccess(this.cachedStream);
		}
	}
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

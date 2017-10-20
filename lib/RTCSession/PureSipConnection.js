module.exports = PureSipConnection;

var util = require('util');
var events = require('events');

function PureSipConnection(localDescriptionFactory) {
    this.canTrickleIceCandidates = false;
    this.iceConnectionState = 'completed';
    this.iceGatheringState = 'complete';
    this.localDescription = null;
    this.remoteDescription = null;
    this.signalingState = 'stable';
    this.localStreams = [];
    this.remoteStreams = [];
    this.localDescriptionFactory = localDescriptionFactory;
}

util.inherits(PureSipConnection, events.EventEmitter);

PureSipConnection.prototype.onaddstream = function () {};
PureSipConnection.prototype.onicecandidate = function () {};
PureSipConnection.prototype.oniceconnectionstatechange = function () {};
PureSipConnection.prototype.onnegotiationneeded = function () {};
PureSipConnection.prototype.onremovestream = function () {};
PureSipConnection.prototype.onsignalingstatechange = function () {};
PureSipConnection.prototype.addIceCandidate = function (candidate) {
    return Promise.resolve(candidate);
};
PureSipConnection.prototype.addStream = function () {};
PureSipConnection.prototype.close = function () {
    this.localDescription = null;
    this.remoteDescription = null;
};
PureSipConnection.prototype.createAnswer = function (constraints) {
    var self = this;
    return Promise.resolve(this.localDescriptionFactory('answer', constraints))
        .then(function (description) {
            iceCandidateComplete.call(self);
            return description;
        });
};
PureSipConnection.prototype.createOffer = function (constraints) {
    var self = this;
    return Promise.resolve(this.localDescriptionFactory('offer', constraints))
        .then(function (description) {
            iceCandidateComplete.call(self);
            return description;
        });
};
PureSipConnection.prototype.getConfiguration = function () {
    return null;
};
PureSipConnection.prototype.getLocalStreams = function () {
    return this.localStreams;
};
PureSipConnection.prototype.getRemoteStreams = function () {
    return this.remoteStreams;
};
PureSipConnection.prototype.getStats = function () {
    return Promise.resolve(null);
};
PureSipConnection.prototype.getStreamById = function () {
    return null;
};
PureSipConnection.prototype.removeStream = function () {};
PureSipConnection.prototype.setLocalDescription = function (description) {
    this.localDescription = description;
    return Promise.resolve(this.localDescription);
};
PureSipConnection.prototype.setRemoteDescription = function (description) {
    this.remoteDescription = description;
    return Promise.resolve(this.remoteDescription);
};
PureSipConnection.prototype.addEventListener = function (type, listener) {
    this.on(type, listener);
};
PureSipConnection.prototype.removeEventListener = function (type, listener) {
    this.removeListener(type, listener);
};

function iceCandidateComplete() {
    var self = this;
    setTimeout(function () {
        self.emit('icecandidate', {
            candidate: null
        });
    });
}
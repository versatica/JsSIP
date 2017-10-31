const EventEmitter = require('events').EventEmitter;

module.exports = class PureSipConnection extends EventEmitter 
{
  constructor(localDescriptionFactory) 
  {
    super();

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

  onaddstream() {}
  onicecandidate() {}
  oniceconnectionstatechange() {}
  onnegotiationneeded() {}
  onremovestream() {}
  onsignalingstatechange() {}
  addIceCandidate(candidate) 
  {
    return Promise.resolve(candidate);
  }
  addStream() {}
  close() 
  {
    this.localDescription = null;
    this.remoteDescription = null;
  }
  createAnswer(constraints) 
  {
    return this.localDescriptionFactory('answer', constraints)
      .then((description) => 
      {
        this._iceCandidateComplete();
        
        return description;
      });
  }
  createOffer(constraints) 
  {
    return this.localDescriptionFactory('offer', constraints)
      .then((description) => 
      {
        this._iceCandidateComplete();

        return description;
      });
  }
  getConfiguration() 
  {
    return null;
  }
  getLocalStreams() 
  {
    return this.localStreams;
  }
  getRemoteStreams() 
  {
    return this.remoteStreams;
  }
  getStats() 
  {
    return Promise.resolve(null);
  }
  getStreamById() 
  {
    return null;
  }
  removeStream() {}
  setLocalDescription(description) 
  {
    this.localDescription = description;
    return Promise.resolve(this.localDescription);
  }
  setRemoteDescription(description) 
  {
    this.remoteDescription = description;
    return Promise.resolve(this.remoteDescription);
  }
  addEventListener(type, listener) 
  {
    this.on(type, listener);
  }
  removeEventListener(type, listener) 
  {
    this.removeListener(type, listener);
  }

  _iceCandidateComplete() 
  {
    setTimeout(() => 
    {
      this.emit('icecandidate', { candidate: null });
    });
  }
};
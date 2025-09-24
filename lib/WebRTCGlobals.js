module.exports = class WebRTCGlobals
{
  constructor()
  {
    if (WebRTCGlobals._instance)
    {
      return WebRTCGlobals._instance;
    }

    this._RTCPeerConnection = null;
    this._getUserMedia = null;
    this._getDisplayMedia = null;
    this._enumerateDevices = null;

    WebRTCGlobals._instance = this; // save singleton
  }

  static getInstance()
  {
    if (!WebRTCGlobals._instance)
    {
      WebRTCGlobals._instance = new WebRTCGlobals();
    }

    return WebRTCGlobals._instance;
  }

  get RTCPeerConnection()
  {
    if (!this._RTCPeerConnection)
    {
      return RTCPeerConnection;
    }

    return this._RTCPeerConnection;
  }

  set RTCPeerConnection(value)
  {
    this._RTCPeerConnection = value;
  }

  get getUserMedia()
  {
    if (!this._getUserMedia)
    {
      return navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    }

    return this._getUserMedia;
  }

  set getUserMedia(value)
  {
    this._getUserMedia = value;
  }

  get getDisplayMedia()
  {
    if (!this._getDisplayMedia)
    {
      return navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
    }

    return this._getDisplayMedia;
  }
  set getDisplayMedia(value)
  {
    this._getDisplayMedia = value;
  }

  get enumerateDevices()
  {
    if (!this._enumerateDevices)
    {
      return navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
    }

    return this._enumerateDevices;
  }
  set enumerateDevices(value)
  {
    this._enumerateDevices = value;
  }
};

const WebRTCGlobals = (() => 
{
  let _RTCPeerConnection = null;
  let _getUserMedia = null;
  let _enumerateDevices = null;
  let _overridesSet = false;

  return {
    get RTCPeerConnection() 
    {
      return _RTCPeerConnection || RTCPeerConnection;
    },
    get getUserMedia() 
    {
      return (
        _getUserMedia ||
        navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
      );
    },
    get enumerateDevices() 
    {
      return (
        _enumerateDevices ||
        navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices)
      );
    },

    setOverrides(overrides) 
    {
      if (_overridesSet) 
      {
        throw new Error(
          'WebRTCGlobals: Overrides have already been set. Ignoring subsequent setOverrides call.'
        );
      }

      if ('RTCPeerConnection' in overrides)
        _RTCPeerConnection = overrides.RTCPeerConnection;
      if ('getUserMedia' in overrides) _getUserMedia = overrides.getUserMedia;
      if ('enumerateDevices' in overrides)
        _enumerateDevices = overrides.enumerateDevices;

      _overridesSet = true;
    }
  };
})();

module.exports = WebRTCGlobals;

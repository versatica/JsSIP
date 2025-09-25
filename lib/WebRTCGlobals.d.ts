interface WebRTCOverrides {
  RTCPeerConnection?: typeof RTCPeerConnection;
  getUserMedia?: (constraints?: MediaStreamConstraints) => Promise<MediaStream>;
  enumerateDevices?: () => Promise<MediaDeviceInfo[]>;
}

declare const WebRTCGlobals: {
  readonly RTCPeerConnection: typeof RTCPeerConnection;
  readonly getUserMedia: (
    constraints?: MediaStreamConstraints
  ) => Promise<MediaStream>;
  readonly enumerateDevices: () => Promise<MediaDeviceInfo[]>;

  /**
   * Sets WebRTC overrides. Can only be called once.
   * @param overrides - Object containing WebRTC function overrides
   * @throws {Error} If overrides have already been set
   */
  setOverrides(overrides: WebRTCOverrides): void;
};

export = WebRTCGlobals;

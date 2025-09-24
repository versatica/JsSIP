export class WebRTCGlobals {
  private static _instance: WebRTCGlobals;
  private _RTCPeerConnection: typeof RTCPeerConnection | null;
  private _getUserMedia:
    | ((constraints?: MediaStreamConstraints) => Promise<MediaStream>)
    | null;
  private _getDisplayMedia:
    | ((constraints?: DisplayMediaStreamConstraints) => Promise<MediaStream>)
    | null;
  private _enumerateDevices: (() => Promise<MediaDeviceInfo[]>) | null;

  constructor();

  static getInstance(): WebRTCGlobals;

  get RTCPeerConnection(): typeof RTCPeerConnection;
  set RTCPeerConnection(value: typeof RTCPeerConnection);

  get getUserMedia(): (
    constraints?: MediaStreamConstraints
  ) => Promise<MediaStream>;
  set getUserMedia(
    value: (constraints?: MediaStreamConstraints) => Promise<MediaStream>
  );

  get getDisplayMedia(): (
    constraints?: DisplayMediaStreamConstraints
  ) => Promise<MediaStream>;
  set getDisplayMedia(
    value: (constraints?: DisplayMediaStreamConstraints) => Promise<MediaStream>
  );

  get enumerateDevices(): () => Promise<MediaDeviceInfo[]>;
  set enumerateDevices(value: () => Promise<MediaDeviceInfo[]>);
}

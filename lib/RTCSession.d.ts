/// <reference types="node" />
import {EventEmitter} from 'events'

import {IncomingRequest, IncomingResponse, OutgoingRequest} from './SIPMessage'
import {NameAddrHeader} from './NameAddrHeader'
import {URI} from './URI'
import {causes, DTMF_TRANSPORT} from './Constants'

interface RTCPeerConnectionDeprecated extends RTCPeerConnection {
  /**
   * @deprecated
   * @see https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/getRemoteStreams
   */
  getRemoteStreams(): MediaStream[];
}

export enum SessionDirection {
  INCOMING = 'incoming',
  OUTGOING = 'outgoing',
}

export enum Originator {
  LOCAL = 'local',
  REMOTE = 'remote',
  SYSTEM = 'system',
}

// options
export interface MediaConstraints {
  audio?: boolean;
  video?: boolean;
}

export interface ExtraHeaders {
  extraHeaders?: string[];
}

export interface AnswerOptions extends ExtraHeaders {
  mediaConstraints?: MediaConstraints;
  mediaStream?: MediaStream;
  pcConfig?: RTCConfiguration;
  rtcAnswerConstraints?: RTCOfferOptions;
  rtcOfferConstraints?: RTCOfferOptions;
  sessionTimersExpires?: number;
}

export interface RejectOptions extends ExtraHeaders {
  status_code?: number;
  reason_phrase?: string;
}

export interface TerminateOptions extends RejectOptions {
  body?: string;
  cause?: causes | string;
}

export interface ReferOptions extends ExtraHeaders {
  eventHandlers?: any;
  replaces?: RTCSession;
}

export interface OnHoldResult {
  local: boolean;
  remote: boolean;
}

export interface DTFMOptions extends ExtraHeaders {
  duration?: number;
  interToneGap?: number;
  transportType?: DTMF_TRANSPORT;
}

export interface HoldOptions extends ExtraHeaders {
  useUpdate?: boolean;
}

export interface RenegotiateOptions extends HoldOptions {
  rtcOfferConstraints?: RTCOfferOptions;
}

// events
export interface DTMF extends EventEmitter {
  tone: string;
  duration: number;
}

export interface Info extends EventEmitter {
  contentType: string;
  body: string;
}

export interface PeerConnectionEvent {
  peerconnection: RTCPeerConnectionDeprecated;
}

export interface ConnectingEvent {
  request: IncomingRequest | OutgoingRequest;
}

export interface SendingEvent {
  request: OutgoingRequest
}

export interface IncomingEvent {
  originator: Originator.LOCAL;
}

export interface EndEvent {
  originator: Originator;
  message: IncomingRequest | IncomingResponse;
  cause: string;
}

export interface IncomingDTMFEvent {
  originator: Originator.REMOTE;
  dtmf: DTMF;
  request: IncomingRequest;
}

export interface OutgoingDTMFEvent {
  originator: Originator.LOCAL;
  dtmf: DTMF;
  request: OutgoingRequest;
}

export interface IncomingInfoEvent {
  originator: Originator.REMOTE;
  info: Info;
  request: IncomingRequest;
}

export interface OutgoingInfoEvent {
  originator: Originator.LOCAL;
  info: Info;
  request: OutgoingRequest;
}

export interface HoldEvent {
  originator: Originator
}

export interface ReInviteEvent {
  request: IncomingRequest;
  callback?: VoidFunction;
  reject: (options?: RejectOptions) => void;
}

export interface ReferEvent {
  request: IncomingRequest;
  accept: Function;
  reject: VoidFunction;
}

export interface SDPEvent {
  originator: Originator;
  type: string;
  sdp: string;
}

export interface IceCandidateEvent {
  candidate: RTCIceCandidate;
  ready: VoidFunction;
}

export interface OutgoingEvent {
  originator: Originator.REMOTE;
  response: IncomingResponse
}

// listener
export type AnyListener = (...args: any[]) => void;
export type PeerConnectionListener = (event: PeerConnectionEvent) => void;
export type ConnectingListener = (event: ConnectingEvent) => void;
export type SendingListener = (event: SendingEvent) => void;
export type IncomingListener = (event: IncomingEvent) => void;
export type OutgoingListener = (event: OutgoingEvent) => void;
export type CallListener = IncomingListener | OutgoingListener;
export type EndListener = (event: EndEvent) => void;
export type IncomingDTMFListener = (event: IncomingDTMFEvent) => void;
export type OutgoingDTMFListener = (event: OutgoingDTMFEvent) => void;
export type DTMFListener = IncomingDTMFListener | OutgoingDTMFListener;
export type IncomingInfoListener = (event: IncomingInfoEvent) => void;
export type OutgoingInfoListener = (event: OutgoingInfoEvent) => void;
export type InfoListener = IncomingInfoListener | OutgoingInfoListener;
export type HoldListener = (event: HoldEvent) => void;
export type MuteListener = (event: MediaConstraints) => void;
export type ReInviteListener = (event: ReInviteEvent) => void;
export type UpdateListener = ReInviteListener;
export type ReferListener = (event: ReferEvent) => void;
export type SDPListener = (event: SDPEvent) => void;
export type IceCandidateListener = (event: IceCandidateEvent) => void;
export type MediaStreamListener = (mediaStream: MediaStream) => void;
export type ErrorListener = (error: Error) => void;

export interface RTCSessionEventMap {
  'peerconnection': PeerConnectionListener;
  'connecting': ConnectingListener;
  'sending': SendingListener;
  'progress': CallListener;
  'accepted': CallListener;
  'confirmed': CallListener;
  'ended': EndListener;
  'failed': EndListener;
  'newDTMF': DTMFListener;
  'newInfo': InfoListener;
  'hold': HoldListener;
  'unhold': HoldListener;
  'muted': MuteListener;
  'unmuted': MuteListener;
  'reinvite': ReInviteListener;
  'update': UpdateListener;
  'refer': ReferListener;
  'replaces': ReferListener;
  'sdp': SDPListener;
  'icecandidate': IceCandidateListener;
  'getusermediafailed': AnyListener;
  'peerconnection:createofferfailed': AnyListener;
  'peerconnection:createanswerfailed': AnyListener;
  'peerconnection:setlocaldescriptionfailed': AnyListener;
  'peerconnection:setremotedescriptionfailed': AnyListener;
  'presentation:start': MediaStreamListener;
  'presentation:started': MediaStreamListener;
  'presentation:end': MediaStreamListener;
  'presentation:ended': MediaStreamListener;
  'presentation:failed': ErrorListener; 
}

declare enum SessionStatus {
  STATUS_NULL = 0,
  STATUS_INVITE_SENT = 1,
  STATUS_1XX_RECEIVED = 2,
  STATUS_INVITE_RECEIVED = 3,
  STATUS_WAITING_FOR_ANSWER = 4,
  STATUS_ANSWERED = 5,
  STATUS_WAITING_FOR_ACK = 6,
  STATUS_CANCELED = 7,
  STATUS_TERMINATED = 8,
  STATUS_CONFIRMED = 9
}

export class RTCSession extends EventEmitter {
  static get C(): typeof SessionStatus;

  get C(): typeof SessionStatus;

  get causes(): typeof causes;

  get id(): string;

  set data(_data: any);
  get data(): any;

  get connection(): RTCPeerConnectionDeprecated;

  get contact(): string;

  get direction(): SessionDirection;

  get local_identity(): NameAddrHeader;

  get remote_identity(): NameAddrHeader;

  get start_time(): Date;

  get end_time(): Date;

  get status(): SessionStatus;

  isInProgress(): boolean;

  isEstablished(): boolean;

  isEnded(): boolean;

  isReadyToReOffer(): boolean;

  answer(options?: AnswerOptions): void;

  terminate(options?: TerminateOptions): void;

  sendDTMF(tones: string | number, options?: DTFMOptions): void;

  sendInfo(contentType: string, body?: string, options?: ExtraHeaders): Promise<void>;

  hold(options?: HoldOptions, done?: VoidFunction): boolean;

  unhold(options?: HoldOptions, done?: VoidFunction): boolean;

  renegotiate(options?: RenegotiateOptions, done?: VoidFunction): Promise<boolean>;

  isOnHold(): OnHoldResult;

  mute(options?: MediaConstraints): void;

  unmute(options?: MediaConstraints): void;

  isMuted(): MediaConstraints;

  refer(target: string | URI, options?: ReferOptions): void;

  resetLocalMedia(): void;

  on<T extends keyof RTCSessionEventMap>(type: T, listener: RTCSessionEventMap[T]): this;

  replaceMediaStream(stream: MediaStream, options?: { deleteExisting: boolean; addMissing: boolean; }): Promise<void>;

  startPresentation(stream: MediaStream, isNeedReinvite?: boolean): Promise<MediaStream>;

  stopPresentation(stream: MediaStream): Promise<MediaStream>;
}

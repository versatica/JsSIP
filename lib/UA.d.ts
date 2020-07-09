/// <reference types="node" />
import {EventEmitter} from 'events'

import {DisconnectEvent, Socket} from './WebSocketInterface'
import {AnswerOptions, AnyListener, Originator, RTCSession, RTCSessionEventMap, TerminateOptions} from './RTCSession'
import {IncomingRequest, IncomingResponse, OutgoingRequest} from './SIPMessage'
import {Message, SendMessageOptions} from './Message'
import {Registrator} from './Registrator'
import {URI} from './URI'
import {causes} from './Constants'

export interface UnRegisterOptions {
  all?: boolean;
}

export interface CallOptions extends AnswerOptions {
  eventHandlers?: Partial<RTCSessionEventMap>;
  anonymous?: boolean;
}

export interface UAConfiguration {
  // mandatory parameters
  sockets: Socket | Socket[] | WeightedSocket ;
  uri: string;
  // optional parameters
  authorization_user?: string;
  connection_recovery_max_interval?: number;
  connection_recovery_min_interval?: number;
  contact_uri?: string;
  display_name?: string;
  instance_id?: string;
  no_answer_timeout?: number;
  session_timers?: boolean;
  session_timers_refresh_method?: string;
  password?: string;
  realm?: string;
  ha1?: string;
  register?: boolean;
  register_expires?: number;
  registrar_server?: string;
  use_preloaded_route?: boolean;
  user_agent?: string;
}

export interface IncomingRTCSessionEvent {
  originator: Originator.REMOTE;
  session: RTCSession;
  request: IncomingRequest;
}

export interface OutgoingRTCSessionEvent {
  originator: Originator.LOCAL;
  session: RTCSession;
  request: IncomingRequest;
}

export type RTCSessionEvent = IncomingRTCSessionEvent | OutgoingRTCSessionEvent;

export interface UAConnectingEvent {
  socket: Socket;
  attempts: number
}

export interface ConnectedEvent {
  socket: Socket;
}

export interface RegisteredEvent {
  response: IncomingResponse;
}

export interface UnRegisteredEvent {
  response: IncomingResponse;
  cause?: causes;
}

export interface IncomingMessageEvent {
  originator: Originator.REMOTE;
  message: Message;
  request: IncomingRequest;
}

export interface OutgoingMessageEvent {
  originator: Originator.LOCAL;
  message: Message;
  request: OutgoingRequest;
}

export type UAConnectingListener = (event: UAConnectingEvent) => void;
export type ConnectedListener = (event: ConnectedEvent) => void;
export type DisconnectedListener = (event: DisconnectEvent) => void;
export type RegisteredListener = (event: RegisteredEvent) => void;
export type UnRegisteredListener = (event: UnRegisteredEvent) => void;
export type RegistrationFailedListener = UnRegisteredListener;
export type IncomingRTCSessionListener = (event: IncomingRTCSessionEvent) => void;
export type OutgoingRTCSessionListener = (event: OutgoingRTCSessionEvent) => void;
export type RTCSessionListener = IncomingRTCSessionListener | OutgoingRTCSessionListener;
export type IncomingMessageListener = (event: IncomingMessageEvent) => void;
export type OutgoingMessageListener = (event: OutgoingMessageEvent) => void;
export type MessageListener = IncomingMessageListener | OutgoingMessageListener;
export type SipEventListener = <T = any>(event: { event: T; request: IncomingRequest; }) => void

export interface UAEventMap {
  connecting: UAConnectingListener;
  connected: ConnectedListener;
  disconnected: DisconnectedListener;
  registered: RegisteredListener;
  unregistered: UnRegisteredListener;
  registrationFailed: RegistrationFailedListener;
  registrationExpiring: AnyListener;
  newRTCSession: RTCSessionListener;
  newMessage: MessageListener;
  sipEvent: SipEventListener;
}

export interface UAContactOptions {
  anonymous?: boolean;
  outbound?: boolean;
}

export interface UAContact {
  pub_gruu?: string,
  temp_gruu?: string,
  uri?: string;

  toString(options?: UAContactOptions): string
}

declare enum UAStatus {
  // UA status codes.
  STATUS_INIT = 0,
  STATUS_READY = 1,
  STATUS_USER_CLOSED = 2,
  STATUS_NOT_READY = 3,
  // UA error codes.
  CONFIGURATION_ERROR = 1,
  NETWORK_ERROR = 2
}

export class UA extends EventEmitter {
  static get C(): typeof UAStatus;

  constructor(configuration: UAConfiguration);

  get C(): typeof UAStatus;

  get status(): UAStatus;

  get contact(): UAContact;

  start(): void;

  stop(): void;

  register(): void;

  unregister(options?: UnRegisterOptions): void;

  registrator(): Registrator;

  call(target: string, options?: CallOptions): RTCSession;

  sendMessage(target: string | URI, body: string, options?: SendMessageOptions): Message;

  terminateSessions(options?: TerminateOptions): void;

  isRegistered(): boolean;

  isConnected(): boolean;

  get<T extends keyof UAConfiguration>(parameter: T): UAConfiguration[T];

  set<T extends keyof UAConfiguration>(parameter: T, value: UAConfiguration[T]): boolean;

  on<T extends keyof UAEventMap>(type: T, listener: UAEventMap[T]): this;
}

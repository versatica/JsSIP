import {EventEmitter} from 'events'

declare enum SubscriberTerminatedCode {
  SUBSCRIBE_RESPONSE_TIMEOUT = 0,
  SUBSCRIBE_TRANSPORT_ERROR = 1,
  SUBSCRIBE_NON_OK_RESPONSE = 2,
  SUBSCRIBE_WRONG_OK_RESPONSE = 3,
  SUBSCRIBE_AUTHENTICATION_FAILED = 4,
  UNSUBSCRIBE_TIMEOUT = 5,
  FINAL_NOTIFY_RECEIVED = 6,
  WRONG_NOTIFY_RECEIVED = 7
}

export interface MessageEventMap {
  pending: [];
  accepted: [];
  active: [];
  notify: [isFinal: boolean, request: IncomingRequest, body: string | undefined, contentType: string | undefined];
  terminated: [terminationCode: SubscriberTerminatedCode, reason: string | undefined, retryAfter: number | undefined];
}

export class Subscriber extends EventEmitter<MessageEventMap> {
  subscribe(body?: string): void;
  terminate(body?: string): void;
  get state(): string;
  get id(): string;
  set data(_data: any);
  get data(): any;
  static get C(): typeof SubscriberTerminatedCode;
  get C(): typeof SubscriberTerminatedCode;
}

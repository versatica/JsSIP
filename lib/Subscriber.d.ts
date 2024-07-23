import {EventEmitter} from 'events'
import {SUBSCRIBE, NOTIFY} from './Constants'
import * as Utils from './Utils'

declare enum SubscriberTerminatedCode {
  SUBSCRIBE_RESPONSE_TIMEOUT = 0,
  SUBSCRIBE_TRANSPORT_ERROR = 1,
  SUBSCRIBE_NON_OK_RESPONSE = 2,
  SUBSCRIBE_BAD_OK_RESPONSE = 3,
  SUBSCRIBE_FAILED_AUTHENTICATION = 4,
  UNSUBSCRIBE_TIMEOUT = 5,
  RECEIVE_FINAL_NOTIFY = 6,
  RECEIVE_BAD_NOTIFY = 7
}

export class Subscriber extends EventEmitter {
  subscribe(body?: string): void;
  terminate(body?: string): void;
  get state(): string;
  get id(): string;
  static get C(): typeof SubscriberTerminatedCode;
  get C(): typeof SubscriberTerminatedCode;
}

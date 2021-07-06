import {EventEmitter} from 'events'
import {SUBSCRIBE, NOTIFY} from './Constants'
import * as Utils from './Utils'

declare enum SubscriberTerminatedCode {
  SUBSCRIBE_RESPONSE_TIMEOUT = 0, 
  SUBSCRIBE_TRANSPORT_ERROR = 1, 
  SUBSCRIBE_NON_OK_RESPONSE = 2, 
  SUBSCRIBE_FAILED_AUTHENTICATION = 3,
  UNSUBSCRIBE_TIMEOUT = 4, 
  RECEIVE_FINAL_NOTIFY = 5,
  RECEIVE_BAD_NOTIFY = 6 
}

export class Subscriber extends EventEmitter {
  subscribe(body?: string): void;
  terminate(body?: string): void;
  get state(): string;
  get id(): string;
  static get C(): typeof SubscriberTerminatedCode;
  get C(): typeof SubscriberTerminatedCode;
}
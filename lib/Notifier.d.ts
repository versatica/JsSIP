import {EventEmitter} from 'events'
import {SUBSCRIBE, NOTIFY} from './Constants'
import * as Utils from './Utils'

declare enum NotifierTerminatedCode {
    NOTIFY_RESPONSE_TIMEOUT = 0,
    NOTIFY_TRANSPORT_ERROR = 1,
    NOTIFY_NON_OK_RESPONSE = 2,
    NOTIFY_FAILED_AUTHENTICATION = 3,
    SEND_FINAL_NOTIFY = 4,
    RECEIVE_UNSUBSCRIBE = 5,
    SUBSCRIPTION_EXPIRED = 6
}

export class Notifier extends EventEmitter {
  start(): void;
  setActiveState(): void;
  notify(body?: string): void;
  terminate(body?: string, reason?: string): void;
  get state(): string;
  get id(): string;
  static get C(): typeof NotifierTerminatedCode;
  get C(): typeof NotifierTerminatedCode;
}

import {EventEmitter} from 'events'
import {SUBSCRIBE, NOTIFY} from './Constants'
import * as Utils from './Utils'

declare enum NotifierTerminationReason {
    NOTIFY_RESPONSE_TIMEOUT = 0,
    NOTIFY_TRANSPORT_ERROR = 1,
    NOTIFY_NON_OK_RESPONSE = 2,
    NOTIFY_AUTHENTICATION_FAILED = 3,
    FINAL_NOTIFY_SENT = 4,
    UNSUBSCRIBE_RECEIVED = 5,
    SUBSCRIPTION_EXPIRED = 6
}

export class Notifier extends EventEmitter {
  start(): void;
  setActiveState(): void;
  notify(body?: string): void;
  terminate(body?: string, reason?: string): void;
  get state(): string;
  get id(): string;
  set data(_data: any);
  get data(): any;
  static get C(): typeof NotifierTerminationReason;
  get C(): typeof NotifierTerminationReason;
}

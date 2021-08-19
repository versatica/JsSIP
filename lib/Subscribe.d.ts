/// <reference types="node" />
import {EventEmitter} from 'events'

import {ExtraHeaders, Originator, OutgoingListener, SessionDirection, TerminateOptions} from './RTCSession'
import {IncomingResponse} from './SIPMessage'
import {NameAddrHeader} from './NameAddrHeader'
import {causes} from './Constants';

export interface AcceptOptions extends ExtraHeaders {
  body?: string;
}

export interface SendSubscribeOptions extends ExtraHeaders {
  contentType?: string;
  eventHandlers?: Partial<MessageEventMap>;
}

export class Subscribe extends EventEmitter {

  send(target: string, body: string, options?: SendSubscribeOptions): void;

  on<T extends keyof MessageEventMap>(type: T, listener: MessageEventMap[T]): this;
}

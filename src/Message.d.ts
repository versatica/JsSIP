import { EventEmitter } from 'events';

import {
	ExtraHeaders,
	Originator,
	OutgoingListener,
	SessionDirection,
	TerminateOptions,
} from './RTCSession';
import { IncomingResponse } from './SIPMessage';
import { NameAddrHeader } from './NameAddrHeader';
import { causes } from './Constants';

export interface AcceptOptions extends ExtraHeaders {
	body?: string;
}

export interface MessageFailedEvent {
	originator: Originator;
	response: IncomingResponse;
	cause?: causes;
}

export type MessageFailedListener = (event: MessageFailedEvent) => void;

export interface MessageEventMap {
	succeeded: OutgoingListener;
	failed: MessageFailedListener;
}

export interface SendMessageOptions extends ExtraHeaders {
	contentType?: string;
	eventHandlers?: Partial<MessageEventMap>;
	fromUserName?: string;
	fromDisplayName?: string;
}

export class Message extends EventEmitter {
	get direction(): SessionDirection;

	get local_identity(): NameAddrHeader;

	get remote_identity(): NameAddrHeader;

	send(target: string, body: string, options?: SendMessageOptions): void;

	accept(options: AcceptOptions): void;

	reject(options: TerminateOptions): void;

	on<T extends keyof MessageEventMap>(
		type: T,
		listener: MessageEventMap[T]
	): this;
}

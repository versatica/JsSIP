import { EventEmitter } from 'events';
import { IncomingRequest } from './SIPMessage';
import { UA } from './UA';

declare enum NotifierTerminationReason {
	NOTIFY_RESPONSE_TIMEOUT = 0,
	NOTIFY_TRANSPORT_ERROR = 1,
	NOTIFY_NON_OK_RESPONSE = 2,
	NOTIFY_AUTHENTICATION_FAILED = 3,
	FINAL_NOTIFY_SENT = 4,
	UNSUBSCRIBE_RECEIVED = 5,
	SUBSCRIPTION_EXPIRED = 6,
}

export interface MessageEventMap {
	terminated: [terminationCode: NotifierTerminationReason];
	subscribe: [
		isUnsubscribe: boolean,
		request: IncomingRequest,
		body: string | undefined,
		contentType: string | undefined,
	];
	expired: [];
}

interface NotifierOptions {
	extraHeaders?: string[];
	allowEvents?: string;
	pending?: boolean;
	defaultExpires?: number;
}

export class Notifier extends EventEmitter<MessageEventMap> {
	constructor(
		ua: UA,
		subscribe: IncomingRequest,
		contentType: string,
		options: NotifierOptions
	);
	start(): void;
	setActiveState(): void;
	notify(body?: string): void;
	terminate(body?: string, reason?: string, retryAfter?: number): void;
	get state(): string;
	get id(): string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	set data(_data: any);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	get data(): any;
	static get C(): typeof NotifierTerminationReason;
	get C(): typeof NotifierTerminationReason;
}

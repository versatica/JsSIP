import { EventEmitter } from 'events';
import { IncomingRequest } from './SIPMessage';
import { UA } from './UA';

declare enum SubscriberTerminatedCode {
	SUBSCRIBE_RESPONSE_TIMEOUT = 0,
	SUBSCRIBE_TRANSPORT_ERROR = 1,
	SUBSCRIBE_NON_OK_RESPONSE = 2,
	SUBSCRIBE_WRONG_OK_RESPONSE = 3,
	SUBSCRIBE_AUTHENTICATION_FAILED = 4,
	UNSUBSCRIBE_TIMEOUT = 5,
	FINAL_NOTIFY_RECEIVED = 6,
	WRONG_NOTIFY_RECEIVED = 7,
}

export interface MessageEventMap {
	pending: [];
	accepted: [];
	active: [];
	terminated: [
		terminationCode: SubscriberTerminatedCode,
		reason: string | undefined,
		retryAfter: number | undefined,
	];
	notify: [
		isFinal: boolean,
		request: IncomingRequest,
		body: string | undefined,
		contentType: string | undefined,
	];
}

interface SubscriberOptions {
	expires?: number;
	contentType: string;
	allowEvents?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	params?: Record<string, any>;
	extraHeaders?: string[];
}

export class Subscriber extends EventEmitter<MessageEventMap> {
	constructor(
		ua: UA,
		target: string,
		eventName: string,
		accept: string,
		options: SubscriberOptions
	);
	subscribe(body?: string): void;
	terminate(body?: string): void;
	get state(): string;
	get id(): string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	set data(_data: any);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	get data(): any;
	static get C(): typeof SubscriberTerminatedCode;
	get C(): typeof SubscriberTerminatedCode;
}

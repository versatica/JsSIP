import { EventEmitter } from 'events';
import { IncomingResponse } from './SIPMessage';
import { UA } from './UA';
import { URI } from './URI';

declare enum PublisherTerminatedCode {
	PUBLISH_RESPONSE_TIMEOUT = 0,
	PUBLISH_TRANSPORT_ERROR = 1,
	PUBLISH_NON_OK_RESPONSE = 2,
	PUBLISH_WRONG_OK_RESPONSE = 3,
	PUBLISH_AUTHENTICATION_FAILED = 4,
	UNPUBLISHED = 5,
}

declare enum PublisherState {
	STATE_INIT = 0,
	STATE_PUBLISHED = 1,
	STATE_TERMINATED = 2,
}

export interface PublisherEventMap {
	published: [response: IncomingResponse];
	terminated: [
		terminationCode: PublisherTerminatedCode,
		response: IncomingResponse | undefined,
	];
}

export interface PublisherParams {
	from_uri?: URI;
	from_display_name?: string;
	to_uri?: URI;
	to_display_name?: string;
}

export interface PublisherOptions {
	expires?: number;
	params?: PublisherParams;
	extraHeaders?: string[];
}

export class Publisher extends EventEmitter<PublisherEventMap> {
	constructor(
		ua: UA,
		target: string | URI,
		eventName: string,
		contentType: string,
		options?: PublisherOptions
	);
	publish(body: string): void;
	terminate(): void;
	get state(): PublisherState;
	get etag(): string | null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	set data(_data: any);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	get data(): any;
	static get C(): typeof PublisherTerminatedCode & typeof PublisherState;
	get C(): typeof PublisherTerminatedCode & typeof PublisherState;
}

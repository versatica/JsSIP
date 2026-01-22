import { NameAddrHeader } from './NameAddrHeader';
import { URI } from './URI';

declare class IncomingMessage {
	method: string;
	from: NameAddrHeader;
	to: NameAddrHeader;
	body: string;

	constructor();

	countHeader(name: string): number;

	getHeader(name: string): string;

	getHeaders(name: string): string[];

	hasHeader(name: string): boolean;

	parseHeader<T = unknown>(name: string, idx?: number): T;

	toString(): string;
}

export class IncomingRequest extends IncomingMessage {
	ruri: URI;
}

export class IncomingResponse extends IncomingMessage {
	status_code: number;
	reason_phrase: string;
}

export class OutgoingRequest {
	method: string;
	ruri: URI;
	cseq: number;
	call_id: string;
	from: NameAddrHeader;
	to: NameAddrHeader;
	body: string;

	setHeader(name: string, value: string | string[]): void;

	getHeader(name: string): string;

	getHeaders(name: string): string[];

	hasHeader(name: string): boolean;

	toString(): string;
}

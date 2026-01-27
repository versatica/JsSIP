import { Grammar } from './Grammar';

export type URIScheme = 'sip' | string;

export type Parameters = Record<string, string | null>;

export type Headers = Record<string, string | string[]>;

export class URI {
	scheme: URIScheme;
	user: string;
	host: string;
	port: number;

	constructor(
		scheme: URIScheme,
		user: string,
		host: string,
		port?: number,
		parameters?: Parameters,
		headers?: Headers
	);

	setParam(key: string, value?: string | number | null): void;

	getParam<T = unknown>(key: string): T;

	hasParam(key: string): boolean;

	deleteParam(key: string): void;

	clearParams(): void;

	setHeader(key: string, value: string | string[]): void;

	getHeader(key: string): string[];

	hasHeader(key: string): boolean;

	deleteHeader(key: string): void;

	clearHeaders(): void;

	clone(): this;

	toString(): string;

	toAor(show_port?: boolean): string;

	static parse(uri: string): Grammar | undefined;
}

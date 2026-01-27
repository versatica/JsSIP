import { Parameters, URI } from './URI';
import { Grammar } from './Grammar';

export class NameAddrHeader {
	get display_name(): string;
	set display_name(value: string);

	get uri(): URI;

	constructor(uri: URI, display_name?: string, parameters?: Parameters);

	setParam(key: string, value?: string | number | null): void;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	getParam<T = any>(key: string): T;

	hasParam(key: string): boolean;

	deleteParam(key: string): void;

	clearParams(): void;

	clone(): this;

	toString(): string;

	static parse(uri: string): Grammar | undefined;
}

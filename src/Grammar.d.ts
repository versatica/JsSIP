import NameAddrHeader = require('./NameAddrHeader');
import URI = require('./URI');

/**
 * The result of `parse()`, whose shape depends on the start rule used.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Grammar = any;

/**
 * Generic header field parameters, as collected by the `generic_param` rule.
 */
export type GenericParams = Record<string, string | null>;

/**
 * How a host was written, as set by the `hostname`, `IPv4address` and
 * `IPv6address` rules.
 */
export type HostType = 'domain' | 'IPv4' | 'IPv6';

/**
 * Result of the `Via` start rule.
 */
export type ViaHeader = {
	protocol: string;
	transport: string;
	host: string;
	host_type: HostType;
	port?: number;
	ttl?: number;
	maddr?: string;
	received?: string;
	branch?: string;
	rport?: number;
	params?: GenericParams;
};

/**
 * Result of the `CSeq` start rule.
 */
export type CSeqHeader = {
	value: number;
	method: string;
};

/**
 * Result of the `Session_Expires` start rule.
 */
export type SessionExpiresHeader = {
	expires: number;
	refresher?: 'uac' | 'uas';
	params?: GenericParams;
};

/**
 * Result of the `Replaces` start rule.
 */
export type ReplacesHeader = {
	call_id: string;
	to_tag?: string;
	from_tag?: string;
	early_only?: true;
	params?: GenericParams;
};

/**
 * Result of the `Event` start rule.
 */
export type EventHeader = {
	event: string;
	params?: GenericParams;
};

/**
 * Result of the `Refer_To` start rule.
 */
export type ReferToHeader = NameAddrHeader;

/**
 * Result of the `Request_Response` start rule when it matches a `Status_Line`.
 */
export type StatusLine = {
	status_code: number;
	reason_phrase: string;
};

/**
 * Result of the `Request_Response` start rule when it matches a `Request_Line`.
 *
 * NOTE: `uri` is only set when the Request-URI is a SIP URI. `Request_URI` also
 * accepts an `absoluteURI`, which the grammar does not turn into a `URI`.
 */
export type RequestLine = {
	method: string;
	uri?: URI;
};

/**
 * Result of the `Request_Response` start rule. Which of the two it is can be
 * told apart with `'status_code' in parsed`, as the grammar only creates the
 * properties the matched rule sets.
 */
export type RequestResponse = StatusLine | RequestLine;

export function parse(input: string, startRule?: string): Grammar;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toSource(): any;

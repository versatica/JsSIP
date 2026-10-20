import NameAddrHeader = require('./NameAddrHeader');

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

export function parse(input: string, startRule?: string): Grammar;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toSource(): any;

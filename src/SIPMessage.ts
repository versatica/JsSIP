import type { EventEmitter } from 'events';

import * as JsSIP_C from './Constants';
import { Logger } from './Logger';
import * as Grammar from './Grammar';
import type { Transport } from './Transport';
import {
	cloneArray,
	createRandomToken,
	headerize,
	newTag,
	str_utf8_length,
} from './Utils';
import NameAddrHeader = require('./NameAddrHeader');
import URI = require('./URI');

// NOTE: `sdp-transform` ships no type declarations and `@types/sdp-transform`
// is not a dependency of this project, so it is consumed through a `require()`
// narrowed to the single function used here.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sdp_transform = require('sdp-transform') as {
	parse(sdp: string): SDP;
};

const logger = new Logger('SIPMessage');

/**
 * A single media description of a parsed SDP.
 */
export type SDPMediaDescription = {
	type: string;
	direction?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
};

/**
 * An SDP as returned by `sdp-transform`'s `parse()`.
 */
export type SDP = {
	media: SDPMediaDescription[];
	direction?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
};

/**
 * A header value as stored by an `OutgoingRequest`.
 *
 * NOTE: It is not just `string` because `Max-Forwards` is stored as the
 * `JsSIP_C.MAX_FORWARDS` number.
 */
export type OutgoingHeaderValue = string | number;

/**
 * A header entry as stored by an `IncomingMessage`.
 */
export type IncomingHeader = {
	raw: string;
	parsed?: Grammar.Grammar;
};

/**
 * Parameters that take priority over the `ua.configuration` ones.
 */
export type OutgoingRequestParams = {
	cseq?: number;
	call_id?: string;
	from_uri?: URI;
	from_tag?: string;
	from_display_name?: string;
	to_uri?: URI;
	to_tag?: string;
	to_display_name?: string;
	route_set?: OutgoingHeaderValue[];
};

/*
 * TODO: The `*Like` types below are structural views of modules that are still
 * JavaScript. They are declared here so that this module stays a leaf of the
 * TypeScript migration. The real classes satisfy them structurally, so each one
 * must be replaced with a plain type import once its module is ported.
 *
 * Note that importing those modules only for their types does not create a
 * runtime require cycle, since type imports are erased.
 */

/**
 * The client transaction an outgoing INVITE is bound to.
 *
 * TODO: Replace with `import type { InviteClientTransaction } from
 * './Transactions'` once `Transactions` is ported to TypeScript.
 */
export interface ClientTransactionLike {
	cancel(reason?: string): void;
}

/**
 * The server transaction an incoming request is bound to.
 *
 * TODO: Replace with the server transaction types from './Transactions' once
 * that module is ported to TypeScript.
 */
export interface ServerTransactionLike extends EventEmitter {
	state: number;

	receiveResponse(
		code: number,
		response: string,
		onSuccess?: () => void,
		onFailure?: () => void
	): void;
}

/**
 * The `UA` surface SIP messages depend on.
 *
 * TODO: Replace with `import type { UA } from './UA'` once `UA` is ported to
 * TypeScript. Note that `UA.d.ts` currently declares neither `configuration`
 * nor `transport`, even though `UA` exposes both as public getters, so that
 * gap must be closed first.
 *
 * TODO: The `configuration` shape below is `Config.Configuration` plus the
 * `jssip_id` that `UA` adds, so it can only be replaced once `UA` is ported.
 * Note it is not the `UAConfiguration` input type declared in `UA.d.ts`.
 */
export interface UALike {
	readonly configuration: {
		uri: URI;
		display_name?: string | null;
		jssip_id: string;
		session_timers?: boolean;
		use_preloaded_route?: boolean;
		user_agent?: string | null;
		extra_headers?: string[] | null;
	};
	readonly contact: {
		pub_gruu?: string | null;
		temp_gruu?: string | null;
	};
	readonly transport: Transport;
}

/**
 * -param {String} method request method
 * -param {String} ruri request uri
 * -param {UA} ua
 * -param {Object} params parameters that will have priority over ua.configuration parameters:
 * <br>
 *  - cseq, call_id, from_tag, from_uri, from_display_name, to_uri, to_tag, route_set
 * -param {Object} [headers] extra headers
 * -param {String} [body]
 */
export class OutgoingRequest {
	ua: UALike;
	headers: Record<string, OutgoingHeaderValue[]>;
	method: string;
	ruri: URI;
	body?: string;
	extraHeaders: string[];
	to: NameAddrHeader;
	from: NameAddrHeader;
	call_id: string;
	cseq: number;

	/* NOTE: `declare`d (and so not emitted) because the original implementation
	 * does not create these own properties in the constructor. `sdp` is created
	 * by `parseSDP()` and `transaction` is assigned by `Transactions.js` when
	 * the request is sent.
	 */
	declare sdp?: SDP;
	declare transaction?: ClientTransactionLike | null;

	constructor(
		method: string,
		ruri: URI,
		ua: UALike,
		params?: OutgoingRequestParams | null,
		extraHeaders?: string[] | null,
		body?: string
	) {
		// Mandatory parameters check.
		if (!method || !ruri || !ua) {
			throw new TypeError(
				'missing or invalid "method", "ruri" or "ua" parameter'
			);
		}

		params = params || {};

		this.ua = ua;
		this.headers = {};
		this.method = method;
		this.ruri = ruri;
		this.body = body;
		this.extraHeaders = cloneArray(extraHeaders);

		if (this.ua.configuration.extra_headers) {
			this.extraHeaders = this.extraHeaders.concat(
				this.ua.configuration.extra_headers
			);
		}

		// Fill the Common SIP Request Headers.

		// Route.
		if (params.route_set) {
			this.setHeader('route', params.route_set);
		} else if (ua.configuration.use_preloaded_route) {
			this.setHeader('route', `<${ua.transport.sip_uri};lr>`);
		}

		// Via.
		// Empty Via header. Will be filled by the client transaction.
		this.setHeader('via', '');

		// Max-Forwards.
		this.setHeader('max-forwards', JsSIP_C.MAX_FORWARDS);

		// To
		const to_uri = params.to_uri || ruri;
		const to_params = params.to_tag ? { tag: params.to_tag } : null;
		// NOTE: `NameAddrHeader` tolerates a `null` display name (its setter
		// stores it as is), so the cast keeps the original behaviour.
		const to_display_name = (
			typeof params.to_display_name !== 'undefined'
				? params.to_display_name
				: null
		) as string | undefined;

		this.to = new NameAddrHeader(to_uri, to_display_name, to_params);
		this.setHeader('to', this.to.toString());

		// From.
		const from_uri = params.from_uri || ua.configuration.uri;
		const from_params = { tag: params.from_tag || newTag() };
		let display_name: string | null;

		if (typeof params.from_display_name !== 'undefined') {
			display_name = params.from_display_name;
		} else if (ua.configuration.display_name) {
			display_name = ua.configuration.display_name;
		} else {
			display_name = null;
		}

		this.from = new NameAddrHeader(
			from_uri,
			display_name as string | undefined,
			from_params
		);
		this.setHeader('from', this.from.toString());

		// Call-ID.
		const call_id =
			params.call_id || ua.configuration.jssip_id + createRandomToken(15);

		this.call_id = call_id;
		this.setHeader('call-id', call_id);

		// CSeq.
		const cseq = params.cseq || Math.floor(Math.random() * 10000);

		this.cseq = cseq;
		this.setHeader('cseq', `${cseq} ${method}`);
	}

	/**
	 * Replace the the given header by the given value.
	 * -param {String} name header name
	 * -param {String | Array} value header value
	 */
	setHeader(
		name: string,
		value: OutgoingHeaderValue | OutgoingHeaderValue[]
	): void {
		// Remove the header from extraHeaders if present.
		const regexp = new RegExp(`^\\s*${name}\\s*:`, 'i');

		for (let idx = 0; idx < this.extraHeaders.length; idx++) {
			if (regexp.test(this.extraHeaders[idx]!)) {
				this.extraHeaders.splice(idx, 1);
			}
		}

		this.headers[headerize(name)] = Array.isArray(value) ? value : [value];
	}

	/**
	 * Get the value of the given header name at the given position.
	 * -param {String} name header name
	 * -returns {String|undefined} Returns the specified header, null if header doesn't exist.
	 */
	getHeader(name: string): OutgoingHeaderValue | undefined {
		const headers = this.headers[headerize(name)];

		if (headers) {
			if (headers[0]) {
				return headers[0];
			}
		} else {
			const regexp = new RegExp(`^\\s*${name}\\s*:`, 'i');

			for (const header of this.extraHeaders) {
				if (regexp.test(header)) {
					return header.substring(header.indexOf(':') + 1).trim();
				}
			}
		}

		return;
	}

	/**
	 * Get the header/s of the given name.
	 * -param {String} name header name
	 * -returns {Array} Array with all the headers of the specified name.
	 */
	getHeaders(name: string): OutgoingHeaderValue[] {
		const headers = this.headers[headerize(name)];
		const result: OutgoingHeaderValue[] = [];

		if (headers) {
			for (const header of headers) {
				result.push(header);
			}

			return result;
		} else {
			const regexp = new RegExp(`^\\s*${name}\\s*:`, 'i');

			for (const header of this.extraHeaders) {
				if (regexp.test(header)) {
					result.push(header.substring(header.indexOf(':') + 1).trim());
				}
			}

			return result;
		}
	}

	/**
	 * Verify the existence of the given header.
	 * -param {String} name header name
	 * -returns {boolean} true if header with given name exists, false otherwise
	 */
	hasHeader(name: string): boolean {
		if (this.headers[headerize(name)]) {
			return true;
		} else {
			const regexp = new RegExp(`^\\s*${name}\\s*:`, 'i');

			for (const header of this.extraHeaders) {
				if (regexp.test(header)) {
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * Parse the current body as a SDP and store the resulting object
	 * into this.sdp.
	 * -param {Boolean} force: Parse even if this.sdp already exists.
	 *
	 * Returns this.sdp.
	 */
	parseSDP(force?: boolean): SDP {
		if (!force && this.sdp) {
			return this.sdp;
		} else {
			this.sdp = sdp_transform.parse(this.body || '');

			return this.sdp;
		}
	}

	toString(): string {
		let msg = `${this.method} ${this.ruri} SIP/2.0\r\n`;

		for (const headerName in this.headers) {
			if (Object.prototype.hasOwnProperty.call(this.headers, headerName)) {
				for (const headerValue of this.headers[headerName]!) {
					msg += `${headerName}: ${headerValue}\r\n`;
				}
			}
		}

		for (const header of this.extraHeaders) {
			msg += `${header.trim()}\r\n`;
		}

		// Supported.
		const supported: string[] = [];

		switch (this.method) {
			case JsSIP_C.REGISTER: {
				supported.push('path', 'gruu');
				break;
			}
			case JsSIP_C.INVITE: {
				if (this.ua.configuration.session_timers) {
					supported.push('timer');
				}
				if (this.ua.contact.pub_gruu || this.ua.contact.temp_gruu) {
					supported.push('gruu');
				}
				supported.push('ice', 'replaces');
				break;
			}
			case JsSIP_C.UPDATE: {
				if (this.ua.configuration.session_timers) {
					supported.push('timer');
				}
				supported.push('ice');
				break;
			}
		}

		supported.push('outbound');

		const userAgent = this.ua.configuration.user_agent || JsSIP_C.USER_AGENT;

		// Allow.
		msg += `Allow: ${JsSIP_C.ALLOWED_METHODS}\r\n`;
		msg += `Supported: ${supported}\r\n`;
		msg += `User-Agent: ${userAgent}\r\n`;

		if (this.body) {
			const length = str_utf8_length(this.body);

			msg += `Content-Length: ${length}\r\n\r\n`;
			msg += this.body;
		} else {
			msg += 'Content-Length: 0\r\n\r\n';
		}

		return msg;
	}

	clone(): OutgoingRequest {
		const request = new OutgoingRequest(this.method, this.ruri, this.ua);

		// NOTE: An arrow function is used instead of the original `function` plus
		// `thisArg` so that `this` is properly typed. Iteration and assignment
		// order are unchanged.
		Object.keys(this.headers).forEach(name => {
			request.headers[name] = this.headers[name]!.slice();
		});

		request.body = this.body;
		request.extraHeaders = cloneArray(this.extraHeaders);
		request.to = this.to;
		request.from = this.from;
		request.call_id = this.call_id;
		request.cseq = this.cseq;

		return request;
	}
}

export class InitialOutgoingInviteRequest extends OutgoingRequest {
	/* NOTE: Unlike in `OutgoingRequest`, this is a real (emitted) field because
	 * the original implementation does assign it in the constructor.
	 */
	override transaction: ClientTransactionLike | null = null;

	constructor(
		ruri: URI,
		ua: UALike,
		params?: OutgoingRequestParams | null,
		extraHeaders?: string[] | null,
		body?: string
	) {
		super(JsSIP_C.INVITE, ruri, ua, params, extraHeaders, body);
	}

	cancel(reason?: string): void {
		this.transaction!.cancel(reason);
	}

	override clone(): InitialOutgoingInviteRequest {
		const request = new InitialOutgoingInviteRequest(this.ruri, this.ua);

		Object.keys(this.headers).forEach(name => {
			request.headers[name] = this.headers[name]!.slice();
		});

		request.body = this.body;
		request.extraHeaders = cloneArray(this.extraHeaders);
		request.to = this.to;
		request.from = this.from;
		request.call_id = this.call_id;
		request.cseq = this.cseq;

		request.transaction = this.transaction;

		return request;
	}
}

export type IncomingHeaders = Record<string, IncomingHeader[]>;

/**
 * Everything needed to build an `IncomingMessage`.
 */
export type IncomingMessageParams = {
	data: string;
	headers: IncomingHeaders;
	method: string;
	// Undefined when the corresponding header field is missing or unparseable.
	via?: Grammar.ViaHeader;
	via_branch?: string;
	call_id?: string;
	cseq?: number;
	from: NameAddrHeader;
	/* NOTE: `null` when the tag parameter is present but valueless (`;tag`),
	 * `undefined` when it is absent altogether.
	 */
	from_tag?: string | null;
	to: NameAddrHeader;
	to_tag?: string | null;
	body: string;
	session_expires?: number;
	session_expires_refresher?: string;
	refer_to?: Grammar.ReferToHeader;
	replaces?: Grammar.ReplacesHeader;
	event?: Grammar.EventHeader;
};

export type IncomingRequestParams = IncomingMessageParams & {
	ua: UALike;
	ruri: URI;
};

export type IncomingResponseParams = IncomingMessageParams & {
	status_code: number;
	reason_phrase: string;
};

export class IncomingMessage {
	/* Header store operations.
	 *
	 * They are static so that `IncomingMessageBuilder` can collect and parse
	 * header fields before any `IncomingMessage` exists. The instance methods
	 * of the same name delegate to them.
	 */

	/**
	 * Insert a header of the given name and value into the last position of the
	 * given header store.
	 */
	static addHeader(
		headers: IncomingHeaders,
		name: string,
		value: string
	): void {
		const header: IncomingHeader = { raw: value };

		name = headerize(name);

		const existing = headers[name];

		if (existing) {
			existing.push(header);
		} else {
			headers[name] = [header];
		}
	}

	/**
	 * Replace the value of the given header by the value.
	 */
	static setHeader(
		headers: IncomingHeaders,
		name: string,
		value: string
	): void {
		headers[headerize(name)] = [{ raw: value }];
	}

	/**
	 * Get the value of the given header name at the first position, or undefined
	 * if the header field is not present.
	 */
	static getHeader(headers: IncomingHeaders, name: string): string | undefined {
		const header = headers[headerize(name)];

		if (header?.[0]) {
			return header[0].raw;
		}

		return undefined;
	}

	/**
	 * Get the header/s of the given name.
	 */
	static getHeaders(headers: IncomingHeaders, name: string): string[] {
		const found = headers[headerize(name)];
		const result: string[] = [];

		if (!found) {
			return [];
		}

		for (const header of found) {
			result.push(header.raw);
		}

		return result;
	}

	/**
	 * Verify the existence of the given header.
	 */
	static hasHeader(headers: IncomingHeaders, name: string): boolean {
		return headers[headerize(name)] ? true : false;
	}

	/**
	 * Parse the given header on the given index, caching the result.
	 */
	/**
	 * Parse the given header on the given index, caching the result. Returns
	 * undefined if the header field is not present or cannot be parsed.
	 */
	static parseHeader<T = unknown>(
		headers: IncomingHeaders,
		name: string,
		idx = 0
	): T | undefined {
		name = headerize(name);

		const found = headers[name];

		if (!found) {
			logger.debug(`header "${name}" not present`);

			return undefined;
		} else if (idx >= found.length) {
			logger.debug(`not so many "${name}" headers present`);

			return undefined;
		}

		const header = found[idx]!;
		const value = header.raw;

		if (header.parsed) {
			return header.parsed as T;
		}

		// Substitute '-' by '_' for grammar rule matching.
		const parsed = Grammar.parse(value, name.replace(/-/g, '_'));

		if (parsed === -1) {
			found.splice(idx, 1); // delete from headers
			logger.debug(
				`error parsing "${name}" header field with value "${value}"`
			);

			return undefined;
		} else {
			header.parsed = parsed;

			return parsed as T;
		}
	}

	data: string;
	headers: IncomingHeaders;
	method: string;
	via?: Grammar.ViaHeader;
	via_branch?: string;
	call_id?: string;
	cseq?: number;
	from: NameAddrHeader;
	from_tag?: string | null;
	to: NameAddrHeader;
	to_tag?: string | null;
	body: string;
	sdp: SDP | null;

	// Only set when the corresponding header field is present.
	session_expires?: number;
	session_expires_refresher?: string;
	refer_to?: Grammar.ReferToHeader;
	replaces?: Grammar.ReplacesHeader;
	event?: Grammar.EventHeader;

	constructor({
		data,
		headers,
		method,
		via,
		via_branch,
		call_id,
		cseq,
		from,
		from_tag,
		to,
		to_tag,
		body,
		session_expires,
		session_expires_refresher,
		refer_to,
		replaces,
		event,
	}: IncomingMessageParams) {
		this.data = data;
		this.headers = headers;
		this.method = method;
		this.via = via;
		this.via_branch = via_branch;
		this.call_id = call_id;
		this.cseq = cseq;
		this.from = from;
		this.from_tag = from_tag;
		this.to = to;
		this.to_tag = to_tag;
		this.body = body;
		this.sdp = null;
		this.session_expires = session_expires;
		this.session_expires_refresher = session_expires_refresher;
		this.refer_to = refer_to;
		this.replaces = replaces;
		this.event = event;
	}

	/**
	 * Insert a header of the given name and value into the last position of the
	 * header array.
	 */
	addHeader(name: string, value: string): void {
		IncomingMessage.addHeader(this.headers, name, value);
	}

	/**
	 * Get the value of the given header name at the given position.
	 */
	getHeader(name: string): string | undefined {
		return IncomingMessage.getHeader(this.headers, name);
	}

	/**
	 * Get the header/s of the given name.
	 */
	getHeaders(name: string): string[] {
		return IncomingMessage.getHeaders(this.headers, name);
	}

	/**
	 * Verify the existence of the given header.
	 */
	hasHeader(name: string): boolean {
		return IncomingMessage.hasHeader(this.headers, name);
	}

	/**
	 * Parse the given header on the given index.
	 * -param {String} name header name
	 * -param {Number} [idx=0] header index
	 * -returns {Object|undefined} Parsed header object, undefined if the header
	 *  is not present or in case of a parsing error.
	 */
	parseHeader<T = unknown>(name: string, idx = 0): T | undefined {
		return IncomingMessage.parseHeader<T>(this.headers, name, idx);
	}

	/**
	 * Message Header attribute selector. Alias of parseHeader.
	 * -param {String} name header name
	 * -param {Number} [idx=0] header index
	 * -returns {Object|undefined} Parsed header object, undefined if the header
	 *  is not present or in case of a parsing error.
	 *
	 * -example
	 * message.s('via',3).port
	 */
	s<T = unknown>(name: string, idx?: number): T | undefined {
		return this.parseHeader<T>(name, idx);
	}

	/**
	 * Replace the value of the given header by the value.
	 * -param {String} name header name
	 * -param {String} value header value
	 */
	setHeader(name: string, value: string): void {
		IncomingMessage.setHeader(this.headers, name, value);
	}

	/**
	 * Parse the current body as a SDP and store the resulting object
	 * into this.sdp.
	 * -param {Boolean} force: Parse even if this.sdp already exists.
	 *
	 * Returns this.sdp.
	 */
	parseSDP(force?: boolean): SDP {
		if (!force && this.sdp) {
			return this.sdp;
		} else {
			this.sdp = sdp_transform.parse(this.body || '');

			return this.sdp;
		}
	}

	toString(): string {
		return this.data;
	}
}

export class IncomingRequest extends IncomingMessage {
	ua: UALike;
	ruri: URI;
	transport: Transport | null;
	server_transaction: ServerTransactionLike | null;

	constructor({ ua, ruri, ...params }: IncomingRequestParams) {
		super(params);

		this.ua = ua;
		this.ruri = ruri;
		this.transport = null;
		this.server_transaction = null;
	}

	/**
	 * Stateful reply.
	 * -param {Number} code status code
	 * -param {String} reason reason phrase
	 * -param {Object} headers extra headers
	 * -param {String} body body
	 * -param {Function} [onSuccess] onSuccess callback
	 * -param {Function} [onFailure] onFailure callback
	 */
	reply(
		code: number,
		reason?: string | null,
		extraHeaders?: string[] | null,
		body?: string | null,
		onSuccess?: () => void,
		onFailure?: () => void
	): void {
		const supported: string[] = [];
		/* NOTE: `getHeader()` may return undefined, but a To header field is
		 * guaranteed here: `IncomingMessageBuilder` refuses to build a message
		 * whose To header field is missing or unparseable.
		 */
		let to = this.getHeader('To');

		// NOTE: `code` is normalized into a local (instead of onto the parameter
		// itself) so that the `TypeError` message below is identical to the one
		// of the original implementation.
		const status_code: number | null = code || null;

		reason = reason || null;

		// Validate code and reason values.
		if (!status_code || status_code < 100 || status_code > 699) {
			throw new TypeError(`Invalid status_code: ${status_code}`);
		} else if (
			reason &&
			typeof reason !== 'string' &&
			// NOTE: `reason` is statically a string here, but the runtime check is
			// kept as is for JavaScript callers passing a `String` object.
			!((reason as unknown) instanceof String)
		) {
			throw new TypeError(`Invalid reason_phrase: ${reason}`);
		}

		reason = reason || JsSIP_C.REASON_PHRASE[status_code] || '';
		extraHeaders = cloneArray(extraHeaders);

		if (this.ua.configuration.extra_headers) {
			extraHeaders = extraHeaders.concat(this.ua.configuration.extra_headers);
		}

		let response = `SIP/2.0 ${status_code} ${reason}\r\n`;

		if (
			this.method === JsSIP_C.INVITE &&
			status_code > 100 &&
			status_code <= 200
		) {
			const headers = this.getHeaders('record-route');

			for (const header of headers) {
				response += `Record-Route: ${header}\r\n`;
			}
		}

		const vias = this.getHeaders('via');

		for (const via of vias) {
			response += `Via: ${via}\r\n`;
		}

		if (!this.to_tag && status_code > 100) {
			to += `;tag=${newTag()}`;
		} else if (this.to_tag && !this.to.hasParam('tag')) {
			to += `;tag=${this.to_tag}`;
		}

		response += `To: ${to}\r\n`;
		response += `From: ${this.getHeader('From')}\r\n`;
		response += `Call-ID: ${this.call_id}\r\n`;
		response += `CSeq: ${this.cseq} ${this.method}\r\n`;

		for (const header of extraHeaders) {
			response += `${header.trim()}\r\n`;
		}

		// Supported.
		switch (this.method) {
			case JsSIP_C.INVITE: {
				if (this.ua.configuration.session_timers) {
					supported.push('timer');
				}
				if (this.ua.contact.pub_gruu || this.ua.contact.temp_gruu) {
					supported.push('gruu');
				}
				supported.push('ice', 'replaces');
				break;
			}
			case JsSIP_C.UPDATE: {
				if (this.ua.configuration.session_timers) {
					supported.push('timer');
				}
				if (body) {
					supported.push('ice');
				}
				supported.push('replaces');
			}
		}

		supported.push('outbound');

		// Allow and Accept.
		if (this.method === JsSIP_C.OPTIONS) {
			response += `Allow: ${JsSIP_C.ALLOWED_METHODS}\r\n`;
			response += `Accept: ${JsSIP_C.ACCEPTED_BODY_TYPES}\r\n`;
		} else if (status_code === 405) {
			response += `Allow: ${JsSIP_C.ALLOWED_METHODS}\r\n`;
		} else if (status_code === 415) {
			response += `Accept: ${JsSIP_C.ACCEPTED_BODY_TYPES}\r\n`;
		}

		response += `Supported: ${supported}\r\n`;

		if (body) {
			const length = str_utf8_length(body);

			response += 'Content-Type: application/sdp\r\n';
			response += `Content-Length: ${length}\r\n\r\n`;
			response += body;
		} else {
			response += `Content-Length: ${0}\r\n\r\n`;
		}

		this.server_transaction!.receiveResponse(
			status_code,
			response,
			onSuccess,
			onFailure
		);
	}

	/**
	 * Stateless reply.
	 * -param {Number} code status code
	 * -param {String} reason reason phrase
	 */
	reply_sl(code: number | null = null, reason: string | null = null): void {
		const vias = this.getHeaders('via');

		// Validate code and reason values.
		if (!code || code < 100 || code > 699) {
			throw new TypeError(`Invalid status_code: ${code}`);
		} else if (
			reason &&
			typeof reason !== 'string' &&
			// NOTE: `reason` is statically a string here, but the runtime check is
			// kept as is for JavaScript callers passing a `String` object.
			!((reason as unknown) instanceof String)
		) {
			throw new TypeError(`Invalid reason_phrase: ${reason}`);
		}

		reason = reason || JsSIP_C.REASON_PHRASE[code] || '';

		let response = `SIP/2.0 ${code} ${reason}\r\n`;

		for (const via of vias) {
			response += `Via: ${via}\r\n`;
		}

		/* NOTE: `getHeader()` may return undefined, but a To header field is
		 * guaranteed here: `IncomingMessageBuilder` refuses to build a message
		 * whose To header field is missing or unparseable.
		 */
		let to = this.getHeader('To');

		if (!this.to_tag && code > 100) {
			to += `;tag=${newTag()}`;
		} else if (this.to_tag && !this.to.hasParam('tag')) {
			to += `;tag=${this.to_tag}`;
		}

		response += `To: ${to}\r\n`;
		response += `From: ${this.getHeader('From')}\r\n`;
		response += `Call-ID: ${this.call_id}\r\n`;
		response += `CSeq: ${this.cseq} ${this.method}\r\n`;

		if (this.ua.configuration.extra_headers) {
			for (const header of this.ua.configuration.extra_headers) {
				response += `${header.trim()}\r\n`;
			}
		}

		response += `Content-Length: ${0}\r\n\r\n`;

		this.transport!.send(response);
	}
}

export class IncomingResponse extends IncomingMessage {
	status_code: number;
	reason_phrase: string;

	constructor({
		status_code,
		reason_phrase,
		...params
	}: IncomingResponseParams) {
		super(params);

		this.status_code = status_code;
		this.reason_phrase = reason_phrase;
	}
}

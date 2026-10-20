import { Logger } from './Logger';
import * as Grammar from './Grammar';
import NameAddrHeader = require('./NameAddrHeader');
import URI = require('./URI');
import {
	IncomingMessage,
	IncomingMessageParams,
	IncomingRequest,
	IncomingResponse,
	UALike,
} from './SIPMessage';
import type { IncomingHeaders } from './SIPMessage';

const logger = new Logger('IncomingMessageBuilder');

/**
 * Collects the header fields of an incoming SIP message as they are scanned
 * and, once the whole message has been read, builds the corresponding
 * `IncomingRequest` or `IncomingResponse`.
 *
 * It exists so that every mandatory field of an `IncomingMessage` is provided
 * at construction time, rather than assigned onto a half built instance.
 */
export class IncomingMessageBuilder {
	#headers: IncomingHeaders = {};

	#via?: Grammar.Grammar;
	#via_branch?: string;
	#call_id?: string;
	#cseq?: number;
	/* NOTE: The method as given by the CSeq header field. A response takes its
	 * `method` from here, a request takes it from the request line.
	 */
	#cseq_method?: string;
	#from?: NameAddrHeader;
	#to?: NameAddrHeader;
	/* NOTE: `null` when the tag parameter is present but valueless (`;tag`),
	 * `undefined` when it is absent altogether.
	 */
	#from_tag?: string | null;
	#to_tag?: string | null;

	// Only set when the corresponding header field is present.
	#session_expires?: number;
	#session_expires_refresher?: string;
	#refer_to?: Grammar.Grammar;
	#replaces?: Grammar.Grammar;
	#event?: Grammar.Grammar;

	/**
	 * Whether the given header field is present.
	 */
	hasHeader(name: string): boolean {
		return IncomingMessage.hasHeader(this.#headers, name);
	}

	/**
	 * Value of the given header field, or undefined if not present.
	 */
	getHeader(name: string): string | undefined {
		return IncomingMessage.getHeader(this.#headers, name);
	}

	/**
	 * Interpret a single raw header field, storing it and, when it is a well
	 * known one, extracting the message attributes it carries.
	 *
	 * Returns false if the header field is present but cannot be parsed.
	 */
	addRawHeader(name: string, value: string): boolean {
		let parsed;

		// If header-field is well-known, parse it.
		switch (name.toLowerCase()) {
			case 'via':
			case 'v': {
				IncomingMessage.addHeader(this.#headers, 'via', value);
				if (IncomingMessage.getHeaders(this.#headers, 'via').length === 1) {
					parsed = IncomingMessage.parseHeader<Grammar.Grammar>(
						this.#headers,
						'Via'
					);
					if (parsed) {
						this.#via = parsed;
						this.#via_branch = parsed.branch;
					}
				} else {
					parsed = 0;
				}
				break;
			}
			case 'from':
			case 'f': {
				IncomingMessage.setHeader(this.#headers, 'from', value);
				parsed = IncomingMessage.parseHeader<NameAddrHeader>(
					this.#headers,
					'from'
				);
				if (parsed) {
					this.#from = parsed;
					this.#from_tag = parsed.getParam('tag');
				}
				break;
			}
			case 'to':
			case 't': {
				IncomingMessage.setHeader(this.#headers, 'to', value);
				parsed = IncomingMessage.parseHeader<NameAddrHeader>(
					this.#headers,
					'to'
				);
				if (parsed) {
					this.#to = parsed;
					this.#to_tag = parsed.getParam('tag');
				}
				break;
			}
			case 'record-route': {
				parsed = Grammar.parse(value, 'Record_Route');

				if (parsed === -1) {
					parsed = undefined;
				} else {
					for (const header of parsed) {
						IncomingMessage.addHeader(
							this.#headers,
							'record-route',
							value.substring(header.possition, header.offset)
						);
						this.#headers['Record-Route']![
							IncomingMessage.getHeaders(this.#headers, 'record-route').length -
								1
						]!.parsed = header.parsed;
					}
				}
				break;
			}
			case 'call-id':
			case 'i': {
				IncomingMessage.setHeader(this.#headers, 'call-id', value);
				parsed = IncomingMessage.parseHeader(this.#headers, 'call-id');
				if (parsed) {
					this.#call_id = value;
				}
				break;
			}
			case 'contact':
			case 'm': {
				parsed = Grammar.parse(value, 'Contact');

				if (parsed === -1) {
					parsed = undefined;
				} else {
					for (const header of parsed) {
						IncomingMessage.addHeader(
							this.#headers,
							'contact',
							value.substring(header.possition, header.offset)
						);
						this.#headers['Contact']![
							IncomingMessage.getHeaders(this.#headers, 'contact').length - 1
						]!.parsed = header.parsed;
					}
				}
				break;
			}
			case 'content-length':
			case 'l': {
				IncomingMessage.setHeader(this.#headers, 'content-length', value);
				parsed = IncomingMessage.parseHeader(this.#headers, 'content-length');
				break;
			}
			case 'content-type':
			case 'c': {
				IncomingMessage.setHeader(this.#headers, 'content-type', value);
				parsed = IncomingMessage.parseHeader(this.#headers, 'content-type');
				break;
			}
			case 'cseq': {
				IncomingMessage.setHeader(this.#headers, 'cseq', value);
				parsed = IncomingMessage.parseHeader<Grammar.Grammar>(
					this.#headers,
					'cseq'
				);
				if (parsed) {
					this.#cseq = parsed.value;

					/* NOTE: Only a response uses it, but it is recorded
					 * unconditionally so that the builder does not need to know
					 * which kind of message is being built.
					 */
					this.#cseq_method = parsed.method;
				}
				break;
			}
			case 'max-forwards': {
				IncomingMessage.setHeader(this.#headers, 'max-forwards', value);
				parsed = IncomingMessage.parseHeader(this.#headers, 'max-forwards');
				break;
			}
			case 'www-authenticate': {
				IncomingMessage.setHeader(this.#headers, 'www-authenticate', value);
				parsed = IncomingMessage.parseHeader(this.#headers, 'www-authenticate');
				break;
			}
			case 'proxy-authenticate': {
				IncomingMessage.setHeader(this.#headers, 'proxy-authenticate', value);
				parsed = IncomingMessage.parseHeader(
					this.#headers,
					'proxy-authenticate'
				);
				break;
			}
			case 'session-expires':
			case 'x': {
				IncomingMessage.setHeader(this.#headers, 'session-expires', value);
				parsed = IncomingMessage.parseHeader<Grammar.Grammar>(
					this.#headers,
					'session-expires'
				);
				if (parsed) {
					this.#session_expires = parsed.expires;
					this.#session_expires_refresher = parsed.refresher;
				}
				break;
			}
			case 'refer-to':
			case 'r': {
				IncomingMessage.setHeader(this.#headers, 'refer-to', value);
				parsed = IncomingMessage.parseHeader<Grammar.Grammar>(
					this.#headers,
					'refer-to'
				);
				if (parsed) {
					this.#refer_to = parsed;
				}
				break;
			}
			case 'replaces': {
				IncomingMessage.setHeader(this.#headers, 'replaces', value);
				parsed = IncomingMessage.parseHeader<Grammar.Grammar>(
					this.#headers,
					'replaces'
				);
				if (parsed) {
					this.#replaces = parsed;
				}
				break;
			}
			case 'event':
			case 'o': {
				IncomingMessage.setHeader(this.#headers, 'event', value);
				parsed = IncomingMessage.parseHeader<Grammar.Grammar>(
					this.#headers,
					'event'
				);
				if (parsed) {
					this.#event = parsed;
				}
				break;
			}
			default: {
				// Do not parse this header.
				IncomingMessage.addHeader(this.#headers, name, value);
				parsed = 0;
			}
		}

		return parsed !== undefined;
	}

	/**
	 * Build the `IncomingRequest`, or undefined if a mandatory header field is
	 * missing.
	 */
	buildRequest(
		ua: UALike,
		data: string,
		method: string,
		ruri: URI,
		body: string
	): IncomingRequest | undefined {
		const params = this.#params(data, method, body);

		if (!params) {
			return undefined;
		}

		return new IncomingRequest({ ...params, ua, ruri });
	}

	/**
	 * Build the `IncomingResponse`, or undefined if a mandatory header field is
	 * missing.
	 */
	buildResponse(
		data: string,
		status_code: number,
		reason_phrase: string,
		body: string
	): IncomingResponse | undefined {
		// RFC 3261 8.1.3.3. A response takes its method from its CSeq.
		if (this.#cseq_method === undefined) {
			logger.debug('missing mandatory header field : cseq, dropping message');

			return undefined;
		}

		const params = this.#params(data, this.#cseq_method, body);

		if (!params) {
			return undefined;
		}

		return new IncomingResponse({ ...params, status_code, reason_phrase });
	}

	#params(
		data: string,
		method: string,
		body: string
	): IncomingMessageParams | undefined {
		// RFC 3261 8.1.1. From and To are mandatory in every SIP message.
		if (this.#from === undefined) {
			logger.debug('missing mandatory header field : from, dropping message');

			return undefined;
		}

		if (this.#to === undefined) {
			logger.debug('missing mandatory header field : to, dropping message');

			return undefined;
		}

		return {
			data,
			headers: this.#headers,
			method,
			via: this.#via,
			via_branch: this.#via_branch,
			call_id: this.#call_id,
			cseq: this.#cseq,
			from: this.#from,
			from_tag: this.#from_tag,
			to: this.#to,
			to_tag: this.#to_tag,
			body,
			session_expires: this.#session_expires,
			session_expires_refresher: this.#session_expires_refresher,
			refer_to: this.#refer_to,
			replaces: this.#replaces,
			event: this.#event,
		};
	}
}

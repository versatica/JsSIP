import { SIP } from './Constants';
import { escapeUser, headerize } from './Utils';
import * as Grammar from './Grammar';

/**
 * -param {String} [scheme]
 * -param {String} [user]
 * -param {String} host
 * -param {String} [port]
 * -param {Object} [parameters]
 * -param {Object} [headers]
 *
 */
class URI {
	/**
	 * Parse the given string and returns a JsSIP.URI instance or undefined if
	 * it is an invalid URI.
	 */
	static parse(uri: string): URI | undefined {
		const parsed = Grammar.parse(uri, 'SIP_URI') as URI | -1;

		if (parsed !== -1) {
			return parsed;
		} else {
			return undefined;
		}
	}

	#scheme: string;
	#user: string | undefined;
	#host: string;
	#port: number | null | undefined;
	#parameters: URI.Parameters;
	#headers: URI.Headers;

	constructor(
		scheme: URI.URIScheme | undefined,
		user: string | undefined,
		host: string,
		port?: number | null,
		parameters: URI.Parameters = {},
		headers: URI.Headers = {}
	) {
		// Checks.
		if (!host) {
			throw new TypeError('missing or invalid "host" parameter');
		}

		// Initialize parameters.
		this.#parameters = {};
		this.#headers = {};

		this.#scheme = scheme || SIP;
		this.#user = user;
		this.#host = host;
		this.#port = port;

		for (const param in parameters) {
			if (Object.prototype.hasOwnProperty.call(parameters, param)) {
				this.setParam(param, parameters[param]);
			}
		}

		for (const header in headers) {
			if (Object.prototype.hasOwnProperty.call(headers, header)) {
				this.setHeader(header, headers[header]!);
			}
		}
	}

	get scheme(): string {
		return this.#scheme;
	}

	set scheme(value: string) {
		this.#scheme = value.toLowerCase();
	}

	get user(): string | undefined {
		return this.#user;
	}

	set user(value: string | undefined) {
		this.#user = value;
	}

	get host(): string {
		return this.#host;
	}

	set host(value: string) {
		this.#host = value.toLowerCase();
	}

	get port(): number | null | undefined {
		return this.#port;
	}

	set port(value: number | string | null | undefined) {
		this.#port = value === 0 ? value : parseInt(String(value), 10) || null;
	}

	setParam(key: string, value?: string | number | null): void {
		if (key) {
			this.#parameters[key.toLowerCase()] =
				typeof value === 'undefined' || value === null
					? null
					: value.toString();
		}
	}

	getParam(key: string): string | null | undefined {
		if (key) {
			return this.#parameters[key.toLowerCase()];
		}

		return undefined;
	}

	hasParam(key: string): boolean | undefined {
		if (key) {
			return (
				(Object.prototype.hasOwnProperty.call(
					this.#parameters,
					key.toLowerCase()
				) &&
					true) ||
				false
			);
		}

		return undefined;
	}

	deleteParam(parameter: string): string | null | undefined {
		parameter = parameter.toLowerCase();
		if (Object.prototype.hasOwnProperty.call(this.#parameters, parameter)) {
			const value = this.#parameters[parameter];

			delete this.#parameters[parameter];

			return value;
		}

		return undefined;
	}

	clearParams(): void {
		this.#parameters = {};
	}

	setHeader(name: string, value: string | string[]): void {
		this.#headers[headerize(name)] = Array.isArray(value) ? value : [value];
	}

	getHeader(name: string): string[] | undefined {
		if (name) {
			return this.#headers[headerize(name)];
		}

		return undefined;
	}

	hasHeader(name: string): boolean | undefined {
		if (name) {
			return (
				(Object.prototype.hasOwnProperty.call(this.#headers, headerize(name)) &&
					true) ||
				false
			);
		}

		return undefined;
	}

	deleteHeader(header: string): string[] | undefined {
		header = headerize(header);
		if (Object.prototype.hasOwnProperty.call(this.#headers, header)) {
			const value = this.#headers[header];

			delete this.#headers[header];

			return value;
		}

		return undefined;
	}

	clearHeaders(): void {
		this.#headers = {};
	}

	clone(): URI {
		return new URI(
			this.#scheme,
			this.#user,
			this.#host,
			this.#port,
			JSON.parse(JSON.stringify(this.#parameters)) as URI.Parameters,
			JSON.parse(JSON.stringify(this.#headers)) as URI.Headers
		);
	}

	toString(): string {
		const headers = [];

		let uri = `${this.#scheme}:`;

		if (this.#user) {
			uri += `${escapeUser(this.#user)}@`;
		}
		uri += this.#host;
		if (this.#port || this.#port === 0) {
			uri += `:${this.#port}`;
		}

		for (const parameter in this.#parameters) {
			if (Object.prototype.hasOwnProperty.call(this.#parameters, parameter)) {
				uri += `;${parameter}`;

				if (this.#parameters[parameter] !== null) {
					uri += `=${this.#parameters[parameter]}`;
				}
			}
		}

		for (const header in this.#headers) {
			if (Object.prototype.hasOwnProperty.call(this.#headers, header)) {
				for (const item of this.#headers[header] ?? []) {
					headers.push(`${header}=${item}`);
				}
			}
		}

		if (headers.length > 0) {
			uri += `?${headers.join('&')}`;
		}

		return uri;
	}

	toAor(show_port?: boolean): string {
		let aor = `${this.#scheme}:`;

		if (this.#user) {
			aor += `${escapeUser(this.#user)}@`;
		}
		aor += this.#host;
		if (show_port && (this.#port || this.#port === 0)) {
			aor += `:${this.#port}`;
		}

		return aor;
	}
}

// NOTE: `URI` is exported with `export =` because the pegjs generated
// `Grammar.js` does `var URI = require('./URI')` and then `new URI(...)`.
// Types that used to be named exports of this module are merged into the
// `URI` namespace so that they remain reachable.
// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace URI {
	type URIScheme = 'sip' | string;

	type Parameters = Record<string, string | null>;

	type Headers = Record<string, string[]>;
}

export = URI;

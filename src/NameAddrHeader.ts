import * as Grammar from './Grammar';
import URI = require('./URI');

class NameAddrHeader {
	/**
	 * Parse the given string and returns a NameAddrHeader instance or undefined if
	 * it is an invalid NameAddrHeader.
	 */
	static parse(name_addr_header: string): NameAddrHeader | undefined {
		const parsed = Grammar.parse(name_addr_header, 'Name_Addr_Header') as
			| NameAddrHeader
			| -1;

		if (parsed !== -1) {
			return parsed;
		} else {
			return undefined;
		}
	}

	#uri: URI;
	#display_name?: string;
	#parameters: URI.Parameters;

	constructor(
		uri: URI,
		display_name?: string,
		parameters?: URI.Parameters | null
	) {
		// Checks.
		if (!uri || !(uri instanceof URI)) {
			throw new TypeError('missing or invalid "uri" parameter');
		}

		// Initialize parameters.
		this.#uri = uri;
		this.#parameters = {};
		this.display_name = display_name;

		for (const param in parameters) {
			if (Object.prototype.hasOwnProperty.call(parameters, param)) {
				this.setParam(param, parameters[param]);
			}
		}
	}

	get uri(): URI {
		return this.#uri;
	}

	get display_name(): string | undefined {
		return this.#display_name;
	}

	set display_name(value: string | number | undefined) {
		this.#display_name = value === 0 ? '0' : (value as string | undefined);
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

	clone(): NameAddrHeader {
		return new NameAddrHeader(
			this.#uri.clone(),
			this.#display_name,
			JSON.parse(JSON.stringify(this.#parameters)) as URI.Parameters
		);
	}

	#quote(str: string): string {
		return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
	}

	toString(): string {
		let body = this.#display_name
			? `"${this.#quote(this.#display_name)}" `
			: '';

		body += `<${this.#uri.toString()}>`;

		for (const parameter in this.#parameters) {
			if (Object.prototype.hasOwnProperty.call(this.#parameters, parameter)) {
				body += `;${parameter}`;

				if (this.#parameters[parameter] !== null) {
					body += `=${this.#parameters[parameter]}`;
				}
			}
		}

		return body;
	}
}

// NOTE: Exported with `export =` because the pegjs generated `Grammar.js` does
// `var NameAddrHeader = require('./NameAddrHeader')` and then
// `new NameAddrHeader(...)`.
export = NameAddrHeader;

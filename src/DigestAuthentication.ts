import { Logger } from './Logger';
import { calculateMD5, createRandomToken } from './Utils';

const logger = new Logger('DigestAuthentication');

export type DigestCredentials = {
	username?: string;
	password?: string;
	realm?: string;
	ha1?: string | null;
};

export type DigestChallenge = {
	algorithm?: string | null;
	realm?: string | null;
	nonce?: string | null;
	opaque?: string | null;
	stale?: boolean | null;
	qop?: string | string[] | null;
};

export type DigestAuthenticateRequest = {
	method: string;
	ruri: string | { toString(): string };
	body?: string | null;
};

export class DigestAuthentication {
	#credentials: DigestCredentials;
	#cnonce: string | null;
	#nc: number;
	#ncHex: string;
	#algorithm: string | null | undefined;
	#realm: string | null | undefined;
	#nonce: string | null | undefined;
	#opaque: string | null | undefined;
	// eslint-disable-next-line no-unused-private-class-members
	#stale: boolean | null | undefined;
	#qop: 'auth' | 'auth-int' | null;
	#method: string | null;
	#uri: string | { toString(): string } | null;
	#ha1: string | null | undefined;
	#response: string | null;

	constructor(credentials: DigestCredentials) {
		this.#credentials = credentials;
		this.#cnonce = null;
		this.#nc = 0;
		this.#ncHex = '00000000';
		this.#algorithm = null;
		this.#realm = null;
		this.#nonce = null;
		this.#opaque = null;
		this.#stale = null;
		this.#qop = null;
		this.#method = null;
		this.#uri = null;
		this.#ha1 = null;
		this.#response = null;
	}

	/**
	 * Get the generated Digest "response" value.
	 *
	 * NOTE: Exposed for testing purposes only.
	 */
	get response(): string | null {
		return this.#response;
	}

	get(parameter: string): string | null | undefined {
		switch (parameter) {
			case 'realm': {
				return this.#realm;
			}

			case 'ha1': {
				return this.#ha1;
			}

			default: {
				logger.warn('get() | cannot get "%s" parameter', parameter);

				return undefined;
			}
		}
	}

	/**
	 * Performs Digest authentication given a SIP request and the challenge
	 * received in a response to that request.
	 * Returns true if auth was successfully generated, false otherwise.
	 */
	authenticate(
		{ method, ruri, body }: DigestAuthenticateRequest,
		challenge: DigestChallenge,
		cnonce: string | null = null /* test interface */
	): boolean {
		this.#algorithm = challenge.algorithm;
		this.#realm = challenge.realm;
		this.#nonce = challenge.nonce;
		this.#opaque = challenge.opaque;
		this.#stale = challenge.stale;

		if (this.#algorithm) {
			if (this.#algorithm !== 'MD5') {
				logger.warn(
					'authenticate() | challenge with Digest algorithm different than "MD5", authentication aborted'
				);

				return false;
			}
		} else {
			this.#algorithm = 'MD5';
		}

		if (!this.#nonce) {
			logger.warn(
				'authenticate() | challenge without Digest nonce, authentication aborted'
			);

			return false;
		}

		if (!this.#realm) {
			logger.warn(
				'authenticate() | challenge without Digest realm, authentication aborted'
			);

			return false;
		}

		// If no plain SIP password is provided.
		if (!this.#credentials.password) {
			// If ha1 is not provided we cannot authenticate.
			if (!this.#credentials.ha1) {
				logger.warn(
					'authenticate() | no plain SIP password nor ha1 provided, authentication aborted'
				);

				return false;
			}

			// If the realm does not match the stored realm we cannot authenticate.
			if (this.#credentials.realm !== this.#realm) {
				logger.warn(
					'authenticate() | no plain SIP password, and stored `realm` does not match the given `realm`, cannot authenticate [stored:"%s", given:"%s"]',
					this.#credentials.realm,
					this.#realm
				);

				return false;
			}
		}

		// 'qop' can contain a list of values (Array). Let's choose just one.
		if (challenge.qop) {
			if (challenge.qop.includes('auth-int')) {
				this.#qop = 'auth-int';
			} else if (challenge.qop.includes('auth')) {
				this.#qop = 'auth';
			} else {
				// Otherwise 'qop' is present but does not contain 'auth' or 'auth-int', so abort here.
				logger.warn(
					'authenticate() | challenge without Digest qop different than "auth" or "auth-int", authentication aborted'
				);

				return false;
			}
		} else {
			this.#qop = null;
		}

		// Fill other attributes.

		this.#method = method;
		this.#uri = ruri;
		this.#cnonce = cnonce || createRandomToken(12);
		this.#nc += 1;
		const hex = Number(this.#nc).toString(16);

		this.#ncHex = '00000000'.substr(0, 8 - hex.length) + hex;

		// Nc-value = 8LHEX. Max value = 'FFFFFFFF'.
		if (this.#nc === 4294967296) {
			this.#nc = 1;
			this.#ncHex = '00000001';
		}

		// Calculate the Digest "response" value.

		// If we have plain SIP password then regenerate ha1.
		if (this.#credentials.password) {
			// HA1 = MD5(A1) = MD5(username:realm:password).
			this.#ha1 = calculateMD5(
				`${this.#credentials.username}:${this.#realm}:${this.#credentials.password}`
			);
		}
		// Otherwise reuse the stored ha1.
		else {
			this.#ha1 = this.#credentials.ha1;
		}

		let a2;
		let ha2;

		if (this.#qop === 'auth') {
			// HA2 = MD5(A2) = MD5(method:digestURI).
			a2 = `${this.#method}:${this.#uri}`;
			ha2 = calculateMD5(a2);

			logger.debug('authenticate() | using qop=auth [a2:"%s"]', a2);

			// Response = MD5(HA1:nonce:nonceCount:credentialsNonce:qop:HA2).
			this.#response = calculateMD5(
				`${this.#ha1}:${this.#nonce}:${this.#ncHex}:${this.#cnonce}:auth:${ha2}`
			);
		} else if (this.#qop === 'auth-int') {
			// HA2 = MD5(A2) = MD5(method:digestURI:MD5(entityBody)).
			a2 = `${this.#method}:${this.#uri}:${calculateMD5(body ? body : '')}`;
			ha2 = calculateMD5(a2);

			logger.debug('authenticate() | using qop=auth-int [a2:"%s"]', a2);

			// Response = MD5(HA1:nonce:nonceCount:credentialsNonce:qop:HA2).
			this.#response = calculateMD5(
				`${this.#ha1}:${this.#nonce}:${this.#ncHex}:${this.#cnonce}:auth-int:${ha2}`
			);
		} else if (this.#qop === null) {
			// HA2 = MD5(A2) = MD5(method:digestURI).
			a2 = `${this.#method}:${this.#uri}`;
			ha2 = calculateMD5(a2);

			logger.debug('authenticate() | using qop=null [a2:"%s"]', a2);

			// Response = MD5(HA1:nonce:HA2).
			this.#response = calculateMD5(`${this.#ha1}:${this.#nonce}:${ha2}`);
		}

		logger.debug('authenticate() | response generated');

		return true;
	}

	/**
	 * Return the Proxy-Authorization or WWW-Authorization header value.
	 */
	toString(): string {
		const auth_params: string[] = [];

		if (!this.#response) {
			throw new Error(
				'response field does not exist, cannot generate Authorization header'
			);
		}

		auth_params.push(`algorithm=${this.#algorithm}`);
		auth_params.push(`username="${this.#credentials.username}"`);
		auth_params.push(`realm="${this.#realm}"`);
		auth_params.push(`nonce="${this.#nonce}"`);
		auth_params.push(`uri="${this.#uri}"`);
		auth_params.push(`response="${this.#response}"`);
		if (this.#opaque) {
			auth_params.push(`opaque="${this.#opaque}"`);
		}
		if (this.#qop) {
			auth_params.push(`qop=${this.#qop}`);
			auth_params.push(`cnonce="${this.#cnonce}"`);
			auth_params.push(`nc=${this.#ncHex}`);
		}

		return `Digest ${auth_params.join(', ')}`;
	}
}

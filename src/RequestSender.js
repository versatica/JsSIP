const Logger = require('./Logger');
const JsSIP_C = require('./Constants');
const DigestAuthentication = require('./DigestAuthentication');
const Transactions = require('./Transactions');

const logger = new Logger('RequestSender');

// Default event handlers.
const EventHandlers = {
	onRequestTimeout: () => {},
	onTransportError: () => {},
	onReceiveResponse: () => {},
	onAuthenticated: () => {},
};

module.exports = class RequestSender {
	// Static cache for proactive authorization credentials
	static _authCache = {};

	constructor(ua, request, eventHandlers) {
		this._ua = ua;
		this._eventHandlers = eventHandlers;
		this._method = request.method;
		this._request = request;
		this._auth = null;
		this._challenged = false;
		this._staled = false;
		this._proactiveAuth = false;

		// Define the undefined handlers.
		for (const handler in EventHandlers) {
			if (Object.prototype.hasOwnProperty.call(EventHandlers, handler)) {
				if (!this._eventHandlers[handler]) {
					this._eventHandlers[handler] = EventHandlers[handler];
				}
			}
		}

		// If ua is in closing process or even closed just allow sending Bye and ACK.
		if (
			ua.status === ua.C.STATUS_USER_CLOSED &&
			(this._method !== JsSIP_C.BYE || this._method !== JsSIP_C.ACK)
		) {
			this._eventHandlers.onTransportError();
		}
	}

	/**
	 * Create the client transaction and send the message.
	 */
	send() {
		const eventHandlers = {
			onRequestTimeout: () => {
				this._eventHandlers.onRequestTimeout();
			},
			onTransportError: () => {
				this._eventHandlers.onTransportError();
			},
			onReceiveResponse: response => {
				this._receiveResponse(response);
			},
		};

		// Try proactive authorization if we have cached credentials.
		this._attemptProactiveAuth();

		switch (this._method) {
			case 'INVITE': {
				this.clientTransaction = new Transactions.InviteClientTransaction(
					this._ua,
					this._ua.transport,
					this._request,
					eventHandlers
				);
				break;
			}
			case 'ACK': {
				this.clientTransaction = new Transactions.AckClientTransaction(
					this._ua,
					this._ua.transport,
					this._request,
					eventHandlers
				);
				break;
			}
			default: {
				this.clientTransaction = new Transactions.NonInviteClientTransaction(
					this._ua,
					this._ua.transport,
					this._request,
					eventHandlers
				);
			}
		}
		// If authorization JWT is present, use it.
		if (this._ua._configuration.authorization_jwt) {
			this._request.setHeader(
				'Authorization',
				this._ua._configuration.authorization_jwt
			);
		}

		this.clientTransaction.send();
	}

	/**
	 * Attempt proactive authorization using cached credentials.
	 * This avoids the need to wait for a 401/407 challenge.
	 */
	_attemptProactiveAuth() {
		const cacheKey = this._ua.configuration.registrar_server;
		const cachedAuth = RequestSender._authCache[cacheKey];

		if (!cachedAuth) {
			return;
		}

		try {
			// Create a digest authentication object from cached credentials
			this._auth = new DigestAuthentication({
				username: this._ua.configuration.authorization_user,
				password: this._ua.configuration.password,
				realm: this._ua.configuration.realm,
				ha1: this._ua.configuration.ha1,
			});

			// Restore nonce count state from cache to maintain replay protection
			// RFC 2617: nonce count must increase for each request with same nonce
			this._auth._nc = cachedAuth.nc || 0;
			this._auth._ncHex = cachedAuth.ncHex || '00000000';
			this._auth._cnonce = cachedAuth.cnonce || null;

			// Set authentication parameters from cache
			this._auth._realm = cachedAuth.realm;
			this._auth._nonce = cachedAuth.nonce;
			this._auth._opaque = cachedAuth.opaque;
			this._auth._algorithm = cachedAuth.algorithm;
			this._auth._qop = cachedAuth.qop;

			// Authenticate the request
			if (
				this._auth.authenticate(this._request, {
					realm: cachedAuth.realm,
					nonce: cachedAuth.nonce,
					opaque: cachedAuth.opaque,
					algorithm: cachedAuth.algorithm,
					qop: cachedAuth.qop,
					stale: false,
				})
			) {
				this._request.setHeader('authorization', this._auth.toString());
				this._proactiveAuth = true;
				logger.debug('Proactive authorization header added');
			}
		} catch (e) {
			logger.debug('Proactive authentication failed:', e.message);
		}
	}

	/**
	 * Called from client transaction when receiving a correct response to the request.
	 * Authenticate request if needed or pass the response back to the applicant.
	 */
	_receiveResponse(response) {
		let challenge;
		let authorization_header_name;
		const status_code = response.status_code;

		/*
		 * Authentication
		 * Authenticate once. _challenged_ flag used to avoid infinite authentications.
		 */
		if (
			(status_code === 401 || status_code === 407) &&
			(this._ua.configuration.password !== null ||
				this._ua.configuration.ha1 !== null)
		) {
			// Get and parse the appropriate WWW-Authenticate or Proxy-Authenticate header.
			if (response.status_code === 401) {
				challenge = response.parseHeader('www-authenticate');
				authorization_header_name = 'authorization';
			} else {
				challenge = response.parseHeader('proxy-authenticate');
				authorization_header_name = 'proxy-authorization';
			}

			// Verify it seems a valid challenge.
			if (!challenge) {
				logger.debug(
					`${response.status_code} with wrong or missing challenge, cannot authenticate`
				);
				this._eventHandlers.onReceiveResponse(response);

				return;
			}

			if (!this._challenged || (!this._staled && challenge.stale === true)) {
				if (!this._auth) {
					this._auth = new DigestAuthentication({
						username: this._ua.configuration.authorization_user,
						password: this._ua.configuration.password,
						realm: this._ua.configuration.realm,
						ha1: this._ua.configuration.ha1,
					});
				}

				// Verify that the challenge is really valid.
				if (!this._auth.authenticate(this._request, challenge)) {
					this._eventHandlers.onReceiveResponse(response);

					return;
				}
				this._challenged = true;

				// Cache authentication credentials for proactive authorization.
				// Include nonce count state to maintain RFC 2617 replay protection
				const cacheKey = this._ua.configuration.registrar_server;

				RequestSender._authCache[cacheKey] = {
					realm: challenge.realm,
					nonce: challenge.nonce,
					opaque: challenge.opaque,
					algorithm: challenge.algorithm,
					qop: challenge.qop,
					nc: this._auth._nc, // Store current nonce count
					ncHex: this._auth._ncHex, // Store hex representation
					cnonce: this._auth._cnonce, // Store client nonce for qop support
				};
				logger.debug('Authentication credentials cached for proactive auth');

				// Update ha1 and realm in the UA.
				this._ua.set('realm', this._auth.get('realm'));
				this._ua.set('ha1', this._auth.get('ha1'));

				if (challenge.stale) {
					this._staled = true;
				}

				this._request = this._request.clone();
				this._request.cseq += 1;
				this._request.setHeader(
					'cseq',
					`${this._request.cseq} ${this._method}`
				);
				this._request.setHeader(
					authorization_header_name,
					this._auth.toString()
				);

				this._eventHandlers.onAuthenticated(this._request);
				this.send();
			} else {
				this._eventHandlers.onReceiveResponse(response);
			}
		} else {
			this._eventHandlers.onReceiveResponse(response);
		}
	}
};

const EventEmitter = require('events').EventEmitter;
const Exceptions = require('./Exceptions');
const Logger = require('./Logger');
const JsSIP_C = require('./Constants');
const Utils = require('./Utils');
const Grammar = require('./Grammar');
const SIPMessage = require('./SIPMessage');
const RequestSender = require('./RequestSender');

const logger = new Logger('Publisher');

/**
 * Termination codes.
 */
const C = {
	// Termination codes.
	PUBLISH_RESPONSE_TIMEOUT: 0,
	PUBLISH_TRANSPORT_ERROR: 1,
	PUBLISH_NON_OK_RESPONSE: 2,
	PUBLISH_WRONG_OK_RESPONSE: 3,
	PUBLISH_AUTHENTICATION_FAILED: 4,
	UNPUBLISHED: 5,

	// Publisher states.
	STATE_INIT: 0,
	STATE_PUBLISHED: 1,
	STATE_TERMINATED: 2,

	// Default expires value, in seconds.
	DEFAULT_EXPIRES_SEC: 3600,
};

/**
 * RFC 3903 event state publication.
 *
 * - publish(body) sends the initial publication; the 2xx carries the
 *   SIP-ETag that names it from then on.
 * - Before it expires, the publication is refreshed: no body, SIP-If-Match.
 * - publish(body) again modifies it: SIP-If-Match and the new body.
 * - terminate() removes it: Expires: 0 and SIP-If-Match.
 *
 * At most one PUBLISH is in flight: a body given meanwhile is sent when the
 * answer comes back, so the entity-tag always names the last publication
 * the server accepted.
 *
 * The server may lose the entity-tag (it restarted, or the publication
 * expired): it answers 412, and the body is published again from scratch,
 * once. A 423 is answered with the Min-Expires it gives. Any other failure
 * terminates the Publisher.
 */
module.exports = class Publisher extends EventEmitter {
	/**
	 * Expose C object.
	 */
	static get C() {
		return C;
	}

	/**
	 * @param {UA} ua - reference to JsSIP.UA
	 * @param {string} target - Request-URI and To, usually our own address.
	 * @param {string} eventName - Event header value.
	 * @param {string} contentType - Content-Type of the published bodies.
	 *
	 * @param {PublisherOptions} options - optional parameters.
	 *   @param {number} expires - Expires header value. Default is 3600.
	 *   @param {RequestParams} params - Will have priority over ua.configuration.
	 *   @param {Array<string>} extraHeaders - Additional SIP headers.
	 */
	constructor(
		ua,
		target,
		eventName,
		contentType,
		{ expires, params, extraHeaders } = {}
	) {
		logger.debug('new');

		super();

		if (!target) {
			throw new TypeError('Not enough arguments: Missing target');
		}

		if (!eventName) {
			throw new TypeError('Not enough arguments: Missing eventName');
		}

		if (!contentType) {
			throw new TypeError('Not enough arguments: Missing contentType');
		}

		if (Grammar.parse(eventName, 'Event') === -1) {
			throw new TypeError(`Invalid eventName: ${eventName}`);
		}

		this._ua = ua;
		this._target = this._ua.normalizeTarget(target);

		if (!this._target) {
			throw new TypeError(`Invalid target: ${target}`);
		}

		if (!Utils.isDecimal(expires) || expires <= 0) {
			expires = C.DEFAULT_EXPIRES_SEC;
		}

		this._expires = expires;
		this._event_name = eventName;
		this._content_type = contentType;
		this._extraHeaders = Utils.cloneArray(extraHeaders);

		// One Call-ID for all the PUBLISH requests and a CSeq that only goes
		// up, as for REGISTER (RFC 3261 10.2).
		this._params = Utils.cloneObject(params);

		if (!this._params.to_uri) {
			this._params.to_uri = this._target;
		}

		this._params.call_id = Utils.createRandomToken(22);
		this._params.cseq = 0;

		this._state = C.STATE_INIT;

		// Entity-tag of our publication, from the last 2xx.
		this._etag = null;

		// The last body we were given, and the one the server holds.
		this._body = null;
		this._published_body = null;

		// A PUBLISH is waiting for its final response.
		this._sending = false;

		// terminate() was called: the next request is the removal.
		this._removing = false;

		// The last 412 was answered by publishing from scratch.
		this._recovering = false;

		this._refresh_timer = null;

		// Custom publisher empty object for high level use.
		this._data = {};
	}

	// Expose Publisher constants as a property of the Publisher instance.
	get C() {
		return C;
	}

	get state() {
		return this._state;
	}

	/**
	 * Entity-tag of the publication, null until the first 2xx.
	 */
	get etag() {
		return this._etag;
	}

	get data() {
		return this._data;
	}

	set data(_data) {
		this._data = _data;
	}

	/**
	 * User API
	 */

	/**
	 * Publish this body: the initial publication, or a modification.
	 * @param {string} body - publication body.
	 */
	publish(body) {
		logger.debug('publish()');

		if (this._state === C.STATE_TERMINATED || this._removing) {
			throw new Exceptions.InvalidStateError(this._state);
		}

		if (!body) {
			throw new TypeError('Not enough arguments: Missing body');
		}

		this._ua.newPublisher(this);

		this._body = body;

		clearTimeout(this._refresh_timer);
		this._refresh_timer = null;

		this._send();
	}

	/**
	 * Remove the publication (Expires: 0), and terminate.
	 */
	terminate() {
		logger.debug('terminate()');

		if (this._state === C.STATE_TERMINATED || this._removing) {
			return;
		}

		this._removing = true;

		clearTimeout(this._refresh_timer);
		this._refresh_timer = null;

		// Nothing published and nothing on its way: nothing to remove.
		if (this._etag === null && !this._sending) {
			this._terminate(C.UNPUBLISHED);

			return;
		}

		this._send();
	}

	/**
	 * Private API.
	 */

	_send() {
		if (this._sending) {
			return;
		}

		const headers = Utils.cloneArray(this._extraHeaders);
		const removal = this._removing;
		let body = null;

		headers.push(`Event: ${this._event_name}`);

		if (removal) {
			headers.push('Expires: 0');
		} else {
			headers.push(`Expires: ${this._expires}`);
		}

		if (this._etag !== null) {
			headers.push(`SIP-If-Match: ${this._etag}`);
		}

		// The initial publication and a modification carry the body; a
		// refresh and a removal do not.
		if (
			!removal &&
			(this._etag === null || this._body !== this._published_body)
		) {
			body = this._body;
			headers.push(`Content-Type: ${this._content_type}`);
		}

		this._params.cseq += 1;

		const request = new SIPMessage.OutgoingRequest(
			JsSIP_C.PUBLISH,
			this._target,
			this._ua,
			this._params,
			headers,
			body || undefined
		);

		this._sending = true;

		const request_sender = new RequestSender(this._ua, request, {
			onRequestTimeout: () => {
				this._sending = false;
				this._terminate(C.PUBLISH_RESPONSE_TIMEOUT);
			},
			onTransportError: () => {
				this._sending = false;
				this._terminate(C.PUBLISH_TRANSPORT_ERROR);
			},
			// RequestSender increased the CSeq of its copy of the request.
			onAuthenticated: () => {
				this._params.cseq += 1;
			},
			onReceiveResponse: response => {
				if (response.status_code < 200) {
					return;
				}

				this._sending = false;
				this._receiveResponse(response, body, removal);
			},
		});

		request_sender.send();
	}

	_receiveResponse(response, sentBody, removal) {
		if (this._state === C.STATE_TERMINATED) {
			return;
		}

		const status_code = response.status_code;

		// Answer to the removal.
		if (removal) {
			if (
				(status_code >= 200 && status_code < 300) ||
				// The server had already forgotten the publication.
				status_code === 412
			) {
				this._terminate(C.UNPUBLISHED, response);
			} else {
				this._terminate(this._failureCode(status_code), response);
			}

			return;
		}

		if (status_code >= 200 && status_code < 300) {
			const etag = response.getHeader('SIP-ETag');

			// RFC 3903 11.3: the 2xx carries the entity-tag.
			if (!etag) {
				logger.warn('2xx response without SIP-ETag');
				this._terminate(C.PUBLISH_WRONG_OK_RESPONSE, response);

				return;
			}

			this._etag = etag.trim();
			this._recovering = false;

			if (sentBody !== null) {
				this._published_body = sentBody;
			}

			this._state = C.STATE_PUBLISHED;

			logger.debug('emit "published"');

			this.emit('published', response);

			// terminate() was called while this PUBLISH was in flight.
			if (this._removing) {
				this._send();

				return;
			}

			// publish() was called while this PUBLISH was in flight.
			if (this._body !== this._published_body) {
				this._send();

				return;
			}

			let expires = parseInt(response.getHeader('expires'));

			if (!Utils.isDecimal(expires) || expires <= 0) {
				expires = this._expires;
			}

			this._scheduleRefresh(expires);

			return;
		}

		// RFC 3903 6: the server does not know our entity-tag any more.
		// Publish from scratch, once.
		if (status_code === 412 && !this._recovering) {
			logger.debug('412, publishing again from scratch');

			this._recovering = true;
			this._etag = null;
			this._published_body = null;

			if (this._removing) {
				this._terminate(C.UNPUBLISHED, response);
			} else {
				this._send();
			}

			return;
		}

		// RFC 3903 5: interval too brief.
		if (status_code === 423 && response.hasHeader('min-expires')) {
			const min_expires = parseInt(response.getHeader('min-expires'));

			if (Utils.isDecimal(min_expires) && min_expires > this._expires) {
				logger.debug(`423, publishing again with Expires: ${min_expires}`);

				this._expires = min_expires;
				this._send();

				return;
			}
		}

		this._terminate(this._failureCode(status_code), response);
	}

	_failureCode(status_code) {
		return status_code === 401 || status_code === 407
			? C.PUBLISH_AUTHENTICATION_FAILED
			: C.PUBLISH_NON_OK_RESPONSE;
	}

	_scheduleRefresh(expires) {
		// Same margin as Subscriber, for Chrome intensive timer throttling.
		const timeout =
			expires >= 140
				? (expires * 1000) / 2 +
					Math.floor((expires / 2 - 70) * 1000 * Math.random())
				: expires * 1000 - 5000;

		logger.debug(
			`next PUBLISH will be sent in ${Math.floor(timeout / 1000)} sec`
		);

		clearTimeout(this._refresh_timer);
		this._refresh_timer = setTimeout(() => {
			this._refresh_timer = null;
			this._send();
		}, timeout);
	}

	_terminate(terminationCode, response = undefined) {
		if (this._state === C.STATE_TERMINATED) {
			return;
		}

		this._state = C.STATE_TERMINATED;

		clearTimeout(this._refresh_timer);
		this._refresh_timer = null;

		this._ua.destroyPublisher(this);

		logger.debug(`emit "terminated" code=${terminationCode}`);

		this.emit('terminated', terminationCode, response);
	}
};

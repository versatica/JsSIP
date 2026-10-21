import * as JsSIP_C from './Constants';
import { DigestAuthentication } from './DigestAuthentication';
import type { DigestChallenge } from './DigestAuthentication';
import { Logger } from './Logger';
import type { IncomingResponse, OutgoingRequest } from './SIPMessage';
import * as Transactions from './Transactions';

const logger = new Logger('RequestSender');

/**
 * The `UA` surface a request sender depends on.
 *
 * TODO: Replace with `import type { UA } from './UA'` once `UA` is ported to
 * TypeScript.
 */
export interface RequestSenderUA extends Transactions.TransactionUA {
	readonly C: { STATUS_USER_CLOSED: number };
	readonly status: number;
	readonly configuration: Transactions.TransactionUA['configuration'] & {
		authorization_user: string | null;
		password: string | null;
		realm: string | null;
		ha1: string | null;
		authorization_jwt: string | null;
	};

	set(parameter: string, value: unknown): boolean;
}

/**
 * The callbacks a request sender reports to the applicant. Every one of them is
 * optional; the ones left out fall back to `DEFAULT_EVENT_HANDLERS`.
 */
export interface RequestSenderEventHandlers {
	onRequestTimeout(): void;
	onTransportError(): void;
	onReceiveResponse(response: IncomingResponse): void;
	onAuthenticated(request: OutgoingRequest): void;
}

/**
 * The transaction an outgoing request is sent over. Note that
 * `AckClientTransaction` is not a real transaction and so, unlike the other
 * two, has no `state`.
 */
export type ClientTransaction =
	| Transactions.NonInviteClientTransaction
	| Transactions.InviteClientTransaction
	| Transactions.AckClientTransaction;

// Default event handlers.
const DEFAULT_EVENT_HANDLERS: RequestSenderEventHandlers = {
	onRequestTimeout: () => {},
	onTransportError: () => {},
	onReceiveResponse: () => {},
	onAuthenticated: () => {},
};

export class RequestSender {
	/* NOTE: Not set by the constructor. Set by `send()`, which every applicant
	 * calls right after construction.
	 */
	clientTransaction?: ClientTransaction;

	#ua: RequestSenderUA;
	#eventHandlers: RequestSenderEventHandlers;
	#method: string;
	#request: OutgoingRequest;
	#auth: DigestAuthentication | null = null;
	#challenged = false;
	#staled = false;

	constructor(
		ua: RequestSenderUA,
		request: OutgoingRequest,
		eventHandlers: Partial<RequestSenderEventHandlers>
	) {
		this.#ua = ua;
		this.#method = request.method;
		this.#request = request;

		/* NOTE: Fills the given object in place, as the original implementation
		 * does, so the applicant sees the defaults too.
		 */
		this.#eventHandlers = Object.assign(eventHandlers, {
			onRequestTimeout:
				eventHandlers.onRequestTimeout ||
				DEFAULT_EVENT_HANDLERS.onRequestTimeout,
			onTransportError:
				eventHandlers.onTransportError ||
				DEFAULT_EVENT_HANDLERS.onTransportError,
			onReceiveResponse:
				eventHandlers.onReceiveResponse ||
				DEFAULT_EVENT_HANDLERS.onReceiveResponse,
			onAuthenticated:
				eventHandlers.onAuthenticated || DEFAULT_EVENT_HANDLERS.onAuthenticated,
		});

		// If ua is in closing process or even closed just allow sending Bye and ACK.
		if (
			ua.status === ua.C.STATUS_USER_CLOSED &&
			this.#method !== JsSIP_C.BYE &&
			this.#method !== JsSIP_C.ACK
		) {
			this.#eventHandlers.onTransportError();
		}
	}

	/**
	 * Create the client transaction and send the message.
	 */
	send(): void {
		const eventHandlers: Transactions.ClientTransactionEventHandlers = {
			onRequestTimeout: () => {
				this.#eventHandlers.onRequestTimeout();
			},
			onTransportError: () => {
				this.#eventHandlers.onTransportError();
			},
			onReceiveResponse: response => {
				this.#receiveResponse(response);
			},
		};

		switch (this.#method) {
			case 'INVITE': {
				this.clientTransaction = new Transactions.InviteClientTransaction(
					this.#ua,
					this.#ua.transport,
					this.#request,
					eventHandlers
				);
				break;
			}
			case 'ACK': {
				this.clientTransaction = new Transactions.AckClientTransaction(
					this.#ua,
					this.#ua.transport,
					this.#request,
					eventHandlers
				);
				break;
			}
			default: {
				this.clientTransaction = new Transactions.NonInviteClientTransaction(
					this.#ua,
					this.#ua.transport,
					this.#request,
					eventHandlers
				);
			}
		}

		// If authorization JWT is present, use it.
		if (this.#ua.configuration.authorization_jwt) {
			this.#request.setHeader(
				'Authorization',
				this.#ua.configuration.authorization_jwt
			);
		}

		this.clientTransaction.send();
	}

	/**
	 * Called from client transaction when receiving a correct response to the request.
	 * Authenticate request if needed or pass the response back to the applicant.
	 */
	#receiveResponse(response: IncomingResponse): void {
		let challenge: DigestChallenge | undefined;
		let authorization_header_name: string;
		const status_code = response.status_code;

		/*
		 * Authentication
		 * Authenticate once. _challenged_ flag used to avoid infinite authentications.
		 */
		if (
			(status_code === 401 || status_code === 407) &&
			(this.#ua.configuration.password !== null ||
				this.#ua.configuration.ha1 !== null)
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
				this.#eventHandlers.onReceiveResponse(response);

				return;
			}

			if (!this.#challenged || (!this.#staled && challenge.stale === true)) {
				if (!this.#auth) {
					this.#auth = new DigestAuthentication({
						username: this.#ua.configuration.authorization_user,
						password: this.#ua.configuration.password,
						realm: this.#ua.configuration.realm,
						ha1: this.#ua.configuration.ha1,
					});
				}

				// Verify that the challenge is really valid.
				if (!this.#auth.authenticate(this.#request, challenge)) {
					this.#eventHandlers.onReceiveResponse(response);

					return;
				}
				this.#challenged = true;

				// Update ha1 and realm in the UA.
				this.#ua.set('realm', this.#auth.get('realm'));
				this.#ua.set('ha1', this.#auth.get('ha1'));

				if (challenge.stale) {
					this.#staled = true;
				}

				this.#request = this.#request.clone();
				this.#request.cseq += 1;
				this.#request.setHeader(
					'cseq',
					`${this.#request.cseq} ${this.#method}`
				);
				this.#request.setHeader(
					authorization_header_name,
					this.#auth.toString()
				);

				this.#eventHandlers.onAuthenticated(this.#request);
				this.send();
			} else {
				this.#eventHandlers.onReceiveResponse(response);
			}
		} else {
			this.#eventHandlers.onReceiveResponse(response);
		}
	}
}

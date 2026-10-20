import { EventEmitter } from 'events';

import * as JsSIP_C from './Constants';
import { Logger } from './Logger';
import * as SIPMessage from './SIPMessage';
import * as Timers from './Timers';
import type { Transport } from './Transport';

const loggernict = new Logger('NonInviteClientTransaction');
const loggerict = new Logger('InviteClientTransaction');
const loggeract = new Logger('AckClientTransaction');
const loggernist = new Logger('NonInviteServerTransaction');
const loggerist = new Logger('InviteServerTransaction');

/**
 * Transaction states.
 */
export enum Status {
	TRYING = 1,
	PROCEEDING = 2,
	CALLING = 3,
	ACCEPTED = 4,
	COMPLETED = 5,
	TERMINATED = 6,
	CONFIRMED = 7,
}

/**
 * Transaction types, each also being the key of the corresponding registry in
 * the UA.
 */
export enum Type {
	NON_INVITE_CLIENT = 'nict',
	NON_INVITE_SERVER = 'nist',
	INVITE_CLIENT = 'ict',
	INVITE_SERVER = 'ist',
}

/**
 * The callbacks a client transaction reports to whoever sent the request.
 */
export interface ClientTransactionEventHandlers {
	onRequestTimeout(): void;
	onTransportError(): void;
	onReceiveResponse(response: SIPMessage.IncomingResponse): void;
}

/**
 * Any transaction held in the UA transaction tables.
 */
export type Transaction =
	| NonInviteClientTransaction
	| InviteClientTransaction
	| NonInviteServerTransaction
	| InviteServerTransaction;

/**
 * The UA transaction tables, indexed by transaction id (the Via branch).
 */
export interface TransactionRegistry {
	nict: Record<string, NonInviteClientTransaction>;
	nist: Record<string, NonInviteServerTransaction>;
	ict: Record<string, InviteClientTransaction>;
	ist: Record<string, InviteServerTransaction>;
}

/**
 * The `UA` surface transactions depend on.
 *
 * TODO: Replace with `import type { UA } from './UA'` once `UA` is ported to
 * TypeScript. It is declared structurally (on top of the `UALike` that
 * `SIPMessage` already needs) so that this module does not depend on the
 * still JavaScript `UA` module.
 */
export interface TransactionUA extends SIPMessage.UALike {
	readonly configuration: SIPMessage.UALike['configuration'] & {
		via_host: string;
	};

	newTransaction(transaction: Transaction): void;
	destroyTransaction(transaction: Transaction): void;
}

export class NonInviteClientTransaction extends EventEmitter {
	type: Type;
	id: string;
	ua: TransactionUA;
	transport: Transport;
	request: SIPMessage.OutgoingRequest;
	eventHandlers: ClientTransactionEventHandlers;

	/* NOTE: `declare`d (and so not emitted) because the original implementation
	 * does not create these own properties in the constructor. `state` is
	 * created by `stateChanged()` and the timer handles when their timers are
	 * armed.
	 */
	state?: Status;
	F?: ReturnType<typeof setTimeout>;
	K?: ReturnType<typeof setTimeout>;

	constructor(
		ua: TransactionUA,
		transport: Transport,
		request: SIPMessage.OutgoingRequest,
		eventHandlers: ClientTransactionEventHandlers
	) {
		super();

		this.type = Type.NON_INVITE_CLIENT;
		this.id = `z9hG4bK${Math.floor(Math.random() * 10000000)}`;
		this.ua = ua;
		this.transport = transport;
		this.request = request;
		this.eventHandlers = eventHandlers;

		let via = `SIP/2.0/${transport.via_transport}`;

		via += ` ${ua.configuration.via_host};branch=${this.id}`;

		this.request.setHeader('via', via);

		this.ua.newTransaction(this);
	}

	stateChanged(state: Status): void {
		this.state = state;
		this.emit('stateChanged');
	}

	send(): void {
		this.stateChanged(Status.TRYING);
		this.F = setTimeout(() => {
			this.timer_F();
		}, Timers.TIMER_F);

		if (!this.transport.send(this.request)) {
			this.onTransportError();
		}
	}

	onTransportError(): void {
		loggernict.debug(
			`transport error occurred, deleting transaction ${this.id}`
		);
		clearTimeout(this.F);
		clearTimeout(this.K);
		this.stateChanged(Status.TERMINATED);
		this.ua.destroyTransaction(this);
		this.eventHandlers.onTransportError();
	}

	timer_F(): void {
		loggernict.debug(`Timer F expired for transaction ${this.id}`);
		this.stateChanged(Status.TERMINATED);
		this.ua.destroyTransaction(this);
		this.eventHandlers.onRequestTimeout();
	}

	timer_K(): void {
		this.stateChanged(Status.TERMINATED);
		this.ua.destroyTransaction(this);
	}

	receiveResponse(response: SIPMessage.IncomingResponse): void {
		const status_code = response.status_code;

		if (status_code < 200) {
			switch (this.state) {
				case Status.TRYING:
				case Status.PROCEEDING: {
					this.stateChanged(Status.PROCEEDING);
					this.eventHandlers.onReceiveResponse(response);
					break;
				}
			}
		} else {
			switch (this.state) {
				case Status.TRYING:
				case Status.PROCEEDING: {
					this.stateChanged(Status.COMPLETED);
					clearTimeout(this.F);

					if (status_code === 408) {
						this.eventHandlers.onRequestTimeout();
					} else {
						this.eventHandlers.onReceiveResponse(response);
					}

					this.K = setTimeout(() => {
						this.timer_K();
					}, Timers.TIMER_K);
					break;
				}
				case Status.COMPLETED: {
					break;
				}
			}
		}
	}
}

export class InviteClientTransaction extends EventEmitter {
	type: Type;
	id: string;
	ua: TransactionUA;
	transport: Transport;
	request: SIPMessage.OutgoingRequest;
	eventHandlers: ClientTransactionEventHandlers;

	/* NOTE: `declare`d (and so not emitted) because the original implementation
	 * does not create these own properties in the constructor. `state` is
	 * created by `stateChanged()` and the timer handles when their timers are
	 * armed.
	 */
	state?: Status;
	B?: ReturnType<typeof setTimeout>;
	D?: ReturnType<typeof setTimeout>;
	M?: ReturnType<typeof setTimeout>;

	constructor(
		ua: TransactionUA,
		transport: Transport,
		request: SIPMessage.OutgoingRequest,
		eventHandlers: ClientTransactionEventHandlers
	) {
		super();

		this.type = Type.INVITE_CLIENT;
		this.id = `z9hG4bK${Math.floor(Math.random() * 10000000)}`;
		this.ua = ua;
		this.transport = transport;
		this.request = request;
		this.eventHandlers = eventHandlers;
		request.transaction = this;

		let via = `SIP/2.0/${transport.via_transport}`;

		via += ` ${ua.configuration.via_host};branch=${this.id}`;

		this.request.setHeader('via', via);

		this.ua.newTransaction(this);
	}

	stateChanged(state: Status): void {
		this.state = state;
		this.emit('stateChanged');
	}

	send(): void {
		this.stateChanged(Status.CALLING);
		this.B = setTimeout(() => {
			this.timer_B();
		}, Timers.TIMER_B);

		if (!this.transport.send(this.request)) {
			this.onTransportError();
		}
	}

	onTransportError(): void {
		clearTimeout(this.B);
		clearTimeout(this.D);
		clearTimeout(this.M);

		if (this.state !== Status.ACCEPTED) {
			loggerict.debug(
				`transport error occurred, deleting transaction ${this.id}`
			);
			this.eventHandlers.onTransportError();
		}

		this.stateChanged(Status.TERMINATED);
		this.ua.destroyTransaction(this);
	}

	// RFC 6026 7.2.
	timer_M(): void {
		loggerict.debug(`Timer M expired for transaction ${this.id}`);

		if (this.state === Status.ACCEPTED) {
			clearTimeout(this.B);
			this.stateChanged(Status.TERMINATED);
			this.ua.destroyTransaction(this);
		}
	}

	// RFC 3261 17.1.1.
	timer_B(): void {
		loggerict.debug(`Timer B expired for transaction ${this.id}`);
		if (this.state === Status.CALLING) {
			this.stateChanged(Status.TERMINATED);
			this.ua.destroyTransaction(this);
			this.eventHandlers.onRequestTimeout();
		}
	}

	timer_D(): void {
		loggerict.debug(`Timer D expired for transaction ${this.id}`);
		clearTimeout(this.B);
		this.stateChanged(Status.TERMINATED);
		this.ua.destroyTransaction(this);
	}

	sendACK(response: SIPMessage.IncomingResponse): void {
		/* NOTE: The non-null assertions below just reproduce the original
		 * behaviour: the header getters are typed as possibly `undefined` but
		 * their value is forwarded unconditionally.
		 */
		const ack = new SIPMessage.OutgoingRequest(
			JsSIP_C.ACK,
			this.request.ruri,
			this.ua,
			{
				route_set: this.request.getHeaders('route'),
				call_id: this.request.getHeader('call-id') as string,
				cseq: this.request.cseq,
			}
		);

		ack.setHeader('from', this.request.getHeader('from')!);
		ack.setHeader('via', this.request.getHeader('via')!);
		ack.setHeader('to', response.getHeader('to')!);

		this.D = setTimeout(() => {
			this.timer_D();
		}, Timers.TIMER_D);

		this.transport.send(ack);
	}

	cancel(reason?: string): void {
		// Send only if a provisional response (>100) has been received.
		if (this.state !== Status.PROCEEDING) {
			return;
		}

		const cancel = new SIPMessage.OutgoingRequest(
			JsSIP_C.CANCEL,
			this.request.ruri,
			this.ua,
			{
				route_set: this.request.getHeaders('route'),
				call_id: this.request.getHeader('call-id') as string,
				cseq: this.request.cseq,
			}
		);

		cancel.setHeader('from', this.request.getHeader('from')!);
		cancel.setHeader('via', this.request.getHeader('via')!);
		cancel.setHeader('to', this.request.getHeader('to')!);

		if (reason) {
			cancel.setHeader('reason', reason);
		}

		this.transport.send(cancel);
	}

	receiveResponse(response: SIPMessage.IncomingResponse): void {
		const status_code = response.status_code;

		if (status_code >= 100 && status_code <= 199) {
			switch (this.state) {
				case Status.CALLING: {
					this.stateChanged(Status.PROCEEDING);
					this.eventHandlers.onReceiveResponse(response);
					break;
				}
				case Status.PROCEEDING: {
					this.eventHandlers.onReceiveResponse(response);
					break;
				}
			}
		} else if (status_code >= 200 && status_code <= 299) {
			switch (this.state) {
				case Status.CALLING:
				case Status.PROCEEDING: {
					this.stateChanged(Status.ACCEPTED);
					this.M = setTimeout(() => {
						this.timer_M();
					}, Timers.TIMER_M);
					this.eventHandlers.onReceiveResponse(response);
					break;
				}
				case Status.ACCEPTED: {
					this.eventHandlers.onReceiveResponse(response);
					break;
				}
			}
		} else if (status_code >= 300 && status_code <= 699) {
			switch (this.state) {
				case Status.CALLING:
				case Status.PROCEEDING: {
					this.stateChanged(Status.COMPLETED);
					this.sendACK(response);
					this.eventHandlers.onReceiveResponse(response);
					break;
				}
				case Status.COMPLETED: {
					this.sendACK(response);
					break;
				}
			}
		}
	}
}

export class AckClientTransaction extends EventEmitter {
	id: string;
	transport: Transport;
	request: SIPMessage.OutgoingRequest;
	eventHandlers: ClientTransactionEventHandlers;

	constructor(
		ua: TransactionUA,
		transport: Transport,
		request: SIPMessage.OutgoingRequest,
		eventHandlers: ClientTransactionEventHandlers
	) {
		super();

		this.id = `z9hG4bK${Math.floor(Math.random() * 10000000)}`;
		this.transport = transport;
		this.request = request;
		this.eventHandlers = eventHandlers;

		let via = `SIP/2.0/${transport.via_transport}`;

		via += ` ${ua.configuration.via_host};branch=${this.id}`;

		this.request.setHeader('via', via);
	}

	send(): void {
		if (!this.transport.send(this.request)) {
			this.onTransportError();
		}
	}

	onTransportError(): void {
		loggeract.debug(`transport error occurred for transaction ${this.id}`);
		this.eventHandlers.onTransportError();
	}
}

export class NonInviteServerTransaction extends EventEmitter {
	type: Type;
	id: string;
	ua: TransactionUA;
	transport: Transport;
	request: SIPMessage.IncomingRequest;
	last_response: string;
	state: Status;

	/* NOTE: `declare`d (and so not emitted) because the original implementation
	 * does not create these own properties in the constructor.
	 */
	transportError?: boolean;
	J?: ReturnType<typeof setTimeout>;

	constructor(
		ua: TransactionUA,
		transport: Transport,
		request: SIPMessage.IncomingRequest
	) {
		super();

		this.type = Type.NON_INVITE_SERVER;
		this.id = request.via_branch!;
		this.ua = ua;
		this.transport = transport;
		this.request = request;
		this.last_response = '';
		request.server_transaction = this;

		this.state = Status.TRYING;

		ua.newTransaction(this);
	}

	stateChanged(state: Status): void {
		this.state = state;
		this.emit('stateChanged');
	}

	timer_J(): void {
		loggernist.debug(`Timer J expired for transaction ${this.id}`);
		this.stateChanged(Status.TERMINATED);
		this.ua.destroyTransaction(this);
	}

	onTransportError(): void {
		if (!this.transportError) {
			this.transportError = true;

			loggernist.debug(
				`transport error occurred, deleting transaction ${this.id}`
			);

			clearTimeout(this.J);
			this.stateChanged(Status.TERMINATED);
			this.ua.destroyTransaction(this);
		}
	}

	receiveResponse(
		status_code: number,
		response: string,
		onSuccess?: () => void,
		onFailure?: () => void
	): void {
		if (status_code === 100) {
			/* RFC 4320 4.1
			 * 'A SIP element MUST NOT
			 * send any provisional response with a
			 * Status-Code other than 100 to a non-INVITE request.'
			 */
			switch (this.state) {
				case Status.TRYING: {
					this.stateChanged(Status.PROCEEDING);
					if (!this.transport.send(response)) {
						this.onTransportError();
					}
					break;
				}
				case Status.PROCEEDING: {
					this.last_response = response;
					if (!this.transport.send(response)) {
						this.onTransportError();
						if (onFailure) {
							onFailure();
						}
					} else if (onSuccess) {
						onSuccess();
					}
					break;
				}
			}
		} else if (status_code >= 200 && status_code <= 699) {
			switch (this.state) {
				case Status.TRYING:
				case Status.PROCEEDING: {
					this.stateChanged(Status.COMPLETED);
					this.last_response = response;
					this.J = setTimeout(() => {
						this.timer_J();
					}, Timers.TIMER_J);
					if (!this.transport.send(response)) {
						this.onTransportError();
						if (onFailure) {
							onFailure();
						}
					} else if (onSuccess) {
						onSuccess();
					}
					break;
				}
				case Status.COMPLETED: {
					break;
				}
			}
		}
	}
}

export class InviteServerTransaction extends EventEmitter {
	type: Type;
	id: string;
	ua: TransactionUA;
	transport: Transport;
	request: SIPMessage.IncomingRequest;
	last_response: string;
	state: Status;
	resendProvisionalTimer: ReturnType<typeof setInterval> | null;

	/* NOTE: `declare`d (and so not emitted) because the original implementation
	 * does not create these own properties in the constructor.
	 */
	transportError?: boolean;
	H?: ReturnType<typeof setTimeout>;
	I?: ReturnType<typeof setTimeout>;
	L?: ReturnType<typeof setTimeout>;

	constructor(
		ua: TransactionUA,
		transport: Transport,
		request: SIPMessage.IncomingRequest
	) {
		super();

		this.type = Type.INVITE_SERVER;
		this.id = request.via_branch!;
		this.ua = ua;
		this.transport = transport;
		this.request = request;
		this.last_response = '';
		request.server_transaction = this;

		this.state = Status.PROCEEDING;

		ua.newTransaction(this);

		this.resendProvisionalTimer = null;

		request.reply(100);
	}

	stateChanged(state: Status): void {
		this.state = state;
		this.emit('stateChanged');
	}

	timer_H(): void {
		loggerist.debug(`Timer H expired for transaction ${this.id}`);

		if (this.state === Status.COMPLETED) {
			loggerist.debug('ACK not received, dialog will be terminated');
		}

		this.stateChanged(Status.TERMINATED);
		this.ua.destroyTransaction(this);
	}

	timer_I(): void {
		this.stateChanged(Status.TERMINATED);
		this.ua.destroyTransaction(this);
	}

	// RFC 6026 7.1.
	timer_L(): void {
		loggerist.debug(`Timer L expired for transaction ${this.id}`);

		if (this.state === Status.ACCEPTED) {
			this.stateChanged(Status.TERMINATED);
			this.ua.destroyTransaction(this);
		}
	}

	onTransportError(): void {
		if (!this.transportError) {
			this.transportError = true;

			loggerist.debug(
				`transport error occurred, deleting transaction ${this.id}`
			);

			if (this.resendProvisionalTimer !== null) {
				clearInterval(this.resendProvisionalTimer);
				this.resendProvisionalTimer = null;
			}

			clearTimeout(this.L);
			clearTimeout(this.H);
			clearTimeout(this.I);

			this.stateChanged(Status.TERMINATED);
			this.ua.destroyTransaction(this);
		}
	}

	resend_provisional(): void {
		if (!this.transport.send(this.last_response)) {
			this.onTransportError();
		}
	}

	// INVITE Server Transaction RFC 3261 17.2.1.
	receiveResponse(
		status_code: number,
		response: string,
		onSuccess?: () => void,
		onFailure?: () => void
	): void {
		if (status_code >= 100 && status_code <= 199) {
			switch (this.state) {
				case Status.PROCEEDING: {
					if (!this.transport.send(response)) {
						this.onTransportError();
					}
					this.last_response = response;
					break;
				}
			}
		}

		if (
			status_code > 100 &&
			status_code <= 199 &&
			this.state === Status.PROCEEDING
		) {
			// Trigger the resendProvisionalTimer only for the first non 100 provisional response.
			if (this.resendProvisionalTimer === null) {
				this.resendProvisionalTimer = setInterval(() => {
					this.resend_provisional();
				}, Timers.PROVISIONAL_RESPONSE_INTERVAL);
			}
		} else if (status_code >= 200 && status_code <= 299) {
			/* NOTE: The original implementation lets the `Status.PROCEEDING`
			 * case fall through into the `Status.ACCEPTED` one. TypeScript's
			 * `noFallthroughCasesInSwitch` forbids that, so the proceeding part
			 * is guarded by the state read before entering the switch, which is
			 * exactly when the original evaluates the switch discriminant.
			 */
			const was_proceeding = this.state === Status.PROCEEDING;

			switch (this.state) {
				case Status.PROCEEDING:
				case Status.ACCEPTED: {
					if (was_proceeding) {
						this.stateChanged(Status.ACCEPTED);
						this.last_response = response;
						this.L = setTimeout(() => {
							this.timer_L();
						}, Timers.TIMER_L);

						if (this.resendProvisionalTimer !== null) {
							clearInterval(this.resendProvisionalTimer);
							this.resendProvisionalTimer = null;
						}
					}

					// Note that this point will be reached for proceeding this.state also.
					if (!this.transport.send(response)) {
						this.onTransportError();
						if (onFailure) {
							onFailure();
						}
					} else if (onSuccess) {
						onSuccess();
					}
					break;
				}
			}
		} else if (status_code >= 300 && status_code <= 699) {
			switch (this.state) {
				case Status.PROCEEDING: {
					if (this.resendProvisionalTimer !== null) {
						clearInterval(this.resendProvisionalTimer);
						this.resendProvisionalTimer = null;
					}

					if (!this.transport.send(response)) {
						this.onTransportError();
						if (onFailure) {
							onFailure();
						}
					} else {
						this.stateChanged(Status.COMPLETED);
						this.H = setTimeout(() => {
							this.timer_H();
						}, Timers.TIMER_H);
						if (onSuccess) {
							onSuccess();
						}
					}
					break;
				}
			}
		}
	}
}

/**
 * INVITE:
 *  _true_ if retransmission
 *  _false_ new request
 *
 * ACK:
 *  _true_  ACK to non2xx response
 *  _false_ ACK must be passed to TU (accepted state)
 *          ACK to 2xx response
 *
 * CANCEL:
 *  _true_  no matching invite transaction
 *  _false_ matching invite transaction and no final response sent
 *
 * OTHER:
 *  _true_  retransmission
 *  _false_ new request
 */
export function checkTransaction(
	{ _transactions }: { _transactions: TransactionRegistry },
	request: SIPMessage.IncomingRequest
): boolean | undefined {
	/* NOTE: The original implementation uses a single `let tr` declared before
	 * the switch. It is declared per case here so that each one gets the
	 * matching transaction type; the variable was never read across cases.
	 */
	switch (request.method) {
		case JsSIP_C.INVITE: {
			const tr = _transactions.ist[request.via_branch!];

			if (tr) {
				switch (tr.state) {
					case Status.PROCEEDING: {
						tr.transport.send(tr.last_response);
						break;
					}

					// RFC 6026 7.1 Invite retransmission.
					// Received while in Status.ACCEPTED state. Absorb it.
					case Status.ACCEPTED: {
						break;
					}
				}

				return true;
			}
			break;
		}
		case JsSIP_C.ACK: {
			const tr = _transactions.ist[request.via_branch!];

			// RFC 6026 7.1.
			if (tr) {
				if (tr.state === Status.ACCEPTED) {
					return false;
				} else if (tr.state === Status.COMPLETED) {
					tr.state = Status.CONFIRMED;
					tr.I = setTimeout(() => {
						tr.timer_I();
					}, Timers.TIMER_I);

					return true;
				}
			}
			// ACK to 2XX Response.
			else {
				return false;
			}
			break;
		}
		case JsSIP_C.CANCEL: {
			const tr = _transactions.ist[request.via_branch!];

			if (tr) {
				request.reply_sl(200);
				if (tr.state === Status.PROCEEDING) {
					return false;
				} else {
					return true;
				}
			} else {
				request.reply_sl(481);

				return true;
			}
		}
		default: {
			// Non-INVITE Server Transaction RFC 3261 17.2.2.
			const tr = _transactions.nist[request.via_branch!];

			if (tr) {
				switch (tr.state) {
					case Status.TRYING: {
						break;
					}
					case Status.PROCEEDING:
					case Status.COMPLETED: {
						tr.transport.send(tr.last_response);
						break;
					}
				}

				return true;
			}
			break;
		}
	}

	return undefined;
}

import { Logger } from './Logger';
import { isSocket } from './Socket';
import type { Socket, WeightedSocket } from './Socket';
import {
	CONNECTION_RECOVERY_MAX_INTERVAL,
	CONNECTION_RECOVERY_MIN_INTERVAL,
} from './Constants';

const logger = new Logger('Transport');

/**
 * Constants
 */
const C = {
	// Transport status.
	STATUS_CONNECTED: 0,
	STATUS_CONNECTING: 1,
	STATUS_DISCONNECTED: 2,

	// Socket status.
	SOCKET_STATUS_READY: 0,
	SOCKET_STATUS_ERROR: 1,

	// Recovery options.
	recovery_options: {
		// minimum interval in seconds between recover attempts.
		min_interval: CONNECTION_RECOVERY_MIN_INTERVAL,
		// maximum interval in seconds between recover attempts.
		max_interval: CONNECTION_RECOVERY_MAX_INTERVAL,
	},
};

export type RecoveryOptions = {
	min_interval: number;
	max_interval: number;
};

/**
 * A socket of the collection, along with its weight and current status.
 */
export type TransportSocket = {
	socket: Socket;
	weight: number;
	status: number;
};

export type TransportConnectingEvent = {
	socket: Socket;
	attempts: number;
};

/**
 * NOTE: `socket` holds the `Transport` itself, not the underlying socket.
 */
export type TransportConnectedEvent = {
	socket: Transport;
};

export type TransportDisconnectedEvent = {
	socket: Socket;
	error: boolean;
	code?: number;
	reason?: string;
};

export type TransportDataEvent = {
	transport: Transport;
	message: string;
};

/*
 * Manages one or multiple JsSIP.Socket instances.
 * Is reponsible for transport recovery logic among all socket instances.
 *
 * @socket JsSIP::Socket instance
 */
export class Transport {
	#status: number;
	// Current socket.
	#socket: Socket;
	// Socket collection.
	#sockets: TransportSocket[] = [];
	#recovery_options: RecoveryOptions;
	#recover_attempts = 0;
	#recovery_timer?: ReturnType<typeof setTimeout>;
	#close_requested = false;
	#textDecoder?: TextDecoder;

	// NOTE: These are assigned by `UA` once the transport is in use.
	declare onconnecting: (event: TransportConnectingEvent) => void;
	declare onconnect: (event: TransportConnectedEvent) => void;
	declare ondisconnect: (event: TransportDisconnectedEvent) => void;
	declare ondata: (event: TransportDataEvent) => void;

	constructor(
		sockets: WeightedSocket | WeightedSocket[],
		recovery_options: RecoveryOptions = C.recovery_options
	) {
		logger.debug('new()');

		this.#status = C.STATUS_DISCONNECTED;
		this.#recovery_options = recovery_options;

		// It seems that TextDecoder is not available in some versions of React-Native.
		// See https://github.com/versatica/JsSIP/issues/695
		try {
			this.#textDecoder = new TextDecoder('utf8');
		} catch (error) {
			logger.warn(`cannot use TextDecoder: ${error}`);
		}

		if (typeof sockets === 'undefined') {
			throw new TypeError("Invalid argument. undefined 'sockets' argument");
		}

		if (!(sockets instanceof Array)) {
			sockets = [sockets];
		}

		sockets.forEach(socket => {
			if (!isSocket(socket.socket)) {
				throw new TypeError(
					"Invalid argument. invalid 'JsSIP.Socket' instance"
				);
			}

			if (socket.weight && !Number(socket.weight)) {
				throw new TypeError(
					"Invalid argument. 'weight' attribute is not a number"
				);
			}

			this.#sockets.push({
				socket: socket.socket,
				weight: socket.weight ?? 0,
				status: C.SOCKET_STATUS_READY,
			});
		});

		// Get the socket with higher weight.
		this.#socket = this.#getSocket();
	}

	/**
	 * Instance Methods
	 */

	get via_transport(): string {
		return this.#socket.via_transport;
	}

	get url(): string {
		return this.#socket.url;
	}

	get sip_uri(): string {
		return this.#socket.sip_uri;
	}

	get sockets(): TransportSocket[] {
		return this.#sockets;
	}

	get recovery_options(): RecoveryOptions {
		return this.#recovery_options;
	}

	connect(): void {
		logger.debug('connect()');

		if (this.isConnected()) {
			logger.debug('Transport is already connected');

			return;
		} else if (this.isConnecting()) {
			logger.debug('Transport is connecting');

			return;
		}

		this.#close_requested = false;
		this.#status = C.STATUS_CONNECTING;
		this.onconnecting({
			socket: this.#socket,
			attempts: this.#recover_attempts,
		});

		if (!this.#close_requested) {
			// Bind socket event callbacks.
			this.#socket.onconnect = this.#onConnect.bind(this);
			this.#socket.ondisconnect = this.#onDisconnect.bind(this);
			this.#socket.ondata = this.#onData.bind(this);

			this.#socket.connect();
		}

		return;
	}

	disconnect(): void {
		logger.debug('close()');

		this.#close_requested = true;
		this.#recover_attempts = 0;
		this.#status = C.STATUS_DISCONNECTED;

		// Clear recovery_timer.
		if (this.#recovery_timer !== undefined) {
			clearTimeout(this.#recovery_timer);
			this.#recovery_timer = undefined;
		}

		// Unbind socket event callbacks.
		this.#socket.onconnect = () => {};
		this.#socket.ondisconnect = () => {};
		this.#socket.ondata = () => {};

		this.#socket.disconnect();
		this.ondisconnect({
			socket: this.#socket,
			error: false,
		});
	}

	send(data: { toString(): string }): boolean {
		logger.debug('send()');

		if (!this.isConnected()) {
			logger.warn('unable to send message, transport is not connected');

			return false;
		}

		const message = data.toString();

		logger.debug(`sending message:\n\n${message}\n`);

		return this.#socket.send(message);
	}

	isConnected(): boolean {
		return this.#status === C.STATUS_CONNECTED;
	}

	isConnecting(): boolean {
		return this.#status === C.STATUS_CONNECTING;
	}

	/**
	 * Private API.
	 */

	#reconnect(): void {
		this.#recover_attempts += 1;

		let k = Math.floor(Math.random() * Math.pow(2, this.#recover_attempts) + 1);

		if (k < this.#recovery_options.min_interval) {
			k = this.#recovery_options.min_interval;
		} else if (k > this.#recovery_options.max_interval) {
			k = this.#recovery_options.max_interval;
		}

		logger.debug(
			`reconnection attempt: ${this.#recover_attempts}. next connection attempt in ${k} seconds`
		);

		this.#recovery_timer = setTimeout(() => {
			if (
				!this.#close_requested &&
				!(this.isConnected() || this.isConnecting())
			) {
				// Get the next available socket with higher weight.
				this.#socket = this.#getSocket();

				// Connect the socket.
				this.connect();
			}
		}, k * 1000);
	}

	/**
	 * get the next available socket with higher weight
	 */
	#getSocket(): Socket {
		let candidates: TransportSocket[] = [];

		this.#sockets.forEach(socket => {
			if (socket.status === C.SOCKET_STATUS_ERROR) {
				return; // continue the array iteration
			} else if (candidates.length === 0) {
				candidates.push(socket);
			} else if (socket.weight > candidates[0]!.weight) {
				candidates = [socket];
			} else if (socket.weight === candidates[0]!.weight) {
				candidates.push(socket);
			}
		});

		if (candidates.length === 0) {
			// All sockets have failed. reset sockets status.
			this.#sockets.forEach(socket => {
				socket.status = C.SOCKET_STATUS_READY;
			});

			// Get next available socket.
			return this.#getSocket();
		}

		const idx = Math.floor(Math.random() * candidates.length);

		return candidates[idx]!.socket;
	}

	/**
	 * Socket Event Handlers
	 */

	#onConnect(): void {
		this.#recover_attempts = 0;
		this.#status = C.STATUS_CONNECTED;

		// Clear recovery_timer.
		if (this.#recovery_timer !== undefined) {
			clearTimeout(this.#recovery_timer);
			this.#recovery_timer = undefined;
		}

		this.onconnect({ socket: this });
	}

	#onDisconnect(error: boolean, code?: number, reason?: string): void {
		this.#status = C.STATUS_DISCONNECTED;
		this.ondisconnect({
			socket: this.#socket,
			error,
			code,
			reason,
		});

		if (this.#close_requested) {
			return;
		}

		// Update socket status.
		else {
			this.#sockets.forEach(socket => {
				if (this.#socket === socket.socket) {
					socket.status = C.SOCKET_STATUS_ERROR;
				}
			});
		}

		this.#reconnect();
	}

	#onData(data: string | ArrayBuffer): void {
		// CRLF Keep Alive request from server, reply.
		if (data === '\r\n\r\n') {
			logger.debug('received message with double-CRLF Keep Alive request');

			try {
				// Reply with single CRLF.
				this.#socket.send('\r\n');
			} catch (error) {
				logger.warn(`error sending Keep Alive response: ${error}`);
			}

			return;
		}

		// CRLF Keep Alive response from server, ignore it.
		if (data === '\r\n') {
			logger.debug('received message with CRLF Keep Alive response');

			return;
		}

		let message: string;

		// Binary message.
		if (typeof data !== 'string') {
			try {
				if (this.#textDecoder) {
					message = this.#textDecoder.decode(data);
				} else {
					message = String.fromCharCode.apply(
						null,
						Array.from(new Uint8Array(data))
					);
				}
			} catch (error) {
				logger.debug(
					`received binary message failed to be converted into string: ${error}`
				);

				return;
			}

			logger.debug(`received binary message:\n\n${message}\n`);
		}

		// Text message.
		else {
			message = data;

			logger.debug(`received text message:\n\n${message}\n`);
		}

		this.ondata({ transport: this, message });
	}
}

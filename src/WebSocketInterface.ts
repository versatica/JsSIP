import { Logger } from './Logger';
import * as Grammar from './Grammar';
import type { Socket } from './Socket';

const logger = new Logger('WebSocketInterface');

export class WebSocketInterface implements Socket {
	#url: string;
	#sip_uri: string;
	#via_transport: string;
	#ws: WebSocket | null;

	// NOTE: These are assigned by `Transport` once the socket is in use.
	declare onconnect: () => void;
	declare ondisconnect: (
		error: boolean,
		code?: number,
		reason?: string
	) => void;
	declare ondata: (data: string | ArrayBuffer) => void;

	constructor(url: string) {
		logger.debug('new() [url:"%s"]', url);

		this.#url = url;
		this.#ws = null;

		const parsed_url = Grammar.parse(url, 'absoluteURI');

		if (parsed_url === -1) {
			logger.warn(`invalid WebSocket URI: ${url}`);
			throw new TypeError(`Invalid argument: ${url}`);
		} else if (parsed_url.scheme !== 'wss' && parsed_url.scheme !== 'ws') {
			logger.warn(`invalid WebSocket URI scheme: ${parsed_url.scheme}`);
			throw new TypeError(`Invalid argument: ${url}`);
		} else {
			this.#sip_uri = `sip:${parsed_url.host}${parsed_url.port ? `:${parsed_url.port}` : ''};transport=ws`;
			this.#via_transport = parsed_url.scheme.toUpperCase();
		}
	}

	get via_transport(): string {
		return this.#via_transport;
	}

	set via_transport(value: string) {
		this.#via_transport = value.toUpperCase();
	}

	get sip_uri(): string {
		return this.#sip_uri;
	}

	get url(): string {
		return this.#url;
	}

	connect(): void {
		logger.debug('connect()');

		if (this.isConnected()) {
			logger.debug(`WebSocket ${this.#url} is already connected`);

			return;
		} else if (this.isConnecting()) {
			logger.debug(`WebSocket ${this.#url} is connecting`);

			return;
		}

		if (this.#ws) {
			this.disconnect();
		}

		logger.debug(`connecting to WebSocket ${this.#url}`);

		try {
			this.#ws = new WebSocket(this.#url, 'sip');

			this.#ws.binaryType = 'arraybuffer';

			this.#ws.onopen = this.#onOpen.bind(this);
			this.#ws.onclose = this.#onClose.bind(this);
			this.#ws.onmessage = this.#onMessage.bind(this);
			this.#ws.onerror = this.#onError.bind(this);
		} catch (error) {
			this.#onError(error);
		}
	}

	disconnect(): void {
		logger.debug('disconnect()');

		if (this.#ws) {
			// Unbind websocket event callbacks.
			this.#ws.onopen = () => {};
			this.#ws.onclose = () => {};
			this.#ws.onmessage = () => {};
			this.#ws.onerror = () => {};

			this.#ws.close();
			this.#ws = null;
		}
	}

	send(message: string | ArrayBufferLike | Blob | ArrayBufferView): boolean {
		logger.debug('send()');

		if (this.#ws && this.isConnected()) {
			this.#ws.send(message);

			return true;
		} else {
			logger.warn('unable to send message, WebSocket is not open');

			return false;
		}
	}

	isConnected(): boolean {
		return this.#ws !== null && this.#ws.readyState === this.#ws.OPEN;
	}

	isConnecting(): boolean {
		return this.#ws !== null && this.#ws.readyState === this.#ws.CONNECTING;
	}

	/**
	 * WebSocket Event Handlers
	 */

	#onOpen(): void {
		logger.debug(`WebSocket ${this.#url} connected`);

		this.onconnect();
	}

	#onClose({ wasClean, code, reason }: CloseEvent): void {
		logger.debug(`WebSocket ${this.#url} closed`);

		if (wasClean === false) {
			logger.debug('WebSocket abrupt disconnection');
		}

		this.ondisconnect(!wasClean, code, reason);
	}

	#onMessage({ data }: MessageEvent): void {
		logger.debug('received WebSocket message');

		this.ondata(data);
	}

	#onError(e: unknown): void {
		logger.warn(`WebSocket ${this.#url} error: `, e);
	}
}

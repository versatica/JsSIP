import { Logger } from './Logger';
import { isFunction, isString } from './Utils';
import * as Grammar from './Grammar';

const logger = new Logger('Socket');

/**
 * Interface documentation: https://jssip.net/documentation/$last_version/api/socket/
 */
export interface Socket {
	readonly url: string;

	readonly sip_uri: string;

	via_transport: string;

	connect(): void;

	disconnect(): void;

	send(message: string | ArrayBufferLike | Blob | ArrayBufferView): boolean;

	isConnected(): boolean;

	isConnecting(): boolean;

	onconnect(): void;

	ondisconnect(error: boolean, code?: number, reason?: string): void;

	ondata<T>(event: T): void;
}

export interface WeightedSocket {
	socket: Socket;
	weight: number;
}

export const isSocket = (socket: unknown): socket is Socket => {
	// Ignore if an array is given.
	if (Array.isArray(socket)) {
		return false;
	}

	if (typeof socket === 'undefined') {
		logger.warn('undefined JsSIP.Socket instance');

		return false;
	}

	const candidate = socket as Partial<Socket> & Record<string, unknown>;

	// Check Properties.
	try {
		if (!isString(candidate.url)) {
			logger.warn('missing or invalid JsSIP.Socket url property');
			throw new Error('Missing or invalid JsSIP.Socket url property');
		}

		if (!isString(candidate.via_transport)) {
			logger.warn('missing or invalid JsSIP.Socket via_transport property');
			throw new Error('Missing or invalid JsSIP.Socket via_transport property');
		}

		if (Grammar.parse(candidate.sip_uri!, 'SIP_URI') === -1) {
			logger.warn('missing or invalid JsSIP.Socket sip_uri property');
			throw new Error('missing or invalid JsSIP.Socket sip_uri property');
		}
	} catch (error) {
		return false;
	}

	// Check Methods.
	try {
		['connect', 'disconnect', 'send'].forEach(method => {
			if (!isFunction(candidate[method])) {
				logger.warn(`missing or invalid JsSIP.Socket method: ${method}`);
				throw new Error(`Missing or invalid JsSIP.Socket method: ${method}`);
			}
		});
	} catch (error) {
		return false;
	}

	return true;
};

// ResponderSocket answers every request the UA sends with the response
// built by the given handler. Used to play the server side of a client
// transaction (SUBSCRIBE, PUBLISH...) without a network.

import type { Socket } from '../../Socket';

export type Responder = (request: SentRequest) => string | string[] | null;

export interface SentRequest {
	method: string;
	raw: string;
	header(name: string): string | undefined;
	body: string;
}

export default class ResponderSocket implements Socket {
	url = 'ws://localhost:12345';
	via_transport = 'WS';
	sip_uri = 'sip:localhost:12345;transport=ws';

	// Every message sent by the UA, requests and responses.
	readonly sent: string[] = [];

	// The requests among them.
	readonly requests: SentRequest[] = [];

	constructor(private readonly responder: Responder) {}

	connect(): void {
		setTimeout(() => {
			this.onconnect();
		}, 0);
	}

	disconnect(): void {
		setTimeout(() => {
			this.ondisconnect();
		}, 0);
	}

	send(message: string): boolean {
		this.sent.push(message);

		// Only requests are answered.
		if (message.startsWith('SIP/2.0')) {
			return true;
		}

		const request = parse(message);

		this.requests.push(request);

		const answer = this.responder(request);
		const messages = answer === null ? [] : ([] as string[]).concat(answer);

		for (const data of messages) {
			this.inject(data);
		}

		return true;
	}

	// Deliver a message to the UA, as if the server had sent it.
	inject(message: string): void {
		setTimeout(() => {
			this.ondata(message);
		}, 0);
	}

	isConnected(): boolean {
		return true;
	}

	isConnecting(): boolean {
		return false;
	}

	onconnect(): void {}

	ondisconnect(): void {}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	ondata<T>(_event: T): void {}
}

function parse(message: string): SentRequest {
	const [head, body = ''] = message.split('\r\n\r\n');
	const lines = head.split('\r\n');

	return {
		method: lines[0].split(' ')[0],
		raw: message,
		header(name: string): string | undefined {
			const prefix = `${name.toLowerCase()}:`;
			const line = lines.find(l => l.toLowerCase().startsWith(prefix));

			return line?.substring(prefix.length).trim();
		},
		body,
	};
}

/**
 * Build the response to `request`: Via, From, To (tagged), Call-ID and CSeq
 * copied from it, then `headers`.
 */
export function reply(
	request: SentRequest,
	status: number,
	reason: string,
	headers: string[] = []
): string {
	const lines = request.raw.split('\r\n\r\n')[0].split('\r\n');
	const copied = lines.filter(line => /^(via|from|call-id|cseq):/i.test(line));
	let to = lines.find(line => /^to:/i.test(line))!;

	if (!/;tag=/i.test(to)) {
		to += ';tag=responder';
	}

	return [
		`SIP/2.0 ${status} ${reason}`,
		...copied,
		to,
		...headers,
		'Content-Length: 0',
		'',
		'',
	].join('\r\n');
}

/**
 * Build the final NOTIFY of the subscription `subscribe` (any request of
 * its dialog), as the notifier of `reply` would send it.
 */
export function finalNotify(subscribe: SentRequest, event: string): string {
	const contact = subscribe.header('Contact')!.replace(/^<([^>]*)>.*$/, '$1');
	const from = subscribe.header('From')!;
	let to = subscribe.header('To')!;

	if (!/;tag=/i.test(to)) {
		to += ';tag=responder';
	}

	return [
		`NOTIFY ${contact} SIP/2.0`,
		'Via: SIP/2.0/WS example.com;branch=z9hG4bKresponder',
		'Max-Forwards: 70',
		`From: ${to}`,
		`To: ${from}`,
		`Call-ID: ${subscribe.header('Call-ID')}`,
		'CSeq: 1 NOTIFY',
		`Event: ${event}`,
		'Subscription-State: terminated',
		'Contact: <sip:responder@example.com;transport=ws>',
		'Content-Length: 0',
		'',
		'',
	].join('\r\n');
}

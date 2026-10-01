import './include/common';
import ResponderSocket, { reply } from './include/ResponderSocket';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const JsSIP = require('../JsSIP.js');
const { UA } = JsSIP;

interface TestUA {
	on(event: string, listener: (...args: never[]) => void): void;
	stop(): void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	notify(...args: any[]): any;
}

function startUA(): { ua: TestUA; socket: ResponderSocket } {
	// NOTIFY requests are accepted.
	const socket = new ResponderSocket(request =>
		request.method === 'NOTIFY' ? reply(request, 200, 'OK') : null
	);
	const ua = new UA({
		sockets: socket,
		uri: 'sip:alice@example.com',
		register: false,
	});

	ua.start();

	return { ua, socket };
}

/** A SUBSCRIBE from bob to alice, without the headers in `omit`. */
function subscribe(omit: string[] = []): string {
	const headers = [
		'Via: SIP/2.0/WS example.com;branch=z9hG4bKsubscribe',
		'Max-Forwards: 70',
		'From: <sip:bob@example.com>;tag=bob',
		'To: <sip:alice@example.com>',
		'Call-ID: notifier-test',
		'CSeq: 1 SUBSCRIBE',
		'Contact: <sip:bob@example.com;transport=ws>',
		'Event: presence',
		'Expires: 600',
		'Accept: application/pidf+xml',
	].filter(h => !omit.some(name => h.startsWith(`${name}:`)));

	return [
		'SUBSCRIBE sip:alice@example.com SIP/2.0',
		...headers,
		'Content-Length: 0',
		'',
		'',
	].join('\r\n');
}

/** The status line of the response the UA sent to `method`. */
function statusOf(socket: ResponderSocket, method: string): string | undefined {
	return socket.sent
		.find(m => m.startsWith('SIP/2.0') && m.includes(` ${method}\r\n`))
		?.split('\r\n')[0];
}

function stopAndWait(ua: TestUA): Promise<void> {
	return new Promise(resolve => {
		ua.on('disconnected', () => resolve());
		ua.stop();
	});
}

function connected(ua: TestUA): Promise<void> {
	return new Promise(resolve => ua.on('connected', () => resolve()));
}

function later(): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, 10));
}

describe('incoming SUBSCRIBE', () => {
	test('489 when nobody listens to "newSubscribe"', async () => {
		const { ua, socket } = startUA();

		await connected(ua);
		socket.inject(subscribe());
		await later();

		expect(statusOf(socket, 'SUBSCRIBE')).toBe('SIP/2.0 489 Bad Event');

		await stopAndWait(ua);
	});

	test('400 when the SUBSCRIBE has no Event header', async () => {
		const { ua, socket } = startUA();

		ua.on('newSubscribe', () => {
			throw new Error('a malformed SUBSCRIBE must not reach the application');
		});

		await connected(ua);
		socket.inject(subscribe(['Event']));
		await later();

		expect(statusOf(socket, 'SUBSCRIBE')).toBe('SIP/2.0 400 Bad Request');

		await stopAndWait(ua);
	});
});

describe('Notifier', () => {
	test('UA.stop() sends the final NOTIFY', async () => {
		const { ua, socket } = startUA();
		const ended: number[] = [];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let notifier: any;

		ua.on('newSubscribe', (e: { request: unknown }) => {
			notifier = ua.notify(e.request, 'application/pidf+xml', {});
			notifier.on('terminated', (code: number) => ended.push(code));
			notifier.start();
		});

		await connected(ua);
		socket.inject(subscribe());
		await later();

		expect(statusOf(socket, 'SUBSCRIBE')).toBe('SIP/2.0 200 OK');

		await stopAndWait(ua);

		const notify = socket.requests.find(r => r.method === 'NOTIFY');

		expect(notify?.header('Subscription-State')).toBe('terminated');
		expect(ended).toEqual([notifier.C.FINAL_NOTIFY_SENT]);
	});
});

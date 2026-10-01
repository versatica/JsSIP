import './include/common';
import ResponderSocket, { reply } from './include/ResponderSocket';
import type { SentRequest } from './include/ResponderSocket';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const JsSIP = require('../JsSIP.js');
const { UA } = JsSIP;

const TARGET = 'sip:alice@example.com';
const CONTENT_TYPE = 'application/pidf+xml';

interface TestUA {
	on(event: string, listener: (...args: never[]) => void): void;
	stop(): void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	publish(...args: any[]): any;
}

/**
 * A presence server that keeps one entity-tag. Each PUBLISH gets the
 * response returned by the next function in `script`, if any, else the
 * normal one: 200 with a new SIP-ETag, or 412 when SIP-If-Match is not the
 * current entity-tag. It grants `granted` seconds, or what was asked.
 */
function startUA(
	script: ((r: SentRequest) => string)[] = [],
	granted?: number
): {
	ua: TestUA;
	socket: ResponderSocket;
} {
	let etag: string | null = null;
	let n = 0;

	const socket = new ResponderSocket(request => {
		if (request.method !== 'PUBLISH') {
			return null;
		}

		const scripted = script.shift();

		if (scripted) {
			return scripted(request);
		}

		const ifMatch = request.header('SIP-If-Match');

		if (ifMatch !== undefined && ifMatch !== etag) {
			return reply(request, 412, 'Conditional Request Failed');
		}

		const expires = request.header('Expires');

		if (expires === '0') {
			etag = null;

			return reply(request, 200, 'OK', ['Expires: 0']);
		}

		etag = `e${++n}`;

		return reply(request, 200, 'OK', [
			`SIP-ETag: ${etag}`,
			`Expires: ${granted ?? expires}`,
		]);
	});
	const ua = new UA({
		sockets: socket,
		uri: TARGET,
		register: false,
	});

	ua.start();

	return { ua, socket };
}

function connected(ua: TestUA): Promise<void> {
	return new Promise(resolve => ua.on('connected', () => resolve()));
}

function stopAndWait(ua: TestUA): Promise<void> {
	return new Promise(resolve => {
		ua.on('disconnected', () => resolve());
		ua.stop();
	});
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function next(publisher: any, event: string): Promise<any[]> {
	return new Promise(resolve =>
		publisher.once(event, (...args: unknown[]) => resolve(args))
	);
}

/** What each PUBLISH carried: Expires, SIP-If-Match, body. */
function sent(socket: ResponderSocket): (string | undefined)[][] {
	return socket.requests
		.filter(r => r.method === 'PUBLISH')
		.map(r => [r.header('Expires'), r.header('SIP-If-Match'), r.body]);
}

describe('Publisher', () => {
	test('publishes, modifies, and removes', async () => {
		const { ua, socket } = startUA();

		await connected(ua);

		const publisher = ua.publish(TARGET, 'presence', CONTENT_TYPE);

		publisher.publish('open');
		await next(publisher, 'published');

		expect(publisher.etag).toBe('e1');
		expect(publisher.state).toBe(publisher.C.STATE_PUBLISHED);

		const [initial] = socket.requests;

		expect(initial.header('Event')).toBe('presence');
		expect(initial.header('Content-Type')).toBe(CONTENT_TYPE);

		publisher.publish('closed');
		await next(publisher, 'published');

		expect(socket.requests[1].header('CSeq')).toBe(
			`${Number(initial.header('CSeq')?.split(' ')[0]) + 1} PUBLISH`
		);
		expect(socket.requests[1].header('Call-ID')).toBe(
			initial.header('Call-ID')
		);

		publisher.terminate();

		const [code] = await next(publisher, 'terminated');

		expect(code).toBe(publisher.C.UNPUBLISHED);
		expect(sent(socket)).toEqual([
			['3600', undefined, 'open'],
			['3600', 'e1', 'closed'],
			['0', 'e2', ''],
		]);

		await stopAndWait(ua);
	});

	test('keeps one PUBLISH in flight, and sends the latest body', async () => {
		const { ua, socket } = startUA();

		await connected(ua);

		const publisher = ua.publish(TARGET, 'presence', CONTENT_TYPE);

		publisher.publish('one');
		publisher.publish('two');
		publisher.publish('three');
		await next(publisher, 'published');
		await next(publisher, 'published');

		expect(sent(socket)).toEqual([
			['3600', undefined, 'one'],
			['3600', 'e1', 'three'],
		]);

		await stopAndWait(ua);
	});

	test('refreshes without a body before the publication expires', async () => {
		// The server grants 6 s: the refresh leaves 1 s later.
		const { ua, socket } = startUA([], 6);

		await connected(ua);

		const publisher = ua.publish(TARGET, 'presence', CONTENT_TYPE);

		publisher.publish('open');
		await next(publisher, 'published');
		await next(publisher, 'published');

		expect(sent(socket)).toEqual([
			['3600', undefined, 'open'],
			['3600', 'e1', ''],
		]);
		expect(socket.requests[1].header('Content-Type')).toBeUndefined();

		await stopAndWait(ua);
	});

	test('publishes from scratch once after a 412', async () => {
		const { ua, socket } = startUA([
			r => reply(r, 200, 'OK', ['SIP-ETag: lost', 'Expires: 3600']),
		]);

		await connected(ua);

		const publisher = ua.publish(TARGET, 'presence', CONTENT_TYPE);

		publisher.publish('open');
		await next(publisher, 'published');

		// The server does not know "lost": 412, then a new publication.
		publisher.publish('closed');
		await next(publisher, 'published');

		expect(sent(socket)).toEqual([
			['3600', undefined, 'open'],
			['3600', 'lost', 'closed'],
			['3600', undefined, 'closed'],
		]);
		expect(publisher.etag).toBe('e1');

		await stopAndWait(ua);
	});

	test('terminates on a second 412 in a row', async () => {
		const { ua } = startUA([
			r => reply(r, 200, 'OK', ['SIP-ETag: lost', 'Expires: 3600']),
			r => reply(r, 412, 'Conditional Request Failed'),
			r => reply(r, 412, 'Conditional Request Failed'),
		]);

		await connected(ua);

		const publisher = ua.publish(TARGET, 'presence', CONTENT_TYPE);

		publisher.publish('open');
		await next(publisher, 'published');
		publisher.publish('closed');

		const [code, response] = await next(publisher, 'terminated');

		expect(code).toBe(publisher.C.PUBLISH_NON_OK_RESPONSE);
		expect(response.status_code).toBe(412);

		await stopAndWait(ua);
	});

	test('publishes again with the Min-Expires of a 423', async () => {
		const { ua, socket } = startUA([
			r => reply(r, 423, 'Interval Too Brief', ['Min-Expires: 7200']),
		]);

		await connected(ua);

		const publisher = ua.publish(TARGET, 'presence', CONTENT_TYPE);

		publisher.publish('open');
		await next(publisher, 'published');

		expect(sent(socket)).toEqual([
			['3600', undefined, 'open'],
			['7200', undefined, 'open'],
		]);

		await stopAndWait(ua);
	});

	test('passes the response of a refusal with "terminated"', async () => {
		const { ua } = startUA([r => reply(r, 489, 'Bad Event')]);

		await connected(ua);

		const publisher = ua.publish(TARGET, 'presence', CONTENT_TYPE);

		publisher.publish('open');

		const [code, response] = await next(publisher, 'terminated');

		expect(code).toBe(publisher.C.PUBLISH_NON_OK_RESPONSE);
		expect(response.status_code).toBe(489);
		expect(() => publisher.publish('closed')).toThrow(
			JsSIP.Exceptions.InvalidStateError
		);

		await stopAndWait(ua);
	});

	test('terminates on a 2xx without SIP-ETag', async () => {
		const { ua } = startUA([r => reply(r, 200, 'OK', ['Expires: 3600'])]);

		await connected(ua);

		const publisher = ua.publish(TARGET, 'presence', CONTENT_TYPE);

		publisher.publish('open');

		const [code] = await next(publisher, 'terminated');

		expect(code).toBe(publisher.C.PUBLISH_WRONG_OK_RESPONSE);

		await stopAndWait(ua);
	});

	test('terminate() before any publication sends nothing', async () => {
		const { ua, socket } = startUA();

		await connected(ua);

		const publisher = ua.publish(TARGET, 'presence', CONTENT_TYPE);
		const ended = next(publisher, 'terminated');

		publisher.terminate();

		const [code] = await ended;

		expect(code).toBe(publisher.C.UNPUBLISHED);
		expect(socket.requests).toHaveLength(0);

		await stopAndWait(ua);
	});

	test('terminate() during a modification removes after it', async () => {
		const { ua, socket } = startUA();

		await connected(ua);

		const publisher = ua.publish(TARGET, 'presence', CONTENT_TYPE);

		publisher.publish('open');
		await next(publisher, 'published');
		publisher.publish('closed');
		publisher.terminate();

		const [code] = await next(publisher, 'terminated');

		expect(code).toBe(publisher.C.UNPUBLISHED);
		expect(sent(socket)).toEqual([
			['3600', undefined, 'open'],
			['3600', 'e1', 'closed'],
			['0', 'e2', ''],
		]);

		await stopAndWait(ua);
	});

	test('UA.stop() removes the publication', async () => {
		const { ua, socket } = startUA();

		await connected(ua);

		const publisher = ua.publish(TARGET, 'presence', CONTENT_TYPE);

		publisher.publish('open');
		await next(publisher, 'published');

		const ended = next(publisher, 'terminated');

		await stopAndWait(ua);

		const [code] = await ended;

		expect(code).toBe(publisher.C.UNPUBLISHED);
		expect(sent(socket)).toEqual([
			['3600', undefined, 'open'],
			['0', 'e1', ''],
		]);
	});

	test('refuses an invalid target', async () => {
		const { ua } = startUA();

		await connected(ua);

		expect(() => ua.publish('sip:', 'presence', CONTENT_TYPE)).toThrow(
			TypeError
		);

		await stopAndWait(ua);
	});
});

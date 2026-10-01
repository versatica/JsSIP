import './include/common';
import ResponderSocket, { finalNotify, reply } from './include/ResponderSocket';
import type { Responder } from './include/ResponderSocket';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const JsSIP = require('../JsSIP.js');
const { UA } = JsSIP;

const TARGET = 'sip:bob@example.com';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function startUA(responder: Responder): { ua: any; socket: ResponderSocket } {
	const socket = new ResponderSocket(responder);
	const ua = new UA({
		sockets: socket,
		uri: 'sip:alice@example.com',
		register: false,
	});

	ua.start();

	return { ua, socket };
}

describe('Subscriber', () => {
	test('refuses a target that is not a SIP URI', () => {
		const { ua } = startUA(() => null);

		expect(() =>
			ua.subscribe('sip:', 'presence', 'application/pidf+xml', {})
		).toThrow(TypeError);

		ua.stop();
	});

	test('passes the final response with "terminated"', () =>
		new Promise<void>(resolve => {
			const { ua } = startUA(request =>
				request.method === 'SUBSCRIBE' ? reply(request, 489, 'Bad Event') : null
			);

			ua.on('connected', () => {
				const subscriber = ua.subscribe(
					TARGET,
					'presence',
					'application/pidf+xml',
					{}
				);

				subscriber.on(
					'terminated',
					(
						code: number,
						reason: string | undefined,
						retryAfter: number | undefined,
						response: { status_code: number } | undefined
					) => {
						expect(code).toBe(subscriber.C.SUBSCRIBE_NON_OK_RESPONSE);
						expect(reason).toBeUndefined();
						expect(retryAfter).toBeUndefined();
						expect(response?.status_code).toBe(489);

						ua.stop();
					}
				);

				subscriber.subscribe();
			});

			ua.on('disconnected', () => resolve());
		}));

	test('UA.stop() unsubscribes', () =>
		new Promise<void>(resolve => {
			const { ua, socket } = startUA(request => {
				if (request.method !== 'SUBSCRIBE') {
					return null;
				}

				return reply(request, 200, 'OK', [
					'Contact: <sip:presence@example.com;transport=ws>',
					`Expires: ${request.header('Expires')}`,
				]);
			});

			ua.on('connected', () => {
				const subscriber = ua.subscribe(
					TARGET,
					'presence',
					'application/pidf+xml',
					{ expires: 3600 }
				);

				subscriber.on('terminated', (code: number) => {
					expect(code).toBe(subscriber.C.UNSUBSCRIBED_ON_UA_STOP);
				});

				subscriber.on('accepted', () => {
					ua.stop();

					const subscribes = socket.requests.filter(
						r => r.method === 'SUBSCRIBE'
					);

					expect(subscribes).toHaveLength(2);
					expect(subscribes[0].header('Expires')).toBe('3600');
					expect(subscribes[1].header('Expires')).toBe('0');
				});

				subscriber.subscribe();
			});

			ua.on('disconnected', () => resolve());
		}));

	test('terminate() ends on the final NOTIFY, without refreshing', () =>
		new Promise<void>(resolve => {
			const { ua, socket } = startUA(request => {
				if (request.method !== 'SUBSCRIBE') {
					return null;
				}

				const ok = reply(request, 200, 'OK', [
					'Contact: <sip:presence@example.com;transport=ws>',
					`Expires: ${request.header('Expires')}`,
				]);

				return request.header('Expires') === '0'
					? [ok, finalNotify(request, 'presence')]
					: ok;
			});

			ua.on('connected', () => {
				const subscriber = ua.subscribe(
					TARGET,
					'presence',
					'application/pidf+xml',
					{ expires: 3600 }
				);

				subscriber.on('accepted', () => subscriber.terminate());

				subscriber.on('terminated', (code: number) => {
					expect(code).toBe(subscriber.C.FINAL_NOTIFY_RECEIVED);
					expect(
						socket.requests.map(r => [r.method, r.header('Expires')])
					).toEqual([
						['SUBSCRIBE', '3600'],
						['SUBSCRIBE', '0'],
					]);

					ua.stop();
				});

				subscriber.subscribe();
			});

			ua.on('disconnected', () => resolve());
		}));
});

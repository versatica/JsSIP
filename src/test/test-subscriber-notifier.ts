import './include/common';
import LoopSocket from './include/LoopSocket';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const JsSIP = require('../JsSIP.js');
const { UA } = JsSIP;

const enum STEP {
	INIT = 0,
	SOCKET_CONNECTED = 1,
	SUBSCRIBE_SENT = 2,
	UA_ON_NEWSUBSCRIBE = 3,
	NOTIFIER_ON_SUBSCRIBE = 4,
	SUBSCRIBER_ON_ACCEPTED = 5,
	SUBSCRIBER_ON_ACTIVE = 6,
	SUBSCRIBER_ON_NOTIFY_1 = 7,
	NOTIFIER_ON_UNSUBSCRIBE = 8,
	NOTIFIER_TERMINATED = 9,
	SUBSCRIBER_ON_NOTIFY_2 = 10,
	SUBSCRIBER_TERMINATED = 11,
}

describe('subscriber/notifier communication', () => {
	test('should handle subscriber/notifier communication', () =>
		new Promise<void>(resolve => {
			let step = STEP.INIT;

			const TARGET = 'ikq';
			const REQUEST_URI = 'sip:ikq@example.com';
			const CONTACT_URI = 'sip:ikq@abcdefabcdef.invalid;transport=ws';
			const SUBSCRIBE_ACCEPT = 'application/text, text/plain';
			const EVENT_NAME = 'weather';
			const CONTENT_TYPE = 'text/plain';
			const WEATHER_REQUEST = 'Please report the weather condition';
			const WEATHER_REPORT = '+20..+24°C, no precipitation, light wind';

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			function createSubscriber(ua: any): void {
				const options = {
					expires: 3600,
					contentType: CONTENT_TYPE,
				};

				const subscriber = ua.subscribe(
					TARGET,
					EVENT_NAME,
					SUBSCRIBE_ACCEPT,
					options
				);

				subscriber.on('active', () => {
					// 'receive notify with subscription-state: active'
					expect(++step).toBe(STEP.SUBSCRIBER_ON_ACTIVE);
				});

				subscriber.on(
					'notify',
					(
						isFinal: boolean,
						notify: {
							method: string;
							getHeader: (name: string) => string;
							parseHeader: (name: string) => { state: string };
						},
						body?: string,
						contType?: string
					) => {
						step++;
						// 'receive notify'
						expect(
							step === STEP.SUBSCRIBER_ON_NOTIFY_1 ||
								step === STEP.SUBSCRIBER_ON_NOTIFY_2
						).toBe(true);

						expect(notify.method).toBe('NOTIFY');
						expect(notify.getHeader('contact')).toBe(`<${CONTACT_URI}>`); // 'notify contact'
						expect(body).toBe(WEATHER_REPORT); // 'notify body'
						expect(contType).toBe(CONTENT_TYPE); // 'notify content-type'

						const subsState = notify.parseHeader('subscription-state').state;

						expect(
							subsState === 'pending' ||
								subsState === 'active' ||
								subsState === 'terminated'
						).toBe(true); // 'notify subscription-state'

						// After receiving the first notify, send un-subscribe.
						if (step === STEP.SUBSCRIBER_ON_NOTIFY_1) {
							subscriber.terminate(WEATHER_REQUEST);
						}
					}
				);

				subscriber.on(
					'terminated',
					(
						terminationCode: number,
						reason: string | undefined,
						retryAfter: number | undefined
					) => {
						expect(++step).toBe(STEP.SUBSCRIBER_TERMINATED);
						expect(terminationCode).toBe(subscriber.C.FINAL_NOTIFY_RECEIVED);
						expect(reason).toBeUndefined();
						expect(retryAfter).toBeUndefined();

						ua.stop();
					}
				);

				subscriber.on('accepted', () => {
					expect(++step).toBe(STEP.SUBSCRIBER_ON_ACCEPTED);
				});

				subscriber.subscribe(WEATHER_REQUEST);

				expect(++step).toBe(STEP.SUBSCRIBE_SENT);
			}

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			function createNotifier(ua: any, subscribe: any): void {
				const notifier = ua.notify(subscribe, CONTENT_TYPE, { pending: false });

				// Receive subscribe (includes initial)
				notifier.on(
					'subscribe',
					(
						isUnsubscribe: boolean,
						subs: unknown,
						body?: string,
						contType?: string
					) => {
						expect(subscribe.method).toBe('SUBSCRIBE');
						expect(subscribe.getHeader('contact')).toBe(`<${CONTACT_URI}>`); // 'subscribe contact'
						expect(subscribe.getHeader('accept')).toBe(SUBSCRIBE_ACCEPT); // 'subscribe accept'
						expect(body).toBe(WEATHER_REQUEST); // 'subscribe body'
						expect(contType).toBe(CONTENT_TYPE); // 'subscribe content-type'

						expect(++step).toBe(
							isUnsubscribe
								? STEP.NOTIFIER_ON_UNSUBSCRIBE
								: STEP.NOTIFIER_ON_SUBSCRIBE
						);
						if (isUnsubscribe) {
							// 'send final notify'
							notifier.terminate(WEATHER_REPORT);
						} else {
							// 'send notify'
							notifier.notify(WEATHER_REPORT);
						}
					}
				);

				// Example only. Never reached.
				notifier.on('expired', () => {
					notifier.terminate(WEATHER_REPORT, 'timeout');
				});

				notifier.on('terminated', () => {
					expect(++step).toBe(STEP.NOTIFIER_TERMINATED);
				});

				notifier.start();
			}

			// Start JsSIP UA with loop socket.
			const config = {
				sockets: new LoopSocket(), // message sending itself, with modified Call-ID
				uri: REQUEST_URI,
				contact_uri: CONTACT_URI,
				register: false,
			};

			const ua = new UA(config);

			// Uncomment to see SIP communication
			// JsSIP.debug.enable('JsSIP:*');

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			ua.on('newSubscribe', (e: any) => {
				expect(++step).toBe(STEP.UA_ON_NEWSUBSCRIBE);

				const subs = e.request;
				const ev = subs.parseHeader('event');

				expect(subs.ruri.toString()).toBe(REQUEST_URI); // 'initial subscribe uri'
				expect(ev.event).toBe(EVENT_NAME); // 'subscribe event'

				if (ev.event !== EVENT_NAME) {
					subs.reply(489); // "Bad Event"

					return;
				}

				const accepts = subs.getHeaders('accept');
				const canUse = accepts?.some((v: string) => v.includes(CONTENT_TYPE));

				expect(canUse).toBe(true); // 'notifier can use subscribe accept header'

				if (!canUse) {
					subs.reply(406); // "Not Acceptable"

					return;
				}

				createNotifier(ua, subs);
			});

			ua.on('connected', () => {
				expect(++step).toBe(STEP.SOCKET_CONNECTED);

				createSubscriber(ua);
			});

			ua.on('disconnected', () => {
				resolve();
			});

			ua.start();
		}));
});

/* eslint no-console: 0*/

import './include/common';
import * as consts from './include/consts';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const JsSIP = require('../JsSIP.js');
const { UA, WebSocketInterface, Exceptions, C } = JsSIP;

describe('UA No WebRTC', () => {
	test('UA wrong configuration', () => {
		expect(() => new UA({ lalala: 'lololo' } as never)).toThrow(
			Exceptions.ConfigurationError
		);
	});

	test('UA no WS connection', () => {
		const config = consts.UA_CONFIGURATION;
		const wsSocket = new WebSocketInterface(consts.SOCKET_DESCRIPTION['url']);

		config['sockets'] = wsSocket;

		const ua = new UA(config);

		expect(ua instanceof UA).toBeTruthy();

		ua.start();

		expect(ua.contact.toString()).toBe(
			`<sip:${ua.contact.uri.user}@${ua.configuration.via_host};transport=ws>`
		);
		expect(
			ua.contact.toString({ outbound: false, anonymous: false, foo: true })
		).toBe(
			`<sip:${ua.contact.uri.user}@${ua.configuration.via_host};transport=ws>`
		);
		expect(ua.contact.toString({ outbound: true })).toBe(
			`<sip:${ua.contact.uri.user}@${ua.configuration.via_host};transport=ws;ob>`
		);
		expect(ua.contact.toString({ anonymous: true })).toBe(
			'<sip:anonymous@anonymous.invalid;transport=ws>'
		);
		expect(ua.contact.toString({ anonymous: true, outbound: true })).toBe(
			'<sip:anonymous@anonymous.invalid;transport=ws;ob>'
		);

		for (const parameter in consts.UA_CONFIGURATION_AFTER_START) {
			if (
				Object.prototype.hasOwnProperty.call(
					consts.UA_CONFIGURATION_AFTER_START,
					parameter
				)
			) {
				switch (parameter) {
					case 'uri':
					case 'registrar_server': {
						// eslint-disable-next-line jest/no-conditional-expect
						expect(ua.configuration[parameter].toString()).toBe(
							consts.UA_CONFIGURATION_AFTER_START[parameter]
						);
						break;
					}
					case 'sockets': {
						console.warn('IGNORE SOCKETS');
						break;
					}
					default: {
						// eslint-disable-next-line jest/no-conditional-expect
						expect(ua.configuration[parameter]).toBe(
							consts.UA_CONFIGURATION_AFTER_START[parameter]
						);
					}
				}
			}
		}

		const transport = consts.UA_TRANSPORT_AFTER_START;
		const sockets = transport['sockets'];
		const socket = sockets[0].socket;

		expect(sockets.length).toEqual(ua.transport.sockets.length);
		expect(sockets[0].weight).toEqual(ua.transport.sockets[0].weight);
		expect(socket.via_transport).toEqual(ua.transport.via_transport);
		expect(socket.sip_uri).toEqual(ua.transport.sip_uri);
		expect(socket.url).toEqual(ua.transport.url);

		expect(transport['recovery_options']).toEqual(
			ua.transport.recovery_options
		);

		ua.sendMessage('test', 'FAIL WITH CONNECTION_ERROR PLEASE', {
			eventHandlers: {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				failed: function (e: any) {
					expect(e.cause).toEqual(C.causes.CONNECTION_ERROR);
				},
			},
		});

		expect(() =>
			ua.sendMessage('sip:ibc@iñaki.ðđß', 'FAIL WITH INVALID_TARGET PLEASE')
		).toThrow();

		ua.stop();
	});
});

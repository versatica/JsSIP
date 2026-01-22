/* eslint no-console: 0*/

require('./include/common');
const testUA = require('./include/testUA');
const JsSIP = require('../');

describe('UA No WebRTC', () => {
	test('UA wrong configuration', () => {
		expect(() => new JsSIP.UA({ lalala: 'lololo' })).toThrow(
			JsSIP.Exceptions.ConfigurationError
		);
	});

	test('UA no WS connection', () => {
		const config = testUA.UA_CONFIGURATION;
		const wsSocket = new JsSIP.WebSocketInterface(
			testUA.SOCKET_DESCRIPTION.url
		);

		config.sockets = wsSocket;

		const ua = new JsSIP.UA(config);

		expect(ua instanceof JsSIP.UA).toBeTruthy();

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

		for (const parameter in testUA.UA_CONFIGURATION_AFTER_START) {
			if (
				Object.prototype.hasOwnProperty.call(
					testUA.UA_CONFIGURATION_AFTER_START,
					parameter
				)
			) {
				switch (parameter) {
					case 'uri':
					case 'registrar_server': {
						expect(ua.configuration[parameter].toString()).toBe(
							testUA.UA_CONFIGURATION_AFTER_START[parameter],
							`testing parameter ${parameter}`
						);
						break;
					}
					case 'sockets': {
						console.warn('IGNORE SOCKETS');
						break;
					}
					default: {
						expect(ua.configuration[parameter]).toBe(
							testUA.UA_CONFIGURATION_AFTER_START[parameter],
							`testing parameter ${parameter}`
						);
					}
				}
			}
		}

		const transport = testUA.UA_TRANSPORT_AFTER_START;
		const sockets = transport.sockets;
		const socket = sockets[0].socket;

		expect(sockets.length).toEqual(ua.transport.sockets.length);
		expect(sockets[0].weight).toEqual(ua.transport.sockets[0].weight);
		expect(socket.via_transport).toEqual(ua.transport.via_transport);
		expect(socket.sip_uri).toEqual(ua.transport.sip_uri);
		expect(socket.url).toEqual(ua.transport.url);

		expect(transport.recovery_options).toEqual(ua.transport.recovery_options);

		ua.sendMessage('test', 'FAIL WITH CONNECTION_ERROR PLEASE', {
			eventHandlers: {
				failed: function (e) {
					expect(e.cause).toEqual(JsSIP.C.causes.CONNECTION_ERROR);
				},
			},
		});

		expect(() =>
			ua.sendMessage('sip:ibc@iñaki.ðđß', 'FAIL WITH INVALID_TARGET PLEASE')
		).toThrow();

		ua.stop();
	});
});

import './include/common';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RequestSender = require('../RequestSender.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const DigestAuthentication = require('../DigestAuthentication.js');

describe('Proactive Authorization - Nonce Count Management', () => {
	test('should maintain increasing nonce count across multiple requests', () => {
		// Create a mock UA and request
		const mockUA = {
			status: 0,
			C: { STATUS_USER_CLOSED: 10 },
			configuration: {
				registrar_server: 'sip.example.com',
				authorization_user: 'testuser',
				password: 'testpass',
				realm: 'example.com',
				ha1: null,
				authorization_jwt: null,
				uri: 'sip:testuser@example.com',
				use_preloaded_route: false,
				extra_headers: null,
			},
			transport: {
				sip_uri: 'sip:proxy.example.com',
			},
			set: () => {},
		};

		const mockRequest = {
			method: 'REGISTER',
			ruri: 'sip:example.com',
			body: null,
			headers: {},
			setHeader: () => {},
			clone: function () {
				return { ...this };
			},
			cseq: 1,
		};

		const eventHandlers = {
			onRequestTimeout: () => {},
			onTransportError: () => {},
			onReceiveResponse: () => {},
			onAuthenticated: () => {},
		};

		// Simulate first authentication after 401 challenge
		const sender1 = new RequestSender(mockUA, mockRequest, eventHandlers);

		sender1._auth = new DigestAuthentication({
			username: 'testuser',
			password: 'testpass',
			realm: 'example.com',
			ha1: null,
		});

		// Simulate receiving a challenge and authenticating
		const challenge = {
			algorithm: 'MD5',
			realm: 'example.com',
			nonce: 'abcd1234',
			opaque: null,
			stale: null,
			qop: 'auth',
		};

		sender1._auth.authenticate(mockRequest, challenge);
		expect(sender1._auth._nc).toBe(1); // First use
		expect(sender1._auth._ncHex).toBe('00000001');

		// Cache the credentials (as would happen in _receiveResponse)
		RequestSender._authCache['sip.example.com'] = {
			realm: challenge.realm,
			nonce: challenge.nonce,
			opaque: challenge.opaque,
			algorithm: challenge.algorithm,
			qop: challenge.qop,
			nc: sender1._auth._nc,
			ncHex: sender1._auth._ncHex,
			cnonce: sender1._auth._cnonce,
		};

		// Verify cache has correct values
		const cached = RequestSender._authCache['sip.example.com'];

		expect(cached.nc).toBe(1);
		expect(cached.ncHex).toBe('00000001');

		// Create a second request that will attempt proactive auth
		const mockRequest2 = {
			method: 'MESSAGE',
			ruri: 'sip:example.com',
			body: null,
			headers: {},
			setHeader: () => {},
			clone: function () {
				return { ...this };
			},
			cseq: 2,
		};

		const sender2 = new RequestSender(mockUA, mockRequest2, eventHandlers);

		// Trigger proactive authorization - should restore nonce count from cache
		sender2._attemptProactiveAuth();

		// Verify that the second request has incremented nonce count
		expect(sender2._auth._nc).toBe(2); // Should be 2, not 1!
		expect(sender2._auth._ncHex).toBe('00000002');
		expect(sender2._proactiveAuth).toBe(true);

		// The cached value should now be updated to 2
		// (This would be updated when the response is received)
		RequestSender._authCache['sip.example.com'].nc = sender2._auth._nc;
		RequestSender._authCache['sip.example.com'].ncHex = sender2._auth._ncHex;

		// Create a third request to verify continuous increment
		const mockRequest3 = {
			method: 'OPTIONS',
			ruri: 'sip:example.com',
			body: null,
			headers: {},
			setHeader: () => {},
			clone: function () {
				return { ...this };
			},
			cseq: 3,
		};

		const sender3 = new RequestSender(mockUA, mockRequest3, eventHandlers);

		sender3._attemptProactiveAuth();

		// Verify continuous increment
		expect(sender3._auth._nc).toBe(3);
		expect(sender3._auth._ncHex).toBe('00000003');
		expect(sender3._proactiveAuth).toBe(true);

		// Clean up
		delete RequestSender._authCache['sip.example.com'];
	});

	test('should handle missing nonce count in cached auth (backward compatibility)', () => {
		const mockUA = {
			status: 0,
			C: { STATUS_USER_CLOSED: 10 },
			configuration: {
				registrar_server: 'sip.example.com',
				authorization_user: 'testuser',
				password: 'testpass',
				realm: 'example.com',
				ha1: null,
				authorization_jwt: null,
				uri: 'sip:testuser@example.com',
				use_preloaded_route: false,
				extra_headers: null,
			},
			transport: {
				sip_uri: 'sip:proxy.example.com',
			},
			set: () => {},
		};

		const mockRequest = {
			method: 'REGISTER',
			ruri: 'sip:example.com',
			body: null,
			headers: {},
			setHeader: () => {},
			clone: function () {
				return { ...this };
			},
			cseq: 1,
		};

		const eventHandlers = {
			onRequestTimeout: () => {},
			onTransportError: () => {},
			onReceiveResponse: () => {},
			onAuthenticated: () => {},
		};

		// Simulate old cache format without nonce count (backward compatibility)
		RequestSender._authCache['sip.example.com'] = {
			realm: 'example.com',
			nonce: 'oldnonce',
			opaque: null,
			algorithm: 'MD5',
			qop: 'auth',
			// Missing: nc, ncHex, cnonce
		};

		const sender = new RequestSender(mockUA, mockRequest, eventHandlers);

		sender._attemptProactiveAuth();

		// Should default to 0, then increment to 1
		expect(sender._auth._nc).toBe(1);
		expect(sender._auth._ncHex).toBe('00000001');

		// Clean up
		delete RequestSender._authCache['sip.example.com'];
	});
});

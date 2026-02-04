import './include/common';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const JsSIP = require('../JsSIP.js');
const { URI } = JsSIP;

describe('URI', () => {
	test('new URI', () => {
		const uri = new URI(null, 'alice', 'jssip.net', 6060);

		expect(uri.scheme).toBe('sip');
		expect(uri.user).toBe('alice');
		expect(uri.host).toBe('jssip.net');
		expect(uri.port).toBe(6060);
		expect(uri.toString()).toBe('sip:alice@jssip.net:6060');
		expect(uri.toAor()).toBe('sip:alice@jssip.net');
		expect(uri.toAor(false)).toBe('sip:alice@jssip.net');
		expect(uri.toAor(true)).toBe('sip:alice@jssip.net:6060');

		uri.scheme = 'SIPS';
		expect(uri.scheme).toBe('sips');
		expect(uri.toAor()).toBe('sips:alice@jssip.net');
		uri.scheme = 'sip';

		uri.user = 'Iñaki ðđ';
		expect(uri.user).toBe('Iñaki ðđ');
		expect(uri.toString()).toBe('sip:I%C3%B1aki%20%C3%B0%C4%91@jssip.net:6060');
		expect(uri.toAor()).toBe('sip:I%C3%B1aki%20%C3%B0%C4%91@jssip.net');

		uri.user = '%61lice';
		expect(uri.toAor()).toBe('sip:alice@jssip.net');

		uri.user = null;
		expect(uri.user).toBeNull();
		expect(uri.toAor()).toBe('sip:jssip.net');
		uri.user = 'alice';

		expect(() => {
			uri.host = null;
		}).toThrow(TypeError);

		expect(() => {
			uri.host = { bar: 'foo' };
		}).toThrow(TypeError);

		expect(uri.host).toBe('jssip.net');

		uri.host = 'VERSATICA.com';
		expect(uri.host).toBe('versatica.com');
		uri.host = 'jssip.net';

		uri.port = null;
		expect(uri.port).toBeNull();

		uri.port = undefined;
		expect(uri.port).toBeNull();

		uri.port = 'ABCD'; // Should become null.
		expect(uri.toString()).toBe('sip:alice@jssip.net');

		uri.port = '123ABCD'; // Should become 123.
		expect(uri.toString()).toBe('sip:alice@jssip.net:123');

		uri.port = 0;
		expect(uri.port).toBe(0);
		expect(uri.toString()).toBe('sip:alice@jssip.net:0');
		uri.port = null;

		expect(uri.hasParam('foo')).toBe(false);

		uri.setParam('Foo', null);
		expect(uri.hasParam('FOO')).toBe(true);

		uri.setParam('Baz', 123);
		expect(uri.getParam('baz')).toBe('123');
		expect(uri.toString()).toBe('sip:alice@jssip.net;foo;baz=123');

		uri.setParam('zero', 0);
		expect(uri.hasParam('ZERO')).toBe(true);
		expect(uri.getParam('ZERO')).toBe('0');
		expect(uri.toString()).toBe('sip:alice@jssip.net;foo;baz=123;zero=0');
		expect(uri.deleteParam('ZERO')).toBe('0');

		expect(uri.deleteParam('baZ')).toBe('123');
		expect(uri.deleteParam('NOO')).toBeUndefined();
		expect(uri.toString()).toBe('sip:alice@jssip.net;foo');

		uri.clearParams();
		expect(uri.toString()).toBe('sip:alice@jssip.net');

		expect(uri.hasHeader('foo')).toBe(false);

		uri.setHeader('Foo', 'LALALA');
		expect(uri.hasHeader('FOO')).toBe(true);
		expect(uri.getHeader('FOO')).toEqual(['LALALA']);
		expect(uri.toString()).toBe('sip:alice@jssip.net?Foo=LALALA');

		uri.setHeader('bAz', ['ABC-1', 'ABC-2']);
		expect(uri.getHeader('baz')).toEqual(['ABC-1', 'ABC-2']);
		expect(uri.toString()).toBe(
			'sip:alice@jssip.net?Foo=LALALA&Baz=ABC-1&Baz=ABC-2'
		);

		expect(uri.deleteHeader('baZ')).toEqual(['ABC-1', 'ABC-2']);
		expect(uri.deleteHeader('NOO')).toBeUndefined();

		uri.clearHeaders();
		expect(uri.toString()).toBe('sip:alice@jssip.net');

		const uri2 = uri.clone();

		expect(uri2.toString()).toBe(uri.toString());
		uri2.user = 'popo';
		expect(uri2.user).toBe('popo');
		expect(uri.user).toBe('alice');
	});
});

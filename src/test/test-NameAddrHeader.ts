import './include/common';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const JsSIP = require('../JsSIP.js');
const { URI, NameAddrHeader } = JsSIP;

describe('NameAddrHeader', () => {
	test('new NameAddrHeader', () => {
		const uri = new URI('sip', 'alice', 'jssip.net');
		const name = new NameAddrHeader(uri, 'Alice æßð');

		expect(name.display_name).toBe('Alice æßð');
		expect(name.toString()).toBe('"Alice æßð" <sip:alice@jssip.net>');

		name.display_name = null;
		expect(name.toString()).toBe('<sip:alice@jssip.net>');

		name.display_name = 0;
		expect(name.toString()).toBe('"0" <sip:alice@jssip.net>');

		name.display_name = '';
		expect(name.toString()).toBe('<sip:alice@jssip.net>');

		name.setParam('Foo', null);
		expect(name.hasParam('FOO')).toBe(true);

		name.setParam('Baz', 123);
		expect(name.getParam('baz')).toBe('123');
		expect(name.toString()).toBe('<sip:alice@jssip.net>;foo;baz=123');

		expect(name.deleteParam('bAz')).toBe('123');

		name.clearParams();
		expect(name.toString()).toBe('<sip:alice@jssip.net>');

		const name2 = name.clone();

		expect(name2.toString()).toBe(name.toString());
		name2.display_name = '@ł€';
		expect(name2.display_name).toBe('@ł€');
	});
});

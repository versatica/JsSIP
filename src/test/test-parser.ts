import './include/common';
import * as consts from './include/consts';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const JsSIP = require('../JsSIP.js');
const { URI, NameAddrHeader, Grammar, WebSocketInterface, UA } = JsSIP;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Parser = require('../Parser.js');

describe('parser', () => {
	test('parse URI', () => {
		const data =
			'SIP:%61liCE@versaTICA.Com:6060;TRansport=TCp;Foo=ABc;baz?X-Header-1=AaA1&X-Header-2=BbB&x-header-1=AAA2';
		const uri = URI.parse(data);

		// Parsed data.
		expect(uri instanceof URI).toBeTruthy();
		expect(uri.scheme).toBe('sip');
		expect(uri.user).toBe('aliCE');
		expect(uri.host).toBe('versatica.com');
		expect(uri.port).toBe(6060);
		expect(uri.hasParam('transport')).toBe(true);
		expect(uri.hasParam('nooo')).toBe(false);
		expect(uri.getParam('transport')).toBe('tcp');
		expect(uri.getParam('foo')).toBe('ABc');
		expect(uri.getParam('baz')).toBe(null);
		expect(uri.getParam('nooo')).toBe(undefined);
		expect(uri.getHeader('x-header-1')).toEqual(['AaA1', 'AAA2']);
		expect(uri.getHeader('X-HEADER-2')).toEqual(['BbB']);
		expect(uri.getHeader('nooo')).toBe(undefined);
		expect(uri.toString()).toBe(
			'sip:aliCE@versatica.com:6060;transport=tcp;foo=ABc;baz?X-Header-1=AaA1&X-Header-1=AAA2&X-Header-2=BbB'
		);
		expect(uri.toAor()).toBe('sip:aliCE@versatica.com');

		// Alter data.
		uri.user = 'Iñaki:PASSWD';
		expect(uri.user).toBe('Iñaki:PASSWD');
		expect(uri.deleteParam('foo')).toBe('ABc');
		expect(uri.deleteHeader('x-header-1')).toEqual(['AaA1', 'AAA2']);
		expect(uri.toString()).toBe(
			'sip:I%C3%B1aki:PASSWD@versatica.com:6060;transport=tcp;baz?X-Header-2=BbB'
		);
		expect(uri.toAor()).toBe('sip:I%C3%B1aki:PASSWD@versatica.com');
		uri.clearParams();
		uri.clearHeaders();
		uri.port = null;
		expect(uri.toString()).toBe('sip:I%C3%B1aki:PASSWD@versatica.com');
		expect(uri.toAor()).toBe('sip:I%C3%B1aki:PASSWD@versatica.com');
	});

	test('parse NameAddr', () => {
		const data =
			' "Iñaki ðđøþ foo \\"bar\\" \\\\\\\\ \\\\ \\\\d \\\\\\\\d \\\\\' \\\\\\"sdf\\\\\\"" ' +
			'<SIP:%61liCE@versaTICA.Com:6060;TRansport=TCp;Foo=ABc;baz?X-Header-1=AaA1&X-Header-2=BbB&x-header-1=AAA2>;QWE=QWE;ASd';
		const name = NameAddrHeader.parse(data);

		// Parsed data.
		expect(name instanceof NameAddrHeader).toBeTruthy();
		expect(name.display_name).toBe(
			'Iñaki ðđøþ foo "bar" \\\\ \\ \\d \\\\d \\\' \\"sdf\\"'
		);
		expect(name.hasParam('qwe')).toBe(true);
		expect(name.hasParam('asd')).toBe(true);
		expect(name.hasParam('nooo')).toBe(false);
		expect(name.getParam('qwe')).toBe('QWE');
		expect(name.getParam('asd')).toBe(null);

		const uri = name.uri;

		expect(uri instanceof URI).toBeTruthy();
		expect(uri.scheme).toBe('sip');
		expect(uri.user).toBe('aliCE');
		expect(uri.host).toBe('versatica.com');
		expect(uri.port).toBe(6060);
		expect(uri.hasParam('transport')).toBe(true);
		expect(uri.hasParam('nooo')).toBe(false);
		expect(uri.getParam('transport')).toBe('tcp');
		expect(uri.getParam('foo')).toBe('ABc');
		expect(uri.getParam('baz')).toBe(null);
		expect(uri.getParam('nooo')).toBe(undefined);
		expect(uri.getHeader('x-header-1')).toEqual(['AaA1', 'AAA2']);
		expect(uri.getHeader('X-HEADER-2')).toEqual(['BbB']);
		expect(uri.getHeader('nooo')).toBe(undefined);

		// Alter data.
		name.display_name = 'Foo Bar';
		expect(name.display_name).toBe('Foo Bar');
		name.display_name = null;
		expect(name.display_name).toBe(null);
		expect(name.toString()).toBe(
			'<sip:aliCE@versatica.com:6060;transport=tcp;foo=ABc;baz?X-Header-1=AaA1&X-Header-1=AAA2&X-Header-2=BbB>;qwe=QWE;asd'
		);
		uri.user = 'Iñaki:PASSWD';
		expect(uri.toAor()).toBe('sip:I%C3%B1aki:PASSWD@versatica.com');
	});

	test('parse invalid NameAddr with non UTF-8 characters', () => {
		const buffer = Buffer.from([0xc0]);
		const data = `"${buffer.toString()}"<sip:foo@bar.com>`;
		const name = NameAddrHeader.parse(data);

		// Parsed data.
		expect(name instanceof NameAddrHeader).toBeTruthy();
		expect(name.display_name).toBe(buffer.toString());

		const uri = name.uri;

		expect(uri instanceof URI).toBeTruthy();
		expect(uri.scheme).toBe('sip');
		expect(uri.user).toBe('foo');
		expect(uri.host).toBe('bar.com');
		expect(uri.port).toBe(undefined);
	});

	test('parse NameAddr with token display_name', () => {
		const data =
			'Foo    Foo Bar\tBaz<SIP:%61liCE@versaTICA.Com:6060;TRansport=TCp;Foo=ABc;baz?X-Header-1=AaA1&X-Header-2=BbB&x-header-1=AAA2>;QWE=QWE;ASd';
		const name = NameAddrHeader.parse(data);

		// Parsed data.
		expect(name instanceof NameAddrHeader).toBeTruthy();
		expect(name.display_name).toBe('Foo Foo Bar Baz');
	});

	test('parse NameAddr with no space between DQUOTE and LAQUOT', () => {
		const data =
			'"Foo"<SIP:%61liCE@versaTICA.Com:6060;TRansport=TCp;Foo=ABc;baz?X-Header-1=AaA1&X-Header-2=BbB&x-header-1=AAA2>;QWE=QWE;ASd';
		const name = NameAddrHeader.parse(data);

		// Parsed data.
		expect(name instanceof NameAddrHeader).toBeTruthy();
		expect(name.display_name).toBe('Foo');
	});

	test('parse NameAddr with no display_name', () => {
		const data =
			'<SIP:%61liCE@versaTICA.Com:6060;TRansport=TCp;Foo=ABc;baz?X-Header-1=AaA1&X-Header-2=BbB&x-header-1=AAA2>;QWE=QWE;ASd';
		const name = NameAddrHeader.parse(data);

		// Parsed data.
		expect(name instanceof NameAddrHeader).toBeTruthy();
		expect(name.display_name).toBe(undefined);
	});

	test('parse multiple Contact', () => {
		const data =
			'"Iñaki @ł€" <SIP:+1234@ALIAX.net;Transport=WS>;+sip.Instance="abCD", sip:bob@biloxi.COM;headerParam, <sip:DOMAIN.com:5>';
		const contacts = Grammar.parse(data, 'Contact');

		expect(contacts instanceof Array).toBeTruthy();
		expect(contacts.length).toBe(3);
		const c1 = contacts[0].parsed;
		const c2 = contacts[1].parsed;
		const c3 = contacts[2].parsed;

		// Parsed data.
		expect(c1 instanceof NameAddrHeader).toBeTruthy();
		expect(c1.display_name).toBe('Iñaki @ł€');
		expect(c1.hasParam('+sip.instance')).toBe(true);
		expect(c1.hasParam('nooo')).toBe(false);
		expect(c1.getParam('+SIP.instance')).toBe('"abCD"');
		expect(c1.getParam('nooo')).toBe(undefined);
		expect(c1.uri instanceof URI).toBeTruthy();
		expect(c1.uri.scheme).toBe('sip');
		expect(c1.uri.user).toBe('+1234');
		expect(c1.uri.host).toBe('aliax.net');
		expect(c1.uri.port).toBe(undefined);
		expect(c1.uri.getParam('transport')).toBe('ws');
		expect(c1.uri.getParam('foo')).toBe(undefined);
		expect(c1.uri.getHeader('X-Header')).toBe(undefined);
		expect(c1.toString()).toBe(
			'"Iñaki @ł€" <sip:+1234@aliax.net;transport=ws>;+sip.instance="abCD"'
		);

		// Alter data.
		c1.display_name = '€€€';
		expect(c1.display_name).toBe('€€€');
		c1.uri.user = '+999';
		expect(c1.uri.user).toBe('+999');
		c1.setParam('+sip.instance', '"zxCV"');
		expect(c1.getParam('+SIP.instance')).toBe('"zxCV"');
		c1.setParam('New-Param', null);
		expect(c1.hasParam('NEW-param')).toBe(true);
		c1.uri.setParam('New-Param', null);
		expect(c1.toString()).toBe(
			'"€€€" <sip:+999@aliax.net;transport=ws;new-param>;+sip.instance="zxCV";new-param'
		);

		// Parsed data.
		expect(c2 instanceof NameAddrHeader).toBeTruthy();
		expect(c2.display_name).toBe(undefined);
		expect(c2.hasParam('HEADERPARAM')).toBe(true);
		expect(c2.uri instanceof URI).toBeTruthy();
		expect(c2.uri.scheme).toBe('sip');
		expect(c2.uri.user).toBe('bob');
		expect(c2.uri.host).toBe('biloxi.com');
		expect(c2.uri.port).toBe(undefined);
		expect(c2.uri.hasParam('headerParam')).toBe(false);
		expect(c2.toString()).toBe('<sip:bob@biloxi.com>;headerparam');

		// Alter data.
		c2.display_name = '@ł€ĸłæß';
		expect(c2.toString()).toBe('"@ł€ĸłæß" <sip:bob@biloxi.com>;headerparam');

		// Parsed data.
		expect(c3 instanceof NameAddrHeader).toBeTruthy();
		expect(c3.displayName).toBe(undefined);
		expect(c3.uri instanceof URI).toBeTruthy();
		expect(c3.uri.scheme).toBe('sip');
		expect(c3.uri.user).toBe(undefined);
		expect(c3.uri.host).toBe('domain.com');
		expect(c3.uri.port).toBe(5);
		expect(c3.uri.hasParam('nooo')).toBe(false);
		expect(c3.toString()).toBe('<sip:domain.com:5>');

		// Alter data.
		c3.uri.setParam('newUriParam', 'zxCV');
		c3.setParam('newHeaderParam', 'zxCV');
		expect(c3.toString()).toBe(
			'<sip:domain.com:5;newuriparam=zxCV>;newheaderparam=zxCV'
		);
	});

	test('parse Via', () => {
		let data =
			'SIP /  3.0 \r\n / UDP [1:ab::FF]:6060 ;\r\n  BRanch=1234;Param1=Foo;paRAM2;param3=Bar';
		let via = Grammar.parse(data, 'Via');

		expect(via.protocol).toBe('SIP');
		expect(via.transport).toBe('UDP');
		expect(via.host).toBe('[1:ab::FF]');
		expect(via.host_type).toBe('IPv6');
		expect(via.port).toBe(6060);
		expect(via.branch).toBe('1234');
		expect(via.params).toEqual({
			param1: 'Foo',
			param2: undefined,
			param3: 'Bar',
		});

		data =
			'SIP /  3.0 \r\n / UDP [1:ab::FF]:6060 ;\r\n  BRanch=1234;rport=1111;Param1=Foo;paRAM2;param3=Bar';
		via = Grammar.parse(data, 'Via');

		expect(via.protocol).toBe('SIP');
		expect(via.transport).toBe('UDP');
		expect(via.host).toBe('[1:ab::FF]');
		expect(via.host_type).toBe('IPv6');
		expect(via.port).toBe(6060);
		expect(via.branch).toBe('1234');
		expect(via.rport).toBe(1111);
		expect(via.params).toEqual({
			param1: 'Foo',
			param2: undefined,
			param3: 'Bar',
		});

		data =
			'SIP /  3.0 \r\n / UDP [1:ab::FF]:6060 ;\r\n  BRanch=1234;rport;Param1=Foo;paRAM2;param3=Bar';
		via = Grammar.parse(data, 'Via');

		expect(via.protocol).toBe('SIP');
		expect(via.transport).toBe('UDP');
		expect(via.host).toBe('[1:ab::FF]');
		expect(via.host_type).toBe('IPv6');
		expect(via.port).toBe(6060);
		expect(via.branch).toBe('1234');
		expect(via.rport).toBe(undefined);
		expect(via.params).toEqual({
			param1: 'Foo',
			param2: undefined,
			param3: 'Bar',
		});
	});

	test('parse CSeq', () => {
		const data = '123456  CHICKEN';
		const cseq = Grammar.parse(data, 'CSeq');

		expect(cseq.value).toBe(123456);
		expect(cseq.method).toBe('CHICKEN');
	});

	test('parse authentication challenge', () => {
		const data =
			'Digest realm =  "[1:ABCD::abc]", nonce =  "31d0a89ed7781ce6877de5cb032bf114", qop="AUTH,autH-INt", algorithm =  md5  ,  stale =  TRUE , opaque = "00000188"';
		const auth = Grammar.parse(data, 'challenge');

		expect(auth.realm).toBe('[1:ABCD::abc]');
		expect(auth.nonce).toBe('31d0a89ed7781ce6877de5cb032bf114');
		expect(auth.qop).toEqual(['auth', 'auth-int']);
		expect(auth.algorithm).toBe('MD5');
		expect(auth.stale).toBe(true);
		expect(auth.opaque).toBe('00000188');
	});

	test('parse Event', () => {
		const data = 'Presence;Param1=QWe;paraM2';
		const event = Grammar.parse(data, 'Event');

		expect(event.event).toBe('presence');
		expect(event.params).toEqual({ param1: 'QWe', param2: undefined });
	});

	test('parse Session-Expires', () => {
		let data, session_expires;

		data = '180;refresher=uac';
		session_expires = Grammar.parse(data, 'Session_Expires');

		expect(session_expires.expires).toBe(180);
		expect(session_expires.refresher).toBe('uac');

		data = '210  ;   refresher  =  UAS ; foo  =  bar';
		session_expires = Grammar.parse(data, 'Session_Expires');

		expect(session_expires.expires).toBe(210);
		expect(session_expires.refresher).toBe('uas');
	});

	test('parse Reason', () => {
		let data, reason;

		data = 'SIP  ; cause = 488 ; text = "Wrong SDP"';
		reason = Grammar.parse(data, 'Reason');

		expect(reason.protocol).toBe('sip');
		expect(reason.cause).toBe(488);
		expect(reason.text).toBe('Wrong SDP');

		data = 'ISUP; cause=500 ; LALA = foo';
		reason = Grammar.parse(data, 'Reason');

		expect(reason.protocol).toBe('isup');
		expect(reason.cause).toBe(500);
		expect(reason.text).toBe(undefined);
		expect(reason.params.lala).toBe('foo');
	});

	test('parse host', () => {
		let data, parsed;

		data = 'versatica.com';
		expect((parsed = Grammar.parse(data, 'host'))).not.toBe(-1);
		expect(parsed.host_type).toBe('domain');

		data = 'myhost123';
		expect((parsed = Grammar.parse(data, 'host'))).not.toBe(-1);
		expect(parsed.host_type).toBe('domain');

		data = '1.2.3.4';
		expect((parsed = Grammar.parse(data, 'host'))).not.toBe(-1);
		expect(parsed.host_type).toBe('IPv4');

		data = '[1:0:fF::432]';
		expect((parsed = Grammar.parse(data, 'host'))).not.toBe(-1);
		expect(parsed.host_type).toBe('IPv6');

		data = '1.2.3.444';
		expect((parsed = Grammar.parse(data, 'host'))).toBe(-1);

		data = 'iñaki.com';
		expect((parsed = Grammar.parse(data, 'host'))).toBe(-1);

		data = '1.2.3.bar.qwe-asd.foo';
		expect((parsed = Grammar.parse(data, 'host'))).not.toBe(-1);
		expect(parsed.host_type).toBe('domain');

		data = '1.2.3.4.bar.qwe-asd.foo';
		expect((parsed = Grammar.parse(data, 'host'))).not.toBe(-1);
		expect(parsed.host_type).toBe('domain');
	});

	test('parse Refer-To', () => {
		let data, parsed;

		data = 'sip:alice@versatica.com';
		expect((parsed = Grammar.parse(data, 'Refer_To'))).not.toBe(-1);
		expect(parsed.uri.scheme).toBe('sip');
		expect(parsed.uri.user).toBe('alice');
		expect(parsed.uri.host).toBe('versatica.com');

		data = '<sip:bob@versatica.com?Accept-Contact=sip:bobsdesk.versatica.com>';
		expect((parsed = Grammar.parse(data, 'Refer_To'))).not.toBe(-1);
		expect(parsed.uri.scheme).toBe('sip');
		expect(parsed.uri.user).toBe('bob');
		expect(parsed.uri.host).toBe('versatica.com');
		expect(parsed.uri.hasHeader('Accept-Contact')).toBe(true);
	});

	test('parse Replaces', () => {
		let parsed;

		const data = '5t2gpbrbi72v79p1i8mr;to-tag=03aq91cl9n;from-tag=kun98clbf7';

		expect((parsed = Grammar.parse(data, 'Replaces'))).not.toBe(-1);
		expect(parsed.call_id).toBe('5t2gpbrbi72v79p1i8mr');
		expect(parsed.to_tag).toBe('03aq91cl9n');
		expect(parsed.from_tag).toBe('kun98clbf7');
	});

	test('parse Status Line', () => {
		const data = 'SIP/2.0 420 Bad Extension';
		let parsed;

		expect((parsed = Grammar.parse(data, 'Status_Line'))).not.toBe(-1);
		expect(parsed.status_code).toBe(420);
	});

	test('parse message', () => {
		const data =
			// eslint-disable-next-line no-multi-str
			'INVITE sip:bob@biloxi.com SIP/2.0\r\n\
Via: SIP/2.0/TCP useragent.cisco.com;branch=z9hG4bK-a111\r\n\
To: <sip:bob@biloxi.com>\r\n\
From: "Anonymous" <sip:anonymous@anonymous.invalid>;tag=9802748\r\n\
Call-ID: 245780247857024504\r\n\
CSeq: 1 INVITE\r\n\
Max-Forwards: 70\r\n\
Privacy: id\r\n\
P-Preferred-Identity: "Cullen Jennings" <sip:fluffy@cisco.com>\r\n\r\n';

		const config = consts.UA_CONFIGURATION;
		const wsSocket = new WebSocketInterface(consts.SOCKET_DESCRIPTION['url']);

		config['sockets'] = wsSocket;

		const ua = new UA(config as ConstructorParameters<typeof UA>[0]);
		const message = Parser.parseMessage(data, ua);

		expect(message.hasHeader('P-Preferred-Identity')).toBe(true);

		const pai = message.getHeader('P-Preferred-Identity');
		const nameAddress = NameAddrHeader.parse(pai);

		expect(nameAddress instanceof NameAddrHeader).toBeTruthy();
		expect(nameAddress!.uri.user).toBe('fluffy');
		expect(nameAddress!.uri.host).toBe('cisco.com');

		expect(message.hasHeader('Privacy')).toBe(true);
		expect(message.getHeader('Privacy')).toBe('id');
	});
});

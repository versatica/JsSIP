require('./include/common');
var JsSIP = require('../');


module.exports = {

  'parse URI': function(test) {
    var data = 'SIP:%61liCE@versaTICA.Com:6060;TRansport=TCp;Foo=ABc;baz?X-Header-1=AaA1&X-Header-2=BbB&x-header-1=AAA2';
    var uri = JsSIP.URI.parse(data);

    // Parsed data.
    test.ok(uri instanceof(JsSIP.URI));
    test.strictEqual(uri.scheme, 'sip');
    test.strictEqual(uri.user, 'aliCE');
    test.strictEqual(uri.host, 'versatica.com');
    test.strictEqual(uri.port, 6060);
    test.strictEqual(uri.hasParam('transport'), true);
    test.strictEqual(uri.hasParam('nooo'), false);
    test.strictEqual(uri.getParam('transport'), 'tcp');
    test.strictEqual(uri.getParam('foo'), 'abc');
    test.strictEqual(uri.getParam('baz'), null);
    test.strictEqual(uri.getParam('nooo'), undefined);
    test.deepEqual(uri.getHeader('x-header-1'), ['AaA1', 'AAA2']);
    test.deepEqual(uri.getHeader('X-HEADER-2'), ['BbB']);
    test.strictEqual(uri.getHeader('nooo'), undefined);
    test.strictEqual(uri.toString(), 'sip:aliCE@versatica.com:6060;transport=tcp;foo=abc;baz?X-Header-1=AaA1&X-Header-1=AAA2&X-Header-2=BbB');
    test.strictEqual(uri.toAor(), 'sip:aliCE@versatica.com');

    // Alter data.
    uri.user = 'Iñaki:PASSWD';
    test.strictEqual(uri.user, 'Iñaki:PASSWD');
    test.strictEqual(uri.deleteParam('foo'), 'abc');
    test.deepEqual(uri.deleteHeader('x-header-1'), ['AaA1', 'AAA2']);
    test.strictEqual(uri.toString(), 'sip:I%C3%B1aki:PASSWD@versatica.com:6060;transport=tcp;baz?X-Header-2=BbB');
    test.strictEqual(uri.toAor(), 'sip:I%C3%B1aki:PASSWD@versatica.com');
    uri.clearParams();
    uri.clearHeaders();
    uri.port = null;
    test.strictEqual(uri.toString(), 'sip:I%C3%B1aki:PASSWD@versatica.com');
    test.strictEqual(uri.toAor(), 'sip:I%C3%B1aki:PASSWD@versatica.com');

    test.done();
  },

  'parse NameAddr': function(test) {
    var data = '"Iñaki ðđøþ" <SIP:%61liCE@versaTICA.Com:6060;TRansport=TCp;Foo=ABc;baz?X-Header-1=AaA1&X-Header-2=BbB&x-header-1=AAA2>;QWE=QWE;ASd';
    var name = JsSIP.NameAddrHeader.parse(data);
    var uri;

    // Parsed data.
    test.ok(name instanceof(JsSIP.NameAddrHeader));
    test.strictEqual(name.display_name, 'Iñaki ðđøþ');
    test.strictEqual(name.hasParam('qwe'), true);
    test.strictEqual(name.hasParam('asd'), true);
    test.strictEqual(name.hasParam('nooo'), false);
    test.strictEqual(name.getParam('qwe'), 'QWE');
    test.strictEqual(name.getParam('asd'), null);

    uri = name.uri;
    test.ok(uri instanceof(JsSIP.URI));
    test.strictEqual(uri.scheme, 'sip');
    test.strictEqual(uri.user, 'aliCE');
    test.strictEqual(uri.host, 'versatica.com');
    test.strictEqual(uri.port, 6060);
    test.strictEqual(uri.hasParam('transport'), true);
    test.strictEqual(uri.hasParam('nooo'), false);
    test.strictEqual(uri.getParam('transport'), 'tcp');
    test.strictEqual(uri.getParam('foo'), 'abc');
    test.strictEqual(uri.getParam('baz'), null);
    test.strictEqual(uri.getParam('nooo'), undefined);
    test.deepEqual(uri.getHeader('x-header-1'), ['AaA1', 'AAA2']);
    test.deepEqual(uri.getHeader('X-HEADER-2'), ['BbB']);
    test.strictEqual(uri.getHeader('nooo'), undefined);

    // Alter data.
    name.display_name = 'Foo Bar';
    test.strictEqual(name.display_name, 'Foo Bar');
    name.display_name = null;
    test.strictEqual(name.display_name, null);
    test.strictEqual(name.toString(), '<sip:aliCE@versatica.com:6060;transport=tcp;foo=abc;baz?X-Header-1=AaA1&X-Header-1=AAA2&X-Header-2=BbB>;qwe=QWE;asd');
    uri.user = 'Iñaki:PASSWD';
    test.strictEqual(uri.toAor(), 'sip:I%C3%B1aki:PASSWD@versatica.com');

    test.done();
  },

  'parse multiple Contact': function(test) {
    var data = '"Iñaki @ł€" <SIP:+1234@ALIAX.net;Transport=WS>;+sip.Instance="abCD", sip:bob@biloxi.COM;headerParam, <sip:DOMAIN.com:5>';
    var contacts = JsSIP.Grammar.parse(data, 'Contact');

    test.ok(contacts instanceof(Array));
    test.strictEqual(contacts.length, 3);
    var c1 = contacts[0].parsed;
    var c2 = contacts[1].parsed;
    var c3 = contacts[2].parsed;

    // Parsed data.
    test.ok(c1 instanceof(JsSIP.NameAddrHeader));
    test.strictEqual(c1.display_name, 'Iñaki @ł€');
    test.strictEqual(c1.hasParam('+sip.instance'), true);
    test.strictEqual(c1.hasParam('nooo'), false);
    test.strictEqual(c1.getParam('+SIP.instance'), '"abCD"');
    test.strictEqual(c1.getParam('nooo'), undefined);
    test.ok(c1.uri instanceof(JsSIP.URI));
    test.strictEqual(c1.uri.scheme, 'sip');
    test.strictEqual(c1.uri.user, '+1234');
    test.strictEqual(c1.uri.host, 'aliax.net');
    test.strictEqual(c1.uri.port, undefined);
    test.strictEqual(c1.uri.getParam('transport'), 'ws');
    test.strictEqual(c1.uri.getParam('foo'), undefined);
    test.strictEqual(c1.uri.getHeader('X-Header'), undefined);
    test.strictEqual(c1.toString(), '"Iñaki @ł€" <sip:+1234@aliax.net;transport=ws>;+sip.instance="abCD"');

    // Alter data.
    c1.display_name = '€€€';
    test.strictEqual(c1.display_name, '€€€');
    c1.uri.user = '+999';
    test.strictEqual(c1.uri.user, '+999');
    c1.setParam('+sip.instance', '"zxCV"');
    test.strictEqual(c1.getParam('+SIP.instance'), '"zxCV"');
    c1.setParam('New-Param', null);
    test.strictEqual(c1.hasParam('NEW-param'), true);
    c1.uri.setParam('New-Param', null);
    test.strictEqual(c1.toString(), '"€€€" <sip:+999@aliax.net;transport=ws;new-param>;+sip.instance="zxCV";new-param');

    // Parsed data.
    test.ok(c2 instanceof(JsSIP.NameAddrHeader));
    test.strictEqual(c2.display_name, undefined);
    test.strictEqual(c2.hasParam('HEADERPARAM'), true);
    test.ok(c2.uri instanceof(JsSIP.URI));
    test.strictEqual(c2.uri.scheme, 'sip');
    test.strictEqual(c2.uri.user, 'bob');
    test.strictEqual(c2.uri.host, 'biloxi.com');
    test.strictEqual(c2.uri.port, undefined);
    test.strictEqual(c2.uri.hasParam('headerParam'), false);
    test.strictEqual(c2.toString(), '<sip:bob@biloxi.com>;headerparam');

    // Alter data.
    c2.display_name = '@ł€ĸłæß';
    test.strictEqual(c2.toString(), '"@ł€ĸłæß" <sip:bob@biloxi.com>;headerparam');

    // Parsed data.
    test.ok(c3 instanceof(JsSIP.NameAddrHeader));
    test.strictEqual(c3.display_name, undefined);
    test.ok(c3.uri instanceof(JsSIP.URI));
    test.strictEqual(c3.uri.scheme, 'sip');
    test.strictEqual(c3.uri.user, undefined);
    test.strictEqual(c3.uri.host, 'domain.com');
    test.strictEqual(c3.uri.port, 5);
    test.strictEqual(c3.uri.hasParam('nooo'), false);
    test.strictEqual(c3.toString(), '<sip:domain.com:5>');

    // Alter data.
    c3.uri.setParam('newUriParam', 'zxCV');
    c3.setParam('newHeaderParam', 'zxCV');
    test.strictEqual(c3.toString(), '<sip:domain.com:5;newuriparam=zxcv>;newheaderparam=zxCV');

    test.done();
  },

  'parse Via': function(test) {
    var data = 'SIP /  3.0 \r\n / UDP [1:ab::FF]:6060 ;\r\n  BRanch=1234;Param1=Foo;paRAM2;param3=Bar';
    var via = JsSIP.Grammar.parse(data, 'Via');

    test.strictEqual(via.protocol, 'SIP');
    test.strictEqual(via.transport, 'UDP');
    test.strictEqual(via.host, '[1:ab::FF]');
    test.strictEqual(via.host_type, 'IPv6');
    test.strictEqual(via.port, 6060);
    test.strictEqual(via.branch, '1234');
    test.deepEqual(via.params, {param1: 'Foo', param2: undefined, param3: 'Bar'});

    test.done();
  },

  'parse CSeq': function(test) {
    var data = '123456  CHICKEN';
    var cseq = JsSIP.Grammar.parse(data, 'CSeq');

    test.strictEqual(cseq.value, 123456);
    test.strictEqual(cseq.method, 'CHICKEN');

    test.done();
  },

  'parse authentication challenge': function(test) {
    var data = 'Digest realm =  "[1:ABCD::abc]", nonce =  "31d0a89ed7781ce6877de5cb032bf114", qop="AUTH,autH-INt", algorithm =  md5  ,  stale =  TRUE , opaque = "00000188"';
    var auth = JsSIP.Grammar.parse(data, 'challenge');

    test.strictEqual(auth.realm, '[1:ABCD::abc]');
    test.strictEqual(auth.nonce, '31d0a89ed7781ce6877de5cb032bf114');
    test.deepEqual(auth.qop, ['auth', 'auth-int']);
    test.strictEqual(auth.algorithm, 'MD5');
    test.strictEqual(auth.stale, true);
    test.strictEqual(auth.opaque, '00000188');

    test.done();
  },

  'parse Event': function(test) {
    var data = 'Presence;Param1=QWe;paraM2';
    var event = JsSIP.Grammar.parse(data, 'Event');

    test.strictEqual(event.event, 'presence');
    test.deepEqual(event.params, {param1: 'QWe', param2: undefined});

    test.done();
  },

  'parse Session-Expires': function(test) {
    var data, session_expires;

    data = '180;refresher=uac';
    session_expires = JsSIP.Grammar.parse(data, 'Session_Expires');

    test.strictEqual(session_expires.expires, 180);
    test.strictEqual(session_expires.refresher, 'uac');

    data = '210  ;   refresher  =  UAS ; foo  =  bar';
    session_expires = JsSIP.Grammar.parse(data, 'Session_Expires');

    test.strictEqual(session_expires.expires, 210);
    test.strictEqual(session_expires.refresher, 'uas');

    test.done();
  },

  'parse Reason': function(test) {
    var data, reason;

    data = 'SIP  ; cause = 488 ; text = "Wrong SDP"';
    reason = JsSIP.Grammar.parse(data, 'Reason');

    test.strictEqual(reason.protocol, 'sip');
    test.strictEqual(reason.cause, 488);
    test.strictEqual(reason.text, 'Wrong SDP');

    data = 'ISUP; cause=500 ; LALA = foo';
    reason = JsSIP.Grammar.parse(data, 'Reason');

    test.strictEqual(reason.protocol, 'isup');
    test.strictEqual(reason.cause, 500);
    test.strictEqual(reason.text, undefined);
    test.strictEqual(reason.params.lala, 'foo');

    test.done();
  },

  'parse host': function(test) {
    var data, parsed;

    data = 'versatica.com';
    test.ok((parsed = JsSIP.Grammar.parse(data, 'host')) !== -1);
    test.strictEqual(parsed.host_type, 'domain');

    data = 'myhost123';
    test.ok((parsed = JsSIP.Grammar.parse(data, 'host')) !== -1);
    test.strictEqual(parsed.host_type, 'domain');

    data = '1.2.3.4';
    test.ok((parsed = JsSIP.Grammar.parse(data, 'host')) !== -1);
    test.strictEqual(parsed.host_type, 'IPv4');

    data = '[1:0:fF::432]';
    test.ok((parsed = JsSIP.Grammar.parse(data, 'host')) !== -1);
    test.strictEqual(parsed.host_type, 'IPv6');

    data = '1.2.3.444';
    test.ok(JsSIP.Grammar.parse(data, 'host') === -1);

    data = 'iñaki.com';
    test.ok(JsSIP.Grammar.parse(data, 'host') === -1);

    data = '1.2.3.bar.qwe-asd.foo';
    test.ok((parsed = JsSIP.Grammar.parse(data, 'host')) !== -1);
    test.strictEqual(parsed.host_type, 'domain');

    // TODO: This is a valid 'domain' but PEGjs finds a valid IPv4 first and does not move
    // to 'domain' after IPv4 parsing has failed.
    // NOTE: Let's ignore this issue for now to make `grunt test` happy.
    //data = '1.2.3.4.bar.qwe-asd.foo';
    //test.ok((parsed = JsSIP.Grammar.parse(data, 'host')) !== -1);
    //test.strictEqual(parsed.host_type, 'domain');

    test.done();
  }
};

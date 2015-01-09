require('./include/common');
var JsSIP = require('../');


module.exports = {

  'new URI': function(test) {
    var uri = new JsSIP.URI(null, 'alice', 'jssip.net', 6060);

    test.strictEqual(uri.scheme, 'sip');
    test.strictEqual(uri.user, 'alice');
    test.strictEqual(uri.host, 'jssip.net');
    test.strictEqual(uri.port, 6060);
    test.deepEqual(uri.parameters, {});
    test.deepEqual(uri.headers, {});
    test.strictEqual(uri.toString(), 'sip:alice@jssip.net:6060');
    test.strictEqual(uri.toAor(), 'sip:alice@jssip.net');
    test.strictEqual(uri.toAor(false), 'sip:alice@jssip.net');
    test.strictEqual(uri.toAor(true), 'sip:alice@jssip.net:6060');

    uri.scheme = 'SIPS';
    test.strictEqual(uri.scheme, 'sips');
    test.strictEqual(uri.toAor(), 'sips:alice@jssip.net');
    uri.scheme = 'sip';

    uri.user = 'Iñaki ðđ';
    test.strictEqual(uri.user, 'Iñaki ðđ');
    test.strictEqual(uri.toString(), 'sip:I%C3%B1aki%20%C3%B0%C4%91@jssip.net:6060');
    test.strictEqual(uri.toAor(), 'sip:I%C3%B1aki%20%C3%B0%C4%91@jssip.net');

    uri.user = '%61lice';
    test.strictEqual(uri.toAor(), 'sip:alice@jssip.net');

    uri.user = null;
    test.strictEqual(uri.user, null);
    test.strictEqual(uri.toAor(), 'sip:jssip.net');
    uri.user = 'alice';

    test.throws(
      function() {
        uri.host = null;
      },
      TypeError
    );
    test.throws(
      function() {
        uri.host = {bar: 'foo'};
      },
      TypeError
    );
    test.strictEqual(uri.host, 'jssip.net');

    uri.host = 'VERSATICA.com';
    test.strictEqual(uri.host, 'versatica.com');
    uri.host = 'jssip.net';

    uri.port = null;
    test.strictEqual(uri.port, null);

    uri.port = undefined;
    test.strictEqual(uri.port, null);

    uri.port = 'ABCD';  // Should become null.
    test.strictEqual(uri.toString(), 'sip:alice@jssip.net');

    uri.port = '123ABCD';  // Should become 123.
    test.strictEqual(uri.toString(), 'sip:alice@jssip.net:123');

    uri.port = 0;
    test.strictEqual(uri.port, 0);
    test.strictEqual(uri.toString(), 'sip:alice@jssip.net:0');
    uri.port = null;

    test.strictEqual(uri.hasParam('foo'), false);

    uri.setParam('Foo', null);
    test.strictEqual(uri.hasParam('FOO'), true);

    uri.setParam('Baz', 123);
    test.strictEqual(uri.getParam('baz'), '123');
    test.strictEqual(uri.toString(), 'sip:alice@jssip.net;foo;baz=123');

    uri.setParam('zero', 0);
    test.strictEqual(uri.hasParam('ZERO'), true);
    test.strictEqual(uri.getParam('ZERO'), '0');
    test.strictEqual(uri.toString(), 'sip:alice@jssip.net;foo;baz=123;zero=0');
    test.strictEqual(uri.deleteParam('ZERO'), '0');

    test.strictEqual(uri.deleteParam('baZ'), '123');
    test.strictEqual(uri.deleteParam('NOO'), undefined);
    test.strictEqual(uri.toString(), 'sip:alice@jssip.net;foo');

    uri.clearParams();
    test.strictEqual(uri.toString(), 'sip:alice@jssip.net');

    test.strictEqual(uri.hasHeader('foo'), false);

    uri.setHeader('Foo', 'LALALA');
    test.strictEqual(uri.hasHeader('FOO'), true);
    test.deepEqual(uri.getHeader('FOO'), ['LALALA']);
    test.strictEqual(uri.toString(), 'sip:alice@jssip.net?Foo=LALALA');

    uri.setHeader('bAz', ['ABC-1', 'ABC-2']);
    test.deepEqual(uri.getHeader('baz'), ['ABC-1', 'ABC-2']);
    test.strictEqual(uri.toString(), 'sip:alice@jssip.net?Foo=LALALA&Baz=ABC-1&Baz=ABC-2');

    test.deepEqual(uri.deleteHeader('baZ'), ['ABC-1', 'ABC-2']);
    test.deepEqual(uri.deleteHeader('NOO'), undefined);

    uri.clearHeaders();
    test.strictEqual(uri.toString(), 'sip:alice@jssip.net');

    var uri2 = uri.clone();
    test.strictEqual(uri2.toString(), uri.toString());
    uri2.user = 'popo';
    test.strictEqual(uri2.user, 'popo');
    test.strictEqual(uri.user, 'alice');

    test.done();
  },

  'new NameAddr': function(test) {
    var uri = new JsSIP.URI('sip', 'alice', 'jssip.net');
    var name = new JsSIP.NameAddrHeader(uri, 'Alice æßð');

    test.strictEqual(name.display_name, 'Alice æßð');
    test.strictEqual(name.toString(), '"Alice æßð" <sip:alice@jssip.net>');

    name.display_name = null;
    test.strictEqual(name.toString(), '<sip:alice@jssip.net>');

    name.display_name = 0;
    test.strictEqual(name.toString(), '"0" <sip:alice@jssip.net>');

    name.display_name = '';
    test.strictEqual(name.toString(), '<sip:alice@jssip.net>');

    test.deepEqual(name.parameters, {});

    name.setParam('Foo', null);
    test.strictEqual(name.hasParam('FOO'), true);

    name.setParam('Baz', 123);
    test.strictEqual(name.getParam('baz'), '123');
    test.strictEqual(name.toString(), '<sip:alice@jssip.net>;foo;baz=123');

    test.strictEqual(name.deleteParam('bAz'), '123');

    name.clearParams();
    test.strictEqual(name.toString(), '<sip:alice@jssip.net>');

    var name2 = name.clone();
    test.strictEqual(name2.toString(), name.toString());
    name2.display_name = '@ł€';
    test.strictEqual(name2.display_name, '@ł€');
    test.strictEqual(name.user, undefined);

    test.done();
  }

};

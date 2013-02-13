test('JsSIP.NameAddrHeader', function() {
  var name, uri;

  uri = new JsSIP.URI('sip', 'alice', 'jssip.net');
  name = new JsSIP.NameAddrHeader(uri, 'Alice æßð');

  strictEqual(name.display_name, 'Alice æßð');
  strictEqual(name.toString(), '"Alice æßð" <sip:alice@jssip.net>');

  name.display_name = null;
  strictEqual(name.toString(), '<sip:alice@jssip.net>');

  name.display_name = 0;
  strictEqual(name.toString(), '"0" <sip:alice@jssip.net>');

  name.display_name = "";
  strictEqual(name.toString(), '<sip:alice@jssip.net>');

  deepEqual(name.parameters, {});

  name.setParam('Foo', null);
  strictEqual(name.hasParam('FOO'), true);

  name.setParam('Baz', 123);
  strictEqual(name.getParam('baz'), '123');
  strictEqual(name.toString(), '<sip:alice@jssip.net>;foo;baz=123');

  strictEqual(name.deleteParam('bAz'), '123');

  name.clearParams();
  strictEqual(name.toString(), '<sip:alice@jssip.net>');

  var name2 = name.clone();
  strictEqual(name2.toString(), name.toString());
  name2.display_name = '@ł€';
  strictEqual(name2.display_name, '@ł€');
  strictEqual(name.user, undefined);
});


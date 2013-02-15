test('JsSIP.Utils.normalizeURI()', function() {
  var domain = 'jssip.net';

  var test_ok = function(given_data, expected) {
    uri = JsSIP.Utils.normalizeURI(given_data, domain);
    ok(uri instanceof(JsSIP.URI));
    strictEqual(uri.toString(), expected);
  };

  var test_error = function(given_data) {
    throws(
      function() {
        JsSIP.Utils.normalizeURI(given_data, domain);
      },
      JsSIP.Exceptions.InvalidTargetError
    );
  };

  test_ok('%61lice', 'sip:alice@jssip.net');
  test_ok('ALICE', 'sip:ALICE@jssip.net');
  test_ok('alice@DOMAIN.com', 'sip:alice@domain.com');
  test_ok('iñaki', 'sip:i%C3%B1aki@jssip.net');
  test_ok('€€€', 'sip:%E2%82%AC%E2%82%AC%E2%82%AC@jssip.net');
  test_ok('iñaki@aliax.net', 'sip:i%C3%B1aki@aliax.net');
  test_ok('SIP:iñaki@aliax.net:7070', 'sip:i%C3%B1aki@aliax.net:7070');
  test_ok('ibc@gmail.com@aliax.net', 'sip:ibc%40gmail.com@aliax.net');
  test_ok('alice-1:passwd', 'sip:alice-1:passwd@jssip.net');
  test_ok('SIP:alice-2:passwd', 'sip:alice-2:passwd@jssip.net');
  test_ok('alice-3:passwd@domain.COM', 'sip:alice-3:passwd@domain.com');
  test_ok('SIP:alice-4:passwd@domain.COM', 'sip:alice-4:passwd@domain.com');
  test_ok('sip:+1234@aliax.net', 'sip:+1234@aliax.net');
  test_ok('+999', 'sip:+999@jssip.net');
  test_ok('*999', 'sip:*999@jssip.net');
  test_ok('#999/?:1234', 'sip:%23999/?:1234@jssip.net');

  test_error(null);
  test_error(undefined);
  test_error(NaN);
  test_error(false);
  test_error(true);
  test_error('');
  test_error('ibc@iñaki.com');
  test_error('ibc@aliax.net;;;;;');

  throws(
    function() {
      JsSIP.Utils.normalizeURI('alice');
    },
    JsSIP.Exceptions.InvalidTargetError
  );
});


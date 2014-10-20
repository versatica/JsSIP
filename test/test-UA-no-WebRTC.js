test('UA wrong configuration', function() {
  throws(
    function() {
      new JsSIP.UA({'lalala': 'lololo'});
    },
    JsSIP.Exceptions.ConfigurationError
  );
});


test('UA no WS connection', function() {
  var ua = TestJsSIP.Helpers.createFakeUA();
  ok(ua instanceof(JsSIP.UA));

  ua.start();

  strictEqual(ua.contact.toString(), '<sip:' + ua.contact.uri.user + '@' + ua.configuration.via_host + ';transport=ws>');
  strictEqual(ua.contact.toString({outbound: false, anonymous: false, foo: true}), '<sip:' + ua.contact.uri.user + '@' + ua.configuration.via_host + ';transport=ws>');
  strictEqual(ua.contact.toString({outbound: true}), '<sip:' + ua.contact.uri.user + '@' + ua.configuration.via_host + ';transport=ws;ob>');
  strictEqual(ua.contact.toString({anonymous: true}), '<sip:anonymous@anonymous.invalid;transport=ws>');
  strictEqual(ua.contact.toString({anonymous: true, outbound: true}), '<sip:anonymous@anonymous.invalid;transport=ws;ob>');

  for (var parameter in TestJsSIP.Helpers.UA_CONFIGURATION_AFTER_START) {
    console.log('- testing parameter: ' + parameter);
    switch(parameter) {
      case 'uri':
      case 'registrar_server':
        deepEqual(ua.configuration[parameter].toString(), TestJsSIP.Helpers.UA_CONFIGURATION_AFTER_START[parameter], 'testing parameter ' + parameter);
        break;
      default:
        deepEqual(ua.configuration[parameter], TestJsSIP.Helpers.UA_CONFIGURATION_AFTER_START[parameter], 'testing parameter ' + parameter);
    }
  }

  ua.sendMessage('test', 'FAIL WITH CONNECTION_ERROR PLEASE', {
    eventHandlers: {
      failed: function(e) {
        strictEqual(e.data.cause, JsSIP.C.causes.CONNECTION_ERROR);
      }
    }
  });

  throws(
    function() {
      ua.sendMessage('sip:ibc@iñaki.ðđß', 'FAIL WITH INVALID_TARGET PLEASE');
    },
    JsSIP.Exceptions.TypeError
  );
});


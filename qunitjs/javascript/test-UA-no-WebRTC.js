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

  for (parameter in TestJsSIP.Helpers.DEFAULT_JSSIP_CONFIGURATION_AFTER_START) {
    if (parameter !== 'uri') {
      deepEqual(ua.configuration[parameter], TestJsSIP.Helpers.DEFAULT_JSSIP_CONFIGURATION_AFTER_START[parameter], 'testing parameter ' + parameter);
    } else {
      deepEqual(ua.configuration[parameter].toString(), TestJsSIP.Helpers.DEFAULT_JSSIP_CONFIGURATION_AFTER_START[parameter], 'testing parameter ' + parameter);
    }
  }

  ua.sendMessage('test', 'FAIL WITH CONNECTION_ERROR PLEASE', {
    eventHandlers: {
      sending: function(e) {
        var ruri = e.data.request.ruri;
        ok(ruri instanceof JsSIP.URI);
        strictEqual(e.data.request.ruri.toString(), 'sip:test@' + ua.configuration.uri.host);
      },
      failed: function(e) {
        strictEqual(e.data.cause, JsSIP.C.causes.CONNECTION_ERROR);
      }
    }
  });

  ua.sendMessage('sip:ibc@iñaki.ðđß', 'FAIL WITH INVALID_TARGET PLEASE', {
    eventHandlers: {
      sending: function(e) {
        var ruri = e.data.request.ruri;
        ok(ruri instanceof JsSIP.URI);
        strictEqual(e.data.request.ruri.toString(), JsSIP.C.INVALID_TARGET_URI);
      },
      failed: function(e) {
        strictEqual(e.data.cause, JsSIP.C.causes.INVALID_TARGET);
      }
    }
  });

});


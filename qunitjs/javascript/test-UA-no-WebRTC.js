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
    deepEqual(ua.configuration[parameter], TestJsSIP.Helpers.DEFAULT_JSSIP_CONFIGURATION_AFTER_START[parameter], 'testing parameter ' + parameter);
  }

  var views = {
    selfView: document.getElementById('selfView'),
    remoteView: document.getElementById('remoteView')
  };

// TODO: This requires running on a WebRTC capable browser by retrieving
// this web via HTTP protocol.
//
//   ua.call('test', views, {
//     mediaTypes: { audio: false, video: false },
//     eventHandlers: {
//       failed: function(e) {
//         strictEqual(e.data.cause, JsSIP.C.causes.CONNECTION_ERROR);
//       }
//     }
//   });

  ua.sendMessage('test', 'FAIL PLEASE', {
    eventHandlers: {
      sending: function(e) {
        var ruri = e.data.request.ruri;
        ok(ruri instanceof JsSIP.URI);
        strictEqual(e.data.request.ruri.toString(), 'sip:test@' + ua.configuration.domain);
      },
      failed: function(e) {
        strictEqual(e.data.cause, JsSIP.C.causes.CONNECTION_ERROR);
      }
    }
  });

  ua.sendMessage('sip:ibc@iñaki.ðđß', 'FAIL PLEASE', {
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


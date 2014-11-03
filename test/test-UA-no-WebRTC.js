require('./include/common');
var testUA = require('./include/testUA')
var JsSIP = require('../');


module.exports = {

  'UA wrong configuration': function(test) {
    test.throws(
      function() {
        new JsSIP.UA({'lalala': 'lololo'});
      },
      JsSIP.Exceptions.ConfigurationError
    );

    test.done();
  },

  'UA no WS connection': function(test) {
    var ua = new JsSIP.UA(testUA.UA_CONFIGURATION);

    test.ok(ua instanceof(JsSIP.UA));

    ua.start();

    test.strictEqual(ua.contact.toString(), '<sip:' + ua.contact.uri.user + '@' + ua.configuration.via_host + ';transport=ws>');
    test.strictEqual(ua.contact.toString({outbound: false, anonymous: false, foo: true}), '<sip:' + ua.contact.uri.user + '@' + ua.configuration.via_host + ';transport=ws>');
    test.strictEqual(ua.contact.toString({outbound: true}), '<sip:' + ua.contact.uri.user + '@' + ua.configuration.via_host + ';transport=ws;ob>');
    test.strictEqual(ua.contact.toString({anonymous: true}), '<sip:anonymous@anonymous.invalid;transport=ws>');
    test.strictEqual(ua.contact.toString({anonymous: true, outbound: true}), '<sip:anonymous@anonymous.invalid;transport=ws;ob>');

    for (var parameter in testUA.UA_CONFIGURATION_AFTER_START) {
      switch(parameter) {
        case 'uri':
        case 'registrar_server':
          test.deepEqual(ua.configuration[parameter].toString(), testUA.UA_CONFIGURATION_AFTER_START[parameter], 'testing parameter ' + parameter);
          break;
        default:
          test.deepEqual(ua.configuration[parameter], testUA.UA_CONFIGURATION_AFTER_START[parameter], 'testing parameter ' + parameter);
      }
    }

    ua.sendMessage('test', 'FAIL WITH CONNECTION_ERROR PLEASE', {
      eventHandlers: {
        failed: function(e) {
          test.strictEqual(e.data.cause, JsSIP.C.causes.CONNECTION_ERROR);
        }
      }
    });

    test.throws(
      function() {
        ua.sendMessage('sip:ibc@iñaki.ðđß', 'FAIL WITH INVALID_TARGET PLEASE');
      },
      JsSIP.Exceptions.TypeError
    );

    test.done();
  }

};

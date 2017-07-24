require('./include/common');
var testUA = require('./include/testUA');
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

    console.log('LALALALALALA');

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
        case 'sockets':
          console.warn('IGNORE SOCKETS');
          break;
        default:
          test.deepEqual(ua.configuration[parameter], testUA.UA_CONFIGURATION_AFTER_START[parameter], 'testing parameter ' + parameter);
      }
    }

    var transport = testUA.UA_TRANSPORT_AFTER_START;
    var sockets = transport.sockets;
    var socket = sockets[0].socket;

    test.deepEqual(sockets.length, ua.transport.sockets.length, 'testing transport sockets number');
    test.deepEqual(sockets[0].weight, ua.transport.sockets[0].weight, 'testing sockets weight');
    test.deepEqual(socket.via_transport, ua.transport.via_transport, 'testing transport via_transport');
    test.deepEqual(socket.sip_uri, ua.transport.sip_uri, 'testing transport sip_uri');
    test.deepEqual(socket.url, ua.transport.url, 'testing transport url');

    test.deepEqual(transport.recovery_options, ua.transport.recovery_options, 'testing transport recovery_options');

    ua.sendMessage('test', 'FAIL WITH CONNECTION_ERROR PLEASE', {
      eventHandlers: {
        failed: function(e) {
          test.strictEqual(e.cause, JsSIP.C.causes.CONNECTION_ERROR);
        }
      }
    });

    test.throws(
      function() {
        ua.sendMessage('sip:ibc@iñaki.ðđß', 'FAIL WITH INVALID_TARGET PLEASE');
      },
      JsSIP.Exceptions.TypeError
    );

    ua.stop();
    test.done();
  }

};

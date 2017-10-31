/* eslint no-console: 0*/

require('./include/common');
const testUA = require('./include/testUA');
const JsSIP = require('../');


module.exports = {

  'UA wrong configuration' : function(test)
  {
    test.throws(
      function()
      {
        /* eslint no-unused-vars: 0*/
        const ua = new JsSIP.UA({ 'lalala': 'lololo' });
      },
      JsSIP.Exceptions.ConfigurationError
    );

    test.done();
  },

  'UA no WS connection' : function(test)
  {
    const config = testUA.UA_CONFIGURATION;
    const wsSocket = new JsSIP.WebSocketInterface(testUA.SOCKET_DESCRIPTION.url);

    config.sockets = wsSocket;

    const ua = new JsSIP.UA(config);

    test.ok(ua instanceof(JsSIP.UA));

    ua.start();

    test.strictEqual(ua.contact.toString(), `<sip:${ ua.contact.uri.user }@${ ua.configuration.via_host };transport=ws>`);
    test.strictEqual(ua.contact.toString({ outbound: false, anonymous: false, foo: true }), `<sip:${ ua.contact.uri.user }@${ ua.configuration.via_host };transport=ws>`);
    test.strictEqual(ua.contact.toString({ outbound: true }), `<sip:${ ua.contact.uri.user }@${ ua.configuration.via_host };transport=ws;ob>`);
    test.strictEqual(ua.contact.toString({ anonymous: true }), '<sip:anonymous@anonymous.invalid;transport=ws>');
    test.strictEqual(ua.contact.toString({ anonymous: true, outbound: true }), '<sip:anonymous@anonymous.invalid;transport=ws;ob>');

    for (const parameter in testUA.UA_CONFIGURATION_AFTER_START)
    {
      if (Object.prototype.hasOwnProperty.call(
        testUA.UA_CONFIGURATION_AFTER_START, parameter))
      {
        switch (parameter)
        {
          case 'uri':
          case 'registrar_server':
            test.deepEqual(ua.configuration[parameter].toString(), testUA.UA_CONFIGURATION_AFTER_START[parameter], `testing parameter ${ parameter}`);
            break;
          case 'sockets':
            console.warn('IGNORE SOCKETS');
            break;
          default:
            test.deepEqual(ua.configuration[parameter], testUA.UA_CONFIGURATION_AFTER_START[parameter], `testing parameter ${ parameter}`);
        }
      }
    }

    const transport = testUA.UA_TRANSPORT_AFTER_START;
    const sockets = transport.sockets;
    const socket = sockets[0].socket;

    test.deepEqual(sockets.length, ua.transport.sockets.length, 'testing transport sockets number');
    test.deepEqual(sockets[0].weight, ua.transport.sockets[0].weight, 'testing sockets weight');
    test.deepEqual(socket.via_transport, ua.transport.via_transport, 'testing transport via_transport');
    test.deepEqual(socket.sip_uri, ua.transport.sip_uri, 'testing transport sip_uri');
    test.deepEqual(socket.url, ua.transport.url, 'testing transport url');

    test.deepEqual(transport.recovery_options, ua.transport.recovery_options, 'testing transport recovery_options');

    ua.sendMessage('test', 'FAIL WITH CONNECTION_ERROR PLEASE', {
      eventHandlers : {
        failed : function(e)
        {
          test.strictEqual(e.cause, JsSIP.C.causes.CONNECTION_ERROR);
        }
      }
    });

    test.throws(
      function()
      {
        ua.sendMessage('sip:ibc@iñaki.ðđß', 'FAIL WITH INVALID_TARGET PLEASE');
      },
      JsSIP.Exceptions.TypeError
    );

    ua.stop();
    test.done();
  }

};

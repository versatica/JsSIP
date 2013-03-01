(function(window) {
var TestJsSIP = (function() {
  "use string";
  return {};
}());


TestJsSIP.Helpers = {

  DEFAULT_JSSIP_CONFIGURATION_AFTER_START: {
    password: null,
    register_expires: 600,
    register_min_expires: 120,
    register: false,
    connection_recovery_min_interval: 2,
    connection_recovery_max_interval: 30,
    use_preloaded_route: true,
    no_answer_timeout: 60000,
    stun_servers: ['stun:stun.l.google.com:19302'],
    trace_sip: false,
    hack_via_tcp: false,
    hack_ip_in_contact: false,
    uri: 'sip:fakeUA@jssip.net',
    registrar_server: 'sip:registrar.jssip.net:6060;transport=tcp',
    ws_servers: [{'ws_uri':'ws://localhost:12345','sip_uri':'<sip:localhost:12345;transport=ws;lr>','weight':0,'status':0,'scheme':'WS'}],
    display_name: 'Fake UA ð→€ł !!!',
    authorization_user: 'fakeUA'
  },

  FAKE_UA_CONFIGURATION: {
    uri: 'f%61keUA@jssip.net',
    ws_servers:  'ws://localhost:12345',
    display_name: 'Fake UA ð→€ł !!!',
    register: false,
    use_preloaded_route: true,
    registrar_server: 'registrar.jssip.NET:6060;TRansport=TCP'
  },

  createFakeUA: function() {
    return new JsSIP.UA(this.FAKE_UA_CONFIGURATION);
  }

};


window.TestJsSIP = TestJsSIP;
}(window));



module.exports = {
  UA_CONFIGURATION: {
    uri: 'sip:f%61keUA@jssip.net',
    password: '1234ññññ',
    'sockets': [{
      'via_transport':'WS',
      'sip_uri':'sip:localhost:12345;transport=ws',
      'url':'ws://localhost:12345'
    }],
    display_name: 'Fake UA ð→€ł !!!',
    authorization_user: 'fakeUA',
    instance_id: 'uuid:8f1fa16a-1165-4a96-8341-785b1ef24f12',
    registrar_server: 'registrar.jssip.NET:6060;TRansport=TCP',
    register_expires: 600,
    register: false,
    connection_recovery_min_interval: 2,
    connection_recovery_max_interval: 30,
    use_preloaded_route: true,
    no_answer_timeout: 60000,
    session_timers: true,
  },

  UA_CONFIGURATION_AFTER_START: {
    uri: 'sip:fakeUA@jssip.net',
    password: '1234ññññ',
    display_name: 'Fake UA ð→€ł !!!',
    authorization_user: 'fakeUA',
    instance_id: '8f1fa16a-1165-4a96-8341-785b1ef24f12',  // Without 'uuid:'.
    registrar_server: 'sip:registrar.jssip.net:6060;transport=tcp',
    register_expires: 600,
    register: false,
    use_preloaded_route: true,
    no_answer_timeout: 60000 * 1000,  // Internally converted to miliseconds.
    session_timers: true,
  },

  UA_TRANSPORT_AFTER_START: {
    'sockets': [{
      'socket': {
        'via_transport':'WS',
        'sip_uri':'sip:localhost:12345;transport=ws',
        'url':'ws://localhost:12345'
      },
      'weight':0
    }],
    'recovery_options': {
      'min_interval': 2,
      'max_interval': 30
    }
  }
};



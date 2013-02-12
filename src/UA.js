
/**
 * @fileoverview SIP User Agent
 */


/**
 * @augments JsSIP
 * @class Class creating a SIP User Agent.
 */
JsSIP.UA = function(configuration) {
  var events = [
    'connected',
    'disconnected',
    'registered',
    'unregistered',
    'registrationFailed',
    'newSession',
    'newMessage'
  ];

  this.cache = {
    credentials: {}
  };

  this.configuration = {};
  this.dialogs = {};
  this.registrator = null;

  //User actions outside any session/dialog (MESSAGE)
  this.applicants = {};

  this.sessions = {};
  this.transport = null;
  this.contact = {};
  this.status = JsSIP.C.UA_STATUS_INIT;
  this.error = null;
  this.transactions = {
    nist: {},
    nict: {},
    ist: {},
    ict: {}
  };

  this.transportRecoverAttempts = 0;

  /**
   * Load configuration
   *
   * @throws {JsSIP.Exceptions.ConfigurationError}
   * @throws {TypeError}
   */

  if(configuration === undefined) {
    throw new TypeError('Not enough arguments');
  }

  try {
    this.loadConfig(configuration);
    this.initEvents(events);
  } catch(e) {
    this.status = JsSIP.C.UA_STATUS_NOT_READY;
    this.error = JsSIP.C.UA_CONFIGURATION_ERROR;
    throw e;
  }
};
JsSIP.UA.prototype = new JsSIP.EventEmitter();

//=================
//  High Level API
//=================

/**
 * Register.
 *
 * @throws {JsSIP.Exceptions.InvalidStateError}
 *
 */
JsSIP.UA.prototype.register = function(options) {
  if (this.status === JsSIP.C.UA_STATUS_USER_CLOSED) {
    throw new JsSIP.Exceptions.InvalidStateError(JsSIP.C.UA_STATUS_USER_CLOSED);
  } else {
    this.configuration.register = true;
    this.registrator.register(options);
  }
};

/**
 * Unregister.
 *
 * @throws {JsSIP.Exceptions.InvalidStateError}
 * @param {Boolean} [all] unregister all user bindings.
 *
 */
JsSIP.UA.prototype.unregister = function(options) {
  if (this.status === JsSIP.C.UA_STATUS_USER_CLOSED) {
    throw new JsSIP.Exceptions.InvalidStateError(JsSIP.C.UA_STATUS_USER_CLOSED);
  } else {
    this.configuration.register = false;
    this.registrator.unregister(options);
  }
};

/**
 * Registration state.
 * @param {Boolean}
 */
JsSIP.UA.prototype.isRegistered = function() {
  if(this.registrator && this.registrator.registered) {
    return true;
  } else {
    return false;
  }
};

/**
 * Connection state.
 * @param {Boolean}
 */
JsSIP.UA.prototype.isConnected = function() {
  if(this.transport) {
    return this.transport.connected;
  } else {
    return false;
  }
};

/**
 * Make an outgoing call.
 *
 * @param {String} target
 * @param {Object} views
 * @param {Object} [options]
 *
 * @throws {JsSIP.Exceptions.InvalidStateError}
 * @throws {TypeError}
 *
 */
JsSIP.UA.prototype.call = function(target, views, options) {
  var session;

  if (this.status === JsSIP.C.UA_STATUS_USER_CLOSED) {
    throw new JsSIP.Exceptions.InvalidStateError(JsSIP.C.UA_STATUS_USER_CLOSED);
  } else {
    session = new JsSIP.Session(this);
    session.connect(target, views, options);
  }
};

/**
 * Send a message.
 *
 * @param {String} target
 * @param {String} body
 * @param {Object} [options]
 *
 * @throws {JsSIP.Exceptions.InvalidStateError}
 * @throws {TypeError}
 *
 */
JsSIP.UA.prototype.sendMessage = function(target, body, options) {
  var message;

  if (this.status === JsSIP.C.UA_STATUS_USER_CLOSED) {
    throw new JsSIP.Exceptions.InvalidStateError(JsSIP.C.UA_STATUS_USER_CLOSED);
  } else {
    message = new JsSIP.Message(this);
    message.send(target, body, options);
  }
};

/**
 * Gracefully close.
 *
 */
JsSIP.UA.prototype.stop = function() {
  var session, applicant,
    ua = this;

  console.log(JsSIP.C.LOG_UA +'user requested closure...');

  if(this.status === JsSIP.C.UA_STATUS_USER_CLOSED) {
    console.warn('UA already closed');
    return;
  }

  // Close registrator
  if(this.registrator) {
    console.log(JsSIP.C.LOG_UA +'closing registrator');
    this.registrator.close();
  }

  // Run  _terminate_ on every Session
  for(session in this.sessions) {
    console.log(JsSIP.C.LOG_UA +'closing session ' + session);
    this.sessions[session].terminate();
  }

  // Run  _close_ on every applicant
  for(applicant in this.applicants) {
    this.applicants[applicant].close();
  }

  this.status = JsSIP.C.UA_STATUS_USER_CLOSED;
  this.shutdownGraceTimer = window.setTimeout(
    function() { ua.transport.disconnect(); },
    '5000'
  );
};

/**
 * Connect to the WS server if status = UA_STATUS_INIT.
 * Resume UA after being closed.
 *
 */
JsSIP.UA.prototype.start = function() {
  var server;

  console.log(JsSIP.C.LOG_UA +'user requested startup...');

  if (this.status === JsSIP.C.UA_STATUS_INIT) {
    server = this.getNextWsServer();
    new JsSIP.Transport(this, server);
  } else if(this.status === JsSIP.C.UA_STATUS_USER_CLOSED) {
    console.log(JsSIP.C.LOG_UA +'resuming');
    this.status = JsSIP.C.UA_STATUS_READY;
    this.transport.connect();
  } else if (this.status === JsSIP.C.UA_STATUS_READY) {
    console.log(JsSIP.C.LOG_UA +'UA is in READY status, not resuming');
  } else {
    console.error('Connection is down. Auto-Recovery system is trying to connect');
  }
};


//===============================
//  Private (For internal use)
//===============================

JsSIP.UA.prototype.saveCredentials = function(credentials) {
  this.cache.credentials[credentials.realm] = this.cache.credentials[credentials.realm] || {};
  this.cache.credentials[credentials.realm][credentials.uri] = credentials;
};

JsSIP.UA.prototype.getCredentials = function(request) {
  var realm, credentials;

  realm = JsSIP.Grammar.parse(request.headers['To'].toString(), 'To').uri.host;

  if (this.cache.credentials[realm] && this.cache.credentials[realm][request.ruri]) {
    credentials = this.cache.credentials[realm][request.ruri];
    credentials.method = request.method;
  }

  return credentials;
};


//==========================
// Event Handlers
//==========================

/**
 * Transport Close event.
 * @private
 * @event
 * @param {JsSIP.Transport} transport.
 */
JsSIP.UA.prototype.onTransportClosed = function(transport) {
  // Run _onTransportError_ callback on every client transaction using _transport_
  var type, idx,
    client_transactions = ['nict', 'ict', 'nist', 'ist'];

  transport.server.status = JsSIP.C.WS_SERVER_DISCONNECTED;
  console.log(JsSIP.C.LOG_UA +'connection state set to '+ JsSIP.C.WS_SERVER_DISCONNECTED);

  for(type in client_transactions) {
    for(idx in this.transactions[client_transactions[type]]) {
      this.transactions[client_transactions[type]][idx].onTransportError();
    }
  }

  // Close sessions if GRUU is not being used
  if (!this.contact.pub_gruu) {
    this.closeSessionsOnTransportError();
  }

};

/**
 * Unrecoverable transport event.
 * Connection reattempt logic has been done and didn't success.
 * @private
 * @event
 * @param {JsSIP.Transport} transport.
 */
JsSIP.UA.prototype.onTransportError = function(transport) {
  var server;

  console.log(JsSIP.C.LOG_UA +'transport ' + transport.server.ws_uri + ' failed');

  // Close sessions.
  //Mark this transport as 'down' and try the next one
  transport.server.status = JsSIP.C.WS_SERVER_ERROR;
  console.log(JsSIP.C.LOG_UA +'connection state set to '+ JsSIP.C.WS_SERVER_ERROR);

  this.emit('disconnected', this, {
    transport: transport,
    code: transport.lastTransportError.code,
    reason: transport.lastTransportError.reason
  });

  server = this.getNextWsServer();

  if(server) {
    new JsSIP.Transport(this, server);
  }else {
    this.closeSessionsOnTransportError();
    if (!this.error || this.error !== JsSIP.C.UA_NETWORK_ERROR) {
      this.status = JsSIP.C.UA_STATUS_NOT_READY;
      this.error = JsSIP.C.UA_NETWORK_ERROR;
    }
    // Transport Recovery process
    this.recoverTransport();
  }
};

/**
 * Transport connection event.
 * @private
 * @event
 * @param {JsSIP.Transport} transport.
 */
JsSIP.UA.prototype.onTransportConnected = function(transport) {
  this.transport = transport;

  // Reset transport recovery counter
  this.transportRecoverAttempts = 0;

  transport.server.status = JsSIP.C.WS_SERVER_READY;
  console.log(JsSIP.C.LOG_UA +'connection state set to '+ JsSIP.C.WS_SERVER_READY);

  if(this.status === JsSIP.C.UA_STATUS_USER_CLOSED) {
    return;
  }

  this.status = JsSIP.C.UA_STATUS_READY;
  this.error = null;
  this.emit('connected', this, {
    transport: transport
  });

  if(this.configuration.register) {
    if(this.registrator) {
      this.registrator.onTransportConnected();
    } else {
      this.registrator = new JsSIP.Registrator(this, transport);
      this.register();
    }
  } else {
    this.registrator = new JsSIP.Registrator(this, transport);
  }
};

//=========================
// receiveRequest
//=========================

/**
 * Request reception
 * @private
 * @param {JsSIP.IncomingRequest} request.
 */
JsSIP.UA.prototype.receiveRequest = function(request) {
  var dialog, session, message,
    method = request.method;

  // Check that Ruri points to us
  if(request.ruri.user !== this.configuration.user) {
    console.log(JsSIP.C.LOG_UA +'Request-URI does not point to us');
    request.reply_sl(404);
    return;
  }

  // Check transaction
  if(JsSIP.Transactions.checkTransaction(this, request)) {
    return;
  }

  // Create the server transaction
  if(method === JsSIP.C.INVITE) {
    new JsSIP.Transactions.InviteServerTransaction(request, this);
  } else if(method !== JsSIP.C.ACK) {
    new JsSIP.Transactions.NonInviteServerTransaction(request, this);
  }

  /* RFC3261 12.2.2
   * Requests that do not change in any way the state of a dialog may be
   * received within a dialog (for example, an OPTIONS request).
   * They are processed as if they had been received outside the dialog.
   */
  if(method === JsSIP.C.OPTIONS) {
    request.reply(200, null, [
      'Allow: '+ JsSIP.Utils.getAllowedMethods(this),
      'Accept: '+ JsSIP.C.ACCEPTED_BODY_TYPES
    ]);
  } else if (method === JsSIP.C.MESSAGE) {
    if (!this.checkEvent('newMessage') || this.listeners('newMessage').length === 0) {
      request.reply(405, null, ['Allow: '+ JsSIP.Utils.getAllowedMethods(this)]);
      return;
    }
    message = new JsSIP.Message(this);
    message.init_incoming(request);
  }

  // Initial Request
  if(!request.to_tag) {
    if(!this.isRegistered()) {
      // High user does not want to be contacted
      request.reply(410);
      return;
    }

    switch(method) {
      case JsSIP.C.INVITE:
        if(JsSIP.WebRTC.isSupported) {
          session = new JsSIP.Session(this);
          session.init_incoming(request);
        } else {
          console.warn(JsSIP.C.LOG_UA +'INVITE received but WebRTC is not supported');
          request.reply(488);
        }
        break;
      case JsSIP.C.BYE:
        // Out of dialog BYE received
        request.reply(481);
        break;
      case JsSIP.C.CANCEL:
        session = this.findSession(request);
        if(session) {
          session.receiveRequest(request);
        } else {
          console.log(JsSIP.C.LOG_UA +'received CANCEL request for a non existent session');
        }
        break;
      case JsSIP.C.ACK:
        /* Absorb it.
         * ACK request without a corresponding Invite Transaction
         * and without To tag.
         */
        break;
      default:
        request.reply(405);
        break;
    }
  }
  // In-dialog request
  else {
    dialog = this.findDialog(request);

    if(dialog) {
      dialog.receiveRequest(request);
    } else if (method === JsSIP.C.NOTIFY) {
      session = this.findSession(request);
      if(session) {
        session.receiveRequest(request);
      } else {
        console.log(JsSIP.C.LOG_UA +'received NOTIFY request for a non existent session');
        request.reply(481, 'Subscription does not exist');
      }
    }
    /* RFC3261 12.2.2
     * Request with to tag, but no matching dialog found.
     * Exception: ACK for an Invite request for which a dialog has not
     * been created.
     */
    else {
      if(method !== JsSIP.C.ACK) {
        request.reply(481);
      }
    }
  }
};

//=================
// Utils
//=================

/**
 * Get the session to which the request belongs to, if any.
 * @private
 * @param {JsSIP.IncomingRequest} request.
 * @returns {JsSIP.OutgoingSession|JsSIP.IncomingSession|null}
 */
JsSIP.UA.prototype.findSession = function(request) {
  var
    sessionIDa = request.call_id + request.from_tag,
    sessionA = this.sessions[sessionIDa],
    sessionIDb = request.call_id + request.to_tag,
    sessionB = this.sessions[sessionIDb];

  if(sessionA) {
    return sessionA;
  } else if(sessionB) {
    return sessionB;
  } else {
    return null;
  }
};

/**
 * Get the dialog to which the request belongs to, if any.
 * @private
 * @param {JsSIP.IncomingRequest}
 * @returns {JsSIP.Dialog|null}
 */
JsSIP.UA.prototype.findDialog = function(request) {
  var
    id = request.call_id + request.from_tag + request.to_tag,
    dialog = this.dialogs[id];

  if(dialog) {
    return dialog;
  } else {
    id = request.call_id + request.to_tag + request.from_tag;
    dialog = this.dialogs[id];
    if(dialog) {
      return dialog;
    } else {
      return null;
    }
  }
};

/**
 * Retrieve the next server to which connect.
 * @private
 * @returns {Object} ws_server
 */
JsSIP.UA.prototype.getNextWsServer = function() {
  // Order servers by weight
  var idx, ws_server,
    candidates = [];

  for (idx in this.configuration.ws_servers) {
    ws_server = this.configuration.ws_servers[idx];

    if (ws_server.status === 2) {
      continue;
    } else if (candidates.length === 0) {
      candidates.push(ws_server);
    } else if (ws_server.weight > candidates[0].weight) {
      candidates = [ws_server];
    } else if (ws_server.weight === candidates[0].weight) {
      candidates.push(ws_server);
    }
  }

  idx = Math.floor((Math.random()* candidates.length));

  return candidates[idx];
};

/**
 * Close all sessions on transport error.
 * @private
 */
JsSIP.UA.prototype.closeSessionsOnTransportError = function() {
  var idx;

  // Run _transportError_ for every Session
  for(idx in this.sessions) {
    this.sessions[idx].onTransportError();
  }
  // Call registrator _onTransportClosed_
  if(this.registrator){
    this.registrator.onTransportClosed();
  }
};

JsSIP.UA.prototype.recoverTransport = function(ua) {
  var idx, k, nextRetry, count, server;

  ua = ua || this;
  count = ua.transportRecoverAttempts;

  for (idx in ua.configuration.ws_servers) {
    ua.configuration.ws_servers[idx].status = 0;
  }

  server = ua.getNextWsServer();

  k = Math.floor((Math.random() * Math.pow(2,count)) +1);
  nextRetry = k * ua.configuration.connection_recovery_min_interval;

  if (nextRetry > ua.configuration.connection_recovery_max_interval) {
    console.log(JsSIP.C.LOG_UA + 'time for next connection attempt exceeds connection_recovery_max_interval, resetting counter');
    nextRetry = ua.configuration.connection_recovery_min_interval;
    count = 0;
  }

  console.log(JsSIP.C.LOG_UA + 'next connection attempt in '+ nextRetry +' seconds');

  window.setTimeout(
    function(){
      ua.transportRecoverAttempts = count + 1;
      new JsSIP.Transport(ua, server);
    }, nextRetry * 1000);
};

/**
 * Configuration load.
 * @private
 * returns {Boolean}
 */
JsSIP.UA.prototype.loadConfig = function(configuration) {
  // Settings and default values
  var parameter, value, checked_value, contact,
    settings = {
      /* Host address
      * Value to be set in Via sent_by and host part of Contact FQDN
      */
      via_host: Math.random().toString(36).substr(2, 12) + '.invalid',

      // Password
      password: null,

      // Registration parameters
      register_expires: 600,
      register_min_expires: 120,
      register: true,

      // Transport related parameters
      ws_server_max_reconnection: 3,
      ws_server_reconnection_timeout: 4,

      connection_recovery_min_interval: 2,
      connection_recovery_max_interval: 30,

      use_preloaded_route: false,

      // Session parameters
      no_answer_timeout: 60,
      stun_servers: ['stun:stun.l.google.com:19302'],
      turn_servers: [],

      // Logging parameters
      trace_sip: false,

      // Hacks
      hack_via_tcp: false,
      hack_ip_in_contact: false
    };

  // Pre-Configuration

  // Check Mandatory parameters
  for(parameter in JsSIP.UA.configuration_check.mandatory) {
    if(!configuration.hasOwnProperty(parameter)) {
      throw new JsSIP.Exceptions.ConfigurationError(parameter);
    } else {
      value = configuration[parameter];
      checked_value = JsSIP.UA.configuration_check.mandatory[parameter](value);
      if (checked_value !== undefined) {
        settings[parameter] = checked_value;
      } else {
        throw new JsSIP.Exceptions.ConfigurationError(parameter, value);
      }
    }
  }

  // Check Optional parameters
  for(parameter in JsSIP.UA.configuration_check.optional) {
    if(configuration.hasOwnProperty(parameter)) {
      value = configuration[parameter];

      // If the parameter value is null, empty string or undefined then apply its default value.
      if(value === null || value === "" || value === undefined) { continue; }
      // If it's a number with NaN value then also apply its default value.
      // NOTE: JS does not allow "value === NaN", the following does the work:
      else if(typeof(value) === 'number' && window.isNaN(value)) { continue; }

      checked_value = JsSIP.UA.configuration_check.optional[parameter](value);
      if (checked_value !== undefined) {
        settings[parameter] = checked_value;
      } else {
        throw new JsSIP.Exceptions.ConfigurationError(parameter, value);
      }
    }
  }

  // Sanity Checks

  // Connection recovery intervals
  if(settings.connection_recovery_max_interval < settings.connection_recovery_min_interval) {
    throw new JsSIP.Exceptions.ConfigurationError('connection_recovery_max_interval', settings.connection_recovery_max_interval);
  }

  // Post Configuration Process

  // Instance-id for GRUU
  settings.instance_id = JsSIP.Utils.newUUID();

  // jssip_id instance parameter. Static random tag of length 5
  settings.jssip_id = Math.random().toString(36).substr(2, 5);

  settings.from_uri = settings.uri.toAor();

  settings.user = settings.uri.user;

  settings.domain = settings.uri.host;

  settings.uri = settings.uri.toString();

  /* Check whether authorization_user is explicitly defined.
   * Take 'settings.user' value if not.
   */
  if (!settings.authorization_user) {
    settings.authorization_user = settings.user;
  }

  // User no_answer_timeout
  settings.no_answer_timeout = settings.no_answer_timeout * 1000;

  // Via Host
  if (settings.hack_ip_in_contact) {
    settings.via_host = JsSIP.Utils.getRandomTestNetIP();
  }

  contact = {
    uri: {
      value: 'sip:' + settings.user + '@' + settings.via_host + ';transport=ws',
      writable: false,
      configurable: false
    }
  };
  Object.defineProperties(this.contact, contact);

  // Fill the value of the configuration_skeleton
  console.log(JsSIP.C.LOG_UA + 'configuration parameters after validation:');
  for(parameter in settings) {
    console.log('· ' + parameter + ': ' + window.JSON.stringify(settings[parameter]));
    JsSIP.UA.configuration_skeleton[parameter].value = settings[parameter];
  }

  Object.defineProperties(this.configuration, JsSIP.UA.configuration_skeleton);

  // Clean JsSIP.UA.configuration_skeleton
  for(parameter in settings) {
    JsSIP.UA.configuration_skeleton[parameter].value = '';
  }

  return;
};


/**
 * Configuration Object skeleton.
 * @private
 */
JsSIP.UA.configuration_skeleton = (function() {
  var idx,  parameter,
    skeleton = {},
    parameters = [
      // Internal parameters
      "instance_id",
      "jssip_id",
      "register_min_expires",
      "ws_server_max_reconnection",
      "ws_server_reconnection_timeout",

      // Mandatory user configurable parameters
      "uri",
      "ws_servers",

      // Optional user configurable parameters
      "authorization_user",
      "connection_recovery_max_interval",
      "connection_recovery_min_interval",
      "display_name",
      "hack_via_tcp", // false.
      "hack_ip_in_contact", //false
      "no_answer_timeout", // 30 seconds.
      "password",
      "register_expires", // 600 seconds.
      "stun_servers",
      "trace_sip",
      "turn_servers",
      "use_preloaded_route",

      // Post-configuration generated parameters
      "domain",
      "from_uri",
      "via_core_value",
      "user",
      "via_host"
    ];

  for(idx in parameters) {
    parameter = parameters[idx];
    skeleton[parameter] = {
      value: '',
      writable: false,
      configurable: false
    };
  }

  skeleton['register'] = {
    value: '',
    writable: true,
    configurable: false
  };

  return skeleton;
}());

/**
 * Configuration checker.
 * @private
 * @return {Boolean}
 */
JsSIP.UA.configuration_check = {
  mandatory: {

    uri: function(uri) {
      var parsed;

      parsed = JsSIP.Utils.parseURI(uri);

      if(!parsed) {
        return;
      } else {
        return parsed;
      }
    },

    ws_servers: function(ws_servers) {
      var idx, url;

      /* Allow defining ws_servers parameter as:
       *  String: "host"
       *  Array of Strings: ["host1", "host2"]
       *  Array of Objects: [{ws_uri:"host1", weight:1}, {ws_uri:"host2", weight:0}]
       *  Array of Objects and Strings: [{ws_uri:"host1"}, "host2"]
       */
      if (typeof ws_servers === 'string') {
        ws_servers = [{ws_uri: ws_servers}];
      } else if (ws_servers instanceof Array) {
        for(idx in ws_servers) {
          if (typeof ws_servers[idx] === 'string'){
            ws_servers[idx] = {ws_uri: ws_servers[idx]};
          }
        }
      } else {
        return;
      }

      if (ws_servers.length === 0) {
        return false;
      }

      for (idx in ws_servers) {
        if (!ws_servers[idx].ws_uri) {
          console.error(JsSIP.C.LOG_UA +'missing "ws_uri" attribute in ws_servers parameter');
          return;
        }
        if (ws_servers[idx].weight && !Number(ws_servers[idx].weight)) {
          console.error(JsSIP.C.LOG_UA +'"weight" attribute in ws_servers parameter must be a Number');
          return;
        }

        url = JsSIP.Grammar.parse(ws_servers[idx].ws_uri, 'absoluteURI');

        if(url === -1) {
          console.error(JsSIP.C.LOG_UA +'invalid "ws_uri" attribute in ws_servers parameter: ' + ws_servers[idx].ws_uri);
          return;
        } else if(url.scheme !== 'wss' && url.scheme !== 'ws') {
          console.error(JsSIP.C.LOG_UA +'invalid URI scheme in ws_servers parameter: ' + url.scheme);
          return;
        } else {
          ws_servers[idx].sip_uri = '<sip:' + url.host + (url.port ? ':' + url.port : '') + ';transport=ws;lr>';

          if (!ws_servers[idx].weight) {
            ws_servers[idx].weight = 0;
          }

          ws_servers[idx].status = 0;
          ws_servers[idx].scheme = url.scheme.toUpperCase();
        }
      }
      return ws_servers;
    }
  },

  optional: {

    authorization_user: function(authorization_user) {
      if(JsSIP.Grammar.parse('"'+ authorization_user +'"', 'quoted_string') === -1) {
        return;
      } else {
        return authorization_user;
      }
    },

    connection_recovery_max_interval: function(connection_recovery_max_interval) {
      var value;
      if(JsSIP.Utils.isDecimal(connection_recovery_max_interval)) {
        value = window.Number(connection_recovery_max_interval);
        if(value > 0) {
          return value;
        }
      }
    },

    connection_recovery_min_interval: function(connection_recovery_min_interval) {
      var value;
      if(JsSIP.Utils.isDecimal(connection_recovery_min_interval)) {
        value = window.Number(connection_recovery_min_interval);
        if(value > 0) {
          return value;
        }
      }
    },

    display_name: function(display_name) {
      if(JsSIP.Grammar.parse('"' + display_name + '"', 'display_name') === -1) {
        return;
      } else {
        return display_name;
      }
    },

    hack_via_tcp: function(hack_via_tcp) {
      if (typeof hack_via_tcp === 'boolean') {
        return hack_via_tcp;
      }
    },

    hack_ip_in_contact: function(hack_ip_in_contact) {
      if (typeof hack_ip_in_contact === 'boolean') {
        return hack_ip_in_contact;
      }
    },

    no_answer_timeout: function(no_answer_timeout) {
      var value;
      if (JsSIP.Utils.isDecimal(no_answer_timeout)) {
        value = window.Number(no_answer_timeout);
        if (value > 0) {
          return value;
        }
      }
    },

    password: function(password) {
      if(JsSIP.Grammar.parse(password, 'password') === -1) {
        return;
      } else {
        return password;
      }
    },

    register: function(register) {
      if (typeof register === 'boolean') {
        return register;
      }
    },

    register_expires: function(register_expires) {
      var value;
      if (JsSIP.Utils.isDecimal(register_expires)) {
        value = window.Number(register_expires);
        if (value > 0) {
          return value;
        }
      }
    },

    stun_servers: function(stun_servers) {
      var idx, stun_server;

      if (typeof stun_servers === 'string') {
        stun_servers = [stun_servers];
      } else if (!(stun_servers instanceof Array)) {
        return;
      }

      for (idx in stun_servers) {
        stun_server = stun_servers[idx];
        if (!(/^stuns?:/.test(stun_server))) {
          stun_server = 'stun:' + stun_server;
        }

        if(JsSIP.Grammar.parse(stun_server, 'stun_URI') === -1) {
          return;
        } else {
          stun_servers[idx] = stun_server;
        }
      }
      return stun_servers;
    },

    trace_sip: function(trace_sip) {
      if (typeof trace_sip === 'boolean') {
        return trace_sip;
      }
    },

    turn_servers: function(turn_servers) {
      var idx, turn_server;

      if (turn_servers instanceof Array) {
        // Do nothing
      } else {
        turn_servers = [turn_servers];
      }

      for (idx in turn_servers) {
        turn_server = turn_servers[idx];
        if (!turn_server.server || !turn_server.username || !turn_server.password) {
          return;
        } else if (!(/^turns?:/.test(turn_server.server))) {
          turn_server.server = 'turn:' + turn_server.server;
        }

        if(JsSIP.Grammar.parse(turn_server.server, 'turn_URI') === -1) {
          return;
        } else if(JsSIP.Grammar.parse(turn_server.username, 'user') === -1) {
          return;
        } else if(JsSIP.Grammar.parse(turn_server.password, 'password') === -1) {
          return;
        }
      }
      return turn_servers;
    },

    use_preloaded_route: function(use_preloaded_route) {
      if (typeof use_preloaded_route === 'boolean') {
        return use_preloaded_route;
      }
    }
  }
};
module.exports = UA;


var C = {
  // UA status codes
  STATUS_INIT :                0,
  STATUS_READY:                1,
  STATUS_USER_CLOSED:          2,
  STATUS_NOT_READY:            3,

  // UA error codes
  CONFIGURATION_ERROR:  1,
  NETWORK_ERROR:        2
};

/**
 * Expose C object.
 */
UA.C = C;


/**
 * Dependencies.
 */
var util = require('util');
var events = require('events');
var debug = require('debug')('JsSIP:UA');
var rtcninja = require('rtcninja');
var JsSIP_C = require('./Constants');
var Registrator = require('./Registrator');
var RTCSession = require('./RTCSession');
var Message = require('./Message');
var Transport = require('./Transport');
var Transactions = require('./Transactions');
var Transactions = require('./Transactions');
var Utils = require('./Utils');
var Exceptions = require('./Exceptions');
var URI = require('./URI');
var Grammar = require('./Grammar');



/**
 * The User-Agent class.
 * @class JsSIP.UA
 * @param {Object} configuration Configuration parameters.
 * @throws {JsSIP.Exceptions.ConfigurationError} If a configuration parameter is invalid.
 * @throws {TypeError} If no configuration is given.
 */
function UA(configuration) {
  this.cache = {
    credentials: {}
  };

  this.configuration = {};
  this.dynConfiguration = {};
  this.dialogs = {};

  //User actions outside any session/dialog (MESSAGE)
  this.applicants = {};

  this.sessions = {};
  this.transport = null;
  this.contact = null;
  this.status = C.STATUS_INIT;
  this.error = null;
  this.transactions = {
    nist: {},
    nict: {},
    ist: {},
    ict: {}
  };

  // Custom UA empty object for high level use
  this.data = {};

  this.transportRecoverAttempts = 0;
  this.transportRecoveryTimer = null;

  Object.defineProperties(this, {
    transactionsCount: {
      get: function() {
        var type,
          transactions = ['nist','nict','ist','ict'],
          count = 0;

        for (type in transactions) {
          count += Object.keys(this.transactions[transactions[type]]).length;
        }

        return count;
      }
    },

    nictTransactionsCount: {
      get: function() {
        return Object.keys(this.transactions.nict).length;
      }
    },

    nistTransactionsCount: {
      get: function() {
        return Object.keys(this.transactions.nist).length;
      }
    },

    ictTransactionsCount: {
      get: function() {
        return Object.keys(this.transactions.ict).length;
      }
    },

    istTransactionsCount: {
      get: function() {
        return Object.keys(this.transactions.ist).length;
      }
    }
  });

  /**
   * Load configuration
   */

  if(configuration === undefined) {
    throw new TypeError('Not enough arguments');
  }

  try {
    this.loadConfig(configuration);
  } catch(e) {
    this.status = C.STATUS_NOT_READY;
    this.error = C.CONFIGURATION_ERROR;
    throw e;
  }

  // Initialize registrator
  this._registrator = new Registrator(this);

  events.EventEmitter.call(this);

  // Initialize rtcninja if not yet done.
  if (! rtcninja.called) {
    rtcninja();
  }
}

util.inherits(UA, events.EventEmitter);


//=================
//  High Level API
//=================

/**
 * Connect to the WS server if status = STATUS_INIT.
 * Resume UA after being closed.
 */
UA.prototype.start = function() {
  debug('start()');

  var server,
      self = this;

  function connect() {
    debug('restarting UA');
    self.status = C.STATUS_READY;
    self.transport.connect();
  }

  if (this.status === C.STATUS_INIT) {
    server = this.getNextWsServer();
    this.transport = new Transport(this, server);
    this.transport.connect();
  } else if(this.status === C.STATUS_USER_CLOSED) {
    if (!this.isConnected()) {
      connect();
    } else {
      this.once('disconnected', connect);
    }
  } else if (this.status === C.STATUS_READY) {
    debug('UA is in READY status, not restarted');
  } else {
    debug('ERROR: connection is down, Auto-Recovery system is trying to reconnect');
  }

  // Set dynamic configuration.
  this.dynConfiguration.register = this.configuration.register;
};

/**
 * Register.
 */
UA.prototype.register = function() {
  debug('register()');

  this.dynConfiguration.register = true;
  this._registrator.register();
};

/**
 * Unregister.
 */
UA.prototype.unregister = function(options) {
  debug('unregister()');

  this.dynConfiguration.register = false;
  this._registrator.unregister(options);
};

/**
 * Get the Registrator instance.
 */
UA.prototype.registrator = function() {
  return this._registrator;
};

/**
 * Registration state.
 */
UA.prototype.isRegistered = function() {
  if(this._registrator.registered) {
    return true;
  } else {
    return false;
  }
};

/**
 * Connection state.
 */
UA.prototype.isConnected = function() {
  if(this.transport) {
    return this.transport.connected;
  } else {
    return false;
  }
};

/**
 * Make an outgoing call.
 *
 * -param {String} target
 * -param {Object} views
 * -param {Object} [options]
 *
 * -throws {TypeError}
 *
 */
UA.prototype.call = function(target, options) {
  debug('call()');

  var session;

  session = new RTCSession(this);
  session.connect(target, options);
  return session;
};

/**
 * Send a message.
 *
 * -param {String} target
 * -param {String} body
 * -param {Object} [options]
 *
 * -throws {TypeError}
 *
 */
UA.prototype.sendMessage = function(target, body, options) {
  debug('sendMessage()');

  var message;

  message = new Message(this);
  message.send(target, body, options);
  return message;
};

/**
 * Terminate ongoing sessions.
 */
UA.prototype.terminateSessions = function(options) {
  debug('terminateSessions()');

  for(var idx in this.sessions) {
    if (!this.sessions[idx].isEnded()) {
      this.sessions[idx].terminate(options);
    }
  }
};

/**
 * Gracefully close.
 *
 */
UA.prototype.stop = function() {
  debug('stop()');

  var session;
  var applicant;
  var num_sessions;
  var ua = this;

  // Remove dynamic settings.
  this.dynConfiguration = {};

  if(this.status === C.STATUS_USER_CLOSED) {
    debug('UA already closed');
    return;
  }

  // Clear transportRecoveryTimer
  clearTimeout(this.transportRecoveryTimer);

  // Close registrator
  this._registrator.close();

  // If there are session wait a bit so CANCEL/BYE can be sent and their responses received.
  num_sessions = Object.keys(this.sessions).length;

  // Run  _terminate_ on every Session
  for(session in this.sessions) {
    debug('closing session ' + session);
    try { this.sessions[session].terminate(); } catch(error) {}
  }

  // Run  _close_ on every applicant
  for(applicant in this.applicants) {
    try { this.applicants[applicant].close(); } catch(error) {}
  }

  this.status = C.STATUS_USER_CLOSED;

  // If there are no pending non-INVITE client or server transactions and no
  // sessions, then disconnect now. Otherwise wait for 2 seconds.
  // TODO: This fails if sotp() is called once an outgoing is cancelled (no time
  // to send ACK for 487), so leave 2 seconds until properly re-designed.
  // if (this.nistTransactionsCount === 0 && this.nictTransactionsCount === 0 && num_sessions === 0) {
    // ua.transport.disconnect();
  // }
  // else {
    setTimeout(function() {
      ua.transport.disconnect();
    }, 2000);
  // }
};

/**
 * Normalice a string into a valid SIP request URI
 * -param {String} target
 * -returns {JsSIP.URI|undefined}
 */
UA.prototype.normalizeTarget = function(target) {
  return Utils.normalizeTarget(target, this.configuration.hostport_params);
};


//===============================
//  Private (For internal use)
//===============================

UA.prototype.saveCredentials = function(credentials) {
  this.cache.credentials[credentials.realm] = this.cache.credentials[credentials.realm] || {};
  this.cache.credentials[credentials.realm][credentials.uri] = credentials;
};

UA.prototype.getCredentials = function(request) {
  var realm, credentials;

  realm = request.ruri.host;

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
 */
UA.prototype.onTransportClosed = function(transport) {
  // Run _onTransportError_ callback on every client transaction using _transport_
  var type, idx, length,
  client_transactions = ['nict', 'ict', 'nist', 'ist'];

  transport.server.status = Transport.C.STATUS_DISCONNECTED;

  length = client_transactions.length;
  for (type = 0; type < length; type++) {
    for(idx in this.transactions[client_transactions[type]]) {
      this.transactions[client_transactions[type]][idx].onTransportError();
    }
  }

  this.emit('disconnected', {
    transport: transport,
    code: transport.lastTransportError.code,
    reason: transport.lastTransportError.reason
  });
};

/**
 * Unrecoverable transport event.
 * Connection reattempt logic has been done and didn't success.
 */
UA.prototype.onTransportError = function(transport) {
  var server;

  debug('transport ' + transport.server.ws_uri + ' failed | connection state set to '+ Transport.C.STATUS_ERROR);

  // Close sessions.
  // Mark this transport as 'down' and try the next one
  transport.server.status = Transport.C.STATUS_ERROR;

  this.emit('disconnected', {
    transport: transport,
    code: transport.lastTransportError.code,
    reason: transport.lastTransportError.reason
  });

  // Don't attempt to recover the connection if the user closes the UA.
  if (this.status === C.STATUS_USER_CLOSED) {
    return;
  }

  server = this.getNextWsServer();

  if(server) {
    this.transport = new Transport(this, server);
    this.transport.connect();
  } else {
    this.closeSessionsOnTransportError();
    if (!this.error || this.error !== C.NETWORK_ERROR) {
      this.status = C.STATUS_NOT_READY;
      this.error = C.NETWORK_ERROR;
    }
    // Transport Recovery process
    this.recoverTransport();
  }
};

/**
 * Transport connection event.
 */
UA.prototype.onTransportConnected = function(transport) {
  this.transport = transport;

  // Reset transport recovery counter
  this.transportRecoverAttempts = 0;

  transport.server.status = Transport.C.STATUS_READY;

  if(this.status === C.STATUS_USER_CLOSED) {
    return;
  }

  this.status = C.STATUS_READY;
  this.error = null;

  if(this.dynConfiguration.register) {
    this._registrator.register();
  }

  this.emit('connected', {
    transport: transport
  });
};


/**
 * Transport connecting event
 */
UA.prototype.onTransportConnecting = function(transport, attempts) {
  this.emit('connecting', {
    transport: transport,
    attempts: attempts
  });
};

/**
 * Transport connected event
 */
UA.prototype.onTransportDisconnected = function(data) {
  this.emit('disconnected', data);
};


/**
 * new Transaction
 */
UA.prototype.newTransaction = function(transaction) {
  this.transactions[transaction.type][transaction.id] = transaction;
    this.emit('newTransaction', {
    transaction: transaction
  });
};


/**
 * Transaction destroyed.
 */
UA.prototype.destroyTransaction = function(transaction) {
  delete this.transactions[transaction.type][transaction.id];
    this.emit('transactionDestroyed', {
    transaction: transaction
  });
};


/**
 *  new Message
 */
UA.prototype.newMessage = function(data) {
  this.emit('newMessage', data);
};

/**
 * new RTCSession
 */
UA.prototype.newRTCSession = function(data) {
  this.emit('newRTCSession', data);
};

/**
 * Registered
 */
UA.prototype.registered = function(data) {
  this.emit('registered', data);
};


/**
 * Unregistered
 */
UA.prototype.unregistered = function(data) {
  this.emit('unregistered', data);
};


/**
 * Registration Failed
 */
UA.prototype.registrationFailed = function(data) {
  this.emit('registrationFailed', data);
};


//=========================
// receiveRequest
//=========================

/**
 * Request reception
 */
UA.prototype.receiveRequest = function(request) {
  var dialog, session, message, replaces,
  method = request.method;

  // Check that request URI points to us
  if(request.ruri.user !== this.configuration.uri.user && request.ruri.user !== this.contact.uri.user) {
    debug('Request-URI does not point to us');
    if (request.method !== JsSIP_C.ACK) {
      request.reply_sl(404);
    }
    return;
    }

    // Check request URI scheme
    if(request.ruri.scheme === JsSIP_C.SIPS) {
    request.reply_sl(416);
    return;
  }

  // Check transaction
  if(Transactions.checkTransaction(this, request)) {
    return;
  }

  // Create the server transaction
  if(method === JsSIP_C.INVITE) {
    new Transactions.InviteServerTransaction(request, this);
  } else if(method !== JsSIP_C.ACK && method !== JsSIP_C.CANCEL) {
    new Transactions.NonInviteServerTransaction(request, this);
  }

  /* RFC3261 12.2.2
   * Requests that do not change in any way the state of a dialog may be
   * received within a dialog (for example, an OPTIONS request).
   * They are processed as if they had been received outside the dialog.
   */
  if(method === JsSIP_C.OPTIONS) {
    request.reply(200);
  } else if (method === JsSIP_C.MESSAGE) {
    if (this.listeners('newMessage').length === 0) {
      request.reply(405);
      return;
    }
    message = new Message(this);
    message.init_incoming(request);
  } else if (method === JsSIP_C.INVITE) {
    // Initial INVITE
    if(!request.to_tag && this.listeners('newRTCSession').length === 0) {
      request.reply(405);
      return;
    }
  }

  // Initial Request
  if(!request.to_tag) {
    switch(method) {
      case JsSIP_C.INVITE:
        if (rtcninja.hasWebRTC()) {
          if (request.hasHeader('replaces')) {
            replaces = request.replaces;
            dialog = this.findDialog(replaces.call_id, replaces.from_tag, replaces.to_tag);
            if (dialog) {
              session = dialog.owner;
              if (!session.isEnded()) {
                session.receiveRequest(request);
              } else {
                request.reply(603);
              }
            } else {
              request.reply(481);
            }
          } else {
            session = new RTCSession(this);
            session.init_incoming(request);
          }
        } else {
          debug('INVITE received but WebRTC is not supported');
          request.reply(488);
        }
        break;
      case JsSIP_C.BYE:
        // Out of dialog BYE received
        request.reply(481);
        break;
        case JsSIP_C.CANCEL:
        session = this.findSession(request);
        if (session) {
          session.receiveRequest(request);
        } else {
          debug('received CANCEL request for a non existent session');
        }
        break;
      case JsSIP_C.ACK:
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
    dialog = this.findDialog(request.call_id, request.from_tag, request.to_tag);

    if(dialog) {
      dialog.receiveRequest(request);
    } else if (method === JsSIP_C.NOTIFY) {
      session = this.findSession(request);
      if(session) {
        session.receiveRequest(request);
      } else {
        debug('received NOTIFY request for a non existent subscription');
        request.reply(481, 'Subscription does not exist');
      }
    }
    /* RFC3261 12.2.2
     * Request with to tag, but no matching dialog found.
     * Exception: ACK for an Invite request for which a dialog has not
     * been created.
     */
    else {
      if(method !== JsSIP_C.ACK) {
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
 */
UA.prototype.findSession = function(request) {
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
 */
UA.prototype.findDialog = function(call_id, from_tag, to_tag) {
  var
  id = call_id + from_tag + to_tag,
  dialog = this.dialogs[id];

  if(dialog) {
    return dialog;
  } else {
    id = call_id + to_tag + from_tag;
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
 */
UA.prototype.getNextWsServer = function() {
  // Order servers by weight
  var idx, length, ws_server,
  candidates = [];

  length = this.configuration.ws_servers.length;
  for (idx = 0; idx < length; idx++) {
    ws_server = this.configuration.ws_servers[idx];

    if (ws_server.status === Transport.C.STATUS_ERROR) {
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
 */
UA.prototype.closeSessionsOnTransportError = function() {
  var idx;

  // Run _transportError_ for every Session
  for(idx in this.sessions) {
    this.sessions[idx].onTransportError();
  }
  // Call registrator _onTransportClosed_
  this._registrator.onTransportClosed();
};

UA.prototype.recoverTransport = function(ua) {
  var idx, length, k, nextRetry, count, server;

  ua = ua || this;
  count = ua.transportRecoverAttempts;

  length = ua.configuration.ws_servers.length;
  for (idx = 0; idx < length; idx++) {
    ua.configuration.ws_servers[idx].status = 0;
  }

  server = ua.getNextWsServer();

  k = Math.floor((Math.random() * Math.pow(2,count)) +1);
  nextRetry = k * ua.configuration.connection_recovery_min_interval;

  if (nextRetry > ua.configuration.connection_recovery_max_interval) {
    debug('time for next connection attempt exceeds connection_recovery_max_interval, resetting counter');
    nextRetry = ua.configuration.connection_recovery_min_interval;
    count = 0;
  }

  debug('next connection attempt in '+ nextRetry +' seconds');

  this.transportRecoveryTimer = setTimeout(function() {
    ua.transportRecoverAttempts = count + 1;
    ua.transport = new Transport(ua, server);
    ua.transport.connect();
  }, nextRetry * 1000);
};

UA.prototype.loadConfig = function(configuration) {
  // Settings and default values
  var parameter, value, checked_value, hostport_params, registrar_server,
  settings = {
    /* Host address
    * Value to be set in Via sent_by and host part of Contact FQDN
    */
    via_host: Utils.createRandomToken(12) + '.invalid',

    // Password
    password: null,

    // Registration parameters
    register_expires: 600,
    register: true,
    registrar_server: null,

    // Transport related parameters
    ws_server_max_reconnection: 3,
    ws_server_reconnection_timeout: 4,

    connection_recovery_min_interval: 2,
    connection_recovery_max_interval: 30,

    use_preloaded_route: false,

    // Session parameters
    no_answer_timeout: 60,
    session_timers: true,

    // Hacks
    hack_via_tcp: false,
    hack_via_ws: false,
    hack_ip_in_contact: false,

    // Options for Node.
    node_websocket_options: {}
  };

  // Pre-Configuration

  // Check Mandatory parameters
  for(parameter in UA.configuration_check.mandatory) {
    if(!configuration.hasOwnProperty(parameter)) {
      throw new Exceptions.ConfigurationError(parameter);
    } else {
      value = configuration[parameter];
      checked_value = UA.configuration_check.mandatory[parameter].call(this, value);
      if (checked_value !== undefined) {
        settings[parameter] = checked_value;
      } else {
        throw new Exceptions.ConfigurationError(parameter, value);
      }
    }
  }

  // Check Optional parameters
  for(parameter in UA.configuration_check.optional) {
    if(configuration.hasOwnProperty(parameter)) {
      value = configuration[parameter];

      /* If the parameter value is null, empty string, undefined, empty array
       * or it's a number with NaN value, then apply its default value.
       */
      if (Utils.isEmpty(value)) {
        continue;
      }

      checked_value = UA.configuration_check.optional[parameter].call(this, value);
      if (checked_value !== undefined) {
        settings[parameter] = checked_value;
      } else {
        throw new Exceptions.ConfigurationError(parameter, value);
      }
    }
  }

  // Sanity Checks

  // Connection recovery intervals.
  if(settings.connection_recovery_max_interval < settings.connection_recovery_min_interval) {
    throw new Exceptions.ConfigurationError('connection_recovery_max_interval', settings.connection_recovery_max_interval);
  }

  // Post Configuration Process

  // Allow passing 0 number as display_name.
  if (settings.display_name === 0) {
    settings.display_name = '0';
  }

  // Instance-id for GRUU.
  if (!settings.instance_id) {
    settings.instance_id = Utils.newUUID();
  }

  // jssip_id instance parameter. Static random tag of length 5.
  settings.jssip_id = Utils.createRandomToken(5);

  // String containing settings.uri without scheme and user.
  hostport_params = settings.uri.clone();
  hostport_params.user = null;
  settings.hostport_params = hostport_params.toString().replace(/^sip:/i, '');

  // Check whether authorization_user is explicitly defined.
  // Take 'settings.uri.user' value if not.
  if (!settings.authorization_user) {
    settings.authorization_user = settings.uri.user;
  }

  // If no 'registrar_server' is set use the 'uri' value without user portion and
  // without URI params/headers.
  if (!settings.registrar_server) {
    registrar_server = settings.uri.clone();
    registrar_server.user = null;
    registrar_server.clearParams();
    registrar_server.clearHeaders();
    settings.registrar_server = registrar_server;
  }

  // User no_answer_timeout.
  settings.no_answer_timeout = settings.no_answer_timeout * 1000;

  // Via Host
  if (settings.hack_ip_in_contact) {
    settings.via_host = Utils.getRandomTestNetIP();
  }

  this.contact = {
    pub_gruu: null,
    temp_gruu: null,
    uri: new URI('sip', Utils.createRandomToken(8), settings.via_host, null, {transport: 'ws'}),
    toString: function(options) {
      options = options || {};

      var
      anonymous = options.anonymous || null,
      outbound = options.outbound || null,
      contact = '<';

      if (anonymous) {
        contact += this.temp_gruu || 'sip:anonymous@anonymous.invalid;transport=ws';
      } else {
        contact += this.pub_gruu || this.uri.toString();
      }

      if (outbound && (anonymous ? !this.temp_gruu : !this.pub_gruu)) {
        contact += ';ob';
      }

      contact += '>';

      return contact;
    }
  };

  // Fill the value of the configuration_skeleton
  for(parameter in settings) {
    UA.configuration_skeleton[parameter].value = settings[parameter];
  }

  Object.defineProperties(this.configuration, UA.configuration_skeleton);

  // Clean UA.configuration_skeleton
  for(parameter in settings) {
    UA.configuration_skeleton[parameter].value = '';
  }

  debug('configuration parameters after validation:');
  for(parameter in settings) {
    switch(parameter) {
      case 'uri':
      case 'registrar_server':
        debug('- ' + parameter + ': ' + settings[parameter]);
        break;
      case 'password':
        debug('- ' + parameter + ': ' + 'NOT SHOWN');
        break;
      default:
        debug('- ' + parameter + ': ' + JSON.stringify(settings[parameter]));
    }
  }

  return;
};

/**
 * Configuration Object skeleton.
 */
UA.configuration_skeleton = (function() {
  var idx,  parameter,
  skeleton = {},
  parameters = [
    // Internal parameters
    'jssip_id',
    'ws_server_max_reconnection',
    'ws_server_reconnection_timeout',
    'hostport_params',

    // Mandatory user configurable parameters
    'uri',
    'ws_servers',

    // Optional user configurable parameters
    'authorization_user',
    'connection_recovery_max_interval',
    'connection_recovery_min_interval',
    'display_name',
    'hack_via_tcp', // false
    'hack_via_ws', // false
    'hack_ip_in_contact', //false
    'instance_id',
    'no_answer_timeout', // 30 seconds
    'session_timers', // true
    'node_websocket_options',
    'password',
    'register_expires', // 600 seconds
    'registrar_server',
    'use_preloaded_route',

    // Post-configuration generated parameters
    'via_core_value',
    'via_host'
  ];

  for(idx in parameters) {
    parameter = parameters[idx];
    skeleton[parameter] = {
      value: '',
      writable: false,
      configurable: false
    };
  }

  skeleton.register = {
    value: '',
    writable: true,
    configurable: false
  };

  return skeleton;
}());

/**
 * Configuration checker.
 */
UA.configuration_check = {
  mandatory: {

    uri: function(uri) {
      var parsed;

      if (!/^sip:/i.test(uri)) {
        uri = JsSIP_C.SIP + ':' + uri;
      }
      parsed = URI.parse(uri);

      if(!parsed) {
        return;
      } else if(!parsed.user) {
        return;
      } else {
        return parsed;
      }
    },

    ws_servers: function(ws_servers) {
      var idx, length, url;

      /* Allow defining ws_servers parameter as:
       *  String: "host"
       *  Array of Strings: ["host1", "host2"]
       *  Array of Objects: [{ws_uri:"host1", weight:1}, {ws_uri:"host2", weight:0}]
       *  Array of Objects and Strings: [{ws_uri:"host1"}, "host2"]
       */
      if (typeof ws_servers === 'string') {
        ws_servers = [{ws_uri: ws_servers}];
      } else if (Array.isArray(ws_servers)) {
        length = ws_servers.length;
        for (idx = 0; idx < length; idx++) {
          if (typeof ws_servers[idx] === 'string') {
            ws_servers[idx] = {ws_uri: ws_servers[idx]};
          }
        }
      } else {
        return;
      }

      if (ws_servers.length === 0) {
        return false;
      }

      length = ws_servers.length;
      for (idx = 0; idx < length; idx++) {
        if (!ws_servers[idx].ws_uri) {
          debug('ERROR: missing "ws_uri" attribute in ws_servers parameter');
          return;
        }
        if (ws_servers[idx].weight && !Number(ws_servers[idx].weight)) {
          debug('ERROR: "weight" attribute in ws_servers parameter must be a Number');
          return;
        }

        url = Grammar.parse(ws_servers[idx].ws_uri, 'absoluteURI');

        if(url === -1) {
          debug('ERROR: invalid "ws_uri" attribute in ws_servers parameter: ' + ws_servers[idx].ws_uri);
          return;
        } else if(url.scheme !== 'wss' && url.scheme !== 'ws') {
          debug('ERROR: invalid URI scheme in ws_servers parameter: ' + url.scheme);
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
      if(Grammar.parse('"'+ authorization_user +'"', 'quoted_string') === -1) {
        return;
      } else {
        return authorization_user;
      }
    },

    connection_recovery_max_interval: function(connection_recovery_max_interval) {
      var value;
      if(Utils.isDecimal(connection_recovery_max_interval)) {
        value = Number(connection_recovery_max_interval);
        if(value > 0) {
          return value;
        }
      }
    },

    connection_recovery_min_interval: function(connection_recovery_min_interval) {
      var value;
      if(Utils.isDecimal(connection_recovery_min_interval)) {
        value = Number(connection_recovery_min_interval);
        if(value > 0) {
          return value;
        }
      }
    },

    display_name: function(display_name) {
      if(Grammar.parse('"' + display_name + '"', 'display_name') === -1) {
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

    hack_via_ws: function(hack_via_ws) {
      if (typeof hack_via_ws === 'boolean') {
        return hack_via_ws;
      }
    },

    hack_ip_in_contact: function(hack_ip_in_contact) {
      if (typeof hack_ip_in_contact === 'boolean') {
        return hack_ip_in_contact;
      }
    },

    instance_id: function(instance_id) {
      if ((/^uuid:/i.test(instance_id))) {
        instance_id = instance_id.substr(5);
      }

      if(Grammar.parse(instance_id, 'uuid') === -1) {
        return;
      } else {
        return instance_id;
      }
    },

    no_answer_timeout: function(no_answer_timeout) {
      var value;
      if (Utils.isDecimal(no_answer_timeout)) {
        value = Number(no_answer_timeout);
        if (value > 0) {
          return value;
        }
      }
    },

    session_timers: function(session_timers) {
      if (typeof session_timers === 'boolean') {
        return session_timers;
      }
    },

    node_websocket_options: function(node_websocket_options) {
      return (typeof node_websocket_options === 'object') ? node_websocket_options : {};
    },

    password: function(password) {
      return String(password);
    },

    register: function(register) {
      if (typeof register === 'boolean') {
        return register;
      }
    },

    register_expires: function(register_expires) {
      var value;
      if (Utils.isDecimal(register_expires)) {
        value = Number(register_expires);
        if (value > 0) {
          return value;
        }
      }
    },

    registrar_server: function(registrar_server) {
      var parsed;

      if (!/^sip:/i.test(registrar_server)) {
        registrar_server = JsSIP_C.SIP + ':' + registrar_server;
      }
      parsed = URI.parse(registrar_server);

      if(!parsed) {
        return;
      } else if(parsed.user) {
        return;
      } else {
        return parsed;
      }
    },

    use_preloaded_route: function(use_preloaded_route) {
      if (typeof use_preloaded_route === 'boolean') {
        return use_preloaded_route;
      }
    }
  }
};

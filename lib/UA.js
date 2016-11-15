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
var debugerror = require('debug')('JsSIP:ERROR:UA');
debugerror.log = console.warn.bind(console);
var JsSIP_C = require('./Constants');
var Registrator = require('./Registrator');
var RTCSession = require('./RTCSession');
var Message = require('./Message');
var Transactions = require('./Transactions');
var Transport = require('./Transport');
var Socket = require('./Socket');
var Utils = require('./Utils');
var Exceptions = require('./Exceptions');
var URI = require('./URI');
var Grammar = require('./Grammar');
var Parser = require('./Parser');
var SIPMessage = require('./SIPMessage');
var sanityCheck = require('./sanityCheck');



/**
 * The User-Agent class.
 * @class JsSIP.UA
 * @param {Object} configuration Configuration parameters.
 * @throws {JsSIP.Exceptions.ConfigurationError} If a configuration parameter is invalid.
 * @throws {TypeError} If no configuration is given.
 */
function UA(configuration) {
  debug('new() [configuration:%o]', configuration);

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

  this.closeTimer = null;

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
}

util.inherits(UA, events.EventEmitter);


//=================
//  High Level API
//=================

/**
 * Connect to the server if status = STATUS_INIT.
 * Resume UA after being closed.
 */
UA.prototype.start = function() {
  debug('start()');

  if (this.status === C.STATUS_INIT) {
    this.transport.connect();
  } else if(this.status === C.STATUS_USER_CLOSED) {
    debug('restarting UA');

    // disconnect
    if (this.closeTimer !== null) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
      this.transport.disconnect();
    }

    // reconnect
    this.status = C.STATUS_INIT;
    this.transport.connect();
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
  return this.transport.isConnected();
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

  if (this.nistTransactionsCount  === 0 &&
      this.nictTransactionsCount  === 0 &&
      this.ictTransactionsCount   === 0 &&
      this.istTransactionsCount   === 0 &&
      num_sessions === 0) {
    ua.transport.disconnect();
  }
  else {
    this.closeTimer = setTimeout(function() {
      ua.closeTimer = null;
      ua.transport.disconnect();
    }, 2000);
  }
};

/**
 * Normalice a string into a valid SIP request URI
 * -param {String} target
 * -returns {JsSIP.URI|undefined}
 */
UA.prototype.normalizeTarget = function(target) {
  return Utils.normalizeTarget(target, this.configuration.hostport_params);
};

/**
 * Allow retrieving configuration and autogenerated fields in runtime.
 */
UA.prototype.get = function(parameter) {
  switch(parameter) {
    case 'realm':
      return this.configuration.realm;

    case 'ha1':
      return this.configuration.ha1;

    default:
      debugerror('get() | cannot get "%s" parameter in runtime', parameter);
      return undefined;
  }

  return true;
};

/**
 * Allow configuration changes in runtime.
 * Returns true if the parameter could be set.
 */
UA.prototype.set = function(parameter, value) {
  switch(parameter) {
    case 'password': {
      this.configuration.password = String(value);
      break;
    }

    case 'realm': {
      this.configuration.realm = String(value);
      break;
    }

    case 'ha1': {
      this.configuration.ha1 = String(value);
      // Delete the plain SIP password.
      this.configuration.password = null;
      break;
    }

    case 'display_name': {
      if (Grammar.parse('"' + value + '"', 'display_name') === -1) {
        debugerror('set() | wrong "display_name"');
        return false;
      }
      this.configuration.display_name = value;
      break;
    }

    default:
      debugerror('set() | cannot set "%s" parameter in runtime', parameter);
      return false;
  }

  return true;
};


//===============================
//  Private (For internal use)
//===============================

// UA.prototype.saveCredentials = function(credentials) {
//   this.cache.credentials[credentials.realm] = this.cache.credentials[credentials.realm] || {};
//   this.cache.credentials[credentials.realm][credentials.uri] = credentials;
// };

// UA.prototype.getCredentials = function(request) {
//   var realm, credentials;

//   realm = request.ruri.host;

//   if (this.cache.credentials[realm] && this.cache.credentials[realm][request.ruri]) {
//     credentials = this.cache.credentials[realm][request.ruri];
//     credentials.method = request.method;
//   }

//   return credentials;
// };


//==========================
// Event Handlers
//==========================

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
        if (window.RTCPeerConnection) { // TODO
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
          debugerror('INVITE received but WebRTC is not supported');
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

UA.prototype.loadConfig = function(configuration) {
  // Settings and default values
  var parameter, value, checked_value, hostport_params, registrar_server,
  settings = {
    /* Host address
    * Value to be set in Via sent_by and host part of Contact FQDN
    */
    via_host: Utils.createRandomToken(12) + '.invalid',

    // SIP Contact URI
    contact_uri: null,

    // SIP authentication password
    password: null,

    // SIP authentication realm
    realm: null,

    // SIP authentication HA1 hash
    ha1: null,

    // Registration parameters
    register_expires: 600,
    register: true,
    registrar_server: null,

    use_preloaded_route: false,

    // Session parameters
    no_answer_timeout: 60,
    session_timers: true,
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

      checked_value = UA.configuration_check.optional[parameter].call(this, value, configuration);
      if (checked_value !== undefined) {
        settings[parameter] = checked_value;
      } else {
        throw new Exceptions.ConfigurationError(parameter, value);
      }
    }
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

  // Transport
  var sockets = [];

  if (settings.sockets && Array.isArray(settings.sockets)) {
    sockets = sockets.concat(settings.sockets);
  }

  if (sockets.length === 0) {
    throw new Exceptions.ConfigurationError('sockets');
  }

  try {
    this.transport = new Transport(sockets, { /* recovery options */
      max_interval: settings.connection_recovery_max_interval,
      min_interval: settings.connection_recovery_min_interval
    });

    // Transport event callbacks
    this.transport.onconnecting = onTransportConnecting.bind(this);
    this.transport.onconnect    = onTransportConnect.bind(this);
    this.transport.ondisconnect = onTransportDisconnect.bind(this);
    this.transport.ondata       = onTransportData.bind(this);

    // transport options not needed here anymore
    delete settings.connection_recovery_max_interval;
    delete settings.connection_recovery_min_interval;
    delete settings.sockets;
  } catch (e) {
    debugerror(e);
    throw new Exceptions.ConfigurationError('sockets', sockets);
  }

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
  if (settings.contact_uri) {
    settings.via_host = settings.contact_uri.host;
  }

  // Contact URI
  else {
    settings.contact_uri = new URI('sip', Utils.createRandomToken(8), settings.via_host, null, {transport: 'ws'});
  }

  this.contact = {
    pub_gruu: null,
    temp_gruu: null,
    uri: settings.contact_uri,
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
      case 'ha1':
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
  var
    idx, parameter, writable,
    skeleton = {},
    parameters = [
      // Internal parameters
      'jssip_id',
      'hostport_params',

      // Mandatory user configurable parameters
      'uri',

      // Optional user configurable parameters
      'authorization_user',
      'contact_uri',
      'display_name',
      'instance_id',
      'no_answer_timeout', // 30 seconds
      'session_timers', // true
      'password',
      'realm',
      'ha1',
      'register_expires', // 600 seconds
      'registrar_server',
      'sockets',
      'use_preloaded_route',

      // Post-configuration generated parameters
      'via_core_value',
      'via_host'
    ];

  var writable_parameters = [
    'password', 'realm', 'ha1', 'display_name'
  ];

  for(idx in parameters) {
    parameter = parameters[idx];

    if (writable_parameters.indexOf(parameter) !== -1) {
      writable = true;
    } else {
      writable = false;
    }

    skeleton[parameter] = {
      value: '',
      writable: writable,
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

    contact_uri: function(contact_uri) {
      if (typeof contact_uri === 'string') {
        var uri = Grammar.parse(contact_uri,'SIP_URI');
        if (uri !== -1) {
          return uri;
        }
      }
    },

    display_name: function(display_name) {
      if (Grammar.parse('"' + display_name + '"', 'display_name') === -1) {
        return;
      } else {
        return display_name;
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

    password: function(password) {
      return String(password);
    },

    realm: function(realm) {
      return String(realm);
    },

    ha1: function(ha1) {
      return String(ha1);
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

    sockets: function(sockets) {
      var idx, length;

      /* Allow defining sockets parameter as:
       *  Socket: socket
       *  Array of Socket: [socket1, socket2]
       *  Array of Objects: [{socket: socket1, weight:1}, {socket: Socket2, weight:0}]
       *  Array of Objects and Socket: [{socket: socket1}, socket2]
       */
      if (Socket.isSocket(sockets)) {
        sockets = [{socket: sockets}];
      } else if (Array.isArray(sockets) && sockets.length) {
        length = sockets.length;
        for (idx = 0; idx < length; idx++) {
          if (Socket.isSocket(sockets[idx])) {
            sockets[idx] = {socket: sockets[idx]};
          }
        }
      } else {
        return;
      }

      return sockets;
    },

    use_preloaded_route: function(use_preloaded_route) {
      if (typeof use_preloaded_route === 'boolean') {
        return use_preloaded_route;
      }
    }
  }
};

/**
 * Transport event handlers
 */

// Transport connecting event
function onTransportConnecting(data) {
  this.emit('connecting', data);
}

// Transport connected event.
function onTransportConnect(data) {
  if(this.status === C.STATUS_USER_CLOSED) {
    return;
  }

  this.status = C.STATUS_READY;
  this.error = null;

  this.emit('connected', data);

  if(this.dynConfiguration.register) {
    this._registrator.register();
  }
}

// Transport disconnected event.
function onTransportDisconnect(data) {
  // Run _onTransportError_ callback on every client transaction using _transport_
  var type, idx, length,
  client_transactions = ['nict', 'ict', 'nist', 'ist'];

  length = client_transactions.length;
  for (type = 0; type < length; type++) {
    for(idx in this.transactions[client_transactions[type]]) {
      this.transactions[client_transactions[type]][idx].onTransportError();
    }
  }

  this.emit('disconnected', data);

  // Call registrator _onTransportClosed_
  this._registrator.onTransportClosed();

  if (this.status !== C.STATUS_USER_CLOSED) {
    this.status = C.STATUS_NOT_READY;
    this.error = C.NETWORK_ERROR;
  }
}

// Transport data event
function onTransportData(data) {
 var transaction,
  transport = data.transport,
  message = data.message;

 message = Parser.parseMessage(message, this);

 if (! message) {
   return;
 }

 if (this.status === UA.C.STATUS_USER_CLOSED &&
     message instanceof SIPMessage.IncomingRequest) {
   return;
 }

 // Do some sanity check
 if(! sanityCheck(message, this, transport)) {
   return;
 }

 if(message instanceof SIPMessage.IncomingRequest) {
   message.transport = transport;
   this.receiveRequest(message);
 } else if(message instanceof SIPMessage.IncomingResponse) {
   /* Unike stated in 18.1.2, if a response does not match
   * any transaction, it is discarded here and no passed to the core
   * in order to be discarded there.
   */
   switch(message.method) {
     case JsSIP_C.INVITE:
       transaction = this.transactions.ict[message.via_branch];
       if(transaction) {
         transaction.receiveResponse(message);
       }
       break;
     case JsSIP_C.ACK:
       // Just in case ;-)
       break;
     default:
       transaction = this.transactions.nict[message.via_branch];
       if(transaction) {
         transaction.receiveResponse(message);
       }
       break;
   }
 }
}

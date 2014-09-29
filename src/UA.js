(function(JsSIP) {
var UA, C;


C = {
	// UA status codes
	STATUS_INIT :                0,
	STATUS_READY:                1,
	STATUS_USER_CLOSED:          2,
	STATUS_NOT_READY:            3,

	// UA error codes
	CONFIGURATION_ERROR:  1,
	NETWORK_ERROR:        2,

	// TODO: NO
	/* UA events and corresponding SIP Methods.
	* Dynamically added to 'Allow' header field if the
	* corresponding event handler is set.
	*/
	EVENT_METHODS: {
		'newRTCSession': 'INVITE',
		'newMessage': 'MESSAGE'
	},

	// TODO: NO
	ALLOWED_METHODS: [
		'ACK',
		'CANCEL',
		'BYE',
		'OPTIONS'
	],

	// TODO: NO
	ACCEPTED_BODY_TYPES: [
		'application/sdp',
		'application/dtmf-relay'
	],

	// TODO: NO
	MAX_FORWARDS: 69,
	TAG_LENGTH: 10
};


/**
 * The User-Agent class.
 * @class UA
 * @memberof JsSIP
 * @param {Object} configuration Configuration parameters.
 * @throws {JsSIP.Exceptions.ConfigurationError} If a configuration parameter is invalid.
 * @throws {TypeError} If no configuration is given.
 */
UA = function(configuration) {
  var events = [
	'connecting',
	'connected',
	'disconnected',
	'newTransaction',
	'transactionDestroyed',
	'registered',
	'unregistered',
	'registrationFailed',
	'newRTCSession',
	'newMessage'
  ];

  // Set Accepted Body Types
  C.ACCEPTED_BODY_TYPES = C.ACCEPTED_BODY_TYPES.toString();

  this.log = new JsSIP.LoggerFactory();
  this.logger = this.getLogger('jssip.ua');

  this.cache = {
	credentials: {}
  };

  this.configuration = {};
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

  // Apply log configuration if present
  if (configuration.log) {
	if (configuration.log.hasOwnProperty('builtinEnabled')) {
	  this.log.builtinEnabled = configuration.log.builtinEnabled;
	}

	if (configuration.log.hasOwnProperty('level')) {
	  this.log.level = configuration.log.level;
	}

	if (configuration.log.hasOwnProperty('connector')) {
	  this.log.connector = configuration.log.connector;
	}
  }

  try {
	this.loadConfig(configuration);
	this.initEvents(events);
  } catch(e) {
	this.status = C.STATUS_NOT_READY;
	this.error = C.CONFIGURATION_ERROR;
	throw e;
  }

  // Initialize registrator
  this.registrator = new JsSIP.Registrator(this);
};
UA.prototype = new JsSIP.EventEmitter();


//=================
//  High Level API
//=================

/**
 * Register.
 *
 *
 */
UA.prototype.register = function(options) {
  this.configuration.register = true;
  this.registrator.register(options);
};

/**
 * Unregister.
 */
UA.prototype.unregister = function(options) {
  this.configuration.register = false;
  this.registrator.unregister(options);
};

/**
 * Registration state.
 */
UA.prototype.isRegistered = function() {
  if(this.registrator.registered) {
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
  var session;

  session = new JsSIP.RTCSession(this);
  session.connect(target, options);
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
  var message;

  message = new JsSIP.Message(this);
  message.send(target, body, options);
};

/**
 * Gracefully close.
 *
 */
UA.prototype.stop = function() {
  var session;
  var applicant;
  var num_sessions;
  var ua = this;

  this.logger.log('user requested closure...');

  if(this.status === C.STATUS_USER_CLOSED) {
	this.logger.warn('UA already closed');
	return;
  }

  // Clear transportRecoveryTimer
  window.clearTimeout(this.transportRecoveryTimer);

  // Close registrator
  this.logger.log('closing registrator');
  this.registrator.close();

  // If there are session wait a bit so CANCEL/BYE can be sent and their responses received.
  num_sessions = Object.keys(this.sessions).length;

  // Run  _terminate_ on every Session
  for(session in this.sessions) {
	this.logger.log('closing session ' + session);
	this.sessions[session].terminate();
  }

  // Run  _close_ on every applicant
  for(applicant in this.applicants) {
	this.applicants[applicant].close();
  }

  this.status = C.STATUS_USER_CLOSED;

  // If there are no pending non-INVITE client or server transactions and no
  // sessions, then disconnect now. Otherwise wait for 2 seconds.
  if (this.nistTransactionsCount === 0 && this.nictTransactionsCount === 0 && num_sessions === 0) {
  	ua.transport.disconnect();
  }
  else {
    window.setTimeout(function() {
      ua.transport.disconnect();
    }, 2000);
  }
};

/**
 * Connect to the WS server if status = STATUS_INIT.
 * Resume UA after being closed.
 * -returns {Boolean} true if the start action takes place, false otherwise
 */
UA.prototype.start = function() {
  var server;

  this.logger.debug('user requested startup...');

  if (this.status === C.STATUS_INIT) {
	server = this.getNextWsServer();
	this.transport = new JsSIP.Transport(this, server);
	this.transport.connect();
	return true;
  } else if(this.status === C.STATUS_USER_CLOSED) {
	this.logger.log('resuming');
	this.status = C.STATUS_READY;
	this.transport.connect();
	return true;
  } else if (this.status === C.STATUS_READY) {
	this.logger.log('UA is in READY status, not resuming');
	return false;
  } else {
	this.logger.error('Connection is down. Auto-Recovery system is trying to connect');
	return false;
  }
};

/**
 * Normalice a string into a valid SIP request URI
 * -param {String} target
 * -returns {JsSIP.URI|undefined}
 */
UA.prototype.normalizeTarget = function(target) {
  return JsSIP.Utils.normalizeTarget(target, this.configuration.hostport_params);
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

UA.prototype.getLogger = function(category, label) {
	return this.log.getLogger(category, label);
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

  transport.server.status = JsSIP.Transport.C.STATUS_DISCONNECTED;
  this.logger.debug('connection state set to '+ JsSIP.Transport.C.STATUS_DISCONNECTED);

  length = client_transactions.length;
  for (type = 0; type < length; type++) {
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
 */
UA.prototype.onTransportError = function(transport) {
  var server;

  this.logger.log('transport ' + transport.server.ws_uri + ' failed | connection state set to '+ JsSIP.Transport.C.STATUS_ERROR);

  // Close sessions.
  //Mark this transport as 'down' and try the next one
  transport.server.status = JsSIP.Transport.C.STATUS_ERROR;

  this.emit('disconnected', this, {
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
	this.transport = new JsSIP.Transport(this, server);
	this.transport.connect();
  }else {
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

  transport.server.status = JsSIP.Transport.C.STATUS_READY;
  this.logger.debug('connection state set to '+ JsSIP.Transport.C.STATUS_READY);

  if(this.status === C.STATUS_USER_CLOSED) {
	return;
  }

  this.status = C.STATUS_READY;
  this.error = null;

  if(this.configuration.register) {
	this.registrator.onTransportConnected();
  }

  this.emit('connected', this, {
	transport: transport
  });
};


/**
 * Transport connecting event
 */
UA.prototype.onTransportConnecting = function(transport, attempts) {
  this.emit('connecting', this, {
	transport: transport,
	attempts: attempts
  });
};


/**
 * new Transaction
 */
UA.prototype.newTransaction = function(transaction) {
  this.transactions[transaction.type][transaction.id] = transaction;
  this.emit('newTransaction', this, {
	transaction: transaction
  });
};


/**
 * Transaction destroyed.
 */
UA.prototype.destroyTransaction = function(transaction) {
  delete this.transactions[transaction.type][transaction.id];
  this.emit('transactionDestroyed', this, {
	transaction: transaction
  });
};


//=========================
// receiveRequest
//=========================

/**
 * Request reception
 */
UA.prototype.receiveRequest = function(request) {
  var dialog, session, message,
	method = request.method;

  // Check that request URI points to us
  if(request.ruri.user !== this.configuration.uri.user && request.ruri.user !== this.contact.uri.user) {
	this.logger.warn('Request-URI does not point to us');
	if (request.method !== JsSIP.C.ACK) {
	  request.reply_sl(404);
	}
	return;
  }

  // Check request URI scheme
  if(request.ruri.scheme === JsSIP.C.SIPS) {
	request.reply_sl(416);
	return;
  }

  // Check transaction
  if(JsSIP.Transactions.checkTransaction(this, request)) {
	return;
  }

  // Create the server transaction
  if(method === JsSIP.C.INVITE) {
	new JsSIP.Transactions.InviteServerTransaction(request, this);
  } else if(method !== JsSIP.C.ACK && method !== JsSIP.C.CANCEL) {
	new JsSIP.Transactions.NonInviteServerTransaction(request, this);
  }

  /* RFC3261 12.2.2
   * Requests that do not change in any way the state of a dialog may be
   * received within a dialog (for example, an OPTIONS request).
   * They are processed as if they had been received outside the dialog.
   */
  if(method === JsSIP.C.OPTIONS) {
	request.reply(200);
  } else if (method === JsSIP.C.MESSAGE) {
	if (!this.checkEvent('newMessage') || this.listeners('newMessage').length === 0) {
	  request.reply(405);
	  return;
	}
	message = new JsSIP.Message(this);
	message.init_incoming(request);
  } else if (method === JsSIP.C.INVITE) {
	if (!this.checkEvent('newRTCSession') || this.listeners('newRTCSession').length === 0) {
	  request.reply(405);
	  return;
	}
  }

  // Initial Request
  if(!request.to_tag) {
	switch(method) {
	  case JsSIP.C.INVITE:
		if(JsSIP.WebRTC.isSupported) {
		  session = new JsSIP.RTCSession(this);
		  session.init_incoming(request);
		} else {
		  this.logger.warn('INVITE received but WebRTC is not supported');
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
		  this.logger.warn('received CANCEL request for a non existent session');
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
		this.logger.warn('received NOTIFY request for a non existent session');
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
UA.prototype.findDialog = function(request) {
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
 */
UA.prototype.getNextWsServer = function() {
  // Order servers by weight
  var idx, length, ws_server,
	candidates = [];

  length = this.configuration.ws_servers.length;
  for (idx = 0; idx < length; idx++) {
	ws_server = this.configuration.ws_servers[idx];

	if (ws_server.status === JsSIP.Transport.C.STATUS_ERROR) {
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
  this.registrator.onTransportClosed();
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
	this.logger.log('time for next connection attempt exceeds connection_recovery_max_interval, resetting counter');
	nextRetry = ua.configuration.connection_recovery_min_interval;
	count = 0;
  }

  this.logger.log('next connection attempt in '+ nextRetry +' seconds');

  this.transportRecoveryTimer = window.setTimeout(
	function(){
	  ua.transportRecoverAttempts = count + 1;
	  ua.transport = new JsSIP.Transport(ua, server);
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
	  via_host: JsSIP.Utils.createRandomToken(12) + '.invalid',

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
	  stun_servers: ['stun:stun.l.google.com:19302'],
	  turn_servers: [],

	  // Logging parameters
	  trace_sip: false,

	  // Hacks
	  hack_via_tcp: false,
	  hack_via_ws: false,
	  hack_ip_in_contact: false
	};

  // Pre-Configuration

  // Check Mandatory parameters
  for(parameter in UA.configuration_check.mandatory) {
	if(!configuration.hasOwnProperty(parameter)) {
	  throw new JsSIP.Exceptions.ConfigurationError(parameter);
	} else {
	  value = configuration[parameter];
	  checked_value = UA.configuration_check.mandatory[parameter](value);
	  if (checked_value !== undefined) {
		settings[parameter] = checked_value;
	  } else {
		throw new JsSIP.Exceptions.ConfigurationError(parameter, value);
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
	  if (JsSIP.Utils.isEmpty(value)) {
		continue;
	  }

	  checked_value = UA.configuration_check.optional[parameter](value);
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

  // Allow passing 0 number as display_name.
  if (settings.display_name === 0) {
	settings.display_name = '0';
  }

  // Instance-id for GRUU
  if (!settings.instance_id) {
	settings.instance_id = JsSIP.Utils.newUUID();
  }

  // jssip_id instance parameter. Static random tag of length 5
  settings.jssip_id = JsSIP.Utils.createRandomToken(5);

  // String containing settings.uri without scheme and user.
  hostport_params = settings.uri.clone();
  hostport_params.user = null;
  settings.hostport_params = hostport_params.toString().replace(/^sip:/i, '');

  /* Check whether authorization_user is explicitly defined.
   * Take 'settings.uri.user' value if not.
   */
  if (!settings.authorization_user) {
	settings.authorization_user = settings.uri.user;
  }

  /* If no 'registrar_server' is set use the 'uri' value without user portion. */
  if (!settings.registrar_server) {
	registrar_server = settings.uri.clone();
	registrar_server.user = null;
	settings.registrar_server = registrar_server;
  }

  // User no_answer_timeout
  settings.no_answer_timeout = settings.no_answer_timeout * 1000;

  // Via Host
  if (settings.hack_ip_in_contact) {
	settings.via_host = JsSIP.Utils.getRandomTestNetIP();
  }

  // Set empty Stun Server Set if explicitly passed an empty Array
  value = configuration.stun_servers;
  if (value instanceof Array && value.length === 0) {
	settings.stun_servers = [];
  }

  this.contact = {
	pub_gruu: null,
	temp_gruu: null,
	uri: new JsSIP.URI('sip', JsSIP.Utils.createRandomToken(8), settings.via_host, null, {transport: 'ws'}),
	toString: function(options){
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

  this.logger.debug('configuration parameters after validation:');
  for(parameter in settings) {
	switch(parameter) {
	  case 'uri':
	  case 'registrar_server':
		this.logger.debug('· ' + parameter + ': ' + settings[parameter]);
		break;
	  case 'password':
		this.logger.debug('· ' + parameter + ': ' + 'NOT SHOWN');
		break;
	  default:
		this.logger.debug('· ' + parameter + ': ' + window.JSON.stringify(settings[parameter]));
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
	  "jssip_id",
	  "ws_server_max_reconnection",
	  "ws_server_reconnection_timeout",
	  "hostport_params",

	  // Mandatory user configurable parameters
	  "uri",
	  "ws_servers",

	  // Optional user configurable parameters
	  "authorization_user",
	  "connection_recovery_max_interval",
	  "connection_recovery_min_interval",
	  "display_name",
	  "hack_via_tcp", // false
	  "hack_via_ws", // false
	  "hack_ip_in_contact", //false
	  "instance_id",
	  "no_answer_timeout", // 30 seconds
	  "password",
	  "register_expires", // 600 seconds
	  "registrar_server",
	  "stun_servers",
	  "trace_sip",
	  "turn_servers",
	  "use_preloaded_route",

	  // Post-configuration generated parameters
	  "via_core_value",
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
		uri = JsSIP.C.SIP + ':' + uri;
	  }
	  parsed = JsSIP.URI.parse(uri);

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
	  } else if (ws_servers instanceof Array) {
		length = ws_servers.length;
		for (idx = 0; idx < length; idx++) {
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

	  length = ws_servers.length;
	  for (idx = 0; idx < length; idx++) {
		if (!ws_servers[idx].ws_uri) {
		  this.logger.error('missing "ws_uri" attribute in ws_servers parameter');
		  return;
		}
		if (ws_servers[idx].weight && !Number(ws_servers[idx].weight)) {
		  this.logger.error('"weight" attribute in ws_servers parameter must be a Number');
		  return;
		}

		url = JsSIP.Grammar.parse(ws_servers[idx].ws_uri, 'absoluteURI');

		if(url === -1) {
		  this.logger.error('invalid "ws_uri" attribute in ws_servers parameter: ' + ws_servers[idx].ws_uri);
		  return;
		} else if(url.scheme !== 'wss' && url.scheme !== 'ws') {
		  this.logger.error('invalid URI scheme in ws_servers parameter: ' + url.scheme);
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

	  if(JsSIP.Grammar.parse(instance_id, 'uuid') === -1) {
		return;
	  } else {
		return instance_id;
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
	  return String(password);
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

	registrar_server: function(registrar_server) {
	  var parsed;

	  if (!/^sip:/i.test(registrar_server)) {
		registrar_server = JsSIP.C.SIP + ':' + registrar_server;
	  }
	  parsed = JsSIP.URI.parse(registrar_server);

	  if(!parsed) {
		return;
	  } else if(parsed.user) {
		return;
	  } else {
		return parsed;
	  }
	},

	stun_servers: function(stun_servers) {
	  var idx, length, stun_server;

	  if (typeof stun_servers === 'string') {
		stun_servers = [stun_servers];
	  } else if (!(stun_servers instanceof Array)) {
		return;
	  }

	  length = stun_servers.length;
	  for (idx = 0; idx < length; idx++) {
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
	  var idx, idx2, length, length2, turn_server, url;

	  if (! turn_servers instanceof Array) {
		turn_servers = [turn_servers];
	  }

	  length = turn_servers.length;
	  for (idx = 0; idx < length; idx++) {
		turn_server = turn_servers[idx];

		// Backward compatibility:
		//Allow defining the turn_server 'urls' with the 'server' property.
		if (turn_server.server) {
		  turn_server.urls = [turn_server.server];
		}

		// Backward compatibility:
		//Allow defining the turn_server 'credential' with the 'password' property.
		if (turn_server.password) {
		  turn_server.credential = [turn_server.password];
		}

		if (!turn_server.urls || !turn_server.username || !turn_server.credential) {
		  return;
		}

		if (!(turn_server.urls instanceof Array)) {
		  turn_server.urls = [turn_server.urls];
		}

		length2 = turn_server.urls.length;
		for (idx2 = 0; idx2 < length2; idx2++) {
		  url = turn_server.urls[idx2];

		  if (!(/^turns?:/.test(url))) {
			url = 'turn:' + url;
		  }

		  if(JsSIP.Grammar.parse(url, 'turn_URI') === -1) {
			return;
		  }
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

UA.C = C;
JsSIP.UA = UA;
}(JsSIP));

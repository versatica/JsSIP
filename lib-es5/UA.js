'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;
var JsSIP_C = require('./Constants');
var Registrator = require('./Registrator');
var RTCSession = require('./RTCSession');
var Message = require('./Message');
var Transactions = require('./Transactions');
var Transport = require('./Transport');
var Utils = require('./Utils');
var Exceptions = require('./Exceptions');
var URI = require('./URI');
var Grammar = require('./Grammar');
var Parser = require('./Parser');
var SIPMessage = require('./SIPMessage');
var sanityCheck = require('./sanityCheck');
var config = require('./Config');
var debug = require('react-native-debug')('JsSIP:UA');
var debugerror = require('react-native-debug')('JsSIP:ERROR:UA');

debugerror.log = console.warn.bind(console);

var C = {
  // UA status codes.
  STATUS_INIT: 0,
  STATUS_READY: 1,
  STATUS_USER_CLOSED: 2,
  STATUS_NOT_READY: 3,

  // UA error codes.
  CONFIGURATION_ERROR: 1,
  NETWORK_ERROR: 2
};

/**
 * The User-Agent class.
 * @class JsSIP.UA
 * @param {Object} configuration Configuration parameters.
 * @throws {JsSIP.Exceptions.ConfigurationError} If a configuration parameter is invalid.
 * @throws {TypeError} If no configuration is given.
 */
module.exports = function (_EventEmitter) {
  _inherits(UA, _EventEmitter);

  _createClass(UA, null, [{
    key: 'C',

    // Expose C object.
    get: function get() {
      return C;
    }
  }]);

  function UA(configuration) {
    _classCallCheck(this, UA);

    debug('new() [configuration:%o]', configuration);

    var _this = _possibleConstructorReturn(this, (UA.__proto__ || Object.getPrototypeOf(UA)).call(this));

    _this._cache = {
      credentials: {}
    };

    _this._configuration = Object.assign({}, config.settings);
    _this._dynConfiguration = {};
    _this._dialogs = {};

    // User actions outside any session/dialog (MESSAGE).
    _this._applicants = {};

    _this._sessions = {};
    _this._transport = null;
    _this._contact = null;
    _this._status = C.STATUS_INIT;
    _this._error = null;
    _this._transactions = {
      nist: {},
      nict: {},
      ist: {},
      ict: {}
    };

    // Custom UA empty object for high level use.
    _this._data = {};

    _this._closeTimer = null;

    // Check configuration argument.
    if (configuration === undefined) {
      throw new TypeError('Not enough arguments');
    }

    // Load configuration.
    try {
      _this._loadConfig(configuration);
    } catch (e) {
      _this._status = C.STATUS_NOT_READY;
      _this._error = C.CONFIGURATION_ERROR;
      throw e;
    }

    // Initialize registrator.
    _this._registrator = new Registrator(_this);
    return _this;
  }

  _createClass(UA, [{
    key: 'start',


    // =================
    //  High Level API
    // =================

    /**
     * Connect to the server if status = STATUS_INIT.
     * Resume UA after being closed.
     */
    value: function start() {
      debug('start()');

      if (this._status === C.STATUS_INIT) {
        this._transport.connect();
      } else if (this._status === C.STATUS_USER_CLOSED) {
        debug('restarting UA');

        // Disconnect.
        if (this._closeTimer !== null) {
          clearTimeout(this._closeTimer);
          this._closeTimer = null;
          this._transport.disconnect();
        }

        // Reconnect.
        this._status = C.STATUS_INIT;
        this._transport.connect();
      } else if (this._status === C.STATUS_READY) {
        debug('UA is in READY status, not restarted');
      } else {
        debug('ERROR: connection is down, Auto-Recovery system is trying to reconnect');
      }

      // Set dynamic configuration.
      this._dynConfiguration.register = this._configuration.register;
    }

    /**
     * Register.
     */

  }, {
    key: 'register',
    value: function register() {
      debug('register()');

      this._dynConfiguration.register = true;
      this._registrator.register();
    }

    /**
     * Unregister.
     */

  }, {
    key: 'unregister',
    value: function unregister(options) {
      debug('unregister()');

      this._dynConfiguration.register = false;
      this._registrator.unregister(options);
    }

    /**
     * Get the Registrator instance.
     */

  }, {
    key: 'registrator',
    value: function registrator() {
      return this._registrator;
    }

    /**
     * Registration state.
     */

  }, {
    key: 'isRegistered',
    value: function isRegistered() {
      return this._registrator.registered;
    }

    /**
     * Connection state.
     */

  }, {
    key: 'isConnected',
    value: function isConnected() {
      return this._transport.isConnected();
    }

    /**
     * Make an outgoing call.
     *
     * -param {String} target
     * -param {Object} [options]
     *
     * -throws {TypeError}
     *
     */

  }, {
    key: 'call',
    value: function call(target, options) {
      debug('call()');

      var session = new RTCSession(this);

      session.connect(target, options);

      return session;
    }

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

  }, {
    key: 'sendMessage',
    value: function sendMessage(target, body, options) {
      debug('sendMessage()');

      var message = new Message(this);

      message.send(target, body, options);

      return message;
    }

    /**
     * Terminate ongoing sessions.
     */

  }, {
    key: 'terminateSessions',
    value: function terminateSessions(options) {
      debug('terminateSessions()');

      for (var idx in this._sessions) {
        if (!this._sessions[idx].isEnded()) {
          this._sessions[idx].terminate(options);
        }
      }
    }

    /**
     * Gracefully close.
     *
     */

  }, {
    key: 'stop',
    value: function stop() {
      var _this2 = this;

      debug('stop()');

      // Remove dynamic settings.
      this._dynConfiguration = {};

      if (this._status === C.STATUS_USER_CLOSED) {
        debug('UA already closed');

        return;
      }

      // Close registrator.
      this._registrator.close();

      // If there are session wait a bit so CANCEL/BYE can be sent and their responses received.
      var num_sessions = Object.keys(this._sessions).length;

      // Run  _terminate_ on every Session.
      for (var session in this._sessions) {
        if (Object.prototype.hasOwnProperty.call(this._sessions, session)) {
          debug('closing session ' + session);
          try {
            this._sessions[session].terminate();
          } catch (error) {}
        }
      }

      // Run  _close_ on every applicant.
      for (var applicant in this._applicants) {
        if (Object.prototype.hasOwnProperty.call(this._applicants, applicant)) try {
          this._applicants[applicant].close();
        } catch (error) {}
      }

      this._status = C.STATUS_USER_CLOSED;

      var num_transactions = Object.keys(this._transactions.nict).length + Object.keys(this._transactions.nist).length + Object.keys(this._transactions.ict).length + Object.keys(this._transactions.ist).length;

      if (num_transactions === 0 && num_sessions === 0) {
        this._transport.disconnect();
      } else {
        this._closeTimer = setTimeout(function () {
          _this2._closeTimer = null;
          _this2._transport.disconnect();
        }, 2000);
      }
    }

    /**
     * Normalice a string into a valid SIP request URI
     * -param {String} target
     * -returns {JsSIP.URI|undefined}
     */

  }, {
    key: 'normalizeTarget',
    value: function normalizeTarget(target) {
      return Utils.normalizeTarget(target, this._configuration.hostport_params);
    }

    /**
     * Allow retrieving configuration and autogenerated fields in runtime.
     */

  }, {
    key: 'get',
    value: function get(parameter) {
      switch (parameter) {
        case 'realm':
          return this._configuration.realm;

        case 'ha1':
          return this._configuration.ha1;

        default:
          debugerror('get() | cannot get "%s" parameter in runtime', parameter);

          return undefined;
      }
    }

    /**
     * Allow configuration changes in runtime.
     * Returns true if the parameter could be set.
     */

  }, {
    key: 'set',
    value: function set(parameter, value) {
      switch (parameter) {
        case 'password':
          {
            this._configuration.password = String(value);
            break;
          }

        case 'realm':
          {
            this._configuration.realm = String(value);
            break;
          }

        case 'ha1':
          {
            this._configuration.ha1 = String(value);
            // Delete the plain SIP password.
            this._configuration.password = null;
            break;
          }

        case 'display_name':
          {
            if (Grammar.parse('"' + value + '"', 'display_name') === -1) {
              debugerror('set() | wrong "display_name"');

              return false;
            }
            this._configuration.display_name = value;
            break;
          }

        default:
          debugerror('set() | cannot set "%s" parameter in runtime', parameter);

          return false;
      }

      return true;
    }

    // ==========================
    // Event Handlers.
    // ==========================

    /**
     * new Transaction
     */

  }, {
    key: 'newTransaction',
    value: function newTransaction(transaction) {
      this._transactions[transaction.type][transaction.id] = transaction;
      this.emit('newTransaction', {
        transaction: transaction
      });
    }

    /**
     * Transaction destroyed.
     */

  }, {
    key: 'destroyTransaction',
    value: function destroyTransaction(transaction) {
      delete this._transactions[transaction.type][transaction.id];
      this.emit('transactionDestroyed', {
        transaction: transaction
      });
    }

    /**
     * new Dialog
     */

  }, {
    key: 'newDialog',
    value: function newDialog(dialog) {
      this._dialogs[dialog.id] = dialog;
    }

    /**
     * Dialog destroyed.
     */

  }, {
    key: 'destroyDialog',
    value: function destroyDialog(dialog) {
      delete this._dialogs[dialog.id];
    }

    /**
     *  new Message
     */

  }, {
    key: 'newMessage',
    value: function newMessage(message, data) {
      this._applicants[message] = message;
      this.emit('newMessage', data);
    }

    /**
     *  Message destroyed.
     */

  }, {
    key: 'destroyMessage',
    value: function destroyMessage(message) {
      delete this._applicants[message];
    }

    /**
     * new RTCSession
     */

  }, {
    key: 'newRTCSession',
    value: function newRTCSession(session, data) {
      this._sessions[session.id] = session;
      this.emit('newRTCSession', data);
    }

    /**
     * RTCSession destroyed.
     */

  }, {
    key: 'destroyRTCSession',
    value: function destroyRTCSession(session) {
      delete this._sessions[session.id];
    }

    /**
     * Registered
     */

  }, {
    key: 'registered',
    value: function registered(data) {
      this.emit('registered', data);
    }

    /**
     * Unregistered
     */

  }, {
    key: 'unregistered',
    value: function unregistered(data) {
      this.emit('unregistered', data);
    }

    /**
     * Registration Failed
     */

  }, {
    key: 'registrationFailed',
    value: function registrationFailed(data) {
      this.emit('registrationFailed', data);
    }

    // =========================
    // ReceiveRequest.
    // =========================

    /**
     * Request reception
     */

  }, {
    key: 'receiveRequest',
    value: function receiveRequest(request) {
      var method = request.method;

      // Check that request URI points to us.
      if (request.ruri.user !== this._configuration.uri.user && request.ruri.user !== this._contact.uri.user) {
        debug('Request-URI does not point to us');
        if (request.method !== JsSIP_C.ACK) {
          request.reply_sl(404);
        }

        return;
      }

      // Check request URI scheme.
      if (request.ruri.scheme === JsSIP_C.SIPS) {
        request.reply_sl(416);

        return;
      }

      // Check transaction.
      if (Transactions.checkTransaction(this, request)) {
        return;
      }

      // Create the server transaction.
      if (method === JsSIP_C.INVITE) {
        /* eslint-disable no-new */
        new Transactions.InviteServerTransaction(this, this._transport, request);
        /* eslint-enable no-new */
      } else if (method !== JsSIP_C.ACK && method !== JsSIP_C.CANCEL) {
        /* eslint-disable no-new */
        new Transactions.NonInviteServerTransaction(this, this._transport, request);
        /* eslint-enable no-new */
      }

      /* RFC3261 12.2.2
       * Requests that do not change in any way the state of a dialog may be
       * received within a dialog (for example, an OPTIONS request).
       * They are processed as if they had been received outside the dialog.
       */
      if (method === JsSIP_C.OPTIONS) {
        request.reply(200);
      } else if (method === JsSIP_C.MESSAGE) {
        if (this.listeners('newMessage').length === 0) {
          request.reply(405);

          return;
        }
        var message = new Message(this);

        message.init_incoming(request);
      } else if (method === JsSIP_C.INVITE) {
        // Initial INVITE.
        if (!request.to_tag && this.listeners('newRTCSession').length === 0) {
          request.reply(405);

          return;
        }
      }

      var dialog = void 0;
      var session = void 0;

      // Initial Request.
      if (!request.to_tag) {
        switch (method) {
          case JsSIP_C.INVITE:
            if (window.RTCPeerConnection) {
              // TODO
              if (request.hasHeader('replaces')) {
                var replaces = request.replaces;

                dialog = this._findDialog(replaces.call_id, replaces.from_tag, replaces.to_tag);
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
            // Out of dialog BYE received.
            request.reply(481);
            break;
          case JsSIP_C.CANCEL:
            session = this._findSession(request);
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
      // In-dialog request.
      else {
          dialog = this._findDialog(request.call_id, request.from_tag, request.to_tag);

          if (dialog) {
            dialog.receiveRequest(request);
          } else if (method === JsSIP_C.NOTIFY) {
            session = this._findSession(request);
            if (session) {
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
          else if (method !== JsSIP_C.ACK) {
              request.reply(481);
            }
        }
    }

    // =================
    // Utils.
    // =================

    /**
     * Get the session to which the request belongs to, if any.
     */

  }, {
    key: '_findSession',
    value: function _findSession(_ref) {
      var call_id = _ref.call_id,
          from_tag = _ref.from_tag,
          to_tag = _ref.to_tag;

      var sessionIDa = call_id + from_tag;
      var sessionA = this._sessions[sessionIDa];
      var sessionIDb = call_id + to_tag;
      var sessionB = this._sessions[sessionIDb];

      if (sessionA) {
        return sessionA;
      } else if (sessionB) {
        return sessionB;
      } else {
        return null;
      }
    }

    /**
     * Get the dialog to which the request belongs to, if any.
     */

  }, {
    key: '_findDialog',
    value: function _findDialog(call_id, from_tag, to_tag) {
      var id = call_id + from_tag + to_tag;
      var dialog = this._dialogs[id];

      if (dialog) {
        return dialog;
      } else {
        id = call_id + to_tag + from_tag;
        dialog = this._dialogs[id];
        if (dialog) {
          return dialog;
        } else {
          return null;
        }
      }
    }
  }, {
    key: '_loadConfig',
    value: function _loadConfig(configuration) {
      // Check and load the given configuration.
      try {
        config.load(this._configuration, configuration);
      } catch (e) {
        throw e;
      }

      // Post Configuration Process.

      // Allow passing 0 number as display_name.
      if (this._configuration.display_name === 0) {
        this._configuration.display_name = '0';
      }

      // Instance-id for GRUU.
      if (!this._configuration.instance_id) {
        this._configuration.instance_id = Utils.newUUID();
      }

      // Jssip_id instance parameter. Static random tag of length 5.
      this._configuration.jssip_id = Utils.createRandomToken(5);

      // String containing this._configuration.uri without scheme and user.
      var hostport_params = this._configuration.uri.clone();

      hostport_params.user = null;
      this._configuration.hostport_params = hostport_params.toString().replace(/^sip:/i, '');

      // Transport.
      try {
        this._transport = new Transport(this._configuration.sockets, {
          // Recovery options.
          max_interval: this._configuration.connection_recovery_max_interval,
          min_interval: this._configuration.connection_recovery_min_interval
        });

        // Transport event callbacks.
        this._transport.onconnecting = onTransportConnecting.bind(this);
        this._transport.onconnect = onTransportConnect.bind(this);
        this._transport.ondisconnect = onTransportDisconnect.bind(this);
        this._transport.ondata = onTransportData.bind(this);
      } catch (e) {
        debugerror(e);
        throw new Exceptions.ConfigurationError('sockets', this._configuration.sockets);
      }

      // Remove sockets instance from configuration object.
      delete this._configuration.sockets;

      // Check whether authorization_user is explicitly defined.
      // Take 'this._configuration.uri.user' value if not.
      if (!this._configuration.authorization_user) {
        this._configuration.authorization_user = this._configuration.uri.user;
      }

      // If no 'registrar_server' is set use the 'uri' value without user portion and
      // without URI params/headers.
      if (!this._configuration.registrar_server) {
        var registrar_server = this._configuration.uri.clone();

        registrar_server.user = null;
        registrar_server.clearParams();
        registrar_server.clearHeaders();
        this._configuration.registrar_server = registrar_server;
      }

      // User no_answer_timeout.
      this._configuration.no_answer_timeout *= 1000;

      // Via Host.
      if (this._configuration.contact_uri) {
        this._configuration.via_host = this._configuration.contact_uri.host;
      }

      // Contact URI.
      else {
          this._configuration.contact_uri = new URI('sip', Utils.createRandomToken(8), this._configuration.via_host, null, { transport: 'ws' });
        }

      this._contact = {
        pub_gruu: null,
        temp_gruu: null,
        uri: this._configuration.contact_uri,
        toString: function toString() {
          var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

          var anonymous = options.anonymous || null;
          var outbound = options.outbound || null;
          var contact = '<';

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

      // Seal the configuration.
      var writable_parameters = ['password', 'realm', 'ha1', 'display_name', 'register'];

      for (var parameter in this._configuration) {
        if (Object.prototype.hasOwnProperty.call(this._configuration, parameter)) {
          if (writable_parameters.indexOf(parameter) !== -1) {
            Object.defineProperty(this._configuration, parameter, {
              writable: true,
              configurable: false
            });
          } else {
            Object.defineProperty(this._configuration, parameter, {
              writable: false,
              configurable: false
            });
          }
        }
      }

      debug('configuration parameters after validation:');
      for (var _parameter in this._configuration) {
        // Only show the user user configurable parameters.
        if (Object.prototype.hasOwnProperty.call(config.settings, _parameter)) {
          switch (_parameter) {
            case 'uri':
            case 'registrar_server':
              debug('- ' + _parameter + ': ' + this._configuration[_parameter]);
              break;
            case 'password':
            case 'ha1':
              debug('- ' + _parameter + ': NOT SHOWN');
              break;
            default:
              debug('- ' + _parameter + ': ' + JSON.stringify(this._configuration[_parameter]));
          }
        }
      }

      return;
    }
  }, {
    key: 'C',
    get: function get() {
      return C;
    }
  }, {
    key: 'status',
    get: function get() {
      return this._status;
    }
  }, {
    key: 'contact',
    get: function get() {
      return this._contact;
    }
  }, {
    key: 'configuration',
    get: function get() {
      return this._configuration;
    }
  }, {
    key: 'transport',
    get: function get() {
      return this._transport;
    }
  }]);

  return UA;
}(EventEmitter);

/**
 * Transport event handlers
 */

// Transport connecting event.
function onTransportConnecting(data) {
  this.emit('connecting', data);
}

// Transport connected event.
function onTransportConnect(data) {
  if (this._status === C.STATUS_USER_CLOSED) {
    return;
  }

  this._status = C.STATUS_READY;
  this._error = null;

  this.emit('connected', data);

  if (this._dynConfiguration.register) {
    this._registrator.register();
  }
}

// Transport disconnected event.
function onTransportDisconnect(data) {
  // Run _onTransportError_ callback on every client transaction using _transport_.
  var client_transactions = ['nict', 'ict', 'nist', 'ist'];

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = client_transactions[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var type = _step.value;

      for (var id in this._transactions[type]) {
        if (Object.prototype.hasOwnProperty.call(this._transactions[type], id)) {
          this._transactions[type][id].onTransportError();
        }
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  this.emit('disconnected', data);

  // Call registrator _onTransportClosed_.
  this._registrator.onTransportClosed();

  if (this._status !== C.STATUS_USER_CLOSED) {
    this._status = C.STATUS_NOT_READY;
    this._error = C.NETWORK_ERROR;
  }
}

// Transport data event.
function onTransportData(data) {
  var transport = data.transport;
  var message = data.message;

  message = Parser.parseMessage(message, this);

  if (!message) {
    return;
  }

  if (this._status === C.STATUS_USER_CLOSED && message instanceof SIPMessage.IncomingRequest) {
    return;
  }

  // Do some sanity check.
  if (!sanityCheck(message, this, transport)) {
    return;
  }

  if (message instanceof SIPMessage.IncomingRequest) {
    message.transport = transport;
    this.receiveRequest(message);
  } else if (message instanceof SIPMessage.IncomingResponse) {
    /* Unike stated in 18.1.2, if a response does not match
    * any transaction, it is discarded here and no passed to the core
    * in order to be discarded there.
    */

    var transaction = void 0;

    switch (message.method) {
      case JsSIP_C.INVITE:
        transaction = this._transactions.ict[message.via_branch];
        if (transaction) {
          transaction.receiveResponse(message);
        }
        break;
      case JsSIP_C.ACK:
        // Just in case ;-).
        break;
      default:
        transaction = this._transactions.nict[message.via_branch];
        if (transaction) {
          transaction.receiveResponse(message);
        }
        break;
    }
  }
}
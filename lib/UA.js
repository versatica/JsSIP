const EventEmitter = require('events').EventEmitter;
const JsSIP_C = require('./Constants');
const Registrator = require('./Registrator');
const RTCSession = require('./RTCSession');
const Message = require('./Message');
const Transactions = require('./Transactions');
const Transport = require('./Transport');
const Utils = require('./Utils');
const Exceptions = require('./Exceptions');
const URI = require('./URI');
const Grammar = require('./Grammar');
const Parser = require('./Parser');
const SIPMessage = require('./SIPMessage');
const sanityCheck = require('./sanityCheck');
const config = require('./config');
const debug = require('debug')('JsSIP:UA');
const debugerror = require('debug')('JsSIP:ERROR:UA');

debugerror.log = console.warn.bind(console);

const C = {
  // UA status codes.
  STATUS_INIT        : 0,
  STATUS_READY       : 1,
  STATUS_USER_CLOSED : 2,
  STATUS_NOT_READY   : 3,

  // UA error codes.
  CONFIGURATION_ERROR : 1,
  NETWORK_ERROR       : 2
};

/**
 * The User-Agent class.
 * @class JsSIP.UA
 * @param {Object} configuration Configuration parameters.
 * @throws {JsSIP.Exceptions.ConfigurationError} If a configuration parameter is invalid.
 * @throws {TypeError} If no configuration is given.
 */
module.exports = class UA extends EventEmitter
{
  // Expose C object.
  static get C()
  {
    return C;
  }

  constructor(configuration)
  {
    debug('new() [configuration:%o]', configuration);

    super();

    this._cache = {
      credentials : {}
    };

    this._configuration = Object.assign({}, config.settings);
    this._dynConfiguration = {};
    this._dialogs = {};

    // User actions outside any session/dialog (MESSAGE).
    this._applicants = {};

    this._sessions = {};
    this._transport = null;
    this._contact = null;
    this._status = C.STATUS_INIT;
    this._error = null;
    this._transactions = {
      nist : {},
      nict : {},
      ist  : {},
      ict  : {}
    };

    // Custom UA empty object for high level use.
    this._data = {};

    this._closeTimer = null;

    // Check configuration argument.
    if (configuration === undefined)
    {
      throw new TypeError('Not enough arguments');
    }

    // Load configuration.
    try
    {
      this._loadConfig(configuration);
    }
    catch (e)
    {
      this._status = C.STATUS_NOT_READY;
      this._error = C.CONFIGURATION_ERROR;
      throw e;
    }

    // Initialize registrator.
    this._registrator = new Registrator(this);
  }

  get C()
  {
    return C;
  }

  get status()
  {
    return this._status;
  }

  get contact()
  {
    return this._contact;
  }

  get configuration()
  {
    return this._configuration;
  }

  get transport()
  {
    return this._transport;
  }

  // =================
  //  High Level API
  // =================

  /**
   * Connect to the server if status = STATUS_INIT.
   * Resume UA after being closed.
   */
  start()
  {
    debug('start()');

    if (this._status === C.STATUS_INIT)
    {
      this._transport.connect();
    }
    else if (this._status === C.STATUS_USER_CLOSED)
    {
      debug('restarting UA');

      // Disconnect.
      if (this._closeTimer !== null)
      {
        clearTimeout(this._closeTimer);
        this._closeTimer = null;
        this._transport.disconnect();
      }

      // Reconnect.
      this._status = C.STATUS_INIT;
      this._transport.connect();
    }
    else if (this._status === C.STATUS_READY)
    {
      debug('UA is in READY status, not restarted');
    }
    else
    {
      debug('ERROR: connection is down, Auto-Recovery system is trying to reconnect');
    }

    // Set dynamic configuration.
    this._dynConfiguration.register = this._configuration.register;
  }

  /**
   * Register.
   */
  register()
  {
    debug('register()');

    this._dynConfiguration.register = true;
    this._registrator.register();
  }

  /**
   * Unregister.
   */
  unregister(options)
  {
    debug('unregister()');

    this._dynConfiguration.register = false;
    this._registrator.unregister(options);
  }

  /**
   * Get the Registrator instance.
   */
  registrator()
  {
    return this._registrator;
  }

  /**
   * Registration state.
   */
  isRegistered()
  {
    if (this._registrator.registered)
    {
      return true;
    }
    else
    {
      return false;
    }
  }

  /**
   * Connection state.
   */
  isConnected()
  {
    return this._transport.isConnected();
  }

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
  call(target, options)
  {
    debug('call()');

    const session = new RTCSession(this);

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
  sendMessage(target, body, options)
  {
    debug('sendMessage()');

    const message = new Message(this);

    message.send(target, body, options);

    return message;
  }

  /**
   * Terminate ongoing sessions.
   */
  terminateSessions(options)
  {
    debug('terminateSessions()');

    for (const idx in this._sessions)
    {
      if (!this._sessions[idx].isEnded())
      {
        this._sessions[idx].terminate(options);
      }
    }
  }

  /**
   * Gracefully close.
   *
   */
  stop()
  {
    debug('stop()');

    // Remove dynamic settings.
    this._dynConfiguration = {};

    if (this._status === C.STATUS_USER_CLOSED)
    {
      debug('UA already closed');

      return;
    }

    // Close registrator.
    this._registrator.close();

    // If there are session wait a bit so CANCEL/BYE can be sent and their responses received.
    const num_sessions = Object.keys(this._sessions).length;

    // Run  _terminate_ on every Session.
    for (const session in this._sessions)
    {
      if (Object.prototype.hasOwnProperty.call(this._sessions, session))
      {
        debug(`closing session ${session}`);
        try { this._sessions[session].terminate(); }
        catch (error) {}
      }
    }

    // Run  _close_ on every applicant.
    for (const applicant in this._applicants)
    {
      if (Object.prototype.hasOwnProperty.call(this._applicants, applicant))
        try { this._applicants[applicant].close(); }
        catch (error) {}
    }

    this._status = C.STATUS_USER_CLOSED;

    const num_transactions =
      Object.keys(this._transactions.nict).length +
      Object.keys(this._transactions.nist).length +
      Object.keys(this._transactions.ict).length +
      Object.keys(this._transactions.ist).length;

    if (num_transactions === 0 && num_sessions === 0)
    {
      this._transport.disconnect();
    }
    else
    {
      this._closeTimer = setTimeout(() =>
      {
        this._closeTimer = null;
        this._transport.disconnect();
      }, 2000);
    }
  }

  /**
   * Normalice a string into a valid SIP request URI
   * -param {String} target
   * -returns {JsSIP.URI|undefined}
   */
  normalizeTarget(target)
  {
    return Utils.normalizeTarget(target, this._configuration.hostport_params);
  }

  /**
   * Allow retrieving configuration and autogenerated fields in runtime.
   */
  get(parameter)
  {
    switch (parameter)
    {
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
  set(parameter, value)
  {
    switch (parameter)
    {
      case 'password': {
        this._configuration.password = String(value);
        break;
      }

      case 'realm': {
        this._configuration.realm = String(value);
        break;
      }

      case 'ha1': {
        this._configuration.ha1 = String(value);
        // Delete the plain SIP password.
        this._configuration.password = null;
        break;
      }

      case 'display_name': {
        if (Grammar.parse(`"${value}"`, 'display_name') === -1)
        {
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
  newTransaction(transaction)
  {
    this._transactions[transaction.type][transaction.id] = transaction;
    this.emit('newTransaction', {
      transaction
    });
  }

  /**
   * Transaction destroyed.
   */
  destroyTransaction(transaction)
  {
    delete this._transactions[transaction.type][transaction.id];
    this.emit('transactionDestroyed', {
      transaction
    });
  }

  /**
   * new Dialog
   */
  newDialog(dialog)
  {
    this._dialogs[dialog.id] = dialog;
  }

  /**
   * Dialog destroyed.
   */
  destroyDialog(dialog)
  {
    delete this._dialogs[dialog.id];
  }

  /**
   *  new Message
   */
  newMessage(data)
  {
    this.emit('newMessage', data);
  }

  /**
   * new RTCSession
   */
  newRTCSession(data)
  {
    this.emit('newRTCSession', data);
  }

  /**
   * Registered
   */
  registered(data)
  {
    this.emit('registered', data);
  }

  /**
   * Unregistered
   */
  unregistered(data)
  {
    this.emit('unregistered', data);
  }

  /**
   * Registration Failed
   */
  registrationFailed(data)
  {
    this.emit('registrationFailed', data);
  }

  // =========================
  // ReceiveRequest.
  // =========================

  /**
   * Request reception
   */
  receiveRequest(request)
  {
    const method = request.method;

    // Check that request URI points to us.
    if (request.ruri.user !== this._configuration.uri.user &&
        request.ruri.user !== this._contact.uri.user)
    {
      debug('Request-URI does not point to us');
      if (request.method !== JsSIP_C.ACK)
      {
        request.reply_sl(404);
      }

      return;
    }

    // Check request URI scheme.
    if (request.ruri.scheme === JsSIP_C.SIPS)
    {
      request.reply_sl(416);

      return;
    }

    // Check transaction.
    if (Transactions.checkTransaction(this, request))
    {
      return;
    }

    // Create the server transaction.
    if (method === JsSIP_C.INVITE)
    {
      /* eslint-disable no-new */
      new Transactions.InviteServerTransaction(this, this._transport, request);
      /* eslint-enable no-new */
    }
    else if (method !== JsSIP_C.ACK && method !== JsSIP_C.CANCEL)
    {
      /* eslint-disable no-new */
      new Transactions.NonInviteServerTransaction(this, this._transport, request);
      /* eslint-enable no-new */
    }

    /* RFC3261 12.2.2
     * Requests that do not change in any way the state of a dialog may be
     * received within a dialog (for example, an OPTIONS request).
     * They are processed as if they had been received outside the dialog.
     */
    if (method === JsSIP_C.OPTIONS)
    {
      request.reply(200);
    }
    else if (method === JsSIP_C.MESSAGE)
    {
      if (this.listeners('newMessage').length === 0)
      {
        request.reply(405);

        return;
      }
      const message = new Message(this);

      message.init_incoming(request);
    }
    else if (method === JsSIP_C.INVITE)
    {
      // Initial INVITE.
      if (!request.to_tag && this.listeners('newRTCSession').length === 0)
      {
        request.reply(405);

        return;
      }
    }

    let dialog;
    let session;

    // Initial Request.
    if (!request.to_tag)
    {
      switch (method)
      {
        case JsSIP_C.INVITE:
          if (window.RTCPeerConnection)
          { // TODO
            if (request.hasHeader('replaces'))
            {
              const replaces = request.replaces;

              dialog = this._findDialog(
                replaces.call_id, replaces.from_tag, replaces.to_tag);
              if (dialog)
              {
                session = dialog.owner;
                if (!session.isEnded())
                {
                  session.receiveRequest(request);
                }
                else
                {
                  request.reply(603);
                }
              }
              else
              {
                request.reply(481);
              }
            }
            else
            {
              session = new RTCSession(this);
              session.init_incoming(request);
            }
          }
          else
          {
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
          if (session)
          {
            session.receiveRequest(request);
          }
          else
          {
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
    else
    {
      dialog = this._findDialog(request.call_id, request.from_tag, request.to_tag);

      if (dialog)
      {
        dialog.receiveRequest(request);
      }
      else if (method === JsSIP_C.NOTIFY)
      {
        session = this._findSession(request);
        if (session)
        {
          session.receiveRequest(request);
        }
        else
        {
          debug('received NOTIFY request for a non existent subscription');
          request.reply(481, 'Subscription does not exist');
        }
      }

      /* RFC3261 12.2.2
       * Request with to tag, but no matching dialog found.
       * Exception: ACK for an Invite request for which a dialog has not
       * been created.
       */
      else
      if (method !== JsSIP_C.ACK)
      {
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
  _findSession({ call_id, from_tag, to_tag })
  {
    const sessionIDa = call_id + from_tag;
    const sessionA = this._sessions[sessionIDa];
    const sessionIDb = call_id + to_tag;
    const sessionB = this._sessions[sessionIDb];

    if (sessionA)
    {
      return sessionA;
    }
    else if (sessionB)
    {
      return sessionB;
    }
    else
    {
      return null;
    }
  }

  /**
   * Get the dialog to which the request belongs to, if any.
   */
  _findDialog(call_id, from_tag, to_tag)
  {
    let id = call_id + from_tag + to_tag;
    let dialog = this._dialogs[id];

    if (dialog)
    {
      return dialog;
    }
    else
    {
      id = call_id + to_tag + from_tag;
      dialog = this._dialogs[id];
      if (dialog)
      {
        return dialog;
      }
      else
      {
        return null;
      }
    }
  }

  _loadConfig(configuration)
  {
    // Pre-Configuration.

    // Check Mandatory parameters.
    for (const parameter in config.check.mandatory)
    {
      if (!configuration.hasOwnProperty(parameter))
      {
        throw new Exceptions.ConfigurationError(parameter);
      }
      else
      {
        const value = configuration[parameter];
        const checked_value = config.check.mandatory[parameter](value);

        if (checked_value !== undefined)
        {
          this._configuration[parameter] = checked_value;
        }
        else
        {
          throw new Exceptions.ConfigurationError(parameter, value);
        }
      }
    }

    // Check Optional parameters.
    for (const parameter in config.check.optional)
    {
      if (configuration.hasOwnProperty(parameter))
      {
        const value = configuration[parameter];

        /* If the parameter value is null, empty string, undefined, empty array
         * or it's a number with NaN value, then apply its default value.
         */
        if (Utils.isEmpty(value))
        {
          continue;
        }

        const checked_value = config.check.optional[parameter](value);

        if (checked_value !== undefined)
        {
          this._configuration[parameter] = checked_value;
        }
        else
        {
          throw new Exceptions.ConfigurationError(parameter, value);
        }
      }
    }

    // Post Configuration Process.

    // Allow passing 0 number as display_name.
    if (this._configuration.display_name === 0)
    {
      this._configuration.display_name = '0';
    }

    // Instance-id for GRUU.
    if (!this._configuration.instance_id)
    {
      this._configuration.instance_id = Utils.newUUID();
    }

    // Jssip_id instance parameter. Static random tag of length 5.
    this._configuration.jssip_id = Utils.createRandomToken(5);

    // String containing this._configuration.uri without scheme and user.
    const hostport_params = this._configuration.uri.clone();

    hostport_params.user = null;
    this._configuration.hostport_params = hostport_params.toString().replace(/^sip:/i, '');

    // Transport.
    try
    {
      this._transport = new Transport(this._configuration.sockets, {
        // Recovery options.
        max_interval : this._configuration.connection_recovery_max_interval,
        min_interval : this._configuration.connection_recovery_min_interval
      });

      // Transport event callbacks.
      this._transport.onconnecting = onTransportConnecting.bind(this);
      this._transport.onconnect = onTransportConnect.bind(this);
      this._transport.ondisconnect = onTransportDisconnect.bind(this);
      this._transport.ondata = onTransportData.bind(this);
    }
    catch (e)
    {
      debugerror(e);
      throw new Exceptions.ConfigurationError('sockets', this._configuration.sockets);
    }

    // Remove sockets instance from configuration object.
    delete this._configuration.sockets;

    // Check whether authorization_user is explicitly defined.
    // Take 'this._configuration.uri.user' value if not.
    if (!this._configuration.authorization_user)
    {
      this._configuration.authorization_user = this._configuration.uri.user;
    }

    // If no 'registrar_server' is set use the 'uri' value without user portion and
    // without URI params/headers.
    if (!this._configuration.registrar_server)
    {
      const registrar_server = this._configuration.uri.clone();

      registrar_server.user = null;
      registrar_server.clearParams();
      registrar_server.clearHeaders();
      this._configuration.registrar_server = registrar_server;
    }

    // User no_answer_timeout.
    this._configuration.no_answer_timeout *= 1000;

    // Via Host.
    if (this._configuration.contact_uri)
    {
      this._configuration.via_host = this._configuration.contact_uri.host;
    }

    // Contact URI.
    else
    {
      this._configuration.contact_uri = new URI('sip', Utils.createRandomToken(8), this._configuration.via_host, null, { transport: 'ws' });
    }

    this._contact = {
      pub_gruu  : null,
      temp_gruu : null,
      uri       : this._configuration.contact_uri,
      toString(options = {})
      {
        const anonymous = options.anonymous || null;
        const outbound = options.outbound || null;
        let contact = '<';

        if (anonymous)
        {
          contact += this.temp_gruu || 'sip:anonymous@anonymous.invalid;transport=ws';
        }
        else
        {
          contact += this.pub_gruu || this.uri.toString();
        }

        if (outbound && (anonymous ? !this.temp_gruu : !this.pub_gruu))
        {
          contact += ';ob';
        }

        contact += '>';

        return contact;
      }
    };

    // Seal the configuration.
    const writable_parameters = [
      'password', 'realm', 'ha1', 'display_name', 'register'
    ];

    for (const parameter in this._configuration)
    {
      if (Object.prototype.hasOwnProperty.call(this._configuration, parameter))
      {
        if (writable_parameters.indexOf(parameter))
        {
          Object.defineProperty(this._configuration, parameter, {
            writable     : true,
            configurable : false
          });
        }
        else
        {
          Object.defineProperty(this._configuration, parameter, {
            writable     : false,
            configurable : false
          });
        }
      }
    }

    debug('configuration parameters after validation:');
    for (const parameter in this._configuration)
    {
      // Only show the user user configurable parameters.
      if (Object.prototype.hasOwnProperty.call(config.settings, parameter))
      {
        switch (parameter)
        {
          case 'uri':
          case 'registrar_server':
            debug(`- ${parameter}: ${this._configuration[parameter]}`);
            break;
          case 'password':
          case 'ha1':
            debug(`- ${parameter}: NOT SHOWN`);
            break;
          default:
            debug(`- ${parameter}: ${JSON.stringify(this._configuration[parameter])}`);
        }
      }
    }

    return;
  }
};

/**
 * Transport event handlers
 */

// Transport connecting event.
function onTransportConnecting(data)
{
  this.emit('connecting', data);
}

// Transport connected event.
function onTransportConnect(data)
{
  if (this._status === C.STATUS_USER_CLOSED)
  {
    return;
  }

  this._status = C.STATUS_READY;
  this._error = null;

  this.emit('connected', data);

  if (this._dynConfiguration.register)
  {
    this._registrator.register();
  }
}

// Transport disconnected event.
function onTransportDisconnect(data)
{
  // Run _onTransportError_ callback on every client transaction using _transport_.
  const client_transactions = [ 'nict', 'ict', 'nist', 'ist' ];

  for (const type of client_transactions)
  {
    for (const id in this._transactions[type])
    {
      if (Object.prototype.hasOwnProperty.call(this._transactions[type], id))
      {
        this._transactions[type][id].onTransportError();
      }
    }
  }

  this.emit('disconnected', data);

  // Call registrator _onTransportClosed_.
  this._registrator.onTransportClosed();

  if (this._status !== C.STATUS_USER_CLOSED)
  {
    this._status = C.STATUS_NOT_READY;
    this._error = C.NETWORK_ERROR;
  }
}

// Transport data event.
function onTransportData(data)
{
  const transport = data.transport;
  let message = data.message;

  message = Parser.parseMessage(message, this);

  if (! message)
  {
    return;
  }

  if (this._status === C.STATUS_USER_CLOSED &&
      message instanceof SIPMessage.IncomingRequest)
  {
    return;
  }

  // Do some sanity check.
  if (! sanityCheck(message, this, transport))
  {
    return;
  }

  if (message instanceof SIPMessage.IncomingRequest)
  {
    message.transport = transport;
    this.receiveRequest(message);
  }
  else if (message instanceof SIPMessage.IncomingResponse)
  {
    /* Unike stated in 18.1.2, if a response does not match
    * any transaction, it is discarded here and no passed to the core
    * in order to be discarded there.
    */

    let transaction;

    switch (message.method)
    {
      case JsSIP_C.INVITE:
        transaction = this._transactions.ict[message.via_branch];
        if (transaction)
        {
          transaction.receiveResponse(message);
        }
        break;
      case JsSIP_C.ACK:
        // Just in case ;-).
        break;
      default:
        transaction = this._transactions.nict[message.via_branch];
        if (transaction)
        {
          transaction.receiveResponse(message);
        }
        break;
    }
  }
}

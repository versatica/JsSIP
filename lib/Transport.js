const Logger = require('./Logger');
const Socket = require('./Socket');
const JsSIP_C = require('./Constants');

const logger = new Logger('Transport');

/**
 * Constants
 */
const C = {
  // Transport status.
  STATUS_CONNECTED    : 0,
  STATUS_CONNECTING   : 1,
  STATUS_DISCONNECTED : 2,

  // Socket status.
  SOCKET_STATUS_READY : 0,
  SOCKET_STATUS_ERROR : 1,

  // Recovery options.
  recovery_options : {
    // minimum interval in seconds between recover attempts.
    min_interval : JsSIP_C.CONNECTION_RECOVERY_MIN_INTERVAL,
    // maximum interval in seconds between recover attempts.
    max_interval : JsSIP_C.CONNECTION_RECOVERY_MAX_INTERVAL
  }
};

/*
 * Manages one or multiple JsSIP.Socket instances.
 * Is reponsible for transport recovery logic among all socket instances.
 *
 * @socket JsSIP::Socket instance
 */
module.exports = class Transport
{
  constructor(sockets, recovery_options = C.recovery_options)
  {
    logger.debug('new()');

    this.status = C.STATUS_DISCONNECTED;

    // Current socket.
    this.socket = null;

    // Socket collection.
    this.sockets = [];

    this.recovery_options = recovery_options;
    this.recover_attempts = 0;
    this.recovery_timer = null;

    this.close_requested = false;

    // It seems that TextDecoder is not available in some versions of React-Native.
    // See https://github.com/versatica/JsSIP/issues/695
    try
    {
      this.textDecoder = new TextDecoder('utf8');
    }
    catch (error)
    {
      logger.warn(`cannot use TextDecoder: ${error}`);
    }

    if (typeof sockets === 'undefined')
    {
      throw new TypeError('Invalid argument.' +
                          ' undefined \'sockets\' argument');
    }

    if (!(sockets instanceof Array))
    {
      sockets = [ sockets ];
    }

    sockets.forEach(function(socket)
    {
      if (!Socket.isSocket(socket.socket))
      {
        throw new TypeError('Invalid argument.' +
                            ' invalid \'JsSIP.Socket\' instance');
      }

      if (socket.weight && !Number(socket.weight))
      {
        throw new TypeError('Invalid argument.' +
                            ' \'weight\' attribute is not a number');
      }

      this.sockets.push({
        socket : socket.socket,
        weight : socket.weight || 0,
        status : C.SOCKET_STATUS_READY
      });
    }, this);

    // Get the socket with higher weight.
    this._getSocket();
  }

  /**
   * Instance Methods
   */

  get via_transport()
  {
    return this.socket.via_transport;
  }

  get url()
  {
    return this.socket.url;
  }

  get sip_uri()
  {
    return this.socket.sip_uri;
  }

  connect()
  {
    logger.debug('connect()');

    if (this.isConnected())
    {
      logger.debug('Transport is already connected');

      return;
    }
    else if (this.isConnecting())
    {
      logger.debug('Transport is connecting');

      return;
    }

    this.close_requested = false;
    this.status = C.STATUS_CONNECTING;
    this.onconnecting({ socket: this.socket, attempts: this.recover_attempts });

    if (!this.close_requested)
    {
      // Bind socket event callbacks.
      this.socket.onconnect = this._onConnect.bind(this);
      this.socket.ondisconnect = this._onDisconnect.bind(this);
      this.socket.ondata = this._onData.bind(this);

      this.socket.connect();
    }

    return;
  }

  disconnect()
  {
    logger.debug('close()');

    this.close_requested = true;
    this.recover_attempts = 0;
    this.status = C.STATUS_DISCONNECTED;

    // Clear recovery_timer.
    if (this.recovery_timer !== null)
    {
      clearTimeout(this.recovery_timer);
      this.recovery_timer = null;
    }

    // Unbind socket event callbacks.
    this.socket.onconnect = () => {};
    this.socket.ondisconnect = () => {};
    this.socket.ondata = () => {};

    this.socket.disconnect();
    this.ondisconnect({
      socket : this.socket,
      error  : false
    });
  }

  send(data)
  {
    logger.debug('send()');

    if (!this.isConnected())
    {
      logger.warn('unable to send message, transport is not connected');

      return false;
    }

    const message = data.toString();

    logger.debug(`sending message:\n\n${message}\n`);

    return this.socket.send(message);
  }

  isConnected()
  {
    return this.status === C.STATUS_CONNECTED;
  }

  isConnecting()
  {
    return this.status === C.STATUS_CONNECTING;
  }

  /**
   * Private API.
   */

  _reconnect()
  {
    this.recover_attempts+=1;

    let k = Math.floor((Math.random() * Math.pow(2, this.recover_attempts)) +1);

    if (k < this.recovery_options.min_interval)
    {
      k = this.recovery_options.min_interval;
    }

    else if (k > this.recovery_options.max_interval)
    {
      k = this.recovery_options.max_interval;
    }

    logger.debug(`reconnection attempt: ${this.recover_attempts}. next connection attempt in ${k} seconds`);

    this.recovery_timer = setTimeout(() =>
    {
      if (!this.close_requested && !(this.isConnected() || this.isConnecting()))
      {
        // Get the next available socket with higher weight.
        this._getSocket();

        // Connect the socket.
        this.connect();
      }
    }, k * 1000);
  }

  /**
   * get the next available socket with higher weight
   */
  _getSocket()
  {

    let candidates = [];

    this.sockets.forEach((socket) =>
    {
      if (socket.status === C.SOCKET_STATUS_ERROR)
      {
        return; // continue the array iteration
      }
      else if (candidates.length === 0)
      {
        candidates.push(socket);
      }
      else if (socket.weight > candidates[0].weight)
      {
        candidates = [ socket ];
      }
      else if (socket.weight === candidates[0].weight)
      {
        candidates.push(socket);
      }
    });

    if (candidates.length === 0)
    {
      // All sockets have failed. reset sockets status.
      this.sockets.forEach((socket) =>
      {
        socket.status = C.SOCKET_STATUS_READY;
      });

      // Get next available socket.
      this._getSocket();

      return;
    }

    const idx = Math.floor((Math.random()* candidates.length));

    this.socket = candidates[idx].socket;
  }

  /**
   * Socket Event Handlers
   */

  _onConnect()
  {
    this.recover_attempts = 0;
    this.status = C.STATUS_CONNECTED;

    // Clear recovery_timer.
    if (this.recovery_timer !== null)
    {
      clearTimeout(this.recovery_timer);
      this.recovery_timer = null;
    }

    this.onconnect({ socket: this });
  }

  _onDisconnect(error, code, reason)
  {
    this.status = C.STATUS_DISCONNECTED;
    this.ondisconnect({
      socket : this.socket,
      error,
      code,
      reason
    });

    if (this.close_requested)
    {
      return;
    }

    // Update socket status.
    else
    {
      this.sockets.forEach(function(socket)
      {
        if (this.socket === socket.socket)
        {
          socket.status = C.SOCKET_STATUS_ERROR;
        }
      }, this);
    }

    this._reconnect(error);
  }

  _onData(data)
  {
    // CRLF Keep Alive request from server, reply.
    if (data === '\r\n\r\n')
    {
      logger.debug('received message with double-CRLF Keep Alive request');

      try
      {
        // Reply with single CRLF.
        this.socket.send('\r\n');
      }
      catch (error)
      {
        logger.warn(`error sending Keep Alive response: ${error}`);
      }

      return;
    }

    // CRLF Keep Alive response from server, ignore it.
    if (data === '\r\n')
    {
      logger.debug('received message with CRLF Keep Alive response');

      return;
    }

    // Binary message.
    else if (typeof data !== 'string')
    {
      try
      {
        if (this.textDecoder)
          data = this.textDecoder.decode(data);
        else
          data = String.fromCharCode.apply(null, new Uint8Array(data));
      }
      catch (evt)
      {
        logger.debug('received binary message failed to be converted into string,' +
              ' message discarded');

        return;
      }

      logger.debug(`received binary message:\n\n${data}\n`);
    }

    // Text message.
    else
    {
      logger.debug(`received text message:\n\n${data}\n`);
    }

    this.ondata({ transport: this, message: data });
  }
};

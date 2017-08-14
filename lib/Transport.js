'use strict';

/**
 * Dependencies.
 */
const Socket = require('./Socket');
const debug = require('debug')('JsSIP:Transport');
const debugerror = require('debug')('JsSIP:ERROR:Transport');

/**
 * Constants
 */
const C = {
  // Transport status
  STATUS_CONNECTED:           0,
  STATUS_CONNECTING:          1,
  STATUS_DISCONNECTED:        2,

  // Socket status
  SOCKET_STATUS_READY:        0,
  SOCKET_STATUS_ERROR:        1,

  // Recovery options
  recovery_options: {
    min_interval: 2, // minimum interval in seconds between recover attempts
    max_interval: 30 // maximum interval in seconds between recover attempts
  }
};

/*
 * Manages one or multiple JsSIP.Socket instances.
 * Is reponsible for transport recovery logic among all socket instances.
 *
 * @socket JsSIP::Socket instance
 */

class Transport {
  constructor(sockets, recovery_options = C.recovery_options) {
    debug('new()');

    this.status = C.STATUS_DISCONNECTED;

    // current socket
    this.socket = null;

    // socket collection
    this.sockets = [];

    this.recovery_options = recovery_options;
    this.recover_attempts = 0;
    this.recovery_timer = null;

    this.close_requested = false;

    if (typeof sockets === 'undefined') {
      throw new TypeError('Invalid argument.' +
                          ' undefined \'sockets\' argument');
    }

    if (!(sockets instanceof Array)) {
      sockets = [ sockets ];
    }

    sockets.forEach(function(socket) {
      if (!Socket.isSocket(socket.socket)) {
        throw new TypeError('Invalid argument.' +
                            ' invalid \'JsSIP.Socket\' instance');
      }

      if (socket.weight && !Number(socket.weight)) {
        throw new TypeError('Invalid argument.' +
                            ' \'weight\' attribute is not a number');
      }

      this.sockets.push({
        socket: socket.socket,
        weight: socket.weight || 0,
        status: C.SOCKET_STATUS_READY
      });
    }, this);

    // read only properties
    Object.defineProperties(this, {
      via_transport:   { get() { return this.socket.via_transport; } },
      url:      { get() { return this.socket.url;       } },
      sip_uri:  { get() { return this.socket.sip_uri;   } }
    });

    // get the socket with higher weight
    getSocket.call(this);
  }

  /**
   * Instance Methods
   */

  connect() {
    debug('connect()');

    if (this.isConnected()) {
      debug('Transport is already connected');
      return;
    } else if (this.isConnecting()) {
      debug('Transport is connecting');
      return;
    }

    this.close_requested = false;
    this.status = C.STATUS_CONNECTING;
    this.onconnecting({ socket:this.socket, attempts:this.recover_attempts });

    if (!this.close_requested) {
      // bind socket event callbacks
      this.socket.onconnect     = onConnect.bind(this);
      this.socket.ondisconnect  = onDisconnect.bind(this);
      this.socket.ondata        = onData.bind(this);

      this.socket.connect();
    }

    return;
  }

  disconnect() {
    debug('close()');

    this.close_requested = true;
    this.recover_attempts = 0;
    this.status = C.STATUS_DISCONNECTED;

    // clear recovery_timer
    if (this.recovery_timer !== null) {
      clearTimeout(this.recovery_timer);
      this.recovery_timer = null;
    }

    // unbind socket event callbacks
    this.socket.onconnect     = () => {};
    this.socket.ondisconnect  = () => {};
    this.socket.ondata        = () => {};

    this.socket.disconnect();
    this.ondisconnect();
  }

  send(data) {
    debug('send()');

    if (!this.isConnected()) {
      debugerror('unable to send message, transport is not connected');
      return false;
    }

    const message = data.toString();

    debug(`sending message:\n\n${message}\n`);
    return this.socket.send(message);
  }

  isConnected() {
    return this.status === C.STATUS_CONNECTED;
  }

  isConnecting() {
    return this.status === C.STATUS_CONNECTING;
  }
}

/**
 * Socket Event Handlers
 */

function onConnect() {
  this.recover_attempts = 0;
  this.status = C.STATUS_CONNECTED;

  // clear recovery_timer
  if (this.recovery_timer !== null) {
    clearTimeout(this.recovery_timer);
    this.recovery_timer = null;
  }

  this.onconnect( {socket:this} );
}

function onDisconnect(error, code, reason) {
  this.status = C.STATUS_DISCONNECTED;
  this.ondisconnect({ socket:this.socket, error:error, code:code, reason:reason });

  if (this.close_requested) {
    return;
  }

  // update socket status
  else {
    this.sockets.forEach(function(socket) {
      if (this.socket === socket.socket) {
        socket.status = C.SOCKET_STATUS_ERROR;
      }
    }, this);
  }

  reconnect.call(this, error);
}

function onData(data) {
  // CRLF Keep Alive response from server. Ignore it.
  if(data === '\r\n') {
    debug('received message with CRLF Keep Alive response');
    return;
  }

  // binary message.
  else if (typeof data !== 'string') {
    try {
      data = String.fromCharCode.apply(null, new Uint8Array(data));
    } catch(evt) {
      debug('received binary message failed to be converted into string,' +
            ' message discarded');
      return;
    }

    debug(`received binary message:\n\n${data}\n`);
  }

  // text message.
  else {
    debug(`received text message:\n\n${data}\n`);
  }

  this.ondata({ transport:this, message:data });
}

function reconnect() {
  let k;

  this.recover_attempts+=1;

  k = Math.floor((Math.random() * Math.pow(2,this.recover_attempts)) +1);

  if (k < this.recovery_options.min_interval) {
    k = this.recovery_options.min_interval;
  }

  else if (k > this.recovery_options.max_interval) {
    k = this.recovery_options.max_interval;
  }

  debug(`reconnection attempt: ${this.recover_attempts}. next connection attempt in ${k} seconds`);

  this.recovery_timer = setTimeout(() => {
    if (!this.close_requested && !(this.isConnected() || this.isConnecting())) {
      // get the next available socket with higher weight
      getSocket.call(this);

      // connect the socket
      this.connect();
    }
  }, k * 1000);
}

/**
 * get the next available socket with higher weight
 */
function getSocket() {

  let candidates = [];

  this.sockets.forEach(socket => {
    if (socket.status === C.SOCKET_STATUS_ERROR) {
      return; // continue the array iteration
    } else if (candidates.length === 0) {
      candidates.push(socket);
    } else if (socket.weight > candidates[0].weight) {
      candidates = [socket];
    } else if (socket.weight === candidates[0].weight) {
      candidates.push(socket);
    }
  });

  if (candidates.length === 0) {
    // all sockets have failed. reset sockets status
    this.sockets.forEach(socket => {
      socket.status = C.SOCKET_STATUS_READY;
    });

    // get next available socket
    getSocket.call(this);
    return;
  }

  const idx = Math.floor((Math.random()* candidates.length));
  this.socket = candidates[idx].socket;
}

module.exports = Transport;

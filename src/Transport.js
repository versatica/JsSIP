
/*global WebSocket: false*/

/**
 * @fileoverview Transport
 */

/**
 * @augments JsSIP
 * @class Transport
 * @param {JsSIP.UA} ua
 * @param {Object} server ws_server Object
 */

JsSIP.Transport = function(ua, server) {
  this.ua = ua;
  this.ws = null;
  this.server = server;
  this.reconnection_attempts = 0;
  this.closed = false;
  this.connected = false;
  this.reconnectTimer = null;
  this.lastTransportError = {};

  this.ua.transport = this;

  // Connect
  this.connect();
};

JsSIP.Transport.prototype = {
  /**
   * Send a message.
   * @param {JsSIP.OutgoingRequest|String} msg
   * @returns {Boolean}
   */
  send: function(msg) {
    var message = msg.toString();

    if(this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (this.ua.configuration.trace_sip === true) {
        console.log(JsSIP.C.LOG_TRANSPORT +'sending WebSocket message:\n\n' + message + '\n');
      }
      this.ws.send(message);
      return true;
    } else {
      console.warn(JsSIP.C.LOG_TRANSPORT +'unable to send message, WebSocket is not open');
      return false;
    }
  },

  /**
  * Disconnect socket.
  */
  disconnect: function() {
    if(this.ws) {
      this.closed = true;
      console.log(JsSIP.C.LOG_TRANSPORT +'closing WebSocket ' + this.server.ws_uri);
      this.ws.close();
    }
  },

  /**
  * Connect socket.
  */
  connect: function() {
    var transport = this;

    if(this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      console.log(JsSIP.C.LOG_TRANSPORT +'WebSocket ' + this.server.ws_uri + ' is already connected');
      return false;
    }

    if(this.ws) {
      this.ws.close();
    }

    console.log(JsSIP.C.LOG_TRANSPORT +'connecting to WebSocket ' + this.server.ws_uri);

    try {
      this.ws = new WebSocket(this.server.ws_uri, 'sip');
    } catch(e) {
      console.warn(JsSIP.C.LOG_TRANSPORT +'error connecting to WebSocket ' + this.server.ws_uri);
      console.warn(e);
    }

    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = function() {
      transport.onOpen();
    };

    this.ws.onclose = function(e) {
      transport.onClose(e);
    };

    this.ws.onmessage = function(e) {
      transport.onMessage(e);
    };

    this.ws.onerror = function(e) {
      transport.onError(e);
    };
  },

  // Transport Event Handlers

  /**
  * @event
  * @param {event} e
  */
  onOpen: function() {
    this.connected = true;

    console.log(JsSIP.C.LOG_TRANSPORT +'WebSocket ' + this.server.ws_uri + ' connected');
    // Clear reconnectTimer since we are not disconnected
    window.clearTimeout(this.reconnectTimer);
    // Disable closed
    this.closed = false;
    // Trigger onTransportConnected callback
    this.ua.onTransportConnected(this);
  },

  /**
  * @event
  * @param {event} e
  */
  onClose: function(e) {
    var connected_before = this.connected;

    this.connected = false;
    this.lastTransportError.code = e.code;
    this.lastTransportError.reason = e.reason;
    console.warn(JsSIP.C.LOG_TRANSPORT +'WebSocket disconnected (code: ' + e.code + (e.reason? ', reason: ' + e.reason : '') +')');

    if(e.wasClean === false) {
      console.warn(JsSIP.C.LOG_TRANSPORT +'WebSocket abrupt disconnection');
    }
    // Transport was connected
    if(connected_before === true) {
      this.ua.onTransportClosed(this);
      // Check whether the user requested to close.
      if(!this.closed) {
        // Reset reconnection_attempts
        this.reconnection_attempts = 0;
        this.reConnect();
      } else {
        this.ua.emit('disconnected', this.ua, {
          transport: this,
          code: this.lastTransportError.code,
          reason: this.lastTransportError.reason
        });
      }
    } else {
      // This is the first connection attempt
      //Network error
      this.ua.onTransportError(this);
    }
  },

  /**
  * @event
  * @param {event} e
  */
  onMessage: function(e) {
    var message, transaction,
      data = e.data;

    // CRLF Keep Alive response from server. Ignore it.
    if(data === '\r\n') {
      if (this.ua.configuration.trace_sip === true) {
        console.log(JsSIP.C.LOG_TRANSPORT +'received WebSocket message with CRLF Keep Alive response');
      }
      return;
    }

    // WebSocket binary message.
    else if (typeof data !== 'string') {
      try {
        data = String.fromCharCode.apply(null, new Uint8Array(data));
      } catch(evt) {
        console.warn(JsSIP.C.LOG_TRANSPORT +'received WebSocket binary message failed to be converted into string, message discarded');
        return;
      }

      if (this.ua.configuration.trace_sip === true) {
        console.log(JsSIP.C.LOG_TRANSPORT +'received WebSocket binary message:\n\n' + data + '\n');
      }
    }

    // WebSocket text message.
    else {
      if (this.ua.configuration.trace_sip === true) {
        console.log(JsSIP.C.LOG_TRANSPORT +'received WebSocket text message:\n\n' + data + '\n');
      }
    }

    message = JsSIP.Parser.parseMessage(data);

    if(this.ua.status === JsSIP.C.UA_STATUS_USER_CLOSED && message instanceof JsSIP.IncomingRequest) {
      return;
    }

    // Do some sanity check
    if(message && JsSIP.sanityCheck(message, this.ua, this)) {
      if(message instanceof JsSIP.IncomingRequest) {
        message.transport = this;
        this.ua.receiveRequest(message);
      } else if(message instanceof JsSIP.IncomingResponse) {
        /* Unike stated in 18.1.2, if a response does not match
        * any transaction, it is discarded here and no passed to the core
        * in order to be discarded there.
        */
        switch(message.method) {
          case JsSIP.C.INVITE:
            transaction = this.ua.transactions.ict[message.via_branch];
            if(transaction) {
              transaction.receiveResponse(message);
            }
            break;
          case JsSIP.C.ACK:
            // Just in case ;-)
            break;
          default:
            transaction = this.ua.transactions.nict[message.via_branch];
            if(transaction) {
              transaction.receiveResponse(message);
            }
            break;
        }
      }
    }
  },

  /**
  * @event
  * @param {event} e
  */
  onError: function(e) {
    console.warn(JsSIP.C.LOG_TRANSPORT +'WebSocket connection error');
    console.warn(e);
  },

  /**
  * Reconnection attempt logic.
  * @private
  */
  reConnect: function() {
    var transport = this;

    this.reconnection_attempts += 1;

    if(this.reconnection_attempts > this.ua.configuration.ws_server_max_reconnection) {
      console.warn(JsSIP.C.LOG_TRANSPORT +'maximum reconnection attempts for WebSocket ' + this.server.ws_uri);
      this.ua.onTransportError(this);
    } else {
      console.log(JsSIP.C.LOG_TRANSPORT +'trying to reconnect to WebSocket ' + this.server.ws_uri + ' (reconnection attempt ' + this.reconnection_attempts + ')');

      this.reconnectTimer = window.setTimeout(function() {
        transport.connect();}, this.ua.configuration.ws_server_reconnection_timeout * 1000);
    }
  }
};
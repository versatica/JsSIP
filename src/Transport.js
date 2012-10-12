
/*global WebSocket: false*/

/**
 * @fileoverview Transport
 */

/**
 * @augments JsSIP
 * @class Transport
 * @param {JsSIP.UA} ua
 * @param {Object} server outbound_proxy_set Object
 */

JsSIP.Transport = function(ua, server) {
  this.ua = ua;
  this.ws = null;
  this.server = server;
  this.reconnection_attempts = 0;
  this.closed = false;
  this.connected = false;
  this.reconnectTimer = null;

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
    if(this.ws && this.ws.readyState === WebSocket.OPEN) {
      var message = msg.toString();
      console.info(JsSIP.c.LOG_TRANSPORT +'Sending WebSocket message: \n\n' + message + '\n');
      this.ws.send(message);
      return true;
    } else {
      console.info(JsSIP.c.LOG_TRANSPORT +'Unable to send message. WebSocket is not open\n\n');
      return false;
    }
  },

  /**
  * Disconnect socket.
  */
  disconnect: function() {
    if(this.ws) {
      this.closed = true;
      console.log(JsSIP.c.LOG_TRANSPORT +'closing WebSocket connection ' + this.server.ws_uri);
      this.ws.close();
    }
  },

  /**
  * Connect socket.
  */
  connect: function() {
    var transport = this;

    if(this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      console.log(JsSIP.c.LOG_TRANSPORT +'WebSocket ' + this.server.ws_uri + ' is already connected');
      return false;
    }

    if(this.ws) {
      this.ws.close();
    }

    console.log(JsSIP.c.LOG_TRANSPORT +'Connecting to WebSocket URI ' + this.server.ws_uri);

    try {
      this.ws = new WebSocket(this.server.ws_uri, 'sip');
    } catch(e) {
      console.log(JsSIP.c.LOG_TRANSPORT +'Error connecting to ' + this.server.ws_uri + ': ' + e);
    }

    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = function(e) {
      transport.onOpen(e);
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
  onOpen: function(e) {
    this.connected = true;

    console.log(JsSIP.c.LOG_TRANSPORT +'WebSocket connected: ' + this.server.ws_uri);
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
    console.warn(JsSIP.c.LOG_TRANSPORT +'WebSocket disconnected: code=' + e.code + (e.reason? ', reason=' + e.reason : ''));

    if(e.wasClean === false) {
      console.log(JsSIP.c.LOG_TRANSPORT +'ERROR: abrupt disconection');
    }
    // Transport was connected
    if(connected_before === true) {
      this.ua.onTransportClosed(this);
      // Check whether the user requested to close.
      if(!this.closed) {
        // Reset reconnection_attempts
        this.reconnection_attempts = 0;
        this.reConnect();
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

    console.info(JsSIP.c.LOG_TRANSPORT +'Received WebSocket message: \n\n' + data + '\n');

    // Keep alive response from server. Scape it.
    if(data === '\r\n') {
      return;
    } else if (typeof data !== 'string') {
      console.info(JsSIP.c.LOG_TRANSPORT +'Binary data received. Ignoring message\n');
      return;
    }

    message = JsSIP.Parser.parseMessage(data);

    if(this.ua.status === JsSIP.c.UA_STATUS_USER_CLOSED && message instanceof JsSIP.IncomingRequest) {
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
          case JsSIP.c.INVITE:
            transaction = this.ua.transactions.ict[message.via_branch];
            if(transaction) {
              transaction.receiveResponse(message);
            }
            break;
          case JsSIP.c.ACK:
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
    console.log(JsSIP.c.LOG_TRANSPORT +'WebSocket connection error');
  },

  /**
  * Reconnection attempt logic.
  * @private
  */
  reConnect: function() {
    var transport = this;

    this.reconnection_attempts += 1;

    if(this.reconnection_attempts > this.ua.configuration.max_reconnection) {
      console.log(JsSIP.c.LOG_TRANSPORT +'Maximum reconnection attempts for: ' + this.server.ws_uri);
      this.ua.onTransportError(this);
    } else {
      console.log(JsSIP.c.LOG_TRANSPORT +'Trying to reconnect to: ' + this.server.ws_uri + '. Reconnection attempt number ' + this.reconnection_attempts);

      this.reconnectTimer = window.setTimeout(function() {
        transport.reConnect();}, this.ua.configuration.reconnection_timeout * 1000);

      this.connect();
    }
  }
};
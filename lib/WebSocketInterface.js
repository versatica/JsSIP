module.exports = WebSocketInterface;

/**
 * Dependencies.
 */
const Grammar = require('./Grammar');
const debug = require('debug')('JsSIP:WebSocketInterface');
const debugerror = require('debug')('JsSIP:ERROR:WebSocketInterface');
debugerror.log = console.warn.bind(console);

function WebSocketInterface(url) {
  debug('new() [url:"%s"]', url);

  let sip_uri = null;
  let via_transport = null;

  this.ws = null;

  // setting the 'scheme' alters the sip_uri too (used in SIP Route header field)
  Object.defineProperties(this, {
    via_transport: {
      get: function() { return via_transport; },
      set: function(transport) {
        via_transport = transport.toUpperCase();
      }
    },
    sip_uri:  { get: function() { return sip_uri; }},
    url:      { get: function() { return url; }}
  });

  const parsed_url = Grammar.parse(url, 'absoluteURI');

  if (parsed_url === -1) {
    debugerror('invalid WebSocket URI: ' + url);
    throw new TypeError('Invalid argument: ' + url);
  } else if(parsed_url.scheme !== 'wss' && parsed_url.scheme !== 'ws') {
    debugerror('invalid WebSocket URI scheme: ' + parsed_url.scheme);
    throw new TypeError('Invalid argument: ' + url);
  } else {
    sip_uri = 'sip:' + parsed_url.host +
      (parsed_url.port ? ':' + parsed_url.port : '') + ';transport=ws';
    this.via_transport = parsed_url.scheme;
  }
}

WebSocketInterface.prototype.connect = function () {
  debug('connect()');

  if (this.isConnected()) {
    debug('WebSocket ' + this.url + ' is already connected');
    return;
  } else if (this.isConnecting()) {
    debug('WebSocket ' + this.url + ' is connecting');
    return;
  }

  if (this.ws) {
    this.disconnect();
  }

  debug('connecting to WebSocket ' + this.url);

  try {
    this.ws = new WebSocket(this.url, 'sip');

    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen    = onOpen.bind(this);
    this.ws.onclose   = onClose.bind(this);
    this.ws.onmessage = onMessage.bind(this);
    this.ws.onerror   = onError.bind(this);
  } catch(e) {
    onError.call(this, e);
  }
};

WebSocketInterface.prototype.disconnect = function() {
  debug('disconnect()');

  if (this.ws) {
    // unbind websocket event callbacks
    this.ws.onopen    = () => {};
    this.ws.onclose   = () => {};
    this.ws.onmessage = () => {};
    this.ws.onerror   = () => {};

    this.ws.close();
    this.ws = null;
  }
};

WebSocketInterface.prototype.send = function(message) {
  debug('send()');

  if (this.isConnected()) {
    this.ws.send(message);
    return true;
  } else {
    debugerror('unable to send message, WebSocket is not open');
    return false;
  }
};

WebSocketInterface.prototype.isConnected = function() {
  return this.ws && this.ws.readyState === this.ws.OPEN;
};

WebSocketInterface.prototype.isConnecting = function() {
  return this.ws && this.ws.readyState === this.ws.CONNECTING;
};


/**
 * WebSocket Event Handlers
 */

function onOpen() {
  debug('WebSocket ' + this.url + ' connected');

  this.onconnect();
}

function onClose(e) {
  debug('WebSocket ' + this.url + ' closed');

  if (e.wasClean === false) {
    debug('WebSocket abrupt disconnection');
  }

  const data = {
    socket: this,
    error: !e.wasClean,
    code: e.code,
    reason: e.reason
  };

  this.ondisconnect(data);
}

function onMessage(e) {
  debug('received WebSocket message');

  this.ondata(e.data);
}

function onError(e) {
  debugerror('WebSocket ' + this.url + ' error: '+ e);
}

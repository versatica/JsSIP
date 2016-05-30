module.exports = Socket;

/**
 * Interface documentation: http://jssip.net/documentation/$last_version/api/socket/
 *
 * interface Socket {
 *  attribute String via_transport
 *  attribute String url
 *  attribute String sip_uri
 *
 *  method connect();
 *  method disconnect();
 *  method send(data);
 *
 *  attribute EventHandler onconnect
 *  attribute EventHandler ondisconnect
 *  attribute EventHandler ondata
 * }
 *
 */


/**
 * Dependencies.
 */
var Utils = require('./Utils');
var Grammar = require('./Grammar');
var debugerror = require('debug')('JsSIP:ERROR:Socket');

function Socket() {}

Socket.isSocket = function(socket) {
  if (typeof socket === 'undefined') {
    debugerror('undefined JsSIP.Socket instance');
    return false;
  }

  // Check Properties
  try {
    if (!Utils.isString(socket.url)) {
      debugerror('missing or invalid JsSIP.Socket url property');
      throw new Error();
    }

    if (!Utils.isString(socket.via_transport)) {
      debugerror('missing or invalid JsSIP.Socket via_transport property');
      throw new Error();
    }

    if (Grammar.parse(socket.sip_uri, 'SIP_URI') === -1) {
      debugerror('missing or invalid JsSIP.Socket sip_uri property');
      throw new Error();
    }
  } catch(e) {
    return false;
  }

  // Check Methods
  try {
    ['connect', 'disconnect', 'send'].forEach(function(method) {
      if (!Utils.isFunction(socket[method])) {
        debugerror('missing or invalid JsSIP.Socket method: ' + method);
        throw new Error();
      }
    });
  } catch(e) {
    return false;
  }

  return true;
};

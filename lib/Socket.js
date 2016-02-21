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
var Utils =       require('./Utils');
var debugerror =  require('debug')('JsSIP:ERROR:Socket');

function Socket() {}

Socket.isSocket = function(socket) {
  if (typeof socket === 'undefined') {
    debugerror('Undefined JsSIP.Socket instance');
    return false;
  }

  // Check Properties
  try {
    ['via_transport', 'url', 'sip_uri'].forEach(function(prop) {
      if (!Utils.isString(socket[prop])) {
        debugerror('Missing or invalid JsSIP.Socket property: '+ prop);
        throw new Error();
      }
    });
  } catch(e) {
    return false;
  }

  // Check Methods
  try {
    ['connect', 'disconnect', 'send'].forEach(function(method) {
      if (!Utils.isFunction(socket[method])) {
        debugerror('Missing or invalid JsSIP.Socket method: '+ method);
        throw new Error();
      }
    });
  } catch(e) {
    return false;
  }

  return true;
};

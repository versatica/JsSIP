'use strict';

var Utils = require('./Utils');
var JsSIP_C = require('./Constants');
var Grammar = require('./Grammar');
var URI = require('./URI');
var Socket = require('./Socket');
var Exceptions = require('./Exceptions');

// Default settings.
exports.settings = {
  // SIP authentication.
  authorization_user: null,
  password: null,
  realm: null,
  ha1: null,

  // SIP account.
  display_name: null,
  uri: null,
  contact_uri: null,

  // SIP instance id (GRUU).
  instance_id: null,

  // Preloaded SIP Route header field.
  use_preloaded_route: false,

  // Session parameters.
  session_timers: true,
  session_timers_refresh_method: JsSIP_C.UPDATE,
  no_answer_timeout: 60,

  // Registration parameters.
  register: true,
  register_expires: 600,
  registrar_server: null,

  // Connection options.
  sockets: null,
  connection_recovery_max_interval: null,
  connection_recovery_min_interval: null,

  /*
   * Host address.
   * Value to be set in Via sent_by and host part of Contact FQDN.
  */
  via_host: Utils.createRandomToken(12) + '.invalid'
};

// Configuration checks.
var checks = {
  mandatory: {
    sockets: function sockets(_sockets2) {
      /* Allow defining sockets parameter as:
       *  Socket: socket
       *  Array of Socket: [socket1, socket2]
       *  Array of Objects: [{socket: socket1, weight:1}, {socket: Socket2, weight:0}]
       *  Array of Objects and Socket: [{socket: socket1}, socket2]
       */
      var _sockets = [];

      if (Socket.isSocket(_sockets2)) {
        _sockets.push({ socket: _sockets2 });
      } else if (Array.isArray(_sockets2) && _sockets2.length) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = _sockets2[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var socket = _step.value;

            if (Socket.isSocket(socket)) {
              _sockets.push({ socket: socket });
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
      } else {
        return;
      }

      return _sockets;
    },
    uri: function uri(_uri) {
      if (!/^sip:/i.test(_uri)) {
        _uri = JsSIP_C.SIP + ':' + _uri;
      }
      var parsed = URI.parse(_uri);

      if (!parsed) {
        return;
      } else if (!parsed.user) {
        return;
      } else {
        return parsed;
      }
    }
  },

  optional: {
    authorization_user: function authorization_user(_authorization_user) {
      if (Grammar.parse('"' + _authorization_user + '"', 'quoted_string') === -1) {
        return;
      } else {
        return _authorization_user;
      }
    },
    connection_recovery_max_interval: function connection_recovery_max_interval(_connection_recovery_max_interval) {
      if (Utils.isDecimal(_connection_recovery_max_interval)) {
        var value = Number(_connection_recovery_max_interval);

        if (value > 0) {
          return value;
        }
      }
    },
    connection_recovery_min_interval: function connection_recovery_min_interval(_connection_recovery_min_interval) {
      if (Utils.isDecimal(_connection_recovery_min_interval)) {
        var value = Number(_connection_recovery_min_interval);

        if (value > 0) {
          return value;
        }
      }
    },
    contact_uri: function contact_uri(_contact_uri) {
      if (typeof _contact_uri === 'string') {
        var uri = Grammar.parse(_contact_uri, 'SIP_URI');

        if (uri !== -1) {
          return uri;
        }
      }
    },
    display_name: function display_name(_display_name) {
      if (Grammar.parse('"' + _display_name + '"', 'display_name') === -1) {
        return;
      } else {
        return _display_name;
      }
    },
    instance_id: function instance_id(_instance_id) {
      if (/^uuid:/i.test(_instance_id)) {
        _instance_id = _instance_id.substr(5);
      }

      if (Grammar.parse(_instance_id, 'uuid') === -1) {
        return;
      } else {
        return _instance_id;
      }
    },
    no_answer_timeout: function no_answer_timeout(_no_answer_timeout) {
      if (Utils.isDecimal(_no_answer_timeout)) {
        var value = Number(_no_answer_timeout);

        if (value > 0) {
          return value;
        }
      }
    },
    session_timers: function session_timers(_session_timers) {
      if (typeof _session_timers === 'boolean') {
        return _session_timers;
      }
    },
    session_timers_refresh_method: function session_timers_refresh_method(method) {
      if (typeof method === 'string') {
        method = method.toUpperCase();

        if (method === JsSIP_C.INVITE || method === JsSIP_C.UPDATE) {
          return method;
        }
      }
    },
    password: function password(_password) {
      return String(_password);
    },
    realm: function realm(_realm) {
      return String(_realm);
    },
    ha1: function ha1(_ha) {
      return String(_ha);
    },
    register: function register(_register) {
      if (typeof _register === 'boolean') {
        return _register;
      }
    },
    register_expires: function register_expires(_register_expires) {
      if (Utils.isDecimal(_register_expires)) {
        var value = Number(_register_expires);

        if (value > 0) {
          return value;
        }
      }
    },
    registrar_server: function registrar_server(_registrar_server) {
      if (!/^sip:/i.test(_registrar_server)) {
        _registrar_server = JsSIP_C.SIP + ':' + _registrar_server;
      }

      var parsed = URI.parse(_registrar_server);

      if (!parsed) {
        return;
      } else if (parsed.user) {
        return;
      } else {
        return parsed;
      }
    },
    use_preloaded_route: function use_preloaded_route(_use_preloaded_route) {
      if (typeof _use_preloaded_route === 'boolean') {
        return _use_preloaded_route;
      }
    }
  }
};

exports.load = function (dst, src) {
  // Check Mandatory parameters.
  for (var parameter in checks.mandatory) {
    if (!src.hasOwnProperty(parameter)) {
      throw new Exceptions.ConfigurationError(parameter);
    } else {
      var value = src[parameter];
      var checked_value = checks.mandatory[parameter](value);

      if (checked_value !== undefined) {
        dst[parameter] = checked_value;
      } else {
        throw new Exceptions.ConfigurationError(parameter, value);
      }
    }
  }

  // Check Optional parameters.
  for (var _parameter in checks.optional) {
    if (src.hasOwnProperty(_parameter)) {
      var _value = src[_parameter];

      /* If the parameter value is null, empty string, undefined, empty array
       * or it's a number with NaN value, then apply its default value.
       */
      if (Utils.isEmpty(_value)) {
        continue;
      }

      var _checked_value = checks.optional[_parameter](_value);

      if (_checked_value !== undefined) {
        dst[_parameter] = _checked_value;
      } else {
        throw new Exceptions.ConfigurationError(_parameter, _value);
      }
    }
  }
};
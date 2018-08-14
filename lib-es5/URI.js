'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var JsSIP_C = require('./Constants');
var Utils = require('./Utils');
var Grammar = require('./Grammar');

/**
 * -param {String} [scheme]
 * -param {String} [user]
 * -param {String} host
 * -param {String} [port]
 * -param {Object} [parameters]
 * -param {Object} [headers]
 *
 */
module.exports = function () {
  _createClass(URI, null, [{
    key: 'parse',

    /**
      * Parse the given string and returns a JsSIP.URI instance or undefined if
      * it is an invalid URI.
      */
    value: function parse(uri) {
      uri = Grammar.parse(uri, 'SIP_URI');

      if (uri !== -1) {
        return uri;
      } else {
        return undefined;
      }
    }
  }]);

  function URI(scheme, user, host, port) {
    var parameters = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
    var headers = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : {};

    _classCallCheck(this, URI);

    // Checks.
    if (!host) {
      throw new TypeError('missing or invalid "host" parameter');
    }

    // Initialize parameters.
    this._parameters = {};
    this._headers = {};

    this._scheme = scheme || JsSIP_C.SIP;
    this._user = user;
    this._host = host;
    this._port = port;

    for (var param in parameters) {
      if (Object.prototype.hasOwnProperty.call(parameters, param)) {
        this.setParam(param, parameters[param]);
      }
    }

    for (var header in headers) {
      if (Object.prototype.hasOwnProperty.call(headers, header)) {
        this.setHeader(header, headers[header]);
      }
    }
  }

  _createClass(URI, [{
    key: 'setParam',
    value: function setParam(key, value) {
      if (key) {
        this._parameters[key.toLowerCase()] = typeof value === 'undefined' || value === null ? null : value.toString();
      }
    }
  }, {
    key: 'getParam',
    value: function getParam(key) {
      if (key) {
        return this._parameters[key.toLowerCase()];
      }
    }
  }, {
    key: 'hasParam',
    value: function hasParam(key) {
      if (key) {
        return this._parameters.hasOwnProperty(key.toLowerCase()) && true || false;
      }
    }
  }, {
    key: 'deleteParam',
    value: function deleteParam(parameter) {
      parameter = parameter.toLowerCase();
      if (this._parameters.hasOwnProperty(parameter)) {
        var value = this._parameters[parameter];

        delete this._parameters[parameter];

        return value;
      }
    }
  }, {
    key: 'clearParams',
    value: function clearParams() {
      this._parameters = {};
    }
  }, {
    key: 'setHeader',
    value: function setHeader(name, value) {
      this._headers[Utils.headerize(name)] = Array.isArray(value) ? value : [value];
    }
  }, {
    key: 'getHeader',
    value: function getHeader(name) {
      if (name) {
        return this._headers[Utils.headerize(name)];
      }
    }
  }, {
    key: 'hasHeader',
    value: function hasHeader(name) {
      if (name) {
        return this._headers.hasOwnProperty(Utils.headerize(name)) && true || false;
      }
    }
  }, {
    key: 'deleteHeader',
    value: function deleteHeader(header) {
      header = Utils.headerize(header);
      if (this._headers.hasOwnProperty(header)) {
        var value = this._headers[header];

        delete this._headers[header];

        return value;
      }
    }
  }, {
    key: 'clearHeaders',
    value: function clearHeaders() {
      this._headers = {};
    }
  }, {
    key: 'clone',
    value: function clone() {
      return new URI(this._scheme, this._user, this._host, this._port, JSON.parse(JSON.stringify(this._parameters)), JSON.parse(JSON.stringify(this._headers)));
    }
  }, {
    key: 'toString',
    value: function toString() {
      var headers = [];

      var uri = this._scheme + ':';

      if (this._user) {
        uri += Utils.escapeUser(this._user) + '@';
      }
      uri += this._host;
      if (this._port || this._port === 0) {
        uri += ':' + this._port;
      }

      for (var parameter in this._parameters) {
        if (Object.prototype.hasOwnProperty.call(this._parameters, parameter)) {
          uri += ';' + parameter;

          if (this._parameters[parameter] !== null) {
            uri += '=' + this._parameters[parameter];
          }
        }
      }

      for (var header in this._headers) {
        if (Object.prototype.hasOwnProperty.call(this._headers, header)) {
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = this._headers[header][Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var item = _step.value;

              headers.push(header + '=' + item);
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
        }
      }

      if (headers.length > 0) {
        uri += '?' + headers.join('&');
      }

      return uri;
    }
  }, {
    key: 'toAor',
    value: function toAor(show_port) {
      var aor = this._scheme + ':';

      if (this._user) {
        aor += Utils.escapeUser(this._user) + '@';
      }
      aor += this._host;
      if (show_port && (this._port || this._port === 0)) {
        aor += ':' + this._port;
      }

      return aor;
    }
  }, {
    key: 'scheme',
    get: function get() {
      return this._scheme;
    },
    set: function set(value) {
      this._scheme = value.toLowerCase();
    }
  }, {
    key: 'user',
    get: function get() {
      return this._user;
    },
    set: function set(value) {
      this._user = value;
    }
  }, {
    key: 'host',
    get: function get() {
      return this._host;
    },
    set: function set(value) {
      this._host = value.toLowerCase();
    }
  }, {
    key: 'port',
    get: function get() {
      return this._port;
    },
    set: function set(value) {
      this._port = value === 0 ? value : parseInt(value, 10) || null;
    }
  }]);

  return URI;
}();
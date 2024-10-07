"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
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
module.exports = /*#__PURE__*/function () {
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
  return _createClass(URI, [{
    key: "scheme",
    get: function get() {
      return this._scheme;
    },
    set: function set(value) {
      this._scheme = value.toLowerCase();
    }
  }, {
    key: "user",
    get: function get() {
      return this._user;
    },
    set: function set(value) {
      this._user = value;
    }
  }, {
    key: "host",
    get: function get() {
      return this._host;
    },
    set: function set(value) {
      this._host = value.toLowerCase();
    }
  }, {
    key: "port",
    get: function get() {
      return this._port;
    },
    set: function set(value) {
      this._port = value === 0 ? value : parseInt(value, 10) || null;
    }
  }, {
    key: "setParam",
    value: function setParam(key, value) {
      if (key) {
        this._parameters[key.toLowerCase()] = typeof value === 'undefined' || value === null ? null : value.toString();
      }
    }
  }, {
    key: "getParam",
    value: function getParam(key) {
      if (key) {
        return this._parameters[key.toLowerCase()];
      }
    }
  }, {
    key: "hasParam",
    value: function hasParam(key) {
      if (key) {
        return this._parameters.hasOwnProperty(key.toLowerCase()) && true || false;
      }
    }
  }, {
    key: "deleteParam",
    value: function deleteParam(parameter) {
      parameter = parameter.toLowerCase();
      if (this._parameters.hasOwnProperty(parameter)) {
        var value = this._parameters[parameter];
        delete this._parameters[parameter];
        return value;
      }
    }
  }, {
    key: "clearParams",
    value: function clearParams() {
      this._parameters = {};
    }
  }, {
    key: "setHeader",
    value: function setHeader(name, value) {
      this._headers[Utils.headerize(name)] = Array.isArray(value) ? value : [value];
    }
  }, {
    key: "getHeader",
    value: function getHeader(name) {
      if (name) {
        return this._headers[Utils.headerize(name)];
      }
    }
  }, {
    key: "hasHeader",
    value: function hasHeader(name) {
      if (name) {
        return this._headers.hasOwnProperty(Utils.headerize(name)) && true || false;
      }
    }
  }, {
    key: "deleteHeader",
    value: function deleteHeader(header) {
      header = Utils.headerize(header);
      if (this._headers.hasOwnProperty(header)) {
        var value = this._headers[header];
        delete this._headers[header];
        return value;
      }
    }
  }, {
    key: "clearHeaders",
    value: function clearHeaders() {
      this._headers = {};
    }
  }, {
    key: "clone",
    value: function clone() {
      return new URI(this._scheme, this._user, this._host, this._port, JSON.parse(JSON.stringify(this._parameters)), JSON.parse(JSON.stringify(this._headers)));
    }
  }, {
    key: "toString",
    value: function toString() {
      var headers = [];
      var uri = "".concat(this._scheme, ":");
      if (this._user) {
        uri += "".concat(Utils.escapeUser(this._user), "@");
      }
      uri += this._host;
      if (this._port || this._port === 0) {
        uri += ":".concat(this._port);
      }
      for (var parameter in this._parameters) {
        if (Object.prototype.hasOwnProperty.call(this._parameters, parameter)) {
          uri += ";".concat(parameter);
          if (this._parameters[parameter] !== null) {
            uri += "=".concat(this._parameters[parameter]);
          }
        }
      }
      for (var header in this._headers) {
        if (Object.prototype.hasOwnProperty.call(this._headers, header)) {
          var _iterator = _createForOfIteratorHelper(this._headers[header]),
            _step;
          try {
            for (_iterator.s(); !(_step = _iterator.n()).done;) {
              var item = _step.value;
              headers.push("".concat(header, "=").concat(item));
            }
          } catch (err) {
            _iterator.e(err);
          } finally {
            _iterator.f();
          }
        }
      }
      if (headers.length > 0) {
        uri += "?".concat(headers.join('&'));
      }
      return uri;
    }
  }, {
    key: "toAor",
    value: function toAor(show_port) {
      var aor = "".concat(this._scheme, ":");
      if (this._user) {
        aor += "".concat(Utils.escapeUser(this._user), "@");
      }
      aor += this._host;
      if (show_port && (this._port || this._port === 0)) {
        aor += ":".concat(this._port);
      }
      return aor;
    }
  }], [{
    key: "parse",
    value:
    /**
      * Parse the given string and returns a JsSIP.URI instance or undefined if
      * it is an invalid URI.
      */
    function parse(uri) {
      uri = Grammar.parse(uri, 'SIP_URI');
      if (uri !== -1) {
        return uri;
      } else {
        return undefined;
      }
    }
  }]);
}();
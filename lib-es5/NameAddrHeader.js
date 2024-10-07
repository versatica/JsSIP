"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var URI = require('./URI');
var Grammar = require('./Grammar');
module.exports = /*#__PURE__*/function () {
  function NameAddrHeader(uri, display_name, parameters) {
    _classCallCheck(this, NameAddrHeader);
    // Checks.
    if (!uri || !(uri instanceof URI)) {
      throw new TypeError('missing or invalid "uri" parameter');
    }

    // Initialize parameters.
    this._uri = uri;
    this._parameters = {};
    this.display_name = display_name;
    for (var param in parameters) {
      if (Object.prototype.hasOwnProperty.call(parameters, param)) {
        this.setParam(param, parameters[param]);
      }
    }
  }
  return _createClass(NameAddrHeader, [{
    key: "uri",
    get: function get() {
      return this._uri;
    }
  }, {
    key: "display_name",
    get: function get() {
      return this._display_name;
    },
    set: function set(value) {
      this._display_name = value === 0 ? '0' : value;
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
    key: "clone",
    value: function clone() {
      return new NameAddrHeader(this._uri.clone(), this._display_name, JSON.parse(JSON.stringify(this._parameters)));
    }
  }, {
    key: "_quote",
    value: function _quote(str) {
      return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }
  }, {
    key: "toString",
    value: function toString() {
      var body = this._display_name ? "\"".concat(this._quote(this._display_name), "\" ") : '';
      body += "<".concat(this._uri.toString(), ">");
      for (var parameter in this._parameters) {
        if (Object.prototype.hasOwnProperty.call(this._parameters, parameter)) {
          body += ";".concat(parameter);
          if (this._parameters[parameter] !== null) {
            body += "=".concat(this._parameters[parameter]);
          }
        }
      }
      return body;
    }
  }], [{
    key: "parse",
    value:
    /**
     * Parse the given string and returns a NameAddrHeader instance or undefined if
     * it is an invalid NameAddrHeader.
     */
    function parse(name_addr_header) {
      name_addr_header = Grammar.parse(name_addr_header, 'Name_Addr_Header');
      if (name_addr_header !== -1) {
        return name_addr_header;
      } else {
        return undefined;
      }
    }
  }]);
}();
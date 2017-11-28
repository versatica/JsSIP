'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var sdp_transform = require('sdp-transform');
var JsSIP_C = require('./Constants');
var Utils = require('./Utils');
var NameAddrHeader = require('./NameAddrHeader');
var Grammar = require('./Grammar');
var debug = require('debug')('JsSIP:SIPMessage');

/**
 * -param {String} method request method
 * -param {String} ruri request uri
 * -param {UA} ua
 * -param {Object} params parameters that will have priority over ua.configuration parameters:
 * <br>
 *  - cseq, call_id, from_tag, from_uri, from_display_name, to_uri, to_tag, route_set
 * -param {Object} [headers] extra headers
 * -param {String} [body]
 */

var OutgoingRequest = function () {
  function OutgoingRequest(method, ruri, ua, params, extraHeaders, body) {
    _classCallCheck(this, OutgoingRequest);

    // Mandatory parameters check.
    if (!method || !ruri || !ua) {
      return null;
    }

    params = params || {};

    this.ua = ua;
    this.headers = {};
    this.method = method;
    this.ruri = ruri;
    this.body = body;
    this.extraHeaders = Utils.cloneArray(extraHeaders);

    // Fill the Common SIP Request Headers.

    // Route.
    if (params.route_set) {
      this.setHeader('route', params.route_set);
    } else if (ua.configuration.use_preloaded_route) {
      this.setHeader('route', '<' + ua.transport.sip_uri + ';lr>');
    }

    // Via.
    // Empty Via header. Will be filled by the client transaction.
    this.setHeader('via', '');

    // Max-Forwards.
    this.setHeader('max-forwards', JsSIP_C.MAX_FORWARDS);

    // To
    var to = params.to_display_name || params.to_display_name === 0 ? '"' + params.to_display_name + '" ' : '';

    to += '<' + (params.to_uri || ruri) + '>';
    to += params.to_tag ? ';tag=' + params.to_tag : '';
    this.to = NameAddrHeader.parse(to);
    this.setHeader('to', to);

    // From.
    var from = void 0;

    if (params.from_display_name || params.from_display_name === 0) {
      from = '"' + params.from_display_name + '" ';
    } else if (ua.configuration.display_name) {
      from = '"' + ua.configuration.display_name + '" ';
    } else {
      from = '';
    }
    from += '<' + (params.from_uri || ua.configuration.uri) + '>;tag=';
    from += params.from_tag || Utils.newTag();
    this.from = NameAddrHeader.parse(from);
    this.setHeader('from', from);

    // Call-ID.
    var call_id = params.call_id || ua.configuration.jssip_id + Utils.createRandomToken(15);

    this.call_id = call_id;
    this.setHeader('call-id', call_id);

    // CSeq.
    var cseq = params.cseq || Math.floor(Math.random() * 10000);

    this.cseq = cseq;
    this.setHeader('cseq', cseq + ' ' + method);
  }

  /**
   * Replace the the given header by the given value.
   * -param {String} name header name
   * -param {String | Array} value header value
   */


  _createClass(OutgoingRequest, [{
    key: 'setHeader',
    value: function setHeader(name, value) {
      // Remove the header from extraHeaders if present.
      var regexp = new RegExp('^\\s*' + name + '\\s*:', 'i');

      for (var idx = 0; idx < this.extraHeaders.length; idx++) {
        if (regexp.test(this.extraHeaders[idx])) {
          this.extraHeaders.splice(idx, 1);
        }
      }

      this.headers[Utils.headerize(name)] = Array.isArray(value) ? value : [value];
    }

    /**
     * Get the value of the given header name at the given position.
     * -param {String} name header name
     * -returns {String|undefined} Returns the specified header, null if header doesn't exist.
     */

  }, {
    key: 'getHeader',
    value: function getHeader(name) {
      var headers = this.headers[Utils.headerize(name)];

      if (headers) {
        if (headers[0]) {
          return headers[0];
        }
      } else {
        var regexp = new RegExp('^\\s*' + name + '\\s*:', 'i');

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = this.extraHeaders[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var header = _step.value;

            if (regexp.test(header)) {
              return header.substring(header.indexOf(':') + 1).trim();
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
      }

      return;
    }

    /**
     * Get the header/s of the given name.
     * -param {String} name header name
     * -returns {Array} Array with all the headers of the specified name.
     */

  }, {
    key: 'getHeaders',
    value: function getHeaders(name) {
      var headers = this.headers[Utils.headerize(name)];
      var result = [];

      if (headers) {
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = headers[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var header = _step2.value;

            result.push(header);
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }

        return result;
      } else {
        var regexp = new RegExp('^\\s*' + name + '\\s*:', 'i');

        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
          for (var _iterator3 = this.extraHeaders[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var _header = _step3.value;

            if (regexp.test(_header)) {
              result.push(_header.substring(_header.indexOf(':') + 1).trim());
            }
          }
        } catch (err) {
          _didIteratorError3 = true;
          _iteratorError3 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion3 && _iterator3.return) {
              _iterator3.return();
            }
          } finally {
            if (_didIteratorError3) {
              throw _iteratorError3;
            }
          }
        }

        return result;
      }
    }

    /**
     * Verify the existence of the given header.
     * -param {String} name header name
     * -returns {boolean} true if header with given name exists, false otherwise
     */

  }, {
    key: 'hasHeader',
    value: function hasHeader(name) {
      if (this.headers[Utils.headerize(name)]) {
        return true;
      } else {
        var regexp = new RegExp('^\\s*' + name + '\\s*:', 'i');

        var _iteratorNormalCompletion4 = true;
        var _didIteratorError4 = false;
        var _iteratorError4 = undefined;

        try {
          for (var _iterator4 = this.extraHeaders[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
            var header = _step4.value;

            if (regexp.test(header)) {
              return true;
            }
          }
        } catch (err) {
          _didIteratorError4 = true;
          _iteratorError4 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion4 && _iterator4.return) {
              _iterator4.return();
            }
          } finally {
            if (_didIteratorError4) {
              throw _iteratorError4;
            }
          }
        }
      }

      return false;
    }

    /**
     * Parse the current body as a SDP and store the resulting object
     * into this.sdp.
     * -param {Boolean} force: Parse even if this.sdp already exists.
     *
     * Returns this.sdp.
     */

  }, {
    key: 'parseSDP',
    value: function parseSDP(force) {
      if (!force && this.sdp) {
        return this.sdp;
      } else {
        this.sdp = sdp_transform.parse(this.body || '');

        return this.sdp;
      }
    }
  }, {
    key: 'toString',
    value: function toString() {
      var msg = this.method + ' ' + this.ruri + ' SIP/2.0\r\n';

      for (var headerName in this.headers) {
        if (Object.prototype.hasOwnProperty.call(this.headers, headerName)) {
          var _iteratorNormalCompletion5 = true;
          var _didIteratorError5 = false;
          var _iteratorError5 = undefined;

          try {
            for (var _iterator5 = this.headers[headerName][Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
              var headerValue = _step5.value;

              msg += headerName + ': ' + headerValue + '\r\n';
            }
          } catch (err) {
            _didIteratorError5 = true;
            _iteratorError5 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion5 && _iterator5.return) {
                _iterator5.return();
              }
            } finally {
              if (_didIteratorError5) {
                throw _iteratorError5;
              }
            }
          }
        }
      }

      var _iteratorNormalCompletion6 = true;
      var _didIteratorError6 = false;
      var _iteratorError6 = undefined;

      try {
        for (var _iterator6 = this.extraHeaders[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
          var header = _step6.value;

          msg += header.trim() + '\r\n';
        }

        // Supported.
      } catch (err) {
        _didIteratorError6 = true;
        _iteratorError6 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion6 && _iterator6.return) {
            _iterator6.return();
          }
        } finally {
          if (_didIteratorError6) {
            throw _iteratorError6;
          }
        }
      }

      var supported = [];

      switch (this.method) {
        case JsSIP_C.REGISTER:
          supported.push('path', 'gruu');
          break;
        case JsSIP_C.INVITE:
          if (this.ua.configuration.session_timers) {
            supported.push('timer');
          }
          if (this.ua.contact.pub_gruu || this.ua.contact.temp_gruu) {
            supported.push('gruu');
          }
          supported.push('ice', 'replaces');
          break;
        case JsSIP_C.UPDATE:
          if (this.ua.configuration.session_timers) {
            supported.push('timer');
          }
          supported.push('ice');
          break;
      }

      supported.push('outbound');

      // Allow.
      msg += 'Allow: ' + JsSIP_C.ALLOWED_METHODS + '\r\n';
      msg += 'Supported: ' + supported + '\r\n';
      msg += 'User-Agent: ' + JsSIP_C.USER_AGENT + '\r\n';

      if (this.body) {
        var length = Utils.str_utf8_length(this.body);

        msg += 'Content-Length: ' + length + '\r\n\r\n';
        msg += this.body;
      } else {
        msg += 'Content-Length: 0\r\n\r\n';
      }

      return msg;
    }
  }, {
    key: 'clone',
    value: function clone() {
      var request = new OutgoingRequest(this.method, this.ruri, this.ua);

      Object.keys(this.headers).forEach(function (name) {
        request.headers[name] = this.headers[name].slice();
      }, this);

      request.body = this.body;
      request.extraHeaders = Utils.cloneArray(this.extraHeaders);
      request.to = this.to;
      request.from = this.from;
      request.call_id = this.call_id;
      request.cseq = this.cseq;

      return request;
    }
  }]);

  return OutgoingRequest;
}();

var InitialOutgoingInviteRequest = function (_OutgoingRequest) {
  _inherits(InitialOutgoingInviteRequest, _OutgoingRequest);

  function InitialOutgoingInviteRequest(ruri, ua, params, extraHeaders, body) {
    _classCallCheck(this, InitialOutgoingInviteRequest);

    var _this = _possibleConstructorReturn(this, (InitialOutgoingInviteRequest.__proto__ || Object.getPrototypeOf(InitialOutgoingInviteRequest)).call(this, JsSIP_C.INVITE, ruri, ua, params, extraHeaders, body));

    _this.transaction = null;
    return _this;
  }

  _createClass(InitialOutgoingInviteRequest, [{
    key: 'cancel',
    value: function cancel(reason) {
      this.transaction.cancel(reason);
    }
  }, {
    key: 'clone',
    value: function clone() {
      var request = new InitialOutgoingInviteRequest(this.ruri, this.ua);

      Object.keys(this.headers).forEach(function (name) {
        request.headers[name] = this.headers[name].slice();
      }, this);

      request.body = this.body;
      request.extraHeaders = Utils.cloneArray(this.extraHeaders);
      request.to = this.to;
      request.from = this.from;
      request.call_id = this.call_id;
      request.cseq = this.cseq;

      request.transaction = this.transaction;

      return request;
    }
  }]);

  return InitialOutgoingInviteRequest;
}(OutgoingRequest);

var IncomingMessage = function () {
  function IncomingMessage() {
    _classCallCheck(this, IncomingMessage);

    this.data = null;
    this.headers = null;
    this.method = null;
    this.via = null;
    this.via_branch = null;
    this.call_id = null;
    this.cseq = null;
    this.from = null;
    this.from_tag = null;
    this.to = null;
    this.to_tag = null;
    this.body = null;
    this.sdp = null;
  }

  /**
  * Insert a header of the given name and value into the last position of the
  * header array.
  */


  _createClass(IncomingMessage, [{
    key: 'addHeader',
    value: function addHeader(name, value) {
      var header = { raw: value };

      name = Utils.headerize(name);

      if (this.headers[name]) {
        this.headers[name].push(header);
      } else {
        this.headers[name] = [header];
      }
    }

    /**
     * Get the value of the given header name at the given position.
     */

  }, {
    key: 'getHeader',
    value: function getHeader(name) {
      var header = this.headers[Utils.headerize(name)];

      if (header) {
        if (header[0]) {
          return header[0].raw;
        }
      } else {
        return;
      }
    }

    /**
     * Get the header/s of the given name.
     */

  }, {
    key: 'getHeaders',
    value: function getHeaders(name) {
      var headers = this.headers[Utils.headerize(name)];
      var result = [];

      if (!headers) {
        return [];
      }

      var _iteratorNormalCompletion7 = true;
      var _didIteratorError7 = false;
      var _iteratorError7 = undefined;

      try {
        for (var _iterator7 = headers[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
          var header = _step7.value;

          result.push(header.raw);
        }
      } catch (err) {
        _didIteratorError7 = true;
        _iteratorError7 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion7 && _iterator7.return) {
            _iterator7.return();
          }
        } finally {
          if (_didIteratorError7) {
            throw _iteratorError7;
          }
        }
      }

      return result;
    }

    /**
     * Verify the existence of the given header.
     */

  }, {
    key: 'hasHeader',
    value: function hasHeader(name) {
      return this.headers[Utils.headerize(name)] ? true : false;
    }

    /**
    * Parse the given header on the given index.
    * -param {String} name header name
    * -param {Number} [idx=0] header index
    * -returns {Object|undefined} Parsed header object, undefined if the header
    *  is not present or in case of a parsing error.
    */

  }, {
    key: 'parseHeader',
    value: function parseHeader(name) {
      var idx = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

      name = Utils.headerize(name);

      if (!this.headers[name]) {
        debug('header "' + name + '" not present');

        return;
      } else if (idx >= this.headers[name].length) {
        debug('not so many "' + name + '" headers present');

        return;
      }

      var header = this.headers[name][idx];
      var value = header.raw;

      if (header.parsed) {
        return header.parsed;
      }

      // Substitute '-' by '_' for grammar rule matching.
      var parsed = Grammar.parse(value, name.replace(/-/g, '_'));

      if (parsed === -1) {
        this.headers[name].splice(idx, 1); // delete from headers
        debug('error parsing "' + name + '" header field with value "' + value + '"');

        return;
      } else {
        header.parsed = parsed;

        return parsed;
      }
    }

    /**
     * Message Header attribute selector. Alias of parseHeader.
     * -param {String} name header name
     * -param {Number} [idx=0] header index
     * -returns {Object|undefined} Parsed header object, undefined if the header
     *  is not present or in case of a parsing error.
     *
     * -example
     * message.s('via',3).port
     */

  }, {
    key: 's',
    value: function s(name, idx) {
      return this.parseHeader(name, idx);
    }

    /**
    * Replace the value of the given header by the value.
    * -param {String} name header name
    * -param {String} value header value
    */

  }, {
    key: 'setHeader',
    value: function setHeader(name, value) {
      var header = { raw: value };

      this.headers[Utils.headerize(name)] = [header];
    }

    /**
     * Parse the current body as a SDP and store the resulting object
     * into this.sdp.
     * -param {Boolean} force: Parse even if this.sdp already exists.
     *
     * Returns this.sdp.
     */

  }, {
    key: 'parseSDP',
    value: function parseSDP(force) {
      if (!force && this.sdp) {
        return this.sdp;
      } else {
        this.sdp = sdp_transform.parse(this.body || '');

        return this.sdp;
      }
    }
  }, {
    key: 'toString',
    value: function toString() {
      return this.data;
    }
  }]);

  return IncomingMessage;
}();

var IncomingRequest = function (_IncomingMessage) {
  _inherits(IncomingRequest, _IncomingMessage);

  function IncomingRequest(ua) {
    _classCallCheck(this, IncomingRequest);

    var _this2 = _possibleConstructorReturn(this, (IncomingRequest.__proto__ || Object.getPrototypeOf(IncomingRequest)).call(this));

    _this2.ua = ua;
    _this2.headers = {};
    _this2.ruri = null;
    _this2.transport = null;
    _this2.server_transaction = null;
    return _this2;
  }

  /**
  * Stateful reply.
  * -param {Number} code status code
  * -param {String} reason reason phrase
  * -param {Object} headers extra headers
  * -param {String} body body
  * -param {Function} [onSuccess] onSuccess callback
  * -param {Function} [onFailure] onFailure callback
  */


  _createClass(IncomingRequest, [{
    key: 'reply',
    value: function reply(code, reason, extraHeaders, body, onSuccess, onFailure) {
      var supported = [];
      var to = this.getHeader('To');

      code = code || null;
      reason = reason || null;

      // Validate code and reason values.
      if (!code || code < 100 || code > 699) {
        throw new TypeError('Invalid status_code: ' + code);
      } else if (reason && typeof reason !== 'string' && !(reason instanceof String)) {
        throw new TypeError('Invalid reason_phrase: ' + reason);
      }

      reason = reason || JsSIP_C.REASON_PHRASE[code] || '';
      extraHeaders = Utils.cloneArray(extraHeaders);

      var response = 'SIP/2.0 ' + code + ' ' + reason + '\r\n';

      if (this.method === JsSIP_C.INVITE && code > 100 && code <= 200) {
        var headers = this.getHeaders('record-route');

        var _iteratorNormalCompletion8 = true;
        var _didIteratorError8 = false;
        var _iteratorError8 = undefined;

        try {
          for (var _iterator8 = headers[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
            var header = _step8.value;

            response += 'Record-Route: ' + header + '\r\n';
          }
        } catch (err) {
          _didIteratorError8 = true;
          _iteratorError8 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion8 && _iterator8.return) {
              _iterator8.return();
            }
          } finally {
            if (_didIteratorError8) {
              throw _iteratorError8;
            }
          }
        }
      }

      var vias = this.getHeaders('via');

      var _iteratorNormalCompletion9 = true;
      var _didIteratorError9 = false;
      var _iteratorError9 = undefined;

      try {
        for (var _iterator9 = vias[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
          var via = _step9.value;

          response += 'Via: ' + via + '\r\n';
        }
      } catch (err) {
        _didIteratorError9 = true;
        _iteratorError9 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion9 && _iterator9.return) {
            _iterator9.return();
          }
        } finally {
          if (_didIteratorError9) {
            throw _iteratorError9;
          }
        }
      }

      if (!this.to_tag && code > 100) {
        to += ';tag=' + Utils.newTag();
      } else if (this.to_tag && !this.s('to').hasParam('tag')) {
        to += ';tag=' + this.to_tag;
      }

      response += 'To: ' + to + '\r\n';
      response += 'From: ' + this.getHeader('From') + '\r\n';
      response += 'Call-ID: ' + this.call_id + '\r\n';
      response += 'CSeq: ' + this.cseq + ' ' + this.method + '\r\n';

      var _iteratorNormalCompletion10 = true;
      var _didIteratorError10 = false;
      var _iteratorError10 = undefined;

      try {
        for (var _iterator10 = extraHeaders[Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
          var _header2 = _step10.value;

          response += _header2.trim() + '\r\n';
        }

        // Supported.
      } catch (err) {
        _didIteratorError10 = true;
        _iteratorError10 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion10 && _iterator10.return) {
            _iterator10.return();
          }
        } finally {
          if (_didIteratorError10) {
            throw _iteratorError10;
          }
        }
      }

      switch (this.method) {
        case JsSIP_C.INVITE:
          if (this.ua.configuration.session_timers) {
            supported.push('timer');
          }
          if (this.ua.contact.pub_gruu || this.ua.contact.temp_gruu) {
            supported.push('gruu');
          }
          supported.push('ice', 'replaces');
          break;
        case JsSIP_C.UPDATE:
          if (this.ua.configuration.session_timers) {
            supported.push('timer');
          }
          if (body) {
            supported.push('ice');
          }
          supported.push('replaces');
      }

      supported.push('outbound');

      // Allow and Accept.
      if (this.method === JsSIP_C.OPTIONS) {
        response += 'Allow: ' + JsSIP_C.ALLOWED_METHODS + '\r\n';
        response += 'Accept: ' + JsSIP_C.ACCEPTED_BODY_TYPES + '\r\n';
      } else if (code === 405) {
        response += 'Allow: ' + JsSIP_C.ALLOWED_METHODS + '\r\n';
      } else if (code === 415) {
        response += 'Accept: ' + JsSIP_C.ACCEPTED_BODY_TYPES + '\r\n';
      }

      response += 'Supported: ' + supported + '\r\n';

      if (body) {
        var length = Utils.str_utf8_length(body);

        response += 'Content-Type: application/sdp\r\n';
        response += 'Content-Length: ' + length + '\r\n\r\n';
        response += body;
      } else {
        response += 'Content-Length: ' + 0 + '\r\n\r\n';
      }

      this.server_transaction.receiveResponse(code, response, onSuccess, onFailure);
    }

    /**
    * Stateless reply.
    * -param {Number} code status code
    * -param {String} reason reason phrase
    */

  }, {
    key: 'reply_sl',
    value: function reply_sl() {
      var code = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      var reason = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

      var vias = this.getHeaders('via');

      // Validate code and reason values.
      if (!code || code < 100 || code > 699) {
        throw new TypeError('Invalid status_code: ' + code);
      } else if (reason && typeof reason !== 'string' && !(reason instanceof String)) {
        throw new TypeError('Invalid reason_phrase: ' + reason);
      }

      reason = reason || JsSIP_C.REASON_PHRASE[code] || '';

      var response = 'SIP/2.0 ' + code + ' ' + reason + '\r\n';

      var _iteratorNormalCompletion11 = true;
      var _didIteratorError11 = false;
      var _iteratorError11 = undefined;

      try {
        for (var _iterator11 = vias[Symbol.iterator](), _step11; !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next()).done); _iteratorNormalCompletion11 = true) {
          var via = _step11.value;

          response += 'Via: ' + via + '\r\n';
        }
      } catch (err) {
        _didIteratorError11 = true;
        _iteratorError11 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion11 && _iterator11.return) {
            _iterator11.return();
          }
        } finally {
          if (_didIteratorError11) {
            throw _iteratorError11;
          }
        }
      }

      var to = this.getHeader('To');

      if (!this.to_tag && code > 100) {
        to += ';tag=' + Utils.newTag();
      } else if (this.to_tag && !this.s('to').hasParam('tag')) {
        to += ';tag=' + this.to_tag;
      }

      response += 'To: ' + to + '\r\n';
      response += 'From: ' + this.getHeader('From') + '\r\n';
      response += 'Call-ID: ' + this.call_id + '\r\n';
      response += 'CSeq: ' + this.cseq + ' ' + this.method + '\r\n';
      response += 'Content-Length: ' + 0 + '\r\n\r\n';

      this.transport.send(response);
    }
  }]);

  return IncomingRequest;
}(IncomingMessage);

var IncomingResponse = function (_IncomingMessage2) {
  _inherits(IncomingResponse, _IncomingMessage2);

  function IncomingResponse() {
    _classCallCheck(this, IncomingResponse);

    var _this3 = _possibleConstructorReturn(this, (IncomingResponse.__proto__ || Object.getPrototypeOf(IncomingResponse)).call(this));

    _this3.headers = {};
    _this3.status_code = null;
    _this3.reason_phrase = null;
    return _this3;
  }

  return IncomingResponse;
}(IncomingMessage);

module.exports = {
  OutgoingRequest: OutgoingRequest,
  InitialOutgoingInviteRequest: InitialOutgoingInviteRequest,
  IncomingRequest: IncomingRequest,
  IncomingResponse: IncomingResponse
};
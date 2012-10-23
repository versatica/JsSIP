
/**
 * @fileoverview SIP User Agent
 */

/**
 * @augments JsSIP
 * @class Class for outgoing SIP request.
 * @param {String} method request method
 * @param {String} ruri request uri
 * @param {JsSIP.UA} ua
 * @param {Object} params parameters that will have priority over ua.configuration parameters:
 * <br>
 *  - cseq, call_id, from_tag, from_uri, from_display_name, to_uri, to_tag, route_set
 * @param {Object} [headers] extra headers
 * @param {String} [body]
 */
JsSIP.OutgoingRequest = function(method, ruri, ua, params, extraHeaders, body) {
  var
    to_display_name,
    to_uri,
    to_tag,
    to,
    from_display_name,
    from_uri,
    from_tag,
    from,
    call_id,
    cseq,
    header;

  params = params || {};

  // Mandatory parameters check
  if(!method || !ruri || !ua) {
    return null;
  }

  this.headers = {};
  this.method = method;
  this.ruri = ruri;
  this.body = body;
  this.extraHeaders = extraHeaders;

  // Fill the Common SIP Request Headers

  //ROUTE
  if (params.route_set) {
    this.setHeader('route', params.route_set);
  } else {
    this.setHeader('route', ua.transport.server.sip_uri);
  }

  // VIA
  // Empty Via header. Will be filled by the client transaction
  this.setHeader('via', '');

  //MAX-FORWARDS
  this.setHeader('max-forwards', JsSIP.c.MAX_FORWARDS);

  //TO
  to_display_name = params.to_display_name ? '"' + params.to_display_name + '" ' : '';
  to_uri = params.to_uri || ruri;
  to_tag = params.to_tag ? ';tag=' + params.to_tag : '';
  to = to_display_name ? '<' + to_uri + '>' : to_uri;
  to += to_tag;
  this.setHeader('to', to);

  //FROM
  from_display_name = params.from_display_name || ua.configuration.display_name || '';
  from_uri = params.from_uri || ua.configuration.from_uri;
  from_tag = params.from_tag || JsSIP.utils.newTag();
  from = from_display_name ? '"' + from_display_name + '" ' : '';
  from += from_display_name ? '<' + from_uri + '>' : from_uri;
  from += ';tag=' + from_tag;
  this.setHeader('from', from);

  //CALL-ID
  if(params.call_id) {
    call_id = params.call_id;
  } else {
    call_id = ua.configuration.jssip_id + Math.random().toString(36).substr(2, 15);
  }
  this.setHeader('call-id', call_id);

  //CSEQ
  cseq = params.cseq || Math.floor(Math.random() * 10000);
  cseq = cseq + ' ' + method;
  this.setHeader('cseq', cseq);
};

JsSIP.OutgoingRequest.prototype = {
  /**
   * Replace the the given header by the given value.
   * @param {String} name header name
   * @param {String | Array} value header value
   */
  setHeader: function(name, value) {
    this.headers[JsSIP.utils.headerize(name)] = (value instanceof Array) ? value : [value];
  },
  toString: function() {
    var msg = '', header, length, idx;

    msg += this.method + ' ' + this.ruri + ' SIP/2.0\r\n';

    for(header in this.headers) {
      for(idx in this.headers[header]) {
        msg += header + ': ' + this.headers[header][idx] + '\r\n';
      }
    }

    length = this.extraHeaders.length;
    for(idx=0; idx < length; idx++) {
      msg += this.extraHeaders[idx] +'\r\n';
    }

    msg += 'Supported: ' +  JsSIP.c.SUPPORTED +'\r\n';
    msg += 'User-Agent: ' + JsSIP.c.USER_AGENT +'\r\n';

    if(this.body) {
      length = JsSIP.utils.str_utf8_length(this.body);
      msg += 'Content-Length: ' + length + '\r\n\r\n';
      msg += this.body;
    } else {
      msg += 'Content-Length: ' + 0 + '\r\n\r\n';
    }

    return msg;
  }
};

/**
 * @augments JsSIP
 * @class Class for incoming SIP message.
 */
JsSIP.IncomingMessage = function(){
  this.headers = null;
  this.method =  null;
  this.via = null;
  this.via_branch = null;
  this.call_id = null;
  this.cseq = null;
  this.from = null;
  this.from_tag = null;
  this.to = null;
  this.to_tag = null;
  this.body = null;
};

JsSIP.IncomingMessage.prototype = {
  /**
  * Insert a header of the given name and value into the last possition of the
  * header array.
  * @param {String} name header name
  * @param {String} value header value
  */
  addHeader: function(name, value) {
    var header = { raw: value };

    name = JsSIP.utils.headerize(name);

    if(this.headers[name]) {
      this.headers[name].push(header);
    } else {
      this.headers[name] = [header];
    }
  },

  /**
   * Count the number of headers of the given header name.
   * @param {String} name header name
   * @returns {Number} Number of headers with the given name
   */
  countHeader: function(name) {
    var header = this.headers[JsSIP.utils.headerize(name)];

    if(header) {
      return header.length;
    } else {
      return 0;
    }
  },

  /**
   * Get the value of the given header name at the given possition.
   * @param {String} name header name
   * @param {Number} [idx=0] header index
   * @returns {String|undefined} Returns the specified header, null if header doesn't exist.
   */
  getHeader: function(name, idx) {
    var header = this.headers[JsSIP.utils.headerize(name)];

    idx = idx || 0;

    if(header) {
      if(header[idx]) {
        return header[idx].raw;
      }
    } else {
      return;
    }
  },

  /**
   * Get the header/s of the given name.
   * @param {String} name header name
   * @returns {Array} Array with all the headers of the specified name.
   */
  getHeaderAll: function(name) {
    var idx,
      header = this.headers[JsSIP.utils.headerize(name)],
      result = [];

    if(!header) {
      return [];
    }

    for(idx in header) {
      result.push(header[idx].raw);
    }

    return result;
  },

  /**
   * Get the URI value of the given header at the given value.
   * @param {String} name header name
   * @param {Number} [idx=0] header index
   * @returns {String|undefined} uri attribute of the header. null if header or uri doesn't exist.
   */
  getHeaderUri: function(name, idx) {
    var header = this.headers[JsSIP.utils.headerize(name)];

    idx = idx || 0;

    if(header) {
      if(header[idx] && header[idx].parsed && header[idx].parsed.uri) {
        return header[idx].parsed.uri;
      }
    } else {
      return;
    }
  },

  /**
   * Verify the existence of the given header.
   * @param {String} name header name
   * @returns {boolean} true if header with given name exists, false otherwise
   */
  hasHeader: function(name) {
    return(this.headers[JsSIP.utils.headerize(name)]) ? true : false;
  },

  /**
  * Parse the given header on the given index.
  * @param {String} name header name
  * @param {Number} [idx=0] header index
  * @returns {Object|undefined} Parsed header object, undefined if the header is not present or in case of a parsing error.
  */
  parseHeader: function(name, idx) {
    var header, value, parsed;

    name = JsSIP.utils.headerize(name);

    idx = idx || 0;

    if(!this.headers[name]) {
      console.info(JsSIP.c.LOG_MESSAGE +'Header "' + name + '" not present');
      return;
    } else if(idx >= this.headers[name].length) {
      console.info(JsSIP.c.LOG_MESSAGE +'Not so many "' + name + '" headers present');
      return;
    }

    header = this.headers[name][idx];
    value = header.raw;

    if(header.parsed) {
      return header.parsed;
    }

    //substitute '-' by '_' for grammar rule matching.
    name = name.replace(/-/g, '_');
    parsed = JsSIP.grammar_sip.parse(value, name);

    if(parsed === -1) {
      this.headers[name].splice(idx, 1); //delete from headers
      console.error(JsSIP.c.LOG_MESSAGE +'Error parsing Header ' + name + ':"' + value + '"');
      return;
    } else {
      header.parsed = parsed;
      return parsed;
    }
  },

  /**
   * Message Header attribute selector. Alias of parseHeader.
   * @param {String} name header name
   * @param {Number} [idx=0] header index
   * @returns {Object|undefined} Parsed header object, undefined if the header is not present or in case of a parsing error.
   *
   * @example
   * message.s('via',3).port
   */
  s: function(name, idx) {
    return this.parseHeader(name, idx);
  },

  /**
  * Replace the value of the given header by the value.
  * @param {String} name header name
  * @param {String} value header value
  */
  setHeader: function(name, value) {
    var header = { raw: value };
    this.headers[JsSIP.utils.headerize(name)] = [header];
  }
};

/**
 * @augments JsSIP.IncomingMessage
 * @class Class for incoming SIP request.
 */
JsSIP.IncomingRequest = (function() {

  var IncomingRequest = function() {
    this.headers = {};
    this.ruri = null;
    this.transport = null;
    this.server_transaction = null;
  };
  IncomingRequest.prototype = new JsSIP.IncomingMessage();

  /**
  * Stateful reply.
  * @param {Number} code status code
  * @param {String} reason reason phrase
  * @param {Object} headers extra headers
  * @param {String} body body
  * @param {Function} [onSuccess] onSuccess callback
  * @param {Function} [onFailure] onFailure callback
  */
  IncomingRequest.prototype.reply = function(code, reason, headers, body, onSuccess, onFailure) {
    var rr, vias, header, length,
      response = 'SIP/2.0 ' + code + ' ' + reason + '\r\n',
      to = this.to,
      r = 0,
      v = 0;


    if(this.method === JsSIP.c.INVITE && code > 100 && code <= 200) {
      rr = this.countHeader('record-route');

      for(r; r < rr; r++) {
        response += 'Record-Route: ' + this.getHeader('record-route', r) + '\r\n';
      }
    }

    vias = this.countHeader('via');

    for(v; v < vias; v++) {
      response += 'Via: ' + this.getHeader('via', v) + '\r\n';
    }

    response += 'Max-Forwards: ' + JsSIP.c.MAX_FORWARDS + '\r\n';

    if(code !== 100 && !this.to_tag) {
      to += ';tag=' + JsSIP.utils.newTag();
    } else if(this.to_tag && !this.s('to').tag) {
      to += ';tag=' + this.to_tag;
    }

    response += 'To: ' + to + '\r\n';
    response += 'From: ' + this.from + '\r\n';
    response += 'Call-ID: ' + this.call_id + '\r\n';
    response += 'CSeq: ' + this.cseq + ' ' + this.method + '\r\n';

    for(header in headers) {
      response += header + ': ' + headers[header] + '\r\n';
    }

    if(body) {
      length = JsSIP.utils.str_utf8_length(body);
      response += 'Content-Type: application/sdp\r\n';
      response += 'Content-Length: ' + length + '\r\n\r\n';
      response += body;
    } else {
      response += "\r\n";
    }

    this.server_transaction.receiveResponse(code, response, onSuccess, onFailure);
  };

  /**
  * Stateless reply.
  * @param {Number} code status code
  * @param {String} reason reason phrase
  */
  IncomingRequest.prototype.reply_sl = function(code, reason) {
    var to,
      response = 'SIP/2.0 ' + code + ' ' + reason + '\r\n',
      vias = this.countHeader('via');

    for(var v = 0; v < vias; v++) {
      response += 'Via: ' + this.getHeader('via', v) + '\r\n';
    }

    to = this.to;

    if(!this.to_tag) {
      to += ';tag=' + JsSIP.utils.newTag();
    }

    response += 'To: ' + to + '\r\n';
    response += 'From: ' + this.from + '\r\n';
    response += 'Call-ID: ' + this.call_id + '\r\n';
    response += 'CSeq: ' + this.cseq + ' ' + this.method + '\r\n\r\n';

    this.transport.send(response);
  };

  return IncomingRequest;
}());

/**
 * @augments JsSIP.IncomingMessage
 * @class Class for incoming SIP response.
 */
JsSIP.IncomingResponse = (function() {
  var IncomingResponse = function() {
    this.headers = {};
    this.response_code = null;
    this.reason_phrase = null;
  };
  IncomingResponse.prototype = new JsSIP.IncomingMessage();

  return IncomingResponse;
}());
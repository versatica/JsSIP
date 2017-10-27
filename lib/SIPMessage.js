const sdp_transform = require('sdp-transform');
const JsSIP_C = require('./Constants');
const Utils = require('./Utils');
const NameAddrHeader = require('./NameAddrHeader');
const Grammar = require('./Grammar');
const debug = require('debug')('JsSIP:SIPMessage');

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
class OutgoingRequest
{
  constructor(method, ruri, ua, params, extraHeaders, body)
  {
    // Mandatory parameters check.
    if (!method || !ruri || !ua)
    {
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
    if (params.route_set)
    {
      this.setHeader('route', params.route_set);
    }
    else if (ua.configuration.use_preloaded_route)
    {
      this.setHeader('route', `<${ua.transport.sip_uri};lr>`);
    }

    // Via.
    // Empty Via header. Will be filled by the client transaction.
    this.setHeader('via', '');

    // Max-Forwards.
    this.setHeader('max-forwards', JsSIP_C.MAX_FORWARDS);

    // To
    let to = (params.to_display_name || params.to_display_name === 0) ? `"${params.to_display_name}" ` : '';

    to += `<${params.to_uri || ruri}>`;
    to += params.to_tag ? `;tag=${params.to_tag}` : '';
    this.to = NameAddrHeader.parse(to);
    this.setHeader('to', to);

    // From.
    let from;

    if (params.from_display_name || params.from_display_name === 0)
    {
      from = `"${params.from_display_name}" `;
    }
    else if (ua.configuration.display_name)
    {
      from = `"${ua.configuration.display_name}" `;
    }
    else
    {
      from = '';
    }
    from += `<${params.from_uri || ua.configuration.uri}>;tag=`;
    from += params.from_tag || Utils.newTag();
    this.from = NameAddrHeader.parse(from);
    this.setHeader('from', from);

    // Call-ID.
    const call_id = params.call_id ||
      (ua.configuration.jssip_id + Utils.createRandomToken(15));

    this.call_id = call_id;
    this.setHeader('call-id', call_id);

    // CSeq.
    const cseq = params.cseq || Math.floor(Math.random() * 10000);

    this.cseq = cseq;
    this.setHeader('cseq', `${cseq} ${method}`);
  }

  /**
   * Replace the the given header by the given value.
   * -param {String} name header name
   * -param {String | Array} value header value
   */
  setHeader(name, value)
  {
    // Remove the header from extraHeaders if present.
    const regexp = new RegExp(`^\\s*${name}\\s*:`, 'i');

    for (let idx=0; idx<this.extraHeaders.length; idx++)
    {
      if (regexp.test(this.extraHeaders[idx]))
      {
        this.extraHeaders.splice(idx, 1);
      }
    }

    this.headers[Utils.headerize(name)] = (Array.isArray(value)) ? value : [ value ];
  }

  /**
   * Get the value of the given header name at the given position.
   * -param {String} name header name
   * -returns {String|undefined} Returns the specified header, null if header doesn't exist.
   */
  getHeader(name)
  {
    const headers = this.headers[Utils.headerize(name)];

    if (headers)
    {
      if (headers[0])
      {
        return headers[0];
      }
    }
    else
    {
      const regexp = new RegExp(`^\\s*${name}\\s*:`, 'i');

      for (const header of this.extraHeaders)
      {
        if (regexp.test(header))
        {
          return header.substring(header.indexOf(':')+1).trim();
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
  getHeaders(name)
  {
    const headers = this.headers[Utils.headerize(name)];
    const result = [];

    if (headers)
    {
      for (const header of headers)
      {
        result.push(header);
      }

      return result;
    }
    else
    {
      const regexp = new RegExp(`^\\s*${name}\\s*:`, 'i');

      for (const header of this.extraHeaders)
      {
        if (regexp.test(header))
        {
          result.push(header.substring(header.indexOf(':')+1).trim());
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
  hasHeader(name)
  {
    if (this.headers[Utils.headerize(name)])
    {
      return true;
    }
    else
    {
      const regexp = new RegExp(`^\\s*${name}\\s*:`, 'i');

      for (const header of this.extraHeaders)
      {
        if (regexp.test(header))
        {
          return true;
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
  parseSDP(force)
  {
    if (!force && this.sdp)
    {
      return this.sdp;
    }
    else
    {
      this.sdp = sdp_transform.parse(this.body || '');

      return this.sdp;
    }
  }

  toString()
  {
    let msg = `${this.method} ${this.ruri} SIP/2.0\r\n`;

    for (const headerName in this.headers)
    {
      if (Object.prototype.hasOwnProperty.call(this.headers, headerName))
      {
        for (const headerValue of this.headers[headerName])
        {
          msg += `${headerName}: ${headerValue}\r\n`;
        }
      }
    }

    for (const header of this.extraHeaders)
    {
      msg += `${header.trim()}\r\n`;
    }

    // Supported.
    const supported = [];

    switch (this.method)
    {
      case JsSIP_C.REGISTER:
        supported.push('path', 'gruu');
        break;
      case JsSIP_C.INVITE:
        if (this.ua.configuration.session_timers)
        {
          supported.push('timer');
        }
        if (this.ua.contact.pub_gruu || this.ua.contact.temp_gruu)
        {
          supported.push('gruu');
        }
        supported.push('ice', 'replaces');
        break;
      case JsSIP_C.UPDATE:
        if (this.ua.configuration.session_timers)
        {
          supported.push('timer');
        }
        supported.push('ice');
        break;
    }

    supported.push('outbound');

    // Allow.
    msg += `Allow: ${JsSIP_C.ALLOWED_METHODS}\r\n`;
    msg += `Supported: ${supported}\r\n`;
    msg += `User-Agent: ${JsSIP_C.USER_AGENT}\r\n`;

    if (this.body)
    {
      const length = Utils.str_utf8_length(this.body);

      msg += `Content-Length: ${length}\r\n\r\n`;
      msg += this.body;
    }
    else
    {
      msg += 'Content-Length: 0\r\n\r\n';
    }

    return msg;
  }

  clone()
  {
    const request = new OutgoingRequest(this.method, this.ruri, this.ua);

    Object.keys(this.headers).forEach(function(name)
    {
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
}

class InitialOutgoingInviteRequest extends OutgoingRequest
{
  constructor(ruri, ua, params, extraHeaders, body)
  {
    super(JsSIP_C.INVITE, ruri, ua, params, extraHeaders, body);

    this.transaction = null;
  }

  cancel(reason)
  {
    this.transaction.cancel(reason);
  }

  clone()
  {
    const request = new InitialOutgoingInviteRequest(this.ruri, this.ua);

    Object.keys(this.headers).forEach(function(name)
    {
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
}

class IncomingMessage
{
  constructor()
  {
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
  addHeader(name, value)
  {
    const header = { raw: value };

    name = Utils.headerize(name);

    if (this.headers[name])
    {
      this.headers[name].push(header);
    }
    else
    {
      this.headers[name] = [ header ];
    }
  }

  /**
   * Get the value of the given header name at the given position.
   */
  getHeader(name)
  {
    const header = this.headers[Utils.headerize(name)];

    if (header)
    {
      if (header[0])
      {
        return header[0].raw;
      }
    }
    else
    {
      return;
    }
  }

  /**
   * Get the header/s of the given name.
   */
  getHeaders(name)
  {
    const headers = this.headers[Utils.headerize(name)];
    const result = [];

    if (!headers)
    {
      return [];
    }

    for (const header of headers)
    {
      result.push(header.raw);
    }

    return result;
  }

  /**
   * Verify the existence of the given header.
   */
  hasHeader(name)
  {
    return (this.headers[Utils.headerize(name)]) ? true : false;
  }

  /**
  * Parse the given header on the given index.
  * -param {String} name header name
  * -param {Number} [idx=0] header index
  * -returns {Object|undefined} Parsed header object, undefined if the header
  *  is not present or in case of a parsing error.
  */
  parseHeader(name, idx = 0)
  {
    name = Utils.headerize(name);

    if (!this.headers[name])
    {
      debug(`header "${name}" not present`);

      return;
    }
    else if (idx >= this.headers[name].length)
    {
      debug(`not so many "${name}" headers present`);

      return;
    }

    const header = this.headers[name][idx];
    const value = header.raw;

    if (header.parsed)
    {
      return header.parsed;
    }

    // Substitute '-' by '_' for grammar rule matching.
    const parsed = Grammar.parse(value, name.replace(/-/g, '_'));

    if (parsed === -1)
    {
      this.headers[name].splice(idx, 1); // delete from headers
      debug(`error parsing "${name}" header field with value "${value}"`);

      return;
    }
    else
    {
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
  s(name, idx)
  {
    return this.parseHeader(name, idx);
  }

  /**
  * Replace the value of the given header by the value.
  * -param {String} name header name
  * -param {String} value header value
  */
  setHeader(name, value)
  {
    const header = { raw: value };

    this.headers[Utils.headerize(name)] = [ header ];
  }

  /**
   * Parse the current body as a SDP and store the resulting object
   * into this.sdp.
   * -param {Boolean} force: Parse even if this.sdp already exists.
   *
   * Returns this.sdp.
   */
  parseSDP(force)
  {
    if (!force && this.sdp)
    {
      return this.sdp;
    }
    else
    {
      this.sdp = sdp_transform.parse(this.body || '');

      return this.sdp;
    }
  }

  toString()
  {
    return this.data;
  }
}

class IncomingRequest extends IncomingMessage
{
  constructor(ua)
  {
    super();

    this.ua = ua;
    this.headers = {};
    this.ruri = null;
    this.transport = null;
    this.server_transaction = null;
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
  reply(code, reason, extraHeaders, body, onSuccess, onFailure)
  {
    const supported = [];
    let to = this.getHeader('To');

    code = code || null;
    reason = reason || null;

    // Validate code and reason values.
    if (!code || (code < 100 || code > 699))
    {
      throw new TypeError(`Invalid status_code: ${code}`);
    }
    else if (reason && typeof reason !== 'string' && !(reason instanceof String))
    {
      throw new TypeError(`Invalid reason_phrase: ${reason}`);
    }

    reason = reason || JsSIP_C.REASON_PHRASE[code] || '';
    extraHeaders = Utils.cloneArray(extraHeaders);

    let response = `SIP/2.0 ${code} ${reason}\r\n`;

    if (this.method === JsSIP_C.INVITE && code > 100 && code <= 200)
    {
      const headers = this.getHeaders('record-route');

      for (const header of headers)
      {
        response += `Record-Route: ${header}\r\n`;
      }
    }

    const vias = this.getHeaders('via');

    for (const via of vias)
    {
      response += `Via: ${via}\r\n`;
    }

    if (!this.to_tag && code > 100)
    {
      to += `;tag=${Utils.newTag()}`;
    }
    else if (this.to_tag && !this.s('to').hasParam('tag'))
    {
      to += `;tag=${this.to_tag}`;
    }

    response += `To: ${to}\r\n`;
    response += `From: ${this.getHeader('From')}\r\n`;
    response += `Call-ID: ${this.call_id}\r\n`;
    response += `CSeq: ${this.cseq} ${this.method}\r\n`;

    for (const header of extraHeaders)
    {
      response += `${header.trim()}\r\n`;
    }

    // Supported.
    switch (this.method)
    {
      case JsSIP_C.INVITE:
        if (this.ua.configuration.session_timers)
        {
          supported.push('timer');
        }
        if (this.ua.contact.pub_gruu || this.ua.contact.temp_gruu)
        {
          supported.push('gruu');
        }
        supported.push('ice', 'replaces');
        break;
      case JsSIP_C.UPDATE:
        if (this.ua.configuration.session_timers)
        {
          supported.push('timer');
        }
        if (body)
        {
          supported.push('ice');
        }
        supported.push('replaces');
    }

    supported.push('outbound');

    // Allow and Accept.
    if (this.method === JsSIP_C.OPTIONS)
    {
      response += `Allow: ${JsSIP_C.ALLOWED_METHODS}\r\n`;
      response += `Accept: ${JsSIP_C.ACCEPTED_BODY_TYPES}\r\n`;
    }
    else if (code === 405)
    {
      response += `Allow: ${JsSIP_C.ALLOWED_METHODS}\r\n`;
    }
    else if (code === 415)
    {
      response += `Accept: ${JsSIP_C.ACCEPTED_BODY_TYPES}\r\n`;
    }

    response += `Supported: ${supported}\r\n`;

    if (body)
    {
      const length = Utils.str_utf8_length(body);

      response += 'Content-Type: application/sdp\r\n';
      response += `Content-Length: ${length}\r\n\r\n`;
      response += body;
    }
    else
    {
      response += `Content-Length: ${0}\r\n\r\n`;
    }

    this.server_transaction.receiveResponse(code, response, onSuccess, onFailure);
  }

  /**
  * Stateless reply.
  * -param {Number} code status code
  * -param {String} reason reason phrase
  */
  reply_sl(code = null, reason = null)
  {
    const vias = this.getHeaders('via');

    // Validate code and reason values.
    if (!code || (code < 100 || code > 699))
    {
      throw new TypeError(`Invalid status_code: ${code}`);
    }
    else if (reason && typeof reason !== 'string' && !(reason instanceof String))
    {
      throw new TypeError(`Invalid reason_phrase: ${reason}`);
    }

    reason = reason || JsSIP_C.REASON_PHRASE[code] || '';

    let response = `SIP/2.0 ${code} ${reason}\r\n`;

    for (const via of vias)
    {
      response += `Via: ${via}\r\n`;
    }

    let to = this.getHeader('To');

    if (!this.to_tag && code > 100)
    {
      to += `;tag=${Utils.newTag()}`;
    }
    else if (this.to_tag && !this.s('to').hasParam('tag'))
    {
      to += `;tag=${this.to_tag}`;
    }

    response += `To: ${to}\r\n`;
    response += `From: ${this.getHeader('From')}\r\n`;
    response += `Call-ID: ${this.call_id}\r\n`;
    response += `CSeq: ${this.cseq} ${this.method}\r\n`;
    response += `Content-Length: ${0}\r\n\r\n`;

    this.transport.send(response);
  }
}

class IncomingResponse extends IncomingMessage
{
  constructor()
  {
    super();

    this.headers = {};
    this.status_code = null;
    this.reason_phrase = null;
  }
}

module.exports = {
  OutgoingRequest,
  InitialOutgoingInviteRequest,
  IncomingRequest,
  IncomingResponse
};


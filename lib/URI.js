const JsSIP_C = require('./Constants');
const Utils = require('./Utils');
const Grammar = require('./Grammar');

/**
 * -param {String} [scheme]
 * -param {String} [user]
 * -param {String} host
 * -param {String} [port]
 * -param {Object} [parameters]
 * -param {Object} [headers]
 *
 */
module.exports = class URI
{
  /**
    * Parse the given string and returns a JsSIP.URI instance or undefined if
    * it is an invalid URI.
    */
  static parse(uri)
  {
    uri = Grammar.parse(uri, 'SIP_URI');

    if (uri !== -1)
    {
      return uri;
    }
    else
    {
      return undefined;
    }
  }

  constructor(scheme, user, host, port, parameters = {}, headers = {})
  {
    // Checks
    if (!host)
    {
      throw new TypeError('missing or invalid "host" parameter');
    }

    // Initialize parameters
    this._parameters = {};
    this._headers = {};

    this._scheme = scheme || JsSIP_C.SIP;
    this._user = user;
    this._host = host;
    this._port = port;

    for (const param in parameters)
    {
      if (Object.prototype.hasOwnProperty.call(parameters, param))
      {
        this.setParam(param, parameters[param]);
      }
    }

    for (const header in headers)
    {
      if (Object.prototype.hasOwnProperty.call(headers, header))
      {
        this.setHeader(header, headers[header]);
      }
    }
  }

  get scheme()
  {
    return this._scheme;
  }

  set scheme(value)
  {
    this._scheme = value.toLowerCase();
  }

  get user()
  {
    return this._user;
  }

  set user(value)
  {
    this._user = value;
  }

  get host()
  {
    return this._host;
  }

  set host(value)
  {
    this._host = value.toLowerCase();
  }

  get port()
  {
    return this._port;
  }

  set port(value)
  {
    this._port = value === 0 ? value : (parseInt(value, 10) || null);
  }

  setParam(key, value)
  {
    if (key)
    {
      this._parameters[key.toLowerCase()] = (typeof value === 'undefined' || value === null) ? null : value.toString();
    }
  }

  getParam(key)
  {
    if (key)
    {
      return this._parameters[key.toLowerCase()];
    }
  }

  hasParam(key)
  {
    if (key)
    {
      return (this._parameters.hasOwnProperty(key.toLowerCase()) && true) || false;
    }
  }

  deleteParam(parameter)
  {
    parameter = parameter.toLowerCase();
    if (this._parameters.hasOwnProperty(parameter))
    {
      const value = this._parameters[parameter];

      delete this._parameters[parameter];

      return value;
    }
  }

  clearParams()
  {
    this._parameters = {};
  }

  setHeader(name, value)
  {
    this._headers[Utils.headerize(name)] = (Array.isArray(value)) ? value : [ value ];
  }

  getHeader(name)
  {
    if (name)
    {
      return this._headers[Utils.headerize(name)];
    }
  }

  hasHeader(name)
  {
    if (name)
    {
      return (this._headers.hasOwnProperty(Utils.headerize(name)) && true) || false;
    }
  }

  deleteHeader(header)
  {
    header = Utils.headerize(header);
    if (this._headers.hasOwnProperty(header))
    {
      const value = this._headers[header];

      delete this._headers[header];

      return value;
    }
  }

  clearHeaders()
  {
    this._headers = {};
  }

  clone()
  {
    return new URI(
      this._scheme,
      this._user,
      this._host,
      this._port,
      JSON.parse(JSON.stringify(this._parameters)),
      JSON.parse(JSON.stringify(this._headers)));
  }

  toString()
  {
    const headers = [];

    let uri = `${this._scheme}:`;

    if (this._user)
    {
      uri += `${Utils.escapeUser(this._user)}@`;
    }
    uri += this._host;
    if (this._port || this._port === 0)
    {
      uri += `:${this._port}`;
    }

    for (const parameter in this._parameters)
    {
      if (Object.prototype.hasOwnProperty.call(this._parameters, parameter))
      {
        uri += `;${parameter}`;

        if (this._parameters[parameter] !== null)
        {
          uri += `=${this._parameters[parameter]}`;
        }
      }
    }

    for (const header in this._headers)
    {
      if (Object.prototype.hasOwnProperty.call(this._headers, header))
      {
        for (const item of this._headers[header])
        {
          headers.push(`${header}=${item}`);
        }
      }
    }

    if (headers.length > 0)
    {
      uri += `?${headers.join('&')}`;
    }

    return uri;
  }

  toAor(show_port)
  {
    let aor = `${this._scheme}:`;

    if (this._user)
    {
      aor += `${Utils.escapeUser(this._user)}@`;
    }
    aor += this._host;
    if (show_port && (this._port || this._port === 0))
    {
      aor += `:${this._port}`;
    }

    return aor;
  }
};

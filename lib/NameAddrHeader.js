const Utils = require('./Utils');

module.exports = class NameAddrHeader
{
  /**
   * Parse the given string and returns a NameAddrHeader instance or undefined if
   * it is an invalid NameAddrHeader.
   */
  static parse(name_addr_header)
  {
    return Utils.parseNameAddrHeader(name_addr_header);
  }

  constructor(uri, display_name, parameters)
  {
    // Checks.
    if (!Utils.isValidURI(uri))
    {
      throw new TypeError('missing or invalid "uri" parameter');
    }

    // Initialize parameters.
    this._uri = uri;
    this._parameters = {};
    this.display_name = display_name;

    for (const param in parameters)
    {
      if (Object.prototype.hasOwnProperty.call(parameters, param))
      {
        this.setParam(param, parameters[param]);
      }
    }
  }

  get uri()
  {
    return this._uri;
  }

  get display_name()
  {
    return this._display_name;
  }

  set display_name(value)
  {
    this._display_name = (value === 0) ? '0' : value;
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

  clone()
  {
    return new NameAddrHeader(
      this._uri.clone(),
      this._display_name,
      JSON.parse(JSON.stringify(this._parameters)));
  }

  _quote(str)
  {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"');
  }

  toString()
  {
    let body = this._display_name ? `"${this._quote(this._display_name)}" ` : '';

    body += `<${this._uri.toString()}>`;

    for (const parameter in this._parameters)
    {
      if (Object.prototype.hasOwnProperty.call(this._parameters, parameter))
      {
        body += `;${parameter}`;

        if (this._parameters[parameter] !== null)
        {
          body += `=${this._parameters[parameter]}`;
        }
      }
    }

    return body;
  }
};

'use strict';

/**
 * Dependencies.
 */
const URI = require('./URI');
const Grammar = require('./Grammar');


class NameAddrHeader {
  constructor(uri, display_name, parameters) {
    let param;

    // Checks
    if(!uri || !(uri instanceof URI)) {
      throw new TypeError('missing or invalid "uri" parameter');
    }

    // Initialize parameters
    this.uri = uri;
    this.parameters = {};

    for (param in parameters) {
      this.setParam(param, parameters[param]);
    }

    Object.defineProperties(this, {
      display_name: {
        get: function() { return display_name; },
        set: function(value) {
          display_name = (value === 0) ? '0' : value;
        }
      }
    });
  }

  setParam(key, value) {
    if (key) {
      this.parameters[key.toLowerCase()] = (typeof value === 'undefined' || value === null) ? null : value.toString();
    }
  }

  getParam(key) {
    if(key) {
      return this.parameters[key.toLowerCase()];
    }
  }

  hasParam(key) {
    if(key) {
      return (this.parameters.hasOwnProperty(key.toLowerCase()) && true) || false;
    }
  }

  deleteParam(parameter) {
    let value;
    parameter = parameter.toLowerCase();
    if (this.parameters.hasOwnProperty(parameter)) {
      value = this.parameters[parameter];
      delete this.parameters[parameter];
      return value;
    }
  }

  clearParams() {
    this.parameters = {};
  }

  clone() {
    return new NameAddrHeader(
      this.uri.clone(),
      this.display_name,
      JSON.parse(JSON.stringify(this.parameters)));
  }

  toString() {
    let body, parameter;

    body  = (this.display_name || this.display_name === 0) ? `"${this.display_name}" ` : '';
    body += `<${this.uri.toString()}>`;

    for (parameter in this.parameters) {
      body += `;${parameter}`;

      if (this.parameters[parameter] !== null) {
        body += `=${this.parameters[parameter]}`;
      }
    }

    return body;
  }
}


/**
  * Parse the given string and returns a NameAddrHeader instance or undefined if
  * it is an invalid NameAddrHeader.
  */
NameAddrHeader.parse = name_addr_header => {
  name_addr_header = Grammar.parse(name_addr_header,'Name_Addr_Header');

  if (name_addr_header !== -1) {
    return name_addr_header;
  } else {
    return undefined;
  }
};

module.exports = NameAddrHeader;

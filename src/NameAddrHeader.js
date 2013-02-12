
/**
 * @augments JsSIP
 * @class Class creating a Name Address SIP header.
 *
 * @param {JsSIP.URI} uri
 * @param {String} [display_name]
 * @param {Object} [parameters]
 *
 */
JsSIP.NameAddrHeader = function(uri, display_name, parameters) {
  var param;

  // Checks
  if(!uri || !uri instanceof JsSIP.URI) {
    console.error(JsSIP.C.LOG_NAME_ADDR_HEADER + 'missing or invalid "uri" parameter');
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
        display_name = value;
      }
    }
  });
};
JsSIP.NameAddrHeader.prototype = {
  setParam: function(key, value) {
    if (key) {
      this.parameters[key.toLowerCase()] = (typeof value === 'undefined' || value === null)? null : value.toString().toLowerCase();
    }
  },

  getParam: function(key) {
    if(key) {
      return this.parameters[key.toLowerCase()];
    }
  },

  hasParam: function(key) {
    if(key) {
      return this.parameters.hasOwnProperty(key.toLowerCase()) && true || false;
    }
  },

  deleteParam: function(parameter) {
    var value;
    parameter = parameter.toLowerCase();
    if (this.parameters.hasOwnProperty(parameter)) {
      value = this.parameters[parameter];
      delete this.parameters[parameter];
      return value;
    }
  },

  clearParams: function() {
    this.parameters = {};
  },

  clone: function() {
    return new JsSIP.NameAddrHeader(
      this.uri.clone(),
      this.display_name,
      window.JSON.parse(window.JSON.stringify(this.parameters)));
  },

  toString: function() {
    var body, parameter;

    body  = (this.display_name) ? '"' + this.display_name + '" ' : '';
    body += '<' + this.uri.toString() + '>';

    for (parameter in this.parameters) {
      body += ';' + parameter;
      body += (this.parameters[parameter] === null)? '' : '=' + this.parameters[parameter];
    }

    return body;
  }
};
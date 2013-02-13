/**
 * @augments JsSIP
 * @class Class creating a SIP URI.
 *
 * @param {String} [scheme]
 * @param {String} [user]
 * @param {String} host
 * @param {String} [port]
 * @param {Object} [parameters]
 * @param {Object} [headers]
 *
 */
JsSIP.URI = function(scheme, user, host, port, parameters, headers) {
  var param, header;

  // Checks
  if(!host) {
    throw new TypeError('missing or invalid "host" parameter');
  }

  scheme = scheme || JsSIP.C.SIP;

  // Initialize parameters
  this.parameters = {};
  this.headers = {};

  for (param in parameters) {
    this.setParam(param, parameters[param]);
  }

  for (header in headers) {
    this.setHeader(header, headers[header]);
  }

  Object.defineProperties(this, {
    scheme: {
      get: function(){ return scheme; },
      set: function(value){
        scheme = value.toLowerCase();
      }
    },

    user: {
      get: function(){ return user; },
      set: function(value){
        user = value;
      }
    },

    host: {
      get: function(){ return host; },
      set: function(value){
        host = value.toLowerCase();
      }
    },
    port: {
      get: function(){ return port; },
      set: function(value){
        port = parseInt(value,10);
      }
    }
  });
};
JsSIP.URI.prototype = {
  setParam: function(key, value) {
    if(key) {
      this.parameters[key.toLowerCase()] = (typeof value === 'undefined' || value === null) ? null : value.toString().toLowerCase();
    }
  },

  getParam: function(key) {
    if(key) {
      return this.parameters[key.toLowerCase()];
    }
  },

  hasParam: function(key) {
    if(key) {
      return (this.parameters.hasOwnProperty(key.toLowerCase()) && true) || false;
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

  setHeader: function(name, value) {
    this.headers[JsSIP.Utils.headerize(name)] = (value instanceof Array) ? value : [value];
  },

  getHeader: function(name) {
    if(name) {
      return this.headers[JsSIP.Utils.headerize(name)];
    }
  },

  hasHeader: function(name) {
    if(name) {
      return (this.headers.hasOwnProperty(name.toLowerCase()) && true) || false;
    }
  },

  deleteHeader: function(header) {
    var value;
    header = JsSIP.Utils.headerize(header);
    if(this.headers.hasOwnProperty(header)) {
      value = this.headers[header];
      delete this.headers[header];
      return value;
    }
  },

  clearHeaders: function() {
    this.headers = {};
  },

  clone: function() {
    return new JsSIP.URI(
      this.scheme,
      this.user,
      this.host,
      this.port,
      window.JSON.parse(window.JSON.stringify(this.parameters)),
      window.JSON.parse(window.JSON.stringify(this.headers)));
  },

  toString: function(){
    var header, parameter, idx, uri,
      headers = [];

    uri  = this.scheme + ':';
    uri += this.user ? JsSIP.Utils.escapeUser(this.user) + '@' : '';
    uri += this.host;
    uri += this.port ? ':' + this.port : '';

    for (parameter in this.parameters) {
      uri += ';'+ parameter;
      uri += (this.parameters[parameter] === null) ? '' : '=' + this.parameters[parameter];
    }

    for(header in this.headers) {
      for(idx in this.headers[header]) {
        headers.push(header + '=' + this.headers[header][idx]);
      }
    }

    if (headers.length > 0) {
      uri += '?' + headers.join('&');
    }

    return uri;
  },
  toAor: function(){
      var aor;

      aor  = this.scheme + ':';
      aor += this.user ? JsSIP.Utils.escapeUser(this.user) + '@' : '';
      aor += this.host;

      return aor;
  }
};
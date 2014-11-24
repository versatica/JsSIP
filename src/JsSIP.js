/**
 * The main namespace.
 * @namespace JsSIP
 */
var JsSIP = {
  C: require('./Constants'),
  Exceptions: require('./Exceptions'),
  Utils: require('./Utils'),
  UA: require('./UA'),
  URI: require('./URI'),
  NameAddrHeader: require('./NameAddrHeader'),
  Grammar: require('./Grammar'),
  // Expose the debug module.
  debug: require('debug')
};

module.exports = JsSIP;


var pkg = require('../package.json');
var RTCSession = require('./RTCSession');


Object.defineProperties(JsSIP, {
  name: {
    get: function() { return pkg.title; }
  },

  version: {
    get: function() { return pkg.version; }
  },

  rtcEngine: {
    set: function(engine) {
      RTCSession.RTCEngine = engine;
    }
  }
});

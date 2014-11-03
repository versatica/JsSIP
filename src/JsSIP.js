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
  Grammar: require('./Grammar')
};

module.exports = JsSIP;


var pkg = require('../package.json');


Object.defineProperties(JsSIP, {
  name: {
    get: function(){ return pkg.title; }
  },

  /**
   * Retrieve the version of JsSIP.
   * @memberof JsSIP
   * @method
   * @returns {String} Version in the form "X.Y.Z"
   * @example
   * // prints "1.0.0"
   * console.log(JsSIP.version)
   */
  version: {
    get: function(){ return pkg.version; }
  }
});

/**
 * @fileoverview Message
 */

/**
 * @augments JsSIP
 * @class Class creating a logger.
 * @param {String} ua
 */
(function(JsSIP) {
var Logger;

Logger = function(name) {
  this.prefix = JsSIP.name + ' | ' + name  + ' | ';
};

Logger.prototype = {
  error: function(msg) {
    console.error(this.prefix + msg);
  },
  log: function(msg) {
    console.log(this.prefix + msg);
  },
  warn: function(msg) {
    console.warn(this.prefix + msg);
  }
};

JsSIP.Logger = Logger;
}(JsSIP));

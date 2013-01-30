/*global console: false*/

/**
 * @name JsSIP
 * @namespace
 */
(function(window) {
var JsSIP = (function() {
  "use strict";
  var
    productName = 'JsSIP',
    productVersion = 'devel';

  return {
    name: function() {
      return productName;
    },
    version: function() {
      return productVersion;
    }
  };
}());

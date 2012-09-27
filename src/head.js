/*global console: false*/

/**
 * @name JsSIP
 * @namespace
 */
(function(window) {
var JsSIP = (function() {
  var
    productName = 'JsSIP',
    svnRevision = '712',
    productVersion = '0.1.0';

  return {
    name: function() {
      return productName;
    },
    version: function() {
      return productVersion;
    },
    svn_revision: function() {
      return svnRevision;
    }
  };
}());

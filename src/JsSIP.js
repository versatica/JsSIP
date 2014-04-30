/*global console: false*/

/**
 * @name JsSIP
 * @namespace
 */
(function(window) {

var JsSIP = (function() {
  "use strict";

  var JsSIP = {};

  Object.defineProperties(JsSIP, {
    version: {
      get: function(){ return '<%= pkg.version %>'; }
    },
    name: {
      get: function(){ return '<%= pkg.title %>'; }
    }
  });

  (function () {
    var LOG_PREFIX = JsSIP.name;
    var browserMethods = ["log","info","warn","error","assert","dir","clear","profile","profileEnd"];
    var lf = function (method) {
      return function () {
        if (!JSON.parse('<%= pkg.debug %>')) {
          return;
        }
        console[method].apply(console, [LOG_PREFIX].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };

    browserMethods.forEach( function (method) {
      JsSIP[method] = lf(method);
    });
  })();

  return JsSIP;
}());

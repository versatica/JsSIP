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

  return JsSIP;
}());

// Register as AMD module
if(typeof window.define === "function" && window.define.amd) {
  define([], function(){
    return JsSIP;
  });
}
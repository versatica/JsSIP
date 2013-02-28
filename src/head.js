/*
 * JsSIP
 * Copyright (c) 2012-2013 José Luis Millán - Versatica <http://www.versatica.com>
 * MIT License
 */

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
    productVersion = '0.3.0-devel';

  return {
    name: function() {
      return productName;
    },
    version: function() {
      return productVersion;
    }
  };
}());

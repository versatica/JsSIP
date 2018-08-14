'use strict';

//const adapter = require('webrtc-adapter');
var pkg = require('../package.json');
var C = require('./Constants');
var Exceptions = require('./Exceptions');
var Utils = require('./Utils');
var UA = require('./UA');
var URI = require('./URI');
var NameAddrHeader = require('./NameAddrHeader');
var Grammar = require('./Grammar');
var WebSocketInterface = require('./WebSocketInterface');
var debug = require('react-native-debug')('JsSIP');

debug('version %s', pkg.version);

/**
 * Expose the JsSIP module.
 */
module.exports = {
  C: C,
  Exceptions: Exceptions,
  Utils: Utils,
  UA: UA,
  URI: URI,
  NameAddrHeader: NameAddrHeader,
  WebSocketInterface: WebSocketInterface,
  Grammar: Grammar,
  // Expose the debug module.
  debug: require('react-native-debug'),
  // Expose the adapter module.
  //adapter,
  get name() {
    return pkg.title;
  },
  get version() {
    return pkg.version;
  }
};
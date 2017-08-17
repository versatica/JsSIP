

/**
 * Dependencies.
 */
const debug = require('debug')('JsSIP');
const adapter = require('webrtc-adapter');
const pkg = require('../package.json');

debug('version %s', pkg.version);

const C = require('./Constants');
const Exceptions = require('./Exceptions');
const Utils = require('./Utils');
const UA = require('./UA');
const URI = require('./URI');
const NameAddrHeader = require('./NameAddrHeader');
const Grammar = require('./Grammar');
const WebSocketInterface = require('./WebSocketInterface');


/**
 * Expose the JsSIP module.
 */
module.exports = {
  C                  : C,
  Exceptions         : Exceptions,
  Utils              : Utils,
  UA                 : UA,
  URI                : URI,
  NameAddrHeader     : NameAddrHeader,
  WebSocketInterface : WebSocketInterface,
  Grammar            : Grammar,
  // Expose the debug module.
  debug              : require('debug'),
  // Expose the adapter module.
  adapter            : adapter,
  get name() { return pkg.title; },
  get version() { return pkg.version; }
};

const pkg = require('../package.json');
const C = require('./Constants');
const Exceptions = require('./Exceptions');
const Utils = require('./Utils');
const UA = require('./UA');
const URI = require('./URI');
const NameAddrHeader = require('./NameAddrHeader');
const Grammar = require('./Grammar');
const WebSocketInterface = require('./WebSocketInterface');
const JsSIPDebug = require('./JsSIPDebug');

const debug = JsSIPDebug('JsSIP');

debug('version %s', pkg.version);

/**
 * Expose the JsSIP module.
 */
module.exports = {
  C,
  Exceptions,
  Utils,
  UA,
  URI,
  NameAddrHeader,
  WebSocketInterface,
  Grammar,
  // Expose the debug module.
  debug : JsSIPDebug,
  get name() { return pkg.title; },
  get version() { return pkg.version; }
};

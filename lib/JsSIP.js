const pkg = require('../package.json');
const C = require('./Constants');
const Exceptions = require('./Exceptions');
const Utils = require('./Utils');
const UA = require('./UA');
const URI = require('./URI');
const NameAddrHeader = require('./NameAddrHeader');
const Grammar = require('./Grammar');
const WebSocketInterface = require('./WebSocketInterface');
const Logger = require('./Logger');

const logger = new Logger('JsSIP');

logger.debug('version %s', pkg.version);

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
  // Expose the Logger module (for its static methods)
  Logger,

  /**
   * @deprecated debug should not be used, use Logger instead
   */
  debug : {
    enable  : Logger.enable,
    disable : Logger.disable
  },
  get name() { return pkg.title; },
  get version() { return pkg.version; }
};

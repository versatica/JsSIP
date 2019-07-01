const Config = require('./Config');
const C = require('./Constants');
const Dialog = require('./Dialog');
const DigestAuthentication = require('./DigestAuthentication');
const Exceptions = require('./Exceptions');
const Grammar = require('./Grammar');
const Message = require('./Message');
const NameAddrHeader = require('./NameAddrHeader');
const Parser = require('./Parser');
const Registrator = require('./Registrator');
const RequestSender = require('./RequestSender');
const RTCSession = require('./RTCSession');
const sanityCheck = require('./sanityCheck');
const SIPMessage = require('./SIPMessage');
const Socket = require('./Socket');
const Timers = require('./Timers');
const Transactions = require('./Transactions');
const Transport = require('./Transport');
const UA = require('./UA');
const URI = require('./URI');
const Utils = require('./Utils');
const WebSocketInterface = require('./WebSocketInterface');

const pkg = require('../package.json');
const debug = require('debug')('JsSIP');

debug('version %s', pkg.version);

/**
 * Expose the JsSIP module.
 */
module.exports = {
  C,
  Config,
  Dialog,
  DigestAuthentication,
  Exceptions,
  Grammar,
  Message,
  NameAddrHeader,
  Parser,
  Registrator,
  RequestSender,
  RTCSession,
  sanityCheck,
  SIPMessage,
  Socket,
  Timers,
  Transactions,
  Transport,
  UA,
  URI,
  Utils,
  WebSocketInterface,
  // Expose the debug module.
  debug : require('debug'),
  get name() { return pkg.title; },
  get version() { return pkg.version; }
};


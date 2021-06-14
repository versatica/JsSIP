const debug = require('debug');

const APP_NAME = 'JsSIP';

/* eslint-disable no-console */
let defaultDebugLog = console.info.bind(console);
let defaultWarnLog = console.warn.bind(console);
let defaultErrorLog = console.error.bind(console);
/* eslint-enable no-console */


module.exports = class Logger
{

  /**
   * Static setter for debug logger
   * @param {(...any:[]) => void} loggerFn 
   */
  static setDefaultDebugLog(loggerFn) { defaultDebugLog = loggerFn; }

  /**
   * Static setter for warn logger
   * @param {(...any:[]) => void} loggerFn 
   */
  static setDefaultWarnLog(loggerFn) { defaultWarnLog = loggerFn; }

  /**
   * Static setter for error logger
   * @param {(...any:[]) => void} loggerFn 
   */
  static setDefaultErrorLog(loggerFn) { defaultErrorLog = loggerFn; }

  /**
   * Enable debug for namespaces (no namespace = all)
   * @param {string} [namespaces] optional
   */
  static enable(namespaces) { debug.enable(namespaces); }

  /**
   * Disable debug
   */
  static disable() { debug.disable(); }

  /**
   * 
   * @param {string} prefix namespace prefix
   */
  constructor(prefix)
  {
    if (prefix)
    {
      this._debug = debug.default(`${APP_NAME}:${prefix}`);
      this._warn = debug.default(`${APP_NAME}:WARN:${prefix}`);
      this._error = debug.default(`${APP_NAME}:ERROR:${prefix}`);
    }
    else
    {
      this._debug = debug.default(APP_NAME);
      this._warn = debug.default(`${APP_NAME}:WARN`);
      this._error = debug.default(`${APP_NAME}:ERROR`);
    }

    this._debug.log = (...args) => defaultDebugLog(...args);
    this._warn.log = (...args) => defaultWarnLog(...args);
    this._error.log = (...args) => defaultErrorLog(...args);

  }

  get debug()
  {
    return this._debug;
  }

  get warn()
  {
    return this._warn;
  }

  get error()
  {
    return this._error;
  }
};
const debug = require('debug');

// eslint-disable-next-line no-console
let defaultLogFn = console.log.bind(console);
let defaultErrorLogFn = console.warn.bind(console);

/**
 * Factory for logs
 * It will append the isError setter property
 * and the log readonly property
 * @example
 * const dbg = createDebug('my-namespace');
 * const dbgerror = createDebug('my-namespace');
 * dbgerror.isError = true; // will make dbgerror use the error log fn
 * 
 * @param  {...any} args 
 * @returns 
 */
function createDebug(...args) 
{

  const d = debug.default.apply(this, args);
  
  let isError = false;
  
  d.log = (...a) => 
  {
    return isError ? defaultErrorLogFn(...a) : defaultLogFn(...a);
  };

  Object.defineProperties(d, {
    isError : {
      enumerable : true,
      set        : (value) => 
      {
        isError = value === true;
      },
      get : () => 
      {
        return isError;
      }
    },
    log : {
      enumerable   : true,
      configurable : false,
      writable     : false,
      value        : d.log
    }
  });

  return d;
}

function JsSIPDebug(...params) 
{
  return createDebug.call(this, ...params);
}

JsSIPDebug.default = createDebug.bind(JsSIPDebug);

// Wrap debug methods
JsSIPDebug.coerce = debug.coerce.bind(debug);
JsSIPDebug.enable = debug.enable.bind(debug);
JsSIPDebug.disable = debug.disable.bind(debug);
JsSIPDebug.enabled = debug.enabled.bind(debug);
JsSIPDebug.humanize = debug.humanize.bind(debug);
JsSIPDebug.formatArgs = debug.formatArgs.bind(debug);
JsSIPDebug.save = debug.save.bind(debug);
JsSIPDebug.load = debug.load.bind(debug);
JsSIPDebug.useColors = debug.useColors.bind(debug);
JsSIPDebug.selectColor = debug.selectColor.bind(debug);
JsSIPDebug.colors = debug.colors;

// Additional methods

/**
 * Set the default logger function
 * @param {(...any[])=>void} loggerFn logger
 */
JsSIPDebug.setLogger = (loggerFn) => 
{
  defaultLogFn = loggerFn;
};

/**
 * Set the default error logger function for errors
 * @param {(...any[])=>void} loggerFn logger
 */
JsSIPDebug.setErrorLogger = (loggerFn) => 
{
  defaultErrorLogFn = loggerFn;
};

module.exports = JsSIPDebug;
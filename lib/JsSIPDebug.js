const debug = require('debug');

// eslint-disable-next-line no-console
let defaultLogFn = console.log.bind(console);
let defaultErrorLogFn = console.warn.bind(console);

function JsSIPDebug(...args)
{
  const d = debug.apply(this, args);

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

JsSIPDebug.setLogger = (loggerFn) => 
{
  defaultLogFn = loggerFn;
};

JsSIPDebug.setErrorLogger = (loggerFn) => 
{
  defaultErrorLogFn = loggerFn;
};

module.exports = JsSIPDebug;
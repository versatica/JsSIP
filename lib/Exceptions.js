'use strict';

/**
 * @namespace Exceptions
 * @memberOf JsSIP
 */
const Exceptions = {
  /**
   * Exception thrown when a valid parameter is given to the JsSIP.UA constructor.
   * @class ConfigurationError
   * @memberOf JsSIP.Exceptions
   */
  ConfigurationError: ((() => {
    const exception = function(parameter, value) {
      this.code = 1;
      this.name = 'CONFIGURATION_ERROR';
      this.parameter = parameter;
      this.value = value;
      this.message = (!this.value)? 'Missing parameter: '+ this.parameter : 'Invalid value '+ JSON.stringify(this.value) +' for parameter "'+ this.parameter +'"';
    };
    exception.prototype = new Error();
    return exception;
  })()),

  InvalidStateError: ((() => {
    const exception = function(status) {
      this.code = 2;
      this.name = 'INVALID_STATE_ERROR';
      this.status = status;
      this.message = 'Invalid status: '+ status;
    };
    exception.prototype = new Error();
    return exception;
  })()),

  NotSupportedError: ((() => {
    const exception = function(message) {
      this.code = 3;
      this.name = 'NOT_SUPPORTED_ERROR';
      this.message = message;
    };
    exception.prototype = new Error();
    return exception;
  })()),

  NotReadyError: ((() => {
    class exception extends Error {
      constructor(message) {
        this.code = 4;
        this.name = 'NOT_READY_ERROR';
        this.message = message;
      }
    }

    return exception;
  })())
};


module.exports = Exceptions;


/**
 * @fileoverview JsSIP exceptions
 */

/**
 * JsSIP Exceptions.
 * @augments JsSIP
 */

JsSIP.Exceptions= {
  ConfigurationError: (function(){
    var exception = function(parameter, value) {
      this.code = 1;
      this.name = 'CONFIGURATION_ERROR';
      this.parameter = parameter;
      this.value = value;
      this.message = (!this.value)? 'Missing parameter: '+ this.parameter : 'Invalid parameter '+ this.parameter +' with value '+ this.value;
    };
    exception.prototype = new Error();
    return exception;
  }()),

  NotReadyError: (function(){
    var exception = function(status, error) {
      this.code = 2;
      this.status = status;
      this.error = error;
      this.name = 'NOT_READY_ERROR';
    };
    exception.prototype = new Error();
    return exception;
  }()),

  InvalidTargetError: (function(){
    var exception = function(target) {
      this.code = 3;
      this.name = 'INVALID_TARGET_ERROR';
      this.target = target;
      this.message = 'Invalid target: ' + this.target;
    };
    exception.prototype = new Error();
    return exception;
  }()),

  WebRtcNotSupportedError: (function(){
    var exception = function(){
      this.code = 4;
      this.name = 'WEBRTC_NO_SUPPORTED_ERROR';
    };
    exception.prototype = new Error();
    return exception;
  }()),

  InvalidStateError: (function(){
    var exception = function(status) {
      this.code = 5;
      this.name = 'INVALID_STATE_ERROR';
      this.status = status;
    };
    exception.prototype = new Error();
    return exception;
  }()),

  InvalidMethodError: (function(){
    var exception = function(method) {
      this.code = 6;
      this.name = 'INVALID_METHOD_ERROR';
      this.method = method;
      this.message = 'Invalid method: '+ this.method;
    };
    exception.prototype = new Error();
    return exception;
  }()),

  InvalidValueError: (function(){
    var exception = function(argument, value) {
      this.code = 7;
      this.name = 'INVALID_VALUE_ERROR';
      this.argument = argument;
      this.value = value;
      this.message = 'Invalid argument '+ this.argument +' with value '+ this.value;
    };
    exception.prototype = new Error();
    return exception;
  }())
};
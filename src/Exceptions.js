
/**
 * @fileoverview JsSIP exceptions
 */

/**
 * JsSIP Exceptions.
 * @augments JsSIP
 */

JsSIP.Exceptions= {
  ConfigurationError: (function(){
    var exception = function() {
      this.code = 1;
      this.name = 'CONFIGURATION_ERROR';
      this.message = JsSIP.C.LOG_EXCEPTION + this.code;
    };
    exception.prototype = new Error();
    return exception;
  }()),

  NotReadyError: (function(){
    var exception = function() {
      this.code = 2;
      this.name = 'NOT_READY_ERROR';
      this.message = JsSIP.C.LOG_EXCEPTION + this.code;
    };
    exception.prototype = new Error();
    return exception;
  }()),

  InvalidTargetError: (function(){
    var exception = function() {
      this.code = 3;
      this.name = 'INVALID_TARGET_ERROR';
      this.message = JsSIP.C.LOG_EXCEPTION + this.code;
    };
    exception.prototype = new Error();
    return exception;
  }()),

  WebRtcNotSupportedError: (function(){
    var exception = function(){
      this.code = 4;
      this.name = 'WEBRTC_NO_SUPPORTED_ERROR';
      this.message = JsSIP.C.LOG_EXCEPTION + this.code;
    };
    exception.prototype = new Error();
    return exception;
  }()),

  InvalidStateError: (function(){
    var exception = function() {
      this.code = 5;
      this.name = 'INVALID_STATE_ERROR';
      this.message = JsSIP.C.LOG_EXCEPTION + this.code;
    };
    exception.prototype = new Error();
    return exception;
  }()),

  InvalidMethodError: (function(){
    var exception = function() {
      this.code = 6;
      this.name = 'INVALID_METHOD_ERROR';
      this.message = JsSIP.C.LOG_EXCEPTION + this.code;
    };
    exception.prototype = new Error();
    return exception;
  }()),

  InvalidValueError: (function(){
    var exception = function() {
      this.code = 7;
      this.name = 'INVALID_VALUE_ERROR';
      this.message = JsSIP.C.LOG_EXCEPTION + this.code;
    };
    exception.prototype = new Error();
    return exception;
  }())
};
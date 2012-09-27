
/**
 * @fileoverview JsSIP exceptions
 */

/**
 * JsSIP Exceptions.
 * @augments JsSIP
 */

JsSIP.exceptions = {
  ConfigurationError: (function(){
    var exception = function() {
      this.code = 1;
      this.name = 'CONFIGURATION_ERROR';
      this.message = this.name +': JsSIP Exception '+ this.code;
    };
    exception.prototype = new Error();
    return exception;
  }()),

  NotReadyError: (function(){
    var exception = function() {
      this.code = 2;
      this.name = 'NOT_READY_ERROR';
      this.message = this.name +': JsSIP Exception '+ this.code;
    };
    exception.prototype = new Error();
    return exception;
  }()),

  InvalidTargetError: (function(){
    var exception = function() {
      this.code = 3;
      this.name = 'INVALID_TARGET_ERROR';
      this.message = this.name +': JsSIP Exception '+ this.code;
    };
    exception.prototype = new Error();
    return exception;
  }()),

  WebRtcNotSupportedError: (function(){
    var exception = function(){
      this.code = 4;
      this.name = 'WEBRTC_NO_SUPPORTED_ERROR';
      this.message = this.name +': JsSIP Exception '+ this.code;
    };
    exception.prototype = new Error();
    return exception;
  }())
};
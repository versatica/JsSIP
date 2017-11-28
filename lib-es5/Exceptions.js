'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ConfigurationError = function (_Error) {
  _inherits(ConfigurationError, _Error);

  function ConfigurationError(parameter, value) {
    _classCallCheck(this, ConfigurationError);

    var _this = _possibleConstructorReturn(this, (ConfigurationError.__proto__ || Object.getPrototypeOf(ConfigurationError)).call(this));

    _this.code = 1;
    _this.name = 'CONFIGURATION_ERROR';
    _this.parameter = parameter;
    _this.value = value;
    _this.message = !_this.value ? 'Missing parameter: ' + _this.parameter : 'Invalid value ' + JSON.stringify(_this.value) + ' for parameter "' + _this.parameter + '"';
    return _this;
  }

  return ConfigurationError;
}(Error);

var InvalidStateError = function (_Error2) {
  _inherits(InvalidStateError, _Error2);

  function InvalidStateError(status) {
    _classCallCheck(this, InvalidStateError);

    var _this2 = _possibleConstructorReturn(this, (InvalidStateError.__proto__ || Object.getPrototypeOf(InvalidStateError)).call(this));

    _this2.code = 2;
    _this2.name = 'INVALID_STATE_ERROR';
    _this2.status = status;
    _this2.message = 'Invalid status: ' + status;
    return _this2;
  }

  return InvalidStateError;
}(Error);

var NotSupportedError = function (_Error3) {
  _inherits(NotSupportedError, _Error3);

  function NotSupportedError(message) {
    _classCallCheck(this, NotSupportedError);

    var _this3 = _possibleConstructorReturn(this, (NotSupportedError.__proto__ || Object.getPrototypeOf(NotSupportedError)).call(this));

    _this3.code = 3;
    _this3.name = 'NOT_SUPPORTED_ERROR';
    _this3.message = message;
    return _this3;
  }

  return NotSupportedError;
}(Error);

var NotReadyError = function (_Error4) {
  _inherits(NotReadyError, _Error4);

  function NotReadyError(message) {
    _classCallCheck(this, NotReadyError);

    var _this4 = _possibleConstructorReturn(this, (NotReadyError.__proto__ || Object.getPrototypeOf(NotReadyError)).call(this));

    _this4.code = 4;
    _this4.name = 'NOT_READY_ERROR';
    _this4.message = message;
    return _this4;
  }

  return NotReadyError;
}(Error);

module.exports = {
  ConfigurationError: ConfigurationError,
  InvalidStateError: InvalidStateError,
  NotSupportedError: NotSupportedError,
  NotReadyError: NotReadyError
};
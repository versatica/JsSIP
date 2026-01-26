class ConfigurationError extends Error {
	constructor(parameter, value) {
		super();

		this.code = 1;
		this.name = 'CONFIGURATION_ERROR';
		this.parameter = parameter;
		this.value = value;
		this.message = !this.value
			? `Missing parameter: ${this.parameter}`
			: `Invalid value ${JSON.stringify(this.value)} for parameter "${this.parameter}"`;
	}
}

class InvalidStateError extends Error {
	constructor(status) {
		super();

		this.code = 2;
		this.name = 'INVALID_STATE_ERROR';
		this.status = status;
		this.message = `Invalid status: ${status}`;
	}
}

class NotSupportedError extends Error {
	constructor(message) {
		super();

		this.code = 3;
		this.name = 'NOT_SUPPORTED_ERROR';
		this.message = message;
	}
}

class NotReadyError extends Error {
	constructor(message) {
		super();

		this.code = 4;
		this.name = 'NOT_READY_ERROR';
		this.message = message;
	}
}

module.exports = {
	ConfigurationError,
	InvalidStateError,
	NotSupportedError,
	NotReadyError,
};

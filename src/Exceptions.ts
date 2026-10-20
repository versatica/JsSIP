export class ConfigurationError extends Error {
	code = 1;
	override name = 'CONFIGURATION_ERROR';
	parameter: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	value: any;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	constructor(parameter: string, value?: any) {
		super();

		this.parameter = parameter;
		this.value = value;
		this.message = !this.value
			? `Missing parameter: ${this.parameter}`
			: `Invalid value ${JSON.stringify(this.value)} for parameter "${this.parameter}"`;
	}
}

export class InvalidStateError extends Error {
	code = 2;
	override name = 'INVALID_STATE_ERROR';
	status: number;

	constructor(status: number) {
		super();

		this.status = status;
		this.message = `Invalid status: ${status}`;
	}
}

export class NotSupportedError extends Error {
	code = 3;
	override name = 'NOT_SUPPORTED_ERROR';

	constructor(message: string) {
		super();

		this.message = message;
	}
}

export class NotReadyError extends Error {
	code = 4;
	override name = 'NOT_READY_ERROR';

	constructor(message: string) {
		super();

		this.message = message;
	}
}

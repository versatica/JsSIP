declare class BaseError extends Error {
	code: number;
}

export class ConfigurationError extends BaseError {
	parameter: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	value: any;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	constructor(parameter: string, value?: any);
}

export class InvalidStateError extends BaseError {
	status: number;

	constructor(status: number);
}

export class NotSupportedError extends BaseError {
	constructor(message: string);
}

export class NotReadyError extends BaseError {
	constructor(message: string);
}

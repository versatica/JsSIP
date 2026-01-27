/* eslint no-console: 0 */

// Show uncaught errors.
process.on('uncaughtException', function (error: Error) {
	console.error('uncaught exception:');
	console.error(error.stack);
	process.exit(1);
});

// Define global.WebSocket.
(globalThis as Record<string, unknown>)['WebSocket'] = function (this: {
	close: () => void;
}) {
	this.close = function () {};
};

// Define global.navigator for bowser module.
(globalThis as Record<string, unknown>)['navigator'] = {
	userAgent: '',
};

/* eslint no-console: 0*/

// Show uncaught errors.
process.on('uncaughtException', function (error) {
	console.error('uncaught exception:');
	console.error(error.stack);
	process.exit(1);
});

// Define global.WebSocket.
global.WebSocket = function () {
	this.close = function () {};
};

// Define global.navigator for bowser module.
global.navigator = {
	userAgent: '',
};

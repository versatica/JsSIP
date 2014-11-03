// var JsSIP = require('../../');
var JsSIP = require('../../builds/jssip-last.js');


// Show uncaught errors.
process.on('uncaughtException', function(error) {
	console.error('uncaught exception:');
	console.error(error.stack);
	process.exit(1);
});


module.exports = JsSIP;

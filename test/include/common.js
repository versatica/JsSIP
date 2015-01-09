// Show uncaught errors.
process.on('uncaughtException', function(error) {
  console.error('uncaught exception:');
  console.error(error.stack);
  process.exit(1);
});

// Define global.navigator for borwser module.
global.navigator = {
	userAgent: ''
};

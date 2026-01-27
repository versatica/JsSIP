module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testRegex: 'src/test/test-.*\\.ts',
	transform: {
		'^.+\\.ts$': [
			'ts-jest',
			{
				tsconfig: 'tsconfig.json',
			},
		],
	},
};

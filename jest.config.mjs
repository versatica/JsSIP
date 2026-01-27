const config = {
	verbose: true,
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
	coveragePathIgnorePatterns: ['src/test'],
	cacheDirectory: '.cache/jest',
};

export default config;

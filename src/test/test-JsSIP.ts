import './include/common';

import { version, name } from '../JsSIP';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require('../../package.json');

describe('Properties', () => {
	test('should have a name property', () => {
		expect(name).toEqual(pkg.title);
	});

	test('should have a version property', () => {
		expect(version).toEqual(pkg.version);
	});
});

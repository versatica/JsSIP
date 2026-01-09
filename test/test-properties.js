require('./include/common');
const JsSIP = require('../');
const pkg = require('../package.json');


describe('Properties', () => {
  test('should have a name property', () => {
    expect(JsSIP.name).toEqual(pkg.title);
  });

  test('should have a version property', () => {
    expect(JsSIP.version).toEqual(pkg.version);
  });
});

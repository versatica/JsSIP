require('./include/common');
const JsSIP = require('../');
const pkg = require('../package.json');


module.exports = {

  'name' : function(test)
  {
    test.equal(JsSIP.name, pkg.title);
    test.done();
  },

  'version' : function(test)
  {
    test.equal(JsSIP.version, pkg.version);
    test.done();
  }

};

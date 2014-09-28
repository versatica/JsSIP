var JsSIP = (function() {
  "use strict";

  var JsSIP = {};

  Object.defineProperties(JsSIP, {
    version: {
      get: function(){ return '<%= pkg.version %>'; }
    }
  });

  return JsSIP;
}());

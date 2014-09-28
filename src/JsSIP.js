var JsSIP = (function() {
"use strict";


/**
 * The main namespace.
 * @namespace JsSIP
 */
var JsSIP = {};

Object.defineProperties(JsSIP, {
	/**
	 * Retrieve the version of JsSIP.
	 * @memberof JsSIP
	 * @method
	 * @returns {String} Version in the form "X.Y.Z"
	 * @example
	 * // prints "1.0.0"
	 * console.log(JsSIP.version)
	 */
	version: {
		get: function(){ return '<%= pkg.version %>'; }
	}
});


return JsSIP;
}());

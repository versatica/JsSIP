if (typeof module === "object" && module && typeof module.exports === "object") {
  // Expose JsSIP as module.exports in loaders that implement the Node
  // module pattern (including browserify). Do not create the global, since
  // the user will be storing it themselves locally, and globals are frowned
  // upon in the Node module world.
  module.exports = JsSIP;
} else {
  // Otherwise expose JsSIP to the global object as usual.
  window.JsSIP = JsSIP;

  // Register as a named AMD module, since JsSIP can be concatenated with other
  // files that may use define, but not via a proper concatenation script that
  // understands anonymous AMD modules. A named AMD is safest and most robust
  // way to register. Lowercase jssip is used because AMD module names are
  // derived from file names, and JsSIP is normally delivered in a lowercase
  // file name.
  if (typeof define === "function" && define.amd) {
    define("jssip", [], function () { return JsSIP; });
  }
}

}(window));

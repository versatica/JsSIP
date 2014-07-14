
(function() {

var Logger = function(logger, category, label) {
  this.logger = logger;
  this.category = category;
  this.label = label;
};


Logger.prototype.debug = function(content) {
  this.logger.debug(this.category, this.label, content);
};

Logger.prototype.log = function(content) {
  this.logger.log(this.category, this.label, content);
};

Logger.prototype.warn = function(content) {
  this.logger.warn(this.category, this.label, content);
};

Logger.prototype.error = function(content) {
  this.logger.error(this.category, this.label, content);
};

return Logger;
}());

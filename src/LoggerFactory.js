
(function(JsSIP) {

var Logger = @@include('../src/Logger.js')

var LoggerFactory = function() {
  var logger,
    levels = {
    'error': 0,
    'warn': 1,
    'log': 2,
    'debug': 3
    },

    level = 2,
    builtinEnabled = true,
    connector = null;

    this.loggers = {};

    logger = this.getLogger('jssip.loggerfactory');


  Object.defineProperties(this, {
    builtinEnabled: {
      get: function(){ return builtinEnabled; },
      set: function(value){
        if (typeof value === 'boolean') {
          builtinEnabled = value;
        } else {
          logger.error('invalid "builtinEnabled" parameter value: '+ window.JSON.stringify(value));
        }
      }
    },

    level: {
      get: function() {return level; },
      set: function(value) {
        if (value >= 0 && value <=3) {
          level = value;
        } else if (value > 3) {
          level = 3;
        } else if (levels.hasOwnProperty(level)) {
          level = levels[value];
        } else {
          logger.error('invalid "level" parameter value: '+ window.JSON.stringify(value));
        }
      }
    },

    connector: {
      get: function() {return connector; },
      set: function(value){
        if(value === null || value === "" || value === undefined) {
          connector = null;
        } else if (typeof value === 'function') {
          connector = value;
        } else {
          logger.error('invalid "connector" parameter value: '+ window.JSON.stringify(value));
        }
      }
    }
  });
};

LoggerFactory.prototype.print = function(target, category, label, content) {
  var prefix = [];

  prefix.push(new Date());

  prefix.push(category);

  if (label) {
    prefix.push(label);
  }

  prefix.push('');

  if (typeof content === 'string') {
    target.call(console, prefix.join(' | ') + content);
  } else {
    target.call(console, content);
  }
};

LoggerFactory.prototype.debug = function(category, label, content) {
  if (this.level === 3) {
    if (this.builtinEnabled) {
      this.print(console.debug, category, label, content);
    }

    if (this.connector) {
      this.connector('debug', category, label, content);
    }
  }
};

LoggerFactory.prototype.log = function(category, label, content) {
  if (this.level >= 2) {
    if (this.builtinEnabled) {
      this.print(console.log, category, label, content);
    }

    if (this.connector) {
      this.connector('log', category, label, content);
    }
  }
};

LoggerFactory.prototype.warn = function(category, label, content) {
  if (this.level >= 1) {
    if (this.builtinEnabled) {
      this.print(console.warn, category, label, content);
    }

    if (this.connector) {
      this.connector('warn', category, label, content);
    }
  }
};

LoggerFactory.prototype.error = function(category, label, content) {
  if (this.builtinEnabled) {
    this.print(console.error,category, label, content);
  }

  if (this.connector) {
    this.connector('error', category, label, content);
  }
};

LoggerFactory.prototype.getLogger = function(category, label) {
  var logger;

  if (label && this.level === 3) {
    return new Logger(this, category, label);
  } else if (this.loggers[category]) {
    return this.loggers[category];
  } else {
    logger = new Logger(this, category);
    this.loggers[category] = logger;
    return logger;
  }
};

JsSIP.LoggerFactory = LoggerFactory;
}(JsSIP));

module.exports = EventEmitter;


function EventEmitter() {}


/**
 * Dependencies.
 */
var debug = require('debug')('JsSIP:EventEmitter');


function Event(type, sender, data) {
  this.type = type;
  this.sender= sender;
  this.data = data;
}


var C = {
  MAX_LISTENERS: 50
};


EventEmitter.prototype = {
  /**
   * Initialize events dictionaries.
   * -param {Array} events
   */
  initEvents: function(events) {
    var idx, length;

    this.maxListeners = C.MAX_LISTENERS;

    this.events = {};
    this.oneTimeListeners = {};

    length = events.length;
    for (idx = 0; idx < length; idx++) {
      this.events[events[idx]] = [];
      this.oneTimeListeners[events[idx]] = [];
    }
  },

  /**
   * Check whether an event exists or not.
   */
  checkEvent: function(event) {
    return !!this.events[event];
  },

  /**
   * Add a listener to the end of the listeners array for the specified event.
   */
  addListener: function(event, listener) {
    if (listener === undefined) {
      return;
    } else if (typeof listener !== 'function') {
      throw new Error('listener must be a function');
    } else if (!this.checkEvent(event)) {
      throw new Error('unable to add a listener to a nonexistent event ' + event);
    }

    if (this.events[event].length >= this.maxListeners) {
      debug('max listeners exceeded for event ' + event);
    }

    this.events[event].push(listener);
  },

  on: function(event, listener) {
    this.addListener(event, listener);
  },

  /**
   * Add a one time listener for the specified event.
   * The listener is invoked only the next time the event is fired, then it is removed.
   */
  once: function(event, listener) {
    this.on(event, listener);
    this.oneTimeListeners[event].push(listener);
  },

  /**
   * Remove a listener from the listener array for the specified event.
   * Note that the order of the array elements will change after removing the listener
   */
  removeListener: function(event, listener) {
    var events, length,
      idx = 0;

    if (listener === undefined) {
      return;
    } else if (typeof listener !== 'function') {
      throw new Error('listener must be a function');
    } else if (!this.checkEvent(event)) {
      throw new Error('unable to remove a listener from a nonexistent event'+ event);
    }

    events = this.events[event];
    length = events.length;

    while (idx < length) {
      if (events[idx] === listener) {
        events.splice(idx,1);
      } else {
        idx ++;
      }
    }
  },

  /**
   * Remove all listeners from the listener array for the specified event.
   */
  removeAllListener: function(event) {
    if (!this.checkEvent(event)) {
      throw new Error('unable to remove listeners from a nonexistent event'+ event);
    }

    this.events[event] = [];
    this.oneTimeListeners[event] = [];
  },

  /**
   * By default EventEmitter will print a warning
   * if more than C.MAX_LISTENERS listeners are added for a particular event.
   * This function allows that limit to be modified.
   */
  setMaxListeners: function(listeners) {
    if (typeof listeners !== 'number' || listeners < 0) {
      throw new Error('listeners must be a positive number');
    }

    this.maxListeners = listeners;
  },

  /**
   * Get the listeners for a specific event.
   */
  listeners: function(event) {
    if (!this.checkEvent(event)) {
      throw new Error('no event '+ event);
    }

    return this.events[event];
  },

  /**
   * Execute each of the listeners in order with the supplied arguments.
   */
  emit: function(event, sender, data) {
    var listeners, length, e, idx;

    if (!this.checkEvent(event)) {
      throw new Error('unable to emit a nonexistent event'+ event);
    }

    debug('emitting event '+ event);

    listeners = this.events[event];
    length = listeners.length;

    e = new Event(event, sender, data);

    listeners.map(function(listener) {
      return function() {
        listener.call(null, e);
      };
    }).forEach(function(callback) {
      try {
        callback();
      } catch(err) {
        debug(err.stack ? err.stack : err);
      }
    });

    // Remove one time listeners
    for (idx in this.oneTimeListeners[event]) {
      this.removeListener(event, this.oneTimeListeners[event][idx]);
    }

    this.oneTimeListeners[event] = [];
  }
};

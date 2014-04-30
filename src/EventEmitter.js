/**
 * @fileoverview EventEmitter
 */

/**
 * @augments JsSIP
 * @class Class creating an event emitter.
 */
(function(JsSIP) {
var
  EventEmitter,
  Event,
  LOG_PREFIX = ' | '+ 'EVENT EMITTER' +' | ';

EventEmitter = function(){};
EventEmitter.prototype = {
  /**
   * Initialize events dictionary.
   * @param {Array} events
   */
  initEvents: function(events) {
    var i = events.length;

    this.events = {};
    this.onceNotFired = []; // Array containing events with _once_ defined tat didn't fire yet.
    this.maxListeners = 10;
    this.events.newListener = function(event) { // Default newListener callback
      JsSIP.log(LOG_PREFIX +'new listener added to event '+ event);
    };

    while (i--) {
      JsSIP.log(LOG_PREFIX +'adding event '+ events[i]);
      this.events[events[i]] = [];
    }
  },

  /**
  * Check whether an event exists or not.
  * @param {String} event
  * @returns {Boolean}
  */
  checkEvent: function(event) {
    if (!this.events[event]) {
      JsSIP.error(LOG_PREFIX +'no event named '+ event);
      return false;
    } else {
      return true;
    }
  },

  /**
  * Add a listener to the end of the listeners array for the specified event.
  * @param {String} event
  * @param {Function} listener
  */
  addListener: function(event, listener) {
    if (!this.checkEvent(event)) {
      return;
    }

    if (this.events[event].length >= this.maxListeners) {
      JsSIP.warn(LOG_PREFIX +'max listeners exceeded for event '+ event);
    }

    this.events[event].push(listener);
    this.events.newListener.call(null, event);
  },

  on: function(event, listener) {
    this.addListener(event, listener);
  },

  /**
  * Add a one time listener for the event.
  * The listener is invoked only the first time the event is fired, after which it is removed.
  * @param {String} event
  * @param {Function} listener
  */
  once: function(event, listener) {
    this.events[event].unshift(listener);
    this.onceNotFired.push(event);
  },

  /**
  * Remove a listener from the listener array for the specified event.
  * Caution: changes array indices in the listener array behind the listener.
  * @param {String} event
  * @param {Function} listener
  */
  removeListener: function(event, listener) {
    if (!this.checkEvent(event)) {
      return;
    }

    var array = this.events[event], i = 0, length = array.length;

    while ( i < length ) {
      if (array[i] && array[i].toString() === listener.toString()) {
        array.splice(i, 1);
      } else {
        i++;
      }
    }
  },

  /**
  * Remove all listeners from the listener array for the specified event.
  * @param {String} event
  */
  removeAllListener: function(event) {
    if (!this.checkEvent(event)) {
      return;
    }

    this.events[event] = [];
  },

  /**
  * By default EventEmitter will print a warning
  * if more than 10 listeners are added for a particular event.
  * This function allows that limit to be modified.
  * @param {Number} listeners
  */
  setMaxListeners: function(listeners) {
    if (Number(listeners)) {
      this.maxListeners = listeners;
    }
  },

  /**
  * Get the listeners for a specific event.
  * @param {String} event
  * @returns {Array}  Array of listeners for the specified event.
  */
  listeners: function(event) {
    return this.events[event];
  },

  /**
  * Execute each of the listeners in order with the supplied arguments.
  * @param {String} events
  * @param {Array} args
  */
  emit: function(event, sender, data) {
    var listeners, length,
      emitter = this;

    if (!this.checkEvent(event)) {
      return;
    }

    JsSIP.log(LOG_PREFIX +'emitting event '+event);

    listeners = this.events[event];
    length = listeners.length;

    var e = new JsSIP.Event(event, sender, data);

    window.setTimeout(
      function(){
        var idx=0;

        for (idx; idx<length; idx++) {
          listeners[idx].call(null, e);
        }

        // Check whether _once_ was defined for the event
        idx = emitter.onceNotFired.indexOf(event);

        if (idx !== -1) {
          emitter.onceNotFired.splice(idx,1);
          emitter.events[event].shift();
        }
      }, 0);
  },

  /**
  * This function is executed anytime a new listener is added to EventEmitter instance.
  * @param {Function} listener
  */
  newListener: function(listener) {
    this.events.newListener = listener;
  }
};

Event = function(type, sender, data) {
  this.type = type;
  this.sender= sender;
  this.data = data;
};

JsSIP.EventEmitter = EventEmitter;
JsSIP.Event = Event;
}(JsSIP));

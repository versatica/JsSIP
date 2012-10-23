
/**
 * @fileoverview Registrator Agent
 */

/**
 * @augments JsSIP
 * @class Class creating a registrator agent.
 * @param {JsSIP.UA} ua
 * @param {JsSIP.Transport} transport
 */
JsSIP.Registrator = function(ua, transport) {
  var reg_id=1; //Force reg_id to 1.

  this.ua = ua;
  this.transport = transport;

  this.expires = ua.configuration.register_expires;
  this.min_expires = ua.configuration.register_min_expires;

  // Call-ID and CSeq values RFC3261 10.2
  this.call_id = Math.random().toString(36).substr(2, 22);
  this.cseq = 80;

  this.registrar = 'sip:'+ ua.configuration.domain;
  // this.to_uri
  this.from_uri = ua.configuration.from_uri;

  this.registrationTimer = null;

  // Set status
  this.registered = this.registered_before = false;

  // Save into ua instance
  this.ua.registrator = this;

  // Contact header
  if(reg_id) {
    this.contact = '<' + this.ua.contact.uri + '>';
    this.contact += ';reg-id='+ reg_id;
    this.contact += ';+sip.instance="<urn:uuid:'+ this.ua.configuration.instance_id+'>"';
  } else {
    this.contact = '<' + this.ua.contact.uri + '>';
  }

  this.register();
};

JsSIP.Registrator.prototype = {
  register: function() {
    var request_sender,
      self = this;

    this.request = new JsSIP.OutgoingRequest(JsSIP.c.REGISTER, this.registrar, this.ua, {
        'to_uri': this.from_uri,
        'call_id': this.call_id,
        'cseq': (this.cseq += 1)
      }, [
        'Contact: '+ this.contact + ';expires=' + this.expires,
        'Allow: '+ JsSIP.c.ALLOWED_METHODS
      ]);

    request_sender = new JsSIP.RequestSender(this, this.ua);

    /**
    * @private
    */
    this.receiveResponse = function(response) {
      var contact, expires, min_expires,
        contacts = response.countHeader('contact');

      // Discard responses to older Register/Deregister requests.
      if(response.cseq !== this.cseq) {
        return;
      }

      switch(true) {
        case /^1[0-9]{2}$/.test(response.status_code):
          // Ignore provisional responses.
          break;
        case /^2[0-9]{2}$/.test(response.status_code):
          if(response.hasHeader('expires')) {
            expires = response.getHeader('expires');
          }

          // Search the contact pointing to us and update the expires value
          //accordingly
          if (!contacts) {
            console.log(JsSIP.c.LOG_REGISTRATOR +'No Contact header possitive response to Register. Ignore response');
            break;
          }

          while(contacts--) {
            contact = response.parseHeader('contact', contacts);
            if(contact.uri === this.ua.contact.uri) {
              expires = contact.params.expires;
              break;
            }
          }

          if (!contact) {
            console.log(JsSIP.c.LOG_REGISTRATOR +'No Contact header pointing to us. Ignore response');
            break;
          }

          if(!expires) {
            expires = this.expires;
          } else if(expires < this.min_expires) {
            // Set the expires value to min_expires in case it is slower
            console.log(JsSIP.c.LOG_REGISTRATOR +'Received expires value: ' + expires + ' is smaller than the nimum expires time: ' + this.min_expires);
            expires = this.min_expires;
          }

          // Re-Register before the expiration interval has elapsed.
          // For that, decrease the expires value. ie: 3 seconds
          this.registrationTimer = window.setTimeout(function() {
            self.register();
          }, (expires * 1000) - 3000);

          //Save gruu values
          if (contact.params['temp-gruu']) {
            this.ua.contact.temp_gruu = contact.params['temp-gruu'].replace(/"/g,'');
          }
          if (contact.params['pub-gruu']) {
            this.ua.contact.pub_gruu = contact.params['pub-gruu'].replace(/"/g,'');
          }

          this.registered = true;
          this.ua.emit('registered', this.ua);
          break;
        // Interval too brief RFC3261 10.2.8
        case /^423$/.test(response.status_code):
          if(response.hasHeader('min-expires')) {
            min_expires = response.getHeader('min-expires');
            expires = (min_expires - this.expires);
            this.registrationTimer = window.setTimeout(function() {
              self.register();
            }, this.expires * 1000);
          } else { //This response MUST contain a Min-Expires header field
          console.log(JsSIP.c.LOG_REGISTRATOR +'423 response code received to a REGISTER without min-expires. Deregister');
          this.registrationFailure();
          }
          break;
        default:
          this.registrationFailure();
      }
    };

    /**
    * @private
    */
    this.onRequestTimeout = function() {
      this.registrationFailure();
    };

    /**
    * @private
    */
    this.onTransportError = function() {
      this.registrationFailure();
    };

    request_sender.send();
  },

  /**
  * @param {Boolean} [all=false]
  */
  deregister: function(all) {
    /* Parameters:
    *
    * - all: If true, then perform a "deregister all" action ("Contact: *");
    */
    if(!this.registered) {
      console.log(JsSIP.c.LOG_REGISTRATOR +"Already unregistered");
      return;
    }

    this.registered = false;
    this.ua.emit('unregistered');

    // Clear the registration timer.
    window.clearTimeout(this.registrationTimer);

    if(all) {
      this.request = new JsSIP.OutgoingRequest(JsSIP.c.REGISTER, this.registrar, this.ua, {
          'to_uri': this.from_uri,
          'call_id': this.call_id,
          'cseq': (this.cseq += 1)
        }, [
          'Contact: *',
          'Expires : 0'
        ]);
    } else {
      this.request = new JsSIP.OutgoingRequest(JsSIP.c.REGISTER, this.registrar, this.ua, {
          'to_uri': this.from_uri,
          'call_id': this.call_id,
          'cseq': (this.cseq += 1)
        }, [
          'Contact: '+ this.contact + ';expires=0'
        ]);
    }

    var request_sender = new JsSIP.RequestSender(this, this.ua);

    /**
    * @private
    */
    this.receiveResponse = function(response) {
      console.log(JsSIP.c.LOG_REGISTRATOR +response.status_code + ' ' + response.reason_phrase + ' received to deregister request');
    };

    /**
    * @private
    */
    this.onRequestTimeout = function() {
      console.log(JsSIP.c.LOG_REGISTRATOR +'Request Timeout received for deregister request');
    };

    /**
    * @private
    */
    this.onTransportError = function() {
      console.log(JsSIP.c.LOG_REGISTRATOR +'Transport Error received for deregister request');
    };

    request_sender.send();
  },

  /**
  * @private
  */
  registrationFailure: function(cause) {
    if (this.registered) {
      this.registered = false;
      this.ua.emit('unregistered', this.ua);
    }
    this.ua.emit('registrationFailed', this.ua);
  },

  /**
  * @private
  */
  onTransportClosed: function() {
    this.registered_before = this.registered;
    window.clearTimeout(this.registrationTimer);

    if(this.registered) {
      this.registered = false;
      this.ua.emit('unregistered', this.ua);
    }
  },

  /**
  * @private
  */
  onTransportConnected: function() {
    this.register();
  },

  /**
  * @private
  */
  close: function() {
    this.registered_before = this.registered;
    this.deregister();
  }
};

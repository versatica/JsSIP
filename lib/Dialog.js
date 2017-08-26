const SIPMessage = require('./SIPMessage');
const JsSIP_C = require('./Constants');
const Transactions = require('./Transactions');
const Dialog_RequestSender = require('./Dialog/RequestSender');
const Utils = require('./Utils');
const debug = require('debug')('JsSIP:Dialog');

const C = {
  // Dialog states.
  STATUS_EARLY     : 1,
  STATUS_CONFIRMED : 2
};

// RFC 3261 12.1
module.exports = class Dialog
{
  // Expose C object.
  static get C()
  {
    return C;
  }

  constructor(owner, message, type, state = C.STATUS_CONFIRMED)
  {
    this._owner = owner;
    this._ua = owner._ua;

    this._uac_pending_reply = false;
    this._uas_pending_reply = false;

    if (!message.hasHeader('contact'))
    {
      return {
        error : 'unable to create a Dialog without Contact header field'
      };
    }

    if (message instanceof SIPMessage.IncomingResponse)
    {
      state = (message.status_code < 200) ? C.STATUS_EARLY : C.STATUS_CONFIRMED;
    }

    const contact = message.parseHeader('contact');

    // RFC 3261 12.1.1.
    if (type === 'UAS')
    {
      this._id = {
        call_id    : message.call_id,
        local_tag  : message.to_tag,
        remote_tag : message.from_tag,
        toString()
        {
          return this.call_id + this.local_tag + this.remote_tag;
        }
      };
      this._state = state;
      this._remote_seqnum = message.cseq;
      this._local_uri = message.parseHeader('to').uri;
      this._remote_uri = message.parseHeader('from').uri;
      this._remote_target = contact.uri;
      this._route_set = message.getHeaders('record-route');
    }
    // RFC 3261 12.1.2.
    else if (type === 'UAC')
    {
      this._id = {
        call_id    : message.call_id,
        local_tag  : message.from_tag,
        remote_tag : message.to_tag,
        toString()
        {
          return this.call_id + this.local_tag + this.remote_tag;
        }
      };
      this._state = state;
      this._local_seqnum = message.cseq;
      this._local_uri = message.parseHeader('from').uri;
      this._remote_uri = message.parseHeader('to').uri;
      this._remote_target = contact.uri;
      this._route_set = message.getHeaders('record-route').reverse();
    }

    this._ua.newDialog(this);
    debug(`new ${type} dialog created with status ${this._state === C.STATUS_EARLY ? 'EARLY': 'CONFIRMED'}`);
  }

  get id()
  {
    return this._id;
  }

  get local_seqnum()
  {
    return this._local_seqnum;
  }

  set local_seqnum(num)
  {
    this._local_seqnum = num;
  }

  get owner()
  {
    return this._owner;
  }

  get uac_pending_reply()
  {
    return this._uac_pending_reply;
  }

  set uac_pending_reply(pending)
  {
    this._uac_pending_reply = pending;
  }

  get uas_pending_reply()
  {
    return this._uas_pending_reply;
  }

  update(message, type)
  {
    this._state = C.STATUS_CONFIRMED;

    debug(`dialog ${this._id.toString()}  changed to CONFIRMED state`);

    if (type === 'UAC')
    {
      // RFC 3261 13.2.2.4.
      this._route_set = message.getHeaders('record-route').reverse();
    }
  }

  terminate()
  {
    debug(`dialog ${this._id.toString()} deleted`);
    this._ua.destroyDialog(this);
  }

  sendRequest(method, options = {})
  {
    const extraHeaders = Utils.cloneArray(options.extraHeaders);
    const eventHandlers = options.eventHanlders || {};
    const body = options.body || null;
    const request = this._createRequest(method, extraHeaders, body);

    // Increase the local CSeq on authentication.
    eventHandlers.onAuthenticated = () =>
    {
      this._local_seqnum += 1;
    };

    const request_sender = new Dialog_RequestSender(this, request, eventHandlers);

    request_sender.send();

    // Return the instance of OutgoingRequest.
    return request;
  }

  receiveRequest(request)
  {
    // Check in-dialog request.
    if (!this._checkInDialogRequest(request))
    {
      return;
    }

    this._owner.receiveRequest(request);
  }

  // RFC 3261 12.2.1.1.
  _createRequest(method, extraHeaders, body)
  {
    extraHeaders = Utils.cloneArray(extraHeaders);

    if (!this._local_seqnum) { this._local_seqnum = Math.floor(Math.random() * 10000); }

    const cseq = (method === JsSIP_C.CANCEL || method === JsSIP_C.ACK) ?
      this._local_seqnum :
      this._local_seqnum += 1;

    const request = new SIPMessage.OutgoingRequest(
      method,
      this._remote_target,
      this._ua, {
        'cseq'      : cseq,
        'call_id'   : this._id.call_id,
        'from_uri'  : this._local_uri,
        'from_tag'  : this._id.local_tag,
        'to_uri'    : this._remote_uri,
        'to_tag'    : this._id.remote_tag,
        'route_set' : this._route_set
      }, extraHeaders, body);

    return request;
  }

  // RFC 3261 12.2.2.
  _checkInDialogRequest(request)
  {

    if (!this._remote_seqnum)
    {
      this._remote_seqnum = request.cseq;
    }
    else if (request.cseq < this._remote_seqnum)
    {
      // Do not try to reply to an ACK request.
      if (request.method !== JsSIP_C.ACK)
      {
        request.reply(500);
      }

      return false;
    }
    else if (request.cseq > this._remote_seqnum)
    {
      this._remote_seqnum = request.cseq;
    }

    // RFC3261 14.2 Modifying an Existing Session -UAS BEHAVIOR-.
    if (request.method === JsSIP_C.INVITE ||
        (request.method === JsSIP_C.UPDATE && request.body))
    {
      if (this._uac_pending_reply === true)
      {
        request.reply(491);
      }
      else if (this._uas_pending_reply === true)
      {
        const retryAfter = (Math.random() * 10 | 0) + 1;

        request.reply(500, null, [ `Retry-After:${retryAfter}` ]);

        return false;
      }
      else
      {
        this._uas_pending_reply = true;

        const stateChanged = () =>
        {
          if (request.server_transaction.state === Transactions.C.STATUS_ACCEPTED ||
              request.server_transaction.state === Transactions.C.STATUS_COMPLETED ||
              request.server_transaction.state === Transactions.C.STATUS_TERMINATED)
          {

            request.server_transaction.removeListener('stateChanged', stateChanged);
            this._uas_pending_reply = false;
          }
        };

        request.server_transaction.on('stateChanged', stateChanged);
      }

      // RFC3261 12.2.2 Replace the dialog`s remote target URI if the request is accepted.
      if (request.hasHeader('contact'))
      {
        request.server_transaction.on('stateChanged', () =>
        {
          if (request.server_transaction.state === Transactions.C.STATUS_ACCEPTED)
          {
            this._remote_target = request.parseHeader('contact').uri;
          }
        });
      }
    }
    else if (request.method === JsSIP_C.NOTIFY)
    {
      // RFC6665 3.2 Replace the dialog`s remote target URI if the request is accepted.
      if (request.hasHeader('contact'))
      {
        request.server_transaction.on('stateChanged', () =>
        {
          if (request.server_transaction.state === Transactions.C.STATUS_COMPLETED)
          {
            this._remote_target = request.parseHeader('contact').uri;
          }
        });
      }
    }

    return true;
  }
};

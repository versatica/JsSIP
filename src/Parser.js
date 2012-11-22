
/**
 * @fileoverview Parser
 */

/**
 * Extract and parse every header of a SIP message.
 * @augments JsSIP
 * @namespace
 */
JsSIP.Parser = (function() {

  /** @private */
  function getHeader(msg, header_start) {
    var
      // 'start' position of the header.
      start = header_start,
      // 'end' position of the header.
      end = 0,
      // 'partial end' of the header -char position-.
      pend = 0;

    //End of message.
    if (msg.substring(start, start + 2).match(/(^\r\n)/)) {
      return -2;
    }

    while(end === 0) {
      // Partial End of Header.
      pend = msg.indexOf('\r\n', start);
      // 'indexOf' returns -1 if the value to be found never occurs.
      if(!msg.substring(pend + 2, pend + 4).match(/(^\r\n)/) && msg.charAt(pend + 2).match(/(^\s+)/)) {
        // continue from the next position.
        start = pend + 2;
      } else {
        end = pend;
      }
    }

    return end;
  }

  /** @private */
  function parseHeader(message, msg, header_start, header_end) {
    var header, length, idx, parsed,
      hcolonIndex = msg.indexOf(':', header_start),
      header_name = msg.substring(header_start, hcolonIndex).trim(),
      header_value = msg.substring(hcolonIndex + 1, header_end).trim();

    // If header-field is well-known, parse it.
    switch(header_name.toLowerCase()) {
      case 'via':
      case 'v':
        message.addHeader('via', header_value);
        if(message.countHeader('via') === 1) {
          parsed = message.parseHeader('Via');
          if(parsed) {
            message.via = parsed;
            message.via_branch = parsed.branch;
          }
        } else {
          parsed = 0;
        }
        break;
      case 'from':
      case 'f':
        message.setHeader('from', header_value);
        parsed = message.parseHeader('from');
        if(parsed) {
          message.from = parsed;
          message.from_tag = parsed.tag;
        }
        break;
      case 'to':
      case 't':
        message.setHeader('to', header_value);
        parsed = message.parseHeader('to');
        if(parsed) {
          message.to = parsed;
          message.to_tag = parsed.tag;
        }
        break;
      case 'record-route':
        header = header_value.match(/([^\"\',]*((\'[^\']*\')*||(\"[^\"]*\")*))+/gm);
        length = header.length;
        parsed = 0;

        for(idx=0; idx < length; idx++) {
          if (header[idx].length > 0) {
            message.addHeader('record-route', header[idx]);
          }
        }
        break;
      case 'call-id':
      case 'i':
        message.setHeader('call-id', header_value);
        parsed = message.parseHeader('call-id');
        if(parsed) {
          message.call_id = header_value;
        }
        break;
      case 'contact':
      case 'm':
        header = header_value.match(/([^\"\',]*((\'[^\']*\')*||(\"[^\"]*\")*))+/gm);
        length = header.length;

        for(idx=0; idx < length; idx++) {
          if (header[idx].length > 0) {
            message.addHeader('contact', header[idx]);
            parsed = message.parseHeader('contact', idx);
            if (parsed === undefined) {
              break;
            }
          }
        }
        break;
      case 'content-length':
      case 'l':
        message.setHeader('content-length', header_value);
        parsed = message.parseHeader('content-length');
        break;
      case 'content-type':
      case 'c':
        message.setHeader('content-type', header_value);
        parsed = message.parseHeader('content-type');
        break;
      case 'cseq':
        message.setHeader('cseq', header_value);
        parsed = message.parseHeader('cseq');
        if(parsed) {
          message.cseq = parsed.value;
        }
        if(message instanceof JsSIP.IncomingResponse) {
          message.method = parsed.method;
        }
        break;
      case 'max-forwards':
        message.setHeader('max-forwards', header_value);
        parsed = message.parseHeader('max-forwards');
        break;
      case 'www-authenticate':
        message.setHeader('www-authenticate', header_value);
        parsed = message.parseHeader('www-authenticate');
        break;
      case 'proxy-authenticate':
        message.setHeader('proxy-authenticate', header_value);
        parsed = message.parseHeader('proxy-authenticate');
        break;
      default:
        // This is not a well known header. Do not parse it.
        message.setHeader(header_name, header_value);
        parsed = 0;
    }

    if (parsed === undefined) {
      return false;
    } else {
      return true;
    }
  }

  /** @private */
  function parseMessage(data) {
    var message, firstLine, contentLength, body_start, parsed,
      header_start = 0,
      header_end = data.indexOf('\r\n');

    if(header_end === -1) {
      console.log(JsSIP.c.LOG_PARSER +'No CRLF found. Not a SIP message.');
    }

    // Parse first line. Check if it is a Request or a Reply.
    firstLine = data.substring(0, header_end);
    parsed = JsSIP.grammar.parse(firstLine, 'Request_Response');

    if(parsed === -1) {
      console.log(JsSIP.c.LOG_PARSER +'Error parsing first line of SIP message: "' + firstLine + '"');
      return;
    } else if(!parsed.status_code) {
      message = new JsSIP.IncomingRequest();
      message.method = parsed.method;
      message.ruri = parsed;
    } else {
      message = new JsSIP.IncomingResponse();
      message.status_code = parsed.status_code;
      message.reason_phrase = parsed.reason_phrase;
    }

    message.data = data;
    header_start = header_end + 2;

    /* Loop over every line in msg. Detect the end of each header and parse
    * it or simply add to the headers collection.
    */
    while(true) {
      header_end = getHeader(data, header_start);

      // The SIP message has normally finished.
      if(header_end === -2) {
        body_start = header_start + 2;
        break;
      }
      // msg.indexOf returned -1 due to a malformed message.
      else if(header_end === -1) {
        return;
      }

      parsed = parseHeader(message, data, header_start, header_end);

      if(!parsed) {
        return;
      }

      header_start = header_end + 2;
    }

    /* RFC3261 18.3.
     * If there are additional bytes in the transport packet
     * beyond the end of the body, they MUST be discarded.
     */
    if(message.hasHeader('content-length')) {
      contentLength = message.getHeader('content-length');
      message.body = data.substr(body_start, contentLength);
    } else {
      message.body = data.substring(body_start);
    }

    return message;
 }

 return {
   /** Parse SIP Message
    * @function
    * @param {String} message SIP message.
    * @returns {JsSIP.IncomingRequest|JsSIP.IncomingResponse|undefined}
    */
   parseMessage: parseMessage
 };
}());
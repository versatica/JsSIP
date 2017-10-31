const Grammar = require('./Grammar');
const SIPMessage = require('./SIPMessage');

/**
 * Parse SIP Message
 */
exports.parseMessage = (data, ua) =>
{
  let message;
  let bodyStart;
  let headerEnd = data.indexOf('\r\n');

  const debugPrefix = ua.configuration.debug_prefix;
  
  const debugerror = require('debug')(`${debugPrefix}JsSIP:ERROR:Parser`);

  debugerror.log = console.warn.bind(console);

  if (headerEnd === -1)
  {
    debugerror('parseMessage() | no CRLF found, not a SIP message');

    return;
  }

  // Parse first line. Check if it is a Request or a Reply.
  const firstLine = data.substring(0, headerEnd);
  let parsed = Grammar.parse(firstLine, 'Request_Response');

  if (parsed === -1)
  {
    debugerror(`parseMessage() | error parsing first line of SIP message: "${firstLine}"`);

    return;
  }
  else if (!parsed.status_code)
  {
    message = new SIPMessage.IncomingRequest(ua);
    message.method = parsed.method;
    message.ruri = parsed.uri;
  }
  else
  {
    message = new SIPMessage.IncomingResponse(ua);
    message.status_code = parsed.status_code;
    message.reason_phrase = parsed.reason_phrase;
  }

  message.data = data;
  let headerStart = headerEnd + 2;

  /* Loop over every line in data. Detect the end of each header and parse
  * it or simply add to the headers collection.
  */
  while (true)
  {
    headerEnd = getHeader(data, headerStart);

    // The SIP message has normally finished.
    if (headerEnd === -2)
    {
      bodyStart = headerStart + 2;
      break;
    }
    // Data.indexOf returned -1 due to a malformed message.
    else if (headerEnd === -1)
    {
      debugerror('parseMessage() | malformed message');

      return;
    }

    parsed = parseHeader(message, data, headerStart, headerEnd);

    if (parsed !== true)
    {
      debugerror('parseMessage() |', parsed.error);

      return;
    }

    headerStart = headerEnd + 2;
  }

  /* RFC3261 18.3.
   * If there are additional bytes in the transport packet
   * beyond the end of the body, they MUST be discarded.
   */
  if (message.hasHeader('content-length'))
  {
    const contentLength = message.getHeader('content-length');

    message.body = data.substr(bodyStart, contentLength);
  }
  else
  {
    message.body = data.substring(bodyStart);
  }

  return message;
};

/**
 * Extract and parse every header of a SIP message.
 */
function getHeader(data, headerStart)
{
  // 'start' position of the header.
  let start = headerStart;
  // 'end' position of the header.
  let end = 0;
  // 'partial end' position of the header.
  let partialEnd = 0;

  // End of message.
  if (data.substring(start, start + 2).match(/(^\r\n)/))
  {
    return -2;
  }

  while (end === 0)
  {
    // Partial End of Header.
    partialEnd = data.indexOf('\r\n', start);

    // 'indexOf' returns -1 if the value to be found never occurs.
    if (partialEnd === -1)
    {
      return partialEnd;
    }

    if (!data.substring(partialEnd + 2, partialEnd + 4).match(/(^\r\n)/) && data.charAt(partialEnd + 2).match(/(^\s+)/))
    {
      // Not the end of the message. Continue from the next position.
      start = partialEnd + 2;
    }
    else
    {
      end = partialEnd;
    }
  }

  return end;
}

function parseHeader(message, data, headerStart, headerEnd)
{
  let parsed;
  const hcolonIndex = data.indexOf(':', headerStart);
  const headerName = data.substring(headerStart, hcolonIndex).trim();
  const headerValue = data.substring(hcolonIndex + 1, headerEnd).trim();

  // If header-field is well-known, parse it.
  switch (headerName.toLowerCase())
  {
    case 'via':
    case 'v':
      message.addHeader('via', headerValue);
      if (message.getHeaders('via').length === 1)
      {
        parsed = message.parseHeader('Via');
        if (parsed)
        {
          message.via = parsed;
          message.via_branch = parsed.branch;
        }
      }
      else
      {
        parsed = 0;
      }
      break;
    case 'from':
    case 'f':
      message.setHeader('from', headerValue);
      parsed = message.parseHeader('from');
      if (parsed)
      {
        message.from = parsed;
        message.from_tag = parsed.getParam('tag');
      }
      break;
    case 'to':
    case 't':
      message.setHeader('to', headerValue);
      parsed = message.parseHeader('to');
      if (parsed)
      {
        message.to = parsed;
        message.to_tag = parsed.getParam('tag');
      }
      break;
    case 'record-route':
      parsed = Grammar.parse(headerValue, 'Record_Route');

      if (parsed === -1)
      {
        parsed = undefined;
      }
      else
      {
        for (const header of parsed)
        {
          message.addHeader('record-route', headerValue.substring(header.possition, header.offset));
          message.headers['Record-Route'][message.getHeaders('record-route').length - 1].parsed = header.parsed;
        }
      }
      break;
    case 'call-id':
    case 'i':
      message.setHeader('call-id', headerValue);
      parsed = message.parseHeader('call-id');
      if (parsed)
      {
        message.call_id = headerValue;
      }
      break;
    case 'contact':
    case 'm':
      parsed = Grammar.parse(headerValue, 'Contact');

      if (parsed === -1)
      {
        parsed = undefined;
      }
      else
      {
        for (const header of parsed)
        {
          message.addHeader('contact', headerValue.substring(header.possition, header.offset));
          message.headers.Contact[message.getHeaders('contact').length - 1].parsed = header.parsed;
        }
      }
      break;
    case 'content-length':
    case 'l':
      message.setHeader('content-length', headerValue);
      parsed = message.parseHeader('content-length');
      break;
    case 'content-type':
    case 'c':
      message.setHeader('content-type', headerValue);
      parsed = message.parseHeader('content-type');
      break;
    case 'cseq':
      message.setHeader('cseq', headerValue);
      parsed = message.parseHeader('cseq');
      if (parsed)
      {
        message.cseq = parsed.value;
      }
      if (message instanceof SIPMessage.IncomingResponse)
      {
        message.method = parsed.method;
      }
      break;
    case 'max-forwards':
      message.setHeader('max-forwards', headerValue);
      parsed = message.parseHeader('max-forwards');
      break;
    case 'www-authenticate':
      message.setHeader('www-authenticate', headerValue);
      parsed = message.parseHeader('www-authenticate');
      break;
    case 'proxy-authenticate':
      message.setHeader('proxy-authenticate', headerValue);
      parsed = message.parseHeader('proxy-authenticate');
      break;
    case 'session-expires':
    case 'x':
      message.setHeader('session-expires', headerValue);
      parsed = message.parseHeader('session-expires');
      if (parsed)
      {
        message.session_expires = parsed.expires;
        message.session_expires_refresher = parsed.refresher;
      }
      break;
    case 'refer-to':
    case 'r':
      message.setHeader('refer-to', headerValue);
      parsed = message.parseHeader('refer-to');
      if (parsed)
      {
        message.refer_to = parsed;
      }
      break;
    case 'replaces':
      message.setHeader('replaces', headerValue);
      parsed = message.parseHeader('replaces');
      if (parsed)
      {
        message.replaces = parsed;
      }
      break;
    case 'event':
    case 'o':
      message.setHeader('event', headerValue);
      parsed = message.parseHeader('event');
      if (parsed)
      {
        message.event = parsed;
      }
      break;
    case 'remote-party-id':
      message.setHeader('remote-party-id', headerValue);
      parsed = message.parseHeader('remote-party-id');
      if (parsed) 
      {
        message.rpid = parsed;
      }
      break;
    default:
      // Do not parse this header.
      message.setHeader(headerName, headerValue);
      parsed = 0;
  }

  if (parsed === undefined)
  {
    return {
      error : `error parsing header "${headerName}"`
    };
  }
  else
  {
    return true;
  }
}

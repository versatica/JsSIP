{
  var URI = require('./URI');
  var NameAddrHeader = require('./NameAddrHeader');

  var data = {};
}



// ABNF BASIC

CRLF    = "\r\n"
DIGIT   = [0-9]
ALPHA   = [a-zA-Z]
HEXDIG  = [0-9a-fA-F]
WSP     = SP / HTAB
OCTET   = [\u0000-\u00FF]
DQUOTE  = ["]
SP      = " "
HTAB    = "\t"


// BASIC RULES

alphanum    = [a-zA-Z0-9]
reserved    = ";" / "/" / "?" / ":" / "@" / "&" / "=" / "+" / "$" / ","
unreserved  = alphanum / mark
mark        = "-" / "_" / "." / "!" / "~" / "*" / "'" / "(" / ")"
escaped     = escaped: ("%" HEXDIG HEXDIG) {return escaped.join(''); }

/* RFC3261 25: A recipient MAY replace any linear white space with a single SP
 * before interpreting the field value or forwarding the message downstream
 */
LWS = ( WSP* CRLF )? WSP+ {return " "; }

SWS = LWS?

HCOLON  = ( SP / HTAB )* ":" SWS {return ':'; }

TEXT_UTF8_TRIM  = TEXT_UTF8char+ ( LWS* TEXT_UTF8char)* {
                    return input.substring(pos, offset); }

TEXT_UTF8char   = [\x21-\x7E] / UTF8_NONASCII

UTF8_NONASCII   = [\u0080-\uFFFF]

UTF8_CONT       = [\x80-\xBF]

LHEX            = DIGIT / [\x61-\x66]

token           = (alphanum / "-" / "." / "!" / "%" / "*"
                  / "_" / "+" / "`" / "'" / "~" )+ {
                  return input.substring(pos, offset); }

token_nodot     = ( alphanum / "-"  / "!" / "%" / "*"
                  / "_" / "+" / "`" / "'" / "~" )+ {
                  return input.substring(pos, offset); }

separators      = "(" / ")" / "<" / ">" / "@" / "," / ";" / ":" / "\\"
                  / DQUOTE / "/" / "[" / "]" / "?" / "=" / "{" / "}"
                  / SP / HTAB

word            = (alphanum / "-" / "." / "!" / "%" / "*" /
                  "_" / "+" / "`" / "'" / "~" /
                  "(" / ")" / "<" / ">" /
                  ":" / "\\" / DQUOTE /
                  "/" / "[" / "]" / "?" /
                  "{" / "}" )+ {
                  return input.substring(pos, offset); }

STAR        = SWS "*" SWS   {return "*"; }
SLASH       = SWS "/" SWS   {return "/"; }
EQUAL       = SWS "=" SWS   {return "="; }
LPAREN      = SWS "(" SWS   {return "("; }
RPAREN      = SWS ")" SWS   {return ")"; }
RAQUOT      = ">" SWS       {return ">"; }
LAQUOT      = SWS "<"       {return "<"; }
COMMA       = SWS "," SWS   {return ","; }
SEMI        = SWS ";" SWS   {return ";"; }
COLON       = SWS ":" SWS   {return ":"; }
LDQUOT      = SWS DQUOTE    {return "\""; }
RDQUOT      = DQUOTE SWS    {return "\""; }

comment     = LPAREN (ctext / quoted_pair / comment)* RPAREN

ctext       = [\x21-\x27] / [\x2A-\x5B] / [\x5D-\x7E] / UTF8_NONASCII / LWS

quoted_string = SWS DQUOTE ( qdtext / quoted_pair )* DQUOTE {
                  return input.substring(pos, offset); }

quoted_string_clean = SWS DQUOTE ( qdtext / quoted_pair )* DQUOTE {
                        return input.substring(pos-1, offset+1); }

qdtext  = LWS / "\x21" / [\x23-\x5B] / [\x5D-\x7E] / UTF8_NONASCII

quoted_pair = "\\" ( [\x00-\x09] / [\x0B-\x0C] / [\x0E-\x7F] )


//=======================
// SIP URI
//=======================

SIP_URI_noparams  = uri_scheme ":"  userinfo ? hostport {
                    try {
                        data.uri = new URI(data.scheme, data.user, data.host, data.port);
                        delete data.scheme;
                        delete data.user;
                        delete data.host;
                        delete data.host_type;
                        delete data.port;
                      } catch(e) {
                        data = -1;
                      }}

SIP_URI         = uri_scheme ":"  userinfo ? hostport uri_parameters headers ? {
                    var header;
                    try {
                        data.uri = new URI(data.scheme, data.user, data.host, data.port, data.uri_params, data.uri_headers);
                        delete data.scheme;
                        delete data.user;
                        delete data.host;
                        delete data.host_type;
                        delete data.port;
                        delete data.uri_params;

                        if (startRule === 'SIP_URI') { data = data.uri;}
                      } catch(e) {
                        data = -1;
                      }}

uri_scheme      = uri_scheme_sips / uri_scheme_sip

uri_scheme_sips = scheme: "sips"i {
                    data.scheme = scheme.toLowerCase(); }

uri_scheme_sip = scheme: "sip"i {
                    data.scheme = scheme.toLowerCase(); }

userinfo        = user (":" password)? "@" {
                    data.user = decodeURIComponent(input.substring(pos-1, offset));}

user            = ( unreserved / escaped / user_unreserved )+

user_unreserved = "&" / "=" / "+" / "$" / "," / ";" / "?" / "/"

password        = ( unreserved / escaped / "&" / "=" / "+" / "$" / "," )* {
                    data.password = input.substring(pos, offset); }

hostport        = host ( ":" port )?

host            = ( IPv4address / IPv6reference / hostname ) {
                    data.host = input.substring(pos, offset).toLowerCase();
                    return data.host; }

// 'hostname' grammar is relaxed.
// RFC 3261:
//   hostname = *( domainlabel "." ) toplabel [ "." ]
//   domainlabel = alphanum / alphanum *( alphanum / "-" ) alphanum
//   toplabel = ALPHA / ALPHA *( alphanum / "-" ) alphanum

hostname        = ( domainlabel "." )* toplabel  "." ? {
                  data.host_type = 'domain';
                  return input.substring(pos, offset); }

domainlabel     = domainlabel: ( [a-zA-Z0-9_-]+ )

toplabel        = toplabel: ( [a-zA-Z0-9_-]+ )

IPv6reference   = "[" IPv6address "]" {
                    data.host_type = 'IPv6';
                    return input.substring(pos, offset); }

IPv6address     = ( h16 ":" h16 ":" h16 ":" h16 ":" h16 ":" h16 ":" ls32
                  / "::" h16 ":" h16 ":" h16 ":" h16 ":" h16 ":" ls32
                  / "::" h16 ":" h16 ":" h16 ":" h16 ":" ls32
                  / "::" h16 ":" h16 ":" h16 ":" ls32
                  / "::" h16 ":" h16 ":" ls32
                  / "::" h16 ":" ls32
                  / "::" ls32
                  / "::" h16
                  / h16 "::" h16 ":" h16 ":" h16 ":" h16 ":" ls32
                  / h16 (":" h16)? "::" h16 ":" h16 ":" h16 ":" ls32
                  / h16 (":" h16)? (":" h16)? "::" h16 ":" h16 ":" ls32
                  / h16 (":" h16)? (":" h16)? (":" h16)? "::" h16 ":" ls32
                  / h16 (":" h16)? (":" h16)? (":" h16)? (":" h16)? "::" ls32
                  / h16 (":" h16)? (":" h16)? (":" h16)? (":" h16)? (":" h16)? "::" h16
                  / h16 (":" h16)? (":" h16)? (":" h16)? (":" h16)? (":" h16)? (":" h16)? "::"
                  ) {
                  data.host_type = 'IPv6';
                  return input.substring(pos, offset); }


h16             = HEXDIG HEXDIG? HEXDIG? HEXDIG?

ls32            = ( h16 ":" h16 ) / IPv4address


IPv4address     = dec_octet "." dec_octet "." dec_octet "." dec_octet {
                    data.host_type = 'IPv4';
                    return input.substring(pos, offset); }

dec_octet       = "25" [\x30-\x35]          // 250-255
                / "2" [\x30-\x34] DIGIT     // 200-249
                / "1" DIGIT DIGIT           // 100-199
                / [\x31-\x39] DIGIT         // 10-99
                / DIGIT                     // 0-9

port            = port: (DIGIT ? DIGIT ? DIGIT ? DIGIT ? DIGIT ?) {
                    port = parseInt(port.join(''));
                    data.port = port;
                    return port; }

// URI PARAMETERS

uri_parameters    = ( ";" uri_parameter)*

uri_parameter     = transport_param / user_param / method_param
                    / ttl_param / maddr_param / lr_param / other_param

transport_param   = "transport="i transport: ( "udp"i / "tcp"i / "sctp"i
                    / "tls"i / other_transport) {
                      if(!data.uri_params) data.uri_params={};
                      data.uri_params['transport'] = transport.toLowerCase(); }

other_transport   = token

user_param        = "user="i user:( "phone"i / "ip"i / other_user) {
                      if(!data.uri_params) data.uri_params={};
                      data.uri_params['user'] = user.toLowerCase(); }

other_user        = token

method_param      = "method="i method: Method {
                      if(!data.uri_params) data.uri_params={};
                      data.uri_params['method'] = method; }

ttl_param         = "ttl="i ttl: ttl {
                      if(!data.params) data.params={};
                      data.params['ttl'] = ttl; }

maddr_param       = "maddr="i maddr: host {
                      if(!data.uri_params) data.uri_params={};
                      data.uri_params['maddr'] = maddr; }

lr_param          = "lr"i ('=' token)? {
                      if(!data.uri_params) data.uri_params={};
                      data.uri_params['lr'] = undefined; }

other_param       = param: pname value: ( "=" pvalue )? {
                      if(!data.uri_params) data.uri_params = {};
                      if (typeof value === 'undefined'){
                        value = undefined;
                      }
                      else {
                        value = value[1];
                      }
                      data.uri_params[param.toLowerCase()] = value;}

pname             = pname: paramchar + {return pname.join(''); }

pvalue            = pvalue: paramchar + {return pvalue.join(''); }

paramchar         = param_unreserved / unreserved / escaped

param_unreserved  = "[" / "]" / "/" / ":" / "&" / "+" / "$"


// HEADERS

headers           = "?" header ( "&" header )*

header            = hname: hname "=" hvalue: hvalue  {
                      hname = hname.join('').toLowerCase();
                      hvalue = hvalue.join('');
                      if(!data.uri_headers) data.uri_headers = {};
                      if (!data.uri_headers[hname]) {
                        data.uri_headers[hname] = [hvalue];
                      } else {
                        data.uri_headers[hname].push(hvalue);
                      }}

hname             = ( hnv_unreserved / unreserved / escaped )+

hvalue            = ( hnv_unreserved / unreserved / escaped )*

hnv_unreserved    = "[" / "]" / "/" / "?" / ":" / "+" / "$"


// FIRST LINE

Request_Response  = Status_Line / Request_Line


// REQUEST LINE

Request_Line      = Method SP Request_URI SP SIP_Version

Request_URI       = SIP_URI / absoluteURI

absoluteURI       = scheme ":" ( hier_part / opaque_part )

hier_part         = ( net_path / abs_path ) ( "?" query )?

net_path          = "//" authority  abs_path ?

abs_path          = "/" path_segments

opaque_part       = uric_no_slash uric *

uric              = reserved / unreserved / escaped

uric_no_slash     = unreserved / escaped / ";" / "?" / ":" / "@" / "&" / "="
                    / "+" / "$" / ","

path_segments     = segment ( "/" segment )*

segment           = pchar * ( ";" param )*

param             = pchar *

pchar             = unreserved / escaped /
                    ":" / "@" / "&" / "=" / "+" / "$" / ","

scheme            = ( ALPHA ( ALPHA / DIGIT / "+" / "-" / "." )* ){
                    data.scheme= input.substring(pos, offset); }

authority         = srvr / reg_name

srvr              = ( ( userinfo "@" )? hostport )?

reg_name          = ( unreserved / escaped / "$" / ","
                    / ";" / ":" / "@" / "&" / "=" / "+" )+

query             = uric *

SIP_Version       = "SIP"i "/" DIGIT + "." DIGIT + {
                    data.sip_version = input.substring(pos, offset); }

// SIP METHODS

INVITEm           = "\x49\x4E\x56\x49\x54\x45" // INVITE in caps

ACKm              = "\x41\x43\x4B" // ACK in caps

OPTIONSm          = "\x4F\x50\x54\x49\x4F\x4E\x53" // OPTIONS in caps

BYEm              = "\x42\x59\x45" // BYE in caps

CANCELm           = "\x43\x41\x4E\x43\x45\x4C" // CANCEL in caps

REGISTERm         = "\x52\x45\x47\x49\x53\x54\x45\x52" // REGISTER in caps

SUBSCRIBEm        = "\x53\x55\x42\x53\x43\x52\x49\x42\x45" // SUBSCRIBE in caps

NOTIFYm           = "\x4E\x4F\x54\x49\x46\x59" // NOTIFY in caps

REFERm            = "\x52\x45\x46\x45\x52" // REFER in caps

Method            = ( INVITEm / ACKm / OPTIONSm / BYEm / CANCELm / REGISTERm
                    / SUBSCRIBEm / NOTIFYm / REFERm / extension_method ){
                    data.method = input.substring(pos, offset);
                    return data.method; }

extension_method  = token


// STATUS LINE

Status_Line     = SIP_Version SP Status_Code SP Reason_Phrase

Status_Code     = status_code: extension_code {
                  data.status_code = parseInt(status_code.join('')); }

extension_code  = DIGIT DIGIT DIGIT

Reason_Phrase   = (reserved / unreserved / escaped
                  / UTF8_NONASCII / UTF8_CONT / SP / HTAB)* {
                  data.reason_phrase = input.substring(pos, offset); }


//=======================
// HEADERS
//=======================

// Allow-Events

Allow_Events = event_type (COMMA event_type)*


// CALL-ID

Call_ID  =  word ( "@" word )? {
              data = input.substring(pos, offset); }

// CONTACT

Contact             = ( STAR / (contact_param (COMMA contact_param)*) ) {
                        var idx, length;
                        length = data.multi_header.length;
                        for (idx = 0; idx < length; idx++) {
                          if (data.multi_header[idx].parsed === null) {
                            data = null;
                            break;
                          }
                        }
                        if (data !== null) {
                          data = data.multi_header;
                        } else {
                          data = -1;
                        }}

contact_param       = (addr_spec / name_addr) (SEMI contact_params)* {
                        var header;
                        if(!data.multi_header) data.multi_header = [];
                        try {
                          header = new NameAddrHeader(data.uri, data.display_name, data.params);
                          delete data.uri;
                          delete data.display_name;
                          delete data.params;
                        } catch(e) {
                          header = null;
                        }
                        data.multi_header.push( { 'possition': pos,
                                                  'offset': offset,
                                                  'parsed': header
                                                });}

name_addr           = ( display_name )? LAQUOT SIP_URI RAQUOT

addr_spec           = SIP_URI_noparams

display_name        = display_name: (token ( LWS token )* / quoted_string) {
                        display_name = input.substring(pos, offset).trim();
                        if (display_name[0] === '\"') {
                          display_name = display_name.substring(1, display_name.length-1);
                        }
                        data.display_name = display_name; }
                        // The previous rule is corrected from RFC3261

contact_params      = c_p_q / c_p_expires / contact_extension

c_p_q               = "q"i EQUAL q: qvalue {
                        if(!data.params) data.params = {};
                        data.params['q'] = q; }

c_p_expires         = "expires"i EQUAL expires: delta_seconds {
                        if(!data.params) data.params = {};
                        data.params['expires'] = expires; }

contact_extension   = generic_param

delta_seconds       = delta_seconds: DIGIT+ {
                        return parseInt(delta_seconds.join('')); }

qvalue              = "0" ( "." DIGIT? DIGIT? DIGIT? )? {
                        return parseFloat(input.substring(pos, offset)); }

generic_param       = param: token  value: ( EQUAL gen_value )? {
                        if(!data.params) data.params = {};
                        if (typeof value === 'undefined'){
                          value = undefined;
                        }
                        else {
                          value = value[1];
                        }
                        data.params[param.toLowerCase()] = value;}

gen_value           = token / host / quoted_string


// CONTENT-DISPOSITION

Content_Disposition     = disp_type ( SEMI disp_param )*

disp_type               = "render"i / "session"i / "icon"i / "alert"i / disp_extension_token

disp_param              = handling_param / generic_param

handling_param          = "handling"i EQUAL ( "optional"i / "required"i / other_handling )

other_handling          = token

disp_extension_token    = token


// CONTENT-ENCODING

Content_Encoding    = content_coding (COMMA content_coding)*

content_coding      = token


// CONTENT-LENGTH

Content_Length      = length: (DIGIT +) {
                        data = parseInt(length.join('')); }

// CONTENT-TYPE

Content_Type        = media_type {
                        data = input.substring(pos, offset); }

media_type          = m_type SLASH m_subtype (SEMI m_parameter)*

m_type              = discrete_type / composite_type

discrete_type       = "text"i / "image"i / "audio"i / "video"i / "application"i
                    / extension_token

composite_type      = "message"i / "multipart"i / extension_token

extension_token     = ietf_token / x_token

ietf_token          = token

x_token             = "x-"i token

m_subtype           = extension_token / iana_token

iana_token          = token

m_parameter         = m_attribute EQUAL m_value

m_attribute         = token

m_value             = token / quoted_string


// CSEQ

CSeq          = CSeq_value LWS CSeq_method

CSeq_value    = cseq_value: DIGIT + {
                  data.value=parseInt(cseq_value.join('')); }

CSeq_method   = Method


// EXPIRES

Expires     = expires: delta_seconds {data = expires; }


Event             = event_type: event_type ( SEMI event_param )* {
                       data.event = event_type.join('').toLowerCase(); }

event_type        = event_package ( "." event_template )*

event_package     = token_nodot

event_template    = token_nodot

event_param       = generic_param

// FROM

From        = ( addr_spec / name_addr ) ( SEMI from_param )* {
                var tag = data.tag;
                try {
                  data = new NameAddrHeader(data.uri, data.display_name, data.params);
                  if (tag) {data.setParam('tag',tag)}
                } catch(e) {
                  data = -1;
                }}

from_param  = tag_param / generic_param

tag_param   = "tag"i EQUAL tag: token {data.tag = tag; }


// MAX-FORWARDS

Max_Forwards  = forwards: DIGIT+ {
                  data = parseInt(forwards.join('')); }


// MIN-EXPIRES

Min_Expires  = min_expires: delta_seconds {data = min_expires; }

// Name_Addr

Name_Addr_Header =  ( display_name )* LAQUOT SIP_URI RAQUOT ( SEMI generic_param )* {
                      try {
                        data = new NameAddrHeader(data.uri, data.display_name, data.params);
                      } catch(e) {
                        data = -1;
                      }}

// PROXY-AUTHENTICATE

Proxy_Authenticate  = proxy_authenticate: challenge

challenge           = ("Digest"i LWS digest_cln (COMMA digest_cln)*)
                      / other_challenge

other_challenge     = auth_scheme LWS auth_param (COMMA auth_param)*

auth_scheme         = token

auth_param          = auth_param_name EQUAL ( token / quoted_string )

auth_param_name     = token

digest_cln          = realm / domain / nonce / opaque / stale / algorithm
                      / qop_options / auth_param

realm               = "realm"i EQUAL realm_value

realm_value         = realm: quoted_string_clean { data.realm = realm; }

domain              = "domain"i EQUAL LDQUOT URI ( SP+ URI )* RDQUOT

URI                 = absoluteURI / abs_path

nonce               = "nonce"i EQUAL nonce_value

nonce_value         = nonce: quoted_string_clean { data.nonce=nonce; }

opaque              = "opaque"i EQUAL opaque: quoted_string_clean { data.opaque=opaque; }

stale               = "stale"i EQUAL ( "true"i { data.stale=true; } / "false"i { data.stale=false; } )

algorithm           = "algorithm"i EQUAL algorithm: ( "MD5"i / "MD5-sess"i
                      / token ) {
                      data.algorithm=algorithm.toUpperCase(); }

qop_options         = "qop"i EQUAL LDQUOT (qop_value ("," qop_value)*) RDQUOT

qop_value           = qop_value: ( "auth-int"i / "auth"i / token ) {
                        data.qop || (data.qop=[]);
                        data.qop.push(qop_value.toLowerCase()); }


// PROXY-REQUIRE

Proxy_Require  = option_tag (COMMA option_tag)*

option_tag     = token


// RECORD-ROUTE

Record_Route  = rec_route (COMMA rec_route)* {
                  var idx, length;
                  length = data.multi_header.length;
                  for (idx = 0; idx < length; idx++) {
                    if (data.multi_header[idx].parsed === null) {
                      data = null;
                      break;
                    }
                  }
                  if (data !== null) {
                    data = data.multi_header;
                  } else {
                    data = -1;
                  }}

rec_route     = name_addr ( SEMI rr_param )* {
                  var header;
                  if(!data.multi_header) data.multi_header = [];
                  try {
                    header = new NameAddrHeader(data.uri, data.display_name, data.params);
                    delete data.uri;
                    delete data.display_name;
                    delete data.params;
                  } catch(e) {
                    header = null;
                  }
                  data.multi_header.push( { 'possition': pos,
                                            'offset': offset,
                                            'parsed': header
                                          });}

rr_param      = generic_param


// REASON

//Reason        = ( "SIP"i / token ) ( SEMI "cause" EQUAL cause: DIGIT + )? ( SEMI "text" EQUAL text:  )? {
//  data.cause = cause;
//  data.text = text;
//}


// Reason        = ( "SIP"i / token ) ( SEMI generic_param )*;


Reason        = protocol: ( "SIP"i / token ) ( SEMI reason_param )* {
                  data.protocol = protocol.toLowerCase();

                  if (!data.params) data.params = {};

                  if (data.params.text && data.params.text[0] === '"') {
                    var text = data.params.text;
                    data.text = text.substring(1, text.length-1);
                    delete data.params.text;
                  }
                }

reason_param  = ( reason_cause / generic_param );

reason_cause  = "cause"i EQUAL cause: DIGIT + {
                  data.cause = parseInt(cause.join(''));
                }


// REQUIRE

Require       = option_tag (COMMA option_tag)*


// ROUTE

Route        = route_param (COMMA route_param)*

route_param  = name_addr ( SEMI rr_param )*


// SUBSCRIPTION-STATE

Subscription_State   = substate_value ( SEMI subexp_params )*

substate_value       = ( "active"i / "pending"i / "terminated"i
                       / extension_substate ) {
                        data.state = input.substring(pos, offset); }

extension_substate   = token

subexp_params        = ("reason"i EQUAL reason: event_reason_value) {
                        if (typeof reason !== 'undefined') data.reason = reason; }
                       / ("expires"i EQUAL expires: delta_seconds) {
                        if (typeof expires !== 'undefined') data.expires = expires; }
                       / ("retry_after"i EQUAL retry_after: delta_seconds) {
                        if (typeof retry_after !== 'undefined') data.retry_after = retry_after; }
                       / generic_param

event_reason_value   = "deactivated"i
                       / "probation"i
                       / "rejected"i
                       / "timeout"i
                       / "giveup"i
                       / "noresource"i
                       / "invariant"i
                       / event_reason_extension

event_reason_extension = token


// SUBJECT

Subject  = ( TEXT_UTF8_TRIM )?


// SUPPORTED

Supported  = ( option_tag (COMMA option_tag)* )?


// TO

To         = ( addr_spec / name_addr ) ( SEMI to_param )* {
              var tag = data.tag;
              try {
                data = new NameAddrHeader(data.uri, data.display_name, data.params);
                if (tag) {data.setParam('tag',tag)}
              } catch(e) {
                data = -1;
              }}

to_param   = tag_param / generic_param

// VIA

Via               = via_param (COMMA via_param)*

via_param         = sent_protocol LWS sent_by ( SEMI via_params )*

via_params        = via_ttl / via_maddr / via_received / via_branch / response_port / via_extension

via_ttl           = "ttl"i EQUAL via_ttl_value: ttl {
                      data.ttl = via_ttl_value; }

via_maddr         = "maddr"i EQUAL via_maddr: host {
                      data.maddr = via_maddr; }

via_received      = "received"i EQUAL via_received: (IPv4address / IPv6address) {
                      data.received = via_received; }

via_branch        = "branch"i EQUAL via_branch: token {
                      data.branch = via_branch; }

response_port     = "rport"i (EQUAL response_port: (DIGIT*) )? {
                      if(typeof response_port !== 'undefined')
                        data.rport = response_port.join(''); }

via_extension     = generic_param

sent_protocol     = protocol_name SLASH protocol_version SLASH transport

protocol_name     = via_protocol: ( "SIP"i / token ) {
                      data.protocol = via_protocol; }

protocol_version  = token

transport         = via_transport: ("UDP"i / "TCP"i / "TLS"i / "SCTP"i / other_transport) {
                      data.transport = via_transport; }

sent_by           = via_host ( COLON via_port )?

via_host          = ( IPv4address / IPv6reference / hostname ) {
                      data.host = input.substring(pos, offset); }

via_port          = via_sent_by_port: (DIGIT ? DIGIT ? DIGIT ? DIGIT ? DIGIT ?) {
                      data.port = parseInt(via_sent_by_port.join('')); }

ttl               = ttl: (DIGIT DIGIT ? DIGIT ?) {
                      return parseInt(ttl.join('')); }


// WWW-AUTHENTICATE

WWW_Authenticate  = www_authenticate: challenge


// SESSION-EXPIRES

Session_Expires   = s_e_expires ( SEMI s_e_params )*

s_e_expires       = expires: delta_seconds { data.expires = expires; }

s_e_params        = s_e_refresher / s_e_extension

s_e_refresher     = "refresher"i EQUAL s_e_refresher_value: ( "uac"i / "uas"i ) { data.refresher = s_e_refresher_value.toLowerCase(); }

s_e_extension     = generic_param


// EXTENSION-HEADER

extension_header  = extension_header: header_name HCOLON header_value: header_value

header_name       = token

header_value      = (TEXT_UTF8char / UTF8_CONT / LWS)*

message_body      = OCTET*


// UUID URI

uuid_URI      = "uuid:" uuid
uuid          = uuid: hex8 "-" hex4 "-" hex4 "-" hex4 "-" hex12 {
                  data = input.substring(pos+5, offset); }
hex4          = HEXDIG HEXDIG HEXDIG HEXDIG
hex8          = hex4 hex4
hex12         = hex4 hex4 hex4


// Refer-To

Refer_To        = ( addr_spec / name_addr ) ( SEMI generic_param )* {
                try {
                  data = new NameAddrHeader(data.uri, data.display_name, data.params);
                } catch(e) {
                  data = -1;
                }}

// Replaces
Replaces        = call_id: call_id (SEMI replaces_param)*

call_id          =  word ( "@" word )? {
                  data.call_id = input.substring(pos, offset); }

replaces_param  = to_tag / from_tag / early_flag / generic_param

to_tag          = "to-tag" EQUAL to_tag: token {
                    data.to_tag = to_tag; }

from_tag        = "from-tag" EQUAL from_tag: token {
                    data.from_tag = from_tag; }

early_flag      = "early-only" {
                    data.early_only = true; }

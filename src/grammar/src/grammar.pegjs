{ var data = {}; } // Object to which header attributes will be assigned during parsing

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
escaped     = "%" HEXDIG HEXDIG

/* RFC3261 25: A recipient MAY replace any linear white space with a single SP
 * before interpreting the field value or forwarding the message downstream
 */
LWS = ( WSP* CRLF )? WSP+ {return " "; }

SWS = LWS?

HCOLON  = ( SP / HTAB )* ":" SWS {return ':'; }

TEXT_UTF8_TRIM  = TEXT_UTF8char+ ( LWS* TEXT_UTF8char)* {
                    return input.substring(pos, offset); }

TEXT_UTF8char   = [\x21-\x7E] / UTF8_NONASCII

UTF8_NONASCII   = [\x80-\xFF] //Changed from RFC3261

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

qdtext  = LWS / "\x21" / [\x23-\x5B] / [\x5D-\x7E] / UTF8_NONASCII

quoted_pair = "\\" ( [\x00-\x09] / [\x0B-\x0C] / [\x0E-\x7F] )


//=======================
// SIP URI
//=======================

SIP_URI_simple  = uri_scheme ":" userinfo ? hostport {
                    data.uri = input.substring(pos, offset); }

SIP_URI         = uri_scheme ":"  userinfo ? hostport uri_parameters headers ? {
                    data.uri = input.substring(pos, offset); }

uri_scheme      = uri_scheme:  "sip" {
                    data.scheme = uri_scheme; }

userinfo        = user  "@"

user            = ( unreserved / escaped / user_unreserved )+ {
                    data.user = input.substring(pos, offset); }

user_unreserved = "&" / "=" / "+" / "$" / "," / ";" / "?" / "/"

password        = ( unreserved / escaped / "&" / "=" / "+" / "$" / "," )*

hostport        = host ( ":" port )?

host            = ( hostname / IPv4address / IPv6reference ) {
                    data.host = input.substring(pos, offset); }

hostname        = ( domainlabel "." )* toplabel  "." ? {
                  data.host_type = 'domain';
                  return input.substring(pos, offset); }

domainlabel     = domainlabel: ( [a-zA-Z0-9_-]+ )

toplabel        = toplabel: ( [a-zA-Z_-]+ )

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
                    port = parseInt(port.join(""));
                    data.port = port;
                    return port; }

// URI PARAMETERS

uri_parameters    = ( ";" uri_parameter)*

uri_parameter     = transport_param / user_param / method_param
                    / ttl_param / maddr_param / lr_param / other_param

transport_param   = "transport=" transport: ( "udp" / "tcp" / "sctp"
                    / "tls" / other_transport) {
                      if(!data.params) data.params={};
                      data.params['transport'] = transport; }

other_transport   = token

user_param        = "user=" user:( "phone" / "ip" / other_user) {
                      if(!data.params) data.params={};
                      data.params['user'] = user; }

other_user        = token

method_param      = "method=" method: Method {
                      if(!data.params) data.params={};
                      data.params['method'] = method; }

ttl_param         = "ttl=" ttl: ttl {
                      if(!data.params) data.params={};
                      data.params['ttl'] = ttl; }

maddr_param       = "maddr=" maddr: host {
                      if(!data.params) data.params={};
                      data.params['maddr'] = maddr; }

lr_param          = lr: "lr" {
                      if(!data.params) data.params={};
                      data.params['lr'] = true; }

other_param       = param_name: pname ( "=" pvalue )? {
                      if(!data.params) data.params={};
                      if(param_name.length === (pos - offset)) {
                        data.params[param_name] = true;
                      }
                      else {
                        data.params[param_name] = input.substring(pos, offset+param_name.length+1);
                      }; }

pname             = pname: paramchar + {return pname.join(""); }

pvalue            = pvalue: paramchar + {return pvalue.join(""); }

paramchar         = param_unreserved / unreserved / escaped

param_unreserved  = "[" / "]" / "/" / ":" / "&" / "+" / "$"


// HEADERS

headers           = "?" header ( "&" header )*

header            = hname "=" hvalue

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

SIP_Version       = "SIP" "/" DIGIT + "." DIGIT + {
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

Method            = ( INVITEm / ACKm / OPTIONSm / BYEm / CANCELm / REGISTERm
                    / SUBSCRIBEm / NOTIFYm / extension_method ){
                    data.method = input.substring(pos, offset); }

extension_method  = token


// STATUS LINE

Status_Line     = SIP_Version SP Status_Code SP Reason_Phrase

Status_Code     = status_code: extension_code {
                  data.status_code = parseInt(status_code.join("")); }

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

Contact             = ( STAR / (contact_param (COMMA contact_param)*) )

contact_param       = (addr_spec / name_addr) (SEMI contact_params)*

name_addr           = ( display_name )? LAQUOT addr_spec RAQUOT

addr_spec           = SIP_URI / absoluteURI

addr_spec_simple    = SIP_URI_simple / absoluteURI

display_name        = display_name: (token ( LWS token )* / quoted_string) {
                        data.display_name = display_name; }
                        // The previous is corrected from RFC3261

contact_params      = c_p_q / c_p_expires / contact_extension

c_p_q               = "q" EQUAL q: qvalue {
                        if(!data.params) data.params = {};
                        data.params['q'] = q; }

c_p_expires         = "expires" EQUAL expires: delta_seconds {
                        if(!data.params) data.params = {};
                        data.params['expires'] = expires; }

contact_extension   = c_e: generic_param {
                        if(!data.params) data.params = {};
                        if(c_e[1]) {
                          data.params[c_e[0]] = c_e[1];
                        }
                        else {
                          data.params[c_e[0]] = true;
                        }; }

delta_seconds       = delta_seconds: DIGIT+ {
                        return parseInt(delta_seconds.join("")); }

qvalue              = "0" ( "." DIGIT? DIGIT? DIGIT? )? {
                        return parseFloat(input.substring(pos, offset)); }

generic_param       = param: token  value: ( EQUAL gen_value )? {
                        if(typeof value === 'undefined')
                          var value = null;
                        else
                          value = value[1];
                        return [ param, value ]; }

gen_value           = token / host / quoted_string


// CONTENT-DISPOSITION

Content_Disposition     = disp_type ( SEMI disp_param )*

disp_type               = "render" / "session" / "icon" / "alert" / disp_extension_token

disp_param              = handling_param / generic_param

handling_param          = "handling" EQUAL ( "optional" / "required" / other_handling )

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

discrete_type       = "text" / "image" / "audio" / "video" / "application"
                    / extension_token

composite_type      = "message" / "multipart" / extension_token

extension_token     = ietf_token / x_token

ietf_token          = token

x_token             = "x-" token

m_subtype           = extension_token / iana_token

iana_token          = token

m_parameter         = m_attribute EQUAL m_value

m_attribute         = token

m_value             = token / quoted_string


// CSEQ

CSeq          = CSeq_value LWS CSeq_method

CSeq_value    = cseq_value: DIGIT + {
                  data.value=parseInt(cseq_value.join("")); }

CSeq_method   = Method


// EXPIRES

Expires     = expires: delta_seconds {data = expires; }


Event             = event_type: event_type ( SEMI event_param )* {
                       data.event = event_type.join(''); }

event_type        = event_package ( "." event_template )*

event_package     = token_nodot

event_template    = token_nodot

event_param       = e_v: generic_param {
                      if(!data.params) data.params = {};
                      if(e_v[1]) {
                        data.params[e_v[0]] = e_v[1];
                      }
                      else {
                        data.params[e_v[0]] = true;
                      }; }


// FROM

From        = ( addr_spec_simple / name_addr ) ( SEMI from_param )*

from_param  = tag_param / generic_param

tag_param   = "tag" EQUAL tag: token {data.tag = tag; }


//MAX-FORWARDS

Max_Forwards  = forwards: DIGIT+ {
                  data = parseInt(forwards.join("")); }


// MIN-EXPIRES

Min_Expires  = min_expires: delta_seconds {data = min_expires; }


// PROXY-AUTHENTICATE

Proxy_Authenticate  = proxy_authenticate: challenge

challenge           = ("Digest" LWS digest_cln (COMMA digest_cln)*)
                      / other_challenge

other_challenge     = auth_scheme LWS auth_param (COMMA auth_param)*

auth_scheme         = token

auth_param          = auth_param_name EQUAL ( token / quoted_string )

auth_param_name     = token

digest_cln          = realm / domain / nonce / opaque / stale / algorithm
                      / qop_options / auth_param

realm               = "realm" EQUAL realm_value

realm_value         = realm: quoted_string {data.realm = realm; }

domain              = "domain" EQUAL LDQUOT URI ( SP+ URI )* RDQUOT

URI                 = absoluteURI / abs_path

nonce               = "nonce" EQUAL nonce_value

nonce_value         = nonce: quoted_string {data.nonce=nonce; }

opaque              = "opaque" EQUAL opaque: quoted_string {
                        data.opaque=opaque; }

stale               = "stale" EQUAL stale: ( "true" / "false" ) {
                        data.stale=stale; }

algorithm           = "algorithm" EQUAL algorithm: ( "MD5" / "MD5-sess"
                      / token ) {
                      data.algorithm=algorithm; }

qop_options         = "qop" EQUAL LDQUOT qop: (qop_value
                      ("," qop_value)*) RDQUOT {
                      data.qop= input.substring(pos-1, offset+5); }

qop_value           = "auth-int" / "auth" / token


// PROXY-REQUIRE

Proxy_Require  = option_tag (COMMA option_tag)*

option_tag     = token


// RECORD-ROUTE

Record_Route  = rec_route (COMMA rec_route)*

rec_route     = name_addr ( SEMI rr_param )*

rr_param      = generic_param


// REQUIRE

Require       = option_tag (COMMA option_tag)*


// ROUTE

Route        = route_param (COMMA route_param)*

route_param  = name_addr ( SEMI rr_param )*


// SUBSCRIPTION-STATE

Subscription_State   = substate_value ( SEMI subexp_params )*

substate_value       = ( "active" / "pending" / "terminated"
                       / extension_substate ) {
                        data.state = input.substring(pos, offset); }

extension_substate   = token

subexp_params        = ("reason" EQUAL reason: event_reason_value) {
                        if (typeof reason !== 'undefined') data.reason = reason; }
                       / ("expires" EQUAL expires: delta_seconds) {
                        if (typeof expires !== 'undefined') data.expires = expires; }
                       / ("retry_after" EQUAL retry_after: delta_seconds) {
                        if (typeof retry_after !== 'undefined') data.retry_after = retry_after; }
                       / g_p: generic_param {
                        if (typeof g_p !== 'undefined') {
                          if(!data.params) data.params = {};
                          if(g_p[1]) data.params[g_p[0]] = g_p[1];
                          else data.params[g_p[0]] = true;
                       }; }

event_reason_value   = "deactivated"
                       / "probation"
                       / "rejected"
                       / "timeout"
                       / "giveup"
                       / "noresource"
                       / "invariant"
                       / event_reason_extension

event_reason_extension = token


// SUBJECT

Subject  = ( TEXT_UTF8_TRIM )?


// SUPPORTED

Supported  = ( option_tag (COMMA option_tag)* )?


// TO

To         = ( addr_spec_simple / name_addr ) ( SEMI to_param )*

to_param   = tag_param / generic_param


// VIA

Via               = via_parm (COMMA via_parm)*

via_parm          = sent_protocol LWS sent_by ( SEMI via_params )*

via_params        = via_ttl / via_maddr / via_received / via_branch / response_port / via_extension

via_ttl           = "ttl" EQUAL via_ttl_value: ttl {
                      data.ttl = via_ttl_value; }

via_maddr         = "maddr" EQUAL via_maddr: host {
                      data.maddr = via_maddr; }

via_received      = "received" EQUAL via_received: (IPv4address / IPv6address) {
                      data.received = via_received; }

via_branch        = "branch" EQUAL via_branch: token {
                      data.branch = via_branch; }

response_port     = "rport" (EQUAL response_port: (DIGIT*) )? {
                      if(typeof response_port !== 'undefined')
                        data.rport = response_port.join(""); }

via_extension     = generic_param

sent_protocol     = protocol_name SLASH protocol_version SLASH transport

protocol_name     = via_protocol: ( "SIP" / token ) {
                      data.protocol = via_protocol; }

protocol_version  = token

transport         = via_transport: ("UDP" / "TCP" / "TLS" / "SCTP" / other_transport) {
                      data.transport = via_transport; }

sent_by           = via_host ( COLON via_port )?

via_host          = ( hostname / IPv4address / IPv6reference ) {
                      data.host = input.substring(pos, offset); }

via_port          = via_sent_by_port: (DIGIT ? DIGIT ? DIGIT ? DIGIT ? DIGIT ?) {
                      data.port = parseInt(via_sent_by_port.join("")); }

ttl               = ttl: (DIGIT DIGIT ? DIGIT ?) {
                      return parseInt(ttl.join("")); }


// WWW-AUTHENTICATE

WWW_Authenticate  = www_authenticate: challenge


// EXTENSION-HEADER

extension_header  = extension_header: header_name HCOLON header_value: header_value

header_name       = token

header_value      = (TEXT_UTF8char / UTF8_CONT / LWS)*

message_body      = OCTET*


// STUN URI (draft-nandakumar-rtcweb-stun-uri)

stun_URI          = stun_scheme ":" stun_host_port

stun_scheme       = scheme: ("stuns" / "stun") {
                      data.scheme = scheme; }

stun_host_port    = stun_host ( ":" port )?

stun_host         = host: (reg_name / IPv4address / IPv6reference) {
                      data.host = host.join(''); }

reg_name          = ( stun_unreserved / escaped / sub_delims )*

stun_unreserved   = ALPHA / DIGIT / "-" / "." / "_" / "~"

sub_delims        = "!" / "$" / "&" / "'" / "(" / ")" / "*" / "+" / "," / ";" / "="


// TURN URI (draft-petithuguenin-behave-turn-uris)

turn_URI          = turn_scheme ":" stun_host_port ( "?transport=" transport )?

turn_scheme       = scheme: ("turns" / "turn") {
                      data.scheme = scheme; }

turn_transport    = transport ("udp" / "tcp" / unreserved*) {
                      data.transport = transport; }


// Lazy uri

lazy_uri  = (uri_scheme ':')? user ('@' hostport)? uri_parameters

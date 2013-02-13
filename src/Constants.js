
/**
 * @fileoverview JsSIP Constants
 */

/**
 * JsSIP Constants.
 * @augments JsSIP
 */

JsSIP.C= {
  USER_AGENT: JsSIP.name() +' '+ JsSIP.version(),

  // Modules and Classes names for logging purposes
  // Modules
  LOG_PARSER:                 JsSIP.name() +' | '+ 'PARSER' +' | ',
  LOG_DIGEST_AUTHENTICATION:  JsSIP.name() +' | '+ 'DIGEST AUTHENTICATION' +' | ',
  LOG_SANITY_CHECK:           JsSIP.name() +' | '+ 'SANITY CHECK' +' | ',
  LOG_UTILS:                  JsSIP.name() +' | '+ 'UTILS' +' | ',

  // Classes
  LOG_TRANSPORT:              JsSIP.name() +' | '+ 'TRANSPORT' +' | ',
  LOG_TRANSACTION:            JsSIP.name() +' | '+ 'TRANSACTION' +' | ',
  LOG_DIALOG:                 JsSIP.name() +' | '+ 'DIALOG' +' | ',
  LOG_UA:                     JsSIP.name() +' | '+ 'UA' +' | ',
  LOG_URI:                    JsSIP.name() +' | '+ 'URI' +' | ',
  LOG_NAME_ADDR_HEADER:       JsSIP.name() +' | '+ 'NAME ADDR HEADER' +' | ',
  LOG_INVITE_SESSION:         JsSIP.name() +' | '+ 'INVITE SESSION' +' | ',
  LOG_CLIENT_INVITE_SESSION:  JsSIP.name() +' | '+ 'CLIENT INVITE SESSION' +' | ',
  LOG_SERVER_INVITE_SESSION:  JsSIP.name() +' | '+ 'SERVER INVITE SESSION' +' | ',
  LOG_EVENT_EMITTER:          JsSIP.name() +' | '+ 'EVENT EMITTER' +' | ',
  LOG_MEDIA_SESSION:          JsSIP.name() +' | '+ 'MEDIA SESSION' +' | ',
  LOG_MESSAGE:                JsSIP.name() +' | '+ 'MESSAGE' +' | ',
  LOG_MESSAGE_RECEIVER:       JsSIP.name() +' | '+ 'MESSAGE_RECEIVER' +' | ',
  LOG_MESSAGE_SENDER:         JsSIP.name() +' | '+ 'MESSAGE_SENDER' +' | ',
  LOG_REGISTRATOR:            JsSIP.name() +' | '+ 'REGISTRATOR' +' | ',
  LOG_REQUEST_SENDER:         JsSIP.name() +' | '+ 'REQUEST SENDER' +' | ',
  LOG_SUBSCRIBER:             JsSIP.name() +' | '+ 'SUBSCRIBER' +' | ',
  LOG_PRESENCE:               JsSIP.name() +' | '+ 'PRESENCE' +' | ',
  LOG_MESSAGE_SUMMARY:        JsSIP.name() +' | '+ 'MESSAGE_SUMMARY' +' | ',


  // SIP schemes
  SIP: 'sip',

  // Invalid target
  INVALID_TARGET_URI: 'sip:invalid@invalid',

  // Transaction states
  TRANSACTION_TRYING:     1,
  TRANSACTION_PROCEEDING: 2,
  TRANSACTION_CALLING:    3,
  TRANSACTION_ACCEPTED:   4,
  TRANSACTION_COMPLETED:  5,
  TRANSACTION_TERMINATED: 6,
  TRANSACTION_CONFIRMED:  7,

  // Dialog states
  DIALOG_EARLY:       1,
  DIALOG_CONFIRMED:   2,

  // Invite Session states
  SESSION_NULL:               0,
  SESSION_INVITE_SENT:        1,
  SESSION_1XX_RECEIVED:       2,
  SESSION_INVITE_RECEIVED:    3,
  SESSION_WAITING_FOR_ANSWER: 4,
  SESSION_WAITING_FOR_ACK:    5,
  SESSION_CANCELED:           6,
  SESSION_TERMINATED:         7,
  SESSION_CONFIRMED:          8,

  // Global error codes
  CONNECTION_ERROR:        1,
  REQUEST_TIMEOUT:        2,

  // End and failure causes
  causes: {

    // Generic error causes
    INVALID_TARGET:           'Invalid Target',
    WEBRTC_NOT_SUPPORTED:     'WebRTC Not Supported',

    // Invite session end causes
    BYE:                      'Terminated',
    CANCELED:                 'Canceled',
    NO_ANSWER:                'No Answer',
    EXPIRES:                  'Expires',
    CONNECTION_ERROR:         'Connection Error',
    REQUEST_TIMEOUT:          'Request Timeout',
    NO_ACK:                   'No ACK',
    USER_DENIED_MEDIA_ACCESS: 'User Denied Media Access',
    BAD_MEDIA_DESCRIPTION:    'Bad Media Description',
    IN_DIALOG_408_OR_481:     'In-dialog 408 or 481',
    SIP_FAILURE_CODE:         'SIP Failure Code',

    // SIP error causes
    BUSY:                     'Busy',
    REJECTED:                 'Rejected',
    REDIRECTED:               'Redirected',
    UNAVAILABLE:              'Unavailable',
    NOT_FOUND:                'Not Found',
    ADDRESS_INCOMPLETE:       'Address Incomplete',
    INCOMPATIBLE_SDP:         'Incompatible SDP',
    AUTHENTICATION_ERROR:     'Authentication Error'
  },

  SIP_ERROR_CAUSES: {
    REDIRECTED: [300,301,302,305,380],
    BUSY: [486,600],
    REJECTED: [403,603],
    NOT_FOUND: [404,604],
    UNAVAILABLE: [480,410,408,430],
    ADDRESS_INCOMPLETE: [484],
    INCOMPATIBLE_SDP: [488,606],
    AUTHENTICATION_ERROR:[401,407]
  },

  // UA status codes
  UA_STATUS_INIT :                0,
  UA_STATUS_READY:                1,
  UA_STATUS_USER_CLOSED:          2,
  UA_STATUS_NOT_READY:            3,

  // UA error codes
  UA_CONFIGURATION_ERROR:  1,
  UA_NETWORK_ERROR:        2,

  // WS server status codes
  WS_SERVER_READY:        0,
  WS_SERVER_DISCONNECTED: 1,
  WS_SERVER_ERROR:        2,

  // SIP Methods
  ACK:        'ACK',
  BYE:        'BYE',
  CANCEL:     'CANCEL',
  INFO:       'INFO',
  INVITE:     'INVITE',
  MESSAGE:    'MESSAGE',
  NOTIFY:     'NOTIFY',
  OPTIONS:    'OPTIONS',
  REGISTER:   'REGISTER',
  UPDATE:     'UPDATE',
  SUBSCRIBE:  'SUBSCRIBE',

  /* SIP Response Reasons
   * DOC: http://www.iana.org/assignments/sip-parameters
   * Copied from https://github.com/versatica/OverSIP/blob/master/lib/oversip/sip/constants.rb#L7
   */
  REASON_PHRASE: {
    100: 'Trying',
    180: 'Ringing',
    181: 'Call Is Being Forwarded',
    182: 'Queued',
    183: 'Session Progress',
    199: 'Early Dialog Terminated',  // draft-ietf-sipcore-199
    200: 'OK',
    202: 'Accepted',  // RFC 3265
    204: 'No Notification',  //RFC 5839
    300: 'Multiple Choices',
    301: 'Moved Permanently',
    302: 'Moved Temporarily',
    305: 'Use Proxy',
    380: 'Alternative Service',
    400: 'Bad Request',
    401: 'Unauthorized',
    402: 'Payment Required',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    406: 'Not Acceptable',
    407: 'Proxy Authentication Required',
    408: 'Request Timeout',
    410: 'Gone',
    412: 'Conditional Request Failed',  // RFC 3903
    413: 'Request Entity Too Large',
    414: 'Request-URI Too Long',
    415: 'Unsupported Media Type',
    416: 'Unsupported URI Scheme',
    417: 'Unknown Resource-Priority',  // RFC 4412
    420: 'Bad Extension',
    421: 'Extension Required',
    422: 'Session Interval Too Small',  // RFC 4028
    423: 'Interval Too Brief',
    428: 'Use Identity Header',  // RFC 4474
    429: 'Provide Referrer Identity',  // RFC 3892
    430: 'Flow Failed',  // RFC 5626
    433: 'Anonymity Disallowed',  // RFC 5079
    436: 'Bad Identity-Info',  // RFC 4474
    437: 'Unsupported Certificate',  // RFC 4744
    438: 'Invalid Identity Header',  // RFC 4744
    439: 'First Hop Lacks Outbound Support',  // RFC 5626
    440: 'Max-Breadth Exceeded',  // RFC 5393
    469: 'Bad Info Package',  // draft-ietf-sipcore-info-events
    470: 'Consent Needed',  // RF C5360
    478: 'Unresolvable Destination',  // Custom code copied from Kamailio.
    480: 'Temporarily Unavailable',
    481: 'Call/Transaction Does Not Exist',
    482: 'Loop Detected',
    483: 'Too Many Hops',
    484: 'Address Incomplete',
    485: 'Ambiguous',
    486: 'Busy Here',
    487: 'Request Terminated',
    488: 'Not Acceptable Here',
    489: 'Bad Event',  // RFC 3265
    491: 'Request Pending',
    493: 'Undecipherable',
    494: 'Security Agreement Required',  // RFC 3329
    500: 'Server Internal Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Server Time-out',
    505: 'Version Not Supported',
    513: 'Message Too Large',
    580: 'Precondition Failure',  // RFC 3312
    600: 'Busy Everywhere',
    603: 'Decline',
    604: 'Does Not Exist Anywhere',
    606: 'Not Acceptable'
  },

  // DTMF
  DTMF_DEFAULT_DURATION:        100,
  DTMF_MIN_DURATION:            70,
  DTMF_MAX_DURATION:            6000,
  DTMF_DEFAULT_INTER_TONE_GAP:  500,
  DTMF_MIN_INTER_TONE_GAP:      50,

  // SIP Attributes
  MAX_FORWARDS: 69,
  ALLOWED_METHODS: 'INVITE, ACK, CANCEL, BYE, OPTIONS, MESSAGE, SUBSCRIBE',
  SUPPORTED: 'path, outbound, gruu',
  ACCEPTED_BODY_TYPES: 'application/sdp, application/dtmf-relay',
  TAG_LENGTH: 10,

  // User Agent EVENT METHODS
  UA_EVENT_METHODS: {
    'newSession': 'INVITE',
    'newMessage': 'MESSAGE'
  }
};

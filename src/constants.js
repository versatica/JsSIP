
/**
 * @fileoverview JsSIP Constants
 */

/**
 * JsSIP Constants.
 * @augments JsSIP
 */

JsSIP.c = {
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

  // Invite session end causes
  causes: {
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

    // SIP ERROR CAUSES
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

  // SIP Response Reasons

  // Provisional
  REASON_100: 'Trying',
  REASON_180: 'Ringing',
  REASON_181: 'Call Is Being Forwarded',
  REASON_182: 'Queued',
  REASON_183: 'Session Progress',

  // Successful
  REASON_200: 'OK',

  // Redirection
  REASON_300: 'Multiple Choices',
  REASON_301: 'Moved Permanently',
  REASON_302: 'Moved Temporarily',
  REASON_305: 'Use Proxy',
  REASON_380: 'Alternative Service',

  // Request Failure
  REASON_400: 'Bad Request',
  REASON_401: 'Unauthorized',
  REASON_402: 'Payment Required',
  REASON_403: 'Forbidden',
  REASON_404: 'Not Found',
  REASON_405: 'Method Not Allowed',
  REASON_406: 'Not Acceptable',
  REASON_407: 'Proxy Authentication Required ',
  REASON_408: 'Request Timeout',
  REASON_410: 'Gone',
  REASON_413: 'Request Entity Too Large',
  REASON_414: 'Request-URI Too Long',
  REASON_415: 'Unsupported Media Type',
  REASON_416: 'Unsupported URI Scheme',
  REASON_420: 'Bad Extension',
  REASON_421: 'Extension Required',
  REASON_423: 'Interval Too Brief',
  REASON_480: 'Temporarily Unavailable',
  REASON_481: 'Call/Transaction Does Not Exist',
  REASON_482: 'Loop Detected',
  REASON_483: 'Too Many Hops',
  REASON_484: 'Address Incomplete',
  REASON_485: 'Ambiguous',
  REASON_486: 'Busy Here',
  REASON_487: 'Request Terminated',
  REASON_488: 'Not Acceptable Here',
  REASON_491: 'Request Pending ',
  REASON_493: 'Undecipherable',

  // Server Failure
  REASON_500: 'Server Internal Error',
  REASON_501: 'Not Implemented',
  REASON_502: 'Bad Gateway',
  REASON_503: 'Service Unavailable',
  REASON_504: 'Server Time-out',
  REASON_505: 'Version Not Supported',
  REASON_513: 'Message Too Large',

  // Global Failure
  REASON_600: 'Busy Everywhere',
  REASON_603: 'Decline',
  REASON_604: 'Does Not Exist Anywhere',

  // SIP Attributes
  MAX_FORWARDS: 69,
  ALLOWED_METHODS: 'INVITE, ACK, CANCEL, BYE, OPTIONS, MESSAGE, SUBSCRIBE',
  SUPPORTED: 'path, outbound, gruu',
  ACCEPTED_BODY_TYPES: 'application/sdp',
  TAG_LENGTH: 10
};

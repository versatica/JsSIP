// `package.json` lives outside `rootDir` so it cannot be `import`ed. A plain
// `require()` is not resolved by TypeScript against `rootDir`, so it is used
// here instead.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require('../package.json') as { title: string; version: string };

export const USER_AGENT = `${pkg.title} ${pkg.version}`;

// SIP scheme.
export const SIP = 'sip';
export const SIPS = 'sips';

// End and Failure causes.
export enum causes {
	// Generic error causes.
	CONNECTION_ERROR = 'Connection Error',
	REQUEST_TIMEOUT = 'Request Timeout',
	SIP_FAILURE_CODE = 'SIP Failure Code',
	INTERNAL_ERROR = 'Internal Error',

	// SIP error causes.
	BUSY = 'Busy',
	REJECTED = 'Rejected',
	REDIRECTED = 'Redirected',
	UNAVAILABLE = 'Unavailable',
	NOT_FOUND = 'Not Found',
	ADDRESS_INCOMPLETE = 'Address Incomplete',
	INCOMPATIBLE_SDP = 'Incompatible SDP',
	MISSING_SDP = 'Missing SDP',
	AUTHENTICATION_ERROR = 'Authentication Error',

	// Session error causes.
	BYE = 'Terminated',
	WEBRTC_ERROR = 'WebRTC Error',
	CANCELED = 'Canceled',
	NO_ANSWER = 'No Answer',
	EXPIRES = 'Expires',
	NO_ACK = 'No ACK',
	DIALOG_ERROR = 'Dialog Error',
	USER_DENIED_MEDIA_ACCESS = 'User Denied Media Access',
	BAD_MEDIA_DESCRIPTION = 'Bad Media Description',
	RTP_TIMEOUT = 'RTP Timeout',
}

export const SIP_ERROR_CAUSES: Record<string, number[]> = {
	REDIRECTED: [300, 301, 302, 305, 380],
	BUSY: [486, 600],
	REJECTED: [403, 603],
	NOT_FOUND: [404, 604],
	UNAVAILABLE: [480, 410, 408, 430],
	ADDRESS_INCOMPLETE: [484, 424],
	INCOMPATIBLE_SDP: [488, 606],
	AUTHENTICATION_ERROR: [401, 407],
};

// SIP Methods.
export const ACK = 'ACK';
export const BYE = 'BYE';
export const CANCEL = 'CANCEL';
export const INFO = 'INFO';
export const INVITE = 'INVITE';
export const MESSAGE = 'MESSAGE';
export const NOTIFY = 'NOTIFY';
export const OPTIONS = 'OPTIONS';
export const REGISTER = 'REGISTER';
export const REFER = 'REFER';
export const UPDATE = 'UPDATE';
export const SUBSCRIBE = 'SUBSCRIBE';

// DTMF transport methods.
export enum DTMF_TRANSPORT {
	// eslint-disable-next-line no-shadow
	INFO = 'INFO',
	RFC2833 = 'RFC2833',
}

/* SIP Response Reasons
 * DOC: https://www.iana.org/assignments/sip-parameters
 * Copied from https://github.com/versatica/OverSIP/blob/master/lib/oversip/sip/constants.rb#L7
 */
export const REASON_PHRASE: Record<number, string> = {
	100: 'Trying',
	180: 'Ringing',
	181: 'Call Is Being Forwarded',
	182: 'Queued',
	183: 'Session Progress',
	199: 'Early Dialog Terminated', // draft-ietf-sipcore-199
	200: 'OK',
	202: 'Accepted', // RFC 3265
	204: 'No Notification', // RFC 5839
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
	412: 'Conditional Request Failed', // RFC 3903
	413: 'Request Entity Too Large',
	414: 'Request-URI Too Long',
	415: 'Unsupported Media Type',
	416: 'Unsupported URI Scheme',
	417: 'Unknown Resource-Priority', // RFC 4412
	420: 'Bad Extension',
	421: 'Extension Required',
	422: 'Session Interval Too Small', // RFC 4028
	423: 'Interval Too Brief',
	424: 'Bad Location Information', // RFC 6442
	428: 'Use Identity Header', // RFC 4474
	429: 'Provide Referrer Identity', // RFC 3892
	430: 'Flow Failed', // RFC 5626
	433: 'Anonymity Disallowed', // RFC 5079
	436: 'Bad Identity-Info', // RFC 4474
	437: 'Unsupported Certificate', // RFC 4744
	438: 'Invalid Identity Header', // RFC 4744
	439: 'First Hop Lacks Outbound Support', // RFC 5626
	440: 'Max-Breadth Exceeded', // RFC 5393
	469: 'Bad Info Package', // draft-ietf-sipcore-info-events
	470: 'Consent Needed', // RFC 5360
	478: 'Unresolvable Destination', // Custom code copied from Kamailio.
	480: 'Temporarily Unavailable',
	481: 'Call/Transaction Does Not Exist',
	482: 'Loop Detected',
	483: 'Too Many Hops',
	484: 'Address Incomplete',
	485: 'Ambiguous',
	486: 'Busy Here',
	487: 'Request Terminated',
	488: 'Not Acceptable Here',
	489: 'Bad Event', // RFC 3265
	491: 'Request Pending',
	493: 'Undecipherable',
	494: 'Security Agreement Required', // RFC 3329
	500: 'JsSIP Internal Error',
	501: 'Not Implemented',
	502: 'Bad Gateway',
	503: 'Service Unavailable',
	504: 'Server Time-out',
	505: 'Version Not Supported',
	513: 'Message Too Large',
	580: 'Precondition Failure', // RFC 3312
	600: 'Busy Everywhere',
	603: 'Decline',
	604: 'Does Not Exist Anywhere',
	606: 'Not Acceptable',
};

export const ALLOWED_METHODS =
	'INVITE,ACK,CANCEL,BYE,UPDATE,MESSAGE,OPTIONS,REFER,INFO,NOTIFY,SUBSCRIBE';
export const ACCEPTED_BODY_TYPES = 'application/sdp, application/dtmf-relay';
export const MAX_FORWARDS = 69;
export const SESSION_EXPIRES = 90;
export const MIN_SESSION_EXPIRES = 60;
export const CONNECTION_RECOVERY_MAX_INTERVAL = 30;
export const CONNECTION_RECOVERY_MIN_INTERVAL = 2;

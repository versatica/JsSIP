export const USER_AGENT: string;
export const SIP = 'sip';
export const SIPS = 'sips';

export declare enum causes {
	CONNECTION_ERROR = 'Connection Error',
	REQUEST_TIMEOUT = 'Request Timeout',
	SIP_FAILURE_CODE = 'SIP Failure Code',
	INTERNAL_ERROR = 'Internal Error',
	BUSY = 'Busy',
	REJECTED = 'Rejected',
	REDIRECTED = 'Redirected',
	UNAVAILABLE = 'Unavailable',
	NOT_FOUND = 'Not Found',
	ADDRESS_INCOMPLETE = 'Address Incomplete',
	INCOMPATIBLE_SDP = 'Incompatible SDP',
	MISSING_SDP = 'Missing SDP',
	AUTHENTICATION_ERROR = 'Authentication Error',
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

export const SIP_ERROR_CAUSES: {
	REDIRECTED: [300, 301, 302, 305, 380];
	BUSY: [486, 600];
	REJECTED: [403, 603];
	NOT_FOUND: [404, 604];
	UNAVAILABLE: [480, 410, 408, 430];
	ADDRESS_INCOMPLETE: [484, 424];
	INCOMPATIBLE_SDP: [488, 606];
	AUTHENTICATION_ERROR: [401, 407];
};
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

export declare enum DTMF_TRANSPORT {
	// eslint-disable-next-line no-shadow
	INFO = 'INFO',
	RFC2833 = 'RFC2833',
}

export const REASON_PHRASE: Record<number, string>;
export const ALLOWED_METHODS =
	'INVITE,ACK,CANCEL,BYE,UPDATE,MESSAGE,OPTIONS,REFER,INFO,NOTIFY,SUBSCRIBE';
export const ACCEPTED_BODY_TYPES = 'application/sdp, application/dtmf-relay';
export const MAX_FORWARDS = 69;
export const SESSION_EXPIRES = 90;
export const MIN_SESSION_EXPIRES = 60;
export const CONNECTION_RECOVERY_MAX_INTERVAL = 30;
export const CONNECTION_RECOVERY_MIN_INTERVAL = 2;

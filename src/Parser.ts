import { Logger } from './Logger';
import * as Grammar from './Grammar';
import { IncomingMessageBuilder } from './IncomingMessageBuilder';
import type { IncomingRequest, IncomingResponse, UALike } from './SIPMessage';

const logger = new Logger('Parser');

/**
 * Parse SIP Message
 */
export const parseMessage = (
	data: string,
	ua: UALike
): IncomingRequest | IncomingResponse | undefined => {
	let bodyStart: number;
	let headerEnd = data.indexOf('\r\n');

	if (headerEnd === -1) {
		logger.warn('parseMessage() | no CRLF found, not a SIP message');

		return undefined;
	}

	// Parse first line. Check if it is a Request or a Reply.
	const firstLine = data.substring(0, headerEnd);
	const parsed: Grammar.RequestResponse | -1 = Grammar.parse(
		firstLine,
		'Request_Response'
	);

	if (parsed === -1) {
		logger.warn(
			`parseMessage() | error parsing first line of SIP message: "${firstLine}"`
		);

		return undefined;
	}

	const builder = new IncomingMessageBuilder();

	let headerStart = headerEnd + 2;

	/* Loop over every line in data. Detect the end of each header and parse
	 * it or simply add to the headers collection.
	 */

	while (true) {
		headerEnd = getHeader(data, headerStart);

		// The SIP message has normally finished.
		if (headerEnd === -2) {
			bodyStart = headerStart + 2;
			break;
		}
		// Data.indexOf returned -1 due to a malformed message.
		else if (headerEnd === -1) {
			logger.warn('parseMessage() | malformed message');

			return undefined;
		}

		const result = parseHeader(builder, data, headerStart, headerEnd);

		if (result !== true) {
			logger.warn('parseMessage() |', result.error);

			return undefined;
		}

		headerStart = headerEnd + 2;
	}

	/* RFC3261 18.3.
	 * If there are additional bytes in the transport packet
	 * beyond the end of the body, they MUST be discarded.
	 */
	let body;

	if (builder.hasHeader('content-length')) {
		const contentLength = builder.getHeader('content-length');

		body = data.substr(bodyStart, Number(contentLength));
	} else {
		body = data.substring(bodyStart);
	}

	if ('status_code' in parsed) {
		return builder.buildResponse(
			data,
			parsed.status_code,
			parsed.reason_phrase,
			body
		);
	}

	/* RFC 3261 8.2.2.1. The grammar accepts any absoluteURI as Request-URI but
	 * only turns a SIP one into a `URI`, so anything else cannot be handled.
	 */
	if (!parsed.uri) {
		logger.warn(
			`parseMessage() | unsupported Request-URI scheme in "${firstLine}"`
		);

		return undefined;
	}

	return builder.buildRequest(ua, data, parsed.method, parsed.uri, body);
};

/**
 * Extract and parse every header of a SIP message.
 */
function getHeader(data: string, headerStart: number): number {
	// 'start' position of the header.
	let start = headerStart;
	// 'end' position of the header.
	let end = 0;
	// 'partial end' position of the header.
	let partialEnd = 0;

	// End of message.
	if (data.substring(start, start + 2).match(/(^\r\n)/)) {
		return -2;
	}

	while (end === 0) {
		// Partial End of Header.
		partialEnd = data.indexOf('\r\n', start);

		// 'indexOf' returns -1 if the value to be found never occurs.
		if (partialEnd === -1) {
			return partialEnd;
		}

		if (
			!data.substring(partialEnd + 2, partialEnd + 4).match(/(^\r\n)/) &&
			data.charAt(partialEnd + 2).match(/(^\s+)/)
		) {
			// Not the end of the message. Continue from the next position.
			start = partialEnd + 2;
		} else {
			end = partialEnd;
		}
	}

	return end;
}

function parseHeader(
	builder: IncomingMessageBuilder,
	data: string,
	headerStart: number,
	headerEnd: number
): true | { error: string } {
	const hcolonIndex = data.indexOf(':', headerStart);
	const headerName = data.substring(headerStart, hcolonIndex).trim();
	const headerValue = data.substring(hcolonIndex + 1, headerEnd).trim();

	if (!builder.addRawHeader(headerName, headerValue)) {
		return {
			error: `error parsing header "${headerName}"`,
		};
	}

	return true;
}

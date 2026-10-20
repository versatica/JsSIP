const { Logger } = require('./Logger');
const Grammar = require('./Grammar');
const { IncomingMessageBuilder } = require('./IncomingMessageBuilder');

const logger = new Logger('Parser');

/**
 * Parse SIP Message
 */
exports.parseMessage = (data, ua) => {
	let bodyStart;
	let headerEnd = data.indexOf('\r\n');

	if (headerEnd === -1) {
		logger.warn('parseMessage() | no CRLF found, not a SIP message');

		return;
	}

	// Parse first line. Check if it is a Request or a Reply.
	const firstLine = data.substring(0, headerEnd);
	const parsed = Grammar.parse(firstLine, 'Request_Response');

	if (parsed === -1) {
		logger.warn(
			`parseMessage() | error parsing first line of SIP message: "${firstLine}"`
		);

		return;
	}

	const isResponse = Boolean(parsed.status_code);
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

			return;
		}

		const result = parseHeader(builder, data, headerStart, headerEnd);

		if (result !== true) {
			logger.warn('parseMessage() |', result.error);

			return;
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

		body = data.substr(bodyStart, contentLength);
	} else {
		body = data.substring(bodyStart);
	}

	if (isResponse) {
		return builder.buildResponse(
			data,
			parsed.status_code,
			parsed.reason_phrase,
			body
		);
	} else {
		return builder.buildRequest(ua, data, parsed.method, parsed.uri, body);
	}
};

/**
 * Extract and parse every header of a SIP message.
 */
function getHeader(data, headerStart) {
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

function parseHeader(builder, data, headerStart, headerEnd) {
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

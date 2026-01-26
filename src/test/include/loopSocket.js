// LoopSocket send message itself.
// Used P2P logic: message call-id is modified in each leg.
module.exports = class LoopSocket {
	constructor() {
		this.url = 'ws://localhost:12345';
		this.via_transport = 'WS';
		this.sip_uri = 'sip:localhost:12345;transport=ws';
	}

	connect() {
		setTimeout(() => {
			this.onconnect();
		}, 0);
	}

	disconnect() {}

	send(message) {
		const message2 = this._modifyCallId(message);

		setTimeout(() => {
			this.ondata(message2);
		}, 0);

		return true;
	}

	// Call-ID: add or drop word '_second'.
	_modifyCallId(message) {
		const ixBegin = message.indexOf('Call-ID');
		const ixEnd = message.indexOf('\r', ixBegin);
		let callId = message.substring(ixBegin + 9, ixEnd);

		if (callId.endsWith('_second')) {
			callId = callId.substring(0, callId.length - 7);
		} else {
			callId += '_second';
		}

		return `${message.substring(0, ixBegin)}Call-ID: ${callId}${message.substring(ixEnd)}`;
	}
};

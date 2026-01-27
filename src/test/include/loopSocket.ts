// LoopSocket send message itself.
// Used P2P logic: message call-id is modified in each leg.

import type { Socket } from '../../Socket';

export default class LoopSocket implements Socket {
	url = 'ws://localhost:12345';
	via_transport = 'WS';
	sip_uri = 'sip:localhost:12345;transport=ws';

	connect(): void {
		setTimeout(() => {
			this.onconnect();
		}, 0);
	}

	disconnect(): void {}

	send(message: string): boolean {
		const message2 = this._modifyCallId(message);

		setTimeout(() => {
			this.ondata(message2);
		}, 0);

		return true;
	}

	isConnected(): boolean {
		return true;
	}

	isConnecting(): boolean {
		return false;
	}

	onconnect(): void {}

	ondisconnect(): void {}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	ondata<T>(_event: T): void {}

	// Call-ID: add or drop word '_second'.
	private _modifyCallId(message: string): string {
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
}

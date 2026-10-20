import { Socket } from './Socket';

export interface RecoveryOptions {
	min_interval: number;
	max_interval: number;
}

export class Transport {
	constructor(sockets: Socket | Socket[], recovery_options?: RecoveryOptions);

	get via_transport(): string;

	get url(): string;

	get sip_uri(): string;

	connect(): void;

	disconnect(): void;

	send(data: string | ArrayBufferLike | Blob | ArrayBufferView): boolean;

	isConnected(): boolean;

	isConnecting(): boolean;

	onconnecting(attempts: number): void;

	onconnect(): void;

	ondisconnect(error: boolean, code?: number, reason?: string): void;

	ondata<T>(event: T): void;
}

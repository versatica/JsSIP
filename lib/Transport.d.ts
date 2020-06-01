import {Socket} from './WebSocketInterface'

export interface RecoveryOptions {
  min_interval: number;
  max_interval: number;
}

export class Transport extends Socket {
  constructor(sockets: Socket | Socket[], recovery_options?: RecoveryOptions)
}

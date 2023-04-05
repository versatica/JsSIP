import {Socket} from './Socket'

export interface RecoveryOptions {
  min_interval: number;
  max_interval: number;
}

export default class Transport extends Socket {
  constructor(sockets: Socket | Socket[], recovery_options?: RecoveryOptions)
}

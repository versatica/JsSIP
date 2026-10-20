import { Debug } from 'debug';

import * as C from './Constants';
import * as Exceptions from './Exceptions';
import * as Grammar from './Grammar';
import * as Utils from './Utils';

export { C, Exceptions, Grammar, Utils };

import URI = require('./URI');
import NameAddrHeader = require('./NameAddrHeader');

export { UA } from './UA';
export { URI, NameAddrHeader };
export { WebSocketInterface } from './WebSocketInterface';
export type { Socket, WeightedSocket } from './Socket';

export const debug: Debug;
export const name: string;
export const version: string;

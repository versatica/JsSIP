import * as debug from 'debug';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require('../package.json');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const C = require('./Constants');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Exceptions = require('./Exceptions');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Utils = require('./Utils');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const UA = require('./UA');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const URI = require('./URI');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const NameAddrHeader = require('./NameAddrHeader');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Grammar = require('./Grammar');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const WebSocketInterface = require('./WebSocketInterface');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RTCSession = require('./RTCSession');

const logger = debug('JsSIP');

logger('version %s', pkg.version);

/**
 * JsSIP main module.
 *
 * @category JsSIP
 */
export {
	C,
	Exceptions,
	Utils,
	UA,
	URI,
	NameAddrHeader,
	WebSocketInterface,
	Grammar,
	RTCSession,
};

/**
 * Expose the debug module.
 */
export { debug };

/**
 * Library name.
 */
export const name: string = pkg.title;

/**
 * Library version.
 */
export const version: string = pkg.version;

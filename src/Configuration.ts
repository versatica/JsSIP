import {
	CONNECTION_RECOVERY_MAX_INTERVAL,
	CONNECTION_RECOVERY_MIN_INTERVAL,
	INVITE,
	SIP,
	UPDATE,
} from './Constants';
import { ConfigurationError } from './Exceptions';
import * as Grammar from './Grammar';
import { isSocket } from './Socket';
import type { WeightedSocket } from './Socket';
import { createRandomToken, isDecimal, isEmpty } from './Utils';
import URI = require('./URI');

/**
 * The working configuration of a `UA`, as built from the defaults below and
 * the values given by the application.
 *
 * TODO: `UA` then mutates this object in ways this type cannot express: it
 * deletes `sockets`, adds `jssip_id` and `hostport_params`, and rewrites
 * `no_answer_timeout` from seconds into milliseconds. It should derive its own
 * value from this one instead of mutating it.
 */
export type Configuration = {
	// SIP authentication.
	authorization_user: string | null;
	password: string | null;
	realm: string | null;
	ha1: string | null;
	authorization_jwt: string | null;

	// SIP account.
	/* NOTE: A number because `UA` allows a `0` to be given, which it then turns
	 * into '0'.
	 */
	display_name: string | number | null;
	uri: URI | null;
	contact_uri: URI | null;

	// SIP instance id (GRUU).
	instance_id: string | null;

	// Preloaded SIP Route header field.
	use_preloaded_route: boolean;

	// Session parameters.
	session_timers: boolean;
	session_timers_refresh_method: string;
	session_timers_force_refresher: boolean;
	no_answer_timeout: number;

	// Registration parameters.
	register: boolean;
	register_expires: number;
	register_from_tag_trail: string | (() => string);
	registrar_server: URI | null;

	// Connection options.
	sockets: WeightedSocket[] | null;
	connection_recovery_max_interval: number;
	connection_recovery_min_interval: number;

	// Global extra headers, to be added to every request and response
	extra_headers: string[] | null;

	/*
	 * Host address.
	 * Value to be set in Via sent_by and host part of Contact FQDN.
	 */
	via_host: string;

	/* NOTE: Optional because, unlike every other parameter, it has no default
	 * below. It only exists once the application configures it.
	 */
	user_agent?: string;
};

// Default values.
export const DEFAULT_CONFIGURATION: Configuration = {
	// SIP authentication.
	authorization_user: null,
	password: null,
	realm: null,
	ha1: null,
	authorization_jwt: null,

	// SIP account.
	display_name: null,
	uri: null,
	contact_uri: null,

	// SIP instance id (GRUU).
	instance_id: null,

	// Preloaded SIP Route header field.
	use_preloaded_route: false,

	// Session parameters.
	session_timers: true,
	session_timers_refresh_method: UPDATE,
	session_timers_force_refresher: false,
	no_answer_timeout: 60,

	// Registration parameters.
	register: true,
	register_expires: 600,
	register_from_tag_trail: '',
	registrar_server: null,

	// Connection options.
	sockets: null,
	connection_recovery_max_interval: CONNECTION_RECOVERY_MAX_INTERVAL,
	connection_recovery_min_interval: CONNECTION_RECOVERY_MIN_INTERVAL,

	// Global extra headers, to be added to every request and response
	extra_headers: null,

	/*
	 * Host address.
	 * Value to be set in Via sent_by and host part of Contact FQDN.
	 */
	via_host: `${createRandomToken(12)}.invalid`,
};

/**
 * Parameters the application must provide.
 */
type MandatoryParam = 'uri' | 'sockets';

/**
 * Parameters the application may provide. Every configuration parameter that
 * is neither mandatory nor computed by `UA` has a check, which the mapped type
 * below enforces in both directions.
 */
type OptionalParam = Exclude<keyof Configuration, MandatoryParam | 'via_host'>;

/* NOTE: A check receives whatever the application passed, hence `unknown`.
 * Its return type is tied to the configuration parameter it populates, so a
 * check can neither skip validating its input nor produce a value that
 * parameter would not accept.
 */
type ConfigCheck<K extends keyof Configuration> = (
	value: unknown
) => Configuration[K] | undefined;

// Configuration checks.
const checks: {
	mandatory: { [K in MandatoryParam]: ConfigCheck<K> };
	optional: { [K in OptionalParam]: ConfigCheck<K> };
} = {
	mandatory: {
		sockets(sockets) {
			/* Allow defining sockets parameter as:
			 *  Socket: socket
			 *  Array of Socket: [socket1, socket2]
			 *  Array of Objects: [{socket: socket1, weight:1}, {socket: Socket2, weight:0}]
			 *  Array of Objects and Socket: [{socket: socket1}, socket2]
			 */
			const _sockets: WeightedSocket[] = [];

			if (isSocket(sockets)) {
				_sockets.push({ socket: sockets });
			} else if (Array.isArray(sockets) && sockets.length) {
				for (const socket of sockets) {
					if (
						Object.prototype.hasOwnProperty.call(socket, 'socket') &&
						isSocket(socket.socket)
					) {
						_sockets.push(socket);
					} else if (isSocket(socket)) {
						_sockets.push({ socket: socket });
					}
				}
			} else {
				return;
			}

			return _sockets;
		},

		uri(value) {
			/* NOTE: Coerced rather than rejected, since the regular expression and
			 * the template below used to coerce it anyway.
			 */
			let uri = String(value);

			if (!/^sip:/i.test(uri)) {
				uri = `${SIP}:${uri}`;
			}
			const parsed = URI.parse(uri);

			if (!parsed) {
				return;
			} else if (!parsed.user) {
				return;
			} else {
				return parsed;
			}
		},
	},

	optional: {
		authorization_user(value) {
			const authorization_user = String(value);

			if (Grammar.parse(`"${authorization_user}"`, 'quoted_string') === -1) {
				return;
			} else {
				return authorization_user;
			}
		},
		authorization_jwt(authorization_jwt) {
			if (typeof authorization_jwt === 'string') {
				return authorization_jwt;
			}

			return undefined;
		},
		user_agent(user_agent) {
			if (typeof user_agent === 'string') {
				return user_agent;
			}

			return undefined;
		},

		connection_recovery_max_interval(connection_recovery_max_interval) {
			if (isDecimal(connection_recovery_max_interval)) {
				const value = Number(connection_recovery_max_interval);

				if (value > 0) {
					return value;
				}
			}

			return undefined;
		},

		connection_recovery_min_interval(connection_recovery_min_interval) {
			if (isDecimal(connection_recovery_min_interval)) {
				const value = Number(connection_recovery_min_interval);

				if (value > 0) {
					return value;
				}
			}

			return undefined;
		},

		contact_uri(contact_uri) {
			if (typeof contact_uri === 'string') {
				const uri = Grammar.parse(contact_uri, 'SIP_URI');

				if (uri !== -1) {
					return uri;
				}
			}

			return undefined;
		},

		/* NOTE: A number is accepted because `UA` turns a `0` into '0'. Anything
		 * else used to be accepted too, only to fail later on when building a
		 * `NameAddrHeader`.
		 */
		display_name(value) {
			if (typeof value === 'string' || typeof value === 'number') {
				return value;
			}

			return undefined;
		},

		instance_id(value) {
			let instance_id = String(value);

			if (/^uuid:/i.test(instance_id)) {
				instance_id = instance_id.substr(5);
			}

			if (Grammar.parse(instance_id, 'uuid') === -1) {
				return;
			} else {
				return instance_id;
			}
		},

		no_answer_timeout(no_answer_timeout) {
			if (isDecimal(no_answer_timeout)) {
				const value = Number(no_answer_timeout);

				if (value > 0) {
					return value;
				}
			}

			return undefined;
		},

		session_timers(session_timers) {
			if (typeof session_timers === 'boolean') {
				return session_timers;
			}

			return undefined;
		},

		session_timers_refresh_method(method) {
			if (typeof method === 'string') {
				method = method.toUpperCase();

				if (method === INVITE || method === UPDATE) {
					return method;
				}
			}

			return undefined;
		},

		session_timers_force_refresher(session_timers_force_refresher) {
			if (typeof session_timers_force_refresher === 'boolean') {
				return session_timers_force_refresher;
			}

			return undefined;
		},

		password(password) {
			return String(password);
		},

		realm(realm) {
			return String(realm);
		},

		ha1(ha1) {
			return String(ha1);
		},

		register(register) {
			if (typeof register === 'boolean') {
				return register;
			}

			return undefined;
		},

		register_expires(register_expires) {
			if (isDecimal(register_expires)) {
				const value = Number(register_expires);

				if (value >= 0) {
					return value;
				}
			}

			return undefined;
		},

		register_from_tag_trail(value) {
			if (typeof value === 'function') {
				/* NOTE: Whether it really takes no argument and returns a string
				 * cannot be verified at runtime.
				 */
				return value as () => string;
			}

			return String(value);
		},

		registrar_server(value) {
			let registrar_server = String(value);

			if (!/^sip:/i.test(registrar_server)) {
				registrar_server = `${SIP}:${registrar_server}`;
			}

			const parsed = URI.parse(registrar_server);

			if (!parsed) {
				return;
			} else if (parsed.user) {
				return;
			} else {
				return parsed;
			}
		},

		use_preloaded_route(use_preloaded_route) {
			if (typeof use_preloaded_route === 'boolean') {
				return use_preloaded_route;
			}

			return undefined;
		},

		extra_headers(extra_headers) {
			const _extraHeaders: string[] = [];

			if (Array.isArray(extra_headers) && extra_headers.length) {
				for (const header of extra_headers) {
					if (typeof header === 'string') {
						_extraHeaders.push(header);
					}
				}
			} else {
				return;
			}

			return _extraHeaders;
		},
	},
};

/* NOTE: `dst[key] = value` cannot be expressed when `key` is a union, as
 * TypeScript then requires the value to satisfy every member at once. The
 * check that matters, that a check returns what its setting accepts, is
 * already enforced by `ConfigCheck`.
 */
function assign<K extends keyof Configuration>(
	dst: Configuration,
	key: K,
	value: Configuration[K]
): void {
	(dst as Record<K, Configuration[K]>)[key] = value;
}

export const load = (
	dst: Configuration,
	src: Record<string, unknown>
): void => {
	// Check Mandatory parameters.
	for (const parameter of Object.keys(checks.mandatory) as MandatoryParam[]) {
		if (!Object.prototype.hasOwnProperty.call(src, parameter)) {
			throw new ConfigurationError(parameter);
		} else {
			const value = src[parameter];
			const checked_value = checks.mandatory[parameter](value);

			if (checked_value !== undefined) {
				assign(dst, parameter, checked_value);
			} else {
				throw new ConfigurationError(parameter, value);
			}
		}
	}

	// Check Optional parameters.
	for (const parameter of Object.keys(checks.optional) as OptionalParam[]) {
		if (Object.prototype.hasOwnProperty.call(src, parameter)) {
			const value = src[parameter];

			/* If the parameter value is null, empty string, undefined, empty array
			 * or it's a number with NaN value, then apply its default value.
			 */
			if (isEmpty(value)) {
				continue;
			}

			const checked_value = checks.optional[parameter](value);

			if (checked_value !== undefined) {
				assign(dst, parameter, checked_value);
			} else {
				throw new ConfigurationError(parameter, value);
			}
		}
	}
};

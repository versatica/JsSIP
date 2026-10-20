import { SIP, SIP_ERROR_CAUSES, causes } from './Constants';
import * as Grammar from './Grammar';
// `URI` is exported with `export =` (CommonJS style) because the pegjs generated
// `Grammar.js` does `var URI = require('./URI'); new URI(...)`.

import URI = require('./URI');

export const str_utf8_length = (string: string): number =>
	unescape(encodeURIComponent(string)).length;

// Used by 'hasMethods'.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isFunction = (fn: unknown): fn is (...args: any[]) => any => {
	if (fn !== undefined) {
		return Object.prototype.toString.call(fn) === '[object Function]'
			? true
			: false;
	} else {
		return false;
	}
};

export const isString = (str: unknown): str is string => {
	if (str !== undefined) {
		return Object.prototype.toString.call(str) === '[object String]'
			? true
			: false;
	} else {
		return false;
	}
};

export const isDecimal = (num: unknown): boolean =>
	!isNaN(num as number) &&
	parseFloat(num as string) === parseInt(num as string, 10);

export const isEmpty = (value: unknown): boolean => {
	return (
		value === null ||
		value === '' ||
		value === undefined ||
		(Array.isArray(value) && value.length === 0) ||
		(typeof value === 'number' && isNaN(value))
	);
};

export const hasMethods = function (
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	obj: any,
	...methodNames: string[]
): boolean {
	for (const methodName of methodNames) {
		if (isFunction(obj[methodName])) {
			return false;
		}
	}

	return true;
};

// Used by 'newTag'.
export const createRandomToken = (size: number, base = 32): string => {
	let i,
		r,
		token = '';

	for (i = 0; i < size; i++) {
		r = (Math.random() * base) | 0;
		token += r.toString(base);
	}

	return token;
};

export const newTag = (): string => createRandomToken(10);

// https://stackoverflow.com/users/109538/broofa.
export const newUUID = (): string => {
	const UUID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
		const r = (Math.random() * 16) | 0,
			v = c === 'x' ? r : (r & 0x3) | 0x8;

		return v.toString(16);
	});

	return UUID;
};

export const hostType = (host?: string): string | undefined => {
	if (!host) {
		return undefined;
	} else {
		const parsed = Grammar.parse(host, 'host');

		if (parsed !== -1) {
			return parsed.host_type;
		}

		return undefined;
	}
};

/**
 * Hex-escape a SIP URI user.
 * Don't hex-escape ':' (%3A), '+' (%2B), '?' (%3F"), '/' (%2F).
 *
 * Used by 'normalizeTarget'.
 */
export const escapeUser = (user: string): string =>
	encodeURIComponent(decodeURIComponent(user))
		.replace(/%3A/gi, ':')
		.replace(/%2B/gi, '+')
		.replace(/%3F/gi, '?')
		.replace(/%2F/gi, '/');

/**
 * Normalize SIP URI.
 * NOTE: It does not allow a SIP URI without username.
 * Accepts 'sip', 'sips' and 'tel' URIs and convert them into 'sip'.
 * Detects the domain part (if given) and properly hex-escapes the user portion.
 * If the user portion has only 'tel' number symbols the user portion is clean of 'tel' visual separators.
 */
export const normalizeTarget = (
	target?: URI | string,
	domain?: string
): URI | undefined => {
	// If no target is given then raise an error.
	if (!target) {
		return undefined;
		// If a URI instance is given then return it.
	} else if (target instanceof URI) {
		return target;

		// If a string is given split it by '@':
		// - Last fragment is the desired domain.
		// - Otherwise append the given domain argument.
	} else if (typeof target === 'string') {
		const target_array = target.split('@');
		let target_user: string;
		let target_domain: string;

		switch (target_array.length) {
			case 1: {
				if (!domain) {
					return undefined;
				}
				target_user = target;
				target_domain = domain;
				break;
			}
			case 2: {
				target_user = target_array[0]!;
				target_domain = target_array[1]!;
				break;
			}
			default: {
				target_user = target_array.slice(0, target_array.length - 1).join('@');
				target_domain = target_array[target_array.length - 1]!;
			}
		}

		// Remove the URI scheme (if present).
		target_user = target_user.replace(/^(sips?|tel):/i, '');

		// Remove 'tel' visual separators if the user portion just contains 'tel' number symbols.
		if (/^[-.()]*\+?[0-9\-.()]+$/.test(target_user)) {
			target_user = target_user.replace(/[-.()]/g, '');
		}

		// Build the complete SIP URI.
		target = `${SIP}:${escapeUser(target_user)}@${target_domain}`;

		// Finally parse the resulting URI.
		let uri;

		if ((uri = URI.parse(target))) {
			return uri;
		} else {
			return undefined;
		}
	} else {
		return undefined;
	}
};

export const headerize = (string: string): string => {
	const exceptions: Record<string, string> = {
		'Call-Id': 'Call-ID',
		Cseq: 'CSeq',
		'Www-Authenticate': 'WWW-Authenticate',
	};

	const name = string.toLowerCase().replace(/_/g, '-').split('-');
	let hname = '';
	const parts = name.length;
	let part: number;

	for (part = 0; part < parts; part++) {
		if (part !== 0) {
			hname += '-';
		}
		hname += name[part]!.charAt(0).toUpperCase() + name[part]!.substring(1);
	}
	if (exceptions[hname]) {
		hname = exceptions[hname]!;
	}

	return hname;
};

export const sipErrorCause = (status_code: number): causes => {
	for (const cause in SIP_ERROR_CAUSES) {
		if (SIP_ERROR_CAUSES[cause]!.includes(status_code)) {
			return (causes as Record<string, causes>)[cause]!;
		}
	}

	return causes.SIP_FAILURE_CODE;
};

/**
 * Generate a random Test-Net IP (https://tools.ietf.org/html/rfc5735)
 */
export const getRandomTestNetIP = (): string => {
	function getOctet(from: number, to: number): number {
		return Math.floor(Math.random() * (to - from + 1) + from);
	}

	return `192.0.2.${getOctet(1, 254)}`;
};

// MD5 (Message-Digest Algorithm) https://www.webtoolkit.info.
export const calculateMD5 = (string: string): string => {
	function rotateLeft(lValue: number, iShiftBits: number): number {
		return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
	}

	function addUnsigned(lX: number, lY: number): number {
		const lX8 = lX & 0x80000000;
		const lY8 = lY & 0x80000000;
		const lX4 = lX & 0x40000000;
		const lY4 = lY & 0x40000000;
		const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);

		if (lX4 & lY4) {
			return lResult ^ 0x80000000 ^ lX8 ^ lY8;
		}
		if (lX4 | lY4) {
			if (lResult & 0x40000000) {
				return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
			} else {
				return lResult ^ 0x40000000 ^ lX8 ^ lY8;
			}
		} else {
			return lResult ^ lX8 ^ lY8;
		}
	}

	function doF(x: number, y: number, z: number): number {
		return (x & y) | (~x & z);
	}

	function doG(x: number, y: number, z: number): number {
		return (x & z) | (y & ~z);
	}

	function doH(x: number, y: number, z: number): number {
		return x ^ y ^ z;
	}

	function doI(x: number, y: number, z: number): number {
		return y ^ (x | ~z);
	}

	function doFF(
		a: number,
		b: number,
		c: number,
		d: number,
		x: number,
		s: number,
		ac: number
	): number {
		a = addUnsigned(a, addUnsigned(addUnsigned(doF(b, c, d), x), ac));

		return addUnsigned(rotateLeft(a, s), b);
	}

	function doGG(
		a: number,
		b: number,
		c: number,
		d: number,
		x: number,
		s: number,
		ac: number
	): number {
		a = addUnsigned(a, addUnsigned(addUnsigned(doG(b, c, d), x), ac));

		return addUnsigned(rotateLeft(a, s), b);
	}

	function doHH(
		a: number,
		b: number,
		c: number,
		d: number,
		x: number,
		s: number,
		ac: number
	): number {
		a = addUnsigned(a, addUnsigned(addUnsigned(doH(b, c, d), x), ac));

		return addUnsigned(rotateLeft(a, s), b);
	}

	function doII(
		a: number,
		b: number,
		c: number,
		d: number,
		x: number,
		s: number,
		ac: number
	): number {
		a = addUnsigned(a, addUnsigned(addUnsigned(doI(b, c, d), x), ac));

		return addUnsigned(rotateLeft(a, s), b);
	}

	function convertToWordArray(str: string): number[] {
		let lWordCount: number;
		const lMessageLength = str.length;
		const lNumberOfWords_temp1 = lMessageLength + 8;
		const lNumberOfWords_temp2 =
			(lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
		const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
		const lWordArray: number[] = new Array(lNumberOfWords - 1);
		let lBytePosition = 0;
		let lByteCount = 0;

		while (lByteCount < lMessageLength) {
			lWordCount = (lByteCount - (lByteCount % 4)) / 4;
			lBytePosition = (lByteCount % 4) * 8;
			lWordArray[lWordCount] =
				(lWordArray[lWordCount] ?? 0) |
				(str.charCodeAt(lByteCount) << lBytePosition);
			lByteCount++;
		}
		lWordCount = (lByteCount - (lByteCount % 4)) / 4;
		lBytePosition = (lByteCount % 4) * 8;
		lWordArray[lWordCount] =
			(lWordArray[lWordCount] ?? 0) | (0x80 << lBytePosition);
		lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
		lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;

		return lWordArray;
	}

	function wordToHex(lValue: number): string {
		let wordToHexValue = '',
			wordToHexValue_temp = '',
			lByte,
			lCount;

		for (lCount = 0; lCount <= 3; lCount++) {
			lByte = (lValue >>> (lCount * 8)) & 255;
			wordToHexValue_temp = `0${lByte.toString(16)}`;
			wordToHexValue =
				wordToHexValue +
				wordToHexValue_temp.substr(wordToHexValue_temp.length - 2, 2);
		}

		return wordToHexValue;
	}

	function utf8Encode(str: string): string {
		let utftext = '';

		for (let n = 0; n < str.length; n++) {
			const c = str.charCodeAt(n);

			if (c < 128) {
				utftext += String.fromCharCode(c);
			} else if (c > 127 && c < 2048) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			} else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}
		}

		return utftext;
	}

	let x: number[] = [];
	let k, AA, BB, CC, DD, a, b, c, d;
	const S11 = 7,
		S12 = 12,
		S13 = 17,
		S14 = 22;
	const S21 = 5,
		S22 = 9,
		S23 = 14,
		S24 = 20;
	const S31 = 4,
		S32 = 11,
		S33 = 16,
		S34 = 23;
	const S41 = 6,
		S42 = 10,
		S43 = 15,
		S44 = 21;
	// NOTE: `x` is always allocated with the exact required length, so the `?? 0`
	// fallback is never taken at runtime. It just satisfies
	// `noUncheckedIndexedAccess`.
	const w = (i: number): number => x[i] ?? 0;

	string = utf8Encode(string);

	x = convertToWordArray(string);

	a = 0x67452301;
	b = 0xefcdab89;
	c = 0x98badcfe;
	d = 0x10325476;

	for (k = 0; k < x.length; k += 16) {
		AA = a;
		BB = b;
		CC = c;
		DD = d;
		a = doFF(a, b, c, d, w(k + 0), S11, 0xd76aa478);
		d = doFF(d, a, b, c, w(k + 1), S12, 0xe8c7b756);
		c = doFF(c, d, a, b, w(k + 2), S13, 0x242070db);
		b = doFF(b, c, d, a, w(k + 3), S14, 0xc1bdceee);
		a = doFF(a, b, c, d, w(k + 4), S11, 0xf57c0faf);
		d = doFF(d, a, b, c, w(k + 5), S12, 0x4787c62a);
		c = doFF(c, d, a, b, w(k + 6), S13, 0xa8304613);
		b = doFF(b, c, d, a, w(k + 7), S14, 0xfd469501);
		a = doFF(a, b, c, d, w(k + 8), S11, 0x698098d8);
		d = doFF(d, a, b, c, w(k + 9), S12, 0x8b44f7af);
		c = doFF(c, d, a, b, w(k + 10), S13, 0xffff5bb1);
		b = doFF(b, c, d, a, w(k + 11), S14, 0x895cd7be);
		a = doFF(a, b, c, d, w(k + 12), S11, 0x6b901122);
		d = doFF(d, a, b, c, w(k + 13), S12, 0xfd987193);
		c = doFF(c, d, a, b, w(k + 14), S13, 0xa679438e);
		b = doFF(b, c, d, a, w(k + 15), S14, 0x49b40821);
		a = doGG(a, b, c, d, w(k + 1), S21, 0xf61e2562);
		d = doGG(d, a, b, c, w(k + 6), S22, 0xc040b340);
		c = doGG(c, d, a, b, w(k + 11), S23, 0x265e5a51);
		b = doGG(b, c, d, a, w(k + 0), S24, 0xe9b6c7aa);
		a = doGG(a, b, c, d, w(k + 5), S21, 0xd62f105d);
		d = doGG(d, a, b, c, w(k + 10), S22, 0x2441453);
		c = doGG(c, d, a, b, w(k + 15), S23, 0xd8a1e681);
		b = doGG(b, c, d, a, w(k + 4), S24, 0xe7d3fbc8);
		a = doGG(a, b, c, d, w(k + 9), S21, 0x21e1cde6);
		d = doGG(d, a, b, c, w(k + 14), S22, 0xc33707d6);
		c = doGG(c, d, a, b, w(k + 3), S23, 0xf4d50d87);
		b = doGG(b, c, d, a, w(k + 8), S24, 0x455a14ed);
		a = doGG(a, b, c, d, w(k + 13), S21, 0xa9e3e905);
		d = doGG(d, a, b, c, w(k + 2), S22, 0xfcefa3f8);
		c = doGG(c, d, a, b, w(k + 7), S23, 0x676f02d9);
		b = doGG(b, c, d, a, w(k + 12), S24, 0x8d2a4c8a);
		a = doHH(a, b, c, d, w(k + 5), S31, 0xfffa3942);
		d = doHH(d, a, b, c, w(k + 8), S32, 0x8771f681);
		c = doHH(c, d, a, b, w(k + 11), S33, 0x6d9d6122);
		b = doHH(b, c, d, a, w(k + 14), S34, 0xfde5380c);
		a = doHH(a, b, c, d, w(k + 1), S31, 0xa4beea44);
		d = doHH(d, a, b, c, w(k + 4), S32, 0x4bdecfa9);
		c = doHH(c, d, a, b, w(k + 7), S33, 0xf6bb4b60);
		b = doHH(b, c, d, a, w(k + 10), S34, 0xbebfbc70);
		a = doHH(a, b, c, d, w(k + 13), S31, 0x289b7ec6);
		d = doHH(d, a, b, c, w(k + 0), S32, 0xeaa127fa);
		c = doHH(c, d, a, b, w(k + 3), S33, 0xd4ef3085);
		b = doHH(b, c, d, a, w(k + 6), S34, 0x4881d05);
		a = doHH(a, b, c, d, w(k + 9), S31, 0xd9d4d039);
		d = doHH(d, a, b, c, w(k + 12), S32, 0xe6db99e5);
		c = doHH(c, d, a, b, w(k + 15), S33, 0x1fa27cf8);
		b = doHH(b, c, d, a, w(k + 2), S34, 0xc4ac5665);
		a = doII(a, b, c, d, w(k + 0), S41, 0xf4292244);
		d = doII(d, a, b, c, w(k + 7), S42, 0x432aff97);
		c = doII(c, d, a, b, w(k + 14), S43, 0xab9423a7);
		b = doII(b, c, d, a, w(k + 5), S44, 0xfc93a039);
		a = doII(a, b, c, d, w(k + 12), S41, 0x655b59c3);
		d = doII(d, a, b, c, w(k + 3), S42, 0x8f0ccc92);
		c = doII(c, d, a, b, w(k + 10), S43, 0xffeff47d);
		b = doII(b, c, d, a, w(k + 1), S44, 0x85845dd1);
		a = doII(a, b, c, d, w(k + 8), S41, 0x6fa87e4f);
		d = doII(d, a, b, c, w(k + 15), S42, 0xfe2ce6e0);
		c = doII(c, d, a, b, w(k + 6), S43, 0xa3014314);
		b = doII(b, c, d, a, w(k + 13), S44, 0x4e0811a1);
		a = doII(a, b, c, d, w(k + 4), S41, 0xf7537e82);
		d = doII(d, a, b, c, w(k + 11), S42, 0xbd3af235);
		c = doII(c, d, a, b, w(k + 2), S43, 0x2ad7d2bb);
		b = doII(b, c, d, a, w(k + 9), S44, 0xeb86d391);
		a = addUnsigned(a, AA);
		b = addUnsigned(b, BB);
		c = addUnsigned(c, CC);
		d = addUnsigned(d, DD);
	}

	const temp = wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);

	return temp.toLowerCase();
};

export const closeMediaStream = (stream?: MediaStream): void => {
	if (!stream) {
		return;
	}

	// Latest spec states that MediaStream has no stop() method and instead must
	// call stop() on every MediaStreamTrack.
	try {
		let tracks;

		if (stream.getTracks) {
			tracks = stream.getTracks();
			for (const track of tracks) {
				track.stop();
			}
		} else {
			tracks = stream.getAudioTracks();
			for (const track of tracks) {
				track.stop();
			}
			tracks = stream.getVideoTracks();
			for (const track of tracks) {
				track.stop();
			}
		}
	} catch (error) {
		// Deprecated by the spec, but still in use.
		// NOTE: In Temasys IE plugin stream.stop is a callable 'object'.
		const legacyStream = stream as MediaStream & { stop?: unknown };

		if (
			typeof legacyStream.stop === 'function' ||
			typeof legacyStream.stop === 'object'
		) {
			(legacyStream.stop as () => void)();
		}
	}
};

export const cloneArray = <T = unknown>(array?: T[] | null): T[] => {
	return array?.slice() || [];
};

export const cloneObject = <T extends object>(
	obj?: T | null,
	fallback: T = {} as T
): T => {
	return (obj && Object.assign({}, obj)) || fallback;
};

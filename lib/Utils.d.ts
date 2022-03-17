import {URI} from './URI'
import {causes} from './Constants'

export function str_utf8_length(str: string): number;

export function isString(str: unknown): str is string;

export function isDecimal(num: unknown): num is number;

export function isEmpty(value: unknown): boolean;

export function hasMethods(obj: any, ...methodNames: string[]): boolean;

export function newTag(): string;

export function newUUID(): string;

export function hostType(host: string): string;

export function escapeUser(user: string): string;

export function normalizeTarget(target: URI | string, domain?: string): URI | undefined;

export function headerize(str: string): string;

export function sipErrorCause(status_code: number): causes;

export function getRandomTestNetIP(): string;

export function calculateMD5(str: string): string;

export function closeMediaStream(stream?: MediaStream): void;

export function cloneArray<T = unknown>(arr: T[]): T[];

export function cloneObject<T>(obj: T, fallback?: T): T;

export function parseUri(uri: string): string | undefined;

export function parseNameAddrHeader(nameAddrHeader: string): string | undefined;

import { Grammar } from './Grammar'
import URI, { Parameters, } from './URI'

export default class NameAddrHeader {
  get display_name(): string;
  set display_name(value: string);

  get uri(): URI;

  constructor(uri: URI, display_name?: string, parameters?: Parameters);

  setParam(key: string, value?: string): void;

  getParam<T = any>(key: string): T;

  hasParam(key: string): boolean;

  deleteParam(key: string): void;

  clearParams(): void;

  clone(): this;

  toString(): string;

  static parse(uri: string): Grammar | undefined;
}

import Transport from './Transport';
import UA from './UA';

export type ExtraContactParams = Record<string, string | number | boolean>;

export class Registrator {
  constructor(ua: UA, transport: Transport);

  setExtraHeaders(extraHeaders: string[]): void;

  setExtraContactParams(extraContactParams: ExtraContactParams): void;
}

import { EventEmitter } from 'node:events';
import type { ConstructorOptions } from 'pg-boss';

// pg-boss ships only ES modules, which the CommonJS unit suite cannot load.
// Jest substitutes this double for the package in every unit spec; the e2e
// and integration suites run as ES modules and load the real package.
export class PgBoss extends EventEmitter {
  constructor(readonly options: ConstructorOptions) {
    super();
  }
}

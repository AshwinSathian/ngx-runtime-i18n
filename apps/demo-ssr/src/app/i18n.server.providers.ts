import { inject, REQUEST_CONTEXT } from '@angular/core';
import {
  provideRuntimeI18nSsr,
  RuntimeI18nSsrSnapshot,
} from '@ngx-runtime-i18n/angular';

/**
 * Seeds TransferState from the per-request snapshot that server.ts passes as
 * `angularApp.handle(req, snapshot)`. During prerendering there is no request,
 * REQUEST_CONTEXT is null, and nothing is seeded.
 */
export const i18nServerProviders = provideRuntimeI18nSsr(
  () => inject(REQUEST_CONTEXT, { optional: true }) as RuntimeI18nSsrSnapshot | null
);

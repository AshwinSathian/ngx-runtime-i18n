/**
 * @packageDocumentation
 * Angular bindings for @ngx-runtime-i18n.
 * Signals-first API, SSR-safe when paired with TransferState.
 */

export { provideRuntimeI18n } from './lib/provide-runtime-i18n';
export { I18nService } from './lib/i18n.service';
export { I18nPipe } from './lib/i18n.pipe';

/** Advanced tokens for custom setups (SSR seeding, inspection). */
export {
  RUNTIME_I18N_CONFIG,
  RUNTIME_I18N_CATALOGS,
  RUNTIME_I18N_LOCALES,
  RUNTIME_I18N_STATE_KEY,
  RUNTIME_I18N_LOCALE_LOADERS,
} from './lib/tokens';

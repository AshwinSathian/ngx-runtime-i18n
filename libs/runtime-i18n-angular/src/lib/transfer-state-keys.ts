/**
 * Shared TransferState key helpers so SSR seeding and client hydration stay in sync.
 */
export const DEFAULT_RUNTIME_I18N_STATE_KEY_PREFIX = '@ngx-runtime-i18n/core';

export function getRuntimeI18nBootstrapStateKey(prefix: string): string {
  return `${prefix}:bootstrap`;
}

export function getRuntimeI18nCatalogStateKey(
  prefix: string,
  lang: string
): string {
  return `${prefix}:catalog:${lang}`;
}

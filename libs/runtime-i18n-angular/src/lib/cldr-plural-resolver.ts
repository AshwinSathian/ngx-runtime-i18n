import { getLocalePluralCase, Plural } from '@angular/common';
import type { PluralCategory, PluralResolver } from '@ngx-runtime-i18n/core';

const CLDR_MAP: Record<number, PluralCategory> = {
  [Plural.Zero]: 'zero',
  [Plural.One]: 'one',
  [Plural.Two]: 'two',
  [Plural.Few]: 'few',
  [Plural.Many]: 'many',
  [Plural.Other]: 'other',
};

/**
 * Builds the CLDR-backed {@link PluralResolver} installed by
 * `provideRuntimeI18n()`. Shared with `provideRuntimeI18nTesting()` so both
 * providers resolve `plural`/`selectordinal` categories identically instead
 * of the testing harness silently falling back to a plain one/other rule.
 * @internal
 */
export function createCldrPluralResolver(): PluralResolver {
  return (count: number, locale: string): PluralCategory => {
    try {
      const plural = getLocalePluralCase(locale)(count);
      return CLDR_MAP[plural] ?? 'other';
    } catch {
      return count === 1 ? 'one' : 'other';
    }
  };
}

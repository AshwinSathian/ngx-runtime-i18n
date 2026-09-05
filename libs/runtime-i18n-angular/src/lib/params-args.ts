import type { TranslationKey, TranslationParams } from '@ngx-runtime-i18n/core';

/**
 * Makes the params argument to `t()`/`transform()` required exactly when
 * `TranslationParams<K>` resolves to a non-empty shape (a schema is
 * augmented and this key's message has interpolation/plural/select
 * placeholders). Stays optional both when no schema is augmented
 * (`TranslationParams<K>` falls back to `Record<string, unknown>`) and when
 * the key's message has no placeholders at all (`TranslationParams<K>`
 * resolves to an empty shape) - marking the parameter itself optional with
 * `params?:` let callers omit it unconditionally, regardless of what the
 * schema actually required.
 * @internal
 */
export type ParamsArgs<K extends TranslationKey, P = TranslationParams<K>> =
  Record<string, unknown> extends P ? [params?: P] : [params: P];

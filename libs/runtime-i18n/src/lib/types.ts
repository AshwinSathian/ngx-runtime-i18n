/**
 * A translation catalog is a nested object where keys are dot-addressable.
 * Example:
 * {
 *   "hello": { "user": "Hello, {name}!" },
 *   "cart": { "items": "{count, plural, one {1 item} other {# items}}" }
 * }
 * Keys may contain ICU message syntax.
 * @publicApi
 */
export type Catalog = Record<string, unknown>;

/**
 * Runtime i18n configuration shared across CSR and SSR.
 * Provide via {@link @ngx-runtime-i18n/angular!provideRuntimeI18n | provideRuntimeI18n()}.
 * @publicApi
 */
export interface RuntimeI18nConfig {
  /**
   * The language to render when no user preference is known.
   * SSR should override per request (e.g., from URL/cookie).
   */
  defaultLang: string;

  /**
   * Optional ordered list of fallback languages (per key).
   * Missing keys resolve using: active → fallbacks → defaultLang.
   */
  fallbacks?: string[];

  /**
   * The set of allowed languages. `setLang()` will guard against values not in this list.
   * Use BCP-47 tags (e.g., "en", "en-GB", "hi").
   */
  supported: string[];

  /**
   * Fetch a catalog at runtime. Must be idempotent and cancellable via AbortSignal.
   * - Runs on the client only (the server should seed catalogs via TransferState).
   * - Return a plain object (parsed JSON).
   */
  fetchCatalog: (lang: string, signal?: AbortSignal) => Promise<Catalog>;

  /**
   * Missing key handler. When omitted, the key itself is returned (useful in dev).
   * Use to log or to inject a visible marker.
   */
  onMissingKey?: (key: string) => string;
}

/**
 * Module-augmentation hook for typed translation keys.
 * Augment this interface in your app to enable typed t() and pipe.
 *
 * @example
 * // src/i18n.d.ts
 * import type en from '../public/i18n/en.json';
 * declare module '@ngx-runtime-i18n/core' {
 *   interface I18nSchema { translations: typeof en; }
 * }
 * @publicApi
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface I18nSchema {}

/** @internal */
export type ActiveCatalogType =
  'translations' extends keyof I18nSchema
    ? I18nSchema['translations']
    : Record<string, unknown>;

/** Depth guard for recursive type — prevents TypeScript slowdown on large catalogs. @internal */
type Prev = [never, 0, 1, 2, 3, 4, ...0[]];

/**
 * Produces dot-notation key paths for T up to Depth levels deep.
 * Depth cap prevents compile-time slowdown at 2000+ keys (i18next issue #1914).
 * @publicApi
 */
export type DeepKeys<T, Depth extends number = 4> =
  [Depth] extends [never]
    ? never
    : T extends Record<string, unknown>
    ? {
        [K in keyof T & string]:
          | K
          | (T[K] extends Record<string, unknown>
              ? `${K}.${DeepKeys<T[K], Prev[Depth]>}`
              : never);
      }[keyof T & string]
    : never;

/**
 * The union of valid translation keys, or `string` when no schema is provided (backward compat).
 * @publicApi
 */
export type TranslationKey =
  'translations' extends keyof I18nSchema
    ? DeepKeys<I18nSchema['translations']>
    : string;

/**
 * Extracts interpolation param names from an ICU message string literal.
 * Works for simple {name} tokens and ICU keyword blocks {count, plural, ...}.
 * @publicApi
 */
export type ExtractParams<S extends string> =
  S extends `${string}{${infer Token}}${infer Rest}`
    ? Token extends `${infer Arg},${infer Keyword},${string}`
      ? Keyword extends 'plural' | 'select' | 'selectordinal'
        ? { [K in Arg]: number } & ExtractParams<Rest>
        : { [K in Token]: string | number } & ExtractParams<Rest>
      : { [K in Token]: string | number } & ExtractParams<Rest>
    : Record<never, never>;

/** @internal */
type ResolveValue<T, P extends string> =
  P extends `${infer K}.${infer Rest}`
    ? K extends keyof T
      ? ResolveValue<T[K], Rest>
      : never
    : P extends keyof T
    ? T[P]
    : never;

/**
 * Resolves the interpolation params type for a given key K.
 * Falls back to Record<string, unknown> when no schema or when value is not a string literal.
 * @publicApi
 */
export type TranslationParams<K extends TranslationKey> =
  'translations' extends keyof I18nSchema
    ? K extends string
      ? ResolveValue<I18nSchema['translations'], K> extends string
        ? ExtractParams<ResolveValue<I18nSchema['translations'], K>>
        : Record<string, unknown>
      : Record<string, unknown>
    : Record<string, unknown>;

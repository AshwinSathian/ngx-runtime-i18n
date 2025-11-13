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

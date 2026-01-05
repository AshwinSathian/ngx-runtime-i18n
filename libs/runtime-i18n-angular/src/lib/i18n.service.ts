import {
  ApplicationRef,
  DestroyRef,
  inject,
  Injectable,
  makeStateKey,
  PLATFORM_ID,
  Signal,
  signal,
  TransferState,
} from '@angular/core';
import { Catalog, formatIcu } from '@ngx-runtime-i18n/core';
import { isPlatformBrowser } from '@angular/common';
import {
  RUNTIME_I18N_CATALOGS,
  RUNTIME_I18N_CONFIG,
  RUNTIME_I18N_LOCALE_LOADERS,
  RUNTIME_I18N_LOCALES,
  RUNTIME_I18N_OPTIONS,
  RUNTIME_I18N_STATE_KEY,
  RuntimeI18nOptions,
} from './tokens';

const isBrowser = typeof window !== 'undefined';

// Angular sets ngDevMode to true in dev builds, undefined in prod (tree-shaken).
declare const ngDevMode: boolean;
const DEV = typeof ngDevMode !== 'undefined' && !!ngDevMode;

/**
 * Signals-first runtime i18n service.
 *
 * - Deterministic SSR→CSR: uses TransferState if present.
 * - No DOM mutations before first stability (avoids hydration issues).
 * - Cancellable fetch on rapid language switches.
 *
 * @publicApi
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private cfg = inject(RUNTIME_I18N_CONFIG);
  private catalogs = inject(RUNTIME_I18N_CATALOGS);
  private locales = inject(RUNTIME_I18N_LOCALES);
  private ts = inject(TransferState, { optional: true });
  private appRef = inject(ApplicationRef);
  private destroyRef = inject(DestroyRef);
  private stateKeyPrefix = inject(RUNTIME_I18N_STATE_KEY);
  private localeLoaders = inject(RUNTIME_I18N_LOCALE_LOADERS);
  private options = inject<RuntimeI18nOptions>(RUNTIME_I18N_OPTIONS);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowserPlatform =
    isBrowser && isPlatformBrowser(this.platformId);

  private _lang = signal<string>(this.cfg.defaultLang);
  private _ready = signal<boolean>(false);
  private catalogFetches = new Map<
    string,
    { controller?: AbortController; promise: Promise<void> }
  >();

  /** Currently active language (signal). */
  readonly lang: Signal<string> = this._lang.asReadonly();
  /** True once the initial locale + catalog are available. */
  readonly ready: Signal<boolean> = this._ready.asReadonly();

  // Track missing keys warned in dev mode (dedup once per key)
  private _warnedMissing = DEV ? new Set<string>() : undefined;

  constructor() {
    // Defer initial work until app is stable (prevents pre-hydration mutations).
    const sub = this.appRef.isStable.subscribe(async (stable) => {
      if (!stable) return;

      let initial = this.cfg.defaultLang;

      // 1) TransferState bootstrap (SSR→CSR)
      if (this.ts) {
        const key = makeStateKey<{
          lang: string;
          catalogs: Record<string, Catalog>;
        }>(`${this.stateKeyPrefix}:bootstrap`);
        if (this.ts.hasKey(key)) {
          const snap = this.ts.get(key, {
            lang: this.cfg.defaultLang,
            catalogs: {},
          });
          initial = snap.lang || initial;
          this.ts.remove(key);
          Object.entries(snap.catalogs).forEach(([l, c]) => {
            if (!this.catalogs.has(l)) this.catalogs.set(l, c as Catalog);
          });
        }
      }

      // 2) If no SSR lang snapshot, try persisted user choice
      const candidateFromStorage =
        this.isBrowserPlatform && this.options.storageKey
          ? safeLocalStorageGet(this.options.storageKey)
          : null;

      // 3) Else browser auto-detect (navigator.language), with fallback chain
      const candidateFromNavigator = (() => {
        if (!this.isBrowserPlatform || !this.options.autoDetect) return null;
        const browserNavigator = navigator as Navigator & {
          userLanguage?: string;
        };
        return (
          browserNavigator.language || browserNavigator.userLanguage || null
        );
      })();

      if (initial === this.cfg.defaultLang && candidateFromStorage) {
        const resolved = resolveSupported(
          this.cfg.supported,
          candidateFromStorage,
          !!this.options.preferNavigatorBase
        );
        if (resolved) initial = resolved;
      } else if (initial === this.cfg.defaultLang && candidateFromNavigator) {
        const resolved = resolveSupported(
          this.cfg.supported,
          candidateFromNavigator,
          !!this.options.preferNavigatorBase
        );
        if (resolved) initial = resolved;
      }

      this._lang.set(initial);

      const keep = new Set(this.getFallbackChain(initial));

      await this.ensureLocale(initial);
      await this.ensureCatalog(initial);
      this.cancelFetchesOutside(keep);
      if (this.options.cacheMode === 'none') {
        this.pruneCatalogCache(keep);
      }
      this._ready.set(true);
      sub.unsubscribe();
    });

    this.destroyRef.onDestroy(() => this.abortAllFetches());
  }

  /**
   * Translate a key using the active language. Supports ICU-lite + interpolation.
   * Falls back to {@link RuntimeI18nConfig.onMissingKey} or the raw key.
   */
  t(key: string, params?: Record<string, unknown>): string {
    const chain = this.getFallbackChain(this._lang());
    for (const candidate of chain) {
      const catalog = this.catalogs.get(candidate);
      if (!catalog || !hasKey(catalog, key)) continue;
      return formatIcu(candidate, key, catalog, params, this.cfg.onMissingKey);
    }

    if (DEV && !this._warnedMissing?.has(key)) {
      console.warn(
        `[ngx-runtime-i18n] Missing key "${key}" across fallback chain [${chain.join(
          ' → '
        )}]. Provide it in a catalog or customize onMissingKey().`
      );
      this._warnedMissing?.add(key);
    }

    return this.cfg.onMissingKey ? this.cfg.onMissingKey(key) : key;
  }

  /** Expose the current language without subscribing to the signal. */
  getCurrentLang(): string {
    return this._lang();
  }

  /** Returns the set of languages with catalogs cached in memory. */
  getLoadedLangs(): string[] {
    return Array.from(this.catalogs.keys());
  }

  /** Whether a key exists in a loaded catalog (defaults to current lang). */
  hasKey(key: string, lang = this._lang()): boolean {
    const catalog = this.catalogs.get(lang);
    return hasKey(catalog, key);
  }

  /**
   * Switch the active language. Loads locale data + catalog on demand.
   * Respects {@link RuntimeI18nConfig.supported}.
   * Persists to localStorage when enabled.
   */
  async setLang(lang: string): Promise<void> {
    if (lang === this._lang()) return;
    const resolved = resolveSupported(this.cfg.supported, lang, true);
    if (!resolved) throw new Error(`Unsupported lang: ${lang}`);
    const chain = new Set(this.getFallbackChain(resolved));
    await this.ensureLocale(resolved);
    await this.ensureCatalog(resolved);
    this.cancelFetchesOutside(chain);
    if (this.options.cacheMode === 'none') {
      this.pruneCatalogCache(chain);
    }
    this._lang.set(resolved);
    if (this.isBrowserPlatform && this.options.storageKey) {
      try {
        localStorage.setItem(this.options.storageKey, resolved);
      } catch (error) {
        void error;
      }
    }
  }

  // --- Internals -------------------------------------------------------------

  private async ensureLocale(lang: string) {
    const base = lang.toLowerCase().split('-')[0];
    if (this.locales.has(base)) return;
    if (this.isBrowserPlatform) {
      const loader = this.localeLoaders[base];
      if (loader) await loader();
    }
    this.locales.add(base);
  }

  private async ensureCatalog(
    lang: string,
    includeFallbacks = true,
    visited = new Set<string>()
  ) {
    if (visited.has(lang)) return;
    visited.add(lang);

    await this.loadCatalog(lang);

    if (!includeFallbacks) return;

    const fallbacks = this.getFallbackChain(lang).slice(1);
    for (const fb of fallbacks) {
      await this.ensureCatalog(fb, false, visited);
    }
  }

  private async loadCatalog(lang: string): Promise<void> {
    if (this.catalogs.has(lang)) return;

    const stateKey = makeStateKey<Catalog>(
      `${this.stateKeyPrefix}:catalog:${lang}`
    );
    if (this.ts?.hasKey(stateKey)) {
      const cat = this.ts.get(stateKey, {});
      this.catalogs.set(lang, cat);
      this.ts.remove(stateKey);
      return;
    }

    if (!this.isBrowserPlatform) return;

    const cacheMode = this.options.cacheMode ?? 'memory';
    if (
      cacheMode === 'storage' &&
      this.hydrateCatalogFromStorage(
        lang,
        this.options.cacheKeyPrefix ?? '@ngx-runtime-i18n:catalog:'
      )
    ) {
      void this.fetchCatalogFromNetwork(lang, true);
      return;
    }

    await this.fetchCatalogFromNetwork(lang);
  }

  private async fetchCatalogFromNetwork(
    lang: string,
    background = false
  ): Promise<void> {
    if (!this.isBrowserPlatform) return;

    const existing = this.catalogFetches.get(lang);
    if (existing) {
      if (background) {
        existing.promise.catch(() => void 0);
        return;
      }
      await existing.promise;
      return;
    }

    const controller = new AbortController();
    const promise = (async () => {
      try {
        const fetched = await this.cfg.fetchCatalog(lang, controller.signal);
        if (controller.signal.aborted) return;
        this.catalogs.set(lang, fetched);
        if ((this.options.cacheMode ?? 'memory') === 'storage') {
          const prefix =
            this.options.cacheKeyPrefix ?? '@ngx-runtime-i18n:catalog:';
          const cacheKey = `${prefix}${lang}`;
          safeLocalStorageSet(cacheKey, this.catalogs.get(lang) ?? fetched);
        }
      } finally {
        const current = this.catalogFetches.get(lang);
        if (current?.controller === controller) {
          this.catalogFetches.delete(lang);
        }
      }
    })();

    this.catalogFetches.set(lang, { controller, promise });

    if (background) {
      promise.catch(() => void 0);
      return;
    }
    await promise;
  }

  private hydrateCatalogFromStorage(lang: string, prefix: string): boolean {
    if (!this.isBrowserPlatform) return false;
    const cacheKey = `${prefix}${lang}`;
    const raw = safeLocalStorageGet(cacheKey);
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw) as Catalog;
      if (parsed && typeof parsed === 'object') {
        this.catalogs.set(lang, parsed);
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  private getFallbackChain(lang: string): string[] {
    const chain: string[] = [];
    const seen = new Set<string>();
    const push = (candidate: string | null) => {
      if (!candidate) return;
      const resolved = resolveSupported(this.cfg.supported, candidate, true);
      if (!resolved || seen.has(resolved)) return;
      seen.add(resolved);
      chain.push(resolved);
    };
    push(lang);
    for (const fallback of this.cfg.fallbacks ?? []) {
      push(fallback);
    }
    push(this.cfg.defaultLang);
    return chain;
  }

  private pruneCatalogCache(keep: Set<string>) {
    if ((this.options.cacheMode ?? 'memory') !== 'none') return;
    for (const lang of Array.from(this.catalogs.keys())) {
      if (!keep.has(lang)) this.catalogs.delete(lang);
    }
  }

  private cancelFetchesOutside(keep: Set<string>) {
    for (const [lang, entry] of this.catalogFetches.entries()) {
      if (!keep.has(lang)) {
        entry.controller?.abort();
        this.catalogFetches.delete(lang);
      }
    }
  }

  private abortAllFetches() {
    for (const entry of this.catalogFetches.values()) {
      entry.controller?.abort();
    }
    this.catalogFetches.clear();
  }
}

function hasKey(obj: unknown, path: string): boolean {
  if (!obj || typeof obj !== 'object') return false;
  let cur: unknown = obj;
  for (const p of path.split('.')) {
    if (cur == null || typeof cur !== 'object' || !(p in cur)) return false;
    cur = (cur as Record<string, unknown>)[p];
  }
  return true;
}

/** Resolve to a supported language: exact tag, or base fallback when allowed. */
function resolveSupported(
  supported: string[],
  candidate: string,
  allowBaseFallback: boolean
): string | null {
  if (!candidate) return null;
  const lc = candidate.toLowerCase();
  // exact match (case-insensitive)
  const exact = supported.find((s) => s.toLowerCase() === lc);
  if (exact) return exact;
  if (!allowBaseFallback) return null;
  // base match: en-GB -> en
  const base = lc.split('-')[0];
  const baseHit = supported.find((s) => s.toLowerCase() === base);
  return baseHit ?? null;
}

function safeLocalStorageGet(key: string): string | null {
  try {
    const v = localStorage.getItem(key);
    return v || null;
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / SSR errors
  }
}

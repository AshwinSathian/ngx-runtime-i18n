import {
  ApplicationRef,
  DestroyRef,
  inject,
  Injectable,
  makeStateKey,
  Signal,
  signal,
  TransferState,
} from '@angular/core';
import { Catalog, formatIcu } from '@ngx-runtime-i18n';
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

  private _lang = signal<string>(this.cfg.defaultLang);
  private _ready = signal<boolean>(false);

  /** Currently active language (signal). */
  readonly lang: Signal<string> = this._lang.asReadonly();
  /** True once the initial locale + catalog are available. */
  readonly ready: Signal<boolean> = this._ready.asReadonly();

  private abort?: AbortController;

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
        isBrowser && this.options.storageKey
          ? safeLocalStorageGet(this.options.storageKey)
          : null;

      // 3) Else browser auto-detect (navigator.language), with fallback chain
      const candidateFromNavigator =
        isBrowser && this.options.autoDetect
          ? navigator.language || (navigator as any).userLanguage || null
          : null;

      // Compute best candidate only if SSR didn't supply lang and no persisted value
      if (!this.ts || !this.ts.hasKey) {
        // if TransferState existed, initial already set above
      }
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

      await this.ensureLocale(initial);
      await this.ensureCatalog(initial);
      this._ready.set(true);
      sub.unsubscribe();
    });

    this.destroyRef.onDestroy(() => this.abort?.abort());
  }

  /**
   * Translate a key using the active language. Supports ICU-lite + interpolation.
   * Falls back to {@link RuntimeI18nConfig.onMissingKey} or the raw key.
   */
  t(key: string, params?: Record<string, unknown>): string {
    const lang = this._lang();
    const cat =
      this.catalogs.get(lang) ?? this.catalogs.get(this.cfg.defaultLang) ?? {};

    // Dev-only, de-duplicated missing key warning
    if (DEV && !hasKey(cat, key) && !this._warnedMissing?.has(key)) {
      console.warn(
        `[ngx-runtime-i18n] Missing key "${key}" for lang "${lang}". ` +
          `Provide it in your catalog or customize onMissingKey().`
      );
      this._warnedMissing?.add(key);
    }

    return formatIcu(lang, key, cat, params, this.cfg.onMissingKey);
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
    await this.ensureLocale(resolved);
    await this.ensureCatalog(resolved);
    this._lang.set(resolved);
    if (isBrowser && this.options.storageKey) {
      try {
        localStorage.setItem(this.options.storageKey, resolved);
      } catch {}
    }
  }

  // --- Internals -------------------------------------------------------------

  private async ensureLocale(lang: string) {
    const base = lang.toLowerCase().split('-')[0];
    if (this.locales.has(base)) return;
    if (isBrowser) {
      const loader = this.localeLoaders[base];
      if (loader) await loader();
    }
    this.locales.add(base);
  }

  private async ensureCatalog(lang: string) {
    if (this.catalogs.has(lang)) return;

    // Hydration snapshot
    const k = makeStateKey<Catalog>(`${this.stateKeyPrefix}:catalog:${lang}`);
    if (this.ts?.hasKey(k)) {
      const cat = this.ts.get(k, {});
      this.catalogs.set(lang, cat);
      this.ts.remove(k);
      return;
    }

    if (!isBrowser) return;

    this.abort?.abort();
    const ctrl = new AbortController();
    this.abort = ctrl;
    try {
      const fetched = await this.cfg.fetchCatalog(lang, ctrl.signal);
      if (this.abort !== ctrl) return; // stale
      const base = this.catalogs.get(this.cfg.defaultLang) ?? {};
      this.catalogs.set(lang, deepMerge(base, fetched));
    } finally {
      if (this.abort === ctrl) this.abort = undefined;
    }
  }
}

function deepMerge(a: any, b: any): any {
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return b ?? a;
  const out: any = Array.isArray(a) ? [...a] : { ...a };
  for (const k of Object.keys(b)) out[k] = deepMerge(a[k], b[k]);
  return out;
}

function hasKey(obj: unknown, path: string): boolean {
  if (!obj || typeof obj !== 'object') return false;
  let cur: any = obj;
  for (const p of path.split('.')) {
    if (cur == null || typeof cur !== 'object' || !(p in cur)) return false;
    cur = cur[p];
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

import {
  ApplicationRef,
  DestroyRef,
  inject,
  Injectable,
  makeStateKey,
  TransferState,
} from '@angular/core';
import { Catalog, formatIcu } from '@ngx-runtime-i18n';
import { BehaviorSubject } from 'rxjs';
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
 * RxJS-backed runtime i18n service for legacy / non-signals apps.
 *
 * - Exposes lang$ and ready$ BehaviorSubjects.
 * - Mirrors I18nService API: t(key, params) and setLang(lang).
 * - Deterministic with SSR when TransferState is provided.
 *
 * @publicApi
 */
@Injectable({ providedIn: 'root' })
export class I18nCompatService {
  private cfg = inject(RUNTIME_I18N_CONFIG);
  private catalogs = inject(RUNTIME_I18N_CATALOGS);
  private locales = inject(RUNTIME_I18N_LOCALES);
  private ts = inject(TransferState, { optional: true });
  private appRef = inject(ApplicationRef);
  private destroyRef = inject(DestroyRef);
  private stateKeyPrefix = inject(RUNTIME_I18N_STATE_KEY);
  private localeLoaders = inject(RUNTIME_I18N_LOCALE_LOADERS);
  private options = inject<RuntimeI18nOptions>(RUNTIME_I18N_OPTIONS);

  /** Active language observable (BehaviorSubject). */
  readonly lang$ = new BehaviorSubject<string>(this.cfg.defaultLang);
  /** Emits true once initial locale + catalog are available. */
  readonly ready$ = new BehaviorSubject<boolean>(false);

  private abort?: AbortController;
  private _warnedMissing = DEV ? new Set<string>() : undefined;

  constructor() {
    const sub = this.appRef.isStable.subscribe(async (stable) => {
      if (!stable) return;

      let initial = this.cfg.defaultLang;

      // TransferState bootstrap (SSR→CSR)
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

      // Persisted user choice
      const fromStorage =
        isBrowser && this.options.storageKey
          ? safeLocalStorageGet(this.options.storageKey)
          : null;
      // Browser auto-detect
      const fromNavigator =
        isBrowser && this.options.autoDetect
          ? navigator.language || (navigator as any).userLanguage || null
          : null;

      if (initial === this.cfg.defaultLang && fromStorage) {
        initial =
          resolveSupported(
            this.cfg.supported,
            fromStorage,
            !!this.options.preferNavigatorBase
          ) ?? initial;
      } else if (initial === this.cfg.defaultLang && fromNavigator) {
        initial =
          resolveSupported(
            this.cfg.supported,
            fromNavigator,
            !!this.options.preferNavigatorBase
          ) ?? initial;
      }

      this.lang$.next(initial);

      await this.ensureLocale(initial);
      await this.ensureCatalog(initial);
      this.ready$.next(true);

      sub.unsubscribe();
    });

    this.destroyRef.onDestroy(() => this.abort?.abort());
  }

  /**
   * Translate a key using the current language (latest from lang$).
   */
  t(key: string, params?: Record<string, unknown>): string {
    const lang = this.lang$.getValue();
    const cat =
      this.catalogs.get(lang) ?? this.catalogs.get(this.cfg.defaultLang) ?? {};

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
   * Persists to localStorage when enabled.
   */
  async setLang(lang: string): Promise<void> {
    const current = this.lang$.getValue();
    if (lang === current) return;
    const resolved = resolveSupported(this.cfg.supported, lang, true);
    if (!resolved) throw new Error(`Unsupported lang: ${lang}`);

    await this.ensureLocale(resolved);
    await this.ensureCatalog(resolved);
    this.lang$.next(resolved);

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

// --- helpers ---------------------------------------------------------------

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

function resolveSupported(
  supported: string[],
  candidate: string,
  allowBaseFallback: boolean
): string | null {
  if (!candidate) return null;
  const lc = candidate.toLowerCase();
  const exact = supported.find((s) => s.toLowerCase() === lc);
  if (exact) return exact;
  if (!allowBaseFallback) return null;
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

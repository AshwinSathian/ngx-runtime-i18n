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
  RUNTIME_I18N_STATE_KEY,
} from './tokens';

const isBrowser = typeof window !== 'undefined';

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

  private _lang = signal<string>(this.cfg.defaultLang);
  private _ready = signal<boolean>(false);

  /** Currently active language (signal). */
  readonly lang: Signal<string> = this._lang.asReadonly();
  /** True once the initial locale + catalog are available. */
  readonly ready: Signal<boolean> = this._ready.asReadonly();

  private abort?: AbortController;

  constructor() {
    // Defer initial work until app is stable (prevents pre-hydration mutations).
    const sub = this.appRef.isStable.subscribe(async (stable) => {
      if (!stable) return;

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
          this._lang.set(snap.lang);
          this.ts.remove(key);
          Object.entries(snap.catalogs).forEach(([l, c]) => {
            if (!this.catalogs.has(l)) this.catalogs.set(l, c as Catalog);
          });
        }
      }

      await this.ensureLocale(this._lang());
      await this.ensureCatalog(this._lang());
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
    return formatIcu(lang, key, cat, params, this.cfg.onMissingKey);
  }

  /**
   * Switch the active language. Loads locale data + catalog on demand.
   * Respects {@link RuntimeI18nConfig.supported}.
   */
  async setLang(lang: string): Promise<void> {
    if (lang === this._lang()) return;
    if (!this.cfg.supported.includes(lang))
      throw new Error(`Unsupported lang: ${lang}`);
    await this.ensureLocale(lang);
    await this.ensureCatalog(lang);
    this._lang.set(lang);
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

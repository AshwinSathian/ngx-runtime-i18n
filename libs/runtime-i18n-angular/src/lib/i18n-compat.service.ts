import { Injectable, inject } from '@angular/core';
import { Catalog, formatIcu } from '@ngx-runtime-i18n';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { I18nService } from './i18n.service';
import { RUNTIME_I18N_CATALOGS, RUNTIME_I18N_CONFIG } from './tokens';

/**
 * RxJS-backed compatibility service mirroring I18nService.
 * Use when an app hasn’t adopted signals yet.
 *
 * Surface:
 * - lang$: Observable<string>
 * - ready$: Observable<boolean>
 * - t(key,params): string
 * - setLang(lang): Promise<void>
 */
@Injectable({ providedIn: 'root' })
export class I18nCompatService {
  private cfg = inject(RUNTIME_I18N_CONFIG);
  private catalogs = inject(RUNTIME_I18N_CATALOGS);
  private signals = inject(I18nService);

  private _lang$ = new BehaviorSubject<string>(this.cfg.defaultLang);
  private _ready$ = new BehaviorSubject<boolean>(false);

  /** Active language stream. */
  readonly lang$: Observable<string> = this._lang$.asObservable();
  /** Ready when initial locale + catalog are available. */
  readonly ready$: Observable<boolean> = this._ready$.asObservable();

  constructor() {
    // Bridge from signals → RxJS once service becomes ready
    // (signals service already defers work until app is stable)
    const subReady = this.signals.ready.subscribe((r) => this._ready$.next(r));
    const subLang = this.signals.lang.subscribe((l) => this._lang$.next(l));

    // Cleanup left to Angular’s DI lifecycle; subs are on root singletons
    void subReady;
    void subLang;
  }

  t(key: string, params?: Record<string, unknown>): string {
    const lang = this._lang$.value;
    const cat =
      this.catalogs.get(lang) ?? this.catalogs.get(this.cfg.defaultLang) ?? {};
    return formatIcu(lang, key, cat as Catalog, params, this.cfg.onMissingKey);
  }

  async setLang(lang: string): Promise<void> {
    await this.signals.setLang(lang);
  }

  /** Helper for legacy components: await readiness before first render. */
  async whenReady(): Promise<void> {
    await firstValueFrom(this.ready$.pipe(map(Boolean)));
  }
}

import { DestroyRef, Injectable, Injector, inject } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RUNTIME_I18N_CONFIG } from './tokens';
import { I18nService } from './i18n.service';

/**
 * RxJS-backed compatibility service mirroring I18nService.
 * For apps not using signals yet.
 */
@Injectable({ providedIn: 'root' })
export class I18nCompatService {
  private injector = inject(Injector);
  private destroyRef = inject(DestroyRef); // ✅ pass DestroyRef to takeUntilDestroyed
  private cfg = inject(RUNTIME_I18N_CONFIG);
  private signals = inject(I18nService);

  private _lang$ = new BehaviorSubject<string>(this.cfg.defaultLang);
  private _ready$ = new BehaviorSubject<boolean>(false);

  /** Active language stream. */
  readonly lang$: Observable<string> = this._lang$.asObservable();
  /** Ready when initial locale + catalog are available. */
  readonly ready$: Observable<boolean> = this._ready$.asObservable();

  constructor() {
    // Bridge: signals → observables
    toObservable(this.signals.ready, { injector: this.injector })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((r) => this._ready$.next(r));

    toObservable(this.signals.lang, { injector: this.injector })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((l) => this._lang$.next(l));
  }

  t(key: string, params?: Record<string, unknown>): string {
    return this.signals.t(key, params);
  }

  async setLang(lang: string): Promise<void> {
    await this.signals.setLang(lang);
  }

  /** Helper for legacy components: await readiness before first render. */
  async whenReady(): Promise<void> {
    await firstValueFrom(this.ready$.pipe(filter(Boolean)));
  }
}

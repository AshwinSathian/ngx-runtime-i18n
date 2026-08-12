import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EnvironmentInjector,
  afterNextRender,
  computed,
  createEnvironmentInjector,
  inject,
} from '@angular/core';
import { I18nService, provideRuntimeI18n, RUNTIME_I18N_CATALOGS } from '@ngx-runtime-i18n/angular';
import type { Catalog } from '@ngx-runtime-i18n/core';

const ORDER = ['en', 'hi', 'de'] as const;
const ACCENT_CLASS: Record<(typeof ORDER)[number], string> = {
  en: 'text-accent-en',
  hi: 'text-accent-hi',
  de: 'text-accent-de',
};

const CATALOG: Record<(typeof ORDER)[number], Catalog> = {
  en: { hero: { audience: 'everyone' } },
  hi: { hero: { audience: 'सभी' } },
  de: { hero: { audience: 'alle' } },
};

@Component({
  selector: 'app-hero-lang-cycle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="font-display"
      [class]="accentClass()"
      [attr.lang]="i18n.lang()"
      (mouseenter)="paused = true"
      (mouseleave)="paused = false"
      (focus)="paused = true"
      (blur)="paused = false"
    >{{ i18n.t('hero.audience') }}</span>
  `,
})
export class HeroLangCycleComponent {
  private readonly destroyRef = inject(DestroyRef);

  // `provideRuntimeI18n()` returns a mix of plain providers and `EnvironmentProviders`
  // (it registers a `provideEnvironmentInitializer()` internally for TransferState
  // hydration). `EnvironmentProviders` cannot be used in a `@Component.providers` array
  // (Angular throws NG0207: "Invalid providers present in a non-environment injector") —
  // that's only valid in an environment injector (root/route/manually-created). So this
  // component creates and owns its own child `EnvironmentInjector`, chained off the app's,
  // to get a genuinely isolated `I18nService` instance without polluting the app-wide DI tree.
  //
  // The `RUNTIME_I18N_CATALOGS` override pre-seeds all three catalogs synchronously so the
  // service never needs to call `fetchCatalog()` to resolve them. This matters for SSR:
  // `I18nService` only ever calls `fetchCatalog()` when running in the browser (catalog
  // loading is a no-op on the server unless TransferState was seeded via
  // `provideRuntimeI18nSsr()`), so without pre-seeding, the prerendered HTML would render
  // the raw translation key instead of "everyone" until client-side hydration ran.
  // Pre-seeding keeps the tiny built-in catalog correct on server and client alike.
  //
  // `I18nService` itself is also re-listed explicitly: it's `@Injectable({ providedIn:
  // 'root' })`, so without an explicit local provider, `.get(I18nService)` on this child
  // injector would walk up to the app's root injector and hydrate the *shared* root
  // singleton there (using root's providers, not these local ones) instead of creating an
  // instance scoped to this injector.
  private readonly scopedInjector = createEnvironmentInjector(
    [
      provideRuntimeI18n({
        defaultLang: 'en',
        supported: [...ORDER],
        fetchCatalog: (lang) => Promise.resolve(CATALOG[lang as (typeof ORDER)[number]]),
      }),
      { provide: RUNTIME_I18N_CATALOGS, useValue: new Map(Object.entries(CATALOG)) },
      I18nService,
    ],
    inject(EnvironmentInjector)
  );

  protected readonly i18n = this.scopedInjector.get(I18nService);
  protected paused = false;

  protected readonly accentClass = computed(() => ACCENT_CLASS[this.i18n.lang() as (typeof ORDER)[number]]);

  constructor() {
    this.destroyRef.onDestroy(() => this.scopedInjector.destroy());

    // Browser-only: `matchMedia` doesn't exist during SSR/prerendering, and starting a
    // recurring `setInterval` on the server would keep the cycle running (and the
    // prerender process potentially alive) for a demo animation that only makes sense
    // client-side. `afterNextRender` guarantees this never executes on the server.
    afterNextRender(() => {
      // jsdom (this repo's unit test environment) doesn't implement `matchMedia` unless a
      // test explicitly stubs it, so guard with `typeof` rather than assuming it exists.
      const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reducedMotion) return;

      let index = 0;
      const interval = setInterval(() => {
        if (this.paused) return;
        index = (index + 1) % ORDER.length;
        void this.i18n.setLang(ORDER[index]);
      }, 2200);

      this.destroyRef.onDestroy(() => clearInterval(interval));
    });
  }
}

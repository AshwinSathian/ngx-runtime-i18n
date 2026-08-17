import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  EnvironmentInjector,
  afterNextRender,
  computed,
  createEnvironmentInjector,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { I18nService, provideRuntimeI18n, RUNTIME_I18N_CATALOGS } from '@ngx-runtime-i18n/angular';
import type { Catalog } from '@ngx-runtime-i18n/core';

const ORDER = ['en', 'hi', 'de'] as const;
const ACCENT_CLASS: Record<(typeof ORDER)[number], string> = {
  en: 'text-accent-en',
  hi: 'text-accent-hi',
  de: 'text-accent-de',
};

// Plain lookup (not `Catalog`, which is a `Record<string, unknown>`) so the measurer
// below can read each word back out with a real `string` type instead of casting.
const AUDIENCE_WORDS: Record<(typeof ORDER)[number], string> = {
  en: 'everyone',
  hi: 'सभी',
  de: 'alle',
};

const CATALOG: Record<(typeof ORDER)[number], Catalog> = {
  en: { hero: { audience: AUDIENCE_WORDS.en } },
  hi: { hero: { audience: AUDIENCE_WORDS.hi } },
  de: { hero: { audience: AUDIENCE_WORDS.de } },
};

@Component({
  selector: 'app-hero-lang-cycle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="font-display inline-block text-right align-bottom"
      [style.minWidth.px]="reservedWidth()"
      [class]="accentClass()"
      [attr.lang]="i18n.lang()"
      (mouseenter)="paused = true"
      (mouseleave)="paused = false"
      (focus)="paused = true"
      (blur)="paused = false"
    >{{ i18n.t('hero.audience') }}</span
    ><span
      #measurer
      class="font-display invisible pointer-events-none absolute left-0 top-0 whitespace-nowrap"
      aria-hidden="true"
    ></span>
  `,
})
export class HeroLangCycleComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly measurerRef = viewChild<ElementRef<HTMLSpanElement>>('measurer');

  // Reserves horizontal space for the widest of the three cycling words ("everyone" /
  // "सभी" / "alle") so swapping between them never changes how many lines the parent
  // `<h1>` wraps to. Without this, the word-width swing was large enough at narrow
  // (mobile) viewport widths to flip the heading between 2 and 3 lines every ~2.2s,
  // which was confirmed via Lighthouse + a live measurement to be the dominant source
  // of this page's 0.245 CLS score (the heading's line-count change pushed every
  // section below it up/down repeatedly). 0 (the initial value, and the SSR/prerender
  // value, since there's no real layout to measure there) means "no reservation yet" —
  // harmless, since it only widens the box, never narrows it below the visible word.
  protected readonly reservedWidth = signal(0);

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
      if (reducedMotion) return; // word never changes, so there's nothing to reserve space for

      this.measureReservedWidth();

      // Tailwind's `sm:` breakpoint changes the heading's font-size (text-4xl ->
      // text-5xl), which changes each word's rendered width, so the reservation needs
      // to be recomputed on resize, not just once at mount.
      let resizeTimeout: ReturnType<typeof setTimeout> | undefined;
      const onResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => this.measureReservedWidth(), 150);
      };
      window.addEventListener('resize', onResize);
      this.destroyRef.onDestroy(() => {
        clearTimeout(resizeTimeout);
        window.removeEventListener('resize', onResize);
      });

      // Re-measure once the real display font has finished loading. `font-display:
      // swap` means the first measurement above may have run against a fallback
      // font's metrics; re-measuring against Bricolage Grotesque's actual glyph
      // widths keeps the reservation accurate once it's the font actually on screen.
      if (typeof document !== 'undefined' && document.fonts) {
        document.fonts.ready.then(() => this.measureReservedWidth());
      }

      let index = 0;
      const interval = setInterval(() => {
        if (this.paused) return;
        index = (index + 1) % ORDER.length;
        void this.i18n.setLang(ORDER[index]);
      }, 2200);

      this.destroyRef.onDestroy(() => clearInterval(interval));
    });
  }

  // Renders each candidate word (invisibly, out of flow) into the hidden `#measurer`
  // span and reads back its rendered width, so the reservation always matches this
  // exact heading's real font/size/weight instead of an estimate computed elsewhere.
  private measureReservedWidth(): void {
    const measurer = this.measurerRef()?.nativeElement;
    if (!measurer) return;

    let max = 0;
    for (const lang of ORDER) {
      measurer.textContent = AUDIENCE_WORDS[lang];
      max = Math.max(max, measurer.offsetWidth);
    }
    // Don't leave the last-measured word sitting in the DOM: even though this node is
    // `aria-hidden` and visually hidden, leftover text is still findable by plain
    // text-content queries (Testing Library's `findByText`, browser "Find in page",
    // etc.), and could collide with the real cycling word.
    measurer.textContent = '';
    this.reservedWidth.set(max);
  }
}

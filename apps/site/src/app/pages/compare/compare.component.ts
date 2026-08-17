import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { KeyEyebrowComponent } from '../../shared/key-eyebrow/key-eyebrow.component';
import { SITE_URL } from '../../core/json-ld';
import {
  CompareRow,
  CompareTableComponent,
} from '../../shared/compare-table/compare-table.component';

// Research pass, verified 2026-08-17. Every cell below traces to one of:
// (a) this repo's own source (libs/runtime-i18n/src, libs/runtime-i18n-angular/src),
// (b) a live `npm view <pkg> version` check against the public registry run the same
//     day, or (c) a dated web search cited inline. No invented version numbers or
//     download counts. Re-run these checks before reusing this content verbatim in
//     the future — all four projects ship independently of this site.
//
// - ngx-runtime-i18n: signals (I18nService.lang/ready/switching), ordered fallback
//   chain (RuntimeI18nConfig.fallbacks: string[]), template-literal-typed
//   TranslationKey/TranslationParams, withI18nScope() for per-route catalogs,
//   TransferState-based SSR hydration, and the ICU-lite formatter all read directly
//   from libs/runtime-i18n/src/lib/types.ts, libs/runtime-i18n/src/lib/icu.ts,
//   libs/runtime-i18n-angular/src/lib/i18n.service.ts, and
//   libs/runtime-i18n-angular/src/lib/with-i18n-scope.ts.
// - @ngx-translate/core: verified 2026-08-17 at npm 18.0.0 (`npm view
//   @ngx-translate/core version`). v18 rebuilds the service on signals
//   (currentLang/fallbackLang/isLoading), removes defaultLang in favor of a single
//   fallbackLang, and adds provideChildTranslateService() for per-route/isolated
//   scopes — see https://ngx-translate.org/getting-started/migration-guide/ and
//   https://github.com/ngx-translate/core/releases. Plural support still needs the
//   separate `ngx-translate-messageformat-compiler` package (runtime eval-based),
//   confirmed in the migrating-from-ngx-translate recipe's own research pass.
// - @jsverse/transloco: verified 2026-08-17 at npm 8.4.0 (`npm view @jsverse/transloco
//   version`; the prior @ngneat/transloco scope is stalled at 6.0.4 and unmaintained).
//   translateSignal() adds a signal read on top of an RxJS-observable-first
//   TranslocoService (https://jsverse.gitbook.io/transloco/core-concepts/signals).
//   provideTranslocoScope() lazy-loads per feature/route
//   (https://jsverse.gitbook.io/transloco/advanced-features/lazy-load/scope-configuration).
//   ICU/plural support is the separate `@jsverse/transloco-messageformat` plugin, not
//   core. SSR has an official guide covering a custom synchronous loader plus a
//   baseUrl for Angular Universal (https://jsverse.gitbook.io/transloco/advanced-features/ssr-support).
//   Fallback accepts an array via a custom TranslocoFallbackStrategy, though open
//   GitHub issues note cases where later entries in the array get skipped
//   (https://github.com/jsverse/transloco/issues/574). No first-party compile-time
//   typed keys — the separate Keys Manager (TKM) CLI validates key usage instead of
//   the type checker.
// - Angular built-in i18n (@angular/localize): compile-time only — one build per
//   locale, no injectable service or signal, and no runtime catalog swap without
//   shipping a different build. Native ICU plural/select syntax in templates,
//   resolved at compile time. See https://angular.dev/cli/extract-i18n and
//   https://simplelocalize.io/blog/posts/angular-i18n-guide/, both current as of
//   this pass.
const ROWS: readonly CompareRow[] = [
  {
    feature: 'Signals-first state',
    ngxRuntimeI18n:
      'Yes — I18nService exposes lang, ready, and switching as signals from its first release',
    ngxTranslate:
      'Yes as of v18.0.0 (2026) — currentLang, fallbackLang, and the pipe rebuilt on signals',
    transloco:
      'Partial — translateSignal() added on top of an RxJS-observable-first TranslocoService',
    angularBuiltin:
      'No — compile-time template markers, no injectable service or signal',
  },
  {
    feature: 'SSR / hydration story',
    ngxRuntimeI18n:
      'TransferState-based SSR-to-client handoff; catalog work is deferred until app stability so hydration never mutates the DOM early',
    ngxTranslate:
      'Client-first; community guides describe wiring TransferState into a custom loader for Angular Universal, not a built-in SSR mode',
    transloco:
      'Official SSR guide describes a custom synchronous loader plus a baseUrl for Angular Universal',
    angularBuiltin:
      'N/A — no runtime catalog to hydrate; each locale is its own prerendered or server build',
  },
  {
    feature: 'Fallback chains',
    ngxRuntimeI18n:
      'Ordered array (fallbacks: string[]) tried in sequence before defaultLang',
    ngxTranslate:
      'Single fallbackLang only — defaultLang/defaultLanguage were removed in v18',
    transloco:
      'Array-based via a custom TranslocoFallbackStrategy; open issues note edge cases where later entries in the array get skipped',
    angularBuiltin:
      'None — an untranslated string falls back to the source-language literal at compile time',
  },
  {
    feature: 'Type-safe keys',
    ngxRuntimeI18n:
      'Yes — TranslationKey/TranslationParams are template-literal types inferred from the catalog shape, checked at compile time',
    ngxTranslate:
      'No built-in typing — third-party wrappers (generic base classes, community toolkits) add key safety on top',
    transloco:
      'No first-party compile-time typed keys — the separate Keys Manager (TKM) CLI validates key usage instead of the type checker',
    angularBuiltin:
      'N/A — $localize tagged template strings, no key-based lookup at all',
  },
  {
    feature: 'Per-route lazy catalogs',
    ngxRuntimeI18n:
      'Yes — withI18nScope() loads a route-scoped catalog on activation and unloads it on destroy',
    ngxTranslate:
      'Yes as of v18 — provideChildTranslateService() creates an isolated per-route/component child service with its own store',
    transloco:
      'Yes — provideTranslocoScope() lazy-loads a translation file per feature or route',
    angularBuiltin: 'No — one compiled bundle per locale, no per-route split',
  },
  {
    feature: 'ICU / plural support',
    ngxRuntimeI18n:
      'Built-in ICU-lite formatter ({count, plural, ...}) ships in @ngx-runtime-i18n/core, no extra package',
    ngxTranslate:
      'No native plural syntax — needs the separate ngx-translate-messageformat-compiler package (runtime eval-based)',
    transloco:
      'Yes via the official @jsverse/transloco-messageformat plugin, not bundled in core',
    angularBuiltin:
      'Yes — native ICU plural/select syntax in templates, resolved at compile time',
  },
  {
    feature: 'Build-time vs. runtime switching',
    ngxRuntimeI18n:
      'Runtime — fetchCatalog() loads a language on demand, no rebuild or reload needed to switch',
    ngxTranslate:
      'Runtime — a TranslateLoader fetches catalogs; language switches without a rebuild',
    transloco: 'Runtime — same loader-based model as ngx-translate',
    angularBuiltin:
      'Build-time — one compiled output per locale; switching languages means serving a different build',
  },
  {
    feature: 'npm package maturity',
    ngxRuntimeI18n:
      '6 packages at npm 2.1.0 (core, angular, primeng, material, schematics, cli), confirmed via npm view on 2026-08-17',
    ngxTranslate:
      '@ngx-translate/core at npm 18.0.0, confirmed via npm view on 2026-08-17',
    transloco:
      '@jsverse/transloco at npm 8.4.0, confirmed via npm view on 2026-08-17 (successor scope to the deprecated @ngneat/transloco, stalled at 6.0.4)',
    angularBuiltin:
      'Ships inside @angular/core and @angular/localize — no separate package to version',
  },
];

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [KeyEyebrowComponent, CompareTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-6xl px-4 py-16 sm:py-24">
      <app-key-eyebrow text="compare.matrix" />
      <h1 class="font-display text-3xl font-semibold sm:text-4xl">
        How ngx-runtime-i18n compares
      </h1>
      <p class="mt-4 max-w-2xl text-ink/80">
        This is the library author's own comparison against ngx-translate,
        transloco, and Angular's built-in i18n, so read it with that in mind.
        Each row is sourced from the compared library's own documentation,
        release notes, or source code, and cells carry a verification date where
        the underlying fact can change between releases.
      </p>
      <div class="mt-10">
        <app-compare-table [rows]="rows" />
      </div>
    </section>
  `,
})
export class CompareComponent implements OnInit {
  private readonly meta = inject(Meta);
  protected readonly rows = ROWS;

  ngOnInit(): void {
    // build-og-images.mjs generates a dedicated compare.png for this route (Task 21) —
    // without this override the page falls back to the root App component's site-wide
    // default (home.png, set in app.ts's own ngOnInit), same pattern as FaqComponent.
    this.meta.updateTag({
      property: 'og:image',
      content: `${SITE_URL}/og/compare.png`,
    });
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { KeyEyebrowComponent } from '../../shared/key-eyebrow/key-eyebrow.component';
import { FaqItemComponent } from '../../shared/faq-item/faq-item.component';
import { StructuredDataService } from '../../core/structured-data.service';
import { SeoService } from '../../core/seo.service';
import { SITE_URL, faqPageJsonLd } from '../../core/json-ld';

export interface Faq {
  readonly question: string;
  readonly answer: string;
  readonly link?: { readonly path: string; readonly label: string };
}

// Research pass, verified 2026-08-17 (source-code reads plus live `npm view` checks
// run the same day; see individual notes below). Re-run these checks before reusing
// this content verbatim in the future — the six packages ship independently of this
// site, and this exact page already found two stale claims elsewhere in the repo:
// `libs/runtime-i18n-material/README.md` still says "not yet published" although
// `npm view @ngx-runtime-i18n/material version` returns 2.1.0, and
// `libs/runtime-i18n/README.md` / the site's own icu-lite doc list `select` as
// unsupported although `libs/runtime-i18n/src/lib/icu.ts` (shipped in the published
// 2.0.1 and 2.1.0 tarballs, confirmed by unpacking `npm pack @ngx-runtime-i18n/core`)
// parses `select` and `selectordinal` blocks and exports `RUNTIME_I18N_PLURAL_RESOLVER`
// from both `@ngx-runtime-i18n/core` and `@ngx-runtime-i18n/angular`. This page answers
// from the verified current behavior instead of the stale prose.
export const FAQS: readonly Faq[] = [
  {
    question: "Does this replace Angular's built-in i18n?",
    answer:
      "No. Angular's built-in i18n (@angular/localize) compiles a separate build per locale from $localize-tagged strings and XLIFF/ARB translation files, resolved once at build time. ngx-runtime-i18n loads catalogs in the browser through a signals-based I18nService instead, so switching a language does not require a new build.",
    link: {
      path: '/compare',
      label:
        "Compare against ngx-translate, transloco, and Angular's built-in i18n",
    },
  },
  {
    question:
      'Is ICU-lite enough for complex plural rules like Arabic or Russian?',
    answer:
      "Not out of the box. The default plural resolver only distinguishes a one category (count equal to 1) from other, so Russian's three plural forms and Arabic's six are not produced automatically. formatIcu accepts an optional plural-resolver hook, a (count, locale) => PluralCategory function, so a catalog that needs CLDR-accurate categories has to supply one, typically backed by Intl.PluralRules. ICU-lite parses plural, select, and selectordinal blocks, but it stays a small formatter, not a full ICU MessageFormat implementation.",
    link: {
      path: '/docs/core-concepts/icu-lite',
      label: 'Read the ICU-lite core concepts page',
    },
  },
  {
    question: 'Does it work with server-side rendering?',
    answer:
      "Yes. provideRuntimeI18nSsr() seeds Angular's TransferState on the server with the same keys the client-side provideRuntimeI18n() reads, so the first client render matches the server-rendered markup and hydration does not re-fetch the catalog or mutate the DOM before the app is stable.",
    link: {
      path: '/recipes/ssr-with-express',
      label: 'Walk through the SSR with Express recipe',
    },
  },
  {
    question: 'Which Angular versions are supported?',
    answer:
      '@ngx-runtime-i18n/angular, @ngx-runtime-i18n/primeng, and @ngx-runtime-i18n/material each declare a peer dependency of "@angular/core": ">=16 <23", covering Angular 16 through 22 (re-verified against each package\'s published package.json on npm). @ngx-runtime-i18n/core has no Angular peer dependency at all, so it also runs in any TypeScript project.',
  },
  {
    question: 'Are all six packages published on npm?',
    answer:
      'Yes. @ngx-runtime-i18n/core, @ngx-runtime-i18n/angular, @ngx-runtime-i18n/primeng, @ngx-runtime-i18n/material, @ngx-runtime-i18n/schematics, and @ngx-runtime-i18n/cli are all published at version 2.1.0, confirmed with npm view against the public registry while writing this page.',
    link: { path: '/changelog', label: 'See the release history' },
  },
  {
    question: 'Can I lazy-load translations per route?',
    answer:
      "Yes. withI18nScope('name') in a route's providers array loads a route-scoped catalog on activation, through the same fetchCatalog function used for the global catalog with a third scope argument, and unloads it automatically via DestroyRef when the route is destroyed.",
    link: {
      path: '/recipes/route-scoped-catalogs',
      label: 'Read the route-scoped catalogs recipe',
    },
  },
  {
    question: 'Does switching languages reload the page?',
    answer:
      'No. I18nService.setLang() is asynchronous: it fetches the target catalog, cancels any in-flight fetch for a language the user has since navigated away from, and updates the lang signal once the fetch resolves. Every consumer reading that signal re-renders in place, with no location.reload() or full navigation involved.',
  },
  {
    question: 'Is there a way to validate catalogs in CI?',
    answer:
      'Yes. @ngx-runtime-i18n/cli ships an ngx-i18n check command that scans source for every translation key usage and validates one or more language catalogs against that usage, reporting missing and unused keys. Its --fail-on-missing and --fail-on-unused flags turn either condition into a nonzero exit code for a CI gate.',
    link: {
      path: '/recipes/ci-catalog-validation',
      label: 'Read the CI catalog validation recipe',
    },
  },
  {
    question: 'Does it work with PrimeNG or Angular Material?',
    answer:
      "Yes, as separate adapter packages. @ngx-runtime-i18n/primeng listens to I18nService.lang() and applies the matching translation object through PrimeNG's own config service (PrimeNG 17-21, every MIT-licensed release). @ngx-runtime-i18n/material keeps Angular Material's paginator, sort, stepper, and datepicker Intl services in sync with the same signal, with no page reload.",
    link: {
      path: '/docs/packages/primeng',
      label: 'Read the PrimeNG package docs',
    },
  },
  {
    question: 'What license is it released under?',
    answer: 'MIT, listed in the package.json of all six packages.',
  },
];

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [RouterLink, KeyEyebrowComponent, FaqItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <app-key-eyebrow text="faq.questions" />
      <h1 class="font-display text-3xl font-semibold sm:text-4xl">
        Frequently asked questions
      </h1>
      <p class="mt-4 text-ink/80">
        Each answer here traces to this repository's own source code,
        documentation, or a live npm registry check run while writing this page.
      </p>
      <div class="mt-10">
        @for (faq of faqs; track faq.question) {
          <app-faq-item [question]="faq.question">
            {{ faq.answer }}
            @if (faq.link) {
              <a
                [routerLink]="faq.link.path"
                class="mt-2 block text-accent-en underline underline-offset-2"
                >{{ faq.link.label }}</a
              >
            }
          </app-faq-item>
        }
      </div>
    </section>
  `,
})
export class FaqComponent implements OnInit {
  private readonly structuredData = inject(StructuredDataService);
  private readonly seo = inject(SeoService);
  protected readonly faqs = FAQS;

  ngOnInit(): void {
    // `setPageMeta()` clears every page-scoped JSON-LD tag as its first action (see
    // `StructuredDataService.clearPageScoped()`), so it has to run BEFORE this
    // component sets its own `ld-faq` below — calling it after would wipe out the tag
    // this same `ngOnInit` just set.
    this.seo.setPageMeta({
      title: 'Frequently asked questions',
      description:
        'Answers on SSR support, ICU-lite plural rules, Angular version compatibility, and npm publish status for all six ngx-runtime-i18n packages.',
      path: '/faq',
      // build-og-images.mjs generates a dedicated faq.png for this route — without
      // this override the page would fall back to `SeoService`'s site-wide default
      // (home.png).
      image: `${SITE_URL}/og/faq.png`,
    });
    // Built directly from the same `FAQS` array the template above renders (`@for (faq
    // of faqs; ...`) — never a hand-duplicated copy, so the JSON-LD can't drift from
    // what's actually on the page.
    this.structuredData.set('ld-faq', faqPageJsonLd(this.faqs));
  }
}

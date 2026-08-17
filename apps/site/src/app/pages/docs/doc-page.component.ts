import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { ContentService } from '../../core/content.service';
import { StructuredDataService } from '../../core/structured-data.service';
import { SeoService } from '../../core/seo.service';
import {
  SITE_URL,
  breadcrumbJsonLd,
  softwareApplicationJsonLd,
  type BreadcrumbItem,
} from '../../core/json-ld';
import { KeyEyebrowComponent } from '../../shared/key-eyebrow/key-eyebrow.component';
import { TocComponent } from '../../shared/toc/toc.component';
import type { DocEntry } from '../../core/content.types';

@Component({
  selector: 'app-doc-page',
  standalone: true,
  imports: [KeyEyebrowComponent, TocComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (doc(); as d) {
      <div class="flex gap-8">
        <article class="min-w-0 flex-1">
          <app-key-eyebrow [text]="d.frontmatter.eyebrow" />
          <h1 class="font-display text-3xl font-semibold">
            {{ d.frontmatter.title }}
          </h1>
          <p class="mt-2 text-ink/70">{{ d.frontmatter.description }}</p>
          <div
            class="prose prose-neutral mt-8 max-w-none dark:prose-invert"
            [innerHTML]="html()"
          ></div>
        </article>
        <aside class="hidden w-48 shrink-0 lg:block">
          <app-toc [headings]="d.headings" />
        </aside>
      </div>
    }
  `,
})
export class DocPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly content = inject(ContentService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly structuredData = inject(StructuredDataService);
  private readonly seo = inject(SeoService);

  // This component is matched via a `**` wildcard route under `/docs`, so there is no
  // named `:slug` route param to read from `paramMap` — the router doesn't parse params
  // out of a wildcard segment. The matched URL segments (one for `getting-started`, two
  // for `core-concepts/*`/`packages/*` docs) come from `route.url` — an Observable, not
  // just `route.snapshot.url` — because every doc page matches this same `docs/**`
  // route config, so Angular's default `RouteReuseStrategy` reuses this component
  // instance across doc-to-doc navigations rather than destroying and recreating it. A
  // one-time snapshot read (the previous implementation, via `ngOnInit`) only ever sees
  // the FIRST doc's URL segments; `route.url` re-emits on every subsequent navigation
  // that reuses this instance, which is what `toSignal` below turns back into a signal
  // this component's `doc`/`html`/SEO effect can react to.
  private readonly slug = toSignal(
    this.route.url.pipe(map((segments) => segments.map((s) => s.path))),
    { initialValue: this.route.snapshot.url.map((s) => s.path) },
  );

  protected readonly doc = computed<DocEntry | null>(() =>
    this.content.getDocBySlug(this.slug()),
  );

  // Angular's default `[innerHTML]` sanitizer strips unknown custom-element tags
  // (`<content-callout>`, `<content-code-block>`, `<content-tabs>`) down to their
  // children, and strips the `style` attributes rehype-pretty-code/Shiki use for
  // per-token dual-theme syntax-highlighting colors — verified empirically via a
  // failing test before this fix (both the wrapper tags and all `style` attributes
  // were gone from the rendered DOM). This content is compiled at build time from our
  // own trusted Markdown, never user input, so bypassing sanitization is safe here.
  protected readonly html = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.doc()?.html ?? ''),
  );

  constructor() {
    // An `effect()` keyed off the reactive `doc()`/`slug()` signals, not a one-time
    // `ngOnInit` side effect — this is what makes the SEO/JSON-LD side effects below
    // re-run on every doc-to-doc client-side navigation, not just this component's
    // first mount (see `slug` above for why a plain `ngOnInit` read goes stale).
    effect(() => {
      const doc = this.doc();
      const slug = this.slug();
      if (doc == null) return;

      const pageUrl = `/docs/${slug.join('/')}`;
      const isPackagePage = slug[0] === 'packages';

      // Reuses the doc's own frontmatter rather than writing separate SEO copy — the
      // same single-source-of-truth pattern the page body above already follows for its
      // own `<h1>`/description paragraph, so the two can't drift apart. Called FIRST
      // (before this effect sets its own `ld-software`/`ld-breadcrumb` below) because
      // `SeoService.setPageMeta()` clears every page-scoped JSON-LD tag as its first
      // action (see `StructuredDataService.clearPageScoped()`) — calling it after would
      // wipe out the very tags this same effect run just set.
      this.seo.setPageMeta({
        title: doc.frontmatter.title,
        description: doc.frontmatter.description,
        path: pageUrl,
        image: isPackagePage
          ? `${SITE_URL}/og/packages-${slug[1]}.png`
          : undefined,
      });

      // Package pages (`/docs/packages/<pkg>`) describe a published npm package, so
      // they additionally emit `SoftwareApplication` JSON-LD alongside the breadcrumb
      // every doc page gets below.
      if (isPackagePage) {
        this.structuredData.set(
          'ld-software',
          softwareApplicationJsonLd({
            name: '@ngx-runtime-i18n/' + slug[1],
            description: doc.frontmatter.description,
            url: `${SITE_URL}${pageUrl}`,
          }),
        );
      }

      const crumbs: BreadcrumbItem[] = [
        { name: 'Home', url: `${SITE_URL}/` },
        { name: 'Docs', url: `${SITE_URL}/docs` },
      ];
      // Two-segment slugs (`core-concepts/*`, `packages/*`) get an extra crumb for
      // their section, matching the sidebar's own grouping (`frontmatter.section`) —
      // there's no dedicated section index route, so it links back to the docs index.
      if (slug.length > 1) {
        crumbs.push({ name: doc.frontmatter.section, url: `${SITE_URL}/docs` });
      }
      crumbs.push({ name: doc.frontmatter.title, url: `${SITE_URL}${pageUrl}` });
      this.structuredData.set('ld-breadcrumb', breadcrumbJsonLd(crumbs));
    });
  }
}

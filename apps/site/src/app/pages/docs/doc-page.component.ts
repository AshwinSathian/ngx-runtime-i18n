import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, Meta, type SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
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
export class DocPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly content = inject(ContentService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly structuredData = inject(StructuredDataService);
  private readonly meta = inject(Meta);
  private readonly seo = inject(SeoService);
  protected readonly doc = signal<DocEntry | null>(null);
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

  ngOnInit(): void {
    // This component is matched via a `**` wildcard route under `/docs`, so there is
    // no named `:slug` route param to read from `paramMap` — the router doesn't parse
    // params out of a wildcard segment. The matched URL segments (one for
    // `getting-started`, two once `core-concepts/*`/`packages/*` docs exist) are
    // available on the route snapshot's `url` (a `UrlSegment[]`) instead.
    const slug = this.route.snapshot.url.map((segment) => segment.path);
    const doc = this.content.getDocBySlug(slug);
    this.doc.set(doc);
    if (doc == null) return;

    // Reuses the doc's own frontmatter rather than writing separate SEO copy — the same
    // single-source-of-truth pattern the page body above already follows for its own
    // `<h1>`/description paragraph, so the two can't drift apart.
    this.seo.setPageMeta({
      title: doc.frontmatter.title,
      description: doc.frontmatter.description,
    });

    const pageUrl = `${SITE_URL}/docs/${slug.join('/')}`;

    // Package pages (`/docs/packages/<pkg>`) describe a published npm package, so they
    // additionally emit `SoftwareApplication` JSON-LD alongside the breadcrumb every
    // doc page gets below.
    if (slug[0] === 'packages') {
      this.structuredData.set(
        'ld-software',
        softwareApplicationJsonLd({
          name: '@ngx-runtime-i18n/' + slug[1],
          description: doc.frontmatter.description,
          url: pageUrl,
        }),
      );
      this.meta.updateTag({
        property: 'og:image',
        content: `${SITE_URL}/og/packages-${slug[1]}.png`,
      });
    }

    const crumbs: BreadcrumbItem[] = [
      { name: 'Home', url: `${SITE_URL}/` },
      { name: 'Docs', url: `${SITE_URL}/docs` },
    ];
    // Two-segment slugs (`core-concepts/*`, `packages/*`) get an extra crumb for their
    // section, matching the sidebar's own grouping (`frontmatter.section`) — there's no
    // dedicated section index route, so it links back to the docs index.
    if (slug.length > 1) {
      crumbs.push({ name: doc.frontmatter.section, url: `${SITE_URL}/docs` });
    }
    crumbs.push({ name: doc.frontmatter.title, url: pageUrl });
    this.structuredData.set('ld-breadcrumb', breadcrumbJsonLd(crumbs));
  }
}

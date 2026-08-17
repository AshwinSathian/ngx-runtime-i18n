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
  articleJsonLd,
  breadcrumbJsonLd,
  type BreadcrumbItem,
} from '../../core/json-ld';
import { KeyEyebrowComponent } from '../../shared/key-eyebrow/key-eyebrow.component';
import { TocComponent } from '../../shared/toc/toc.component';
import type { RecipeEntry } from '../../core/content.types';

@Component({
  selector: 'app-recipe-page',
  standalone: true,
  imports: [KeyEyebrowComponent, TocComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (recipe(); as r) {
      <div class="flex gap-8">
        <article class="min-w-0 flex-1">
          <app-key-eyebrow [text]="r.frontmatter.eyebrow" />
          <h1 class="font-display text-3xl font-semibold">
            {{ r.frontmatter.title }}
          </h1>
          <p class="mt-2 text-ink/70">{{ r.frontmatter.description }}</p>
          <ul class="mt-4 flex flex-wrap gap-2">
            @for (pkg of r.frontmatter.packages; track pkg) {
              <li
                class="rounded-full border border-rule px-2 py-0.5 font-mono text-xs text-ink/70"
              >
                {{ pkg }}
              </li>
            }
          </ul>
          <div
            class="prose prose-neutral mt-8 max-w-none dark:prose-invert"
            [innerHTML]="html()"
          ></div>
        </article>
        <aside class="hidden w-48 shrink-0 lg:block">
          <app-toc [headings]="r.headings" />
        </aside>
      </div>
    }
  `,
})
export class RecipePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly content = inject(ContentService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly structuredData = inject(StructuredDataService);
  private readonly seo = inject(SeoService);

  // Unlike DocPageComponent, which is matched via a `**` wildcard under `/docs`,
  // recipes use a real named `:slug` route param (single-segment slugs only), so it's
  // read from `paramMap` rather than reconstructed from URL segments. Read from the
  // Observable `route.paramMap`, not just `route.snapshot.paramMap` — every recipe page
  // matches the same `recipes/:slug` route config, so Angular's default
  // `RouteReuseStrategy` reuses this component instance across recipe-to-recipe
  // navigations instead of destroying and recreating it, and a one-time snapshot read
  // (the previous implementation, via `ngOnInit`) would only ever see the FIRST
  // recipe's slug on later navigations.
  private readonly slug = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('slug') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('slug') ?? '' },
  );

  protected readonly recipe = computed<RecipeEntry | null>(() =>
    this.content.getRecipeBySlug(this.slug()),
  );

  // See DocPageComponent for the empirically-verified reason this bypasses Angular's
  // default `[innerHTML]` sanitizer: it strips `<content-callout>`/`<content-tabs>`/
  // `<content-code-block>` tags down to their children, and strips the `style`
  // attributes Shiki uses for per-token dual-theme syntax-highlighting colors. This
  // content is compiled at build time from our own trusted Markdown, never user
  // input, so bypassing sanitization is safe here.
  protected readonly html = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.recipe()?.html ?? ''),
  );

  constructor() {
    // An `effect()` keyed off the reactive `recipe()`/`slug()` signals, not a one-time
    // `ngOnInit` side effect — see DocPageComponent for the full rationale (this is the
    // same route-config-reuse fix, applied to recipes' named `:slug` param instead of
    // docs' wildcard URL segments).
    effect(() => {
      const recipe = this.recipe();
      const slug = this.slug();

      // Every in-app link is generated from the content manifest, so this only fires on
      // a broken/stale external link or a bad browser-history entry — but since this
      // component is now reactive across client-side navigations (see `slug` above), a
      // navigation THROUGH this branch would otherwise leave the *previous* page's
      // title, canonical link, OG tags, and JSON-LD sitting in the DOM. `setPageMeta()`
      // clears page-scoped JSON-LD as its first action, so calling it here — even
      // though this route has no content to show — prevents that staleness.
      if (recipe == null) {
        this.seo.setPageMeta({
          title: 'Page not found',
          description: "The page you're looking for doesn't exist. Try the docs, or search with Cmd+K.",
          path: `/recipes/${slug}`,
        });
        this.seo.setNoIndex();
        return;
      }

      const pageUrl = `/recipes/${slug}`;

      // Reuses the recipe's own frontmatter rather than writing separate SEO copy —
      // same single-source-of-truth reasoning as `DocPageComponent`. Called FIRST
      // (before this effect sets its own `ld-breadcrumb`/`ld-article` below) because
      // `SeoService.setPageMeta()` clears every page-scoped JSON-LD tag as its first
      // action — calling it after would wipe out the tags this same effect run just
      // set.
      this.seo.setPageMeta({
        title: recipe.frontmatter.title,
        description: recipe.frontmatter.description,
        path: pageUrl,
        // Recipes are how-to walkthroughs (a title, description, and prose body under
        // a single author), which is a reasonable fit for OG `article` — unlike most
        // of the site's other pages, which describe a product/comparison rather than
        // an authored piece of writing.
        type: 'article',
      });

      const absoluteUrl = `${SITE_URL}${pageUrl}`;
      const crumbs: BreadcrumbItem[] = [
        { name: 'Home', url: `${SITE_URL}/` },
        { name: 'Recipes', url: `${SITE_URL}/recipes` },
        { name: recipe.frontmatter.title, url: absoluteUrl },
      ];
      this.structuredData.set('ld-breadcrumb', breadcrumbJsonLd(crumbs));
      // Recipes are how-to walkthroughs (a title, description, and prose body under a
      // single author), which is a reasonable fit for schema.org `Article` — unlike doc
      // pages, which describe a package/API rather than an authored piece of writing.
      this.structuredData.set(
        'ld-article',
        articleJsonLd({
          title: recipe.frontmatter.title,
          description: recipe.frontmatter.description,
          url: absoluteUrl,
        }),
      );
    });
  }
}

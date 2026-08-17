import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SITE_URL } from './json-ld';
import { StructuredDataService } from './structured-data.service';

// `Title`/`Meta` are standard `platform-browser` services — like `StructuredDataService`'s
// `DOCUMENT` injection (see that file's comment), they resolve to Angular's server-side DOM
// implementation during SSR/prerendering and to the real `document` in the browser, so a
// `setTitle`/`updateTag` call made from a component's `ngOnInit` lands in the prerendered
// static HTML's `<title>`/`<meta name="description">` tags, not just in a post-hydration
// client-side mutation. Verified empirically against a real production build (see this
// task's report).
const TITLE_SUFFIX = ' — ngx-runtime-i18n';

// Falls back to the site-wide OG image for any page that doesn't have a dedicated one
// (`build-og-images.mjs` only renders package docs, `/compare`, `/faq`, and the home
// page itself) — see `og/home.png`.
const DEFAULT_OG_IMAGE = `${SITE_URL}/og/home.png`;

export interface PageMeta {
  readonly title: string;
  readonly description: string;
  // The route's absolute path as the app router sees it, e.g. `/faq`,
  // `/docs/getting-started`, or `/` for the home page — used to derive both the
  // canonical URL and `og:url`. Real absolute path, not a relative fragment.
  readonly path: string;
  // Every page's `<title>` follows "<page-specific title> — ngx-runtime-i18n" except the
  // home page, which IS the root brand page and would read as redundant with the suffix
  // appended a second time. Pass `suffix: false` there only.
  readonly suffix?: boolean;
  // Absolute OG image URL. Defaults to the site-wide `og/home.png` when the page has no
  // dedicated image; pages with one (package docs, `/compare`, `/faq`) pass it explicitly.
  readonly image?: string;
  // `article` fits a single-author, single-subject page (recipes); everything else is
  // `website`. Defaults to `website`.
  readonly type?: 'website' | 'article';
}

// Non-root routes 308-redirect to a trailing-slash URL on the live host (verified against
// production — `/docs/getting-started` → `/docs/getting-started/`), so the canonical/`og:url`
// value has to be the post-redirect form, not the pre-redirect one, for the signal to be
// meaningful. `/` is the one route with no further slash to add.
function canonicalUrlFor(path: string): string {
  if (path === '/') return `${SITE_URL}/`;
  const withTrailingSlash = path.endsWith('/') ? path : `${path}/`;
  return `${SITE_URL}${withTrailingSlash}`;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly structuredData = inject(StructuredDataService);

  setPageMeta({
    title,
    description,
    path,
    suffix = true,
    image = DEFAULT_OG_IMAGE,
    type = 'website',
  }: PageMeta): void {
    // Every page component calls `setPageMeta()` exactly once per load/navigation
    // (including the client-side navigations between docs/recipes that reuse a
    // route-config-matched component instance), so this is the one place a
    // page-scoped JSON-LD clear is guaranteed to run before a page sets its own —
    // see `StructuredDataService.clearPageScoped()`.
    this.structuredData.clearPageScoped();

    const pageTitle = suffix ? `${title}${TITLE_SUFFIX}` : title;
    this.titleService.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });

    const canonicalUrl = canonicalUrlFor(path);
    this.setCanonicalLink(canonicalUrl);

    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.meta.updateTag({ property: 'og:type', content: type });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
  }

  // Standard practice for pages that should never appear in search results — the wildcard
  // 404 route is the only place this site uses it, so it's kept separate from
  // `setPageMeta` rather than folded into it as another flag every real page would have to
  // remember to omit.
  setNoIndex(): void {
    this.meta.updateTag({ name: 'robots', content: 'noindex' });
  }

  private setCanonicalLink(url: string): void {
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (link == null) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}

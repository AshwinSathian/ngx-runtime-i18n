import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

// `Title`/`Meta` are standard `platform-browser` services — like `StructuredDataService`'s
// `DOCUMENT` injection (see that file's comment), they resolve to Angular's server-side DOM
// implementation during SSR/prerendering and to the real `document` in the browser, so a
// `setTitle`/`updateTag` call made from a component's `ngOnInit` lands in the prerendered
// static HTML's `<title>`/`<meta name="description">` tags, not just in a post-hydration
// client-side mutation. Verified empirically against a real production build (see this
// task's report).
const TITLE_SUFFIX = ' — ngx-runtime-i18n';

export interface PageMeta {
  readonly title: string;
  readonly description: string;
  // Every page's `<title>` follows "<page-specific title> — ngx-runtime-i18n" except the
  // home page, which IS the root brand page and would read as redundant with the suffix
  // appended a second time. Pass `suffix: false` there only.
  readonly suffix?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);

  setPageMeta({ title, description, suffix = true }: PageMeta): void {
    this.titleService.setTitle(suffix ? `${title}${TITLE_SUFFIX}` : title);
    this.meta.updateTag({ name: 'description', content: description });
  }

  // Standard practice for pages that should never appear in search results — the wildcard
  // 404 route is the only place this site uses it, so it's kept separate from
  // `setPageMeta` rather than folded into it as another flag every real page would have to
  // remember to omit.
  setNoIndex(): void {
    this.meta.updateTag({ name: 'robots', content: 'noindex' });
  }
}

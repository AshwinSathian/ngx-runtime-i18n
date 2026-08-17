import { DOCUMENT, Injectable, inject } from '@angular/core';

// `DOCUMENT` (not the global `document`) resolves to Angular's server-side DOM
// implementation during SSR/prerendering and to the real `document` in the browser,
// so this same code path works identically in both — appended `<script>` tags land in
// the prerendered static HTML, not just in a post-hydration client-side DOM mutation.
// Verified empirically against a real production build (Task 21 report).
//
// `ld-website`/`ld-person` are set exactly once, from the root `App` component's
// `ngOnInit`, which — unlike a routed page component — only ever runs once per app
// bootstrap, not once per client-side navigation. They describe the site itself, not
// the current page, so `clearPageScoped()` below deliberately never removes them.
const SITE_WIDE_IDS: ReadonlySet<string> = new Set(['ld-website', 'ld-person']);

@Injectable({ providedIn: 'root' })
export class StructuredDataService {
  private readonly document = inject(DOCUMENT);

  set(id: string, data: Record<string, unknown>): void {
    this.document.getElementById(id)?.remove();
    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    script.textContent = JSON.stringify(data);
    this.document.head.appendChild(script);
  }

  // Removes every page-scoped `ld-*` `<script>` tag (breadcrumb, software-application,
  // article, FAQ, ...) currently in `<head>`, without touching the site-wide
  // `ld-website`/`ld-person` tags. `SeoService.setPageMeta()` calls this at the start of
  // every single page's meta update, which — since every page already calls
  // `setPageMeta()` exactly once per load/navigation — guarantees a page that doesn't
  // set its own structured data (e.g. `/faq`) never keeps showing JSON-LD left over from
  // whatever page was open before it, including across the client-side navigations that
  // reuse a route-config-matched component instance (docs/recipes) rather than
  // destroying and recreating it.
  clearPageScoped(): void {
    this.document.querySelectorAll('script[id^="ld-"]').forEach((el) => {
      if (!SITE_WIDE_IDS.has(el.id)) el.remove();
    });
  }
}

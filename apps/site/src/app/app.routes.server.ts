import { inject } from '@angular/core';
import { RenderMode, ServerRoute } from '@angular/ssr';
import { ContentService } from './core/content.service';

export const serverRoutes: ServerRoute[] = [
  {
    // /docs index page.
    path: 'docs',
    renderMode: RenderMode.Prerender,
  },
  {
    // The Angular client router matches every doc page (`/docs/getting-started` today,
    // `/docs/core-concepts/fallback-chains`-shaped two-segment docs once Task 13/14 add
    // them) with a single `**` wildcard route nested under `docs` (see app.routes.ts).
    // A server route's dynamic segments must match the client router's actual route
    // config to be prerenderable, so this has to be `docs/**` too — `docs/:slug` or
    // `docs/:section/:slug` fail at build time with "does not match any routes defined
    // in the Angular routing configuration" because no such named-param route exists
    // client-side. For a `**` route, Angular's prerenderer expects `getPrerenderParams`
    // to return the full remaining path (all segments joined by `/`) under a literal
    // `'**'` key — see https://angular.dev/guide/ssr#configuring-parameterized-routes-for-prerendering.
    path: 'docs/**',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const content = inject(ContentService);
      return content.getAllDocs().map((d) => ({ '**': d.slug.join('/') }));
    },
  },
  {
    // Recipes use single-segment slugs and the client route declares a real named
    // `:slug` param (see app.routes.ts), unlike docs' `**` wildcard — so this can
    // match it directly instead of needing the `docs/**` workaround above.
    path: 'recipes/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const content = inject(ContentService);
      return content.getAllRecipes().map((r) => ({ slug: r.slug }));
    },
  },
  {
    // The client router's own top-level `**` wildcard (see app.routes.ts) renders
    // NotFoundComponent for any path that doesn't match a route above — but a bare
    // `RenderMode.Prerender` entry with no `getPrerenderParams` has no concrete URL to
    // write output for and is silently skipped (verified empirically: a build with no
    // `getPrerenderParams` here produced exactly the routes enumerated by the other
    // entries and zero output for this one, no error or warning either way).
    // `getPrerenderParams` below gives it one concrete path, `/404`, so the build emits
    // a real prerendered `NotFoundComponent` document (at `404/index.html`, matching
    // this app's directory-per-route output convention — see `compare/index.html`,
    // `changelog/index.html`, etc.) that also happens to be reachable by visiting `/404`
    // directly. Static hosts that auto-detect a not-found page from a root-level
    // `404.html` file (e.g. Cloudflare Pages) need that exact document copied to the
    // output root as a flat file, which isn't something a route-based prerenderer can
    // produce directly (every other prerendered route is deliberately a directory +
    // `index.html` so it serves at a clean, slash-terminated URL) — see
    // `apps/site/scripts/copy-404.mjs` and the `copy-404` Nx target, wired into the
    // deploy step in Task 26 rather than the default `build` target, since routine
    // `nx serve`/`nx build` runs (dev iteration, unit/E2E tests) don't need it and this
    // avoids touching the `serve`/`serve-static` targets' existing `buildTarget`
    // wiring.
    path: '**',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return [{ '**': '404' }];
    },
  },
];

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
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];

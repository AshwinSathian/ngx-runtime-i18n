import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    // Server, not Prerender: the language is picked per request (?lang, cookie,
    // Accept-Language), so the HTML can't be built once at build time.
    renderMode: RenderMode.Server,
  },
];

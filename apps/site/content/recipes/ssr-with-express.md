---
title: SSR with Express
description: Wire provideRuntimeI18nSsr() into an Express + Angular SSR server so the first response already carries the right catalog.
eyebrow: recipes.ssr-with-express
order: 1
packages: ['@ngx-runtime-i18n/angular']
---

This recipe walks through `apps/demo-ssr` in the repo, a complete Express + Angular SSR server that reads catalog JSON on each request and seeds TransferState before the response goes out. Run it locally with:

```bash
nx serve demo-ssr                              # dev server, http://localhost:4200
nx build demo-ssr && node dist/apps/demo-ssr/server/server.mjs   # production build, http://localhost:4000
```

## Reading catalogs from the built output

Catalogs are static assets under `apps/demo-ssr/public/i18n/<lang>.json`, so once the app is built they land in `dist/browser/i18n`. The server reads them straight off disk per request:

```ts
// server.ts
const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const i18nDir = join(browserDistFolder, 'i18n'); // catalogs live in dist/browser/i18n

function readCatalogSafe(lang: string): Catalog | undefined {
  try {
    const p = join(i18nDir, `${lang}.json`);
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return undefined;
  }
}
```

## Building a snapshot per request

Pick a language from the query string, a cookie, or the `Accept-Language` header, then read that catalog plus `en` and the configured fallbacks into a `RuntimeI18nSsrSnapshot`:

```ts
function buildSnapshot(req: Request): RuntimeI18nSsrSnapshot {
  const supported = ['en', 'hi', 'de'];
  const fallbacks = ['de'];
  const lang = pickLang(req, supported, 'en');

  const catalogs: Record<string, Catalog> = {};
  const en = readCatalogSafe('en');
  if (en) catalogs['en'] = en;
  if (lang !== 'en') {
    const cur = readCatalogSafe(lang);
    if (cur) catalogs[lang] = cur;
  }
  for (const fb of fallbacks) {
    if (fb === 'en' || fb === lang) continue;
    const snap = readCatalogSafe(fb);
    if (snap) catalogs[fb] = snap;
  }

  const bootstrap = catalogs[lang] ?? catalogs['en'] ?? ({} as Catalog);
  return { lang, catalogs, bootstrap };
}
```

`bootstrap` holds the active language's catalog; `catalogs` seeds any additional locales the client might need without an extra fetch.

## Getting the snapshot into the app

`AngularNodeAppEngine.handle(request, requestContext)` takes a request context as its second argument, not providers. Whatever you pass there shows up inside the app as Angular's `REQUEST_CONTEXT` token. So the server passes the snapshot as the context:

```ts
// server.ts
app.use((req, res, next) => {
  angularApp
    .handle(req, buildSnapshot(req)) // the second argument becomes REQUEST_CONTEXT
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});
```

Register the handler with no path. Angular 22 projects ship Express 5, whose router throws `Missing parameter name` at start-up for an unnamed wildcard like `'/**'` or `'*'`, and a path-less `app.use()` already matches every request.

Then the server config reads it back. `provideRuntimeI18nSsr()` accepts a factory, which runs in an injection context, so it can `inject(REQUEST_CONTEXT)`:

```ts
// app.config.server.ts
import { inject, mergeApplicationConfig, REQUEST_CONTEXT, type ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { provideRuntimeI18nSsr, type RuntimeI18nSsrSnapshot } from '@ngx-runtime-i18n/angular';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    provideRuntimeI18nSsr(
      () => inject(REQUEST_CONTEXT, { optional: true }) as RuntimeI18nSsrSnapshot | null
    ),
  ],
};
```

During prerendering there's no request, so `REQUEST_CONTEXT` is `null`. The factory returns nothing, nothing is seeded, and the client loads catalogs as usual.

<content-callout data-type="warning">

Before 3.0, this recipe passed `{ providers: [...] }` as the second argument to `handle()`. That's the old `CommonEngine` API. `AngularNodeAppEngine` treats it as an opaque context and ignores it, so the snapshot never reached the app. If your server still does that, switch to the pattern above.

</content-callout>

The routes that use a per-request language have to render on the server, not at build time. A prerendered page is built once, before any request exists, so it can't follow `?lang`, a cookie or `Accept-Language`:

```ts
// app.routes.server.ts
export const serverRoutes: ServerRoute[] = [{ path: '**', renderMode: RenderMode.Server }];
```

`provideRuntimeI18nSsr()` returns `EnvironmentProviders`, an opaque value, so put it straight into `providers`. Don't spread it.

## Hydrating on the client

Use the same `provideRuntimeI18n(...)` configuration in `app.config.ts` and `app.config.server.ts`. On boot, the client reads TransferState first and only calls `fetchCatalog` for languages the server didn't already seed, so hydration produces no visible flash or mismatch.

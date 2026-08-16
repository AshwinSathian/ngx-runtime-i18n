---
title: SSR with Express
description: Wire provideRuntimeI18nSsr() into an Express + Angular SSR server so the first response already carries the right catalog.
eyebrow: recipes.ssr-with-express
order: 1
packages: ['@ngx-runtime-i18n/angular']
---

This recipe walks through `apps/demo-ssr` in the repo, a complete Express + Angular SSR server that reads catalog JSON on each request and seeds TransferState before the response goes out. Run it locally with:

```bash
nx build demo-ssr
nx serve demo-ssr   # http://localhost:4000
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

## Seeding TransferState

`provideRuntimeI18nSsr()` seeds TransferState with the same keys `provideRuntimeI18n()` reads on the client. Wrap it in a small helper:

```ts
// i18n.server.providers.ts
import { EnvironmentProviders } from '@angular/core';
import { RuntimeI18nSsrSnapshot, provideRuntimeI18nSsr } from '@ngx-runtime-i18n/angular';

export function i18nServerProviders(snapshot: RuntimeI18nSsrSnapshot): EnvironmentProviders {
  return provideRuntimeI18nSsr(snapshot);
}
```

<content-callout data-type="tip">

`provideRuntimeI18nSsr()` returns `EnvironmentProviders`, an opaque value, not an array (this changed in v2.1.0 when the package moved off `APP_INITIALIZER` to `provideEnvironmentInitializer()`). Put the result directly in a `providers` array — spreading it (`...provideRuntimeI18nSsr(...)`) no longer works.

</content-callout>

Pass the snapshot into `AngularNodeAppEngine.handle()` for every request:

```ts
app.use('/**', (req, res, next) => {
  const snapshot = buildSnapshot(req);
  angularApp
    .handle(req, { providers: [i18nServerProviders(snapshot)] })
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});
```

## Hydrating on the client

Use the same `provideRuntimeI18n(...)` configuration in `app.config.ts` and `app.config.server.ts`. On boot, the client reads TransferState first and only calls `fetchCatalog` for languages the server didn't already seed, so hydration produces no visible flash or mismatch.

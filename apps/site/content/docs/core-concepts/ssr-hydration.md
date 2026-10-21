---
title: SSR and hydration
description: Seed TransferState on the server with provideRuntimeI18nSsr() so the client hydrates without a mismatch.
eyebrow: docs.core-concepts.ssr-hydration
order: 5
section: Core concepts
---

## Seeding TransferState on the server

On the server, `provideRuntimeI18nSsr()` seeds TransferState with the same keys `provideRuntimeI18n()` reads on the client. With `AngularNodeAppEngine`, the per-request snapshot travels as the request context: pass it as the second argument to `handle()`, and read it back with `REQUEST_CONTEXT` in a factory:

```ts
// server.ts
app.use((req, res, next) => {
  angularApp
    .handle(req, buildSnapshot(req)) // the second argument becomes REQUEST_CONTEXT
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});
```

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

`AngularNodeAppEngine` and `REQUEST_CONTEXT` arrived in Angular 19. On older versions with `CommonEngine`, pass a plain snapshot instead: `commonEngine.render({ ..., providers: [provideRuntimeI18nSsr(snapshot)] })`.

`handle()`'s second argument is a request context, not providers. Passing `{ providers: [...] }` there, which is what the `CommonEngine` API used to take, is silently ignored. Routes that pick the language per request need `RenderMode.Server`, because a prerendered page is built before any request exists.

`provideRuntimeI18nSsr()` returns `EnvironmentProviders`, an opaque value, not an array. Put it directly in `providers`. Don't spread it.

## RuntimeI18nSsrSnapshot

`RuntimeI18nSsrSnapshot.bootstrap` holds the active language's catalog, and `catalogs` can optionally seed additional locales ahead of time. Everything defaults to the same TransferState key prefix as `provideRuntimeI18n()` (`@ngx-runtime-i18n/core`) — pass `stateKeyPrefix` to both helpers when you override it, so the server and client agree on where to read and write.

Use the same `provideRuntimeI18n(...)` config on both server and client app bootstraps. The wrapper reads TransferState on the client first and only fetches catalogs that weren't already seeded.

## Try it locally

<content-callout data-type="tip">

The repo ships `apps/demo-ssr`, a complete Express + Angular SSR demo covering TransferState seeding and catalog fallbacks end to end.

</content-callout>

```bash
nx serve demo-ssr                              # dev server, http://localhost:4200
nx build demo-ssr && node dist/apps/demo-ssr/server/server.mjs   # production build, http://localhost:4000
```

For a full worked example of wiring this into an Express server, see the [SSR with Express recipe](/recipes/ssr-with-express).

---
title: SSR and hydration
description: Seed TransferState on the server with provideRuntimeI18nSsr() so the client hydrates without a mismatch.
eyebrow: docs.core-concepts.ssr-hydration
order: 5
section: Core concepts
---

## Seeding TransferState on the server

On the server, use `provideRuntimeI18nSsr()` to seed TransferState with the same keys `provideRuntimeI18n()` reads on the client:

```ts
// i18n.server.providers.ts
import { EnvironmentProviders } from '@angular/core';
import { RuntimeI18nSsrSnapshot, provideRuntimeI18nSsr } from '@ngx-runtime-i18n/angular';

export function i18nServerProviders(snapshot: RuntimeI18nSsrSnapshot): EnvironmentProviders {
  return provideRuntimeI18nSsr(snapshot);
}
```

`provideRuntimeI18nSsr()` returns `EnvironmentProviders`, an opaque value, not an array. Include the result directly in your `providers` array — don't spread it:

```ts
angularApp.handle(req, { providers: [i18nServerProviders(snapshot)] });
```

## RuntimeI18nSsrSnapshot

`RuntimeI18nSsrSnapshot.bootstrap` holds the active language's catalog, and `catalogs` can optionally seed additional locales ahead of time. Everything defaults to the same TransferState key prefix as `provideRuntimeI18n()` (`@ngx-runtime-i18n/core`) — pass `stateKeyPrefix` to both helpers when you override it, so the server and client agree on where to read and write.

Use the same `provideRuntimeI18n(...)` config on both server and client app bootstraps. The wrapper reads TransferState on the client first and only fetches catalogs that weren't already seeded.

## Try it locally

<content-callout data-type="tip">

The repo ships `apps/demo-ssr`, a complete Express + Angular SSR demo covering TransferState seeding and catalog fallbacks end to end.

</content-callout>

```bash
nx build demo-ssr
nx serve demo-ssr   # http://localhost:4000
```

For a full worked example of wiring this into an Express server, see the [SSR with Express recipe](/recipes/ssr-with-express).

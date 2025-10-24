# @ngx-runtime-i18n

Runtime internationalization for Angular with **signals-first API**, **ICU message formatting**, and **SSR/hydration correctness**.

- ✅ Runtime language switching
- ✅ ICU-style messages (interpolation, `plural` with `=n`/`one`/`other`)
- ✅ SSR + hydration safe (no pre-hydrate DOM mutations)
- ✅ TransferState snapshot (server → client)
- ✅ Optional RxJS fallback (`I18nCompatService`)
- ✅ Locale data loading (`@angular/common/locales/global/<code>`)

---

## Quickstart (CSR)

1. **Install** (once published to npm):

   ```bash
   npm i @ngx-runtime-i18n
   ```

2. **Provide runtime i18n** in your app config:

   ```ts
   // app.config.ts
   import { ApplicationConfig } from '@angular/core';
   import { provideRouter } from '@angular/router';
   import { provideRuntimeI18n } from '@ngx-runtime-i18n/angular';

   export const appConfig: ApplicationConfig = {
     providers: [
       provideRouter([]),
       provideRuntimeI18n(
         {
           defaultLang: 'en',
           supported: ['en', 'hi', 'de'],
           fetchCatalog: (lang, signal) => fetch(`/i18n/${lang}.json`, { signal }).then((r) => r.json()),
         },
         {
           localeLoaders: {
             en: () => import('@angular/common/locales/global/en'),
             hi: () => import('@angular/common/locales/global/hi'),
             de: () => import('@angular/common/locales/global/de'),
           },
           options: {
             autoDetect: true,
             storageKey: '@ngx-runtime-i18n:lang',
             preferNavigatorBase: true,
           },
         }
       ),
     ],
   };
   ```

3. **Place catalogs** (CSR demo expects public root):

   ```
   apps/demo/src/public/i18n/
     ├── en.json
     ├── hi.json
     └── de.json
   ```

4. **Translate in templates**:

   ```html
   {{ 'hello.user' | i18n:{ name: 'Ashwin' } }} {{ 'cart.items' | i18n:{ count: items.length } }}
   ```

5. **Switch language**:

   ```ts
   // any component
   import { inject, Component } from '@angular/core';
   import { I18nService } from '@ngx-runtime-i18n/angular';

   @Component({
     /* ... */
   })
   export class MyCmp {
     private i18n = inject(I18nService);
     switch(lang: string) {
       this.i18n.setLang(lang);
     }
   }
   ```

---

## SSR snapshot (overview)

- Server chooses lang (URL/cookie/header), loads catalogs, **seeds TransferState**.
- Client hydrates using the snapshot (no refetch, no flicker).
- Client switching happens **after hydration**.

> Our provider reads a `{lang, catalogs}` bootstrap object and per-lang catalog keys:
> `@ngx-runtime-i18n:bootstrap`, `@ngx-runtime-i18n:catalog:<lang>`.

---

## RxJS fallback

If your app prefers Observables:

```ts
import { I18nCompatService } from '@ngx-runtime-i18n/angular';
import { toSignal } from '@angular/core/rxjs-interop';

const i18n = inject(I18nCompatService);
const lang = toSignal(i18n.lang$, { initialValue: 'en' });
i18n.setLang('hi');
```

---

## Troubleshooting

- **Missing keys**: In dev, we warn **once per key**. Customize via `onMissingKey`.
- **Locales**: import from `@angular/common/locales/global/<code>` (e.g. `en`, `hi`, `de`).
- **Hydration errors (NG0500/NG0501)**: make sure no DOM text changes before first stability; our service defers initial work behind `ApplicationRef.isStable`.

---

## Compatibility

Angular **v16–v20** (signals introduced in v16).  
Tree-shakable, ESM-first. Works with CSR out of the box; SSR requires seeding `TransferState`.

---

## License

MIT

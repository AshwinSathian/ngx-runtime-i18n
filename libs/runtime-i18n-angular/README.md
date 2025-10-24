# @ngx-runtime-i18n/angular

Angular bindings for `@ngx-runtime-i18n`.

## Install

```bash
npm i @ngx-runtime-i18n
```

## Usage

```ts
import { provideRuntimeI18n } from '@ngx-runtime-i18n/angular';

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
  }
);
```

### Template usage

```html
{{ 'hello.user' | i18n:{ name: 'Ashwin' } }}
```

### Switch language

```ts
import { inject } from '@angular/core';
import { I18nService } from '@ngx-runtime-i18n/angular';

const i18n = inject(I18nService);
i18n.setLang('hi');
```

### Optional RxJS service

```ts
import { I18nCompatService } from '@ngx-runtime-i18n/angular';
```

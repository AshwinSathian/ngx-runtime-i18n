# @ngx-runtime-i18n

Lightweight runtime internationalization core (framework-agnostic).

Provides the core ICU-like formatting engine and catalog management.

## Install

```bash
npm i @ngx-runtime-i18n
```

## Usage

```ts
import { formatIcu } from '@ngx-runtime-i18n';

const catalog = {
  hello: 'Hello {name}!',
  'cart.items': '{count, plural, =0 {No items} one {1 item} other {# items}} in your cart',
};

formatIcu('en', 'hello', catalog, { name: 'Ashwin' });
// → "Hello Ashwin!"
```

This package contains:

- `formatIcu(lang, key, catalog, params, onMissingKey?)`
- Type definitions (`Catalog`, `RuntimeI18nConfig`)
- Utilities for Angular bindings (`@ngx-runtime-i18n/angular`)

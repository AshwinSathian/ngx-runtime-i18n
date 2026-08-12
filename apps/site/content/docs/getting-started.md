---
title: Getting Started
description: Install ngx-runtime-i18n and load your first translation.
eyebrow: Docs
order: 1
section: Introduction
---

## Installation

Install the core package and the Angular integration:

```bash
npm install @ngx-runtime-i18n/core @ngx-runtime-i18n/angular
```

<content-callout data-type="tip">

Preload the fallback chain before navigation, not after.

</content-callout>

## Loading translations

You can register translations as a static map or lazily via dynamic import.

<content-tabs>
<div data-tab-label="Static map">

```ts
const translationMap = { en: {...}, es: {...} };
```

</div>
<div data-tab-label="Lazy import">

```ts
const translationResolvers = { en: () => import('./primeng/en') };
```

</div>
</content-tabs>

### Next steps

See the recipes for framework-specific integration examples.

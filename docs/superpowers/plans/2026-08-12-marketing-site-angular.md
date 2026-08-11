# ngx-runtime-i18n marketing/docs site (Angular SSR) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a prerendered-static Angular application at `apps/site` covering the landing page, full documentation, recipes, comparison, changelog, and FAQ for `@ngx-runtime-i18n`, then deploy it to Cloudflare Pages at `i18n.ashwinsathian.com`.

**Architecture:** Nx-registered Angular 22 application using `@angular/ssr` with every route set to `RenderMode.Prerender` and `outputMode: 'static'` — fully static HTML/CSS/JS output, no server process at runtime. Content lives as Markdown files under `apps/site/content/`, compiled at build time by a standalone Node script (`unified`/`remark`/`rehype`/`shiki`) into sanitized HTML plus a JSON manifest that Angular imports directly (bundled by esbuild, no filesystem reads at runtime). The app shell (header, footer, search, theme toggle, hero) is ordinary Angular components with signals-based state (zoneless — no zone.js). A small number of framework-free native Web Components handle the few interactive elements embedded inside compiled Markdown content (code copy button, tabbed code groups), so they never enter Angular's hydration process. The hero's language-cycling demo runs a real, scoped `provideRuntimeI18n()` instance from the actual `@ngx-runtime-i18n/angular` workspace package — genuine dogfooding, not a simulation.

**Tech Stack:** Angular 22.1.1, Nx 23.1.1, `@angular/ssr` 22.1.3, TypeScript, Tailwind CSS v4, `@angular/cdk` (Overlay + a11y primitives for search), `unified`/`remark`/`rehype`/`shiki`, `@fontsource` (self-hosted fonts), `satori` + `@resvg/resvg-js` (build-time OG images), Jest + `@testing-library/angular` (unit tests, matching this repo's existing convention), Playwright + `@axe-core/playwright` via `@nx/playwright` (E2E + a11y, matching the `apps/demo-e2e` convention), `wrangler` (deploy).

## Global Constraints

- Site lives at `apps/site/` (app) + `apps/site-e2e/` (Playwright), Nx-registered via `@nx/angular:application`/`@nx/playwright`, using the monorepo's own Angular 22.1.1 / Nx 23.1.1 — not part of the six-package publish pipeline (`release.yml` tag matching, `npm publish`); simply absent from the `-p=runtime-i18n,...` project lists that scope the existing `build:libs`/`test`/`ci` root npm scripts.
- Prerendered static output only (`RenderMode.Prerender` on every route, `outputMode: 'static'`) — no live per-request SSR, no Cloudflare Pages Functions/Workers. Confirmed with the user.
- Zoneless (no zone.js), signals-based component state — the Nx 23 / Angular 21+ generator default, and thematically consistent with the library's own signals-first design.
- Jest for unit tests (`@nx/jest`, matching the existing repo-wide convention used by every other project — not the newer `vitest-angular` generator default, which would fragment the repo's testing tooling for no benefit here).
- Every product claim traces to: root `README.md`, the six package READMEs (`libs/runtime-i18n/README.md`, `libs/runtime-i18n-angular/README.md`, `libs/runtime-i18n-primeng/README.md`, `libs/runtime-i18n-material/README.md`, `libs/runtime-i18n-schematics/README.md`, `tools/cli/README.md`), root `CHANGELOG.md`, `apps/demo`/`apps/demo-ssr`, `.github/workflows/*.yml`, or a fresh `npm view @ngx-runtime-i18n/<pkg> version` check. No invented stats, testimonials, or "trusted by" logos.
- Verified live on npm at plan-writing time: `core` 2.1.0, `angular` 2.1.0, `primeng` 2.0.0 — published. `material`, `schematics`, `cli` — **not yet published** ("build from source"), despite `CHANGELOG.md` prose describing an intended first release for them. Re-verify with `npm view` immediately before writing the package matrix/badges, since this can change during implementation.
- Voice & style: banned words — delve, boast(s), robust, seamless(ly), leverage (verb), streamline, empower, unlock, elevate, game-changer, effortless(ly), harness (verb), cutting-edge, revolutionary, unparalleled, crucial, pivotal, underscore(s), tapestry, testament, vibrant, meticulous, intricate, interplay, landscape (metaphorical), garner, bolster(ed), enduring, fostering, align with, enhance, highlighting, showcasing, "serves as/stands as/functions as/represents" instead of "is". Banned constructions — negative parallelism ("not just X but Y" / "not X but Y" / "X rather than Y" as rhetorical flourish), rule-of-three padding, present-participle significance tacked onto sentences, generic legacy/significance inflation, "despite its strengths, faces challenges" formula, vague-authority claims, chatty tour-guide address ("Let's dive in!"). Formatting — sentence case headings, bold only on first term definition, sparing em dashes, no emoji bullets, no decorative rules before headings, straight quotes in body copy.
- Color tokens (exact hex): `--paper:#FAF9F6` `--ink:#14181F` `--rule:#DEDAD1` `--accent-en:#2C5CE6` `--accent-hi:#C2410C` `--accent-de:#0F766E` (light); `--paper:#0B0D12` `--ink:#F5F3EE` `--rule:#242A35` `--accent-en:#5B82FF` `--accent-hi:#F0803A` `--accent-de:#14B8A6` (dark). The three accents are always paired with a text/label, never color-only.
- Fonts: Bricolage Grotesque (display), IBM Plex Sans + IBM Plex Sans Devanagari (body/UI), IBM Plex Mono (code), all self-hosted via `@fontsource` packages.
- Icons: hand-rolled inline SVG components only — no icon package dependency (a prior attempt hit a real case of `lucide-react` silently dropping its `Github` export; the full icon set needed here is small enough to own directly).
- The hero's language-cycling demo genuinely runs `@ngx-runtime-i18n/angular`'s `provideRuntimeI18n()`/`I18nService`, scoped to that one component. Nothing else on the site implies the whole page is translated by the library — the rest of the site's copy is English-only by design.
- No GitHub Actions workflow for the site. No auto-deploy-on-push. Deployment is local-CLI (`wrangler`) only.
- WCAG 2.2 AA target: skip link, visible focus rings, full keyboard operability, no skipped heading levels, `prefers-reduced-motion` respected, no color-only signaling.

---

## Task 1: Scaffold the Nx Angular SSR application

**Files:**
- Create: `apps/site/` (generated by `@nx/angular:application`), `apps/site-e2e/` (generated by `@nx/playwright`)
- Modify: root `README.md` (add a "Website" section), root `.gitignore` if the generator doesn't already cover Angular build output for this app

**Interfaces:**
- Produces: a working `nx serve site` dev server, and `nx build site --configuration=production` producing a prerendered static output directory.

- [ ] **Step 1: Check the exact generator flags against the installed version**

```bash
npx nx g @nx/angular:application --help
npx nx g @nx/playwright:configuration --help
```

Confirm `--ssr`, `--style`, `--routing`, `--standalone`, `--prefix`, `--unitTestRunner`, `--e2eTestRunner` exist as shown below (they were confirmed present against Nx 23.1.1 / `@nx/angular` 23.1.1 at plan-writing time; if a flag name has changed, use the closest equivalent and note the substitution in your report).

- [ ] **Step 2: Generate the application**

```bash
npx nx g @nx/angular:application apps/site \
  --ssr \
  --style=css \
  --routing \
  --standalone \
  --prefix=app \
  --unitTestRunner=jest \
  --e2eTestRunner=playwright
```

Accept the zoneless default (do not pass `--zoneless=false`). This should generate `apps/site/` (with `src/app/`, `src/main.ts`, `src/main.server.ts`, `src/server.ts`, `src/app/app.config.ts`, `src/app/app.config.server.ts`, `src/app/app.routes.ts`, `src/app/app.routes.server.ts`, `project.json`, `jest.config.ts`, `tsconfig*.json`, `eslint.config.mjs`) and `apps/site-e2e/` (with `playwright.config.ts`, `src/example.spec.ts`, `project.json`), following exactly the same shape as `apps/demo-ssr` and `apps/demo-e2e` already in this repo — compare directly against those two directories if anything looks different than expected.

- [ ] **Step 3: Verify `app.routes.server.ts` and confirm zoneless bootstrap**

Open the generated `apps/site/src/app/app.routes.server.ts` — it should already contain a catch-all prerender entry. If not, set it to:

```ts
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
```

Open `apps/site/src/app/app.config.ts` and confirm it calls `provideZonelessChangeDetection()` (or the generator's current equivalent name — check `node_modules/@angular/core/index.d.ts` for the exact exported symbol if this specific name doesn't exist) rather than including `zone.js` in polyfills. Confirm `apps/site/project.json`'s build target has no `"polyfills": ["zone.js"]` entry.

- [ ] **Step 4: Set static output mode**

In `apps/site/project.json`, add `"outputMode": "static"` to the `build` target's `options` (alongside the existing `browser`, `server`, `ssr`, `outputPath`, etc. — compare against `apps/demo-ssr/project.json`'s build target for the fields that should already be present from the generator, and only add `outputMode`).

- [ ] **Step 5: Build and verify static output**

```bash
npx nx build site --configuration=production
```

Expected: succeeds, and the output directory (report its exact path and structure — expect something under `dist/apps/site/`, likely a `browser/` subdirectory containing prerendered `index.html` and one HTML file per route, matching the convention already visible in `apps/demo-ssr`'s `serve-static` target which points at `dist/apps/demo-ssr/browser`) contains real prerendered HTML for the one default route the generator scaffolds (confirm by opening the generated `index.html` and checking it contains real rendered content, not just an empty `<app-root></app-root>` shell — that would indicate prerendering isn't actually running).

- [ ] **Step 6: Verify the e2e project's default test runs against the new app**

```bash
npx nx run site:serve &
sleep 3
npx nx e2e site-e2e
```

Expected: the generator's default `example.spec.ts` passes against the running dev server. Stop the `serve` process afterward.

- [ ] **Step 7: Root README and commit**

Add a "Website" section to root `README.md` (near the top, after the badges) linking to `apps/site` and noting the live site will be at `https://i18n.ashwinsathian.com` once deployed.

```bash
git add apps/site apps/site-e2e README.md .gitignore
git commit -m "chore(site): scaffold Nx Angular SSR application with static prerendering"
```

---

## Task 2: Tailwind CSS v4, design tokens, fonts, and global styles

**Files:**
- Modify: `apps/site/src/styles.css` (or wherever the generator put global styles), `apps/site/project.json` (if `ng add` needs a PostCSS config wired in)
- Create: `apps/site/postcss.config.mjs` or `.postcssrc.json` (whichever `ng add tailwindcss` produces)
- Modify: root `package.json` / `apps/site/package.json` if font packages need adding (Nx workspaces install to the root `node_modules`; add `@fontsource/bricolage-grotesque`, `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono`, and the closest available Devanagari-covering package for IBM Plex Sans — check npm for the exact package name, e.g. `@fontsource/ibm-plex-sans-devanagari` if it exists as its own Fontsource package, or a variable-font Fontsource package covering the Devanagari subset; if no exact match exists, pick the nearest verified alternative and report the substitution)

**Interfaces:**
- Produces: CSS custom properties `--color-paper`, `--color-ink`, `--color-rule`, `--color-accent-en`, `--color-accent-hi`, `--color-accent-de` (light values on `:root`, dark values under `:root[data-theme='dark']`), available as Tailwind utilities (`bg-paper`, `text-ink`, etc.) via Tailwind v4's `@theme` block. Font `@import`/`@font-face` rules for all four font packages.

- [ ] **Step 1: Add Tailwind CSS v4 via Angular's official path**

```bash
cd apps/site
npx ng add tailwindcss
```

Confirm this adds `@import "tailwindcss";` (or Tailwind v4's equivalent import line) to the global styles file and wires PostCSS into the build. Verify with `npx nx build site` that Tailwind utility classes actually work (temporarily add a `class="text-red-500"` somewhere, confirm the build's CSS output contains the corresponding rule, then remove the test class).

- [ ] **Step 2: Install font packages**

```bash
npm install @fontsource/bricolage-grotesque @fontsource/ibm-plex-sans @fontsource/ibm-plex-mono
npm search "@fontsource" devanagari 2>&1 | head -20
```

Identify and install the correct Fontsource package(s) providing IBM Plex Sans Devanagari coverage (check `https://fontsource.org` package listing via npm search/view if needed — do not guess the package name). Install it alongside the other three.

- [ ] **Step 3: Import font faces and set font CSS variables**

In the global styles file, import the specific weights needed (400/500/600/700 for body and mono, display weights for Bricolage Grotesque) using Fontsource's documented import paths, e.g.:

```css
@import '@fontsource/bricolage-grotesque/600.css';
@import '@fontsource/bricolage-grotesque/700.css';
@import '@fontsource/ibm-plex-sans/400.css';
@import '@fontsource/ibm-plex-sans/500.css';
@import '@fontsource/ibm-plex-sans/600.css';
@import '@fontsource/ibm-plex-sans/700.css';
@import '@fontsource/ibm-plex-mono/400.css';
@import '@fontsource/ibm-plex-mono/500.css';
/* + the Devanagari package's weight imports identified in Step 2 */
```

Then define font stacks:

```css
:root {
  --font-sans: 'IBM Plex Sans', 'IBM Plex Sans Devanagari', sans-serif;
  --font-display: 'Bricolage Grotesque', 'IBM Plex Sans', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
}
```

(Use the exact font-family name each Fontsource package registers — confirm via the package's own CSS output rather than assuming, since Fontsource sometimes suffixes variable-font family names.)

- [ ] **Step 4: Define color tokens via Tailwind v4's `@theme`**

```css
@theme {
  --color-paper: #faf9f6;
  --color-ink: #14181f;
  --color-rule: #dedad1;
  --color-accent-en: #2c5ce6;
  --color-accent-hi: #c2410c;
  --color-accent-de: #0f766e;
}

:root[data-theme='dark'] {
  --color-paper: #0b0d12;
  --color-ink: #f5f3ee;
  --color-rule: #242a35;
  --color-accent-en: #5b82ff;
  --color-accent-hi: #f0803a;
  --color-accent-de: #14b8a6;
}

body {
  background-color: var(--color-paper);
  color: var(--color-ink);
  font-family: var(--font-sans);
}

:focus-visible {
  outline: 2px solid var(--color-accent-en);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

This makes `bg-paper`, `text-ink`, `border-rule`, `text-accent-en`, etc. available as Tailwind utilities everywhere in the app (Tailwind v4 auto-generates utilities from `--color-*` theme variables).

- [ ] **Step 5: Verify build and font rendering**

```bash
npx nx build site --configuration=production
```

Open the built `index.html` and confirm the font `@font-face` rules and color tokens are present in the compiled CSS. Serve it locally (`npx http-server dist/apps/site/browser` or similar) and visually confirm via a quick screenshot that Bricolage Grotesque/IBM Plex render (not a fallback system font) — a mismatch here is easy to miss and hard to debug later.

- [ ] **Step 6: Commit**

```bash
git add apps/site package.json package-lock.json
git commit -m "feat(site): add Tailwind CSS v4, design tokens, and self-hosted fonts"
```

---

## Task 3: Theme service and toggle (signals-based, FOUC-safe)

**Files:**
- Create: `apps/site/src/app/core/theme.service.ts`, `apps/site/src/app/core/theme.service.spec.ts`, `apps/site/src/app/shared/theme-toggle/theme-toggle.component.ts`, `apps/site/src/app/shared/theme-toggle/theme-toggle.component.spec.ts`, `apps/site/src/app/shared/icons/*.ts` (sun/moon inline SVG components — see Task 5 for the full icon set; only sun/moon are needed here, the rest come in Task 5)
- Modify: `apps/site/src/index.html` (inline FOUC-prevention script)

**Interfaces:**
- Produces: `ThemeService` (injectable, signals-based) with `theme: Signal<'light' | 'dark'>` and `toggle(): void`, persisting to `localStorage` under key `ngx-i18n-site:theme` and respecting `prefers-color-scheme` when no stored preference exists. `ThemeToggleComponent` (standalone), a button with `aria-label` that reflects current state, rendering a sun or moon icon.

- [ ] **Step 1: Write the failing test for `ThemeService`**

```ts
// apps/site/src/app/core/theme.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to light when no stored preference and system prefers light', () => {
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('light');
  });

  it('toggle() flips the theme and persists it', () => {
    const service = TestBed.inject(ThemeService);
    service.toggle();
    expect(service.theme()).toBe('dark');
    expect(localStorage.getItem('ngx-i18n-site:theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('reads a previously stored preference on init', () => {
    localStorage.setItem('ngx-i18n-site:theme', 'dark');
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('dark');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx nx test site --testFile=theme.service.spec.ts
```

Expected: FAIL — `./theme.service` doesn't exist.

- [ ] **Step 3: Implement `ThemeService`**

```ts
// apps/site/src/app/core/theme.service.ts
import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'ngx-i18n-site:theme';
type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<Theme>(this.readInitial());
  readonly theme = this._theme.asReadonly();

  constructor() {
    this.apply(this._theme());
  }

  toggle(): void {
    const next: Theme = this._theme() === 'dark' ? 'light' : 'dark';
    this._theme.set(next);
    localStorage.setItem(STORAGE_KEY, next);
    this.apply(next);
  }

  private readInitial(): Theme {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored === 'light' || stored === 'dark') return stored;
    const prefersDark = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  private apply(theme: Theme): void {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx nx test site --testFile=theme.service.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Prevent flash-of-wrong-theme with an inline script in `index.html`**

Since prerendered HTML is generated once at build time (without knowing each visitor's stored preference or OS setting), add a tiny synchronous inline script in `apps/site/src/index.html`'s `<head>`, before any stylesheet, that sets `data-theme` on `<html>` before first paint:

```html
<script>
  (function () {
    try {
      var stored = localStorage.getItem('ngx-i18n-site:theme');
      var theme = stored === 'light' || stored === 'dark' ? stored : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);
    } catch (e) {}
  })();
</script>
```

This must run before Angular bootstraps and before `ThemeService` is constructed, so the prerendered page's default (light-token) styling doesn't flash before the correct theme applies.

- [ ] **Step 6: Write the failing test for `ThemeToggleComponent`, then implement it**

```ts
// apps/site/src/app/shared/theme-toggle/theme-toggle.component.spec.ts
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ThemeToggleComponent } from './theme-toggle.component';

describe('ThemeToggleComponent', () => {
  it('toggles the theme and updates its own aria-label when clicked', async () => {
    const user = userEvent.setup();
    await render(ThemeToggleComponent);

    const button = screen.getByRole('button', { name: /switch to dark theme/i });
    await user.click(button);

    expect(screen.getByRole('button', { name: /switch to light theme/i })).toBeInTheDocument();
  });
});
```

Run it (`npx nx test site --testFile=theme-toggle.component.spec.ts`), confirm it fails (module not found), then implement:

```ts
// apps/site/src/app/shared/theme-toggle/theme-toggle.component.ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ThemeService } from '../../core/theme.service';
import { SunIconComponent } from '../icons/sun-icon.component';
import { MoonIconComponent } from '../icons/moon-icon.component';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [SunIconComponent, MoonIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      (click)="theme.toggle()"
      [attr.aria-label]="label()"
      class="flex h-9 w-9 items-center justify-center rounded-md border border-rule text-ink hover:border-accent-en"
    >
      @if (theme.theme() === 'dark') {
        <app-sun-icon />
      } @else {
        <app-moon-icon />
      }
    </button>
  `,
})
export class ThemeToggleComponent {
  protected readonly theme = inject(ThemeService);
  protected readonly label = computed(() => (this.theme.theme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'));
}
```

`SunIconComponent`/`MoonIconComponent` are minimal standalone components each wrapping one inline `<svg>` (build these now as part of this task, ahead of Task 5's full icon set, since `ThemeToggleComponent` needs them): each takes no inputs, renders a single `aria-hidden="true"` SVG.

- [ ] **Step 7: Run the full test suite and verify build**

```bash
npx nx test site
npx nx build site --configuration=production
```

Expected: all tests pass, build succeeds.

- [ ] **Step 8: Commit**

```bash
git add apps/site
git commit -m "feat(site): add theme service, toggle, and FOUC-prevention script"
```

---

## Task 4: Site header, footer, mobile nav, and skip link

**Files:**
- Create: `apps/site/src/app/shared/site-header/site-header.component.ts`, `apps/site/src/app/shared/site-footer/site-footer.component.ts`, `apps/site/src/app/shared/skip-link/skip-link.component.ts`, `apps/site/src/app/shared/mobile-nav/mobile-nav.component.ts`, `apps/site/src/app/shared/mobile-nav/mobile-nav.component.spec.ts`, `apps/site/src/app/shared/icons/menu-icon.component.ts`, `apps/site/src/app/shared/icons/x-icon.component.ts`, `apps/site/src/app/shared/icons/github-icon.component.ts`, `apps/site/src/app/shared/icons/package-icon.component.ts`
- Modify: `apps/site/src/app/app.ts` (or `app.component.ts`, whatever the generator named the root component) — wire `<app-skip-link>`, `<app-site-header>`, `<main id="main-content"><router-outlet /></main>`, `<app-site-footer>`

**Interfaces:**
- Produces: `SiteHeaderComponent` (logo linking `/`, primary nav — Docs/Recipes/Compare/Changelog — a search-trigger button with `id="search-trigger"` for Task 9's search palette to hook into, GitHub/npm links with `aria-label`, `<app-theme-toggle>`, `<app-mobile-nav>`), `SiteFooterComponent`, `SkipLinkComponent` (anchor to `#main-content`), `MobileNavComponent` (disclosure button with `aria-expanded`/`aria-controls`, Escape closes AND restores focus to the trigger button — this exact regression was caught and fixed in the first, since-rolled-back Next.js implementation of this same component; don't reintroduce it).
- Consumes: `ThemeToggleComponent` from Task 3.

- [ ] **Step 1: Write the failing test for `MobileNavComponent`**

```ts
// apps/site/src/app/shared/mobile-nav/mobile-nav.component.spec.ts
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MobileNavComponent } from './mobile-nav.component';

const links = [
  { href: '/docs', label: 'Docs' },
  { href: '/recipes', label: 'Recipes' },
];

describe('MobileNavComponent', () => {
  it('opens on click, exposes aria-expanded, and closes with focus restored on Escape', async () => {
    const user = userEvent.setup();
    await render(MobileNavComponent, { inputs: { links } });

    const trigger = screen.getByRole('button', { name: /open menu/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(screen.getByRole('button', { name: /close menu/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Docs' })).toBeVisible();

    await user.keyboard('{Escape}');
    const reopenedTrigger = screen.getByRole('button', { name: /open menu/i });
    expect(reopenedTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(reopenedTrigger).toHaveFocus();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx nx test site --testFile=mobile-nav.component.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `MobileNavComponent`**

```ts
// apps/site/src/app/shared/mobile-nav/mobile-nav.component.ts
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MenuIconComponent } from '../icons/menu-icon.component';
import { XIconComponent } from '../icons/x-icon.component';

@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  imports: [RouterLink, MenuIconComponent, XIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="md:hidden">
      <button
        #trigger
        type="button"
        [attr.aria-expanded]="open()"
        aria-controls="mobile-nav-panel"
        [attr.aria-label]="open() ? 'Close menu' : 'Open menu'"
        (click)="toggle()"
        class="flex h-9 w-9 items-center justify-center rounded-md border border-rule"
      >
        @if (open()) { <app-x-icon /> } @else { <app-menu-icon /> }
      </button>
      @if (open()) {
        <div id="mobile-nav-panel" class="absolute inset-x-0 top-16 z-40 border-b border-rule bg-paper p-4">
          <nav aria-label="Mobile">
            <ul class="flex flex-col gap-3">
              @for (link of links(); track link.href) {
                <li><a [routerLink]="link.href" class="block py-1 text-lg" (click)="close()">{{ link.label }}</a></li>
              }
            </ul>
          </nav>
        </div>
      }
    </div>
  `,
})
export class MobileNavComponent {
  readonly links = input.required<{ href: string; label: string }[]>();
  protected readonly open = signal(false);
  private readonly triggerRef = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  toggle(): void {
    this.open.update((v) => !v);
  }

  close(): void {
    this.open.set(false);
    this.triggerRef()?.nativeElement.focus();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.close();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx nx test site --testFile=mobile-nav.component.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Implement the icon components (menu, x, github, package)**

Each is a minimal standalone component with one inline `<svg aria-hidden="true">...</svg>` and no inputs, e.g.:

```ts
// apps/site/src/app/shared/icons/menu-icon.component.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-menu-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>`,
})
export class MenuIconComponent {}
```

Follow the same pattern for `x-icon` (an X made of two crossed lines), `github-icon` (the standard GitHub mark path — use a well-known public-domain GitHub octocat SVG path), and `package-icon` (a simple box/package outline, standing in for the npm link).

- [ ] **Step 6: Implement `SkipLinkComponent`**

```ts
// apps/site/src/app/shared/skip-link/skip-link.component.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-skip-link',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent-en focus:px-4 focus:py-2 focus:text-white">Skip to content</a>`,
})
export class SkipLinkComponent {}
```

- [ ] **Step 7: Implement `SiteHeaderComponent`**

```ts
// apps/site/src/app/shared/site-header/site-header.component.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { MobileNavComponent } from '../mobile-nav/mobile-nav.component';
import { GithubIconComponent } from '../icons/github-icon.component';
import { PackageIconComponent } from '../icons/package-icon.component';

const NAV_LINKS = [
  { href: '/docs', label: 'Docs' },
  { href: '/recipes', label: 'Recipes' },
  { href: '/compare', label: 'Compare' },
  { href: '/changelog', label: 'Changelog' },
];

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [RouterLink, ThemeToggleComponent, MobileNavComponent, GithubIconComponent, PackageIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-30 border-b border-rule bg-paper/90 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <a routerLink="/" class="font-display text-lg font-semibold">ngx-runtime-i18n</a>
        <nav aria-label="Primary" class="hidden md:block">
          <ul class="flex items-center gap-6 text-sm">
            @for (link of navLinks; track link.href) {
              <li><a [routerLink]="link.href" class="hover:text-accent-en">{{ link.label }}</a></li>
            }
          </ul>
        </nav>
        <div class="flex items-center gap-2">
          <button id="search-trigger" type="button" class="hidden items-center gap-2 rounded-md border border-rule px-3 py-1.5 text-sm text-ink/70 md:flex" aria-label="Open search (Cmd+K)">
            Search
            <kbd class="rounded border border-rule px-1.5 py-0.5 font-mono text-xs">⌘K</kbd>
          </button>
          <a href="https://github.com/AshwinSathian/ngx-runtime-i18n" aria-label="GitHub repository" class="p-2"><app-github-icon /></a>
          <a href="https://www.npmjs.com/package/@ngx-runtime-i18n/angular" aria-label="npm package" class="p-2"><app-package-icon /></a>
          <app-theme-toggle />
          <app-mobile-nav [links]="navLinks" />
        </div>
      </div>
    </header>
  `,
})
export class SiteHeaderComponent {
  protected readonly navLinks = NAV_LINKS;
}
```

- [ ] **Step 8: Implement `SiteFooterComponent`**

Structurally the same content/links as the original Next.js design draft (wordmark + tagline, Docs nav, Project nav, Packages nav, MIT/colophon line), translated to an Angular standalone component using `RouterLink` for internal links and plain `<a>` for external ones.

- [ ] **Step 9: Wire into the root app component**

```ts
// apps/site/src/app/app.ts (or app.component.ts — match whatever the generator produced)
// template:
`<app-skip-link />
<app-site-header />
<main id="main-content"><router-outlet /></main>
<app-site-footer />`
```

- [ ] **Step 10: Run full test suite, build, commit**

```bash
npx nx test site
npx nx build site --configuration=production
git add apps/site
git commit -m "feat(site): add header, footer, mobile nav, and skip link"
```

---

## Task 5: Content Web Components (code block with copy, tabs, callout) and remaining icons

**Files:**
- Create: `apps/site/src/app/content-elements/code-block-element.ts`, `apps/site/src/app/content-elements/tabs-element.ts`, `apps/site/src/app/content-elements/callout-element.ts`, `apps/site/src/app/content-elements/register-content-elements.ts`, `apps/site/src/app/content-elements/code-block-element.spec.ts`, `apps/site/src/app/content-elements/tabs-element.spec.ts`
- Modify: `apps/site/src/main.ts` (call `registerContentElements()` client-side only)
- Create remaining icon components: `apps/site/src/app/shared/icons/search-icon.component.ts`, `check-icon.component.ts`, `copy-icon.component.ts`, `info-icon.component.ts`, `alert-triangle-icon.component.ts`, `lightbulb-icon.component.ts`

**Interfaces:**
- Produces: three native custom elements — `<content-code-block>` (wraps a `<pre><code>` child, adds a floating copy button reading the block's `textContent`, announces "Copied" via a visually-hidden `aria-live="polite"` region), `<content-tabs>` (expects child elements each carrying a `data-tab-label` attribute; renders a `role="tablist"` of buttons and toggles which child is visible, defaulting to showing all children — unstyled but fully readable — before JS registers), `<content-callout data-type="note|warning|tip">` (wraps its children with an icon and a `role="note"`/labelled container). `registerContentElements()` — a single function called once from `main.ts`, guarded so it never runs during prerendering (only in the browser).
- Consumed by: the compiled Markdown → HTML pipeline (Task 6) emits these tags directly in its output; Angular templates that need the same tabs/callout/code-block behavior (the landing page's code showcase, Task 10) reference them the same way via Angular's `CUSTOM_ELEMENTS_SCHEMA`.

- [ ] **Step 1: Write the failing test for the code-block element**

Native custom elements are tested directly via the DOM APIs, not `@testing-library/angular` (they're not Angular components):

```ts
// apps/site/src/app/content-elements/code-block-element.spec.ts
import { registerContentElements } from './register-content-elements';

describe('content-code-block', () => {
  beforeAll(() => registerContentElements());

  it('copies its text content to the clipboard when the copy button is clicked and announces it', async () => {
    document.body.innerHTML = `<content-code-block><pre><code>npm i @ngx-runtime-i18n/angular</code></pre></content-code-block>`;
    const el = document.querySelector('content-code-block') as HTMLElement;
    // Force upgrade synchronously in the test environment if not already upgraded via innerHTML parsing.
    customElements.upgrade(el);

    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const button = el.querySelector('button') as HTMLButtonElement;
    button.click();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith('npm i @ngx-runtime-i18n/angular');
    const liveRegion = el.querySelector('[aria-live]') as HTMLElement;
    expect(liveRegion.textContent).toContain('Copied');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx nx test site --testFile=code-block-element.spec.ts
```

Expected: FAIL — `./register-content-elements` doesn't exist.

- [ ] **Step 3: Implement the code-block element**

```ts
// apps/site/src/app/content-elements/code-block-element.ts
export class ContentCodeBlockElement extends HTMLElement {
  private button?: HTMLButtonElement;
  private liveRegion?: HTMLElement;

  connectedCallback(): void {
    this.style.position = 'relative';
    this.style.display = 'block';

    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.textContent = 'Copy';
    this.button.setAttribute('aria-label', 'Copy code');
    this.button.className = 'absolute right-2 top-2 rounded-md border border-rule bg-paper px-2 py-1 text-xs';
    this.button.addEventListener('click', () => this.copy());

    this.liveRegion = document.createElement('span');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.className = 'sr-only';

    this.appendChild(this.button);
    this.appendChild(this.liveRegion);
  }

  private async copy(): Promise<void> {
    const codeEl = this.querySelector('code');
    const text = codeEl?.textContent ?? '';
    await navigator.clipboard.writeText(text);
    if (this.button) this.button.textContent = 'Copied';
    if (this.liveRegion) this.liveRegion.textContent = 'Copied';
    setTimeout(() => {
      if (this.button) this.button.textContent = 'Copy';
    }, 2000);
  }
}
```

- [ ] **Step 4: Implement the tabs element**

```ts
// apps/site/src/app/content-elements/tabs-element.ts
export class ContentTabsElement extends HTMLElement {
  connectedCallback(): void {
    const panels = Array.from(this.children) as HTMLElement[];
    if (panels.length === 0) return;

    const tablist = document.createElement('div');
    tablist.setAttribute('role', 'tablist');
    tablist.setAttribute('aria-label', 'Code example');
    tablist.className = 'flex border-b border-rule';

    panels.forEach((panel, i) => {
      const label = panel.getAttribute('data-tab-label') ?? `Tab ${i + 1}`;
      const tabId = `content-tab-${Math.random().toString(36).slice(2)}-${i}`;
      panel.id = `${tabId}-panel`;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tabId);
      panel.hidden = i !== 0;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = tabId;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(i === 0));
      btn.setAttribute('aria-controls', panel.id);
      btn.tabIndex = i === 0 ? 0 : -1;
      btn.textContent = label;
      btn.className = 'px-4 py-2 text-sm font-mono';
      btn.addEventListener('click', () => this.activate(i, panels, tablist));
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') this.activate((i + 1) % panels.length, panels, tablist);
        if (e.key === 'ArrowLeft') this.activate((i - 1 + panels.length) % panels.length, panels, tablist);
      });

      tablist.appendChild(btn);
    });

    this.insertBefore(tablist, this.firstChild);
  }

  private activate(index: number, panels: HTMLElement[], tablist: HTMLElement): void {
    const buttons = Array.from(tablist.children) as HTMLButtonElement[];
    panels.forEach((panel, i) => {
      panel.hidden = i !== index;
      buttons[i].setAttribute('aria-selected', String(i === index));
      buttons[i].tabIndex = i === index ? 0 : -1;
      buttons[i].className = i === index ? 'px-4 py-2 text-sm font-mono border-b-2 border-accent-en' : 'px-4 py-2 text-sm font-mono text-ink/60';
    });
    buttons[index].focus();
  }
}
```

Note the pre-upgrade fallback is implicit: before `connectedCallback` runs, all child panels are plain block elements with no `hidden` attribute, so they all show — a legitimate no-JS fallback, not a bug.

- [ ] **Step 5: Implement the callout element**

```ts
// apps/site/src/app/content-elements/callout-element.ts
const LABELS: Record<string, string> = { note: 'Note', warning: 'Warning', tip: 'Tip' };

export class ContentCalloutElement extends HTMLElement {
  connectedCallback(): void {
    const type = this.getAttribute('data-type') ?? 'note';
    this.setAttribute('role', 'note');
    this.setAttribute('aria-label', LABELS[type] ?? 'Note');
    this.classList.add('block', 'my-4', 'rounded-lg', 'border', 'p-4');
  }
}
```

(Icon-per-type visuals are added via CSS `::before`/attribute selectors keyed on `data-type` in Task 2's or this task's stylesheet, rather than DOM-injected icon components, since this element has no Angular DI to pull icon components from.)

- [ ] **Step 6: Implement `registerContentElements()` and wire into `main.ts`**

```ts
// apps/site/src/app/content-elements/register-content-elements.ts
import { ContentCodeBlockElement } from './code-block-element';
import { ContentTabsElement } from './tabs-element';
import { ContentCalloutElement } from './callout-element';

export function registerContentElements(): void {
  if (typeof customElements === 'undefined') return; // no-op during server-side prerendering
  if (!customElements.get('content-code-block')) customElements.define('content-code-block', ContentCodeBlockElement);
  if (!customElements.get('content-tabs')) customElements.define('content-tabs', ContentTabsElement);
  if (!customElements.get('content-callout')) customElements.define('content-callout', ContentCalloutElement);
}
```

In `apps/site/src/main.ts`, call `registerContentElements()` once, before or alongside `bootstrapApplication(...)` — it must only run in `main.ts` (the browser entry point), never in `main.server.ts`.

- [ ] **Step 7: Run test to verify it passes, then implement the remaining icon components**

```bash
npx nx test site --testFile=code-block-element.spec.ts
npx nx test site --testFile=tabs-element.spec.ts
```

Write an equivalent RED→GREEN pair for `tabs-element.spec.ts` (assert clicking a second tab's button hides the first panel and shows the second, with `aria-selected` flipping). Then implement `search-icon`, `check-icon`, `copy-icon`, `info-icon`, `alert-triangle-icon`, `lightbulb-icon` following the exact pattern from Task 4 Step 5 (one inline SVG each, `aria-hidden="true"`).

- [ ] **Step 8: Run full suite, build, commit**

```bash
npx nx test site
npx nx build site --configuration=production
git add apps/site
git commit -m "feat(site): add content web components (code block, tabs, callout) and icon set"
```

---

## Task 6: Angular presentational components (KeyEyebrow, LangBadge, PackageCard, FaqItem)

**Files:**
- Create: `apps/site/src/app/shared/key-eyebrow/key-eyebrow.component.ts`, `apps/site/src/app/shared/lang-badge/lang-badge.component.ts`, `apps/site/src/app/shared/package-card/package-card.component.ts`, `apps/site/src/app/shared/faq-item/faq-item.component.ts`

**Interfaces:**
- Produces: `KeyEyebrowComponent` (`text = input.required<string>()`, renders a Plex Mono uppercase-tracked label); `LangBadgeComponent` (`lang = input.required<'en' | 'hi' | 'de'>()`, renders a colored pill using the matching accent token + a text label, e.g. "hi · Hindi" — never color alone); `PackageCardComponent` (`name`, `description`, `status: 'published' | 'source-only'`, `npmUrl?`, `docsHref` inputs; renders the package-matrix card with a status line and Docs/npm links); `FaqItemComponent` (`question = input.required<string>()`, content projected via `<ng-content>`, rendered as a native `<details>/<summary>` — accessible and keyboard-operable with zero custom JS).
- Consumed by: the landing page (Task 10), the compare page (Task 17), the FAQ page (Task 19), and docs/recipe page templates (Tasks 12-16, for the frontmatter eyebrow).

- [ ] **Step 1: Implement `KeyEyebrowComponent`**

```ts
// apps/site/src/app/shared/key-eyebrow/key-eyebrow.component.ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-key-eyebrow',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p class="mb-3 font-mono text-xs uppercase tracking-wide text-accent-en">{{ text() }}</p>`,
})
export class KeyEyebrowComponent {
  readonly text = input.required<string>();
}
```

- [ ] **Step 2: Implement `LangBadgeComponent`**

```ts
// apps/site/src/app/shared/lang-badge/lang-badge.component.ts
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const LABELS = { en: 'English', hi: 'Hindi', de: 'German' } as const;
const CLASSES = {
  en: 'bg-accent-en/10 text-accent-en border-accent-en/30',
  hi: 'bg-accent-hi/10 text-accent-hi border-accent-hi/30',
  de: 'bg-accent-de/10 text-accent-de border-accent-de/30',
} as const;

@Component({
  selector: 'app-lang-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-xs" [class]="classes()">{{ lang() }} · {{ label() }}</span>`,
})
export class LangBadgeComponent {
  readonly lang = input.required<keyof typeof LABELS>();
  protected readonly label = computed(() => LABELS[this.lang()]);
  protected readonly classes = computed(() => CLASSES[this.lang()]);
}
```

- [ ] **Step 3: Implement `PackageCardComponent`**

```ts
// apps/site/src/app/shared/package-card/package-card.component.ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-package-card',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-lg border border-rule p-5">
      <p class="font-mono text-sm text-accent-en">{{ name() }}</p>
      <p class="mt-2 text-sm text-ink/80">{{ description() }}</p>
      <div class="mt-4 flex items-center justify-between text-xs">
        <span [class]="status() === 'published' ? 'text-accent-de' : 'text-ink/60'">
          {{ status() === 'published' ? 'Published on npm' : 'Not yet published — build from source' }}
        </span>
        <div class="flex gap-3">
          <a [routerLink]="docsHref()" class="underline">Docs</a>
          @if (npmUrl()) { <a [href]="npmUrl()" class="underline">npm</a> }
        </div>
      </div>
    </div>
  `,
})
export class PackageCardComponent {
  readonly name = input.required<string>();
  readonly description = input.required<string>();
  readonly status = input.required<'published' | 'source-only'>();
  readonly npmUrl = input<string>();
  readonly docsHref = input.required<string>();
}
```

- [ ] **Step 4: Implement `FaqItemComponent`**

```ts
// apps/site/src/app/shared/faq-item/faq-item.component.ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-faq-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <details class="border-b border-rule py-4">
      <summary class="cursor-pointer list-none font-medium marker:content-none">{{ question() }}</summary>
      <div class="mt-2 text-sm text-ink/75"><ng-content /></div>
    </details>
  `,
})
export class FaqItemComponent {
  readonly question = input.required<string>();
}
```

- [ ] **Step 5: Build and commit**

No dedicated tests required for these four (pure presentational, no logic beyond input→template binding — covered indirectly by the page-level tests in later tasks that render them).

```bash
npx nx build site --configuration=production
git add apps/site
git commit -m "feat(site): add presentational components (key eyebrow, lang badge, package card, faq item)"
```

---

## Task 7: Content build pipeline (Markdown → HTML + manifest)

**Files:**
- Create: `apps/site/scripts/build-content.mjs`, `apps/site/content/docs/.gitkeep`, `apps/site/content/recipes/.gitkeep`
- Modify: `apps/site/project.json` (add a `build-content` target; make `build` and `serve` depend on it via `dependsOn`)
- Add dependencies: `unified`, `remark-parse`, `remark-rehype`, `remark-gfm`, `rehype-slug`, `rehype-autolink-headings`, `rehype-pretty-code`, `shiki`, `rehype-stringify`, `gray-matter`, `zod`, `unist-util-visit`

**Interfaces:**
- Produces: `apps/site/generated/content-manifest.json` — an array of `{ kind: 'doc' | 'recipe'; slug: string[]; frontmatter: Record<string, unknown>; html: string; headings: { depth: number; text: string; id: string }[] }`. Also writes `apps/site/public/search-index.json` (title/description/href/section per entry) and `apps/site/generated/routes.json` (flat list of every route path, consumed by Task 15's sitemap generation).
- Consumed by: `ContentService` (Task 8) via a static JSON import of `content-manifest.json`.

- [ ] **Step 1: Install dependencies**

```bash
cd apps/site
npm install unified remark-parse remark-rehype remark-gfm rehype-slug rehype-autolink-headings rehype-pretty-code shiki rehype-stringify gray-matter zod unist-util-visit
```

- [ ] **Step 2: Define the frontmatter schema**

```js
// apps/site/scripts/build-content.mjs (top of file)
import { z } from 'zod';

const docFrontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
  eyebrow: z.string(),
  order: z.number(),
  section: z.string(),
});

const recipeFrontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
  eyebrow: z.string(),
  order: z.number(),
  packages: z.array(z.string()),
});
```

- [ ] **Step 3: Implement the Markdown → HTML compiler**

```js
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import matter from 'gray-matter';
import fs from 'node:fs';
import path from 'node:path';

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeSlug)
  .use(rehypeAutolinkHeadings, { behavior: 'wrap' })
  .use(rehypePrettyCode, { theme: { light: 'github-light', dark: 'github-dark' } })
  .use(rehypeStringify, { allowDangerousHtml: true });

function extractHeadings(markdown) {
  const headings = [];
  for (const line of markdown.split('\n')) {
    const m = /^(#{2,3})\s+(.+)$/.exec(line.trim());
    if (!m) continue;
    const depth = m[1].length;
    const text = m[2].trim();
    const id = text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
    headings.push({ depth, text, id });
  }
  return headings;
}

async function compile(markdown) {
  const file = await processor.process(markdown);
  return String(file);
}
```

Note `rehype-pretty-code`'s output uses plain `<pre><code>` elements — after compiling, wrap each resulting `<pre>` block in `<content-code-block>...</content-code-block>` with a small post-processing string replace or an additional rehype plugin operating on the hast tree (prefer a rehype plugin using `visit` over string replace, to avoid corrupting code content that happens to contain the literal text `<pre>`). Similarly, recognize a custom Markdown convention for tabs and callouts — since raw Markdown has no native syntax for these, author content using raw HTML blocks directly inside the `.md` files (Markdown passes through raw HTML unchanged, and `remark-rehype`'s `allowDangerousHtml: true` + `rehype-stringify`'s matching option preserves it), e.g.:

```md
<content-callout data-type="tip">

Preload the fallback chain before navigation, not after.

</content-callout>

<content-tabs>
<div data-tab-label="Static map">

\`\`\`ts
const translationMap = { en: {...}, es: {...} };
\`\`\`

</div>
<div data-tab-label="Lazy import">

\`\`\`ts
const translationResolvers = { en: () => import('./primeng/en') };
\`\`\`

</div>
</content-tabs>
```

Confirm blank lines around raw HTML blocks (required by CommonMark for Markdown content to keep rendering *inside* an HTML block) produce correctly nested output by testing with one real example file before writing all the content in later tasks.

- [ ] **Step 4: Implement the manifest/search-index/routes writer**

```js
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    return e.name.endsWith('.md') ? [full] : [];
  });
}

async function buildDocs(contentDir) {
  const dir = path.join(contentDir, 'docs');
  const entries = [];
  for (const file of walk(dir)) {
    const raw = fs.readFileSync(file, 'utf8');
    const { data, content } = matter(raw);
    const frontmatter = docFrontmatterSchema.parse(data);
    const slug = path.relative(dir, file).replace(/\.md$/, '').split(path.sep);
    const html = await compile(content);
    entries.push({ kind: 'doc', slug, frontmatter, html, headings: extractHeadings(content) });
  }
  return entries.sort((a, b) => a.frontmatter.order - b.frontmatter.order);
}

// buildRecipes(contentDir) follows the identical pattern against content/recipes,
// with recipeFrontmatterSchema and slug = path.basename(file, '.md') (flat, not nested).

async function main() {
  const contentDir = path.join(process.cwd(), 'content');
  const docs = await buildDocs(contentDir);
  const recipes = await buildRecipes(contentDir);

  fs.mkdirSync(path.join(process.cwd(), 'generated'), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), 'generated', 'content-manifest.json'), JSON.stringify({ docs, recipes }, null, 2));

  const searchIndex = [
    ...docs.map((d) => ({ title: d.frontmatter.title, description: d.frontmatter.description, href: `/docs/${d.slug.join('/')}`, section: d.frontmatter.section })),
    ...recipes.map((r) => ({ title: r.frontmatter.title, description: r.frontmatter.description, href: `/recipes/${r.slug}`, section: 'Recipes' })),
  ];
  fs.mkdirSync(path.join(process.cwd(), 'public'), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), 'public', 'search-index.json'), JSON.stringify(searchIndex, null, 2));

  const routes = [
    '/', '/docs', '/recipes', '/compare', '/changelog', '/faq',
    ...docs.map((d) => `/docs/${d.slug.join('/')}`),
    ...recipes.map((r) => `/recipes/${r.slug}`),
  ];
  fs.writeFileSync(path.join(process.cwd(), 'generated', 'routes.json'), JSON.stringify(routes, null, 2));

  console.log(`Compiled ${docs.length} docs, ${recipes.length} recipes.`);
}

main();
```

- [ ] **Step 5: Wire into Nx as a `build-content` target**

In `apps/site/project.json`:

```json
"build-content": {
  "executor": "nx:run-commands",
  "options": { "command": "node scripts/build-content.mjs", "cwd": "apps/site" }
}
```

Add `"dependsOn": ["build-content"]` to both the `build` and `serve` targets' configuration (or top-level `targets.build`/`targets.serve`, matching whichever `dependsOn` placement Nx 23's schema expects — verify against `nx show project site --web` or the JSON schema referenced at the top of `project.json`).

- [ ] **Step 6: Verify with one real content fixture**

Create one throwaway test file at `apps/site/content/docs/getting-started.md` (full real content for this file is written in Task 12 — for now just a minimal valid frontmatter + a heading + one of each: a code fence, a `<content-callout>`, a `<content-tabs>` block) and run:

```bash
node apps/site/scripts/build-content.mjs
cat apps/site/generated/content-manifest.json
cat apps/site/public/search-index.json
```

Expected: valid JSON, the code fence is syntax-highlighted and wrapped in `<content-code-block>`, the raw HTML blocks pass through intact.

- [ ] **Step 7: Commit**

```bash
git add apps/site
git commit -m "feat(site): add build-time Markdown content compiler and manifest generator"
```

---

## Task 8: ContentService

**Files:**
- Create: `apps/site/src/app/core/content.service.ts`, `apps/site/src/app/core/content.service.spec.ts`, `apps/site/src/app/core/content.types.ts`

**Interfaces:**
- Produces: `ContentService` (injectable) with `getAllDocs(): DocEntry[]`, `getDocBySlug(slug: string[]): DocEntry | null`, `getAllRecipes(): RecipeEntry[]`, `getRecipeBySlug(slug: string): RecipeEntry | null`, `getDocsNavTree(): NavSection[]`. Types `DocEntry`, `RecipeEntry`, `NavSection`, `Heading` in `content.types.ts`.
- Consumes: `apps/site/generated/content-manifest.json` (Task 7), imported directly as a TypeScript JSON module (`import manifest from '../../../generated/content-manifest.json'`) so the data is bundled at build time — no filesystem or HTTP access at runtime, works identically during prerendering and in the browser.

- [ ] **Step 1: Enable JSON module imports if not already enabled**

Check `apps/site/tsconfig.app.json` for `"resolveJsonModule": true` — add it if missing (it's usually enabled by default in Angular CLI-generated tsconfigs; confirm rather than assume).

- [ ] **Step 2: Write the failing test**

```ts
// apps/site/src/app/core/content.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { ContentService } from './content.service';

describe('ContentService', () => {
  it('lists all docs sorted by order', () => {
    const service = TestBed.inject(ContentService);
    const docs = service.getAllDocs();
    expect(Array.isArray(docs)).toBe(true);
    if (docs.length > 1) {
      expect(docs[0].frontmatter.order).toBeLessThanOrEqual(docs[1].frontmatter.order);
    }
  });

  it('gets a doc by slug', () => {
    const service = TestBed.inject(ContentService);
    const doc = service.getDocBySlug(['getting-started']);
    expect(doc === null || Array.isArray(doc.slug)).toBe(true);
  });

  it('returns null for an unknown slug', () => {
    const service = TestBed.inject(ContentService);
    expect(service.getDocBySlug(['does', 'not', 'exist'])).toBeNull();
  });

  it('groups docs into a nav tree by section', () => {
    const service = TestBed.inject(ContentService);
    const tree = service.getDocsNavTree();
    expect(Array.isArray(tree)).toBe(true);
  });
});
```

This test relies on `apps/site/generated/content-manifest.json` existing (produced by Task 7's `build-content` target) — run `node apps/site/scripts/build-content.mjs` first if it's not already present from Task 7's verification step.

- [ ] **Step 3: Run test to verify it fails**

```bash
node apps/site/scripts/build-content.mjs
npx nx test site --testFile=content.service.spec.ts
```

Expected: FAIL — `./content.service` doesn't exist.

- [ ] **Step 4: Implement types and service**

```ts
// apps/site/src/app/core/content.types.ts
export interface Heading { depth: number; text: string; id: string; }
export interface DocFrontmatter { title: string; description: string; eyebrow: string; order: number; section: string; }
export interface RecipeFrontmatter { title: string; description: string; eyebrow: string; order: number; packages: string[]; }
export interface DocEntry { kind: 'doc'; slug: string[]; frontmatter: DocFrontmatter; html: string; headings: Heading[]; }
export interface RecipeEntry { kind: 'recipe'; slug: string; frontmatter: RecipeFrontmatter; html: string; headings: Heading[]; }
export interface NavSection { section: string; items: { href: string; title: string; eyebrow: string }[]; }
```

```ts
// apps/site/src/app/core/content.service.ts
import { Injectable } from '@angular/core';
import manifest from '../../../generated/content-manifest.json';
import type { DocEntry, RecipeEntry, NavSection } from './content.types';

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly docs = manifest.docs as unknown as DocEntry[];
  private readonly recipes = manifest.recipes as unknown as RecipeEntry[];

  getAllDocs(): DocEntry[] {
    return this.docs;
  }

  getDocBySlug(slug: string[]): DocEntry | null {
    return this.docs.find((d) => d.slug.join('/') === slug.join('/')) ?? null;
  }

  getAllRecipes(): RecipeEntry[] {
    return this.recipes;
  }

  getRecipeBySlug(slug: string): RecipeEntry | null {
    return this.recipes.find((r) => r.slug === slug) ?? null;
  }

  getDocsNavTree(): NavSection[] {
    const sections = new Map<string, NavSection>();
    for (const doc of this.docs) {
      const key = doc.frontmatter.section;
      if (!sections.has(key)) sections.set(key, { section: key, items: [] });
      sections.get(key)!.items.push({ href: `/docs/${doc.slug.join('/')}`, title: doc.frontmatter.title, eyebrow: doc.frontmatter.eyebrow });
    }
    return Array.from(sections.values());
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx nx test site --testFile=content.service.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/site
git commit -m "feat(site): add ContentService reading the build-time content manifest"
```

---

## Task 9: Search palette (Angular CDK)

**Files:**
- Create: `apps/site/src/app/shared/search-palette/search-palette.component.ts`, `apps/site/src/app/shared/search-palette/search-palette.component.spec.ts`
- Modify: `apps/site/src/app/app.ts` (mount `<app-search-palette>` once, alongside the header/footer)

**Interfaces:**
- Produces: `SearchPaletteComponent` — opens on `Cmd+K`/`Ctrl+K` or a click on `#search-trigger` (Task 4's header button), using `@angular/cdk/overlay` for the dialog surface and backdrop, `@angular/cdk/a11y`'s `FocusTrap` (via the `cdkTrapFocus` directive) so focus can't escape while open, and a filtered list built from `fetch('/search-index.json')` (the file Task 7 generates into `public/`). `Escape` closes and returns focus to `#search-trigger`.

- [ ] **Step 1: Install CDK a11y/overlay if not already present**

```bash
npm ls @angular/cdk
```

Confirm it's already a workspace dependency (it is, per this repo's existing `@angular/cdk` devDependency); if the version doesn't match the rest of the Angular 22 upgrade, bump it to match.

- [ ] **Step 2: Write the failing test**

```ts
// apps/site/src/app/shared/search-palette/search-palette.component.spec.ts
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { SearchPaletteComponent } from './search-palette.component';

const items = [
  { title: 'Getting started', description: 'Install and configure.', href: '/docs/getting-started', section: 'Docs' },
  { title: 'Route-scoped catalogs', description: 'Load catalogs per route.', href: '/recipes/route-scoped-catalogs', section: 'Recipes' },
];

describe('SearchPaletteComponent', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve(items) }) as unknown as typeof fetch;
    document.body.innerHTML = '<button id="search-trigger">Search</button>';
  });

  it('opens on Cmd+K and filters results as the user types', async () => {
    const user = userEvent.setup();
    await render(SearchPaletteComponent);

    await user.keyboard('{Meta>}k{/Meta}');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await user.type(screen.getByRole('combobox'), 'route');
    expect(await screen.findByText('Route-scoped catalogs')).toBeInTheDocument();
    expect(screen.queryByText('Getting started')).not.toBeInTheDocument();
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    await render(SearchPaletteComponent);
    await user.keyboard('{Meta>}k{/Meta}');
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.getElementById('search-trigger')).toHaveFocus();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx nx test site --testFile=search-palette.component.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement `SearchPaletteComponent`**

```ts
// apps/site/src/app/shared/search-palette/search-palette.component.ts
import { ChangeDetectionStrategy, Component, HostListener, OnInit, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';

interface SearchItem { title: string; description: string; href: string; section: string; }

@Component({
  selector: 'app-search-palette',
  standalone: true,
  imports: [A11yModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 pt-24" (click)="close()">
        <div role="dialog" aria-modal="true" aria-label="Search" cdkTrapFocus cdkTrapFocusAutoCapture (click)="$event.stopPropagation()" class="w-[90vw] max-w-lg overflow-hidden rounded-lg border border-rule bg-paper shadow-xl">
          <input
            #searchInput
            role="combobox"
            aria-expanded="true"
            [attr.aria-controls]="'search-results'"
            autofocus
            placeholder="Search docs and recipes..."
            class="w-full border-b border-rule p-4 outline-none"
            (input)="query.set($any($event.target).value)"
          />
          <ul id="search-results" class="max-h-80 overflow-y-auto p-2">
            @for (item of filtered(); track item.href) {
              <li>
                <button type="button" (click)="navigate(item.href)" class="w-full rounded-md p-3 text-left hover:bg-accent-en/10">
                  <p class="text-sm font-medium">{{ item.title }}</p>
                  <p class="text-xs text-ink/60">{{ item.description }}</p>
                </button>
              </li>
            } @empty {
              <li class="p-4 text-sm text-ink/60">No results found.</li>
            }
          </ul>
        </div>
      </div>
    }
  `,
})
export class SearchPaletteComponent implements OnInit {
  protected readonly open = signal(false);
  protected readonly query = signal('');
  private readonly items = signal<SearchItem[]>([]);

  protected readonly filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    if (!q) return this.items();
    return this.items().filter((i) => `${i.title} ${i.description}`.toLowerCase().includes(q));
  });

  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    fetch('/search-index.json').then((r) => r.json()).then((data) => this.items.set(data));
    document.getElementById('search-trigger')?.addEventListener('click', () => this.openPalette());
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.open() ? this.close() : this.openPalette();
    }
    if (e.key === 'Escape' && this.open()) this.close();
  }

  navigate(href: string): void {
    this.close();
    this.router.navigateByUrl(href);
  }

  private openPalette(): void {
    this.query.set('');
    this.open.set(true);
  }

  close(): void {
    this.open.set(false);
    document.getElementById('search-trigger')?.focus();
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx nx test site --testFile=search-palette.component.spec.ts
```

Expected: PASS. If `cdkTrapFocus`'s auto-capture interferes with the Escape-focus-restoration test's timing, adjust to call `.focus()` explicitly in `close()` after the overlay's `hidden`/removal — the test's behavioral expectation (focus ends on `#search-trigger` after Escape) is what matters, not the exact CDK API path to get there.

- [ ] **Step 6: Mount in the app shell, build, commit**

```ts
// apps/site/src/app/app.ts — add SearchPaletteComponent to imports and template: <app-search-palette />
```

```bash
npx nx build site --configuration=production
git add apps/site
git commit -m "feat(site): add Cmd+K search palette using Angular CDK"
```

---

## Task 10: Hero language-cycle component (real dogfooding)

**Files:**
- Create: `apps/site/src/app/features/hero-lang-cycle/hero-lang-cycle.component.ts`, `apps/site/src/app/features/hero-lang-cycle/hero-lang-cycle.component.spec.ts`
- Modify: `apps/site/package.json` (add `@ngx-runtime-i18n/angular` and `@ngx-runtime-i18n/core` as dependencies — npm workspaces will resolve them to `libs/runtime-i18n-angular`/`libs/runtime-i18n` in this monorepo automatically, the same way `apps/demo`/`apps/demo-ssr` already depend on them)

**Interfaces:**
- Produces: `HeroLangCycleComponent` — a self-contained component that provides its own scoped `provideRuntimeI18n()` instance (via the component's own `providers` array, isolated from the rest of the app's DI tree), with a tiny two-key catalog for `en`/`hi`/`de`, and cycles `I18nService.setLang()` through those three languages every 2.2s, displaying the translated word via the real `I18nService.t()` / `lang()` signal. Pauses on hover/focus. Under `prefers-reduced-motion`, the cycle timer never starts and the component stays on `defaultLang` (`en`).

- [ ] **Step 1: Add the workspace dependencies**

```bash
cd apps/site
npm pkg set dependencies.@ngx-runtime-i18n/angular="^2.1.0"
npm pkg set dependencies.@ngx-runtime-i18n/core="^2.1.0"
cd ../..
npm install
```

Verify `node_modules/@ngx-runtime-i18n/angular` resolves to the workspace package (`ls -la node_modules/@ngx-runtime-i18n/angular` should show a symlink into `libs/runtime-i18n-angular`, not a separately-installed copy).

- [ ] **Step 2: Write the failing test**

```ts
// apps/site/src/app/features/hero-lang-cycle/hero-lang-cycle.component.spec.ts
import { render, screen } from '@testing-library/angular';
import { HeroLangCycleComponent } from './hero-lang-cycle.component';

describe('HeroLangCycleComponent', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('starts on the English word from the real I18nService', async () => {
    await render(HeroLangCycleComponent);
    expect(await screen.findByText('everyone')).toBeInTheDocument();
  });

  it('cycles to Hindi then German over time', async () => {
    await render(HeroLangCycleComponent);
    await screen.findByText('everyone');

    jest.advanceTimersByTime(2300);
    expect(await screen.findByText('सभी')).toHaveAttribute('lang', 'hi');

    jest.advanceTimersByTime(2300);
    expect(await screen.findByText('alle')).toHaveAttribute('lang', 'de');
  });

  it('does not start the cycle when reduced motion is preferred', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });

    await render(HeroLangCycleComponent);
    await screen.findByText('everyone');
    jest.advanceTimersByTime(5000);
    expect(screen.queryByText('सभी')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx nx test site --testFile=hero-lang-cycle.component.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement `HeroLangCycleComponent`**

```ts
// apps/site/src/app/features/hero-lang-cycle/hero-lang-cycle.component.ts
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject } from '@angular/core';
import { provideRuntimeI18n, I18nService } from '@ngx-runtime-i18n/angular';

const ORDER = ['en', 'hi', 'de'] as const;
const ACCENT_CLASS: Record<(typeof ORDER)[number], string> = {
  en: 'text-accent-en',
  hi: 'text-accent-hi',
  de: 'text-accent-de',
};

const CATALOG: Record<(typeof ORDER)[number], { hero: { audience: string } }> = {
  en: { hero: { audience: 'everyone' } },
  hi: { hero: { audience: 'सभी' } },
  de: { hero: { audience: 'alle' } },
};

@Component({
  selector: 'app-hero-lang-cycle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideRuntimeI18n({
      defaultLang: 'en',
      supported: [...ORDER],
      fetchCatalog: (lang) => Promise.resolve(CATALOG[lang as (typeof ORDER)[number]]),
    }),
  ],
  template: `
    <span
      class="font-display"
      [class]="accentClass()"
      [attr.lang]="i18n.lang()"
      (mouseenter)="paused = true"
      (mouseleave)="paused = false"
      (focus)="paused = true"
      (blur)="paused = false"
    >{{ i18n.t('hero.audience') }}</span>
  `,
})
export class HeroLangCycleComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);
  protected paused = false;

  protected readonly accentClass = computed(() => ACCENT_CLASS[this.i18n.lang() as (typeof ORDER)[number]]);

  ngOnInit(): void {
    const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    let index = 0;
    const interval = setInterval(() => {
      if (this.paused) return;
      index = (index + 1) % ORDER.length;
      this.i18n.setLang(ORDER[index]);
    }, 2200);

    this.destroyRef.onDestroy(() => clearInterval(interval));
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx nx test site --testFile=hero-lang-cycle.component.spec.ts
```

Expected: PASS. If `I18nService`'s actual API surface differs in any signature from what's assumed above (check `libs/runtime-i18n-angular/src` directly if the test fails in a way that suggests an API mismatch, e.g. `t()` requiring a params argument even when the catalog has none, or `setLang` being async and needing to be awaited before the signal updates) — adjust to match the real, current API rather than the assumption here, and note the correction in your report.

- [ ] **Step 6: Commit**

```bash
git add apps/site package.json package-lock.json
git commit -m "feat(site): add hero language-cycle component powered by the real @ngx-runtime-i18n/angular package"
```

---

## Task 11: Landing page

**Files:**
- Modify: `apps/site/src/app/app.routes.ts` (add the `/` route), root component or a new `apps/site/src/app/pages/home/home.component.ts`
- Create: `apps/site/src/app/pages/home/home.component.ts`, `apps/site/src/app/pages/home/home.component.spec.ts`, `apps/site/src/app/features/feature-grid/feature-grid.component.ts`, `apps/site/src/app/features/package-matrix/package-matrix.component.ts`

**Interfaces:**
- Produces: the `/` route.
- Consumes: `HeroLangCycleComponent` (Task 10), `KeyEyebrowComponent`/`PackageCardComponent` (Task 6), `<content-tabs>` (Task 5, referenced directly in this component's template via `CUSTOM_ELEMENTS_SCHEMA`).

- [ ] **Step 1: Re-verify feature and package facts before writing copy**

Re-read root `README.md`'s "Features" and "Packages" sections fresh (not from an earlier session's memory) and re-run `npm view @ngx-runtime-i18n/<pkg> version` for all six packages, since publish status is exactly the kind of fact that can silently drift.

- [ ] **Step 2: Implement `FeatureGridComponent`**

Six feature cards (fallback chains, ICU-lite formatting, type-safe keys, TransferState SSR, catalog caching modes, DevTools bridge), each `{ title, body }` sourced from the README facts confirmed in Step 1 — same content as the original Next.js draft's feature grid (framework-agnostic facts), rendered as an Angular `@for` loop over a local readonly array, styled with the same card treatment used elsewhere (`rounded-lg border border-rule p-5`).

- [ ] **Step 3: Implement `PackageMatrixComponent`**

Six `<app-package-card>` entries built from the Step 1 facts, in the same shape as `PackageCardComponent`'s inputs (`name`, `description`, `status`, `npmUrl?`, `docsHref`).

- [ ] **Step 4: Implement `HomeComponent`**

```ts
// apps/site/src/app/pages/home/home.component.ts
import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KeyEyebrowComponent } from '../../shared/key-eyebrow/key-eyebrow.component';
import { HeroLangCycleComponent } from '../../features/hero-lang-cycle/hero-lang-cycle.component';
import { FeatureGridComponent } from '../../features/feature-grid/feature-grid.component';
import { PackageMatrixComponent } from '../../features/package-matrix/package-matrix.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, KeyEyebrowComponent, HeroLangCycleComponent, FeatureGridComponent, PackageMatrixComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // required for the <content-tabs>/<content-code-block> elements used below
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.component.html',
})
export class HomeComponent {}
```

Template (`home.component.html`) sections, in order: hero (`app-key-eyebrow` "hero.tagline", `<h1>` headline with `<app-hero-lang-cycle>` inline, subhead, "Get started"/"View on GitHub" CTAs), feature grid (`app-key-eyebrow` "features.grid" + `<app-feature-grid>`), code showcase (`app-key-eyebrow` "hero.code-showcase" + a `<content-tabs>` block with two `data-tab-label` panels — "app.config.ts" showing the `provideRuntimeI18n()` setup snippet, "template.html" showing the `i18n` pipe usage snippet, both sourced verbatim from root README's Usage section), package matrix (`app-key-eyebrow` "packages.matrix" + `<app-package-matrix>`), compare teaser (`app-key-eyebrow` "compare.teaser" + one paragraph linking to `/compare`).

- [ ] **Step 5: Add the route**

```ts
// apps/site/src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent) },
];
```

- [ ] **Step 6: Write a smoke test, run it, verify build**

```ts
// apps/site/src/app/pages/home/home.component.spec.ts
import { render, screen } from '@testing-library/angular';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  it('renders the hero headline and a Get started link', async () => {
    await render(HomeComponent);
    expect(screen.getByRole('link', { name: /get started/i })).toBeInTheDocument();
  });
});
```

```bash
npx nx test site --testFile=home.component.spec.ts
npx nx build site --configuration=production
```

Expected: test passes; build produces a prerendered `/` route with real content (not an empty shell).

- [ ] **Step 7: Commit**

```bash
git add apps/site
git commit -m "feat(site): build the landing page"
```

---

## Task 12: Docs shell (layout, sidebar, TOC) and Getting Started page

**Files:**
- Create: `apps/site/src/app/pages/docs/docs-layout.component.ts`, `apps/site/src/app/pages/docs/docs-index.component.ts`, `apps/site/src/app/pages/docs/doc-page.component.ts`, `apps/site/src/app/shared/docs-sidebar/docs-sidebar.component.ts`, `apps/site/src/app/shared/toc/toc.component.ts`, `apps/site/content/docs/getting-started.md`
- Modify: `apps/site/src/app/app.routes.ts`, `apps/site/src/app/app.routes.server.ts`

**Interfaces:**
- Produces: `/docs` (index) and `/docs/:section/:slug` (or a catch-all `/docs/**` matched against `ContentService`, whichever the route-param shape requires — see Step 4) rendered via one `DocPageComponent`, wrapped in `DocsLayoutComponent`.
- Consumes: `ContentService` (Task 8), `DocsSidebarComponent`/`TocComponent` (this task), `KeyEyebrowComponent` (Task 6).

- [ ] **Step 1: Write `content/docs/getting-started.md`**

Frontmatter: `title: Getting started`, `description: Install the core and Angular packages and register provideRuntimeI18n().`, `eyebrow: docs.getting-started`, `order: 0`, `section: Start here`. Body sourced directly from root `README.md`'s "Install"/"Usage" sections and `libs/runtime-i18n-angular/README.md`'s "Directory layout" section (re-read both fresh): install command, the recommended `src/public/i18n/<lang>.json` layout, the full `provideRuntimeI18n()` config example, a minimal component example using `I18nPipe` and `I18nService.t()`. Use `<content-callout data-type="tip">` for the "catalogs must be served from `/i18n/<lang>.json`" note.

- [ ] **Step 2: Implement `DocsSidebarComponent` and `TocComponent`**

```ts
// apps/site/src/app/shared/docs-sidebar/docs-sidebar.component.ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import type { NavSection } from '../../core/content.types';

@Component({
  selector: 'app-docs-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Documentation" class="text-sm">
      @for (section of tree(); track section.section) {
        <div class="mb-6">
          <p class="mb-2 font-mono text-xs uppercase text-ink/50">{{ section.section }}</p>
          <ul class="space-y-1">
            @for (item of section.items; track item.href) {
              <li>
                <a [routerLink]="item.href" routerLinkActive="bg-accent-en/10 text-accent-en" [routerLinkActiveOptions]="{ exact: true }" class="block rounded-md px-2 py-1 text-ink/80 hover:text-accent-en">
                  {{ item.title }}
                </a>
              </li>
            }
          </ul>
        </div>
      }
    </nav>
  `,
})
export class DocsSidebarComponent {
  readonly tree = input.required<NavSection[]>();
}
```

`RouterLinkActive` supplies `aria-current="page"` automatically on the matched link (Angular Router sets `aria-current` when `ariaCurrentWhenActive` is configured — set `[ariaCurrentWhenActive]="'page'"` explicitly on the `routerLinkActive` directive to guarantee this rather than relying on a default).

```ts
// apps/site/src/app/shared/toc/toc.component.ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Heading } from '../../core/content.types';

@Component({
  selector: 'app-toc',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (headings().length > 0) {
      <nav aria-label="On this page" class="sticky top-20 hidden text-sm lg:block">
        <p class="mb-2 font-mono text-xs uppercase text-ink/50">On this page</p>
        <ul class="space-y-1">
          @for (h of headings(); track h.id) {
            <li [style.padding-left.px]="(h.depth - 2) * 12"><a [href]="'#' + h.id" class="text-ink/70 hover:text-accent-en">{{ h.text }}</a></li>
          }
        </ul>
      </nav>
    }
  `,
})
export class TocComponent {
  readonly headings = input.required<Heading[]>();
}
```

- [ ] **Step 3: Implement `DocsLayoutComponent` and `DocsIndexComponent`**

`DocsLayoutComponent` wraps `<router-outlet>` with a two-column layout (`<app-docs-sidebar>` + content), fetching `ContentService.getDocsNavTree()` once. `DocsIndexComponent` lists every section/item from the same nav tree as plain links, matching the original Next.js draft's `/docs` index structure.

- [ ] **Step 4: Implement `DocPageComponent`**

```ts
// apps/site/src/app/pages/docs/doc-page.component.ts
import { ChangeDetectionStrategy, Component, DOCUMENT, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ContentService } from '../../core/content.service';
import { KeyEyebrowComponent } from '../../shared/key-eyebrow/key-eyebrow.component';
import { TocComponent } from '../../shared/toc/toc.component';
import type { DocEntry } from '../../core/content.types';

@Component({
  selector: 'app-doc-page',
  standalone: true,
  imports: [KeyEyebrowComponent, TocComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (doc(); as d) {
      <div class="flex gap-8">
        <article class="min-w-0 flex-1">
          <app-key-eyebrow [text]="d.frontmatter.eyebrow" />
          <h1 class="font-display text-3xl font-semibold">{{ d.frontmatter.title }}</h1>
          <p class="mt-2 text-ink/70">{{ d.frontmatter.description }}</p>
          <div class="prose prose-neutral mt-8 max-w-none dark:prose-invert" [innerHTML]="html()"></div>
        </article>
        <aside class="w-48 shrink-0"><app-toc [headings]="d.headings" /></aside>
      </div>
    }
  `,
})
export class DocPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly content = inject(ContentService);
  private readonly document = inject(DOCUMENT);
  protected readonly doc = signal<DocEntry | null>(null);
  protected readonly html = computed(() => this.doc()?.html ?? '');

  ngOnInit(): void {
    const slugParam = this.route.snapshot.paramMap.get('slug') ?? '';
    const slug = slugParam.split('/').filter(Boolean);
    this.doc.set(this.content.getDocBySlug(slug));
  }
}
```

Bind `[innerHTML]` directly to the string (Angular's `DomSanitizer` treats `[innerHTML]` bindings with an untyped string as requiring sanitization by default and will strip nothing meaningful from our own trusted, build-time-compiled content — verify this is sufficient by checking the rendered `<content-code-block>`/`<content-tabs>`/`<content-callout>` custom-element tags survive sanitization; if Angular's default sanitizer strips unknown custom-element tags, wrap the value in `DomSanitizer.bypassSecurityTrustHtml()` in a computed instead — confirm empirically with the actual build output rather than assuming either way).

- [ ] **Step 5: Wire up routes**

```ts
// apps/site/src/app/app.routes.ts (additions)
{
  path: 'docs',
  loadComponent: () => import('./pages/docs/docs-layout.component').then((m) => m.DocsLayoutComponent),
  children: [
    { path: '', loadComponent: () => import('./pages/docs/docs-index.component').then((m) => m.DocsIndexComponent) },
    { path: '**', loadComponent: () => import('./pages/docs/doc-page.component').then((m) => m.DocPageComponent) },
  ],
},
```

```ts
// apps/site/src/app/app.routes.server.ts (additions, before the existing catch-all)
import { inject } from '@angular/core';
import { RenderMode, ServerRoute } from '@angular/ssr';
import { ContentService } from './core/content.service';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'docs/:section/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const content = inject(ContentService);
      return content.getAllDocs()
        .filter((d) => d.slug.length === 2)
        .map((d) => ({ section: d.slug[0], slug: d.slug[1] }));
    },
  },
  { path: '**', renderMode: RenderMode.Prerender },
];
```

Adjust the Angular Router's own `docs` child route path (Step 5's `path: '**'` inside the `docs` children array) and this server-route param shape together so they agree — if all doc slugs turn out to be exactly two segments (`core-concepts/fallback-chains`, `packages/angular`, etc., confirmed once Task 13/14's files exist), prefer the explicit `docs/:section/:slug` shape shown above over a bare wildcard, since it lets `getPrerenderParams()` enumerate exact values instead of relying on the wildcard catch-all's less precise `'**'` param.

- [ ] **Step 6: Verify build and commit**

```bash
npx nx build site --configuration=production
```

Expected: `/docs` and `/docs/getting-started` (or `/docs/start-here/getting-started` — resolve the exact path shape against whatever slug `getting-started.md`'s location produces, and adjust its frontmatter/directory placement if a two-segment shape is required for route consistency with the rest of `/docs/*`) both generate.

```bash
git add apps/site
git commit -m "feat(site): add docs layout, sidebar, TOC, and getting-started page"
```

---

## Task 13: Core concepts pages (5 pages)

**Files:**
- Create: `apps/site/content/docs/core-concepts/fallback-chains.md`, `.../caching.md`, `.../icu-lite.md`, `.../type-safety.md`, `.../ssr-hydration.md`

**Interfaces:** none — picked up automatically by `ContentService`/`getPrerenderParams()` once `build-content` reruns.

Each uses `section: Core concepts`, `order` 1-5. Re-read the cited README section fresh before writing each page (facts may have shifted since this plan was written, given the repo's Angular 22 upgrade touched some of these APIs — e.g. `provideRuntimeI18nSsr()`'s return type changed to `EnvironmentProviders` per `CHANGELOG.md`'s v2.1.0 entry, which affects the SSR/hydration page).

- [ ] **Step 1: `fallback-chains.md`** (`eyebrow: docs.core-concepts.fallback-chains`, `order: 1`) — source: root README "Fallback chains & catalog caching" + `libs/runtime-i18n-angular/README.md` "Fallback chains". Exact resolution order (active language → fallbacks in order → `defaultLang`), deduping/trimming against `supported`, one dev-mode warning before `onMissingKey`.

- [ ] **Step 2: `caching.md`** (`eyebrow: docs.core-concepts.caching`, `order: 2`) — source: same two READMEs, "Catalog caching" sections. All three `cacheMode` values, `cacheKeyPrefix`, server never touching `localStorage`. `<content-callout data-type="note">` for the SSR-determinism point.

- [ ] **Step 3: `icu-lite.md`** (`eyebrow: docs.core-concepts.icu-lite`, `order: 3`) — source: `libs/runtime-i18n/README.md` "ICU-lite support". Supported vs. not-supported lists exactly as documented — this page is where overclaiming would be actively misleading, stay precise. `<content-callout data-type="warning">` for the "not a full ICU implementation" caveat.

- [ ] **Step 4: `type-safety.md`** (`eyebrow: docs.core-concepts.type-safety`, `order: 4`) — source: Angular README "Type Safety". The `I18nSchema` module augmentation example verbatim, the resulting compile errors for an invalid key and a missing param, `DeepKeys<T>`/`ExtractParams<S>` exported for advanced use, plain `string` fallback with no schema declared.

- [ ] **Step 5: `ssr-hydration.md`** (`eyebrow: docs.core-concepts.ssr-hydration`, `order: 5`) — source: Angular README "SSR + Hydration", re-read fresh given the v2.1.0 `EnvironmentProviders` return-type change noted above — confirm whether that change affects the exact code sample this page shows and update the sample accordingly if so. Cover `provideRuntimeI18nSsr(snapshot)`, `RuntimeI18nSsrSnapshot`, `stateKeyPrefix`, point to `apps/demo-ssr`. Cross-link to `/recipes/ssr-with-express` (Task 15).

- [ ] **Step 6: Rebuild content, verify, commit**

```bash
node apps/site/scripts/build-content.mjs
npx nx build site --configuration=production
git add apps/site
git commit -m "docs(site): add core concepts pages (fallback chains, caching, ICU-lite, type safety, SSR/hydration)"
```

---

## Task 14: Package documentation pages (6 pages)

**Files:**
- Create: `apps/site/content/docs/packages/core.md`, `angular.md`, `primeng.md`, `material.md`, `schematics.md`, `cli.md`

All use `section: Packages`, `order` 1-6. Re-verify publish status per package via `npm view @ngx-runtime-i18n/<pkg> version` immediately before writing each file's status callout — this is the single fact most likely to have changed since the plan was written.

- [ ] **Step 1: `core.md`** (`eyebrow: docs.packages.core`) — source: `libs/runtime-i18n/README.md` in full. `formatIcu(...)` signature, `Catalog`/`RuntimeI18nConfig` types, catalog JSON shape, "Pitfalls & Notes".

- [ ] **Step 2: `angular.md`** (`eyebrow: docs.packages.angular`) — source: `libs/runtime-i18n-angular/README.md` in full (the largest page). Peer support range (re-check the exact current range via `npm view @ngx-runtime-i18n/angular peerDependencies` rather than assuming `>=16 <21` from the pre-upgrade README text — the v2.1.0 changelog widened this to admit Angular 22), full `provideRuntimeI18n(config, options)` option table, `I18nService` signals/methods, `I18nPipe`, `I18nCompatService`, `t$()`, `withI18nScope()` resolution order, "Pitfalls & Gotchas" verbatim.

- [ ] **Step 3: `primeng.md`** (`eyebrow: docs.packages.primeng`) — source: `libs/runtime-i18n-primeng/README.md` in full. Install, `providePrimeNgRuntimeI18n({ resolveTranslation, onApplied })`, lazy-resolver pattern (use `<content-tabs>` for the static-map vs. lazy-import variants).

- [ ] **Step 4: `material.md`** (`eyebrow: docs.packages.material`) — source: `libs/runtime-i18n-material/README.md` in full. Not-yet-published `<content-callout data-type="warning">` (confirm this is still accurate via `npm view` first), per-language label file pattern, `provideMaterialRuntimeI18n(...)`, full `MaterialI18nLabels` interface, optional-injection/caching notes.

- [ ] **Step 5: `schematics.md`** (`eyebrow: docs.packages.schematics`) — source: `libs/runtime-i18n-schematics/README.md` in full. Not-yet-published callout (verify), the four `ng add` steps, full options table.

- [ ] **Step 6: `cli.md`** (`eyebrow: docs.packages.cli`) — source: `tools/cli/README.md` in full. Not-yet-published callout (verify), `ngx-i18n` binary, `extract`/`check` commands with full option tables, "Typical CI usage" pattern. Cross-link to `/recipes/ci-catalog-validation` (Task 16).

- [ ] **Step 7: Rebuild content, verify, commit**

```bash
node apps/site/scripts/build-content.mjs
npx nx build site --configuration=production
git add apps/site
git commit -m "docs(site): add package documentation pages for all six packages"
```

---

## Task 15: Recipes shell (layout, index) and first three recipes

**Files:**
- Create: `apps/site/src/app/pages/recipes/recipes-layout.component.ts`, `apps/site/src/app/pages/recipes/recipes-index.component.ts`, `apps/site/src/app/pages/recipes/recipe-page.component.ts`, `apps/site/content/recipes/ssr-with-express.md`, `route-scoped-catalogs.md`, `preloading-and-caching.md`
- Modify: `apps/site/src/app/app.routes.ts`, `apps/site/src/app/app.routes.server.ts`

**Interfaces:**
- Produces: `/recipes`, `/recipes/:slug`.
- Consumes: `ContentService`, `TocComponent`, `KeyEyebrowComponent`.

- [ ] **Step 1: Implement `RecipePageComponent`** — same shape as `DocPageComponent` (Task 12) but reading `ContentService.getRecipeBySlug(slug)`, and additionally rendering the recipe's `frontmatter.packages` as a row of small pill badges above the content.

- [ ] **Step 2: Implement `RecipesLayoutComponent`/`RecipesIndexComponent`** — index lists every recipe as a card (title + description) linking to `/recipes/:slug`, matching the original Next.js draft's index structure.

- [ ] **Step 3: Write the three recipe files**

`ssr-with-express.md` (`eyebrow: recipes.ssr-with-express`, `order: 1`, `packages: ['@ngx-runtime-i18n/angular']`) — source: Angular README "SSR + Hydration" + root README "SSR example" (`apps/demo-ssr`, Express + Angular SSR, `dist/browser/i18n`, `i18nServerProviders`, TransferState reuse). Note the `EnvironmentProviders` return-type change from v2.1.0 if it affects this recipe's code sample (re-check).

`route-scoped-catalogs.md` (`eyebrow: recipes.route-scoped-catalogs`, `order: 2`, `packages: ['@ngx-runtime-i18n/angular']`) — source: Angular README "Route-Scoped Catalogs" verbatim: `withI18nScope('checkout')`, `fetchCatalog(lang, signal, scope)` contract, resolution order, `DestroyRef` cleanup.

`preloading-and-caching.md` (`eyebrow: recipes.preloading-and-caching`, `order: 3`, `packages: ['@ngx-runtime-i18n/angular']`) — source: Angular README "Switching & preloading": `switching()`/`activeSwitchLang()`, `preloadLang`/`preloadLangs`/`preloadFallbackChain`, the three worked examples.

- [ ] **Step 4: Wire routes**

```ts
// app.routes.ts additions
{
  path: 'recipes',
  loadComponent: () => import('./pages/recipes/recipes-layout.component').then((m) => m.RecipesLayoutComponent),
  children: [
    { path: '', loadComponent: () => import('./pages/recipes/recipes-index.component').then((m) => m.RecipesIndexComponent) },
    { path: ':slug', loadComponent: () => import('./pages/recipes/recipe-page.component').then((m) => m.RecipePageComponent) },
  ],
},
```

```ts
// app.routes.server.ts — insert before the final catch-all
{
  path: 'recipes/:slug',
  renderMode: RenderMode.Prerender,
  async getPrerenderParams() {
    const content = inject(ContentService);
    return content.getAllRecipes().map((r) => ({ slug: r.slug }));
  },
},
```

- [ ] **Step 5: Rebuild content, verify build, commit**

```bash
node apps/site/scripts/build-content.mjs
npx nx build site --configuration=production
git add apps/site
git commit -m "feat(site): add recipes layout, index, and first three recipes"
```

---

## Task 16: Remaining six recipes

**Files:**
- Create: `apps/site/content/recipes/type-safe-catalogs.md`, `material-adapter.md`, `primeng-adapter.md`, `ci-catalog-validation.md`, `ng-add-schematic.md`, `migrating-from-ngx-translate.md`

- [ ] **Step 1: `type-safe-catalogs.md`** (`eyebrow: recipes.type-safe-catalogs`, `order: 4`, `packages: ['@ngx-runtime-i18n/core', '@ngx-runtime-i18n/angular']`) — Angular README "Type Safety", expanded into a full walkthrough (declare `src/i18n.d.ts`, augment `I18nSchema`, valid/invalid `t()` calls, `DeepKeys`/`ExtractParams`).

- [ ] **Step 2: `material-adapter.md`** (`eyebrow: recipes.material-adapter`, `order: 5`, `packages: ['@ngx-runtime-i18n/material']`) — `libs/runtime-i18n-material/README.md` "Usage" end to end. Not-yet-published callout (re-verify).

- [ ] **Step 3: `primeng-adapter.md`** (`eyebrow: recipes.primeng-adapter`, `order: 6`, `packages: ['@ngx-runtime-i18n/primeng']`) — `libs/runtime-i18n-primeng/README.md` "Setup"/"Translation resolvers", the static-map vs. lazy-resolver patterns side by side via `<content-tabs>`.

- [ ] **Step 4: `ci-catalog-validation.md`** (`eyebrow: recipes.ci-catalog-validation`, `order: 7`, `packages: ['@ngx-runtime-i18n/cli']`) — `tools/cli/README.md` in full, the `extract`→`check --fail-on-missing` two-step CI pattern, `--fail-on-unused` as an optional stricter mode. Not-yet-published callout (re-verify).

- [ ] **Step 5: `ng-add-schematic.md`** (`eyebrow: recipes.ng-add-schematic`, `order: 8`, `packages: ['@ngx-runtime-i18n/schematics']`) — `libs/runtime-i18n-schematics/README.md` in full. Not-yet-published callout (re-verify).

- [ ] **Step 6: `migrating-from-ngx-translate.md`** (`eyebrow: recipes.migrating-from-ngx-translate`, `order: 9`, `packages: ['@ngx-runtime-i18n/angular']`) — re-verify ngx-translate's current API/version with a fresh web search before writing (public-facing content about a competitor). Structure as a concept-mapping table (`TranslateService.instant()` → `I18nService.t()`, `TranslateService.get()` → `I18nService.t$()`, `TranslatePipe` → `I18nPipe`, language-change subscription → `lang()` signal or `I18nCompatService.lang$`) plus one worked component conversion. State plainly this is a migration guide, not a claim that switching is trivial in every codebase.

- [ ] **Step 7: Rebuild content, verify, commit**

```bash
node apps/site/scripts/build-content.mjs
npx nx build site --configuration=production
git add apps/site
git commit -m "docs(site): add remaining six recipes"
```

---

## Task 17: Compare page

**Files:**
- Create: `apps/site/src/app/pages/compare/compare.component.ts`, `apps/site/src/app/shared/compare-table/compare-table.component.ts`
- Modify: `apps/site/src/app/app.routes.ts`

**Interfaces:**
- Produces: `/compare`.

- [ ] **Step 1: Research pass**

Fresh web searches for: ngx-translate's current major version and whether its signals rewrite claim still holds; transloco's current signals support; Angular's built-in i18n's current documented limitations; angular-i18next's maintenance status. Record findings as source comments in the component file (`// verified <date>: ngx-translate vX.Y ...`) so the claim and its verification date are auditable. Publish no specific version number or download count that isn't confirmed in this pass.

- [ ] **Step 2: Implement `CompareTableComponent`**

Same accessible-table shape as the original Next.js draft: `<table>` with a `<caption class="sr-only">`, `scope="col"`/`scope="row"`, one row per feature (signals-first state, SSR/hydration story, fallback chains, type-safe keys, per-route lazy catalogs, ICU/plural support, build-time vs. runtime switching, npm package maturity), each cell a short factual string (e.g. "Yes — signals-first", "No — RxJS bridge only") — never a bare icon/checkmark, so the comparison reads correctly without relying on color or a symbol alone.

```ts
// apps/site/src/app/shared/compare-table/compare-table.component.ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

interface CompareRow { feature: string; ngxRuntimeI18n: string; ngxTranslate: string; transloco: string; angularBuiltin: string; }

@Component({
  selector: 'app-compare-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <caption class="sr-only">Feature comparison across Angular i18n libraries</caption>
        <thead>
          <tr class="border-b border-rule text-left">
            <th scope="col" class="py-2 pr-4">Feature</th>
            <th scope="col" class="py-2 pr-4">ngx-runtime-i18n</th>
            <th scope="col" class="py-2 pr-4">ngx-translate</th>
            <th scope="col" class="py-2 pr-4">transloco</th>
            <th scope="col" class="py-2 pr-4">Angular built-in</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.feature) {
            <tr class="border-b border-rule">
              <th scope="row" class="py-3 pr-4 text-left font-medium">{{ row.feature }}</th>
              <td class="py-3 pr-4">{{ row.ngxRuntimeI18n }}</td>
              <td class="py-3 pr-4">{{ row.ngxTranslate }}</td>
              <td class="py-3 pr-4">{{ row.transloco }}</td>
              <td class="py-3 pr-4">{{ row.angularBuiltin }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class CompareTableComponent {
  readonly rows = input.required<CompareRow[]>();
}
```

- [ ] **Step 3: Implement `CompareComponent`**

Populates `rows` from Step 1's verified research, with a short factual intro paragraph (2-3 sentences, no "despite its strengths" framing) noting this is the library author's own comparison with claims dated where relevant. Includes `<app-key-eyebrow text="compare.matrix" />`.

- [ ] **Step 4: Wire route, verify build, commit**

```ts
{ path: 'compare', loadComponent: () => import('./pages/compare/compare.component').then((m) => m.CompareComponent) },
```

```bash
npx nx build site --configuration=production
git add apps/site
git commit -m "feat(site): add researched comparison page"
```

---

## Task 18: Changelog page

**Files:**
- Create: `apps/site/src/app/pages/changelog/changelog.component.ts`
- Modify: `apps/site/scripts/build-content.mjs` (compile root `CHANGELOG.md` into the manifest too), `apps/site/src/app/app.routes.ts`

**Interfaces:**
- Produces: `/changelog`, rendering the root `CHANGELOG.md` through the same Markdown pipeline as docs/recipes — no content duplication.

- [ ] **Step 1: Extend the content build script**

In `build-content.mjs`'s `main()`, add:

```js
const changelogRaw = fs.readFileSync(path.join(process.cwd(), '..', '..', 'CHANGELOG.md'), 'utf8');
const changelogHtml = await compile(changelogRaw);
fs.writeFileSync(path.join(process.cwd(), 'generated', 'changelog.json'), JSON.stringify({ html: changelogHtml }));
```

If the compile step throws because plain Markdown in `CHANGELOG.md` contains a character the pipeline parses as raw HTML/JSX-like syntax (the same class of issue MDX pipelines hit on hand-written changelogs) — fix it by escaping the specific offending character directly in root `CHANGELOG.md` (it must stay the single source of truth, not forked into site-only content).

- [ ] **Step 2: Implement `ChangelogComponent`**

```ts
// apps/site/src/app/pages/changelog/changelog.component.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import changelog from '../../../../generated/changelog.json';
import { KeyEyebrowComponent } from '../../shared/key-eyebrow/key-eyebrow.component';

@Component({
  selector: 'app-changelog',
  standalone: true,
  imports: [KeyEyebrowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-3xl px-4 py-10">
      <app-key-eyebrow text="changelog.history" />
      <h1 class="font-display text-3xl font-semibold">Changelog</h1>
      <div class="prose prose-neutral mt-8 max-w-none dark:prose-invert" [innerHTML]="html"></div>
    </div>
  `,
})
export class ChangelogComponent {
  protected readonly html = changelog.html;
}
```

- [ ] **Step 3: Wire route, rebuild content, verify, commit**

```ts
{ path: 'changelog', loadComponent: () => import('./pages/changelog/changelog.component').then((m) => m.ChangelogComponent) },
```

```bash
node apps/site/scripts/build-content.mjs
npx nx build site --configuration=production
git add apps/site
git commit -m "feat(site): render the root changelog on /changelog"
```

---

## Task 19: FAQ page and 404

**Files:**
- Create: `apps/site/src/app/pages/faq/faq.component.ts`, `apps/site/src/app/pages/not-found/not-found.component.ts`
- Modify: `apps/site/src/app/app.routes.ts`

- [ ] **Step 1: Implement `FaqComponent`**

Eight to ten real questions answerable from documented facts, each an `<app-faq-item [question]="...">answer</app-faq-item>` (using `FaqItemComponent` from Task 6): whether this replaces Angular's built-in i18n (no — runtime alternative vs. compile-time/XLIFF); whether ICU-lite covers complex plural rules like Arabic/Russian (no — state the ICU-lite "not supported" list honestly); SSR support (yes, `provideRuntimeI18nSsr()` + TransferState, link the SSR recipe); supported Angular versions (re-verify the current peer range via `npm view`, don't assume); which packages are on npm today (state exactly, re-verified); route-level lazy loading (yes, `withI18nScope()`); whether switching languages reloads the page (no); whether catalogs can be validated in CI (yes, `@ngx-runtime-i18n/cli check`).

Build a `readonly faqs = [{ question, answer }, ...]` array in the component and render it via `@for`, then build the `FAQPage` JSON-LD (Task 21) from that exact same array — never hand-duplicated.

- [ ] **Step 2: Implement `NotFoundComponent`**

```ts
// apps/site/src/app/pages/not-found/not-found.component.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto flex max-w-2xl flex-col items-start px-4 py-24">
      <p class="font-mono text-sm text-accent-en">error.not-found</p>
      <h1 class="mt-2 font-display text-3xl font-semibold">This page doesn't exist.</h1>
      <p class="mt-3 text-ink/70">Try the docs, or search with Cmd+K.</p>
      <a routerLink="/docs" class="mt-6 rounded-md bg-accent-en px-5 py-2.5 text-sm font-medium text-white">Go to docs</a>
    </div>
  `,
})
export class NotFoundComponent {}
```

- [ ] **Step 3: Wire routes (FAQ + wildcard) and verify prerendering handles the wildcard route sanely**

```ts
{ path: 'faq', loadComponent: () => import('./pages/faq/faq.component').then((m) => m.FaqComponent) },
{ path: '**', loadComponent: () => import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent) },
```

Since `app.routes.server.ts`'s final entry is already `{ path: '**', renderMode: RenderMode.Prerender }`, confirm this produces a single static 404 document (check what filename Angular's prerender output uses for the wildcard route — likely `404.html` or similar) and that Cloudflare Pages serves it as the not-found page (Cloudflare Pages auto-detects a root `404.html` for this purpose — confirm the build output's file is named and placed correctly for that to work, adjusting via `outputPath`/asset copy if not).

- [ ] **Step 4: Verify build and commit**

```bash
npx nx build site --configuration=production
git add apps/site
git commit -m "feat(site): add FAQ page and 404"
```

---

## Task 20: Sitemap, robots.txt, llms.txt

**Files:**
- Modify: `apps/site/scripts/build-content.mjs` (write `sitemap.xml` from `generated/routes.json`)
- Create: `apps/site/public/robots.txt`, `apps/site/public/llms.txt`, `apps/site/public/llms-full.txt`

- [ ] **Step 1: Generate `sitemap.xml` in the build script**

```js
const BASE_URL = 'https://i18n.ashwinsathian.com';
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map((r) => `  <url><loc>${BASE_URL}${r}</loc></url>`).join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(process.cwd(), 'public', 'sitemap.xml'), sitemapXml);
```

- [ ] **Step 2: Write `public/robots.txt`**

```
User-agent: *
Allow: /

Sitemap: https://i18n.ashwinsathian.com/sitemap.xml
```

- [ ] **Step 3: Write `public/llms.txt`**

Plain-text/Markdown summary in the `llms.txt` convention: project name, one-paragraph factual description, install commands for the published packages, explicit note that `material`/`schematics`/`cli` are source-only (re-verified), links to `/docs`, `/recipes`, `/compare`, `/changelog`, the GitHub repo, and each npm package. No promotional language.

- [ ] **Step 4: Write `public/llms-full.txt`**

Expanded digest: full feature list, the six-package table with descriptions and publish status, one-paragraph summaries of each core concept, the full recipes list with one-line descriptions.

- [ ] **Step 5: Verify Angular's `assets` config copies `public/*` to the output root, build, commit**

Confirm `apps/site/project.json`'s build target's `assets` array includes a glob covering `apps/site/public/**/*` at the output root (not nested under a `public/` subfolder in the final output — `robots.txt`/`sitemap.xml`/`llms.txt` need to resolve at the site root, e.g. `https://i18n.ashwinsathian.com/robots.txt`).

```bash
node apps/site/scripts/build-content.mjs
npx nx build site --configuration=production
ls dist/apps/site/browser/robots.txt dist/apps/site/browser/sitemap.xml dist/apps/site/browser/llms.txt
git add apps/site
git commit -m "feat(site): add sitemap, robots.txt, and llms.txt"
```

---

## Task 21: Structured data (JSON-LD) and Open Graph images

**Files:**
- Create: `apps/site/src/app/core/structured-data.service.ts`, `apps/site/scripts/build-og-images.mjs`
- Modify: `apps/site/src/app/pages/docs/doc-page.component.ts` (package pages emit `SoftwareApplication`), `apps/site/src/app/pages/docs/doc-page.component.ts` and `recipe-page.component.ts` (both emit `BreadcrumbList`), `apps/site/src/app/pages/faq/faq.component.ts` (emits `FAQPage`), `apps/site/src/app/app.ts` (emits root `WebSite`/`Person`), `apps/site/project.json` (add a `build-og` target, `dependsOn` from `build`)

**Interfaces:**
- Produces: `StructuredDataService` (injectable) with `set(data: Record<string, unknown>): void` — appends/replaces a `<script type="application/ld+json">` in `DOCUMENT.head`, runs identically during prerendering (so tags land in the static HTML) and client-side navigation. `build-og-images.mjs` — reads `generated/routes.json` + `generated/content-manifest.json`, generates one PNG per major route (landing, each package page, `/compare`, `/faq`) via `satori` (JSX-like → SVG, using the same palette/type tokens) + `@resvg/resvg-js` (SVG → PNG), written to `public/og/*.png`.

- [ ] **Step 1: Implement `StructuredDataService`**

```ts
// apps/site/src/app/core/structured-data.service.ts
import { DOCUMENT, Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StructuredDataService {
  private readonly document = inject(DOCUMENT);

  set(id: string, data: Record<string, unknown>): void {
    this.document.getElementById(id)?.remove();
    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    script.textContent = JSON.stringify(data);
    this.document.head.appendChild(script);
  }
}
```

- [ ] **Step 2: Wire per-page structured data**

In `DocPageComponent.ngOnInit()` (Task 12), after resolving `doc()`: if `slug[0] === 'packages'`, call `structuredData.set('ld-software', softwareApplicationJsonLd({ name: '@ngx-runtime-i18n/' + slug[1], description: doc.frontmatter.description, url: 'https://i18n.ashwinsathian.com/docs/' + slug.join('/') }))`. Always call `structuredData.set('ld-breadcrumb', breadcrumbJsonLd([...]))` built from the route segments. Define `softwareApplicationJsonLd`/`breadcrumbJsonLd`/`faqPageJsonLd`/`articleJsonLd`/`personJsonLd` as small pure functions in a new `apps/site/src/app/core/json-ld.ts` (same shape as the equivalent helpers from the original Next.js draft, framework-agnostic — plain object builders), imported wherever `StructuredDataService.set()` is called. Use `Person` (not `Organization`) for author attribution — this is a personal project.

In `FaqComponent`, build the `FAQPage` JSON-LD directly from the same `faqs` array the template renders (never hand-duplicated), and call `structuredData.set('ld-faq', faqPageJsonLd(this.faqs))` in `ngOnInit()`.

In the root app component, call `structuredData.set('ld-website', { '@context': 'https://schema.org', '@type': 'WebSite', name: 'ngx-runtime-i18n', url: 'https://i18n.ashwinsathian.com' })` and `structuredData.set('ld-person', personJsonLd())` once, on init.

- [ ] **Step 3: Implement the OG image build script**

```bash
cd apps/site
npm install satori @resvg/resvg-js
```

```js
// apps/site/scripts/build-og-images.mjs
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';

// Load the actual font files this task needs directly from the installed @fontsource
// packages' file paths (satori needs raw font binary data, not CSS) — locate them via
// `node -e "console.log(require.resolve('@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-700-normal.woff'))"`
// or the equivalent current file-naming convention for each installed package version;
// confirm the exact file path rather than guessing, since Fontsource's internal file
// naming can vary by version.

async function renderOgImage({ eyebrow, title, description }, outPath) {
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: '#FAF9F6', color: '#14181F' },
        children: [
          { type: 'div', props: { style: { fontSize: 20, fontFamily: 'IBM Plex Mono', color: '#2C5CE6' }, children: eyebrow } },
          { type: 'div', props: { style: { fontSize: 56, fontWeight: 700, marginTop: 16, fontFamily: 'Bricolage Grotesque' }, children: title } },
          { type: 'div', props: { style: { fontSize: 28, marginTop: 16, color: '#14181F99', fontFamily: 'IBM Plex Sans' }, children: description } },
        ],
      },
    },
    { width: 1200, height: 630, fonts: [/* { name, data, weight, style } entries loaded from the resolved file paths above */] }
  );

  const png = new Resvg(svg).render().asPng();
  fs.writeFileSync(outPath, png);
}

async function main() {
  const outDir = path.join(process.cwd(), 'public', 'og');
  fs.mkdirSync(outDir, { recursive: true });

  await renderOgImage({ eyebrow: 'hero.tagline', title: 'ngx-runtime-i18n', description: 'Signals-first runtime i18n for Angular 16+' }, path.join(outDir, 'home.png'));
  // Repeat for each package page, /compare, /faq, using their real titles/descriptions
  // from generated/content-manifest.json where applicable.
}

main();
```

- [ ] **Step 4: Wire as an Nx target and reference the images in page metadata**

Add a `build-og` target (same `nx:run-commands` pattern as `build-content`), add it to `build`'s `dependsOn` alongside `build-content`. In each page component (or a shared `SeoService` using Angular's `Meta` service), set `<meta property="og:image" content="https://i18n.ashwinsathian.com/og/<page>.png">` per route.

- [ ] **Step 5: Verify build and commit**

```bash
npx nx build site --configuration=production
git add apps/site
git commit -m "feat(site): add JSON-LD structured data and build-time Open Graph images"
```

---

## Task 22: Automated accessibility testing (axe-core via the Nx Playwright project)

**Files:**
- Modify: `apps/site-e2e/playwright.config.ts` (point `webServer`/`baseURL` at `site`'s serve target, matching `demo-e2e`'s pattern exactly)
- Create: `apps/site-e2e/src/a11y.spec.ts`
- Delete: `apps/site-e2e/src/example.spec.ts` (the generator's placeholder)

- [ ] **Step 1: Install `@axe-core/playwright`**

```bash
npm install -D @axe-core/playwright
```

- [ ] **Step 2: Confirm `playwright.config.ts` targets `site`'s dev server**

Compare against `apps/demo-e2e/playwright.config.ts` — it should already be scaffolded correctly by `@nx/playwright` pointing at `nx run site:serve`; adjust the port/URL only if the generator produced something inconsistent with `apps/site/project.json`'s actual `serve` port.

- [ ] **Step 3: Write the a11y spec covering every route**

```ts
// apps/site-e2e/src/a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import routes from '../../site/generated/routes.json';

for (const route of routes) {
  test(`${route} has no automatically detectable accessibility violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}
```

- [ ] **Step 4: Build content, run against the dev server, fix findings**

```bash
node apps/site/scripts/build-content.mjs
npx nx e2e site-e2e
```

Expected eventually: all routes pass with zero violations. Fix any real findings in the relevant component before proceeding — do not weaken the test.

- [ ] **Step 5: Commit**

```bash
git add apps/site-e2e
git commit -m "test(site): add automated accessibility testing across every route"
```

---

## Task 23: Manual visual and interaction QA (Playwright MCP)

No new source files — a verification pass using the Playwright MCP browser tools directly against `nx serve site` (or the built static output served locally), per the design spec's "manually test every visual element" requirement.

- [ ] **Step 1: Serve the app**

```bash
npx nx build site --configuration=production
npx http-server dist/apps/site/browser -p 4321
```

(Or `npx nx serve site` for a faster iteration loop while fixing findings, switching to the static build for a final confirmation pass before Task 24.)

- [ ] **Step 2: Navigate every route at three breakpoints in both themes**

Using `mcp__plugin_playwright_playwright__browser_navigate`, `browser_resize` (375×812, 768×1024, 1440×900), `browser_take_screenshot`: visit all ~28 routes, toggle the theme via the header control, screenshot each combination. Check: no horizontal overflow, legible text at all widths, sidebar/TOC collapse correctly on mobile, dark-mode contrast holds for the accent colors, the `<content-tabs>`/`<content-code-block>` elements render and upgrade correctly (not stuck in their pre-JS fallback state) on every content page that uses them.

- [ ] **Step 3: Exercise every interactive element**

Hero language cycle (hover to pause, resumes on mouse-leave, confirm it's genuinely calling the real `I18nService` by checking the `lang` attribute changes on the cycling word); Cmd+K search (open via keyboard and header button, filter, select, confirm navigation); code-copy buttons on one page per content type; mobile nav open/close with focus restoration; theme toggle; FAQ accordion.

- [ ] **Step 4: Keyboard-only pass**

Tab through the landing page and one docs page end to end without a mouse: skip link appears first and works, every interactive element gets a visible focus ring, search palette opens/closes and is fully operable with focus properly trapped and restored, mobile nav (at a mobile viewport) and FAQ accordion are keyboard-operable.

- [ ] **Step 5: Reduced-motion check**

Emulate `prefers-reduced-motion: reduce` and confirm the hero language cycle never starts its interval (stays on "everyone" the whole time).

- [ ] **Step 6: Record and fix findings**

Fix any defect found in the relevant component/content file, rebuild, re-check that specific combination. Do not proceed to Task 24 until clean.

---

## Task 24: Lighthouse smoke check

**Files:** none — verification only.

- [ ] **Step 1: Run Lighthouse against three representative pages**

```bash
npx nx build site --configuration=production
npx http-server dist/apps/site/browser -p 4321 &
npx lighthouse http://localhost:4321/ --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=./lighthouse-home.json --chrome-flags="--headless"
npx lighthouse http://localhost:4321/docs/getting-started --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=./lighthouse-docs.json --chrome-flags="--headless"
npx lighthouse http://localhost:4321/recipes/ssr-with-express --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=./lighthouse-recipe.json --chrome-flags="--headless"
```

(Adjust the docs URL to whatever path shape Task 12 settled on.)

- [ ] **Step 2: Review scores, target 90+ across all four categories**

Investigate anything below 90 (common static-Angular causes: unused JS from the zoneless bootstrap being larger than expected, missing `width`/`height` on any images, render-blocking font `@import`s — confirm `font-display: swap` is present in the Fontsource CSS actually being imported).

- [ ] **Step 3: Delete the report files (not committed)**

```bash
rm apps/site/lighthouse-*.json
```

No commit for this task. Any fixes made in Step 2 get their own commit against the relevant task's files.

---

## Task 25: Final build verification and repo integration

**Files:**
- Modify: root `README.md` (finalize the "Website" section with the live URL), create `apps/site/README.md` (local-dev instructions)

- [ ] **Step 1: Full verification sweep**

```bash
npx nx lint site
npx nx lint site-e2e
npx nx test site
npx nx build site --configuration=production
```

Expected: all clean.

- [ ] **Step 2: Confirm the six-package pipeline is untouched**

```bash
npx nx run-many -t build -p=runtime-i18n,runtime-i18n-angular,runtime-i18n-primeng,runtime-i18n-material,runtime-i18n-schematics,cli --configuration=production
npx nx run-many -t test -p=runtime-i18n,runtime-i18n-angular,runtime-i18n-primeng,runtime-i18n-material,runtime-i18n-schematics,cli
```

Expected: still succeeds exactly as before — confirms `apps/site`/`apps/site-e2e` didn't interfere with the existing Nx project graph, and that adding `@ngx-runtime-i18n/angular`/`/core` as `apps/site` dependencies (Task 10) didn't create a circular or conflicting resolution for the libs themselves.

- [ ] **Step 3: Write `apps/site/README.md`**

What this app is, local dev command (`nx serve site`), build command (`nx build site --configuration=production`), test commands (`nx test site`, `nx e2e site-e2e`), a pointer to the design spec at `docs/superpowers/specs/2026-08-11-marketing-site-design.md`.

- [ ] **Step 4: Update root `README.md` and commit**

```bash
git add apps/site README.md
git commit -m "chore(site): finalize verification and add site README"
```

---

## Task 26: Deploy to Cloudflare Pages

**Files:**
- Modify: `apps/site/package.json` if it doesn't already have one, or add a root-level convenience script — `"deploy": "nx build site --configuration=production && wrangler pages deploy dist/apps/site/browser --project-name=ngx-runtime-i18n-site"`

- [ ] **Step 1: Authenticate wrangler**

```bash
npx wrangler login
```

Opens a browser window for the user to authorize. Wait for confirmation before proceeding.

- [ ] **Step 2: Confirm the target account and that `ashwinsathian.com` is an active zone**

```bash
npx wrangler whoami
npx wrangler pages project list
```

If `ashwinsathian.com` isn't a zone on this account, stop and flag it — Step 5 needs that zone already on Cloudflare DNS.

- [ ] **Step 3: Create the Pages project**

```bash
npx wrangler pages project create ngx-runtime-i18n-site --production-branch=main
```

- [ ] **Step 4: Build and deploy**

```bash
npx nx build site --configuration=production
npx wrangler pages deploy dist/apps/site/browser --project-name=ngx-runtime-i18n-site
```

Expected: a `*.pages.dev` preview URL is printed. Verify it loads correctly, including a spot-check that a couple of prerendered docs/recipe routes actually load (not just `/`), before proceeding.

- [ ] **Step 5: Add the custom subdomain**

```bash
npx wrangler pages domain --help
npx wrangler pages domain add i18n.ashwinsathian.com --project-name=ngx-runtime-i18n-site
```

Fall back to the Cloudflare dashboard's Pages → Custom domains flow if the CLI subcommand has changed shape.

- [ ] **Step 6: Verify DNS and SSL provisioning**

```bash
dig i18n.ashwinsathian.com
curl -I https://i18n.ashwinsathian.com
```

Expected: resolves, returns `200`. Provisioning can take a few minutes — check again rather than treating an initial miss as failure.

- [ ] **Step 7: Commit the deploy script**

```bash
git add apps/site/package.json
git commit -m "chore(site): add wrangler deploy script"
```

---

## Task 27: Push to origin

- [ ] **Step 1: Review the full set of commits made in this plan**

```bash
git log --oneline main -30
git status
```

Confirm nothing unintended is staged and the working tree is clean.

- [ ] **Step 2: Push**

```bash
git push origin main
```

- [ ] **Step 3: Confirm CI is unaffected**

Check that `.github/workflows/ci.yml` (which targets the six library packages only, not `apps/site`) still passes on this push.

---

## Self-review notes

- **Framework swap is complete and consistent:** every task that referenced React/Next.js/MDX-specific APIs in the prior (rolled-back) plan has an Angular-native equivalent here — `next-themes` → hand-rolled `ThemeService` + inline FOUC script; `cmdk` → Angular CDK Overlay + a11y; `lucide-react` → hand-rolled inline SVG components; `next-mdx-remote` → standalone `unified`/`remark`/`rehype` build script; `next/font/google` → `@fontsource`; `next/og` → `satori` + `@resvg/resvg-js`; `generateStaticParams` → `getPrerenderParams()`; Vitest/RTL → Jest/`@testing-library/angular`, matching this repo's actual established convention rather than the framework default.
- **New capability the framework swap enabled, incorporated:** the hero demo (Task 10) now runs the real `@ngx-runtime-i18n/angular` package instead of simulating it — a strictly stronger, more credible version of the same design intent from the first draft, confirmed against the design spec's revised "Real dogfooding" section.
- **Facts re-verification is threaded through content tasks, not just stated once:** Tasks 13, 14, 16, 19 each explicitly call for re-checking publish status/peer ranges via `npm view` rather than trusting this plan's snapshot, since the repo's Angular 22/Nx 23 upgrade and v2.1.0 release happened between the first design pass and this one and could easily drift further during implementation.
- **Type/interface consistency checked:** `ContentService`'s methods (Task 8) are used identically in Tasks 12, 13, 14, 15, 16, 20, 22. `compile()`/the manifest shape (Task 7) is consumed identically by `ContentService` (Task 8) and the changelog/sitemap/OG-image extensions (Tasks 18, 20, 21). `registerContentElements()`/the three custom element tag names (Task 5) are referenced identically in the content build script (Task 7) and every page that uses `CUSTOM_ELEMENTS_SCHEMA` (Tasks 11-16).
- **Content tasks specify source material, structure, and acceptance criteria rather than final prose**, for the same reason as the original plan: exact wording is produced at execution time against the voice/style constraints in Global Constraints, since pre-writing the prose here would duplicate rather than specify the work, and accuracy depends on re-reading cited sources at write time rather than trusting a plan snapshot that's already proven to drift (see the Angular 22/Nx 23 upgrade and v2.1.0 release that happened between this plan's two drafts).

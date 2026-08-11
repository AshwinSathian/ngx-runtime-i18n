# ngx-runtime-i18n marketing/docs site — design

Status: approved (content scope, visual direction, voice/style guide, and now the Angular
technical plan, each confirmed by user)
Date: 2026-08-11, revised 2026-08-12

## Framework revision (2026-08-12)

The first pass of this spec used Next.js + React (Tasks 1-4 were implemented, reviewed, and
then explicitly rolled back by the user before any push). This revision replaces that with
**Angular, prerendered via `@angular/ssr`** — the same framework the library itself targets.
Per explicit user instruction, nothing else changes: same content architecture, same visual
direction, same voice/style guide, same Cloudflare Pages deployment at
`i18n.ashwinsathian.com`, same accessibility bar, same verification rigor.

Feasibility was confirmed against current Angular docs (Angular 22, matching this monorepo's
own version after its Nx 23 upgrade) before committing to this revision: `@angular/ssr`
supports per-route `RenderMode.Prerender` plus `outputMode: 'static'`, which Angular's own
docs describe as producing a fully static site "useful for deploying to static hosting
providers" — no server process, no Workers runtime, identical static-asset deployment to what
was already planned. Confirmed with the user: prerendered static output, not live per-request
SSR (nothing in this site's content is personalized or needs request-time data, so live SSR
would add operational cost — Cloudflare Pages Functions running a Node request handler, cold
starts — for no benefit).

One upgrade this revision enables: because the site is now Angular, the hero's language-cycling
demo can run on the actual `@ngx-runtime-i18n/angular` package instead of simulating it. See
Visual direction, "Real dogfooding" below — this replaces the original "honesty constraint"
(which existed only because a React site could not literally run an Angular-only library).

Live npm registry state was re-verified during this revision (`npm view` against the real
registry, not the changelog's prose, since the two had drifted): `@ngx-runtime-i18n/core`
2.1.0, `@ngx-runtime-i18n/angular` 2.1.0, `@ngx-runtime-i18n/primeng` 2.0.0 — all published.
`@ngx-runtime-i18n/material`, `/schematics`, `/cli` remain unpublished despite CHANGELOG.md
prose describing an intended first release for them — the site must reflect the verified
registry state, not the changelog's description of intent.

## Purpose

Build a public site for `@ngx-runtime-i18n` and its six packages (`core`, `angular`,
`primeng`, `material`, `schematics`, `cli`): landing page, full documentation, task-oriented
recipes, an honest competitive comparison, changelog, and FAQ. Deploy it to Cloudflare Pages
at `i18n.ashwinsathian.com`.

## Source of truth for product facts

Everything the site claims about the library must trace back to one of:

- `README.md` (root) and each package's `README.md` (`libs/runtime-i18n/README.md`,
  `libs/runtime-i18n-angular/README.md`, `libs/runtime-i18n-primeng/README.md`,
  `libs/runtime-i18n-material/README.md`, `libs/runtime-i18n-schematics/README.md`,
  `tools/cli/README.md`) — re-read fresh at implementation time, not from memory, since the
  repo has moved (Angular 20→22, Nx 22→23, v2.1.0 released) since this spec's first draft.
- `CHANGELOG.md` (root) — rendered directly on `/changelog`, not re-typed. Where CHANGELOG.md
  prose and live npm registry state disagree (as they currently do for `material`/`schematics`/
  `cli` publish status), the registry wins for any claim the site makes about what a developer
  can `npm install` today.
- `apps/demo` / `apps/demo-ssr` — real, working CSR/SSR examples to draw recipe code from.
- `.github/workflows/ci.yml` / `release.yml` — for any claims about test count, CI, or release
  mechanics.
- `npm view @ngx-runtime-i18n/<pkg> version` — authoritative for publish status, re-checked
  immediately before writing the package matrix and any per-package "published"/"source-only"
  badge.

No invented testimonials, adoption numbers, "trusted by" logos, or benchmark claims. If a
number isn't in the repo or independently verified, it doesn't go on the site.

`/compare` is the one page most likely to go stale between design and build — every claim
about ngx-translate, transloco, Angular's built-in i18n, and i18next/angular-i18next gets a
fresh web search pass immediately before that page is written, not sourced from memory alone.

## Voice & style guide (applies to every word on the site)

Unchanged from the first draft. Per user instruction, this follows Wikipedia's "Signs of AI
writing" guidance strictly, adapted from wikitext conventions to web copy. The underlying
anti-patterns are what matter, not the wiki-specific markup rules.

**Banned vocabulary** (near-automatic AI tells — do not use, find a plainer word instead):
delve, boast(s), robust, seamless(ly), leverage (as a verb), streamline, empower, unlock,
elevate, game-changer, effortless(ly), harness (as a verb), cutting-edge, revolutionary,
unparalleled, crucial, pivotal, underscore(s), tapestry, testament, vibrant, meticulous,
intricate, interplay, landscape (metaphorical), garner, bolster(ed), enduring, fostering,
align with, enhance, highlighting, showcasing, "serves as" / "stands as" / "functions as" /
"represents" in place of a plain "is".

**Banned constructions:**
- Negative parallelism: "not just X, but Y", "not X, but Y", "X rather than Y" used as a
  rhetorical flourish instead of a real contrast.
- Rule-of-three padding: forcing three adjectives or three parallel phrases where the content
  doesn't naturally have three items. (The en/hi/de three-way accent system is grounded in real
  repo content, not this pattern — it's a design device, not a prose list.)
- Present-participle tacked-on significance: sentences ending in an "-ing" clause that claims
  importance without evidence ("...cementing its place as...", "...ensuring a seamless
  experience...").
- Generic significance/legacy inflation: connecting a mundane fact to some larger trend
  ("marks a pivotal moment in the evolution of...").
- "Despite its strengths, X faces challenges..." formula, or any "Future Outlook" / "Challenges
  and Legacy" section built from speculation instead of documented fact.
- Vague authority: "industry experts agree", "studies show" — cite the specific source or don't
  make the claim.
- Collaborative address that reads like an AI assistant talking to a user ("Let's dive in!",
  "We'll walk you through..." as a recurring tic). Direct, plain address to the reader is fine
  and normal for a product site ("Install both packages", "You can preload a language before
  the user asks for it") — the target is the chatty tour-guide register, not second person
  itself.

**Formatting:**
- Sentence case in headings, not Title Case.
- Bold used only for the first definition of a term, never mechanically repeated on every
  occurrence.
- Em dashes used sparingly, only where they genuinely clarify — not as a default separator.
- No emoji as bullets or section markers.
- No decorative horizontal rules before headings.
- Straight quotes/apostrophes in body copy (typographic quotes are fine in display headlines
  as a type-setting choice, not as a "smart quotes by default" habit).

**Positive checks before publishing any page:** every claim is either a fact from the repo or
clearly framed as this project's own opinion; sentences vary in length and rhythm; a plain "is"
is used wherever "is" is the correct word.

## Content architecture

Unchanged from the first draft. Routes (path shape identical; Task-level file structure is now
Angular Router routes rather than Next.js App Router folders — see Technical architecture):

- `/` — landing
- `/docs` — index
- `/docs/getting-started`
- `/docs/core-concepts/fallback-chains`
- `/docs/core-concepts/caching`
- `/docs/core-concepts/icu-lite`
- `/docs/core-concepts/type-safety`
- `/docs/core-concepts/ssr-hydration`
- `/docs/packages/core`
- `/docs/packages/angular`
- `/docs/packages/primeng`
- `/docs/packages/material`
- `/docs/packages/schematics`
- `/docs/packages/cli`
- `/recipes` — index
- `/recipes/ssr-with-express`
- `/recipes/route-scoped-catalogs`
- `/recipes/preloading-and-caching`
- `/recipes/type-safe-catalogs`
- `/recipes/material-adapter`
- `/recipes/primeng-adapter`
- `/recipes/ci-catalog-validation`
- `/recipes/ng-add-schematic`
- `/recipes/migrating-from-ngx-translate`
- `/compare`
- `/changelog`
- `/faq`
- wildcard → 404

Landing page sections: hero (live demo of the value prop, see Visual direction), feature grid
(fallback chains, ICU-lite, type-safe keys, TransferState SSR, DevTools bridge — each tied to a
real API), tabbed code showcase (setup → template → SSR), six-package matrix (sourced from the
root README table, re-verified against the live npm registry), `/compare` teaser, quick start,
footer.

## Visual direction

Unchanged from the first draft, except for the dogfooding upgrade the framework switch enables
(see "Real dogfooding" below).

**Palette** (light default, full dark-mode inversion):

| Token | Light | Dark | Use |
|---|---|---|---|
| `--paper` | `#FAF9F6` | `#0B0D12` | page background |
| `--ink` | `#14181F` | `#F5F3EE` | body text |
| `--rule` | `#DEDAD1` | `#242A35` | hairline borders |
| `--accent-en` | `#2C5CE6` | `#5B82FF` | canonical brand/CTA color |
| `--accent-hi` | `#C2410C` | `#F0803A` | Hindi-tagged content only |
| `--accent-de` | `#0F766E` | `#14B8A6` | German-tagged content only |

Grounded in the repo's own examples, which consistently demo `en`/`hi`/`de` across every code
sample. The three accents are a functional coding system (language switcher, code-sample
language badges, package cards, comparison table), always paired with a text label — never a
color-only signal.

**Typography:** IBM Plex Sans (+ Plex Sans Devanagari for `hi` copy) for body/UI, IBM Plex Mono
for code, Bricolage Grotesque for display/headlines. IBM Plex is an open-source type system
built for multi-script consistency, which is directly relevant given the hero sets English and
Hindi side by side. Self-hosted via `@fontsource` packages (framework-agnostic, ships prebuilt
`.woff2` files in the npm package — no runtime request to Google's font CDN, no layout shift).

**Signature element:** section eyebrows styled as literal translation keys from the product's
own catalog convention (`hero.tagline`, `features.grid`, `packages.matrix`,
`docs.getting-started`) in Plex Mono — the wayfinding system is the product's own mental model,
not generic numbering.

**Real dogfooding (revised from the Next.js draft's simulated demo):** the hero's language-
cycling word is now powered by an actual `provideRuntimeI18n()` instance from
`@ngx-runtime-i18n/angular`, resolved from the workspace (same package the rest of the repo
publishes), with a two-key catalog (`hero.audience`, in `en`/`hi`/`de`) and a real
`I18nService.setLang()` call on a timer. This is no longer a mockup of what the library does —
it is the library, running the demo. Pauses on hover/focus; freezes to static English under
`prefers-reduced-motion` (the timer never starts; `I18nService` stays on `defaultLang`).

**Honesty constraint (narrowed, not removed):** everything outside the hero demo — page
navigation, the search palette, the theme toggle, docs/recipe content rendering — is ordinary
Angular application code, not `@ngx-runtime-i18n`; nothing on the site implies the whole page
is "translated" by the library. The hero demo is real; the rest of the site's UI copy is
English-only by design (a docs site for an i18n library doesn't need to prove the point twice).

## Technical architecture

- Location: `apps/site/` — an Nx-registered Angular application (`@angular/build:application`
  executor, matching the existing `apps/demo` / `apps/demo-ssr` project.json pattern), using the
  monorepo's own Angular 22.1.1 / Nx 23.1.1. Not part of the six-package publish pipeline
  (`release.yml` tag matching, `npm publish`) — it's an app, not a package, and is simply absent
  from the `-p=runtime-i18n,...` project lists that scope the existing `build:libs`, `test`, and
  `ci` root npm scripts, so no exclusion config is needed.
- `@angular/ssr`, every route `RenderMode.Prerender` in `app.routes.server.ts`, `outputMode:
  'static'` in the build target — fully static output, no server file, no Workers runtime,
  nothing on this site needs a request-time process.
- Dynamic content routes (`/docs/:section/:slug`, `/recipes/:slug`) use `getPrerenderParams()`
  (Angular's build-time route-param enumerator, the direct equivalent of what
  `generateStaticParams` did in the Next.js draft) backed by a `ContentService` that lists known
  slugs from the compiled content manifest.
- Tailwind CSS v4 via `ng add tailwindcss` (Angular's own first-party, documented integration
  path for the `@angular/build:application` esbuild pipeline).
- Content authored as Markdown (not MDX — MDX-as-JSX is React-specific) under
  `apps/site/content/{docs,recipes}/**/*.md`, frontmatter-driven (title, description, eyebrow
  key, order, section/packages). A build-time Node script (`unified`/`remark`/`rehype` +
  `shiki` via `rehype-pretty-code` for syntax highlighting — the same underlying libraries the
  Next.js draft used, run standalone instead of through `next-mdx-remote`) compiles every
  content file to sanitized HTML plus a JSON manifest (slugs, frontmatter, headings for the
  TOC, entries for the search index and sitemap), checked into a generated, gitignored output
  directory the app imports from at build time.
- Content pages render the compiled HTML via Angular's `DomSanitizer.bypassSecurityTrustHtml()`
  (safe here because the HTML is our own authored, build-time-compiled content — not user
  input) bound through `[innerHTML]`. The few genuinely interactive elements embedded inside
  content — the code-block copy button, tabbed code groups — are implemented as small,
  dependency-free native Web Components (`customElements.define`, no Angular/Zone.js
  involvement), registered once in `main.ts` for the browser only. They render meaningful,
  fully-readable static content with zero JS (progressive enhancement for the copy button and
  tab-switching), so they carry no SSR-hydration-mismatch risk — they never enter Angular's
  component tree or its hydration process at all.
- Everything outside content — header, footer, mobile nav, theme toggle, search palette, hero
  demo — is ordinary Angular components in the app shell, hydrated normally via Angular's
  built-in non-destructive hydration.
- Search: an accessible Cmd+K palette built on Angular CDK (`@angular/cdk/overlay` for the
  dialog, `@angular/cdk/a11y`'s `ListKeyManager` and `FocusTrap`/`cdkTrapFocus` for keyboard
  navigation and focus containment) over the build-time-generated search index — CDK's a11y
  primitives are the standard, well-supported Angular pattern for exactly this kind of custom
  widget, and CDK is already a dependency of this monorepo.
- Icons: a small set of hand-rolled inline SVG components (not `lucide-angular` or any icon
  package) — the Next.js draft already hit a real case of an icon library silently dropping a
  brand icon (`lucide-react`'s `Github` export), and the full icon set this site needs is small
  enough (menu, close, sun, moon, search, GitHub mark, npm/package, check, copy, info, warning,
  tip) that owning the SVGs directly removes that entire class of risk.
- `/changelog` renders the root `CHANGELOG.md` directly through the same Markdown pipeline —
  single source of truth, never hand-duplicated into the site.

## SEO / AEO / GEO

- Per-route metadata (title, description, canonical) set via Angular's `Title`/`Meta` services
  during prerendering — individually written per page, no templated boilerplate.
- Static Open Graph / Twitter card images generated at build time via `satori` (JSX-like →
  SVG) + `@resvg/resvg-js` (SVG → PNG) in the same Node build script that compiles content —
  framework-agnostic, no dependency on any Next.js-specific image API.
- JSON-LD: `SoftwareApplication` per package page, `FAQPage` on `/faq`, `BreadcrumbList` on
  docs/recipes, `Article` on recipes, `Person` (not `Organization` — this is a personal OSS
  project) — emitted via a small `StructuredDataService` that appends `<script
  type="application/ld+json">` to `DOCUMENT.head`, running during prerendering so the tags land
  in the static HTML, not injected client-side-only.
- `robots.txt` as a static asset; `sitemap.xml` generated by the same build-time Node script
  from the content manifest.
- `public/llms.txt` and `public/llms-full.txt` — plain-language project summary for AI answer
  engines, stating publish status honestly per package (verified against the live registry, not
  assumed from the changelog).

## Accessibility (WCAG 2.2 AA target)

Skip-to-content link; visible focus rings everywhere, never suppressed; full keyboard
operability for nav, search palette (via CDK's focus trap and key manager), theme toggle,
mobile disclosure menu, and code-copy buttons (`aria-live` confirms "Copied"); semantic
landmarks and a heading hierarchy with no skipped levels; `prefers-reduced-motion` respected
(hero language-cycling never starts its timer); all accent/background text pairings
contrast-checked against WCAG AA; no color-only signaling.

## Verification plan

1. `tsc --noEmit` and ESLint clean; the Nx build (`nx build site --configuration=production`)
   produces a working static output directory with every route prerendered.
2. Playwright MCP: navigate every route at 375/768/1440px, in both themes, screenshot each;
   exercise the hero demo, Cmd+K search, mobile nav, code-copy buttons, and a full keyboard-only
   tab-through.
3. `@axe-core/playwright` automated scan per page, plus manual review of the accessibility tree
   for landmark/heading correctness.
4. Lighthouse smoke check (Performance/SEO/Accessibility/Best Practices) on the landing page, a
   docs page, and a recipe page.
5. Manual check that `sitemap.xml`, `robots.txt`, `llms.txt`, and all JSON-LD blocks are
   well-formed and match the pages they describe.

## Deployment

1. `nx build site --configuration=production` → static output (exact directory confirmed
   against the installed Angular version at implementation time — matches the
   `dist/apps/site/browser` convention already used by `apps/demo`/`apps/demo-ssr` in this
   repo).
2. `npx wrangler login` (opens a local browser for interactive auth — no secrets shared with
   the assistant).
3. `wrangler pages project create` for the new project.
4. `wrangler pages deploy <static-output-dir>`.
5. `wrangler pages domain add i18n.ashwinsathian.com` (exact subcommand confirmed against the
   installed wrangler version at execution time) — requires the `ashwinsathian.com` zone to
   already be on the same Cloudflare account.
6. `apps/site/package.json` gets a `deploy` script (build + `wrangler pages deploy`) so future
   redeploys are a one-liner.

No GitHub Actions workflow for the site — deployment is local-CLI by explicit request. Not
adding auto-deploy-on-push unless asked later.

## Out of scope

- Auto-deploy CI/CD for the site.
- Live per-request SSR (Cloudflare Pages Functions/Workers) — confirmed with the user in favor
  of prerendered static output.
- Any claim, badge, or copy implying the entire site's UI is translated by
  `@ngx-runtime-i18n` — only the hero demo genuinely runs the library; the rest of the site's
  copy is English-only by design.
- Testimonials, adoption stats, or comparison numbers not traceable to a source.
- Framework-agnostic/multi-framework roadmap speculation — the site describes the library as it
  exists today (Angular-first), not a hypothetical future direction.

# ngx-runtime-i18n marketing/docs site — design

Status: approved (content scope, visual direction, and technical plan each confirmed by user)
Date: 2026-08-11

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
  `tools/cli/README.md`)
- `CHANGELOG.md` (root) — rendered directly on `/changelog`, not re-typed
- `apps/demo` / `apps/demo-ssr` — real, working CSR/SSR examples to draw recipe code from
- `.github/workflows/ci.yml` / `release.yml` — for any claims about test count, CI, or publish
  status (e.g. `material`, `schematics`, and `cli` are currently "not yet published, build from
  source" — the site must say this plainly, not paper over it)

No invented testimonials, adoption numbers, "trusted by" logos, or benchmark claims. If a
number isn't in the repo or independently verified, it doesn't go on the site.

`/compare` is the one page most likely to go stale between design and build — every claim
about ngx-translate, transloco, Angular's built-in i18n, and i18next/angular-i18next gets a
fresh web search pass immediately before that page is written, not sourced from memory alone.

## Voice & style guide (applies to every word on the site)

Per user instruction, this follows Wikipedia's "Signs of AI writing" guidance strictly, adapted
from wikitext conventions to web copy. The underlying anti-patterns are what matter, not the
wiki-specific markup rules.

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

Routes (all under `apps/site/app`):

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
- `not-found` (404)

Landing page sections: hero (live demo of the value prop, see Visual direction), feature grid
(fallback chains, ICU-lite, type-safe keys, TransferState SSR, DevTools bridge — each tied to a
real API), tabbed code showcase (setup → template → SSR), six-package matrix (sourced from the
root README table, including honest publish-status), `/compare` teaser, quick start, footer.

## Visual direction

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
Hindi side by side.

**Signature element:** section eyebrows styled as literal translation keys from the product's
own catalog convention (`hero.tagline`, `features.grid`, `packages.matrix`,
`docs.getting-started`) in Plex Mono — the wayfinding system is the product's own mental model,
not generic numbering. The hero headline has one word that cycles live between English, Hindi,
and German (pauses on hover/focus; freezes to static English under
`prefers-reduced-motion`), demonstrating runtime switching instead of describing it.

**Honesty constraint:** the site is Next.js/React and cannot literally run on
`@ngx-runtime-i18n` (Angular-only). Any interactive demo is clearly a simulated preview of what
an app using the library looks like, never implied to be the library itself powering the site.

## Technical architecture

- Location: `apps/site/` — new npm workspace (covered by the existing `apps/*` glob in the root
  `package.json`), not registered with Nx (no `project.json`, no `@nx/next` plugin). Stays
  decoupled from the `nx run-many` build/release pipeline for the six publishable packages.
- Next.js 15, App Router, TypeScript, `output: 'export'` (fully static — no Workers runtime,
  no `@opennextjs/cloudflare`; nothing on this site needs a server).
- Tailwind CSS v4.
- Content in MDX under `apps/site/content/{docs,recipes}/**/*.mdx`, frontmatter-driven
  (title, description, eyebrow key, order), rendered through dynamic routes +
  `generateStaticParams` rather than 28 hand-written route files.
- `shiki` + `rehype-pretty-code` for build-time syntax highlighting, dual light/dark themes.
- Fonts via `next/font/google`, self-hosted at build, zero layout shift.
- `next-themes` for light/dark, system-aware, no flash of wrong theme.
- `cmdk` for a Cmd+K search palette over a build-time JSON index of headings/pages — chosen for
  its accessible-by-default combobox semantics over a hand-rolled listbox.
- `lucide-react` for icons.
- `/changelog` renders the root `CHANGELOG.md` directly through the same markdown pipeline —
  single source of truth, never hand-duplicated into the site.

## SEO / AEO / GEO

- Per-page `generateMetadata` — individually written title/description/canonical, no templated
  boilerplate repeated across pages.
- Static `opengraph-image.tsx` / Twitter card images via `next/og` `ImageResponse`, generated at
  build time (compatible with static export since no request-time params are used).
- JSON-LD: `SoftwareApplication` per package page, `FAQPage` on `/faq`, `BreadcrumbList` on
  docs/recipes, `Article` on recipes, `Person` (not `Organization` — this is a personal OSS
  project).
- `app/sitemap.ts`, `app/robots.ts`.
- `public/llms.txt` and `public/llms-full.txt` — plain-language project summary for AI answer
  engines, stating publish status honestly per package.

## Accessibility (WCAG 2.2 AA target)

Skip-to-content link; visible focus rings everywhere, never suppressed; full keyboard
operability for nav, search palette, theme toggle, mobile disclosure menu, and code-copy
buttons (`aria-live` confirms "Copied"); semantic landmarks and a heading hierarchy with no
skipped levels; `prefers-reduced-motion` respected (hero language-cycling freezes to static
English); all accent/background text pairings contrast-checked against WCAG AA; no color-only
signaling.

## Verification plan

1. `tsc --noEmit` and ESLint clean; `next build` produces a working static `out/`.
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

1. `cd apps/site && npm run build` → static `out/`.
2. `npx wrangler login` (opens a local browser for interactive auth — no secrets shared with
   the assistant).
3. `wrangler pages project create` for the new project.
4. `wrangler pages deploy out`.
5. `wrangler pages domain add i18n.ashwinsathian.com` (exact subcommand confirmed against the
   installed wrangler version at execution time) — requires the `ashwinsathian.com` zone to
   already be on the same Cloudflare account.
6. `apps/site/package.json` gets a `deploy` script (`build` + `wrangler pages deploy`) so future
   redeploys are a one-liner.

No GitHub Actions workflow for the site — deployment is local-CLI by explicit request. Not
adding auto-deploy-on-push unless asked later.

## Out of scope

- Auto-deploy CI/CD for the site.
- Any claim, badge, or copy implying the marketing site itself runs on `@ngx-runtime-i18n`.
- Testimonials, adoption stats, or comparison numbers not traceable to a source.
- Framework-agnostic/multi-framework roadmap speculation — the site describes the library as it
  exists today (Angular-first), not a hypothetical future direction.

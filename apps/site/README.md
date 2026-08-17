# apps/site

The marketing and documentation site for the `@ngx-runtime-i18n` package family — an Nx-managed Angular application with SSR + static prerendering (SSG). It covers the landing page, package pages (core, angular, primeng, material, schematics, cli), a live comparison table, docs, recipes, changelog, and FAQ, and dogfoods `@ngx-runtime-i18n/angular`/`@ngx-runtime-i18n/core` for its own language switching.

Deployed to Cloudflare Pages (project `ngx-runtime-i18n-site`), live at [https://i18n.ashwinsathian.com](https://i18n.ashwinsathian.com).

## Local development

```bash
nx serve site
```

## Build

```bash
nx build site --configuration=production
```

This runs `build-content` (compiles docs/recipes/changelog markdown) and `build-og` (generates OG images) as dependencies, then produces an SSR + prerendered build in `dist/apps/site`. Static routes are prerendered at build time.

## Tests

```bash
nx test site        # unit tests (Jest)
nx e2e site-e2e      # end-to-end tests (Playwright), including accessibility checks
```

`nx lint site` and `nx lint site-e2e` run ESLint for the app and its e2e project respectively.

## Redeploy

```bash
nx run site:deploy
```

Builds, generates the root `404.html` fallback, and deploys to Cloudflare Pages tagged to the `main`/production branch explicitly (`--branch=main`) — without this flag, `wrangler` auto-detects the local git branch, which produces a Preview deployment invisible on the production URL/custom domain if run from a worktree or feature branch. Requires `npx wrangler login` once per machine.

## Design reference

- Design spec: [`docs/superpowers/specs/2026-08-11-marketing-site-design.md`](../../docs/superpowers/specs/2026-08-11-marketing-site-design.md)
- Implementation plan: [`docs/superpowers/plans/2026-08-12-marketing-site-angular.md`](../../docs/superpowers/plans/2026-08-12-marketing-site-angular.md)

## Environment note

If `nx` commands fail with an unexpected workspace-root error, `unset NX_WORKSPACE_ROOT_PATH` before running — it's occasionally pinned to a stale path in local shells.

import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Read at runtime (rather than a static import) so this doesn't cross an Nx
// project boundary — apps/site isn't an importable npm-scoped package, and
// @nx/enforce-module-boundaries flags relative cross-project imports.
const routes: string[] = JSON.parse(
  readFileSync(join(__dirname, '../../site/generated/routes.json'), 'utf8'),
);

// On a cold `nx run site:serve` start, the Vite dev server behind it does a
// one-time dependency re-optimization the first time a route's module graph
// is actually requested by a browser, which triggers a full-page HMR reload
// ("Page reload sent to client(s)" in the dev-server log). If a test's
// navigate+analyze lands in that window, axe's in-flight page.evaluate calls
// get their execution context torn out from under them:
// "Error: page.evaluate: Execution context was destroyed, most likely
// because of a navigation". This is a known dev-server timing race, not an
// accessibility bug — confirmed by the same suite passing 81/81 clean, zero
// flakes, when run against an already-warm server. Retrying navigate+analyze
// once specifically on this transient error (never on a real violation,
// which analyze() returns rather than throws) keeps the test's zero-
// tolerance semantics for actual a11y issues while absorbing the race.
const TRANSIENT_RELOAD_RACE_PATTERNS = [
  'Execution context was destroyed',
  'Target closed',
  'Target page, context or browser has been closed',
];

function isTransientReloadRace(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return TRANSIENT_RELOAD_RACE_PATTERNS.some((pattern) => message.includes(pattern));
}

async function analyzeRouteWithReloadRaceRetry(page: Page, route: string) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await page.goto(route);
      return await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    } catch (error) {
      if (attempt === maxAttempts || !isTransientReloadRace(error)) {
        throw error;
      }
      // Visible signal that the known dev-server HMR reload race (see
      // comment above) was hit and absorbed, so it isn't silently invisible
      // in CI history.
      console.warn(
        `[a11y] ${route}: retrying after transient dev-server reload race (attempt ${attempt} of ${maxAttempts}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
  // Unreachable: the loop above always either returns or throws.
  throw new Error(`analyzeRouteWithReloadRaceRetry: exhausted attempts for ${route}`);
}

for (const route of routes) {
  test(`${route} has no automatically detectable accessibility violations`, async ({ page }) => {
    const results = await analyzeRouteWithReloadRaceRetry(page, route);
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}

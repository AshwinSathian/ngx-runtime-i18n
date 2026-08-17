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

// Shared by every per-route check below (axe scan, SEO meta check, ...) so a transient
// dev-server reload lands on whichever `operation` a given test runs — the retry itself is
// generic over "navigate then do something with the page," not axe-specific.
async function withReloadRaceRetry<T>(
  page: Page,
  route: string,
  operation: () => Promise<T>,
): Promise<T> {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await page.goto(route);
      return await operation();
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
  throw new Error(`withReloadRaceRetry: exhausted attempts for ${route}`);
}

function analyzeRouteWithReloadRaceRetry(page: Page, route: string) {
  return withReloadRaceRetry(page, route, () =>
    new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze(),
  );
}

for (const route of routes) {
  test(`${route} has no automatically detectable accessibility violations`, async ({ page }) => {
    const results = await analyzeRouteWithReloadRaceRetry(page, route);
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  // Regression guard for the fix that wired per-route SeoService.setPageMeta() calls into
  // every page (see seo.service.ts / seo.service.spec.ts): before that fix, every route
  // silently rendered the Angular CLI's generic default `<title>site</title>` with no
  // `<meta name="description">` at all. Reuses the same cold-start-hardened retry helper
  // as the axe scan above (via withReloadRaceRetry) rather than a bare page.goto(), since
  // navigation here is just as exposed to the dev-server HMR reload race described above.
  test(`${route} has a distinct <title> and a non-empty meta description`, async ({ page }) => {
    await withReloadRaceRetry(page, route, async () => {
      const title = await page.title();
      expect(title).not.toBe('site');
      expect(title.length).toBeGreaterThan(0);

      const description = await page
        .locator('meta[name="description"]')
        .getAttribute('content');
      expect(description).not.toBeNull();
      expect(description?.trim().length).toBeGreaterThan(0);
    });
  });
}

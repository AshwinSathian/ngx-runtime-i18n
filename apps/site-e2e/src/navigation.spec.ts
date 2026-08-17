import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Regression coverage for the fix to DocPageComponent/RecipePageComponent's route-reuse
// bug: every doc page matches the same `docs/**` route config, and every recipe page
// matches the same `recipes/:slug` config, so Angular's default RouteReuseStrategy
// reuses the SAME component instance across doc-to-doc (or recipe-to-recipe) client-side
// navigations rather than destroying and recreating it. The previous implementation read
// `ActivatedRoute.snapshot` once in `ngOnInit`, which only ever saw the FIRST page's data
// on later navigations within the same route config — live on production, this meant the
// URL changed but the <h1>, title, meta description, and JSON-LD silently kept showing
// the previous page's content. `DocPageComponent`/`RecipePageComponent` now derive their
// slug reactively via `toSignal(route.url / route.paramMap)` and set SEO/JSON-LD from an
// `effect()`, so this suite drives real in-app navigation (never a full `page.goto()`
// between the two pages under test) to prove the fix holds.

async function readMeta(page: Page) {
  return {
    h1: (await page.locator('h1').first().textContent())?.trim(),
    title: await page.title(),
    description: await page.locator('meta[name="description"]').getAttribute('content'),
    canonical: await page.locator('link[rel="canonical"]').getAttribute('href'),
    breadcrumbLd: await page.locator('#ld-breadcrumb').textContent(),
  };
}

// The URL changes synchronously as soon as the router navigates, but the reactive
// `toSignal(route.url / route.paramMap)` -> `effect()` chain that updates the <h1> and
// SEO tags runs a microtask later (zoneless change detection has no synchronous
// digest). `expect(page).toHaveURL()` resolving is therefore not proof the DOM has
// caught up — reading meta with one-shot `textContent()` calls immediately afterward is
// a race. Wait for the auto-retrying assertion below (which polls, unlike a bare
// `textContent()` read) before taking the "after" snapshot.
async function waitForH1(page: Page, expectedH1: string) {
  await expect(page.locator('h1').first()).toHaveText(expectedH1);
}

test.describe('client-side navigation updates page content and SEO tags', () => {
  test('docs sidebar: navigating between two doc pages updates everything, not just the URL', async ({
    page,
  }) => {
    await page.goto('/docs/packages/core');
    const before = await readMeta(page);
    expect(before.h1?.length).toBeGreaterThan(0);

    // A real in-app click through Angular's router — not page.goto() — is the only way
    // to exercise the RouteReuseStrategy component-instance-reuse path this test guards.
    await page.getByRole('link', { name: 'Catalog caching', exact: true }).click();
    await expect(page).toHaveURL(/\/docs\/core-concepts\/caching\/?$/);
    await waitForH1(page, 'Catalog caching');

    const after = await readMeta(page);
    expect(after.h1).not.toBe(before.h1);
    expect(after.title).not.toBe(before.title);
    expect(after.description).not.toBe(before.description);
    expect(after.canonical).not.toBe(before.canonical);
    expect(after.canonical).toContain('/docs/core-concepts/caching');
    // The core package doc sets `ld-software`; the caching concept doc doesn't, so a
    // stale `ld-software` tag surviving this navigation is exactly the bug
    // StructuredDataService.clearPageScoped() (Minor #10) exists to prevent.
    expect(await page.locator('#ld-software').count()).toBe(0);
    expect(after.breadcrumbLd).not.toBe(before.breadcrumbLd);

    // The a11y suite (a11y.spec.ts) only ever scans a route on a fresh page.goto() —
    // it never scans the DOM state reached by a client-side navigation, which is
    // exactly how the route-reuse bug this suite guards against shipped undetected.
    // Scanning here, on the post-navigation DOM, closes that gap for at least this path.
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('recipe to recipe via search: navigating between two recipe pages updates everything, not just the URL', async ({
    page,
  }) => {
    // Recipe pages have no direct recipe-to-recipe link on the page itself — the
    // recipes index (`/recipes`) matches a DIFFERENT route config than an individual
    // recipe (`/recipes/:slug`), so a recipes-index round trip would destroy and
    // recreate RecipePageComponent rather than reuse it. The search palette is the
    // only in-app path that navigates directly from one `:slug` match to another
    // within the SAME route config, which is what actually exercises the
    // RouteReuseStrategy component-instance-reuse bug this suite guards against.
    await page.goto('/recipes/ssr-with-express');
    const before = await readMeta(page);
    expect(before.h1).toBe('SSR with Express');

    await page.keyboard.press('ControlOrMeta+k');
    await page.getByRole('combobox').fill('Route-scoped catalogs');
    await page.getByRole('option', { name: /^Route-scoped catalogs/ }).click();
    await expect(page).toHaveURL(/\/recipes\/route-scoped-catalogs\/?$/);
    await waitForH1(page, 'Route-scoped catalogs');

    const after = await readMeta(page);
    expect(after.h1).not.toBe(before.h1);
    expect(after.title).not.toBe(before.title);
    expect(after.description).not.toBe(before.description);
    expect(after.canonical).not.toBe(before.canonical);
    expect(after.breadcrumbLd).not.toBe(before.breadcrumbLd);
  });

  test('search palette: navigating to a doc page via search updates everything, not just the URL', async ({
    page,
  }) => {
    await page.goto('/docs/getting-started');
    const before = await readMeta(page);

    await page.keyboard.press('ControlOrMeta+k');
    await page.getByRole('combobox').fill('Catalog caching');
    await page.getByRole('option', { name: /^Catalog caching/ }).click();
    await expect(page).toHaveURL(/\/docs\/core-concepts\/caching\/?$/);
    await waitForH1(page, 'Catalog caching');

    const after = await readMeta(page);
    expect(after.h1).not.toBe(before.h1);
    expect(after.title).not.toBe(before.title);
  });
});

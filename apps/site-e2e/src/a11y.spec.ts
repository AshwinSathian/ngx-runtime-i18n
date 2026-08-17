import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Read at runtime (rather than a static import) so this doesn't cross an Nx
// project boundary — apps/site isn't an importable npm-scoped package, and
// @nx/enforce-module-boundaries flags relative cross-project imports.
const routes: string[] = JSON.parse(
  readFileSync(join(__dirname, '../../site/generated/routes.json'), 'utf8'),
);

for (const route of routes) {
  test(`${route} has no automatically detectable accessibility violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}

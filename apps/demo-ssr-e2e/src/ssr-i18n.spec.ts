import { test, expect } from '@playwright/test';

// The server picks the language per request (?lang, then the `lang` cookie, then
// Accept-Language) and seeds TransferState, so the browser should hydrate into
// the same language the HTML was rendered in, with no flash and no mismatch.

test('server-renders the language from Accept-Language and ships the snapshot', async ({ request }) => {
  const html = await (await request.get('/', { headers: { 'Accept-Language': 'de' } })).text();

  expect(html).toContain('Hallo, Ashwin!');
  const state = JSON.parse(/<script id="ng-state" type="application\/json">(.*?)<\/script>/s.exec(html)![1]);
  const bootstrap = Object.entries(state).find(([k]) => k.endsWith(':bootstrap'));
  expect(bootstrap?.[1]).toMatchObject({ lang: 'de' });
});

test('?lang wins over Accept-Language', async ({ request }) => {
  const html = await (await request.get('/?lang=hi', { headers: { 'Accept-Language': 'de' } })).text();
  expect(html).toContain('नमस्ते, Ashwin!');
});

test.describe('hydration', () => {
  test.use({ locale: 'de-DE' });

  // The browser prefers German, but the URL asks for Hindi. Without the server's
  // snapshot the client would auto-detect `de` and swap the text after hydration.
  test('keeps the server-rendered language after hydration, without a mismatch', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error' || /NG0\d+|hydration/i.test(m.text())) problems.push(m.text());
    });

    await page.goto('/?lang=hi');
    // Client startup has finished (and any language swap would have happened) once
    // the service reports ready.
    await expect(page.locator('main')).toHaveAttribute('data-i18n-ready', 'true');

    await expect(page.locator('h1')).toHaveText('नमस्ते, Ashwin!');
    await expect(page.locator('main')).toHaveAttribute('lang', 'hi');
    expect(problems).toEqual([]);
  });
});

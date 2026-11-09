import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// index.html preloads two font files by their emitted name (media/<file>). The
// name comes straight from the @fontsource-variable package, so a package bump
// that renames a file would leave a preload pointing at nothing. Fail here instead.
describe('index.html font preloads', () => {
  const root = join(__dirname, '../../..');
  const html = readFileSync(join(__dirname, 'index.html'), 'utf8');
  const hrefs = [
    ...html.matchAll(/rel="preload" href="media\/([^"]+\.woff2)"/g),
  ].map((m) => m[1]);

  it('preloads the display and body faces', () => {
    expect(hrefs).toEqual([
      'bricolage-grotesque-latin-wght-normal.woff2',
      'figtree-latin-wght-normal.woff2',
    ]);
  });

  it('points at files the installed @fontsource-variable packages ship', () => {
    for (const file of hrefs) {
      const pkg = file.replace(/-latin-wght-normal\.woff2$/, '');
      expect(
        existsSync(
          join(root, 'node_modules/@fontsource-variable', pkg, 'files', file),
        ),
      ).toBe(true);
    }
  });
});

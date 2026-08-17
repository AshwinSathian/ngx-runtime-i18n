#!/usr/bin/env node
// Standalone Node script (not part of the Angular/TypeScript build, same convention as
// build-content.mjs) that renders one 1200x630 Open Graph PNG per major route: the
// landing page, each package doc page, /compare, and /faq. Reads titles/descriptions
// for package pages from generated/content-manifest.json (the same artifact
// ContentService imports at runtime) so OG copy can never drift from the doc page it
// represents. generated/routes.json is read too, purely as a sanity check that every
// route this script assumes still exists.
//
// Run via: node scripts/build-og-images.mjs   (cwd: apps/site)

import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// Fonts. Satori needs raw font binary data (TTF/OTF/WOFF — WOFF2 is NOT
// supported: https://github.com/vercel/satori#fonts), not CSS. The exact file
// names below were resolved empirically against the installed @fontsource
// package versions (Task 21), not guessed:
//   require.resolve('@fontsource/<pkg>/files/<family>-latin-<weight>-normal.woff')
// Each resolved to a real file on disk at write time; if a future @fontsource
// bump renames these files, this script fails loudly at `require.resolve()`
// rather than silently rendering with a missing font.
// ---------------------------------------------------------------------------

function loadFont(pkg, fileName) {
  const resolved = require.resolve(`@fontsource/${pkg}/files/${fileName}`);
  return fs.readFileSync(resolved);
}

const FONTS = [
  {
    name: 'Bricolage Grotesque',
    data: loadFont(
      'bricolage-grotesque',
      'bricolage-grotesque-latin-700-normal.woff',
    ),
    weight: 700,
    style: 'normal',
  },
  {
    name: 'IBM Plex Sans',
    data: loadFont('ibm-plex-sans', 'ibm-plex-sans-latin-400-normal.woff'),
    weight: 400,
    style: 'normal',
  },
  {
    name: 'IBM Plex Mono',
    data: loadFont('ibm-plex-mono', 'ibm-plex-mono-latin-400-normal.woff'),
    weight: 400,
    style: 'normal',
  },
];

// ---------------------------------------------------------------------------
// Rendering. Palette/type tokens copied from apps/site/src/styles.css's
// `--color-paper` / `--color-ink` / `--color-accent-en` light-mode values —
// OG images are static PNGs with no theme awareness, so they always use the
// light palette.
// ---------------------------------------------------------------------------

async function renderOgImage({ eyebrow, title, description }, outPath) {
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          background: '#FAF9F6',
          color: '#14181F',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                fontSize: 20,
                fontFamily: 'IBM Plex Mono',
                color: '#2C5CE6',
                textTransform: 'uppercase',
                letterSpacing: 2,
              },
              children: eyebrow,
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                fontSize: 56,
                fontWeight: 700,
                marginTop: 16,
                fontFamily: 'Bricolage Grotesque',
              },
              children: title,
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                fontSize: 28,
                marginTop: 16,
                color: '#14181F99',
                fontFamily: 'IBM Plex Sans',
              },
              children: description,
            },
          },
        ],
      },
    },
    { width: 1200, height: 630, fonts: FONTS },
  );

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } })
    .render()
    .asPng();
  fs.writeFileSync(outPath, png);
  console.log(
    `✓ ${path.relative(process.cwd(), outPath)} (${png.length} bytes)`,
  );
}

// ---------------------------------------------------------------------------
// Route -> image copy. Package pages pull title/description straight from
// generated/content-manifest.json so this can never hand-duplicate stale
// copy; the other routes' copy is sourced verbatim from their own page
// components (home.component.html, compare.component.ts, faq.component.ts).
// ---------------------------------------------------------------------------

async function main() {
  const manifestPath = path.join(
    process.cwd(),
    'generated',
    'content-manifest.json',
  );
  const routesPath = path.join(process.cwd(), 'generated', 'routes.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const routes = JSON.parse(fs.readFileSync(routesPath, 'utf8'));

  const outDir = path.join(process.cwd(), 'public', 'og');
  fs.mkdirSync(outDir, { recursive: true });

  const packageDocs = manifest.docs.filter((d) => d.slug[0] === 'packages');
  const requiredRoutes = [
    '/',
    '/compare',
    '/faq',
    ...packageDocs.map((d) => `/docs/${d.slug.join('/')}`),
  ];
  const missing = requiredRoutes.filter((r) => !routes.includes(r));
  if (missing.length > 0) {
    throw new Error(
      `OG image script expects these routes to exist in generated/routes.json: ${missing.join(', ')}`,
    );
  }

  await renderOgImage(
    {
      eyebrow: 'hero.tagline',
      title: 'ngx-runtime-i18n',
      description: 'Signals-first, SSR-safe runtime i18n for Angular 16+.',
    },
    path.join(outDir, 'home.png'),
  );

  for (const doc of packageDocs) {
    await renderOgImage(
      {
        eyebrow: doc.frontmatter.eyebrow,
        title: doc.frontmatter.title,
        description: doc.frontmatter.description,
      },
      path.join(outDir, `packages-${doc.slug[1]}.png`),
    );
  }

  await renderOgImage(
    {
      eyebrow: 'compare.matrix',
      title: 'How ngx-runtime-i18n compares',
      description:
        "The library author's own comparison against ngx-translate, transloco, and Angular's built-in i18n.",
    },
    path.join(outDir, 'compare.png'),
  );

  await renderOgImage(
    {
      eyebrow: 'faq.questions',
      title: 'Frequently asked questions',
      description:
        "Each answer traces to this repository's own source code, documentation, or a live npm registry check.",
    },
    path.join(outDir, 'faq.png'),
  );

  console.log(`Generated ${2 + packageDocs.length} OG images in ${outDir}.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

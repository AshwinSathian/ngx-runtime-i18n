import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import type { Catalog } from '@ngx-runtime-i18n/core';
import type { Request } from 'express';
import express from 'express';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { i18nServerProviders, I18nSnapshot } from './app/i18n.server.providers';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const i18nDir = join(browserDistFolder, 'i18n'); // catalogs live in dist/browser/i18n

const app = express();
const angularApp = new AngularNodeAppEngine();

function pickLang(
  req: Request,
  supported = ['en', 'hi', 'de'],
  fallback = 'en'
): string {
  // 1) URL ?lang=xx
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const qLang = url.searchParams.get('lang');
  if (qLang && supported.includes(qLang)) return qLang;

  // 2) Cookie "lang=xx"
  const cookie = req.headers.cookie ?? '';
  const m = /(?:^|;\s*)lang=([^;]+)/.exec(cookie);
  if (m && supported.includes(m[1])) return m[1];

  // 3) Accept-Language header
  const al = req.headers['accept-language'];
  if (typeof al === 'string') {
    const tags = al.split(',').map((s) => s.trim().split(';')[0].toLowerCase());
    for (const tag of tags) {
      if (supported.includes(tag)) return tag;
      const base = tag.split('-')[0];
      if (supported.includes(base)) return base;
    }
  }
  return fallback;
}

function readCatalogSafe(lang: string): Catalog | undefined {
  try {
    const p = join(i18nDir, `${lang}.json`);
    const json = readFileSync(p, 'utf8');
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

function buildSnapshot(req: Request): I18nSnapshot {
  const supported = ['en', 'hi', 'de'];
  const fallbacks = ['de'];
  const lang = pickLang(req, supported, 'en');

  // Always include default catalog if available; include active lang if different
  const catalogs: Record<string, Catalog> = {};
  const en = readCatalogSafe('en');
  if (en) catalogs['en'] = en;

  if (lang !== 'en') {
    const cur = readCatalogSafe(lang);
    if (cur) catalogs[lang] = cur;
  }

  for (const fb of fallbacks) {
    if (fb === 'en' || fb === lang) continue;
    const snap = readCatalogSafe(fb);
    if (snap) catalogs[fb] = snap;
  }

  const bootstrap = catalogs[lang] ?? catalogs['en'] ?? ({} as Catalog);
  return { lang, catalogs, bootstrap };
}

/**
 * Static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  })
);

/**
 * SSR render for all other routes.
 */
app.use('/**', (req, res, next) => {
  const snapshot = buildSnapshot(req);
  // Optional: log once per request
  // console.log('[i18n][SSR] lang=%s catalogs=%s', snapshot.lang, Object.keys(snapshot.catalogs));

  angularApp
    .handle(req, { providers: [...i18nServerProviders(snapshot)] })
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next()
    )
    .catch(next);
});

if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  console.log('[ngx-i18n][SSR] Serving dist from:', browserDistFolder);
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);

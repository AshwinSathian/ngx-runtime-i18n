#!/usr/bin/env node
// Standalone Node script (not part of the Angular/TypeScript build) that compiles
// Markdown files under apps/site/content/ into sanitized HTML plus JSON artifacts
// consumed at build time by the Angular app:
//   - apps/site/generated/content-manifest.json  (imported directly by ContentService)
//   - apps/site/public/search-index.json          (served as a static asset)
//   - apps/site/generated/routes.json              (route list, also consumed at build time)
//   - apps/site/public/sitemap.xml                 (generated from the same route list)
//
// Run via: node scripts/build-content.mjs   (cwd: apps/site)

import fs from 'node:fs';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import matter from 'gray-matter';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Frontmatter schemas
// ---------------------------------------------------------------------------

const docFrontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
  eyebrow: z.string(),
  order: z.number(),
  section: z.string(),
});

const recipeFrontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
  eyebrow: z.string(),
  order: z.number(),
  packages: z.array(z.string()),
});

// ---------------------------------------------------------------------------
// rehype plugin: wrap every <pre> emitted by rehype-pretty-code in a
// <content-code-block> custom element, operating on the hast tree (not a
// string replace) so code content containing literal "<pre>" text can never
// corrupt the wrapping.
// ---------------------------------------------------------------------------

function rehypeWrapCodeBlocks() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'pre' || parent == null || index == null) return;

      const wrapper = {
        type: 'element',
        tagName: 'content-code-block',
        properties: {},
        children: [node],
      };

      parent.children[index] = wrapper;
    });
  };
}

// ---------------------------------------------------------------------------
// rehype plugin: collect TOC headings (depth 2/3) from the actual compiled
// hast tree, reading each heading's REAL `id` attribute rather than
// re-deriving a slug from raw Markdown text in a separate code path.
//
// This MUST run after `rehypeSlug` in the pipeline below, so the ids it reads
// are the exact ones rehype-slug (backed by github-slugger) already assigned
// — the previous approach hand-rolled its own regex-based slugifier over the
// raw Markdown headings, which disagreed with github-slugger's punctuation/
// whitespace collapsing and duplicate-heading `-1`/`-2` suffixing, producing
// dead TOC anchors. Reading the real id off the hast tree makes that class of
// drift structurally impossible: there is only one slug algorithm now.
// ---------------------------------------------------------------------------

function headingText(node) {
  let text = '';
  visit(node, 'text', (textNode) => {
    text += textNode.value;
  });
  return text;
}

function rehypeCollectHeadings() {
  return (tree, file) => {
    const headings = [];
    visit(tree, 'element', (node) => {
      const match = /^h([23])$/.exec(node.tagName);
      if (!match) return;
      const id = node.properties?.id;
      if (typeof id !== 'string' || id.length === 0) return;
      headings.push({
        depth: Number(match[1]),
        text: headingText(node).trim(),
        id,
      });
    });
    file.data.headings = headings;
  };
}

// ---------------------------------------------------------------------------
// Markdown -> HTML compiler
// ---------------------------------------------------------------------------

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeSlug)
  .use(rehypeCollectHeadings)
  .use(rehypeAutolinkHeadings, { behavior: 'wrap' })
  .use(rehypePrettyCode, { theme: { light: 'github-light', dark: 'github-dark' } })
  .use(rehypeWrapCodeBlocks)
  .use(rehypeStringify, { allowDangerousHtml: true });

async function compile(markdown) {
  const file = await processor.process(markdown);
  return { html: String(file), headings: file.data.headings ?? [] };
}

// ---------------------------------------------------------------------------
// Content directory walker
// ---------------------------------------------------------------------------

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.md') ? [full] : [];
  });
}

async function buildDocs(contentDir) {
  const dir = path.join(contentDir, 'docs');
  const entries = [];
  for (const file of walk(dir)) {
    const raw = fs.readFileSync(file, 'utf8');
    const { data, content } = matter(raw);
    let frontmatter;
    try {
      frontmatter = docFrontmatterSchema.parse(data);
    } catch (err) {
      throw new Error(`Invalid frontmatter in ${file}: ${err.message}`, { cause: err });
    }
    const slug = path.relative(dir, file).replace(/\.md$/, '').split(path.sep);
    const { html, headings } = await compile(content);
    entries.push({ kind: 'doc', slug, frontmatter, html, headings });
  }
  return entries.sort((a, b) => a.frontmatter.order - b.frontmatter.order);
}

async function buildRecipes(contentDir) {
  const dir = path.join(contentDir, 'recipes');
  const entries = [];
  for (const file of walk(dir)) {
    const raw = fs.readFileSync(file, 'utf8');
    const { data, content } = matter(raw);
    let frontmatter;
    try {
      frontmatter = recipeFrontmatterSchema.parse(data);
    } catch (err) {
      throw new Error(`Invalid frontmatter in ${file}: ${err.message}`, { cause: err });
    }
    const slug = path.basename(file, '.md');
    const { html, headings } = await compile(content);
    entries.push({ kind: 'recipe', slug, frontmatter, html, headings });
  }
  return entries.sort((a, b) => a.frontmatter.order - b.frontmatter.order);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const contentDir = path.join(process.cwd(), 'content');
  const docs = await buildDocs(contentDir);
  const recipes = await buildRecipes(contentDir);

  fs.mkdirSync(path.join(process.cwd(), 'generated'), { recursive: true });
  fs.writeFileSync(
    path.join(process.cwd(), 'generated', 'content-manifest.json'),
    JSON.stringify({ docs, recipes }, null, 2),
  );

  const changelogRaw = fs.readFileSync(path.join(process.cwd(), '..', '..', 'CHANGELOG.md'), 'utf8');
  const { html: changelogHtml } = await compile(changelogRaw);
  fs.writeFileSync(path.join(process.cwd(), 'generated', 'changelog.json'), JSON.stringify({ html: changelogHtml }));

  const searchIndex = [
    ...docs.map((d) => ({
      title: d.frontmatter.title,
      description: d.frontmatter.description,
      href: `/docs/${d.slug.join('/')}`,
      section: d.frontmatter.section,
    })),
    ...recipes.map((r) => ({
      title: r.frontmatter.title,
      description: r.frontmatter.description,
      href: `/recipes/${r.slug}`,
      section: 'Recipes',
    })),
  ];
  fs.mkdirSync(path.join(process.cwd(), 'public'), { recursive: true });
  fs.writeFileSync(
    path.join(process.cwd(), 'public', 'search-index.json'),
    JSON.stringify(searchIndex, null, 2),
  );

  const routes = [
    '/',
    '/docs',
    '/recipes',
    '/compare',
    '/changelog',
    '/faq',
    ...docs.map((d) => `/docs/${d.slug.join('/')}`),
    ...recipes.map((r) => `/recipes/${r.slug}`),
  ];
  fs.writeFileSync(
    path.join(process.cwd(), 'generated', 'routes.json'),
    JSON.stringify(routes, null, 2),
  );

  const BASE_URL = 'https://i18n.ashwinsathian.com';
  // Every route here is a directory-style page (`/docs`, `/compare`, `/docs/getting-started`,
  // ...), and the live host 308-redirects the non-slash form of each one to a
  // trailing-slash URL (verified against production) — so the sitemap should list the
  // final canonical (already-redirected-to) URL directly, not the pre-redirect one. The
  // root route is the only exception: `/` has no further slash to add.
  const sitemapLoc = (route) => (route === '/' ? `${BASE_URL}/` : `${BASE_URL}${route}/`);
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map((r) => `  <url><loc>${sitemapLoc(r)}</loc></url>`).join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(process.cwd(), 'public', 'sitemap.xml'), sitemapXml);

  console.log(`Compiled ${docs.length} docs, ${recipes.length} recipes, changelog.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

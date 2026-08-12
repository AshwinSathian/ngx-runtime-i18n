#!/usr/bin/env node
// Standalone Node script (not part of the Angular/TypeScript build) that compiles
// Markdown files under apps/site/content/ into sanitized HTML plus JSON artifacts
// consumed at build time by the Angular app:
//   - apps/site/generated/content-manifest.json  (imported directly by ContentService)
//   - apps/site/public/search-index.json          (served as a static asset)
//   - apps/site/generated/routes.json              (consumed by the sitemap generator)
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
// Markdown -> HTML compiler
// ---------------------------------------------------------------------------

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeSlug)
  .use(rehypeAutolinkHeadings, { behavior: 'wrap' })
  .use(rehypePrettyCode, { theme: { light: 'github-light', dark: 'github-dark' } })
  .use(rehypeWrapCodeBlocks)
  .use(rehypeStringify, { allowDangerousHtml: true });

function extractHeadings(markdown) {
  const headings = [];
  let inFence = false;
  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.trim();
    if (/^```/.test(line) || /^~~~/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{2,3})\s+(.+)$/.exec(line);
    if (!m) continue;
    const depth = m[1].length;
    const text = m[2].trim();
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    headings.push({ depth, text, id });
  }
  return headings;
}

async function compile(markdown) {
  const file = await processor.process(markdown);
  return String(file);
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
    const html = await compile(content);
    entries.push({ kind: 'doc', slug, frontmatter, html, headings: extractHeadings(content) });
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
    const html = await compile(content);
    entries.push({ kind: 'recipe', slug, frontmatter, html, headings: extractHeadings(content) });
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

  console.log(`Compiled ${docs.length} docs, ${recipes.length} recipes.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

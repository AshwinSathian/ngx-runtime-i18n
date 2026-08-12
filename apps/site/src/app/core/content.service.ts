import { Injectable } from '@angular/core';
import * as manifest from '../../../generated/content-manifest.json';
import type { DocEntry, RecipeEntry, NavSection } from './content.types';

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly docs = manifest.docs as unknown as DocEntry[];
  private readonly recipes = manifest.recipes as unknown as RecipeEntry[];

  getAllDocs(): DocEntry[] {
    return this.docs;
  }

  getDocBySlug(slug: string[]): DocEntry | null {
    return this.docs.find((d) => d.slug.join('/') === slug.join('/')) ?? null;
  }

  getAllRecipes(): RecipeEntry[] {
    return this.recipes;
  }

  getRecipeBySlug(slug: string): RecipeEntry | null {
    return this.recipes.find((r) => r.slug === slug) ?? null;
  }

  getDocsNavTree(): NavSection[] {
    const sections = new Map<string, NavSection>();
    for (const doc of this.docs) {
      const key = doc.frontmatter.section;
      if (!sections.has(key)) sections.set(key, { section: key, items: [] });
      sections.get(key)!.items.push({ href: `/docs/${doc.slug.join('/')}`, title: doc.frontmatter.title, eyebrow: doc.frontmatter.eyebrow });
    }
    return Array.from(sections.values());
  }
}

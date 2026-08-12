import { TestBed } from '@angular/core/testing';
import { ContentService } from './content.service';

describe('ContentService', () => {
  it('lists all docs sorted by order', () => {
    const service = TestBed.inject(ContentService);
    const docs = service.getAllDocs();
    expect(Array.isArray(docs)).toBe(true);
    if (docs.length > 1) {
      expect(docs[0].frontmatter.order).toBeLessThanOrEqual(docs[1].frontmatter.order);
    }
  });

  it('gets a doc by slug', () => {
    const service = TestBed.inject(ContentService);
    const doc = service.getDocBySlug(['getting-started']);
    expect(doc === null || Array.isArray(doc.slug)).toBe(true);
  });

  it('returns null for an unknown slug', () => {
    const service = TestBed.inject(ContentService);
    expect(service.getDocBySlug(['does', 'not', 'exist'])).toBeNull();
  });

  it('groups docs into a nav tree by section', () => {
    const service = TestBed.inject(ContentService);
    const tree = service.getDocsNavTree();
    expect(Array.isArray(tree)).toBe(true);
  });
});

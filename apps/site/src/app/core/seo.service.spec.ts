import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { SeoService } from './seo.service';
import { StructuredDataService } from './structured-data.service';

describe('SeoService', () => {
  afterEach(() => {
    document.head.querySelector('link[rel="canonical"]')?.remove();
    document.head.querySelectorAll('script[id^="ld-"]').forEach((el) => el.remove());
  });

  it('sets the document title with the shared brand suffix by default', () => {
    const service = TestBed.inject(SeoService);
    const titleService = TestBed.inject(Title);
    const setTitleSpy = jest.spyOn(titleService, 'setTitle');

    service.setPageMeta({ title: 'Docs', description: 'Docs description.', path: '/docs' });

    expect(setTitleSpy).toHaveBeenCalledWith('Docs — ngx-runtime-i18n');
    expect(titleService.getTitle()).toBe('Docs — ngx-runtime-i18n');
  });

  it('omits the brand suffix when suffix: false is passed', () => {
    const service = TestBed.inject(SeoService);
    const titleService = TestBed.inject(Title);
    const setTitleSpy = jest.spyOn(titleService, 'setTitle');

    service.setPageMeta({
      title: 'ngx-runtime-i18n — Signals-first runtime i18n for Angular',
      description: 'Home description.',
      path: '/',
      suffix: false,
    });

    expect(setTitleSpy).toHaveBeenCalledWith(
      'ngx-runtime-i18n — Signals-first runtime i18n for Angular',
    );
  });

  it('updates the meta description tag with the given content', () => {
    const service = TestBed.inject(SeoService);
    const meta = TestBed.inject(Meta);
    const updateTagSpy = jest.spyOn(meta, 'updateTag');

    service.setPageMeta({ title: 'Recipes', description: 'Recipes description.', path: '/recipes' });

    expect(updateTagSpy).toHaveBeenCalledWith({
      name: 'description',
      content: 'Recipes description.',
    });
    expect(meta.getTag('name="description"')?.content).toBe('Recipes description.');
  });

  it('setNoIndex() adds a noindex robots meta tag', () => {
    const service = TestBed.inject(SeoService);
    const meta = TestBed.inject(Meta);
    const updateTagSpy = jest.spyOn(meta, 'updateTag');

    service.setNoIndex();

    expect(updateTagSpy).toHaveBeenCalledWith({ name: 'robots', content: 'noindex' });
    expect(meta.getTag('name="robots"')?.content).toBe('noindex');
  });

  it('adds a trailing-slash canonical link for a non-root path, matching the live host\'s own redirect behavior', () => {
    const service = TestBed.inject(SeoService);

    service.setPageMeta({ title: 'Docs', description: 'd', path: '/docs/getting-started' });

    const link = document.head.querySelector('link[rel="canonical"]');
    expect(link?.getAttribute('href')).toBe(
      'https://i18n.ashwinsathian.com/docs/getting-started/',
    );
  });

  it('does not add a second trailing slash to the root path', () => {
    const service = TestBed.inject(SeoService);

    service.setPageMeta({ title: 'Home', description: 'd', path: '/', suffix: false });

    const link = document.head.querySelector('link[rel="canonical"]');
    expect(link?.getAttribute('href')).toBe('https://i18n.ashwinsathian.com/');
  });

  it('updates an existing canonical link in place rather than appending a duplicate', () => {
    const service = TestBed.inject(SeoService);

    service.setPageMeta({ title: 'Docs', description: 'd', path: '/docs' });
    service.setPageMeta({ title: 'FAQ', description: 'd', path: '/faq' });

    const links = document.head.querySelectorAll('link[rel="canonical"]');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('https://i18n.ashwinsathian.com/faq/');
  });

  it('sets og:title/og:description/og:url/og:type/og:image and twitter:card', () => {
    const service = TestBed.inject(SeoService);
    const meta = TestBed.inject(Meta);

    service.setPageMeta({
      title: 'Recipes',
      description: 'Recipe description.',
      path: '/recipes',
    });

    expect(meta.getTag('property="og:title"')?.content).toBe(
      'Recipes — ngx-runtime-i18n',
    );
    expect(meta.getTag('property="og:description"')?.content).toBe('Recipe description.');
    expect(meta.getTag('property="og:url"')?.content).toBe(
      'https://i18n.ashwinsathian.com/recipes/',
    );
    expect(meta.getTag('property="og:type"')?.content).toBe('website');
    expect(meta.getTag('property="og:image"')?.content).toBe(
      'https://i18n.ashwinsathian.com/og/home.png',
    );
    expect(meta.getTag('name="twitter:card"')?.content).toBe('summary_large_image');
  });

  it('uses an explicit image and type when passed, instead of the site-wide default', () => {
    const service = TestBed.inject(SeoService);
    const meta = TestBed.inject(Meta);

    service.setPageMeta({
      title: 'SSR with Express',
      description: 'A recipe.',
      path: '/recipes/ssr-with-express',
      image: 'https://i18n.ashwinsathian.com/og/faq.png',
      type: 'article',
    });

    expect(meta.getTag('property="og:image"')?.content).toBe(
      'https://i18n.ashwinsathian.com/og/faq.png',
    );
    expect(meta.getTag('property="og:type"')?.content).toBe('article');
  });

  it('clears page-scoped structured data before applying new page meta, without touching site-wide tags', () => {
    const service = TestBed.inject(SeoService);
    const structuredData = TestBed.inject(StructuredDataService);
    structuredData.set('ld-website', { '@type': 'WebSite' });
    structuredData.set('ld-breadcrumb', { '@type': 'BreadcrumbList' });

    service.setPageMeta({ title: 'FAQ', description: 'd', path: '/faq' });

    expect(document.getElementById('ld-website')).not.toBeNull();
    expect(document.getElementById('ld-breadcrumb')).toBeNull();
  });
});

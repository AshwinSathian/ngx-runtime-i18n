import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  it('sets the document title with the shared brand suffix by default', () => {
    const service = TestBed.inject(SeoService);
    const titleService = TestBed.inject(Title);
    const setTitleSpy = jest.spyOn(titleService, 'setTitle');

    service.setPageMeta({ title: 'Docs', description: 'Docs description.' });

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

    service.setPageMeta({ title: 'Recipes', description: 'Recipes description.' });

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
});

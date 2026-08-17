import { TestBed } from '@angular/core/testing';
import { StructuredDataService } from './structured-data.service';

describe('StructuredDataService', () => {
  afterEach(() => {
    document.head.querySelectorAll('script[id^="ld-"]').forEach((el) => el.remove());
  });

  it('set() appends a JSON-LD script tag with the given id', () => {
    const service = TestBed.inject(StructuredDataService);

    service.set('ld-breadcrumb', { '@type': 'BreadcrumbList' });

    const script = document.getElementById('ld-breadcrumb');
    expect(script).not.toBeNull();
    expect(script?.getAttribute('type')).toBe('application/ld+json');
    expect(script?.textContent).toBe(JSON.stringify({ '@type': 'BreadcrumbList' }));
  });

  it('set() replaces a prior tag with the same id rather than appending a duplicate', () => {
    const service = TestBed.inject(StructuredDataService);

    service.set('ld-breadcrumb', { '@type': 'BreadcrumbList', name: 'first' });
    service.set('ld-breadcrumb', { '@type': 'BreadcrumbList', name: 'second' });

    expect(document.head.querySelectorAll('#ld-breadcrumb')).toHaveLength(1);
    expect(document.getElementById('ld-breadcrumb')?.textContent).toContain('second');
  });

  it('clearPageScoped() removes every ld-* tag except the site-wide ld-website/ld-person tags', () => {
    const service = TestBed.inject(StructuredDataService);
    service.set('ld-website', { '@type': 'WebSite' });
    service.set('ld-person', { '@type': 'Person' });
    service.set('ld-breadcrumb', { '@type': 'BreadcrumbList' });
    service.set('ld-software', { '@type': 'SoftwareApplication' });

    service.clearPageScoped();

    expect(document.getElementById('ld-website')).not.toBeNull();
    expect(document.getElementById('ld-person')).not.toBeNull();
    expect(document.getElementById('ld-breadcrumb')).toBeNull();
    expect(document.getElementById('ld-software')).toBeNull();
  });

  it('clearPageScoped() leaves a page that sets no structured data of its own with none left over from a prior page', () => {
    const service = TestBed.inject(StructuredDataService);
    // Simulates navigating away from a package doc page (ld-breadcrumb + ld-software)
    // to a page like the FAQ that doesn't reset those explicitly — the regression this
    // method exists to prevent (Task 27, item 10).
    service.set('ld-breadcrumb', { '@type': 'BreadcrumbList' });
    service.set('ld-software', { '@type': 'SoftwareApplication' });

    service.clearPageScoped();

    expect(document.head.querySelectorAll('script[id^="ld-"]')).toHaveLength(0);
  });
});

import { render, screen } from '@testing-library/angular';
import { ActivatedRoute, type UrlSegment } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { DocPageComponent } from './doc-page.component';

function activatedRouteFor(slug: string[]) {
  const segments = slug.map((path) => ({ path }) as UrlSegment);
  const url$ = new BehaviorSubject<UrlSegment[]>(segments);
  return {
    url$,
    route: {
      snapshot: { url: segments },
      url: url$,
    },
  };
}

async function renderForSlug(slug: string[]) {
  const { route, url$ } = activatedRouteFor(slug);
  const result = await render(DocPageComponent, {
    providers: [{ provide: ActivatedRoute, useValue: route }],
  });
  return { url$, ...result };
}

describe('DocPageComponent', () => {
  it('resolves the doc from the route snapshot URL segments and renders its frontmatter', async () => {
    await renderForSlug(['getting-started']);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Getting started' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Install the core and Angular packages and register provideRuntimeI18n().',
      ),
    ).toBeInTheDocument();
  });

  it('renders the compiled body HTML with content-callout and content-code-block tags intact', async () => {
    const { container } = await renderForSlug(['getting-started']);

    expect(
      container.querySelector('content-callout[data-type="tip"]'),
    ).not.toBeNull();
    expect(container.querySelector('content-code-block')).not.toBeNull();
    // Shiki's per-token dual-theme highlighting relies on inline `style` attributes
    // surviving sanitization too, not just the wrapper tags.
    expect(
      container.querySelector('content-code-block pre[style]'),
    ).not.toBeNull();
    expect(screen.getByText(/Catalogs are static assets/)).toBeInTheDocument();
  });

  it('renders the table of contents from the doc headings', async () => {
    const { container } = await renderForSlug(['getting-started']);

    const toc = screen.getByRole('navigation', { name: 'On this page' });
    expect(toc).toBeInTheDocument();
    const tocInstallLink = container.querySelector(
      'nav[aria-label="On this page"] a[href="#install"]',
    );
    expect(tocInstallLink).not.toBeNull();
    expect(tocInstallLink?.textContent?.trim()).toBe('Install');
  });

  it('renders nothing for an unknown slug', async () => {
    const { container } = await renderForSlug(['does-not-exist']);
    expect(container.querySelector('article')).toBeNull();
  });

  // Regression test for the Critical route-reuse bug: Angular's default
  // RouteReuseStrategy reuses this component instance across doc-to-doc navigations
  // (every doc page matches the same `docs/**` route config), so a fix that only reads
  // `route.snapshot.url` once (e.g. in `ngOnInit`) would keep showing the FIRST doc
  // forever. This drives `route.url` itself — the same Observable the real router
  // pushes new URL segments through on a route-config-reuse navigation — to prove the
  // rendered `<h1>` actually updates on a second navigation, not just on first mount.
  it('updates the rendered doc when route.url emits a different slug, without remounting the component', async () => {
    const { url$ } = await renderForSlug(['getting-started']);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Getting started' }),
    ).toBeInTheDocument();

    url$.next([{ path: 'core-concepts' } as UrlSegment, { path: 'fallback-chains' } as UrlSegment]);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Fallback chains' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: 'Getting started' })).not.toBeInTheDocument();
  });
});

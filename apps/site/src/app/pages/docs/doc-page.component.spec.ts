import { render, screen } from '@testing-library/angular';
import { ActivatedRoute } from '@angular/router';
import { DocPageComponent } from './doc-page.component';

function renderForSlug(slug: string[]) {
  return render(DocPageComponent, {
    providers: [
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { url: slug.map((path) => ({ path })) } },
      },
    ],
  });
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
});

import { render, screen } from '@testing-library/angular';
import { ActivatedRoute } from '@angular/router';
import { RecipePageComponent } from './recipe-page.component';

function renderForSlug(slug: string) {
  return render(RecipePageComponent, {
    providers: [
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: { get: () => slug } } },
      },
    ],
  });
}

describe('RecipePageComponent', () => {
  it('resolves the recipe from the route param and renders its frontmatter', async () => {
    await renderForSlug('ssr-with-express');

    expect(
      screen.getByRole('heading', { level: 1, name: 'SSR with Express' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Wire provideRuntimeI18nSsr() into an Express + Angular SSR server so the first response already carries the right catalog.',
      ),
    ).toBeInTheDocument();
  });

  it('renders frontmatter.packages as pill badges above the content', async () => {
    const { container } = await renderForSlug('ssr-with-express');

    expect(screen.getByText('@ngx-runtime-i18n/angular')).toBeInTheDocument();
    const article = container.querySelector('article');
    const badgeIndex =
      article?.innerHTML.indexOf('@ngx-runtime-i18n/angular') ?? -1;
    const proseIndex = article?.innerHTML.indexOf('prose') ?? -1;
    expect(badgeIndex).toBeGreaterThan(-1);
    expect(badgeIndex).toBeLessThan(proseIndex);
  });

  it('renders the compiled body HTML with content-callout and content-code-block tags intact', async () => {
    const { container } = await renderForSlug('ssr-with-express');

    expect(
      container.querySelector('content-callout[data-type="tip"]'),
    ).not.toBeNull();
    expect(container.querySelector('content-code-block')).not.toBeNull();
    expect(
      container.querySelector('content-code-block pre[style]'),
    ).not.toBeNull();
  });

  it('renders the table of contents from the recipe headings', async () => {
    const { container } = await renderForSlug('ssr-with-express');

    const toc = screen.getByRole('navigation', { name: 'On this page' });
    expect(toc).toBeInTheDocument();
    const tocLink = container.querySelector(
      'nav[aria-label="On this page"] a[href="#seeding-transferstate"]',
    );
    expect(tocLink).not.toBeNull();
  });

  it('renders nothing for an unknown slug', async () => {
    const { container } = await renderForSlug('does-not-exist');
    expect(container.querySelector('article')).toBeNull();
  });
});

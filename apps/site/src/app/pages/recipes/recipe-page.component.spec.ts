import { render, screen } from '@testing-library/angular';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { convertToParamMap, type ParamMap } from '@angular/router';
import { RecipePageComponent } from './recipe-page.component';

function activatedRouteFor(slug: string) {
  const paramMap = convertToParamMap({ slug });
  const paramMap$ = new BehaviorSubject<ParamMap>(paramMap);
  return {
    paramMap$,
    route: {
      snapshot: { paramMap },
      paramMap: paramMap$,
    },
  };
}

async function renderForSlug(slug: string) {
  const { route, paramMap$ } = activatedRouteFor(slug);
  const result = await render(RecipePageComponent, {
    providers: [{ provide: ActivatedRoute, useValue: route }],
  });
  return { paramMap$, ...result };
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

  // Regression test for the Critical route-reuse bug: Angular's default
  // RouteReuseStrategy reuses this component instance across recipe-to-recipe
  // navigations (every recipe page matches the same `recipes/:slug` route config), so a
  // fix that only reads `route.snapshot.paramMap` once (e.g. in `ngOnInit`) would keep
  // showing the FIRST recipe forever. This drives `route.paramMap` itself — the same
  // Observable the real router pushes new params through on a route-config-reuse
  // navigation — to prove the rendered `<h1>` actually updates on a second navigation,
  // not just on first mount.
  it('updates the rendered recipe when route.paramMap emits a different slug, without remounting the component', async () => {
    const { paramMap$ } = await renderForSlug('ssr-with-express');
    expect(
      screen.getByRole('heading', { level: 1, name: 'SSR with Express' }),
    ).toBeInTheDocument();

    paramMap$.next(convertToParamMap({ slug: 'route-scoped-catalogs' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Route-scoped catalogs' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 1, name: 'SSR with Express' }),
    ).not.toBeInTheDocument();
  });
});

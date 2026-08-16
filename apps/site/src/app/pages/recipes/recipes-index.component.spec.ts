import { render, screen } from '@testing-library/angular';
import { RecipesIndexComponent } from './recipes-index.component';

describe('RecipesIndexComponent', () => {
  it('lists every recipe from ContentService.getAllRecipes() as a linked card', async () => {
    await render(RecipesIndexComponent, {
      routes: [{ path: '**', children: [] }],
    });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Recipes' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /SSR with Express/ }),
    ).toHaveAttribute('href', '/recipes/ssr-with-express');
    expect(
      screen.getByRole('link', { name: /Route-scoped catalogs/ }),
    ).toHaveAttribute('href', '/recipes/route-scoped-catalogs');
    expect(
      screen.getByRole('link', { name: /Preloading and caching/ }),
    ).toHaveAttribute('href', '/recipes/preloading-and-caching');
  });
});

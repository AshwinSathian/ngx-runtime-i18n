import { render } from '@testing-library/angular';
import { RecipesLayoutComponent } from './recipes-layout.component';

describe('RecipesLayoutComponent', () => {
  it('renders a router outlet for child recipe routes', async () => {
    const { container } = await render(RecipesLayoutComponent, {
      routes: [{ path: '**', children: [] }],
    });

    expect(container.querySelector('router-outlet')).not.toBeNull();
  });
});

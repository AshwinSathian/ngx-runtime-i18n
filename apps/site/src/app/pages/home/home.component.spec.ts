import { render, screen } from '@testing-library/angular';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  it('renders the hero headline and a Get started link', async () => {
    await render(HomeComponent);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /get started/i }),
    ).toBeInTheDocument();
  });

  it('renders the real hero language-cycle demo, the feature grid, and the package matrix', async () => {
    await render(HomeComponent);
    expect(await screen.findByText('everyone')).toBeInTheDocument();
    expect(screen.getByText('Fallback chains')).toBeInTheDocument();
    expect(screen.getByText('@ngx-runtime-i18n/angular')).toBeInTheDocument();
  });
});

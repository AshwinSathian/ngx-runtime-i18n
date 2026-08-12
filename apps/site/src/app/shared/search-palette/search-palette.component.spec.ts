import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { SearchPaletteComponent } from './search-palette.component';

const items = [
  { title: 'Getting started', description: 'Install and configure.', href: '/docs/getting-started', section: 'Docs' },
  { title: 'Route-scoped catalogs', description: 'Load catalogs per route.', href: '/recipes/route-scoped-catalogs', section: 'Recipes' },
];

describe('SearchPaletteComponent', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve(items) }) as unknown as typeof fetch;
    document.body.innerHTML = '<button id="search-trigger">Search</button>';
  });

  it('opens on Cmd+K and filters results as the user types', async () => {
    const user = userEvent.setup();
    await render(SearchPaletteComponent);

    await user.keyboard('{Meta>}k{/Meta}');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await user.type(screen.getByRole('combobox'), 'route');
    expect(await screen.findByText('Route-scoped catalogs')).toBeInTheDocument();
    expect(screen.queryByText('Getting started')).not.toBeInTheDocument();
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    await render(SearchPaletteComponent);
    await user.keyboard('{Meta>}k{/Meta}');
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.getElementById('search-trigger')).toHaveFocus();
  });
});

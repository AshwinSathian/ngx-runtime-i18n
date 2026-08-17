import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Router } from '@angular/router';
import { SearchPaletteComponent } from './search-palette.component';

const items = [
  { title: 'Getting started', description: 'Install and configure.', href: '/docs/getting-started', section: 'Docs' },
  { title: 'Route-scoped catalogs', description: 'Load catalogs per route.', href: '/recipes/route-scoped-catalogs', section: 'Recipes' },
  { title: 'Route guards', description: 'Guard routes by permission.', href: '/recipes/route-guards', section: 'Recipes' },
];

describe('SearchPaletteComponent', () => {
  beforeEach(() => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve(items) }) as unknown as typeof fetch;
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

  it('exposes correct listbox/option ARIA roles with the first result highlighted by default', async () => {
    const user = userEvent.setup();
    await render(SearchPaletteComponent);
    await user.keyboard('{Meta>}k{/Meta}');
    await screen.findByRole('dialog');

    const combobox = screen.getByRole('combobox');
    await user.type(combobox, 'route');
    const options = await screen.findAllByRole('option');

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).toHaveAttribute('aria-selected', 'false');
    expect(combobox).toHaveAttribute('aria-activedescendant', options[0].id);
  });

  it('moves the highlighted option with ArrowDown/ArrowUp and wraps at the ends', async () => {
    const user = userEvent.setup();
    await render(SearchPaletteComponent);
    await user.keyboard('{Meta>}k{/Meta}');
    await screen.findByRole('dialog');

    const combobox = screen.getByRole('combobox');
    await user.type(combobox, 'route');
    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(2);

    await user.keyboard('{ArrowDown}');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    expect(combobox).toHaveAttribute('aria-activedescendant', options[1].id);

    // Wraps back to the first option.
    await user.keyboard('{ArrowDown}');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).toHaveAttribute('aria-selected', 'false');
    expect(combobox).toHaveAttribute('aria-activedescendant', options[0].id);

    // Wraps to the last option going up from the first.
    await user.keyboard('{ArrowUp}');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('resets the highlighted option to the first result whenever the query changes', async () => {
    const user = userEvent.setup();
    await render(SearchPaletteComponent);
    await user.keyboard('{Meta>}k{/Meta}');
    await screen.findByRole('dialog');

    const combobox = screen.getByRole('combobox');
    await user.type(combobox, 'route');
    await screen.findAllByRole('option');
    await user.keyboard('{ArrowDown}');

    await user.type(combobox, ' guards');
    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(combobox).toHaveAttribute('aria-activedescendant', options[0].id);
  });

  it('navigates to the highlighted option on Enter, same as clicking it', async () => {
    const user = userEvent.setup();
    const { fixture } = await render(SearchPaletteComponent);
    const router = fixture.debugElement.injector.get(Router);
    const navigateSpy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    await user.keyboard('{Meta>}k{/Meta}');
    await screen.findByRole('dialog');

    const combobox = screen.getByRole('combobox');
    await user.type(combobox, 'route');
    await screen.findAllByRole('option');
    await user.keyboard('{ArrowDown}{Enter}');

    expect(navigateSpy).toHaveBeenCalledWith('/recipes/route-guards');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('still navigates on mouse click without disturbing keyboard highlight state', async () => {
    const user = userEvent.setup();
    const { fixture } = await render(SearchPaletteComponent);
    const router = fixture.debugElement.injector.get(Router);
    const navigateSpy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    await user.keyboard('{Meta>}k{/Meta}');
    await screen.findByRole('dialog');

    await user.type(screen.getByRole('combobox'), 'route');
    const options = await screen.findAllByRole('option');
    await user.click(options[1]);

    expect(navigateSpy).toHaveBeenCalledWith('/recipes/route-guards');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('degrades to an empty, non-crashing palette when the search index fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const user = userEvent.setup();
    await render(SearchPaletteComponent);

    await user.keyboard('{Meta>}k{/Meta}');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(await screen.findByText('No results found.')).toBeInTheDocument();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

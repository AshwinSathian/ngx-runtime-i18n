import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MobileNavComponent } from './mobile-nav.component';

const links = [
  { href: '/docs', label: 'Docs' },
  { href: '/recipes', label: 'Recipes' },
];

describe('MobileNavComponent', () => {
  it('opens on click, exposes aria-expanded, and closes with focus restored on Escape', async () => {
    const user = userEvent.setup();
    await render(MobileNavComponent, { inputs: { links } });

    const trigger = screen.getByRole('button', { name: /open menu/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(screen.getByRole('button', { name: /close menu/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Docs' })).toBeVisible();

    await user.keyboard('{Escape}');
    const reopenedTrigger = screen.getByRole('button', { name: /open menu/i });
    expect(reopenedTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(reopenedTrigger).toHaveFocus();
  });
});

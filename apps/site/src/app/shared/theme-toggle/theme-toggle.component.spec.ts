import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ThemeToggleComponent } from './theme-toggle.component';

describe('ThemeToggleComponent', () => {
  it('toggles the theme and updates its own aria-label when clicked', async () => {
    const user = userEvent.setup();
    await render(ThemeToggleComponent);

    const button = screen.getByRole('button', { name: /switch to dark theme/i });
    await user.click(button);

    expect(screen.getByRole('button', { name: /switch to light theme/i })).toBeInTheDocument();
  });
});

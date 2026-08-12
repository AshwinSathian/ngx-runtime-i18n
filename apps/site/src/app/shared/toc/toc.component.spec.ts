import { render, screen } from '@testing-library/angular';
import { TocComponent } from './toc.component';

describe('TocComponent', () => {
  it('renders a nav item per heading, indented by depth', async () => {
    await render(TocComponent, {
      componentInputs: {
        headings: [
          { depth: 2, text: 'Install', id: 'install' },
          { depth: 3, text: 'Next steps', id: 'next-steps' },
        ],
      },
    });

    expect(
      screen.getByRole('navigation', { name: 'On this page' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Install' })).toHaveAttribute(
      'href',
      '#install',
    );
    expect(screen.getByRole('link', { name: 'Next steps' })).toHaveAttribute(
      'href',
      '#next-steps',
    );
  });

  it('renders nothing when there are no headings', async () => {
    await render(TocComponent, { componentInputs: { headings: [] } });
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});

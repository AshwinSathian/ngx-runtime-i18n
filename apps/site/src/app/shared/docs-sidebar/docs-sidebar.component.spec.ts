import { render, screen } from '@testing-library/angular';
import { DocsSidebarComponent } from './docs-sidebar.component';
import type { NavSection } from '../../core/content.types';

const tree: NavSection[] = [
  {
    section: 'Start here',
    items: [
      {
        href: '/docs/getting-started',
        title: 'Getting started',
        eyebrow: 'docs.getting-started',
      },
    ],
  },
];

describe('DocsSidebarComponent', () => {
  it('renders each section heading and its items as links', async () => {
    await render(DocsSidebarComponent, {
      componentInputs: { tree },
      routes: [{ path: '**', children: [] }],
    });

    expect(screen.getByText('Start here')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Getting started' }),
    ).toHaveAttribute('href', '/docs/getting-started');
  });

  it('marks the link matching the current route as the current page', async () => {
    await render(DocsSidebarComponent, {
      componentInputs: { tree },
      routes: [{ path: '**', children: [] }],
      initialRoute: 'docs/getting-started',
    });

    const link = screen.getByRole('link', { name: 'Getting started' });
    expect(link).toHaveAttribute('aria-current', 'page');
  });
});

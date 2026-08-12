import { render, screen } from '@testing-library/angular';
import { DocsLayoutComponent } from './docs-layout.component';

describe('DocsLayoutComponent', () => {
  it('feeds ContentService.getDocsNavTree() into the sidebar', async () => {
    await render(DocsLayoutComponent, {
      routes: [{ path: '**', children: [] }],
    });

    expect(
      screen.getByRole('navigation', { name: 'Documentation' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Getting started' }),
    ).toHaveAttribute('href', '/docs/getting-started');
  });
});

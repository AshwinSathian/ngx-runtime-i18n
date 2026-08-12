import { render, screen } from '@testing-library/angular';
import { DocsIndexComponent } from './docs-index.component';

describe('DocsIndexComponent', () => {
  it('lists every doc from ContentService.getDocsNavTree(), grouped by section', async () => {
    await render(DocsIndexComponent, {
      routes: [{ path: '**', children: [] }],
    });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Documentation' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Start here')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Getting started' }),
    ).toHaveAttribute('href', '/docs/getting-started');
  });
});

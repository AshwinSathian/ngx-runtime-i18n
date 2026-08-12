import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'docs',
    loadComponent: () =>
      import('./pages/docs/docs-layout.component').then(
        (m) => m.DocsLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/docs/docs-index.component').then(
            (m) => m.DocsIndexComponent,
          ),
      },
      {
        path: '**',
        loadComponent: () =>
          import('./pages/docs/doc-page.component').then(
            (m) => m.DocPageComponent,
          ),
      },
    ],
  },
];

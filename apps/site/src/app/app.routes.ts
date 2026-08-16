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
  {
    path: 'recipes',
    loadComponent: () =>
      import('./pages/recipes/recipes-layout.component').then(
        (m) => m.RecipesLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/recipes/recipes-index.component').then(
            (m) => m.RecipesIndexComponent,
          ),
      },
      {
        path: ':slug',
        loadComponent: () =>
          import('./pages/recipes/recipe-page.component').then(
            (m) => m.RecipePageComponent,
          ),
      },
    ],
  },
  {
    path: 'compare',
    loadComponent: () =>
      import('./pages/compare/compare.component').then(
        (m) => m.CompareComponent,
      ),
  },
  {
    path: 'changelog',
    loadComponent: () =>
      import('./pages/changelog/changelog.component').then(
        (m) => m.ChangelogComponent,
      ),
  },
  {
    path: 'faq',
    loadComponent: () =>
      import('./pages/faq/faq.component').then((m) => m.FaqComponent),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found/not-found.component').then(
        (m) => m.NotFoundComponent,
      ),
  },
];

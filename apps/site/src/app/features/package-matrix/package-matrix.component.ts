import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PackageCardComponent } from '../../shared/package-card/package-card.component';

// Descriptions sourced verbatim from root README.md's "Packages" table.
// Publish status re-verified directly against the npm registry (`npm view
// @ngx-runtime-i18n/<pkg> version`) rather than trusted from README prose,
// since all six packages now resolve to 2.1.0 — the README's per-package
// "Not yet published" notes for material/schematics/cli predate the 2.1.0
// release (see CHANGELOG.md's 2.1.0 entry, which publishes those three for
// the first time) and are stale at the time this page was written.
interface PackageEntry {
  readonly name: string;
  readonly description: string;
  readonly status: 'published' | 'source-only';
  readonly npmUrl?: string;
  readonly docsHref: string;
}

const PACKAGES: readonly PackageEntry[] = [
  {
    name: '@ngx-runtime-i18n/core',
    description:
      'Framework-agnostic primitives: the ICU-lite formatter and shared types.',
    status: 'published',
    npmUrl: 'https://www.npmjs.com/package/@ngx-runtime-i18n/core',
    docsHref: '/docs/packages/core',
  },
  {
    name: '@ngx-runtime-i18n/angular',
    description:
      'The Angular wrapper: signals, an SSR-safe service, and pipes.',
    status: 'published',
    npmUrl: 'https://www.npmjs.com/package/@ngx-runtime-i18n/angular',
    docsHref: '/docs/packages/angular',
  },
  {
    name: '@ngx-runtime-i18n/primeng',
    description:
      'Optional PrimeNG adapter that mirrors runtime language changes.',
    status: 'published',
    npmUrl: 'https://www.npmjs.com/package/@ngx-runtime-i18n/primeng',
    docsHref: '/docs/packages/primeng',
  },
  {
    name: '@ngx-runtime-i18n/material',
    description:
      'Optional Angular Material adapter for paginator, sort, stepper, and datepicker labels.',
    status: 'published',
    npmUrl: 'https://www.npmjs.com/package/@ngx-runtime-i18n/material',
    docsHref: '/docs/packages/material',
  },
  {
    name: '@ngx-runtime-i18n/schematics',
    description:
      'An ng add schematic that scaffolds provideRuntimeI18n() into an existing project.',
    status: 'published',
    npmUrl: 'https://www.npmjs.com/package/@ngx-runtime-i18n/schematics',
    docsHref: '/docs/packages/schematics',
  },
  {
    name: '@ngx-runtime-i18n/cli',
    description:
      'A CLI for extracting translation keys from source and validating catalogs.',
    status: 'published',
    npmUrl: 'https://www.npmjs.com/package/@ngx-runtime-i18n/cli',
    docsHref: '/docs/packages/cli',
  },
];

@Component({
  selector: 'app-package-matrix',
  standalone: true,
  imports: [PackageCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      @for (pkg of packages; track pkg.name) {
        <app-package-card
          [name]="pkg.name"
          [description]="pkg.description"
          [status]="pkg.status"
          [npmUrl]="pkg.npmUrl"
          [docsHref]="pkg.docsHref"
        />
      }
    </div>
  `,
})
export class PackageMatrixComponent {
  protected readonly packages = PACKAGES;
}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

const DOCS_LINKS = [
  { href: '/docs/getting-started', label: 'Getting Started' },
  { href: '/docs', label: 'Docs' },
  { href: '/recipes', label: 'Recipes' },
  { href: '/faq', label: 'FAQ' },
];

const PROJECT_LINKS = [
  { href: '/compare', label: 'Compare' },
  { href: '/changelog', label: 'Changelog' },
];

const PACKAGE_LINKS = [
  { href: 'https://www.npmjs.com/package/@ngx-runtime-i18n/core', label: '@ngx-runtime-i18n/core' },
  { href: 'https://www.npmjs.com/package/@ngx-runtime-i18n/angular', label: '@ngx-runtime-i18n/angular' },
  { href: 'https://www.npmjs.com/package/@ngx-runtime-i18n/material', label: '@ngx-runtime-i18n/material' },
  { href: 'https://www.npmjs.com/package/@ngx-runtime-i18n/primeng', label: '@ngx-runtime-i18n/primeng' },
];

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="border-t border-rule bg-paper">
      <div class="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div class="sm:col-span-2 md:col-span-1">
          <a routerLink="/" class="font-display text-lg font-semibold">ngx-runtime-i18n</a>
          <p class="mt-2 max-w-xs text-sm text-ink/70">Runtime-first internationalization for Angular applications.</p>
        </div>
        <nav aria-label="Docs">
          <h3 class="text-sm font-semibold">Docs</h3>
          <ul class="mt-3 flex flex-col gap-2 text-sm text-ink/70">
            @for (link of docsLinks; track link.href) {
              <li><a [routerLink]="link.href" class="hover:text-accent-en">{{ link.label }}</a></li>
            }
          </ul>
        </nav>
        <nav aria-label="Project">
          <h3 class="text-sm font-semibold">Project</h3>
          <ul class="mt-3 flex flex-col gap-2 text-sm text-ink/70">
            @for (link of projectLinks; track link.href) {
              <li><a [routerLink]="link.href" class="hover:text-accent-en">{{ link.label }}</a></li>
            }
            <li><a href="https://github.com/AshwinSathian/ngx-runtime-i18n" class="hover:text-accent-en">GitHub</a></li>
          </ul>
        </nav>
        <nav aria-label="Packages">
          <h3 class="text-sm font-semibold">Packages</h3>
          <ul class="mt-3 flex flex-col gap-2 text-sm text-ink/70">
            @for (link of packageLinks; track link.href) {
              <li><a [href]="link.href" class="hover:text-accent-en">{{ link.label }}</a></li>
            }
          </ul>
        </nav>
      </div>
      <div class="border-t border-rule px-4 py-6 text-center text-xs text-ink/60">
        &copy; {{ year }} ngx-runtime-i18n. Released under the MIT License.
      </div>
    </footer>
  `,
})
export class SiteFooterComponent {
  protected readonly docsLinks = DOCS_LINKS;
  protected readonly projectLinks = PROJECT_LINKS;
  protected readonly packageLinks = PACKAGE_LINKS;
  protected readonly year = new Date().getFullYear();
}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { MobileNavComponent } from '../mobile-nav/mobile-nav.component';
import { GithubIconComponent } from '../icons/github-icon.component';
import { PackageIconComponent } from '../icons/package-icon.component';

const NAV_LINKS = [
  { href: '/docs', label: 'Docs' },
  { href: '/recipes', label: 'Recipes' },
  { href: '/compare', label: 'Compare' },
  { href: '/changelog', label: 'Changelog' },
];

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [RouterLink, ThemeToggleComponent, MobileNavComponent, GithubIconComponent, PackageIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-30 border-b border-rule bg-paper/90 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <a routerLink="/" class="font-display text-lg font-semibold">ngx-runtime-i18n</a>
        <nav aria-label="Primary" class="hidden md:block">
          <ul class="flex items-center gap-6 text-sm">
            @for (link of navLinks; track link.href) {
              <li><a [routerLink]="link.href" class="hover:text-accent-en">{{ link.label }}</a></li>
            }
          </ul>
        </nav>
        <div class="flex items-center gap-2">
          <button
            id="search-trigger"
            type="button"
            class="hidden items-center gap-2 rounded-md border border-rule px-3 py-1.5 text-sm text-ink/70 md:flex"
            aria-label="Open search (Cmd+K)"
          >
            Search
            <kbd class="rounded border border-rule px-1.5 py-0.5 font-mono text-xs">⌘K</kbd>
          </button>
          <a href="https://github.com/AshwinSathian/ngx-runtime-i18n" aria-label="GitHub repository" class="p-2"><app-github-icon /></a>
          <a href="https://www.npmjs.com/package/@ngx-runtime-i18n/angular" aria-label="npm package" class="p-2"><app-package-icon /></a>
          <app-theme-toggle />
          <app-mobile-nav [links]="navLinks" />
        </div>
      </div>
    </header>
  `,
})
export class SiteHeaderComponent {
  protected readonly navLinks = NAV_LINKS;
}

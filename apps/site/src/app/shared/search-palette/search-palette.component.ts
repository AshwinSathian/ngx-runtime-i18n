import { ChangeDetectionStrategy, Component, HostListener, afterNextRender, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';

interface SearchItem { title: string; description: string; href: string; section: string; }

@Component({
  selector: 'app-search-palette',
  standalone: true,
  imports: [A11yModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-50 flex items-start justify-center pt-24">
        <button type="button" class="absolute inset-0 bg-ink/40" aria-label="Close search" (click)="close()"></button>
        <div role="dialog" aria-modal="true" aria-label="Search" cdkTrapFocus cdkTrapFocusAutoCapture class="relative w-[90vw] max-w-lg overflow-hidden rounded-lg border border-rule bg-paper shadow-xl">
          <input
            #searchInput
            role="combobox"
            aria-expanded="true"
            [attr.aria-controls]="'search-results'"
            placeholder="Search docs and recipes..."
            class="w-full border-b border-rule p-4 outline-none"
            (input)="query.set($any($event.target).value)"
          />
          <ul id="search-results" class="max-h-80 overflow-y-auto p-2">
            @for (item of filtered(); track item.href) {
              <li>
                <button type="button" (click)="navigate(item.href)" class="w-full rounded-md p-3 text-left hover:bg-accent-en/10">
                  <p class="text-sm font-medium">{{ item.title }}</p>
                  <p class="text-xs text-ink/60">{{ item.description }}</p>
                </button>
              </li>
            } @empty {
              <li class="p-4 text-sm text-ink/60">No results found.</li>
            }
          </ul>
        </div>
      </div>
    }
  `,
})
export class SearchPaletteComponent {
  protected readonly open = signal(false);
  protected readonly query = signal('');
  private readonly items = signal<SearchItem[]>([]);

  protected readonly filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    if (!q) return this.items();
    return this.items().filter((i) => `${i.title} ${i.description}`.toLowerCase().includes(q));
  });

  private readonly router = inject(Router);

  constructor() {
    // Browser-only: `document` and a relative `fetch()` URL don't resolve during
    // SSR/prerendering, so this must not run on the server.
    afterNextRender(() => {
      fetch('/search-index.json').then((r) => r.json()).then((data) => this.items.set(data));
      document.getElementById('search-trigger')?.addEventListener('click', () => this.openPalette());
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (this.open()) {
        this.close();
      } else {
        this.openPalette();
      }
    }
    if (e.key === 'Escape' && this.open()) this.close();
  }

  navigate(href: string): void {
    this.close();
    this.router.navigateByUrl(href);
  }

  private openPalette(): void {
    this.query.set('');
    this.open.set(true);
  }

  close(): void {
    this.open.set(false);
    document.getElementById('search-trigger')?.focus();
  }
}

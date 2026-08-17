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
            aria-autocomplete="list"
            [attr.aria-controls]="'search-results'"
            [attr.aria-activedescendant]="activeDescendantId()"
            placeholder="Search docs and recipes..."
            class="w-full border-b border-rule p-4 outline-none"
            (input)="onQueryInput($any($event.target).value)"
          />
          <ul id="search-results" role="listbox" class="max-h-80 overflow-y-auto p-2">
            @for (item of filtered(); track item.href; let i = $index) {
              <li role="presentation">
                <button
                  type="button"
                  role="option"
                  [id]="optionId(i)"
                  [attr.aria-selected]="i === activeIndex()"
                  tabindex="-1"
                  (mouseenter)="highlightedIndex.set(i)"
                  (click)="navigate(item.href)"
                  class="w-full rounded-md p-3 text-left hover:bg-accent-en/10 {{ i === activeIndex() ? 'bg-accent-en/10' : '' }}"
                >
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
  protected readonly highlightedIndex = signal(0);
  private readonly items = signal<SearchItem[]>([]);

  protected readonly filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    if (!q) return this.items();
    return this.items().filter((i) => `${i.title} ${i.description}`.toLowerCase().includes(q));
  });

  /** Clamps the raw highlighted index to a valid position in the current result set. */
  protected readonly activeIndex = computed(() => {
    const len = this.filtered().length;
    if (len === 0) return -1;
    return Math.min(this.highlightedIndex(), len - 1);
  });

  protected readonly activeDescendantId = computed(() => {
    const idx = this.activeIndex();
    return idx >= 0 ? this.optionId(idx) : null;
  });

  private readonly router = inject(Router);

  constructor() {
    // Browser-only: `document` and a relative `fetch()` URL don't resolve during
    // SSR/prerendering, so this must not run on the server.
    afterNextRender(() => {
      fetch('/search-index.json')
        .then((r) => {
          if (!r.ok) throw new Error(`search-index.json responded with ${r.status}`);
          return r.json();
        })
        .then((data) => this.items.set(data))
        .catch((err) => {
          // Leaves `items` at its initial empty signal value, which the template's
          // `@empty` block already renders as "No results found." — a 404/offline
          // fetch degrades to a gracefully-empty palette instead of an unhandled
          // promise rejection.
          console.warn('Failed to load search index:', err);
        });
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
      return;
    }
    if (!this.open()) return;

    if (e.key === 'Escape') {
      this.close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.moveHighlight(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.moveHighlight(-1);
    } else if (e.key === 'Enter') {
      const item = this.filtered()[this.activeIndex()];
      if (item) {
        e.preventDefault();
        this.navigate(item.href);
      }
    }
  }

  protected optionId(index: number): string {
    return `search-option-${index}`;
  }

  protected onQueryInput(value: string): void {
    this.query.set(value);
    this.highlightedIndex.set(0);
  }

  private moveHighlight(delta: number): void {
    const len = this.filtered().length;
    if (len === 0) return;
    const current = this.activeIndex();
    const next = (current + delta + len) % len;
    this.highlightedIndex.set(next);
    document.getElementById(this.optionId(next))?.scrollIntoView?.({ block: 'nearest' });
  }

  navigate(href: string): void {
    this.close();
    this.router.navigateByUrl(href);
  }

  private openPalette(): void {
    this.query.set('');
    this.highlightedIndex.set(0);
    this.open.set(true);
  }

  close(): void {
    this.open.set(false);
    document.getElementById('search-trigger')?.focus();
  }
}

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
              @if (loading()) {
                <li class="p-4 text-sm text-ink/60">Loading…</li>
              } @else {
                <li class="p-4 text-sm text-ink/60">No results found.</li>
              }
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
  protected readonly loading = signal(true);
  private readonly items = signal<SearchItem[]>([]);
  // The element that was actually clicked to open the palette (desktop button or
  // mobile-nav's search entry) - focus returns to THAT element on close, not always
  // the desktop trigger. Stays null when opened via the Cmd+K shortcut instead of a
  // click; close() falls back to the first known trigger in that case.
  private lastTriggerEl: HTMLElement | null = null;

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
          // `@empty` block distinguishes from the loading state below and renders as
          // "No results found." — a 404/offline fetch degrades to a gracefully-empty
          // palette instead of an unhandled promise rejection.
          console.warn('Failed to load search index:', err);
        })
        .finally(() => this.loading.set(false));

      // Delegated on `document` (rather than queried once here) because the mobile-nav
      // trigger only exists in the DOM while its panel is open - a one-time
      // querySelectorAll at this point would miss it entirely, and it's the only way
      // search was reachable on mobile at all before this fix (the desktop trigger is
      // `hidden` there). Every current and future trigger just needs this one
      // attribute; no per-element wiring required.
      document.addEventListener('click', (e) => {
        const trigger = (e.target as HTMLElement)?.closest?.(
          '[data-search-trigger]'
        ) as HTMLElement | null;
        if (trigger) {
          this.lastTriggerEl = trigger;
          this.openPalette();
        }
      });
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
    } else if (e.key === 'Home') {
      e.preventDefault();
      this.setHighlighted(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      this.setHighlighted(this.filtered().length - 1);
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
    this.setHighlighted(next);
  }

  /** Sets the highlighted option by absolute index (used by Home/End/wrap-around) and scrolls it into view. */
  private setHighlighted(index: number): void {
    const len = this.filtered().length;
    if (len === 0 || index < 0 || index >= len) return;
    this.highlightedIndex.set(index);
    document.getElementById(this.optionId(index))?.scrollIntoView?.({ block: 'nearest' });
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
    // Falls back to the first known trigger when opened via the Cmd+K shortcut
    // rather than a click (lastTriggerEl stays null in that case).
    (this.lastTriggerEl ?? document.querySelector<HTMLElement>('[data-search-trigger]'))?.focus();
  }
}

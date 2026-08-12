import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-skip-link',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<a
    href="#main-content"
    class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent-en focus:px-4 focus:py-2 focus:text-white"
    >Skip to content</a
  >`,
})
export class SkipLinkComponent {}

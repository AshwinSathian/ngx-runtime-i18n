import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Heading } from '../../core/content.types';

@Component({
  selector: 'app-toc',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (headings().length > 0) {
      <nav
        aria-label="On this page"
        class="sticky top-20 hidden text-sm lg:block"
      >
        <p class="mb-2 font-mono text-xs uppercase text-ink/50">On this page</p>
        <ul class="space-y-1">
          @for (h of headings(); track h.id) {
            <li [style.padding-left.px]="(h.depth - 2) * 12">
              <a [href]="'#' + h.id" class="text-ink/70 hover:text-accent-en">{{
                h.text
              }}</a>
            </li>
          }
        </ul>
      </nav>
    }
  `,
})
export class TocComponent {
  readonly headings = input.required<Heading[]>();
}

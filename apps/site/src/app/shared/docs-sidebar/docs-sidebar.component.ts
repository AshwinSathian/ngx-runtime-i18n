import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import type { NavSection } from '../../core/content.types';

@Component({
  selector: 'app-docs-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Documentation" class="text-sm">
      @for (section of tree(); track section.section) {
        <div class="mb-6">
          <p class="mb-2 font-mono text-xs uppercase text-ink/50">
            {{ section.section }}
          </p>
          <ul class="space-y-1">
            @for (item of section.items; track item.href) {
              <li>
                <a
                  [routerLink]="item.href"
                  routerLinkActive="bg-accent-en/10 text-accent-en"
                  [routerLinkActiveOptions]="{ exact: true }"
                  [ariaCurrentWhenActive]="'page'"
                  class="block rounded-md px-2 py-1 text-ink/80 hover:text-accent-en"
                >
                  {{ item.title }}
                </a>
              </li>
            }
          </ul>
        </div>
      }
    </nav>
  `,
})
export class DocsSidebarComponent {
  readonly tree = input.required<NavSection[]>();
}

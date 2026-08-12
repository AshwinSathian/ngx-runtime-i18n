import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ContentService } from '../../core/content.service';
import { DocsSidebarComponent } from '../../shared/docs-sidebar/docs-sidebar.component';
import type { NavSection } from '../../core/content.types';

@Component({
  selector: 'app-docs-layout',
  standalone: true,
  imports: [RouterOutlet, DocsSidebarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto flex max-w-6xl gap-8 px-4 py-12 sm:py-16">
      <aside class="hidden w-56 shrink-0 md:block">
        <app-docs-sidebar [tree]="tree" />
      </aside>
      <div class="min-w-0 flex-1">
        <router-outlet />
      </div>
    </div>
  `,
})
export class DocsLayoutComponent {
  private readonly content = inject(ContentService);
  protected readonly tree: NavSection[] = this.content.getDocsNavTree();
}

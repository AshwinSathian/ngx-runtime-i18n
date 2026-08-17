import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/content.service';
import { SeoService } from '../../core/seo.service';
import type { NavSection } from '../../core/content.types';

@Component({
  selector: 'app-docs-index',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <h1 class="font-display text-3xl font-semibold">Documentation</h1>
      <p class="mt-2 max-w-2xl text-ink/70">
        Guides for installing, configuring, and extending ngx-runtime-i18n.
      </p>
      @for (section of tree; track section.section) {
        <section class="mt-10">
          <h2 class="font-mono text-xs uppercase text-ink/65">
            {{ section.section }}
          </h2>
          <ul class="mt-3 space-y-2">
            @for (item of section.items; track item.href) {
              <li>
                <a
                  [routerLink]="item.href"
                  class="text-accent-en hover:underline"
                  >{{ item.title }}</a
                >
              </li>
            }
          </ul>
        </section>
      }
    </div>
  `,
})
export class DocsIndexComponent implements OnInit {
  private readonly content = inject(ContentService);
  private readonly seo = inject(SeoService);
  protected readonly tree: NavSection[] = this.content.getDocsNavTree();

  ngOnInit(): void {
    this.seo.setPageMeta({
      title: 'Documentation',
      description:
        "Guides for installing and configuring ngx-runtime-i18n's six packages: core, angular, primeng, material, schematics, and cli.",
      path: '/docs',
    });
  }
}

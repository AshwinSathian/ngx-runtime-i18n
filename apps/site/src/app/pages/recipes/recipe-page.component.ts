import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { ContentService } from '../../core/content.service';
import { KeyEyebrowComponent } from '../../shared/key-eyebrow/key-eyebrow.component';
import { TocComponent } from '../../shared/toc/toc.component';
import type { RecipeEntry } from '../../core/content.types';

@Component({
  selector: 'app-recipe-page',
  standalone: true,
  imports: [KeyEyebrowComponent, TocComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (recipe(); as r) {
      <div class="flex gap-8">
        <article class="min-w-0 flex-1">
          <app-key-eyebrow [text]="r.frontmatter.eyebrow" />
          <h1 class="font-display text-3xl font-semibold">
            {{ r.frontmatter.title }}
          </h1>
          <p class="mt-2 text-ink/70">{{ r.frontmatter.description }}</p>
          <ul class="mt-4 flex flex-wrap gap-2">
            @for (pkg of r.frontmatter.packages; track pkg) {
              <li
                class="rounded-full border border-rule px-2 py-0.5 font-mono text-xs text-ink/70"
              >
                {{ pkg }}
              </li>
            }
          </ul>
          <div
            class="prose prose-neutral mt-8 max-w-none dark:prose-invert"
            [innerHTML]="html()"
          ></div>
        </article>
        <aside class="hidden w-48 shrink-0 lg:block">
          <app-toc [headings]="r.headings" />
        </aside>
      </div>
    }
  `,
})
export class RecipePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly content = inject(ContentService);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly recipe = signal<RecipeEntry | null>(null);
  // See DocPageComponent for the empirically-verified reason this bypasses Angular's
  // default `[innerHTML]` sanitizer: it strips `<content-callout>`/`<content-tabs>`/
  // `<content-code-block>` tags down to their children, and strips the `style`
  // attributes Shiki uses for per-token dual-theme syntax-highlighting colors. This
  // content is compiled at build time from our own trusted Markdown, never user
  // input, so bypassing sanitization is safe here.
  protected readonly html = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.recipe()?.html ?? ''),
  );

  ngOnInit(): void {
    // Unlike DocPageComponent, which is matched via a `**` wildcard under `/docs`,
    // recipes use a real named `:slug` route param (single-segment slugs only), so
    // it's read from `paramMap` rather than reconstructed from URL segments.
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.recipe.set(this.content.getRecipeBySlug(slug));
  }
}

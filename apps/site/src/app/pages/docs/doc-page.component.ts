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
import type { DocEntry } from '../../core/content.types';

@Component({
  selector: 'app-doc-page',
  standalone: true,
  imports: [KeyEyebrowComponent, TocComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (doc(); as d) {
      <div class="flex gap-8">
        <article class="min-w-0 flex-1">
          <app-key-eyebrow [text]="d.frontmatter.eyebrow" />
          <h1 class="font-display text-3xl font-semibold">
            {{ d.frontmatter.title }}
          </h1>
          <p class="mt-2 text-ink/70">{{ d.frontmatter.description }}</p>
          <div
            class="prose prose-neutral mt-8 max-w-none dark:prose-invert"
            [innerHTML]="html()"
          ></div>
        </article>
        <aside class="hidden w-48 shrink-0 lg:block">
          <app-toc [headings]="d.headings" />
        </aside>
      </div>
    }
  `,
})
export class DocPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly content = inject(ContentService);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly doc = signal<DocEntry | null>(null);
  // Angular's default `[innerHTML]` sanitizer strips unknown custom-element tags
  // (`<content-callout>`, `<content-code-block>`, `<content-tabs>`) down to their
  // children, and strips the `style` attributes rehype-pretty-code/Shiki use for
  // per-token dual-theme syntax-highlighting colors — verified empirically via a
  // failing test before this fix (both the wrapper tags and all `style` attributes
  // were gone from the rendered DOM). This content is compiled at build time from our
  // own trusted Markdown, never user input, so bypassing sanitization is safe here.
  protected readonly html = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.doc()?.html ?? ''),
  );

  ngOnInit(): void {
    // This component is matched via a `**` wildcard route under `/docs`, so there is
    // no named `:slug` route param to read from `paramMap` — the router doesn't parse
    // params out of a wildcard segment. The matched URL segments (one for
    // `getting-started`, two once `core-concepts/*`/`packages/*` docs exist) are
    // available on the route snapshot's `url` (a `UrlSegment[]`) instead.
    const slug = this.route.snapshot.url.map((segment) => segment.path);
    this.doc.set(this.content.getDocBySlug(slug));
  }
}

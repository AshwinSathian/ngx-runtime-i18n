import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import changelog from '../../../../generated/changelog.json';
import { KeyEyebrowComponent } from '../../shared/key-eyebrow/key-eyebrow.component';
import { SeoService } from '../../core/seo.service';

@Component({
  selector: 'app-changelog',
  standalone: true,
  imports: [KeyEyebrowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-3xl px-4 py-10">
      <app-key-eyebrow text="changelog.history" />
      <h1 class="font-display text-3xl font-semibold">Changelog</h1>
      <div class="prose prose-neutral mt-8 max-w-none dark:prose-invert" [innerHTML]="html"></div>
    </div>
  `,
})
export class ChangelogComponent implements OnInit {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly seo = inject(SeoService);
  // Compiled at build time from our own trusted root CHANGELOG.md, never user
  // input, so bypassing sanitization is safe here — see DocPageComponent for
  // the same pattern and full rationale (Angular's default innerHTML sanitizer
  // strips custom-element wrapper tags and syntax-highlighting `style` attrs).
  protected readonly html: SafeHtml = this.sanitizer.bypassSecurityTrustHtml(changelog.html);

  ngOnInit(): void {
    this.seo.setPageMeta({
      title: 'Changelog',
      description:
        "Release history for ngx-runtime-i18n's six packages, generated from the repository's own CHANGELOG.md.",
    });
  }
}

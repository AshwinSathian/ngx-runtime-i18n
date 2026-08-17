import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo.service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto flex max-w-2xl flex-col items-start px-4 py-24">
      <p class="font-mono text-sm text-accent-en">error.not-found</p>
      <h1 class="mt-2 font-display text-3xl font-semibold">This page doesn't exist.</h1>
      <p class="mt-3 text-ink/70">Try the docs, or search with Cmd+K.</p>
      <a
        routerLink="/docs"
        class="mt-6 rounded-md bg-cta-en px-5 py-2.5 text-sm font-medium text-white"
        >Go to docs</a
      >
    </div>
  `,
})
export class NotFoundComponent implements OnInit {
  private readonly seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.setPageMeta({
      title: 'Page not found',
      description: "The page you're looking for doesn't exist. Try the docs, or search with Cmd+K.",
    });
    // Standard practice for a 404 page: it should never show up in search results, so it
    // gets a `robots: noindex` tag in addition to (not instead of) a real title and
    // description — some crawlers and share-preview bots still read those even when they
    // won't index the page.
    this.seo.setNoIndex();
  }
}

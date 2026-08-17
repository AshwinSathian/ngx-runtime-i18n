import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SkipLinkComponent } from './shared/skip-link/skip-link.component';
import { SiteHeaderComponent } from './shared/site-header/site-header.component';
import { SiteFooterComponent } from './shared/site-footer/site-footer.component';
import { SearchPaletteComponent } from './shared/search-palette/search-palette.component';
import { StructuredDataService } from './core/structured-data.service';
import { personJsonLd, websiteJsonLd } from './core/json-ld';

@Component({
  imports: [
    RouterModule,
    SkipLinkComponent,
    SiteHeaderComponent,
    SiteFooterComponent,
    SearchPaletteComponent,
  ],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly structuredData = inject(StructuredDataService);

  ngOnInit(): void {
    // Each prerendered route bootstraps this root component fresh (static
    // prerendering renders every route as its own document), so this runs once per
    // page load, not once per client-side navigation — unlike the routed page
    // components, `App` is never destroyed/recreated by the router, so this must not
    // set anything that needs to change per-route (og:image included — every routed
    // page component now sets that itself via `SeoService.setPageMeta()`, which
    // defaults to `og/home.png` when a page has no dedicated image, so it can never go
    // stale across a client-side navigation the way a one-time root-level default
    // would).
    this.structuredData.set('ld-website', websiteJsonLd());
    this.structuredData.set('ld-person', personJsonLd());
  }
}

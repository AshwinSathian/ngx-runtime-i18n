import { Component, OnInit, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { SkipLinkComponent } from './shared/skip-link/skip-link.component';
import { SiteHeaderComponent } from './shared/site-header/site-header.component';
import { SiteFooterComponent } from './shared/site-footer/site-footer.component';
import { SearchPaletteComponent } from './shared/search-palette/search-palette.component';
import { StructuredDataService } from './core/structured-data.service';
import { SITE_URL, personJsonLd, websiteJsonLd } from './core/json-ld';

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
  private readonly meta = inject(Meta);
  protected title = 'site';

  ngOnInit(): void {
    // Each prerendered route bootstraps this root component fresh (static
    // prerendering renders every route as its own document), so this runs once per
    // page, not once for the whole app — same as any other component's ngOnInit.
    this.structuredData.set('ld-website', websiteJsonLd());
    this.structuredData.set('ld-person', personJsonLd());
    // Site-wide default; page-level components (doc/faq) that have a dedicated OG
    // image override this with `Meta.updateTag()` in their own `ngOnInit`, which runs
    // after this one since Angular initializes a parent before its child routes.
    this.meta.updateTag({
      property: 'og:image',
      content: `${SITE_URL}/og/home.png`,
    });
  }
}

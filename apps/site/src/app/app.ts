import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SkipLinkComponent } from './shared/skip-link/skip-link.component';
import { SiteHeaderComponent } from './shared/site-header/site-header.component';
import { SiteFooterComponent } from './shared/site-footer/site-footer.component';
import { SearchPaletteComponent } from './shared/search-palette/search-palette.component';
import { HeroLangCycleComponent } from './features/hero-lang-cycle/hero-lang-cycle.component';

@Component({
  imports: [
    RouterModule,
    SkipLinkComponent,
    SiteHeaderComponent,
    SiteFooterComponent,
    SearchPaletteComponent,
    HeroLangCycleComponent,
  ],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'site';
}

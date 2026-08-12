import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SkipLinkComponent } from './shared/skip-link/skip-link.component';
import { SiteHeaderComponent } from './shared/site-header/site-header.component';
import { SiteFooterComponent } from './shared/site-footer/site-footer.component';

@Component({
  imports: [RouterModule, SkipLinkComponent, SiteHeaderComponent, SiteFooterComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'site';
}

import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { KeyEyebrowComponent } from '../../shared/key-eyebrow/key-eyebrow.component';
import { HeroLangCycleComponent } from '../../features/hero-lang-cycle/hero-lang-cycle.component';
import { FeatureGridComponent } from '../../features/feature-grid/feature-grid.component';
import { PackageMatrixComponent } from '../../features/package-matrix/package-matrix.component';
import { SeoService } from '../../core/seo.service';

// Snippets sourced verbatim from root README.md's "Usage" section.
const APP_CONFIG_SNIPPET = `// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRuntimeI18n } from '@ngx-runtime-i18n/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRuntimeI18n(
      {
        defaultLang: 'en',
        supported: ['en', 'hi', 'de'],
        fallbacks: ['de'],
        fetchCatalog: (lang, signal) =>
          fetch(\`/i18n/\${lang}.json\`, { signal }).then((r) => {
            if (!r.ok) throw new Error(\`Failed to load catalog: \${lang}\`);
            return r.json();
          }),
        onMissingKey: (key) => key,
      },
      {
        localeLoaders: {
          en: () => import('@angular/common/locales/global/en'),
          hi: () => import('@angular/common/locales/global/hi'),
          de: () => import('@angular/common/locales/global/de'),
        },
        options: {
          autoDetect: true,
          storageKey: '@ngx-runtime-i18n:lang',
          cacheMode: 'storage',
          cacheKeyPrefix: '@ngx-runtime-i18n:catalog:',
          preferNavigatorBase: true,
        },
      }
    ),
  ],
};`;

const TEMPLATE_SNIPPET = `<!-- Template -->
<h1>{{ 'hello.user' | i18n:{ name: username } }}</h1>
<p>{{ 'cart.items' | i18n:{ count: items().length } }}</p>
<small>Fallback → {{ 'legacy.title' | i18n }}</small>`;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink,
    KeyEyebrowComponent,
    HeroLangCycleComponent,
    FeatureGridComponent,
    PackageMatrixComponent,
  ],
  // Required so Angular tolerates the unknown <content-tabs>/<content-code-block>
  // elements below — they're plain custom elements (Task 5), registered client-side
  // via registerContentElements() in main.ts, not Angular components.
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  private readonly seo = inject(SeoService);
  protected readonly appConfigSnippet = APP_CONFIG_SNIPPET;
  protected readonly templateSnippet = TEMPLATE_SNIPPET;

  ngOnInit(): void {
    // Home is the root brand page, so its title skips the "— ngx-runtime-i18n" suffix
    // every other page gets (see `SeoService`) — appending it here would repeat the name
    // twice in one string.
    this.seo.setPageMeta({
      title: 'ngx-runtime-i18n — Signals-first runtime i18n for Angular',
      description:
        'Signals-first runtime i18n for Angular 16 through 22, with SSR-safe catalog loading, ICU-lite plural formatting, and ordered fallback chains.',
      path: '/',
      suffix: false,
    });
  }
}

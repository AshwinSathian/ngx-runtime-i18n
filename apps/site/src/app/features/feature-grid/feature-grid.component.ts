import { ChangeDetectionStrategy, Component } from '@angular/core';

// Content sourced from root README.md's "Features" section and, for the
// type-safe keys and DevTools items, `libs/runtime-i18n-angular/README.md`
// ("Type Safety" section) and `libs/runtime-i18n-angular/src/lib/devtools/i18n-devtools.ts`.
interface Feature {
  readonly title: string;
  readonly body: string;
}

const FEATURES: readonly Feature[] = [
  {
    title: 'Fallback chains',
    body: 'Configure fallbacks as an ordered list and lookups run active language, then each fallback in turn, then the default language. Missing keys reach onMissingKey after a single dev-mode warning.',
  },
  {
    title: 'ICU-lite formatting',
    body: 'A small, dependency-free formatter handles interpolation and plural blocks (one, other, and exact matches like =0). It covers common cases without a full ICU MessageFormat implementation.',
  },
  {
    title: 'Type-safe keys',
    body: 'Declare a catalog schema once via module augmentation and t(), the pipe, and the RxJS compat service all narrow to valid keys and required params. Without a declaration, t() still accepts a plain string.',
  },
  {
    title: 'TransferState SSR',
    body: 'provideRuntimeI18nSsr() seeds the same TransferState keys the client reads on boot, so the browser reuses the server-rendered catalog instead of fetching it again. No catalog fetch runs before Angular is stable.',
  },
  {
    title: 'Catalog caching modes',
    body: 'Choose none to keep only the active fallback chain in memory, memory to cache every catalog for the session, or storage to hydrate from localStorage and revalidate in the background. Storage access never runs on the server.',
  },
  {
    title: 'DevTools bridge',
    body: 'In dev mode, the service posts structured window.postMessage events for state, translations, and missing keys, so extensions and custom panels can observe language changes as they happen. Stripped out of production builds.',
  },
];

@Component({
  selector: 'app-feature-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      @for (feature of features; track feature.title) {
        <div class="rounded-lg border border-rule p-5">
          <h3 class="font-display text-base font-semibold">
            {{ feature.title }}
          </h3>
          <p class="mt-2 text-sm text-ink/80">{{ feature.body }}</p>
        </div>
      }
    </div>
  `,
})
export class FeatureGridComponent {
  protected readonly features = FEATURES;
}

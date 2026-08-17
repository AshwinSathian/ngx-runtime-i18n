import {
  EnvironmentProviders,
  inject,
  provideAppInitializer,
  effect,
  ProviderToken,
} from '@angular/core';
import { I18nService } from '@ngx-runtime-i18n/angular';

/**
 * Structural shape of PrimeNG's config service. PrimeNG has shipped this
 * under two different names/import paths depending on version:
 * `PrimeNGConfig` from `primeng/api` (v17), and `PrimeNG` from
 * `primeng/config` (v18+). Depending on the shape rather than a concrete
 * class means this package never has to chase PrimeNG's next rename - the
 * caller imports whichever class matches their installed version and hands
 * it to `configToken`.
 */
export interface RuntimeI18nPrimeNgConfig {
  setTranslation(translation: Record<string, unknown>): void;
}

export interface ProvidePrimeNgRuntimeI18nOptions {
  /**
   * The injectable PrimeNG config class installed in your app - import
   * `PrimeNGConfig` from `primeng/api` on PrimeNG 17, or `PrimeNG` from
   * `primeng/config` on PrimeNG 18 and later.
   */
  configToken: ProviderToken<RuntimeI18nPrimeNgConfig>;

  /**
   * Return a PrimeNG translation object for a given language code.
   * Can be sync or async (e.g., dynamic import).
   */
  resolveTranslation: (
    lang: string
  ) => Record<string, unknown> | Promise<Record<string, unknown>>;

  /**
   * Optional: called when translation is applied (for debugging).
   */
  onApplied?: (lang: string) => void;
}

const LOG_TOPIC = '[ngx-runtime-i18n/primeng]';

/** @internal */
export function createPrimeNgRuntimeI18nEffect(
  i18n: I18nService,
  primeng: RuntimeI18nPrimeNgConfig,
  options: ProvidePrimeNgRuntimeI18nOptions
): void {
  const cache = new Map<string, Record<string, unknown>>();

  effect(() => {
    const lang = i18n.lang();
    const cached = cache.get(lang);

    if (cached) {
      primeng.setTranslation(cached);
      options.onApplied?.(lang);
      return;
    }

    let translationPromise: Promise<Record<string, unknown>>;
    try {
      translationPromise = Promise.resolve(options.resolveTranslation(lang));
    } catch (error) {
      console.error(
        `${LOG_TOPIC} unable to resolve translation for "${lang}"`,
        error
      );
      return;
    }

    translationPromise
      .then((translation) => {
        if (!translation) return;
        cache.set(lang, translation);
        if (i18n.lang() !== lang) return;
        primeng.setTranslation(translation);
        options.onApplied?.(lang);
      })
      .catch((translationError) => {
        console.error(
          `${LOG_TOPIC} failed to apply translation for "${lang}"`,
          translationError
        );
      });
  });
}

/**
 * Registers the PrimeNG adapter so it reacts to runtime language changes.
 */
export function providePrimeNgRuntimeI18n(
  options: ProvidePrimeNgRuntimeI18nOptions
): EnvironmentProviders {
  return provideAppInitializer(() => {
    const i18n = inject(I18nService);
    const primeng = inject(options.configToken);
    createPrimeNgRuntimeI18nEffect(i18n, primeng, options);
  });
}

import { APP_INITIALIZER, Provider, effect } from '@angular/core';
import { I18nService } from '@ngx-runtime-i18n/angular';
import { PrimeNGConfig } from 'primeng/api';

export interface ProvidePrimeNgRuntimeI18nOptions {
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
  primeng: PrimeNGConfig,
  options: ProvidePrimeNgRuntimeI18nOptions
): () => void {
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

  return () => undefined;
}

/**
 * Registers the PrimeNG adapter so it reacts to runtime language changes.
 */
export function providePrimeNgRuntimeI18n(
  options: ProvidePrimeNgRuntimeI18nOptions
): Provider[] {
  return [
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: (i18n: I18nService, primeng: PrimeNGConfig) =>
        createPrimeNgRuntimeI18nEffect(i18n, primeng, options),
      deps: [I18nService, PrimeNGConfig],
    },
  ];
}

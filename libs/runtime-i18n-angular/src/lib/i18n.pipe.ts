import { Pipe, PipeTransform, inject } from '@angular/core';
import type { TranslationKey, TranslationParams } from '@ngx-runtime-i18n/core';
import { I18nService } from './i18n.service';

/**
 * Translate a key within templates.
 *
 * @example
 * {{ 'hello.user' | i18n:{ name: 'Ashwin' } }}
 *
 * Impure by design: re-runs when {@link I18nService.lang} changes.
 * Does not write to signals during render (avoids NG0600).
 * @publicApi
 */
@Pipe({
  name: 'i18n',
  standalone: true,
  pure: false,
})
export class I18nPipe implements PipeTransform {
  private i18n = inject(I18nService);

  transform<K extends TranslationKey>(key: K, params?: TranslationParams<K>): string {
    // establish dependency on the lang signal (read-only)
    this.i18n.lang();
    return this.i18n.t(key, params);
  }
}

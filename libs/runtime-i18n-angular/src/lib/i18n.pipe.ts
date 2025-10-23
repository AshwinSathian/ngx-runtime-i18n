import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';

@Pipe({
  name: 'i18n',
  standalone: true,
  // Keep impure so it can re-evaluate when lang changes or params change.
  // (We also read `lang()` below to create a dependency on the signal.)
  pure: false,
})
export class I18nPipe implements PipeTransform {
  private i18n = inject(I18nService);

  transform(key: string, params?: Record<string, unknown>): string {
    // Read the signal to establish a dependency (no writes!)
    // This makes Angular call transform again when lang changes.
    this.i18n.lang();
    return this.i18n.t(key, params);
  }
}

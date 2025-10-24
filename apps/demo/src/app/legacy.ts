// component.ts
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { I18nCompatService } from '@ngx-runtime-i18n/angular';

@Component({
  standalone: true,
  template: `
    <h1>{{ t('hello.user', { name: 'Ashwin' }) }}</h1>
    <small>lang={{ lang() }} | ready={{ ready() }}</small>
  `,
})
export class LegacyCmp {
  private i18n = inject(I18nCompatService);

  // If you want signals in a legacy app:
  lang = toSignal(this.i18n.lang$, { initialValue: 'en' });
  ready = toSignal(this.i18n.ready$, { initialValue: false });

  t = this.i18n.t.bind(this.i18n);
}

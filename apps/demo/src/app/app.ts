import { Component, effect, inject, signal } from '@angular/core';
import { I18nPipe, I18nService } from '@ngx-runtime-i18n/angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './app.html',
})
export class App {
  i18n = inject(I18nService);
  username = 'Ashwin';
  items = signal([{}, {}, {}]);
  loaded = signal<string[]>([]);
  missingLegacy = signal<boolean>(false);

  constructor() {
    effect(() => {
      this.i18n.lang(); // depend on signal for re-run
      this.loaded.set(this.i18n.getLoadedLangs());
      this.missingLegacy.set(!this.i18n.hasKey('legacy.title'));
    });
  }

  switch(lang: string) {
    if (!this.i18n.ready()) return;
    this.i18n.setLang(lang);
  }
}

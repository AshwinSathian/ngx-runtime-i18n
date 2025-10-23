import { Component, inject, signal } from '@angular/core';
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

  switch(lang: string) {
    if (!this.i18n.ready()) return;
    this.i18n.setLang(lang);
  }
}

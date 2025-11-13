import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { I18nPipe, I18nService } from '@ngx-runtime-i18n/angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, I18nPipe],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App {
  private i18n = inject(I18nService);

  // Expose signals for template
  lang = this.i18n.lang;
  ready = this.i18n.ready;

  // Demo data to exercise ICU plural
  items = signal<number>(0);
  inc = () => this.items.update((n) => n + 1);
  dec = () => this.items.update((n) => Math.max(0, n - 1));
  reset = () => this.items.set(0);

  // Language list
  langs = ['en', 'hi', 'de'] as const;

  // For button state
  isActive = (l: string) => computed(() => this.lang() === l);

  loaded = signal<string[]>([]);
  missingLegacy = signal<boolean>(false);

  constructor() {
    effect(() => {
      this.lang();
      this.loaded.set(this.i18n.getLoadedLangs());
      this.missingLegacy.set(!this.i18n.hasKey('legacy.title'));
    });
  }

  async switchLang(l: string) {
    await this.i18n.setLang(l);
  }
}

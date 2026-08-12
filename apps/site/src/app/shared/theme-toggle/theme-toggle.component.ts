import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ThemeService } from '../../core/theme.service';
import { SunIconComponent } from '../icons/sun-icon.component';
import { MoonIconComponent } from '../icons/moon-icon.component';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [SunIconComponent, MoonIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      (click)="theme.toggle()"
      [attr.aria-label]="label()"
      class="flex h-9 w-9 items-center justify-center rounded-md border border-rule text-ink hover:border-accent-en"
    >
      @if (theme.theme() === 'dark') {
        <app-sun-icon />
      } @else {
        <app-moon-icon />
      }
    </button>
  `,
})
export class ThemeToggleComponent {
  protected readonly theme = inject(ThemeService);
  protected readonly label = computed(() => (this.theme.theme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'));
}

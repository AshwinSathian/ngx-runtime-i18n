import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-eyebrow',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p class="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-accent-en">{{ text() }}</p>`,
})
export class EyebrowComponent {
  readonly text = input.required<string>();
}

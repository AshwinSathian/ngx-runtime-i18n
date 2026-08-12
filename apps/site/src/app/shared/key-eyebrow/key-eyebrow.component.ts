import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-key-eyebrow',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p class="mb-3 font-mono text-xs uppercase tracking-wide text-accent-en">{{ text() }}</p>`,
})
export class KeyEyebrowComponent {
  readonly text = input.required<string>();
}

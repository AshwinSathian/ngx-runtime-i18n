import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const LABELS = { en: 'English', hi: 'Hindi', de: 'German' } as const;
const CLASSES = {
  en: 'bg-accent-en/10 text-accent-en border-accent-en/30',
  hi: 'bg-accent-hi/10 text-accent-hi border-accent-hi/30',
  de: 'bg-accent-de/10 text-accent-de border-accent-de/30',
} as const;

@Component({
  selector: 'app-lang-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-xs" [class]="classes()">{{ lang() }} · {{ label() }}</span>`,
})
export class LangBadgeComponent {
  readonly lang = input.required<keyof typeof LABELS>();
  protected readonly label = computed(() => LABELS[this.lang()]);
  protected readonly classes = computed(() => CLASSES[this.lang()]);
}

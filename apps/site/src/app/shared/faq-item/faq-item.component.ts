import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-faq-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <details class="border-b border-rule py-4">
      <summary class="cursor-pointer list-none font-medium marker:content-none">{{ question() }}</summary>
      <div class="mt-2 text-sm text-ink/75"><ng-content /></div>
    </details>
  `,
})
export class FaqItemComponent {
  readonly question = input.required<string>();
}

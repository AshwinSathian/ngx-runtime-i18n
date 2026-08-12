import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-package-card',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-lg border border-rule p-5">
      <p class="font-mono text-sm text-accent-en">{{ name() }}</p>
      <p class="mt-2 text-sm text-ink/80">{{ description() }}</p>
      <div class="mt-4 flex items-center justify-between text-xs">
        <span [class]="status() === 'published' ? 'text-accent-de' : 'text-ink/60'">
          {{ status() === 'published' ? 'Published on npm' : 'Not yet published — build from source' }}
        </span>
        <div class="flex gap-3">
          <a [routerLink]="docsHref()" class="underline">Docs</a>
          @if (npmUrl()) { <a [href]="npmUrl()" class="underline">npm</a> }
        </div>
      </div>
    </div>
  `,
})
export class PackageCardComponent {
  readonly name = input.required<string>();
  readonly description = input.required<string>();
  readonly status = input.required<'published' | 'source-only'>();
  readonly npmUrl = input<string>();
  readonly docsHref = input.required<string>();
}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto flex max-w-2xl flex-col items-start px-4 py-24">
      <p class="font-mono text-sm text-accent-en">error.not-found</p>
      <h1 class="mt-2 font-display text-3xl font-semibold">This page doesn't exist.</h1>
      <p class="mt-3 text-ink/70">Try the docs, or search with Cmd+K.</p>
      <a
        routerLink="/docs"
        class="mt-6 rounded-md bg-accent-en px-5 py-2.5 text-sm font-medium text-white"
        >Go to docs</a
      >
    </div>
  `,
})
export class NotFoundComponent {}

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-lightbulb-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path
        d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.75.75 1.23 1.5 1.41 2.5"
      />
    </svg>
  `,
})
export class LightbulbIconComponent {}

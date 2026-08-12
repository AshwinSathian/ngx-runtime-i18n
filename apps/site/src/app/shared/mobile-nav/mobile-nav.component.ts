import { ChangeDetectionStrategy, Component, ElementRef, HostListener, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MenuIconComponent } from '../icons/menu-icon.component';
import { XIconComponent } from '../icons/x-icon.component';

@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  imports: [RouterLink, MenuIconComponent, XIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="md:hidden">
      <button
        #trigger
        type="button"
        [attr.aria-expanded]="open()"
        aria-controls="mobile-nav-panel"
        [attr.aria-label]="open() ? 'Close menu' : 'Open menu'"
        (click)="toggle()"
        class="flex h-9 w-9 items-center justify-center rounded-md border border-rule"
      >
        @if (open()) {
          <app-x-icon />
        } @else {
          <app-menu-icon />
        }
      </button>
      @if (open()) {
        <div id="mobile-nav-panel" class="absolute inset-x-0 top-16 z-40 border-b border-rule bg-paper p-4">
          <nav aria-label="Mobile">
            <ul class="flex flex-col gap-3">
              @for (link of links(); track link.href) {
                <li><a [routerLink]="link.href" class="block py-1 text-lg" (click)="close()">{{ link.label }}</a></li>
              }
            </ul>
          </nav>
        </div>
      }
    </div>
  `,
})
export class MobileNavComponent {
  readonly links = input.required<{ href: string; label: string }[]>();
  protected readonly open = signal(false);
  private readonly triggerRef = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  toggle(): void {
    this.open.update((v) => !v);
  }

  close(): void {
    this.open.set(false);
    this.triggerRef()?.nativeElement.focus();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.close();
  }
}

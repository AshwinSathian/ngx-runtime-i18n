import { registerContentElements } from './register-content-elements';

describe('content-tabs', () => {
  beforeAll(() => registerContentElements());

  it('switches panels and flips aria-selected when a tab button is clicked', () => {
    document.body.innerHTML = `
      <content-tabs>
        <div data-tab-label="npm">npm i @ngx-runtime-i18n/angular</div>
        <div data-tab-label="pnpm">pnpm add @ngx-runtime-i18n/angular</div>
      </content-tabs>
    `;
    const el = document.querySelector('content-tabs') as HTMLElement;
    // Force upgrade synchronously in the test environment if not already upgraded via innerHTML parsing.
    customElements.upgrade(el);

    const buttons = Array.from(
      el.querySelectorAll('[role="tab"]'),
    ) as HTMLButtonElement[];
    const panels = Array.from(
      el.querySelectorAll('[role="tabpanel"]'),
    ) as HTMLElement[];

    expect(buttons.length).toBe(2);
    expect(panels[0].hidden).toBe(false);
    expect(panels[1].hidden).toBe(true);
    expect(buttons[0].getAttribute('aria-selected')).toBe('true');
    expect(buttons[1].getAttribute('aria-selected')).toBe('false');

    buttons[1].click();

    expect(panels[0].hidden).toBe(true);
    expect(panels[1].hidden).toBe(false);
    expect(buttons[0].getAttribute('aria-selected')).toBe('false');
    expect(buttons[1].getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(buttons[1]);
  });
});

import { registerContentElements } from './register-content-elements';

describe('content-tabs progressive enhancement (pre-registration)', () => {
  // This describe block intentionally runs before `registerContentElements()`
  // is ever called anywhere in this spec file, so `content-tabs` is still an
  // undefined custom element when the markup below is parsed. That means the
  // browser/jsdom treats it as a plain unknown element — no upgrade, no
  // `connectedCallback`, and therefore no `hidden` attribute applied to any
  // panel. This is the real no-JS / pre-hydration fallback state.
  it('renders every child panel visible (no hidden attribute) before the element is defined', () => {
    document.body.innerHTML = `
      <content-tabs>
        <div data-tab-label="npm">npm i @ngx-runtime-i18n/angular</div>
        <div data-tab-label="pnpm">pnpm add @ngx-runtime-i18n/angular</div>
      </content-tabs>
    `;

    expect(customElements.get('content-tabs')).toBeUndefined();

    const panels = Array.from(
      document.querySelectorAll('[data-tab-label]'),
    ) as HTMLElement[];
    expect(panels).toHaveLength(2);
    expect(panels.every((panel) => !panel.hidden)).toBe(true);
    expect(panels.every((panel) => panel.hasAttribute('hidden'))).toBe(false);
    // No tablist has been synthesized yet either, since connectedCallback never ran.
    expect(document.querySelector('[role="tablist"]')).toBeNull();
  });
});

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
    // Each panel is independently focusable per the WAI-ARIA Tabs pattern.
    expect(panels[0].tabIndex).toBe(0);
    expect(panels[1].tabIndex).toBe(0);

    buttons[1].click();

    expect(panels[0].hidden).toBe(true);
    expect(panels[1].hidden).toBe(false);
    expect(buttons[0].getAttribute('aria-selected')).toBe('false');
    expect(buttons[1].getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(buttons[1]);
  });

  it('defaults the tablist aria-label to "Code example" but honors data-tablist-label when present', () => {
    document.body.innerHTML = `
      <content-tabs data-tablist-label="Install command">
        <div data-tab-label="npm">npm i thing</div>
        <div data-tab-label="pnpm">pnpm add thing</div>
      </content-tabs>
      <content-tabs>
        <div data-tab-label="npm">npm i thing</div>
        <div data-tab-label="pnpm">pnpm add thing</div>
      </content-tabs>
    `;
    const [labelled, unlabelled] = Array.from(
      document.querySelectorAll('content-tabs'),
    ) as HTMLElement[];
    customElements.upgrade(labelled);
    customElements.upgrade(unlabelled);

    expect(
      labelled.querySelector('[role="tablist"]')?.getAttribute('aria-label'),
    ).toBe('Install command');
    expect(
      unlabelled.querySelector('[role="tablist"]')?.getAttribute('aria-label'),
    ).toBe('Code example');
  });
});

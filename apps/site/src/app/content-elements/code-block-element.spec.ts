import { registerContentElements } from './register-content-elements';

describe('content-code-block', () => {
  beforeAll(() => registerContentElements());

  it('copies its text content to the clipboard when the copy button is clicked and announces it', async () => {
    document.body.innerHTML = `<content-code-block><pre><code>npm i @ngx-runtime-i18n/angular</code></pre></content-code-block>`;
    const el = document.querySelector('content-code-block') as HTMLElement;
    // Force upgrade synchronously in the test environment if not already upgraded via innerHTML parsing.
    customElements.upgrade(el);

    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const button = el.querySelector('button') as HTMLButtonElement;
    button.click();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith('npm i @ngx-runtime-i18n/angular');
    const liveRegion = el.querySelector('[aria-live]') as HTMLElement;
    expect(liveRegion.textContent).toContain('Copied');
  });
});

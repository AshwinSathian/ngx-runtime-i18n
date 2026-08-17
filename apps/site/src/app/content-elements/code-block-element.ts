export class ContentCodeBlockElement extends HTMLElement {
  private button?: HTMLButtonElement;
  private liveRegion?: HTMLElement;

  connectedCallback(): void {
    this.style.position = 'relative';
    this.style.display = 'block';

    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.textContent = 'Copy';
    this.button.setAttribute('aria-label', 'Copy code');
    this.button.className =
      'absolute right-2 top-2 rounded-md border border-rule bg-paper px-2 py-1 text-xs';
    this.button.addEventListener('click', () => this.copy());

    this.liveRegion = document.createElement('span');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.className = 'sr-only';

    this.appendChild(this.button);
    this.appendChild(this.liveRegion);
  }

  private async copy(): Promise<void> {
    const codeEl = this.querySelector('code');
    const text = codeEl?.textContent ?? '';
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // Insecure context (non-HTTPS/localhost) or a denied clipboard permission both
      // reject this promise — fail gracefully by leaving the button reading "Copy"
      // rather than crashing, and surface it in the live region for a11y users too.
      console.warn('Failed to copy code to clipboard:', err);
      if (this.liveRegion) this.liveRegion.textContent = 'Copy failed';
      return;
    }
    if (this.button) this.button.textContent = 'Copied';
    if (this.liveRegion) this.liveRegion.textContent = 'Copied';
    setTimeout(() => {
      if (this.button) this.button.textContent = 'Copy';
    }, 2000);
  }
}

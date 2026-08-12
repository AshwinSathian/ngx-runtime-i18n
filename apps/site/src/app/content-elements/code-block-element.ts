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
    await navigator.clipboard.writeText(text);
    if (this.button) this.button.textContent = 'Copied';
    if (this.liveRegion) this.liveRegion.textContent = 'Copied';
    setTimeout(() => {
      if (this.button) this.button.textContent = 'Copy';
    }, 2000);
  }
}

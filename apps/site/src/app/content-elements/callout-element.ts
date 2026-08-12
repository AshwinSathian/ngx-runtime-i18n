const LABELS: Record<string, string> = {
  note: 'Note',
  warning: 'Warning',
  tip: 'Tip',
};

export class ContentCalloutElement extends HTMLElement {
  connectedCallback(): void {
    const type = this.getAttribute('data-type') ?? 'note';
    this.setAttribute('role', 'note');
    this.setAttribute('aria-label', LABELS[type] ?? 'Note');
    this.classList.add('block', 'my-4', 'rounded-lg', 'border', 'p-4');
  }
}

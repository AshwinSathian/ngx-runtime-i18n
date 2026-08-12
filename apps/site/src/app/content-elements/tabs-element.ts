export class ContentTabsElement extends HTMLElement {
  connectedCallback(): void {
    const panels = Array.from(this.children) as HTMLElement[];
    if (panels.length === 0) return;

    const tablist = document.createElement('div');
    tablist.setAttribute('role', 'tablist');
    tablist.setAttribute(
      'aria-label',
      this.getAttribute('data-tablist-label') ?? 'Code example',
    );
    tablist.className = 'flex border-b border-rule';

    panels.forEach((panel, i) => {
      const label = panel.getAttribute('data-tab-label') ?? `Tab ${i + 1}`;
      const tabId = `content-tab-${Math.random().toString(36).slice(2)}-${i}`;
      panel.id = `${tabId}-panel`;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tabId);
      panel.tabIndex = 0;
      panel.hidden = i !== 0;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = tabId;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(i === 0));
      btn.setAttribute('aria-controls', panel.id);
      btn.tabIndex = i === 0 ? 0 : -1;
      btn.textContent = label;
      btn.className = 'px-4 py-2 text-sm font-mono';
      btn.addEventListener('click', () => this.activate(i, panels, tablist));
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          this.activate((i + 1) % panels.length, panels, tablist);
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.activate((i - 1 + panels.length) % panels.length, panels, tablist);
        }
        if (e.key === 'Home') {
          e.preventDefault();
          this.activate(0, panels, tablist);
        }
        if (e.key === 'End') {
          e.preventDefault();
          this.activate(panels.length - 1, panels, tablist);
        }
      });

      tablist.appendChild(btn);
    });

    this.insertBefore(tablist, this.firstChild);
  }

  private activate(
    index: number,
    panels: HTMLElement[],
    tablist: HTMLElement,
  ): void {
    const buttons = Array.from(tablist.children) as HTMLButtonElement[];
    panels.forEach((panel, i) => {
      panel.hidden = i !== index;
      buttons[i].setAttribute('aria-selected', String(i === index));
      buttons[i].tabIndex = i === index ? 0 : -1;
      buttons[i].className =
        i === index
          ? 'px-4 py-2 text-sm font-mono border-b-2 border-accent-en'
          : 'px-4 py-2 text-sm font-mono text-ink/60';
    });
    buttons[index].focus();
  }
}

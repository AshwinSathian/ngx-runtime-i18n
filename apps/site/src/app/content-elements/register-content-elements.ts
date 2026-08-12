import { ContentCodeBlockElement } from './code-block-element';
import { ContentTabsElement } from './tabs-element';
import { ContentCalloutElement } from './callout-element';

export function registerContentElements(): void {
  if (typeof customElements === 'undefined') return; // no-op during server-side prerendering
  if (!customElements.get('content-code-block'))
    customElements.define('content-code-block', ContentCodeBlockElement);
  if (!customElements.get('content-tabs'))
    customElements.define('content-tabs', ContentTabsElement);
  if (!customElements.get('content-callout'))
    customElements.define('content-callout', ContentCalloutElement);
}

import { DOCUMENT, Injectable, inject } from '@angular/core';

// `DOCUMENT` (not the global `document`) resolves to Angular's server-side DOM
// implementation during SSR/prerendering and to the real `document` in the browser,
// so this same code path works identically in both — appended `<script>` tags land in
// the prerendered static HTML, not just in a post-hydration client-side DOM mutation.
// Verified empirically against a real production build (Task 21 report).
@Injectable({ providedIn: 'root' })
export class StructuredDataService {
  private readonly document = inject(DOCUMENT);

  set(id: string, data: Record<string, unknown>): void {
    this.document.getElementById(id)?.remove();
    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    script.textContent = JSON.stringify(data);
    this.document.head.appendChild(script);
  }
}

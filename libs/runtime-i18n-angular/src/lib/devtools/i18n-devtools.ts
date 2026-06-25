import type { I18nService } from '../i18n.service';

interface I18nDevToolsEvent {
  type: 'ngx-i18n:state' | 'ngx-i18n:translation' | 'ngx-i18n:missing';
  payload: unknown;
}

/**
 * Emits structured events on window.postMessage for Angular DevTools or browser extensions.
 * Only active when ngDevMode is true — completely tree-shaken in production.
 * @internal
 */
export class I18nDevtools {
  private readonly service: I18nService;
  private callCount = 0;
  private readonly missingKeys: string[] = [];

  constructor(service: I18nService) {
    this.service = service;
  }

  connect(): void {
    if (typeof window === 'undefined') return;

    // Emit initial state
    this.emitState();

    // Patch the service's t() to intercept calls in dev mode
    const original = this.service.t.bind(this.service);
    (this.service as unknown as Record<string, unknown>)['t'] = <K extends string>(
      key: K,
      params?: Record<string, unknown>
    ): string => {
      this.callCount++;
      const result = original(key, params as never);
      if (result === key) {
        this.missingKeys.push(key);
        this.emit({ type: 'ngx-i18n:missing', payload: { key, lang: this.service.lang() } });
      }
      this.emit({
        type: 'ngx-i18n:translation',
        payload: { key, result, lang: this.service.lang(), callCount: this.callCount },
      });
      return result;
    };
  }

  private emitState(): void {
    this.emit({
      type: 'ngx-i18n:state',
      payload: {
        lang: this.service.lang(),
        ready: this.service.ready(),
        loadedLangs: this.service.getLoadedLangs(),
        missingKeys: this.missingKeys,
      },
    });
  }

  private emit(event: I18nDevToolsEvent): void {
    try {
      window.postMessage({ source: 'ngx-runtime-i18n-devtools', ...event }, '*');
    } catch {
      // Ignore serialization errors
    }
  }
}

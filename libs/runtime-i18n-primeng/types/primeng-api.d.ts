declare module 'primeng/api' {
  /**
   * Minimal surface to configure PrimeNG translations.
   * The actual library ships a richer config, so consumers will merge this declaration.
   */
  export class PrimeNGConfig {
    setTranslation(translation: Record<string, unknown>): void;
  }
}

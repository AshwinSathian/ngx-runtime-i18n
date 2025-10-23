export type Catalog = Record<string, any>;

export interface RuntimeI18nConfig {
  defaultLang: string;
  supported: string[];
  fetchCatalog: (lang: string, signal?: AbortSignal) => Promise<Catalog>;
  onMissingKey?: (key: string) => string; // default: key
}

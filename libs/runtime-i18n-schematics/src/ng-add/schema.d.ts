export interface Schema {
  project: string;
  defaultLang: string;
  additionalLangs?: string[];
  ssr?: boolean;
}

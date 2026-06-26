import { scanHtmlDirectory } from '../scanner/html-scanner.js';
import { scanTypeScriptDirectory } from '../scanner/ts-scanner.js';

export interface ExtractOptions {
  src: string;
  output?: string;
}

export interface TranslationManifest {
  keys: string[];
  sources: Record<string, Array<{ file: string; line: number }>>;
}

export async function extract(options: ExtractOptions): Promise<TranslationManifest> {
  const htmlResults = scanHtmlDirectory(options.src);
  const tsResults = scanTypeScriptDirectory(options.src);

  const allSources: Record<string, Array<{ file: string; line: number }>> = {};

  for (const { key, occurrences } of [...htmlResults, ...tsResults]) {
    if (!allSources[key]) allSources[key] = [];
    allSources[key].push(...occurrences);
  }

  return {
    keys: Object.keys(allSources).sort(),
    sources: allSources,
  };
}

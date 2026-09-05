import { scanHtmlDirectory, scanHtmlDirectoryForDynamicKeys } from '../scanner/html-scanner.js';
import { scanTypeScriptDirectory, scanTypeScriptDirectoryForDynamicKeys } from '../scanner/ts-scanner.js';

export interface ExtractOptions {
  src: string;
  output?: string;
}

export interface DynamicKeyWarning {
  file: string;
  line: number;
}

export interface TranslationManifest {
  keys: string[];
  sources: Record<string, Array<{ file: string; line: number }>>;
  /** Call sites whose key argument isn't a string literal (template literal,
   * variable, ...) and so couldn't be statically resolved into `keys`.
   * Optional for backward compatibility with manifest JSON written by an
   * older CLI version, which won't have this field. */
  dynamicKeyWarnings?: DynamicKeyWarning[];
}

export async function extract(options: ExtractOptions): Promise<TranslationManifest> {
  const htmlResults = scanHtmlDirectory(options.src);
  const tsResults = scanTypeScriptDirectory(options.src);
  const dynamicKeyWarnings = [
    ...scanHtmlDirectoryForDynamicKeys(options.src),
    ...scanTypeScriptDirectoryForDynamicKeys(options.src),
  ];

  const allSources: Record<string, Array<{ file: string; line: number }>> = {};

  for (const { key, occurrences } of [...htmlResults, ...tsResults]) {
    if (!allSources[key]) allSources[key] = [];
    allSources[key].push(...occurrences);
  }

  return {
    keys: Object.keys(allSources).sort(),
    sources: allSources,
    dynamicKeyWarnings,
  };
}

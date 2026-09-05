import { Rule, SchematicContext, SchematicsException, Tree, chain } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import * as fs from 'fs';
import * as path from 'path';
import { Schema } from './schema';

// Simplified BCP-47 language-tag shape (e.g. "en", "en-GB", "zh-Hans-CN").
// Rejects path separators, quotes, and other characters that would be unsafe
// once interpolated into a file path or generated source string.
const LANG_TAG_PATTERN = /^[a-zA-Z]{2,8}(-[a-zA-Z0-9]{1,8})*$/;

// Angular workspace project names are conventionally kebab-case identifiers.
const PROJECT_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9-]*$/;

export function ngAdd(options: Schema): Rule {
  return chain([
    validateOptions(options),
    addDependencies(),
    createCatalogFiles(options),
    patchAppConfig(options),
    scheduleInstall(),
  ]);
}

function validateOptions(options: Schema): Rule {
  return () => {
    if (!PROJECT_NAME_PATTERN.test(options.project)) {
      throw new SchematicsException(
        `Invalid --project "${options.project}": expected a plain identifier (letters, digits, hyphens).`
      );
    }
    for (const lang of [options.defaultLang, ...(options.additionalLangs ?? [])]) {
      if (!LANG_TAG_PATTERN.test(lang)) {
        throw new SchematicsException(
          `Invalid language tag "${lang}": expected a BCP-47-style tag (e.g. "en", "en-GB").`
        );
      }
    }
  };
}

function readOwnVersion(): string {
  const pkgPath = path.join(__dirname, '../../package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { version: string };
  return pkg.version;
}

// ponytail: pins @ngx-runtime-i18n/angular and /core to this schematics
// package's own version, on the assumption all @ngx-runtime-i18n packages
// release in lockstep. That assumption has already broken once (primeng
// 3.0.0 shipped standalone, out of lockstep - see CHANGELOG.md). If
// schematics ever diverges the same way, this pins a version range that may
// not match what's actually compatible. Upgrade path: bundle each
// dependency's own package.json as a schematics build asset and read its
// real version instead of reusing readOwnVersion() for every package.

function addDependencies(): Rule {
  return (tree: Tree) => {
    const pkgPath = '/package.json';
    if (!tree.exists(pkgPath)) return;
    const pkg = JSON.parse(tree.readText(pkgPath)) as {
      dependencies?: Record<string, string>;
    };
    const range = `^${readOwnVersion()}`;
    pkg.dependencies = pkg.dependencies ?? {};
    pkg.dependencies['@ngx-runtime-i18n/angular'] = range;
    pkg.dependencies['@ngx-runtime-i18n/core'] = range;
    tree.overwrite(pkgPath, JSON.stringify(pkg, null, 2));
  };
}

function createCatalogFiles(options: Schema): Rule {
  return (tree: Tree) => {
    const langs = [options.defaultLang, ...(options.additionalLangs ?? [])];
    const sampleCatalog = {
      app: { title: 'My App' },
      nav: { home: 'Home', about: 'About' },
    };

    for (const lang of langs) {
      const filePath = `public/i18n/${lang}.json`;
      if (!tree.exists(filePath)) {
        tree.create(filePath, JSON.stringify(sampleCatalog, null, 2));
      }
    }
  };
}

function patchAppConfig(options: Schema): Rule {
  return (tree: Tree) => {
    // Try standard Angular workspace locations
    const candidates = [
      `projects/${options.project}/src/app/app.config.ts`,
      `src/app/app.config.ts`,
      `apps/${options.project}/src/app/app.config.ts`,
    ];

    for (const configPath of candidates) {
      if (!tree.exists(configPath)) continue;

      const content = tree.readText(configPath);
      if (content.includes('provideRuntimeI18n')) return; // already patched

      const langs = [options.defaultLang, ...(options.additionalLangs ?? [])];
      const supportedLiteral = `[${langs.map((l) => JSON.stringify(l)).join(', ')}]`;

      const importStatement = `import { provideRuntimeI18n } from '@ngx-runtime-i18n/angular';`;
      const providerCall = `    provideRuntimeI18n({
      defaultLang: ${JSON.stringify(options.defaultLang)},
      supported: ${supportedLiteral},
      fetchCatalog: (lang, signal) => fetch(\`/i18n/\${lang}.json\`, { signal }).then(r => r.json()),
    }),`;

      let updated = content;

      // Add the import only if this exact symbol isn't already imported from
      // this module - checking for the module specifier alone (as before)
      // wrongly skipped adding the import whenever the app already imported
      // ANYTHING else from '@ngx-runtime-i18n/angular' (e.g. I18nService),
      // while still injecting a call to the now-undefined provideRuntimeI18n.
      const hasProvideRuntimeI18nImport = new RegExp(
        `import\\s*\\{[^}]*\\bprovideRuntimeI18n\\b[^}]*\\}\\s*from\\s*['"]@ngx-runtime-i18n/angular['"]`
      ).test(updated);
      if (!hasProvideRuntimeI18nImport) {
        updated = `${importStatement}\n${updated}`;
      }

      // Inject provider into the providers array. If this app.config.ts doesn't
      // match the expected `providers: [` shape, fail loudly rather than
      // silently shipping an unused import with no provider registered.
      if (!/providers\s*:\s*\[/.test(updated)) {
        throw new SchematicsException(
          `Could not find a "providers: [" array in ${configPath}. ` +
            `Add provideRuntimeI18n() to your ApplicationConfig manually — see the ` +
            `@ngx-runtime-i18n/angular README for the Quick Start snippet.`
        );
      }

      updated = updated.replace(
        /providers\s*:\s*\[/,
        `providers: [\n${providerCall}`
      );

      tree.overwrite(configPath, updated);
      return;
    }

    // None of the candidate paths existed at all (NgModule-based app, a
    // non-standard layout, or the wrong --project) - fail loudly instead of
    // silently completing with provideRuntimeI18n() never wired in.
    throw new SchematicsException(
      `Could not find an app.config.ts at any of: ${candidates.join(', ')}. ` +
        `Add provideRuntimeI18n() to your ApplicationConfig manually — see the ` +
        `@ngx-runtime-i18n/angular README for the Quick Start snippet.`
    );
  };
}

function scheduleInstall(): Rule {
  return (_: Tree, context: SchematicContext) => {
    context.addTask(new NodePackageInstallTask());
  };
}

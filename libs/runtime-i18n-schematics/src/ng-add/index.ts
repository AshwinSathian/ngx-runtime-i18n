import { Rule, SchematicContext, Tree, chain } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { Schema } from './schema';

export function ngAdd(options: Schema): Rule {
  return chain([
    addDependencies(),
    createCatalogFiles(options),
    patchAppConfig(options),
    scheduleInstall(),
  ]);
}

function addDependencies(): Rule {
  return (tree: Tree) => {
    const pkgPath = '/package.json';
    if (!tree.exists(pkgPath)) return;
    const pkg = JSON.parse(tree.readText(pkgPath)) as {
      dependencies?: Record<string, string>;
    };
    pkg.dependencies = pkg.dependencies ?? {};
    pkg.dependencies['@ngx-runtime-i18n/angular'] = '^2.0.1';
    pkg.dependencies['@ngx-runtime-i18n/core'] = '^2.0.1';
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
      const path = `public/i18n/${lang}.json`;
      if (!tree.exists(path)) {
        tree.create(path, JSON.stringify(sampleCatalog, null, 2));
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

      const importStatement = `import { provideRuntimeI18n } from '@ngx-runtime-i18n/angular';`;
      const providerCall = `    provideRuntimeI18n({
      defaultLang: '${options.defaultLang}',
      supported: ['${options.defaultLang}'${(options.additionalLangs ?? []).map(l => `, '${l}'`).join('')}],
      fetchCatalog: (lang, signal) => fetch(\`/i18n/\${lang}.json\`, { signal }).then(r => r.json()),
    }),`;

      let updated = content;

      // Add import if not present
      if (!updated.includes('@ngx-runtime-i18n/angular')) {
        updated = `${importStatement}\n${updated}`;
      }

      // Inject provider into providers array
      updated = updated.replace(
        /providers\s*:\s*\[/,
        `providers: [\n${providerCall}`
      );

      tree.overwrite(configPath, updated);
      return;
    }
  };
}

function scheduleInstall(): Rule {
  return (_: Tree, context: SchematicContext) => {
    context.addTask(new NodePackageInstallTask());
  };
}

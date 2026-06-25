import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Tree } from '@angular-devkit/schematics';
import * as path from 'path';

const collectionPath = path.join(__dirname, '../../collection.json');
const runner = new SchematicTestRunner('schematics', collectionPath);

function createMinimalTree(): UnitTestTree {
  const baseTree = Tree.empty();

  // Minimal package.json
  baseTree.create('/package.json', JSON.stringify({
    name: 'test-app',
    dependencies: {},
  }, null, 2));

  // Minimal app.config.ts
  baseTree.create('/src/app/app.config.ts', `import { ApplicationConfig } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: []
};
`);

  return new UnitTestTree(baseTree);
}

describe('ng-add schematic', () => {
  it('adds @ngx-runtime-i18n packages to package.json', async () => {
    const tree = await runner.runSchematic('ng-add', { project: 'my-app' }, createMinimalTree());
    const pkg = JSON.parse(tree.readContent('/package.json'));
    expect(pkg.dependencies['@ngx-runtime-i18n/angular']).toBeDefined();
    expect(pkg.dependencies['@ngx-runtime-i18n/core']).toBeDefined();
  });

  it('creates public/i18n/en.json by default', async () => {
    const tree = await runner.runSchematic('ng-add', { project: 'my-app' }, createMinimalTree());
    expect(tree.exists('/public/i18n/en.json')).toBe(true);
    const catalog = JSON.parse(tree.readContent('/public/i18n/en.json'));
    expect(catalog.app.title).toBe('My App');
  });

  it('creates catalog files for additional languages', async () => {
    const tree = await runner.runSchematic(
      'ng-add',
      { project: 'my-app', defaultLang: 'en', additionalLangs: ['de', 'fr'] },
      createMinimalTree()
    );
    expect(tree.exists('/public/i18n/de.json')).toBe(true);
    expect(tree.exists('/public/i18n/fr.json')).toBe(true);
  });

  it('patches app.config.ts to include provideRuntimeI18n', async () => {
    const tree = await runner.runSchematic('ng-add', { project: 'my-app' }, createMinimalTree());
    const config = tree.readContent('/src/app/app.config.ts');
    expect(config).toContain('provideRuntimeI18n');
    expect(config).toContain('@ngx-runtime-i18n/angular');
  });

  it('does not overwrite existing catalog files', async () => {
    const baseTree = Tree.empty();
    baseTree.create('/package.json', JSON.stringify({ name: 'test-app', dependencies: {} }, null, 2));
    baseTree.create('/src/app/app.config.ts', `import { ApplicationConfig } from '@angular/core';
export const appConfig: ApplicationConfig = { providers: [] };
`);
    baseTree.create('/public/i18n/en.json', '{"existing": true}');
    const initialTree = new UnitTestTree(baseTree);
    const tree = await runner.runSchematic('ng-add', { project: 'my-app' }, initialTree);
    const catalog = JSON.parse(tree.readContent('/public/i18n/en.json'));
    expect(catalog.existing).toBe(true);
  });

  it('does not patch app.config.ts twice if already contains provideRuntimeI18n', async () => {
    const baseTree = Tree.empty();
    baseTree.create('/package.json', JSON.stringify({ name: 'test-app', dependencies: {} }, null, 2));
    // Content already has provideRuntimeI18n in import + providers — schematic must NOT add a second call
    const originalContent = `import { provideRuntimeI18n } from '@ngx-runtime-i18n/angular';
export const appConfig = { providers: [provideRuntimeI18n({ defaultLang: 'en', supported: ['en'], fetchCatalog: () => Promise.resolve({}) })] };`;
    baseTree.create('/src/app/app.config.ts', originalContent);
    const initialTree = new UnitTestTree(baseTree);
    const originalCount = (originalContent.match(/provideRuntimeI18n/g) ?? []).length;
    const tree = await runner.runSchematic('ng-add', { project: 'my-app' }, initialTree);
    const config = tree.readContent('/src/app/app.config.ts');
    const matches = config.match(/provideRuntimeI18n/g) ?? [];
    // The schematic must not inject provideRuntimeI18n again
    expect(matches.length).toBe(originalCount);
  });
});

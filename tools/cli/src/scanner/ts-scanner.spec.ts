import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  scanTypeScriptFile,
  scanTypeScriptDirectory,
  scanTypeScriptFileForDynamicKeys,
} from './ts-scanner';

describe('ts-scanner', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-ts-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('scanTypeScriptFile()', () => {
    it('extracts keys from i18n.t() calls', () => {
      const file = path.join(tmpDir, 'app.service.ts');
      fs.writeFileSync(file, `class AppService { getTitle() { return this.i18n.t('app.title'); } }`);
      const results = scanTypeScriptFile(file);
      expect(results.map(r => r.key)).toContain('app.title');
    });

    it('handles double-quoted keys', () => {
      const file = path.join(tmpDir, 'app.ts');
      fs.writeFileSync(file, `this.service.t("nav.home")`);
      const results = scanTypeScriptFile(file);
      expect(results.map(r => r.key)).toContain('nav.home');
    });

    it('returns empty for files with no t() calls', () => {
      const file = path.join(tmpDir, 'plain.ts');
      fs.writeFileSync(file, `export const x = 1;`);
      expect(scanTypeScriptFile(file)).toHaveLength(0);
    });

    it('extracts keys from the reactive t$() signal helper', () => {
      const file = path.join(tmpDir, 'greeting.component.ts');
      fs.writeFileSync(
        file,
        `readonly greeting = this.i18n.t$('hello.user', { name: this.username });`
      );
      const results = scanTypeScriptFile(file);
      expect(results.map(r => r.key)).toContain('hello.user');
    });

    it('extracts keys from t() and t$() calls in the same file without cross-matching', () => {
      const file = path.join(tmpDir, 'mixed.component.ts');
      fs.writeFileSync(
        file,
        `this.i18n.t('plain.key');\nthis.i18n.t$('reactive.key');`
      );
      const keys = scanTypeScriptFile(file).map(r => r.key);
      expect(keys).toContain('plain.key');
      expect(keys).toContain('reactive.key');
    });

    it('finds a call whose arguments span multiple lines', () => {
      const file = path.join(tmpDir, 'multiline.ts');
      fs.writeFileSync(file, `this.i18n.t(\n  'multiline.key'\n);`);
      const results = scanTypeScriptFile(file);
      expect(results.map(r => r.key)).toContain('multiline.key');
    });

    it('ignores a key referenced only inside a line comment', () => {
      const file = path.join(tmpDir, 'commented.ts');
      fs.writeFileSync(file, `// this.i18n.t('commented.out.key')\nconst x = 1;`);
      const results = scanTypeScriptFile(file);
      expect(results.map(r => r.key)).not.toContain('commented.out.key');
    });

    it('ignores a key referenced only inside a block comment', () => {
      const file = path.join(tmpDir, 'block-commented.ts');
      fs.writeFileSync(file, `/* this.i18n.t('block.commented.key') */\nconst x = 1;`);
      const results = scanTypeScriptFile(file);
      expect(results.map(r => r.key)).not.toContain('block.commented.key');
    });

    it('does not treat "://" inside a real call as a comment', () => {
      const file = path.join(tmpDir, 'url.ts');
      fs.writeFileSync(
        file,
        `const url = 'https://example.com';\nthis.i18n.t('real.key');`
      );
      const results = scanTypeScriptFile(file);
      expect(results.map(r => r.key)).toContain('real.key');
    });

    it('reports the correct line number for a key after a multi-line call above it', () => {
      const file = path.join(tmpDir, 'lines.ts');
      fs.writeFileSync(
        file,
        `this.i18n.t(\n  'first.key'\n);\nthis.i18n.t('second.key');`
      );
      const results = scanTypeScriptFile(file);
      const second = results.find(r => r.key === 'second.key');
      expect(second?.occurrences[0].line).toBe(4);
    });
  });

  describe('scanTypeScriptFileForDynamicKeys()', () => {
    it('flags a template-literal key as dynamic instead of silently dropping it', () => {
      const file = path.join(tmpDir, 'dynamic.ts');
      fs.writeFileSync(file, 'this.i18n.t(`dynamic.${x}`);');
      const warnings = scanTypeScriptFileForDynamicKeys(file);
      expect(warnings).toHaveLength(1);
      expect(warnings[0].line).toBe(1);
    });

    it('flags a variable key as dynamic', () => {
      const file = path.join(tmpDir, 'dynamic-var.ts');
      fs.writeFileSync(file, 'this.i18n.t(someKeyVariable);');
      const warnings = scanTypeScriptFileForDynamicKeys(file);
      expect(warnings).toHaveLength(1);
    });

    it('does not flag a call with a string literal key', () => {
      const file = path.join(tmpDir, 'static.ts');
      fs.writeFileSync(file, `this.i18n.t('static.key');`);
      expect(scanTypeScriptFileForDynamicKeys(file)).toHaveLength(0);
    });
  });

  describe('scanTypeScriptDirectory()', () => {
    it('recursively scans .ts files', () => {
      fs.writeFileSync(path.join(tmpDir, 'a.ts'), `this.i18n.t('key.a')`);
      const results = scanTypeScriptDirectory(tmpDir);
      expect(results.map(r => r.key)).toContain('key.a');
    });

    it('skips .spec.ts files', () => {
      fs.writeFileSync(path.join(tmpDir, 'a.spec.ts'), `this.i18n.t('spec.key')`);
      const results = scanTypeScriptDirectory(tmpDir);
      expect(results.map(r => r.key)).not.toContain('spec.key');
    });
  });
});

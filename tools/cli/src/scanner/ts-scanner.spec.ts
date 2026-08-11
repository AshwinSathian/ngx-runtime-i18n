import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { scanTypeScriptFile, scanTypeScriptDirectory } from './ts-scanner';

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

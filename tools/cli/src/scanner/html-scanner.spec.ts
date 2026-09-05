import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { scanHtmlFile, scanHtmlDirectory, scanHtmlFileForDynamicKeys } from './html-scanner';

describe('html-scanner', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-html-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('scanHtmlFile()', () => {
    it('extracts keys from i18n pipe usage', () => {
      const file = path.join(tmpDir, 'app.component.html');
      fs.writeFileSync(file, `<h1>{{ 'app.title' | i18n }}</h1>\n<p>{{ "nav.home" | i18n }}</p>`);
      const results = scanHtmlFile(file);
      const keys = results.map(r => r.key);
      expect(keys).toContain('app.title');
      expect(keys).toContain('nav.home');
    });

    it('records correct line numbers', () => {
      const file = path.join(tmpDir, 'app.component.html');
      fs.writeFileSync(file, `<div></div>\n{{ 'second.line' | i18n }}`);
      const results = scanHtmlFile(file);
      const result = results.find(r => r.key === 'second.line');
      expect(result?.occurrences[0].line).toBe(2);
    });

    it('returns empty array for files with no i18n pipe', () => {
      const file = path.join(tmpDir, 'plain.html');
      fs.writeFileSync(file, '<div>Hello</div>');
      expect(scanHtmlFile(file)).toHaveLength(0);
    });

    it('extracts a hyphenated key, matching the TS scanner charset', () => {
      const file = path.join(tmpDir, 'hyphen.html');
      fs.writeFileSync(file, `{{ 'hyphen-key' | i18n }}`);
      const results = scanHtmlFile(file);
      expect(results.map(r => r.key)).toContain('hyphen-key');
    });

    it('finds a key and pipe split across lines', () => {
      const file = path.join(tmpDir, 'multiline.html');
      fs.writeFileSync(file, `{{ 'multiline.key'\n  | i18n }}`);
      const results = scanHtmlFile(file);
      expect(results.map(r => r.key)).toContain('multiline.key');
    });

    it('ignores a key referenced only inside an HTML comment', () => {
      const file = path.join(tmpDir, 'commented.html');
      fs.writeFileSync(file, `<!-- {{ 'commented.html.key' | i18n }} -->`);
      const results = scanHtmlFile(file);
      expect(results.map(r => r.key)).not.toContain('commented.html.key');
    });
  });

  describe('scanHtmlFileForDynamicKeys()', () => {
    it('flags a piped expression that is not a bare string literal', () => {
      const file = path.join(tmpDir, 'dynamic.html');
      fs.writeFileSync(file, `{{ someExpr | i18n }}`);
      const warnings = scanHtmlFileForDynamicKeys(file);
      expect(warnings).toHaveLength(1);
    });

    it('does not flag a bare string literal pipe usage', () => {
      const file = path.join(tmpDir, 'static.html');
      fs.writeFileSync(file, `{{ 'static.key' | i18n }}`);
      expect(scanHtmlFileForDynamicKeys(file)).toHaveLength(0);
    });
  });

  describe('scanHtmlDirectory()', () => {
    it('recursively finds keys across multiple files', () => {
      fs.writeFileSync(path.join(tmpDir, 'a.html'), `{{ 'key.a' | i18n }}`);
      fs.mkdirSync(path.join(tmpDir, 'sub'));
      fs.writeFileSync(path.join(tmpDir, 'sub', 'b.html'), `{{ 'key.b' | i18n }}`);
      const results = scanHtmlDirectory(tmpDir);
      const keys = results.map(r => r.key);
      expect(keys).toContain('key.a');
      expect(keys).toContain('key.b');
    });

    it('deduplicates keys across files', () => {
      fs.writeFileSync(path.join(tmpDir, 'a.html'), `{{ 'shared.key' | i18n }}`);
      fs.writeFileSync(path.join(tmpDir, 'b.html'), `{{ 'shared.key' | i18n }}`);
      const results = scanHtmlDirectory(tmpDir);
      const keyResults = results.filter(r => r.key === 'shared.key');
      expect(keyResults).toHaveLength(1);
      expect(keyResults[0].occurrences).toHaveLength(2);
    });
  });
});

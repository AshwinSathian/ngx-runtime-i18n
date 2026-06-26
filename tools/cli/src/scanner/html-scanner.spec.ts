import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { scanHtmlFile, scanHtmlDirectory } from './html-scanner';

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

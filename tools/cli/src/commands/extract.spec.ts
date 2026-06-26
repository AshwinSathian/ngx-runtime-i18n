import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { extract } from './extract';

describe('extract command', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-ex-')); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('extracts keys from HTML templates', async () => {
    fs.writeFileSync(path.join(tmpDir, 'app.html'), `{{ 'app.title' | i18n }}`);
    const manifest = await extract({ src: tmpDir });
    expect(manifest.keys).toContain('app.title');
  });

  it('extracts keys from TypeScript files', async () => {
    fs.writeFileSync(path.join(tmpDir, 'app.ts'), `this.i18n.t('nav.home')`);
    const manifest = await extract({ src: tmpDir });
    expect(manifest.keys).toContain('nav.home');
  });

  it('deduplicates keys', async () => {
    fs.writeFileSync(path.join(tmpDir, 'a.html'), `{{ 'shared' | i18n }}`);
    fs.writeFileSync(path.join(tmpDir, 'b.html'), `{{ 'shared' | i18n }}`);
    const manifest = await extract({ src: tmpDir });
    expect(manifest.keys.filter(k => k === 'shared')).toHaveLength(1);
    expect(manifest.sources['shared']).toHaveLength(2);
  });

  it('returns sorted keys', async () => {
    fs.writeFileSync(path.join(tmpDir, 'a.html'), `{{ 'z.key' | i18n }}\n{{ 'a.key' | i18n }}`);
    const manifest = await extract({ src: tmpDir });
    const sorted = [...manifest.keys].sort();
    expect(manifest.keys).toEqual(sorted);
  });
});

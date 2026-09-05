import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { check } from './check';

describe('check command', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-chk-')); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  function writeCatalog(lang: string, data: Record<string, unknown>): void {
    fs.writeFileSync(path.join(tmpDir, `${lang}.json`), JSON.stringify(data));
  }

  it('reports all keys present when catalog is complete', async () => {
    writeCatalog('en', { app: { title: 'My App' } });
    const result = await check({
      catalog: tmpDir,
      langs: ['en'],
      manifest: { keys: ['app.title'], sources: {} },
    });
    expect(result.reports[0].missing).toHaveLength(0);
  });

  it('reports missing keys', async () => {
    writeCatalog('en', { app: { title: 'My App' } });
    const result = await check({
      catalog: tmpDir,
      langs: ['en'],
      manifest: { keys: ['app.title', 'missing.key'], sources: {} },
    });
    expect(result.reports[0].missing).toContain('missing.key');
  });

  it('hasFailures is true when failOnMissing and there are missing keys', async () => {
    writeCatalog('en', {});
    const result = await check({
      catalog: tmpDir,
      langs: ['en'],
      manifest: { keys: ['some.key'], sources: {} },
      failOnMissing: true,
    });
    expect(result.hasFailures).toBe(true);
  });

  it('checks multiple languages', async () => {
    writeCatalog('en', { app: { title: 'My App' } });
    writeCatalog('de', {}); // de is missing the key
    const result = await check({
      catalog: tmpDir,
      langs: ['en', 'de'],
      manifest: { keys: ['app.title'], sources: {} },
    });
    const enReport = result.reports.find(r => r.lang === 'en');
    const deReport = result.reports.find(r => r.lang === 'de');
    expect(enReport).toBeDefined();
    expect(deReport).toBeDefined();
    expect(enReport?.missing).toHaveLength(0);
    expect(deReport?.missing).toContain('app.title');
  });

  it('throws instead of silently reporting a clean pass when neither src nor manifest is given', async () => {
    writeCatalog('en', { app: { title: 'My App' } });
    await expect(
      check({ catalog: tmpDir, langs: ['en'], failOnMissing: true })
    ).rejects.toThrow(/requires either "src".*or "manifest"/);
  });

  it('computes unused keys even when --fail-on-unused is not set', async () => {
    writeCatalog('en', { app: { title: 'My App' }, orphan: { key: 'Unused' } });
    const result = await check({
      catalog: tmpDir,
      langs: ['en'],
      manifest: { keys: ['app.title'], sources: {} },
    });
    expect(result.unused).toContain('orphan.key');
    expect(result.hasFailures).toBe(false);
  });
});

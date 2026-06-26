import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { flattenCatalog, readCatalog } from './reader';

describe('catalog reader', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-cat-')); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  describe('flattenCatalog()', () => {
    it('flattens a nested catalog to dot-notation keys', () => {
      const cat = { app: { title: 'App', nav: { home: 'Home' } }, greeting: 'Hello' };
      const keys = flattenCatalog(cat);
      expect(keys).toContain('app.title');
      expect(keys).toContain('app.nav.home');
      expect(keys).toContain('greeting');
    });
  });

  describe('readCatalog()', () => {
    it('reads and flattens a catalog JSON file', () => {
      fs.writeFileSync(path.join(tmpDir, 'en.json'), JSON.stringify({ app: { title: 'My App' } }));
      const keys = readCatalog(tmpDir, 'en');
      expect(keys).toContain('app.title');
    });

    it('returns empty array when file does not exist', () => {
      expect(readCatalog(tmpDir, 'missing')).toHaveLength(0);
    });
  });
});

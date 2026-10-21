import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// End-to-end: runs the built bin (the test target depends on build) so the
// commander wiring, exit codes and ESM entry are covered, not just the commands.
const CLI = path.resolve(__dirname, '../dist/cli.js');
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'));

function run(args: string[], cwd: string) {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf-8' });
  return { code: r.status, out: r.stdout + r.stderr };
}

describe('ngx-i18n bin', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-bin-'));
    fs.mkdirSync(path.join(dir, 'src'));
    fs.mkdirSync(path.join(dir, 'i18n'));
    fs.writeFileSync(path.join(dir, 'src', 'app.ts'), "i18n.t('app.title');\n");
    fs.writeFileSync(path.join(dir, 'i18n', 'en.json'), JSON.stringify({ app: { title: 'App' } }));
    fs.writeFileSync(path.join(dir, 'i18n', 'fr.json'), JSON.stringify({}));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('reports the version from package.json, not a hardcoded string', () => {
    const r = run(['--version'], dir);
    expect(r.code).toBe(0);
    expect(r.out.trim()).toBe(pkg.version);
  });

  it('extracts a manifest and checks catalogs against it', () => {
    expect(run(['extract', '--src', 'src', '--output', 'm.json'], dir).code).toBe(0);
    const r = run(['check', '--catalog', 'i18n', '--langs', 'en,fr', '--manifest', 'm.json', '--fail-on-missing'], dir);
    expect(r.out).toContain('✓ en: 1/1 keys present');
    expect(r.out).toContain('✗ fr: 1 keys missing');
    expect(r.code).toBe(1);
  });

  it('fails when neither --src nor --manifest is given', () => {
    const r = run(['check', '--catalog', 'i18n'], dir);
    expect(r.code).toBe(1);
    expect(r.out).toContain('either --src');
  });

  it('rejects a space-separated --langs list instead of silently checking only the first language', () => {
    const r = run(['check', '--catalog', 'i18n', '--langs', 'en', 'fr', '--src', 'src'], dir);
    expect(r.code).not.toBe(0);
    expect(r.out).toMatch(/too many arguments/i);
  });
});

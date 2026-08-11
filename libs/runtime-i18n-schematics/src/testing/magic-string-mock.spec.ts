import { MagicString } from './magic-string-mock';

describe('MagicString mock', () => {
  it('is a no-op when nothing is inserted or removed', () => {
    expect(new MagicString('hello world').toString()).toBe('hello world');
  });

  it('prepends a header via appendLeft(0)', () => {
    const m = new MagicString('body');
    m.appendLeft(0, '// header\n');
    expect(m.toString()).toBe('// header\nbody');
  });

  it('appends a footer via appendRight(original.length)', () => {
    const m = new MagicString('body');
    m.appendRight(4, '\n// footer');
    expect(m.toString()).toBe('body\n// footer');
  });

  it('orders appendLeft before appendRight at the same boundary', () => {
    const m = new MagicString('ab');
    m.appendLeft(1, 'X');
    m.appendRight(1, 'Y');
    expect(m.toString()).toBe('aXYb');
  });

  it('removes a trailing range', () => {
    const m = new MagicString('hello world');
    m.remove(5, 11);
    expect(m.toString()).toBe('hello');
  });

  it('removes a leading range', () => {
    const m = new MagicString('hello world');
    m.remove(0, 6);
    expect(m.toString()).toBe('world');
  });

  it('supports a realistic combined edit (header + removal + footer)', () => {
    const m = new MagicString('const x = 1;');
    m.appendLeft(0, '// generated\n');
    m.remove(6, 8); // remove 'x '
    m.appendRight(12, '\nexport {};');
    expect(m.toString()).toBe('// generated\nconst = 1;\nexport {};');
  });

  it('preserves call order for repeated appendLeft at the same index', () => {
    const m = new MagicString('x');
    m.appendLeft(0, 'a');
    m.appendLeft(0, 'b');
    expect(m.toString()).toBe('abx');
  });

  it('prepends each new appendRight closest to the boundary', () => {
    const m = new MagicString('x');
    m.appendRight(1, 'a');
    m.appendRight(1, 'b');
    expect(m.toString()).toBe('xba');
  });

  it('handles an empty original string', () => {
    expect(new MagicString('').toString()).toBe('');
  });

  it('handles inserts on an empty original string (start === end === 0)', () => {
    const m = new MagicString('');
    m.appendLeft(0, 'x');
    m.appendRight(0, 'y');
    expect(m.toString()).toBe('xy');
  });

  it('removes the entire string', () => {
    const m = new MagicString('remove-me');
    m.remove(0, 9);
    expect(m.toString()).toBe('');
  });

  it('handles overlapping remove ranges', () => {
    const m = new MagicString('overlap');
    m.remove(0, 4);
    m.remove(2, 7);
    expect(m.toString()).toBe('');
  });
});

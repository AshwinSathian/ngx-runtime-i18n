import { formatIcu } from './icu';

type Cat = Record<string, unknown>;

const cat: Cat = {
  hello: { user: 'Hello, {name}!' },
  cart: {
    items:
      '{count, plural, =0 {No items in your cart} one {1 item in your cart} other {# items in your cart}}',
  },
};

describe('formatIcu', () => {
  it('interpolates simple variables', () => {
    const s = formatIcu('en', 'hello.user', cat, { name: 'Ashwin' });
    expect(s).toBe('Hello, Ashwin!');
  });

  it('handles plural =0', () => {
    const s = formatIcu('en', 'cart.items', cat, { count: 0 });
    expect(s).toBe('No items in your cart');
  });

  it('handles plural one', () => {
    const s = formatIcu('en', 'cart.items', cat, { count: 1 });
    expect(s).toBe('1 item in your cart');
  });

  it('handles plural other with # replacement', () => {
    const s = formatIcu('en', 'cart.items', cat, { count: 5 });
    expect(s).toBe('5 items in your cart');
  });

  it('returns key via onMissingKey when key not found', () => {
    const s = formatIcu('en', 'missing.key', cat, {}, (k) => `@@${k}@@`);
    expect(s).toBe('@@missing.key@@');
  });
});

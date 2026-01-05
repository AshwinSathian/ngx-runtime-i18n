import { formatIcu } from './icu';

type Cat = Record<string, unknown>;

const cat: Cat = {
  hello: { user: 'Hello, {name}!' },
  cart: {
    items:
      '{count, plural, =0 {No items in your cart} one {1 item in your cart} other {# items in your cart}}',
  },
  tokens: 'Connected to {user.name} via {user-name} (still {missing.key})',
  pluralNested:
    '{count, plural, one {You have {count} item} other {You have {count} items}}',
  literalBraces: '{count, plural, other {Use braces {like this} literally}}',
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

  it('supports dotted/hyphen tokens and still returns missing placeholders', () => {
    const s = formatIcu('en', 'tokens', cat, {
      'user.name': 'Ashwin',
      'user-name': 'Ash-1',
    });
    expect(s).toBe('Connected to Ashwin via Ash-1 (still {missing.key})');
  });

  it('renders nested placeholders inside plural branches', () => {
    expect(formatIcu('en', 'pluralNested', cat, { count: 1 })).toBe(
      'You have 1 item'
    );
    expect(formatIcu('en', 'pluralNested', cat, { count: 3 })).toBe(
      'You have 3 items'
    );
  });

  it('leaves literal braces intact when they do not form valid tokens', () => {
    const s = formatIcu('en', 'literalBraces', cat, { count: 4 });
    expect(s).toBe('Use braces {like this} literally');
  });

  it('returns key via onMissingKey when key not found', () => {
    const s = formatIcu('en', 'missing.key', cat, {}, (k) => `@@${k}@@`);
    expect(s).toBe('@@missing.key@@');
  });
});

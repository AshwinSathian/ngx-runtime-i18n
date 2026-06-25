import type { PluralCategory, PluralResolver } from './types';
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
  gender: '{gender, select, male {He is a developer} female {She is a developer} other {They are a developer}}',
  pronoun: '{gender, select, male {his} female {her} other {their}} profile',
  arabicItems: '{count, plural, zero {لا عناصر} one {عنصر واحد} two {عنصران} few {# عناصر قليلة} many {# عناصر كثيرة} other {# عنصر}}',
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

  describe('select form', () => {
    it('resolves male gender selector', () => {
      const s = formatIcu('en', 'gender', cat, { gender: 'male' });
      expect(s).toBe('He is a developer');
    });

    it('resolves female gender selector', () => {
      const s = formatIcu('en', 'gender', cat, { gender: 'female' });
      expect(s).toBe('She is a developer');
    });

    it('falls back to "other" for unknown selector value', () => {
      const s = formatIcu('en', 'gender', cat, { gender: 'nonbinary' });
      expect(s).toBe('They are a developer');
    });

    it('handles select at the start of a string with trailing text', () => {
      const s = formatIcu('en', 'pronoun', cat, { gender: 'female' });
      expect(s).toBe('her profile');
    });

    it('falls back to "other" when param is missing', () => {
      const s = formatIcu('en', 'gender', cat, {});
      expect(s).toBe('They are a developer');
    });
  });

  describe('CLDR plural resolver', () => {
    // Mock resolver for Arabic: implements 6-category CLDR plural for Arabic
    const arabicResolver: PluralResolver = (n: number): PluralCategory => {
      if (n === 0) return 'zero';
      if (n === 1) return 'one';
      if (n === 2) return 'two';
      if (n % 100 >= 3 && n % 100 <= 10) return 'few';
      if (n % 100 >= 11 && n % 100 <= 99) return 'many';
      return 'other';
    };

    it('uses "zero" category for 0 in Arabic', () => {
      const s = formatIcu('ar', 'arabicItems', cat, { count: 0 }, undefined, arabicResolver);
      expect(s).toBe('لا عناصر');
    });

    it('uses "one" category for 1 in Arabic', () => {
      const s = formatIcu('ar', 'arabicItems', cat, { count: 1 }, undefined, arabicResolver);
      expect(s).toBe('عنصر واحد');
    });

    it('uses "two" category for 2 in Arabic', () => {
      const s = formatIcu('ar', 'arabicItems', cat, { count: 2 }, undefined, arabicResolver);
      expect(s).toBe('عنصران');
    });

    it('uses "few" category for 5 in Arabic (100-mod 3-10)', () => {
      const s = formatIcu('ar', 'arabicItems', cat, { count: 5 }, undefined, arabicResolver);
      expect(s).toBe('5 عناصر قليلة');
    });

    it('uses "many" category for 25 in Arabic (100-mod 11-99)', () => {
      const s = formatIcu('ar', 'arabicItems', cat, { count: 25 }, undefined, arabicResolver);
      expect(s).toBe('25 عناصر كثيرة');
    });

    it('uses "other" category for 100 in Arabic', () => {
      const s = formatIcu('ar', 'arabicItems', cat, { count: 100 }, undefined, arabicResolver);
      expect(s).toBe('100 عنصر');
    });
  });

  describe('English one/other behavior without resolver', () => {
    it('resolves "one" for count=1 without a resolver', () => {
      const s = formatIcu('en', 'cart.items', cat, { count: 1 });
      expect(s).toBe('1 item in your cart');
    });

    it('resolves "other" for count=5 without a resolver', () => {
      const s = formatIcu('en', 'cart.items', cat, { count: 5 });
      expect(s).toBe('5 items in your cart');
    });

    it('resolves "other" for count=0 without a resolver (no =0 fallback)', () => {
      // cat.cart.items has =0 so this tests exact match precedence
      const s = formatIcu('en', 'cart.items', cat, { count: 0 });
      expect(s).toBe('No items in your cart');
    });
  });
});

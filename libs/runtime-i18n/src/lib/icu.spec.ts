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
  offsetItems: '{count, plural, offset:1 =0 {No one} =1 {Just you} one {You and # other} other {You and # others}}',
  arabicItems: '{count, plural, zero {لا عناصر} one {عنصر واحد} two {عنصران} few {# عناصر قليلة} many {# عناصر كثيرة} other {# عنصر}}',
  nestedPluralInSelect:
    '{gender, select, male {He has {count, plural, one {# item} other {# items}}} other {They have {count, plural, one {# item} other {# items}}}}',
  nestedSelectInPlural:
    '{count, plural, one {{gender, select, male {He has # item} other {They have # item}}} other {{gender, select, male {He has # items} other {They have # items}}}}',
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

  describe('nested keyword blocks', () => {
    it('resolves a plural nested inside a select branch', () => {
      expect(
        formatIcu('en', 'nestedPluralInSelect', cat, { gender: 'male', count: 1 })
      ).toBe('He has 1 item');
      expect(
        formatIcu('en', 'nestedPluralInSelect', cat, { gender: 'male', count: 3 })
      ).toBe('He has 3 items');
      expect(
        formatIcu('en', 'nestedPluralInSelect', cat, { gender: 'other', count: 3 })
      ).toBe('They have 3 items');
    });

    it('resolves a select nested inside a plural branch, keeping # bound to the enclosing plural', () => {
      expect(
        formatIcu('en', 'nestedSelectInPlural', cat, { gender: 'male', count: 1 })
      ).toBe('He has 1 item');
      expect(
        formatIcu('en', 'nestedSelectInPlural', cat, { gender: 'female', count: 5 })
      ).toBe('They have 5 items');
    });
  });

  describe('prototype-chain key safety', () => {
    it('does not resolve inherited Object.prototype members as translations', () => {
      const emptyCat: Cat = {};
      expect(formatIcu('en', 'constructor', emptyCat, {}, (k) => `@@${k}@@`)).toBe(
        '@@constructor@@'
      );
      expect(formatIcu('en', 'toString', emptyCat, {}, (k) => `@@${k}@@`)).toBe(
        '@@toString@@'
      );
      expect(formatIcu('en', 'hasOwnProperty', emptyCat, {}, (k) => `@@${k}@@`)).toBe(
        '@@hasOwnProperty@@'
      );
      expect(formatIcu('en', '__proto__', emptyCat, {}, (k) => `@@${k}@@`)).toBe(
        '@@__proto__@@'
      );
    });

    it('does not crash or leak Object.prototype members when a select arg value matches one', () => {
      // A user-controlled select arg (e.g. a free-text profile field) equal to
      // "constructor"/"toString"/etc must never resolve to the inherited
      // Object.prototype function instead of the "other" clause.
      expect(formatIcu('en', 'gender', cat, { gender: 'constructor' })).toBe(
        'They are a developer'
      );
      expect(formatIcu('en', 'gender', cat, { gender: 'hasOwnProperty' })).toBe(
        'They are a developer'
      );
      expect(formatIcu('en', 'gender', cat, { gender: 'toString' })).toBe(
        'They are a developer'
      );
    });
  });

  describe('offset:N plural clauses', () => {
    it('parses the offset prefix instead of discarding the whole clause', () => {
      expect(formatIcu('en', 'offsetItems', cat, { count: 0 })).toBe('No one');
      expect(formatIcu('en', 'offsetItems', cat, { count: 1 })).toBe('Just you');
    });

    it('subtracts the offset from # and from category selection', () => {
      // count=2 -> no exact match, shifted = 2-1 = 1 -> "one"
      expect(formatIcu('en', 'offsetItems', cat, { count: 2 })).toBe('You and 1 other');
      // count=4 -> shifted = 3 -> "other"
      expect(formatIcu('en', 'offsetItems', cat, { count: 4 })).toBe('You and 3 others');
    });
  });

  describe('edge-case inputs', () => {
    it('treats a null params argument the same as an empty object instead of throwing', () => {
      expect(formatIcu('en', 'hello.user', cat, null)).toBe('Hello, {name}!');
      // count is absent -> Number(undefined ?? 0) === 0 -> hits the =0 exact match.
      expect(formatIcu('en', 'cart.items', cat, null, undefined)).toBe(
        'No items in your cart'
      );
    });

    it('uses the "one" category for -1 without a resolver (sign-agnostic default)', () => {
      // options.one has no # placeholder, so this proves category selection
      // treated -1 as "one" (not "other") rather than proving the displayed number.
      expect(formatIcu('en', 'cart.items', cat, { count: -1 })).toBe(
        '1 item in your cart'
      );
    });

    it('falls back to 0 for "other" instead of leaking NaN when the count param is non-numeric', () => {
      expect(formatIcu('en', 'cart.items', cat, { count: 'not-a-number' })).toBe(
        '0 items in your cart'
      );
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

  describe('number, date, and time arguments', () => {
    const fmt = (lang: string, msg: string, params: Record<string, unknown> = {}) =>
      formatIcu(lang, 'm', { m: msg }, params);
    const day = new Date(2026, 0, 15, 14, 30);

    it('formats {n, number} with the active locale', () => {
      expect(fmt('en', 'Total: {n, number}', { n: 1234.5 })).toBe('Total: 1,234.5');
      expect(fmt('de', 'Total: {n, number}', { n: 1234.5 })).toBe('Total: 1.234,5');
    });

    it('supports the integer and percent number styles', () => {
      expect(fmt('en', '{n, number, integer}', { n: 1234.56 })).toBe('1,235');
      expect(fmt('en', '{n, number, percent}', { n: 0.25 })).toBe('25%');
    });

    it('supports a ::currency/XXX skeleton', () => {
      expect(fmt('en', '{p, number, ::currency/EUR}', { p: 9.5 })).toBe(
        new Intl.NumberFormat('en', { style: 'currency', currency: 'EUR' }).format(9.5)
      );
    });

    it('formats {d, date} and {d, time} with the default medium style', () => {
      expect(fmt('en', '{d, date}', { d: day })).toBe(
        new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(day)
      );
      expect(fmt('en', '{d, time}', { d: day })).toBe(
        new Intl.DateTimeFormat('en', { timeStyle: 'medium' }).format(day)
      );
    });

    it('supports short/medium/long/full date and time styles', () => {
      for (const style of ['short', 'medium', 'long', 'full'] as const) {
        expect(fmt('fr', `{d, date, ${style}}`, { d: day })).toBe(
          new Intl.DateTimeFormat('fr', { dateStyle: style }).format(day)
        );
        expect(fmt('fr', `{d, time, ${style}}`, { d: day })).toBe(
          new Intl.DateTimeFormat('fr', { timeStyle: style }).format(day)
        );
      }
    });

    it('accepts an epoch-millisecond timestamp for date arguments', () => {
      expect(fmt('en', '{d, date, long}', { d: day.getTime() })).toBe('January 15, 2026');
    });

    it('formats arguments nested inside plural and select branches', () => {
      const msg = '{count, plural, one {# order, {total, number, ::currency/USD}} other {# orders, {total, number, ::currency/USD}}}';
      expect(fmt('en', msg, { count: 1200, total: 5000 })).toBe('1,200 orders, $5,000.00');
    });

    it('leaves the placeholder intact when the param is missing, like {name}', () => {
      expect(fmt('en', 'Due {d, date, short}', {})).toBe('Due {d, date, short}');
    });

    it('renders the raw value instead of throwing for an invalid date or number', () => {
      expect(fmt('en', '{d, date}', { d: 'not-a-date' })).toBe('not-a-date');
      expect(fmt('en', '{n, number}', { n: 'abc' })).toBe('abc');
      expect(fmt('en', '[{n, number}]', { n: '' })).toBe('[]');
    });

    it('falls back to the raw value for a malformed currency code instead of throwing', () => {
      expect(fmt('en', '{p, number, ::currency/notacode}', { p: 5 })).toBe('5');
    });

    it('formats a well-formed but unassigned currency code the way Intl does', () => {
      expect(fmt('en', '{p, number, ::currency/XYZ}', { p: 5 })).toBe(
        new Intl.NumberFormat('en', { style: 'currency', currency: 'XYZ' }).format(5)
      );
    });

    it('falls back to the raw value for number, date and # when the language tag is invalid', () => {
      expect(fmt('xx-!!', '{n, number}|{d, date}|{c, plural, other {# x}}', { n: 1234, d: 0, c: 1234 })).toBe(
        '1234|0|1234 x'
      );
    });

    it('renders only Date objects and finite numbers as dates, anything else as String(value)', () => {
      expect(fmt('en', '{d, date}', { d: true })).toBe('true');
      expect(fmt('en', '{d, date}', { d: '2026-01-15' })).toBe('2026-01-15');
    });

    it('never re-scans an unformattable value as a placeholder', () => {
      expect(fmt('en', '{n, number}', { n: '{token}', token: 'SECRET' })).toBe('{token}');
      expect(fmt('en', '{d, date}', { d: '{token}', token: 'SECRET' })).toBe('{token}');
    });

    it('does not resolve Object.prototype members as argument or placeholder values', () => {
      expect(fmt('en', '{constructor, number}|{toString, date}|{toString}', {})).toBe(
        '{constructor, number}|{toString, date}|{toString}'
      );
    });

    it('renders negative zero as 0, in arguments and in #', () => {
      expect(fmt('en', '{n, number}|{c, plural, other {# x}}', { n: -0, c: -0 })).toBe('0|0 x');
    });

    it('accepts whitespace around the keyword and style, matching ExtractParams', () => {
      expect(fmt('en', '{n, number }|{d,\tdate , long}', { n: 1234, d: day })).toBe('1,234|January 15, 2026');
    });

    it('accepts dotted and hyphenated argument names, like {user.name}', () => {
      expect(fmt('en', "{user.age, number}|{item-count, plural, one {# item} other {# items}}|{u.g, select, f {she} other {they}}", { 'user.age': 1234, 'item-count': 2, 'u.g': 'f' })).toBe('1,234|2 items|she');
      expect(fmt('en', "{item-count, plural, other {'#'#}}", { 'item-count': 3 })).toBe('#3');
    });

    it('keeps formatting correctly when many distinct languages overflow the formatter cache', () => {
      for (let i = 0; i < 300; i++) fmt(`en-x-k${i}`, '{n, number}', { n: 1 });
      expect(fmt('de', '{n, number}', { n: 1234.5 })).toBe('1.234,5');
      expect(fmt('en', '{n, number}', { n: 1234.5 })).toBe('1,234.5');
    });

    it('accepts an underscore-separated language tag', () => {
      expect(fmt('de_DE', '{n, number}', { n: 1234.5 })).toBe('1.234,5');
    });
  });

  describe('locale-aware # in plural branches', () => {
    it('rounds a fractional # to three digits, like ICU and Intl.NumberFormat defaults', () => {
      expect(formatIcu('en', 'cart.items', cat, { count: 1.23456 })).toBe('1.235 items in your cart');
    });

    it('formats # with the active locale instead of a raw String(n)', () => {
      expect(formatIcu('en', 'cart.items', cat, { count: 1234 })).toBe('1,234 items in your cart');
      expect(formatIcu('de', 'cart.items', cat, { count: 1234 })).toBe('1.234 items in your cart');
    });
  });

  describe('ICU apostrophe quoting', () => {
    const fmt = (msg: string, params: Record<string, unknown> = {}) =>
      formatIcu('en', 'm', { m: msg }, params);

    it("turns '' into a single apostrophe", () => {
      expect(fmt("It''s {name}''s turn", { name: 'Ana' })).toBe("It's Ana's turn");
    });

    it('leaves a lone apostrophe that does not precede syntax as a literal', () => {
      expect(fmt("Don't panic, {name}", { name: 'Ana' })).toBe("Don't panic, Ana");
    });

    it("renders a quoted '{...}' as literal text instead of a placeholder", () => {
      expect(fmt("Use '{name}' as the token", { name: 'Ana' })).toBe('Use {name} as the token');
    });

    it("keeps a quoted '#' literal inside a plural branch", () => {
      expect(fmt("{n, plural, other {Ticket '#'# of 9}}", { n: 3 })).toBe('Ticket #3 of 9');
    });

    it('does not let quoted braces unbalance a plural block', () => {
      expect(fmt("{n, plural, one {one '}'} other {# '{'}}", { n: 2 })).toBe('2 {');
    });

    it("supports '' inside a quoted section", () => {
      expect(fmt("'{it''s}'")).toBe("{it's}");
    });

    it("keeps the quotes around a value written as ''{name}'' (the documented migration)", () => {
      expect(fmt("Delete ''{name}''?", { name: 'Ana' })).toBe("Delete 'Ana'?");
    });

    it("does not treat '# as a quote outside plural/selectordinal, where # is plain text", () => {
      expect(fmt("Issue '#42' closed")).toBe("Issue '#42' closed");
      expect(fmt("Tag '#fun and don't stop")).toBe("Tag '#fun and don't stop");
    });

    it("treats '# as a quote inside a select nested in a plural, where # is still the count", () => {
      expect(fmt("{n, plural, other {{g, select, other {'#'#}}}}", { n: 2, g: 'x' })).toBe('#2');
    });

    it('leaves private-use characters in catalog text alone', () => {
      expect(fmt('icon \uE000\uE001\uE002 here')).toBe('icon \uE000\uE001\uE002 here');
    });

    it('treats an unterminated quote as quoting to the end of the message', () => {
      expect(fmt("Literal '{name} forever", { name: 'Ana' })).toBe('Literal {name} forever');
    });
  });
});

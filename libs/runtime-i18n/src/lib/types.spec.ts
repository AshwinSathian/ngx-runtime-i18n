import type { ExtractParams } from './types';

// Compile-time assertions: ts-jest type-checks this file, so a wrong param
// shape fails the run as a TS diagnostic (and an unused @ts-expect-error too).
describe('ExtractParams', () => {
  it('types number/date/time arguments by their ICU keyword', () => {
    const ok: ExtractParams<'{n, number} on {d, date, short} at {d, time}'> = {
      n: 1,
      d: new Date(),
    };
    const epoch: ExtractParams<'{d, date}'> = { d: 0 };
    // @ts-expect-error a number argument rejects strings
    const badNumber: ExtractParams<'{p, number, ::currency/EUR}'> = { p: 'x' };
    // @ts-expect-error a date argument rejects strings
    const badDate: ExtractParams<'{d, date}'> = { d: '2026-01-01' };
    const spaced: ExtractParams<'{n, number } {d,\tdate , short}'> = { n: 1, d: 0 };
    expect([ok, epoch, badNumber, badDate, spaced]).toHaveLength(5);
  });

  it('keeps existing plural/select/plain typing', () => {
    const p: ExtractParams<'{count, plural, other {#}} {g, select, other {x}} {name}'> = {
      count: 1,
      g: 'f',
      name: 'Ana',
    };
    // @ts-expect-error plural counts must be numbers
    const bad: ExtractParams<'{count, plural, other {#}}'> = { count: 'one' };
    expect([p, bad]).toHaveLength(2);
  });
});

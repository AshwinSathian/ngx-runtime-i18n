let effectCallback: (() => void) | undefined;

jest.mock('@angular/core', () => {
  const actual = jest.requireActual('@angular/core');
  return {
    ...actual,
    effect: (fn: () => void) => {
      effectCallback = fn;
      fn();
      return () => undefined;
    },
  };
});

import { Signal, signal } from '@angular/core';
import { I18nService } from '@ngx-runtime-i18n/angular';
import {
  createMaterialRuntimeI18nEffect,
  ProvideMaterialRuntimeI18nOptions,
} from './provide-material-runtime-i18n';
import type { MaterialI18nLabels } from './material-i18n-labels';

class MockI18nService implements Partial<I18nService> {
  private readonly _lang = signal('en');
  readonly lang: Signal<string> = this._lang.asReadonly();

  switchLang(lang: string) {
    this._lang.set(lang);
  }
}

const createMockPaginatorIntl = () => ({
  itemsPerPageLabel: 'Items per page:',
  nextPageLabel: 'Next page',
  previousPageLabel: 'Previous page',
  firstPageLabel: 'First page',
  lastPageLabel: 'Last page',
  getRangeLabel: (page: number, pageSize: number, length: number) =>
    `${page * pageSize + 1} – ${Math.min((page + 1) * pageSize, length)} of ${length}`,
  changes: { next: jest.fn() },
});

const createMockSortIntl = () => ({
  sortButtonLabel: (_id: string) => `Sort by column`,
  changes: { next: jest.fn() },
});

const createMockStepperIntl = () => ({
  optionalLabel: 'Optional',
  completedLabel: 'Completed',
  editLabel: 'Edit',
  changes: { next: jest.fn() },
});

const flushMicrotasks = () =>
  new Promise<void>((resolve) => queueMicrotask(() => resolve()));

describe('createMaterialRuntimeI18nEffect', () => {
  const enLabels: MaterialI18nLabels = {
    paginator: { itemsPerPageLabel: 'Items per page:', nextPageLabel: 'Next' },
    sort: { sortButtonLabel: (_id: string) => `Sort` },
    stepper: { optionalLabel: 'Optional' },
  };
  const deLabels: MaterialI18nLabels = {
    paginator: { itemsPerPageLabel: 'Einträge pro Seite:', nextPageLabel: 'Weiter' },
    sort: { sortButtonLabel: (_id: string) => `Sortieren` },
    stepper: { optionalLabel: 'Optional (DE)' },
  };

  const labelMap: Record<string, MaterialI18nLabels> = { en: enLabels, de: deLabels };

  let resolveLabels: jest.Mock<MaterialI18nLabels, [string]>;
  let onApplied: jest.Mock<void, [string]>;
  let paginatorIntl: ReturnType<typeof createMockPaginatorIntl>;
  let sortIntl: ReturnType<typeof createMockSortIntl>;
  let stepperIntl: ReturnType<typeof createMockStepperIntl>;
  let i18n: MockI18nService;

  beforeEach(() => {
    resolveLabels = jest.fn((lang: string) => labelMap[lang] ?? {});
    onApplied = jest.fn();
    paginatorIntl = createMockPaginatorIntl();
    sortIntl = createMockSortIntl();
    stepperIntl = createMockStepperIntl();
    i18n = new MockI18nService();
    effectCallback = undefined;
  });

  afterEach(() => {
    jest.clearAllMocks();
    effectCallback = undefined;
  });

  it('calls resolveLabels with the current language on init', async () => {
    createMaterialRuntimeI18nEffect(
      i18n as unknown as I18nService,
      { resolveLabels, onApplied } as ProvideMaterialRuntimeI18nOptions,
      paginatorIntl,
      sortIntl,
      stepperIntl
    );
    await flushMicrotasks();
    expect(resolveLabels).toHaveBeenCalledWith('en');
  });

  it('applies paginator labels to the IntL service', async () => {
    createMaterialRuntimeI18nEffect(
      i18n as unknown as I18nService,
      { resolveLabels, onApplied } as ProvideMaterialRuntimeI18nOptions,
      paginatorIntl,
      sortIntl,
      stepperIntl
    );
    await flushMicrotasks();
    expect(paginatorIntl.itemsPerPageLabel).toBe('Items per page:');
    expect(paginatorIntl.nextPageLabel).toBe('Next');
    expect(paginatorIntl.changes.next).toHaveBeenCalled();
  });

  it('applies sort labels to the IntL service', async () => {
    createMaterialRuntimeI18nEffect(
      i18n as unknown as I18nService,
      { resolveLabels, onApplied } as ProvideMaterialRuntimeI18nOptions,
      paginatorIntl,
      sortIntl,
      stepperIntl
    );
    await flushMicrotasks();
    expect(sortIntl.sortButtonLabel('col')).toBe('Sort');
    expect(sortIntl.changes.next).toHaveBeenCalled();
  });

  it('applies stepper labels to the IntL service', async () => {
    createMaterialRuntimeI18nEffect(
      i18n as unknown as I18nService,
      { resolveLabels, onApplied } as ProvideMaterialRuntimeI18nOptions,
      paginatorIntl,
      sortIntl,
      stepperIntl
    );
    await flushMicrotasks();
    expect(stepperIntl.optionalLabel).toBe('Optional');
    expect(stepperIntl.changes.next).toHaveBeenCalled();
  });

  it('invokes the onApplied callback with the language', async () => {
    createMaterialRuntimeI18nEffect(
      i18n as unknown as I18nService,
      { resolveLabels, onApplied } as ProvideMaterialRuntimeI18nOptions,
      paginatorIntl,
      sortIntl,
      stepperIntl
    );
    await flushMicrotasks();
    expect(onApplied).toHaveBeenCalledWith('en');
  });

  it('reacts to language changes and applies new labels', async () => {
    createMaterialRuntimeI18nEffect(
      i18n as unknown as I18nService,
      { resolveLabels, onApplied } as ProvideMaterialRuntimeI18nOptions,
      paginatorIntl,
      sortIntl,
      stepperIntl
    );
    await flushMicrotasks();
    expect(paginatorIntl.itemsPerPageLabel).toBe('Items per page:');

    i18n.switchLang('de');
    effectCallback?.();
    await flushMicrotasks();

    expect(resolveLabels).toHaveBeenCalledWith('de');
    expect(paginatorIntl.itemsPerPageLabel).toBe('Einträge pro Seite:');
    expect(onApplied).toHaveBeenCalledWith('de');
  });

  it('caches labels and does not call resolveLabels twice for the same lang', async () => {
    createMaterialRuntimeI18nEffect(
      i18n as unknown as I18nService,
      { resolveLabels, onApplied } as ProvideMaterialRuntimeI18nOptions,
      paginatorIntl,
      sortIntl,
      stepperIntl
    );
    await flushMicrotasks();
    expect(resolveLabels).toHaveBeenCalledTimes(1);

    // Switch to another lang and back
    i18n.switchLang('de');
    effectCallback?.();
    await flushMicrotasks();

    i18n.switchLang('en');
    effectCallback?.();
    await flushMicrotasks();

    // resolveLabels should only have been called twice (once per unique lang)
    expect(resolveLabels).toHaveBeenCalledTimes(2);
  });

  it('works without any IntL services (no errors)', async () => {
    expect(() => {
      createMaterialRuntimeI18nEffect(
        i18n as unknown as I18nService,
        { resolveLabels, onApplied } as ProvideMaterialRuntimeI18nOptions
        // No IntL services provided
      );
    }).not.toThrow();
    await flushMicrotasks();
    expect(onApplied).toHaveBeenCalledWith('en');
  });
});

import { applyMaterialLabels } from './provide-material-runtime-i18n';
import type { MaterialI18nLabels } from './material-i18n-labels';

const createMockPaginatorIntl = () => ({
  itemsPerPageLabel: 'Items per page:',
  nextPageLabel: 'Next page',
  previousPageLabel: 'Previous page',
  firstPageLabel: 'First page',
  lastPageLabel: 'Last page',
  getRangeLabel: jest.fn(),
  changes: { next: jest.fn() },
});

const createMockSortIntl = () => ({
  sortButtonLabel: jest.fn((_id: string) => 'Sort'),
  changes: { next: jest.fn() },
});

const createMockStepperIntl = () => ({
  optionalLabel: 'Optional',
  completedLabel: 'Completed',
  editLabel: 'Edit',
  changes: { next: jest.fn() },
});

describe('applyMaterialLabels', () => {
  const enLabels: MaterialI18nLabels = {
    paginator: { itemsPerPageLabel: 'Items per page:', nextPageLabel: 'Next' },
    sort: { sortButtonLabel: (_id: string) => 'Sort' },
    stepper: { optionalLabel: 'Optional' },
  };
  const deLabels: MaterialI18nLabels = {
    paginator: { itemsPerPageLabel: 'Einträge pro Seite:', nextPageLabel: 'Weiter' },
    sort: { sortButtonLabel: (_id: string) => 'Sortieren' },
    stepper: { optionalLabel: 'Optional (DE)' },
  };

  let paginatorIntl: ReturnType<typeof createMockPaginatorIntl>;
  let sortIntl: ReturnType<typeof createMockSortIntl>;
  let stepperIntl: ReturnType<typeof createMockStepperIntl>;
  let onApplied: jest.Mock<void, [string]>;

  beforeEach(() => {
    paginatorIntl = createMockPaginatorIntl();
    sortIntl = createMockSortIntl();
    stepperIntl = createMockStepperIntl();
    onApplied = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('applies paginator labels and notifies changes', () => {
    applyMaterialLabels(enLabels, 'en', paginatorIntl as never, null, null, onApplied);
    expect(paginatorIntl.itemsPerPageLabel).toBe('Items per page:');
    expect(paginatorIntl.nextPageLabel).toBe('Next');
    expect(paginatorIntl.changes.next).toHaveBeenCalled();
  });

  it('applies sort labels and notifies changes', () => {
    applyMaterialLabels(enLabels, 'en', null, sortIntl as never, null, onApplied);
    expect(sortIntl.sortButtonLabel('col')).toBe('Sort');
    expect(sortIntl.changes.next).toHaveBeenCalled();
  });

  it('applies stepper labels and notifies changes', () => {
    applyMaterialLabels(enLabels, 'en', null, null, stepperIntl as never, onApplied);
    expect(stepperIntl.optionalLabel).toBe('Optional');
    expect(stepperIntl.changes.next).toHaveBeenCalled();
  });

  it('invokes the onApplied callback with the language', () => {
    applyMaterialLabels(enLabels, 'en', paginatorIntl as never, sortIntl as never, stepperIntl as never, onApplied);
    expect(onApplied).toHaveBeenCalledWith('en');
  });

  it('applies de labels correctly', () => {
    applyMaterialLabels(deLabels, 'de', paginatorIntl as never, sortIntl as never, stepperIntl as never, onApplied);
    expect(paginatorIntl.itemsPerPageLabel).toBe('Einträge pro Seite:');
    expect(stepperIntl.optionalLabel).toBe('Optional (DE)');
    expect(onApplied).toHaveBeenCalledWith('de');
  });

  it('is a no-op when all intl services are null', () => {
    expect(() => applyMaterialLabels(enLabels, 'en', null, null, null, onApplied)).not.toThrow();
    expect(onApplied).toHaveBeenCalledWith('en');
  });

  it('skips paginator when labels have no paginator section', () => {
    const minimalLabels: MaterialI18nLabels = {};
    applyMaterialLabels(minimalLabels, 'en', paginatorIntl as never, null, null, onApplied);
    expect(paginatorIntl.changes.next).not.toHaveBeenCalled();
  });

  it('applies labels from all sections at once', () => {
    applyMaterialLabels(
      enLabels, 'en',
      paginatorIntl as never,
      sortIntl as never,
      stepperIntl as never,
      onApplied,
    );
    expect(paginatorIntl.changes.next).toHaveBeenCalled();
    expect(sortIntl.changes.next).toHaveBeenCalled();
    expect(stepperIntl.changes.next).toHaveBeenCalled();
    expect(onApplied).toHaveBeenCalledTimes(1);
  });
});

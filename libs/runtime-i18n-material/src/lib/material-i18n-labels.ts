/**
 * Angular Material component labels for runtime i18n.
 * All fields are optional — only provide what your app uses.
 * @publicApi
 */
export interface MaterialI18nLabels {
  paginator?: Partial<{
    itemsPerPageLabel: string;
    nextPageLabel: string;
    previousPageLabel: string;
    firstPageLabel: string;
    lastPageLabel: string;
    getRangeLabel: (page: number, pageSize: number, length: number) => string;
  }>;
  sort?: Partial<{
    sortButtonLabel: (id: string) => string;
  }>;
  stepper?: Partial<{
    optionalLabel: string;
    completedLabel: string;
    editLabel: string;
  }>;
  datepicker?: Partial<{
    openCalendarLabel: string;
    prevMonthLabel: string;
    nextMonthLabel: string;
    prevYearLabel: string;
    nextYearLabel: string;
    switchToMonthViewLabel: string;
    switchToMultiYearViewLabel: string;
  }>;
}

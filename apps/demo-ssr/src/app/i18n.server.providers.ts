import { EnvironmentProviders } from '@angular/core';
import {
  provideRuntimeI18nSsr,
  RuntimeI18nSsrSnapshot,
} from '@ngx-runtime-i18n/angular';

export type I18nSnapshot = RuntimeI18nSsrSnapshot;

export function i18nServerProviders(
  snapshot: I18nSnapshot
): EnvironmentProviders {
  return provideRuntimeI18nSsr(snapshot);
}

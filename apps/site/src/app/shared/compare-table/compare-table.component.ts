import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface CompareRow {
  readonly feature: string;
  readonly ngxRuntimeI18n: string;
  readonly ngxTranslate: string;
  readonly transloco: string;
  readonly angularBuiltin: string;
}

@Component({
  selector: 'app-compare-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <caption class="sr-only">
          Feature comparison across Angular i18n libraries
        </caption>
        <thead>
          <tr class="border-b border-rule text-left">
            <th scope="col" class="py-2 pr-4">Feature</th>
            <th scope="col" class="py-2 pr-4">ngx-runtime-i18n</th>
            <th scope="col" class="py-2 pr-4">ngx-translate</th>
            <th scope="col" class="py-2 pr-4">transloco</th>
            <th scope="col" class="py-2 pr-4">Angular built-in</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.feature) {
            <tr class="border-b border-rule">
              <th scope="row" class="py-3 pr-4 text-left font-medium">
                {{ row.feature }}
              </th>
              <td class="py-3 pr-4">{{ row.ngxRuntimeI18n }}</td>
              <td class="py-3 pr-4">{{ row.ngxTranslate }}</td>
              <td class="py-3 pr-4">{{ row.transloco }}</td>
              <td class="py-3 pr-4">{{ row.angularBuiltin }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class CompareTableComponent {
  readonly rows = input.required<readonly CompareRow[]>();
}

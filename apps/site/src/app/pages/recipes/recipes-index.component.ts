import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/content.service';
import { SeoService } from '../../core/seo.service';
import type { RecipeEntry } from '../../core/content.types';

@Component({
  selector: 'app-recipes-index',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <h1 class="font-display text-3xl font-semibold">Recipes</h1>
      <p class="mt-2 max-w-2xl text-ink/70">
        Worked examples for wiring ngx-runtime-i18n into a real application.
      </p>
      <ul class="mt-10 grid gap-4 sm:grid-cols-2">
        @for (recipe of recipes; track recipe.slug) {
          <li>
            <a
              [routerLink]="'/recipes/' + recipe.slug"
              class="block rounded-lg border border-rule p-5 hover:border-accent-en"
            >
              <p class="font-semibold text-ink">
                {{ recipe.frontmatter.title }}
              </p>
              <p class="mt-2 text-sm text-ink/70">
                {{ recipe.frontmatter.description }}
              </p>
            </a>
          </li>
        }
      </ul>
    </div>
  `,
})
export class RecipesIndexComponent implements OnInit {
  private readonly content = inject(ContentService);
  private readonly seo = inject(SeoService);
  protected readonly recipes: RecipeEntry[] = this.content.getAllRecipes();

  ngOnInit(): void {
    this.seo.setPageMeta({
      title: 'Recipes',
      description:
        'Worked examples for wiring ngx-runtime-i18n into a real application, covering SSR, route-scoped catalogs, and CI catalog validation.',
    });
  }
}

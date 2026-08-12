export interface Heading {
  depth: number;
  text: string;
  id: string;
}
export interface DocFrontmatter {
  title: string;
  description: string;
  eyebrow: string;
  order: number;
  section: string;
}
export interface RecipeFrontmatter {
  title: string;
  description: string;
  eyebrow: string;
  order: number;
  packages: string[];
}
export interface DocEntry {
  kind: 'doc';
  slug: string[];
  frontmatter: DocFrontmatter;
  html: string;
  headings: Heading[];
}
export interface RecipeEntry {
  kind: 'recipe';
  slug: string;
  frontmatter: RecipeFrontmatter;
  html: string;
  headings: Heading[];
}
export interface NavSection {
  section: string;
  items: { href: string; title: string; eyebrow: string }[];
}

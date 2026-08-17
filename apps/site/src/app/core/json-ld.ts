// Small, framework-agnostic schema.org JSON-LD object builders. Every function here
// returns a plain object ready for `StructuredDataService.set(id, ...)` — no Angular
// dependencies, so these are trivially unit-testable and reusable from the OG image
// script's route metadata if ever needed.

const SCHEMA_CONTEXT = 'https://schema.org';
export const SITE_URL = 'https://i18n.ashwinsathian.com';
const AUTHOR_NAME = 'Ashwin Sathian';
const AUTHOR_URL = 'https://github.com/AshwinSathian';

export interface SoftwareApplicationInput {
  readonly name: string;
  readonly description: string;
  readonly url: string;
}

export function softwareApplicationJsonLd({
  name,
  description,
  url,
}: SoftwareApplicationInput): Record<string, unknown> {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'SoftwareApplication',
    name,
    description,
    url,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: personJsonLd(),
  };
}

export interface BreadcrumbItem {
  readonly name: string;
  readonly url: string;
}

export function breadcrumbJsonLd(
  items: readonly BreadcrumbItem[],
): Record<string, unknown> {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// Structural type, deliberately not imported from `faq.component.ts` — importing the
// `Faq` interface from there would create a core -> pages -> core import cycle. Any
// object shaped like this (the FAQ page's own `FAQS` array included) satisfies it.
export interface FaqLikeItem {
  readonly question: string;
  readonly answer: string;
}

export function faqPageJsonLd(
  faqs: readonly FaqLikeItem[],
): Record<string, unknown> {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export interface ArticleInput {
  readonly title: string;
  readonly description: string;
  readonly url: string;
}

export function articleJsonLd({
  title,
  description,
  url,
}: ArticleInput): Record<string, unknown> {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Article',
    headline: title,
    description,
    url,
    author: personJsonLd(),
  };
}

export function personJsonLd(): Record<string, unknown> {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Person',
    name: AUTHOR_NAME,
    url: AUTHOR_URL,
  };
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'WebSite',
    name: 'ngx-runtime-i18n',
    url: SITE_URL,
  };
}

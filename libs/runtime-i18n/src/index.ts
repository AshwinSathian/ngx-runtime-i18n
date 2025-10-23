/**
 * @packageDocumentation
 * Core runtime i18n primitives.
 * Keep this surface minimal and stable.
 */

export type { Catalog, RuntimeI18nConfig } from './lib/types';

/**
 * Lightweight ICU-style formatter used internally by the Angular service.
 * Exposed as @experimental for advanced users or custom integrations.
 * @experimental
 */
export { formatIcu } from './lib/icu';

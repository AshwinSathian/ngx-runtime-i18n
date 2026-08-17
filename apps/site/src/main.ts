import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { registerContentElements } from './app/content-elements/register-content-elements';

bootstrapApplication(App, appConfig)
  .then((appRef) =>
    // Defining the content-element custom elements upgrades any matching
    // nodes already present in the DOM synchronously, mutating them
    // (inserting tablists, copy buttons, etc.) via connectedCallback().
    // If that happens before Angular's hydration reconciliation finishes,
    // it mutates the server-rendered DOM out from under hydration and
    // throws (e.g. "e.hasAttribute is not a function"). appRef.whenStable()
    // resolves once the initial hydration/render cycle has stabilized, so
    // registering here guarantees the upgrade happens after hydration.
    appRef.whenStable().then(() => registerContentElements()),
  )
  .catch((err) => console.error(err));

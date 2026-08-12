import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { registerContentElements } from './app/content-elements/register-content-elements';

registerContentElements();

bootstrapApplication(App, appConfig).catch((err) => console.error(err));

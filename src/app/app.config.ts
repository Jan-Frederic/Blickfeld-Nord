import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import { provideRouter, TitleStrategy, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { PageTitleStrategy } from './page-meta';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay, withIncrementalHydration } from '@angular/platform-browser';

registerLocaleData(localeDe);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
      withComponentInputBinding(),
    ),
    { provide: LOCALE_ID, useValue: 'de' },
    { provide: TitleStrategy, useClass: PageTitleStrategy },
    provideClientHydration(withEventReplay(), withIncrementalHydration()),
  ],
};

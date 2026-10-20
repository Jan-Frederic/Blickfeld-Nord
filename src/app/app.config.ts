import { ApplicationConfig, LOCALE_ID, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import localeEnGb from '@angular/common/locales/en-GB';
import localeNl from '@angular/common/locales/nl';
import { Router, provideRouter, TitleStrategy, withComponentInputBinding, withInMemoryScrolling, withNavigationErrorHandler } from '@angular/router';
import { PageTitleStrategy } from './page-meta';
import { reloadOnMissingChunk } from './pwa';
import { I18n } from './i18n';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay, withIncrementalHydration } from '@angular/platform-browser';

registerLocaleData(localeDe);
// Datums- und Zahlenformate der englischen und niederländischen Seiten
registerLocaleData(localeEnGb);
registerLocaleData(localeNl);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
      withComponentInputBinding(),
      // nach einem Deploy fehlen alte Programmdateien – dann die Zielseite frisch laden statt still hängen zu bleiben
      withNavigationErrorHandler((e) => reloadOnMissingChunk(e.error, e.url)),
    ),
    { provide: LOCALE_ID, useValue: 'de' },
    { provide: TitleStrategy, useClass: PageTitleStrategy },
    provideClientHydration(withEventReplay(), withIncrementalHydration()),
    // Sprache aus der Adresse – muss vor der ersten Navigation zuhören
    provideAppInitializer(() => inject(I18n).listen(inject(Router))),
  ],
};

import { Routes } from '@angular/router';
import { Home } from './pages/home';
import { Lang, tr } from './i18n';
import { loadUebersetzungen } from './content';

// Titel und Beschreibung je Sprache (Suchmaschinen und Link-Vorschau); PageTitleStrategy wählt die passende Fassung
const meta = (title: Record<Lang, string>, description?: Record<Lang, string>, robots?: string) => ({ title, description, robots });

// Öffentliche Seiten – gibt es auf Deutsch (ohne Präfix), Englisch (/en) und Niederländisch (/nl).
// Als Funktion, damit jede Sprache eigene Routen-Objekte bekommt.
const publicPages = (): Routes => [
  { path: '', component: Home, data: meta(tr('Blickfeld Nord – Offizielle Bandpage', 'Blickfeld Nord – Official band website', 'Blickfeld Nord – Officiële bandwebsite')) },
  {
    path: 'wunsch',
    loadComponent: () => import('./pages/wunsch').then((m) => m.WunschPage),
    data: meta(
      tr('Songwunsch – Blickfeld Nord', 'Song request – Blickfeld Nord', 'Verzoeknummer – Blickfeld Nord'),
      tr(
        'Live-Wunschbox: Sucht euch einen Song von Blickfeld Nord aus und schickt uns euren Wunsch.',
        'Live request box: pick a song by Blickfeld Nord and send us your request.',
        'Live-verzoekbox: kies een nummer van Blickfeld Nord en stuur ons je verzoek.',
      ),
      'noindex',
    ),
  },
  { path: 'konzerte/:id', loadComponent: () => import('./pages/konzert').then((m) => m.KonzertPage) },
  { path: 'band/:slug', loadComponent: () => import('./pages/member').then((m) => m.MemberPage) },
  {
    path: 'booking',
    loadComponent: () => import('./pages/booking').then((m) => m.BookingPage),
    data: meta(
      tr('Booking – Blickfeld Nord', 'Booking – Blickfeld Nord', 'Boeken – Blickfeld Nord'),
      tr(
        'Blickfeld Nord buchen: Partyband für Feste, private Feiern und Kneipen – Verfügbarkeit, Technik, Spielzeit, häufige Fragen und Kontakt.',
        'Book Blickfeld Nord: three-piece party and cover band from Hamminkeln near the Dutch border – festivals, private parties and pubs, own PA and lights.',
        'Boek Blickfeld Nord: driekoppige party- en coverband uit Hamminkeln, vlak bij de Nederlandse grens – feesten, privéfeesten en cafés, met eigen geluid en licht.',
      ),
    ),
  },
  {
    path: 'repertoire',
    loadComponent: () => import('./pages/repertoire').then((m) => m.RepertoirePage),
    data: meta(
      tr('Repertoire – Blickfeld Nord', 'Repertoire – Blickfeld Nord', 'Repertoire – Blickfeld Nord'),
      tr(
        'Das Repertoire von Blickfeld Nord: durchsuchbare Songliste aus Pop, Rock, Schlager, Dance und Disco – live ausgeschmückt mit Fill-Ins, Jam-Sessions und spontanen Ideen.',
        'The repertoire of Blickfeld Nord: searchable song list of pop, rock, German Schlager, dance and disco – played live with fills, jam sessions and spontaneous ideas.',
        'Het repertoire van Blickfeld Nord: doorzoekbare songlijst met pop, rock, schlagers, dance en disco – live aangekleed met fills, jamsessies en spontane ideeën.',
      ),
    ),
  },
  {
    path: 'galerie',
    loadComponent: () => import('./pages/galerie').then((m) => m.GaleriePage),
    data: meta(
      tr('Galerie – Blickfeld Nord', 'Gallery – Blickfeld Nord', 'Galerij – Blickfeld Nord'),
      tr(
        'Fotos von Blickfeld Nord: Live-Momente von unseren Auftritten und Porträts der Band.',
        'Photos of Blickfeld Nord: live moments from our shows and portraits of the band.',
        "Foto's van Blickfeld Nord: livemomenten van onze optredens en portretten van de band.",
      ),
    ),
  },
  {
    path: 'historie',
    loadComponent: () => import('./pages/historie').then((m) => m.Historie),
    data: meta(
      tr('Historie – Blickfeld Nord', 'History – Blickfeld Nord', 'Geschiedenis – Blickfeld Nord'),
      tr(
        'Unsere Geschichte in Momenten: Auftritte, Orte und Begegnungen von Blickfeld Nord – mit Fotos und Videos.',
        'Our story in moments: shows, places and encounters of Blickfeld Nord – with photos and videos.',
        "Ons verhaal in momenten: optredens, plekken en ontmoetingen van Blickfeld Nord – met foto's en video's.",
      ),
    ),
  },
  {
    path: 'presse',
    loadComponent: () => import('./pages/presse').then((m) => m.Presse),
    data: meta(
      tr('Pressekit – Blickfeld Nord', 'Press kit – Blickfeld Nord', 'Perskit – Blickfeld Nord'),
      tr(
        'Pressetext, Logos und Fotos von Blickfeld Nord zum Download – für Veranstalter, Presse und Plakate.',
        'Press text, logos and photos of Blickfeld Nord to download – for organisers, press and posters.',
        "Perstekst, logo's en foto's van Blickfeld Nord om te downloaden – voor organisatoren, pers en affiches.",
      ),
    ),
  },
  {
    path: 'technik',
    loadComponent: () => import('./pages/technik').then((m) => m.Technik),
    data: meta(
      tr('Technik – Blickfeld Nord', 'Technical info – Blickfeld Nord', 'Techniek – Blickfeld Nord'),
      tr(
        'Technik von Blickfeld Nord für Veranstalter: eigene PA und Licht, Platz- und Strombedarf, Zeitplan für Auf- und Abbau sowie der Technik-Rider als PDF.',
        'Technical info from Blickfeld Nord for organisers: own PA and lights, space and power requirements, set-up and tear-down times and the tech rider as a PDF.',
        'Techniek van Blickfeld Nord voor organisatoren: eigen geluid en licht, benodigde ruimte en stroom, op- en afbouwtijden en de techniek-rider als pdf.',
      ),
    ),
  },
  {
    path: 'freunde',
    loadComponent: () => import('./pages/freunde').then((m) => m.Freunde),
    data: meta(
      tr('Freunde & Partner – Blickfeld Nord', 'Friends & partners – Blickfeld Nord', 'Vrienden & partners – Blickfeld Nord'),
      tr(
        'Befreundete Bands, Locations und Vereine von Blickfeld Nord – vom Café Lotti bis zur Drum School.',
        'Friendly bands, venues and clubs of Blickfeld Nord – from Café Lotti to the drum school.',
        'Bevriende bands, locaties en verenigingen van Blickfeld Nord – van Café Lotti tot de drumschool.',
      ),
    ),
  },
  {
    path: 'impressum',
    loadComponent: () => import('./pages/impressum').then((m) => m.Impressum),
    data: meta(
      tr('Impressum – Blickfeld Nord', 'Legal notice – Blickfeld Nord', 'Colofon – Blickfeld Nord'),
      tr('Impressum der Band Blickfeld Nord.', 'Legal notice (Impressum) of the band Blickfeld Nord.', 'Colofon (Impressum) van de band Blickfeld Nord.'),
    ),
  },
  {
    path: 'datenschutz',
    loadComponent: () => import('./pages/datenschutz').then((m) => m.Datenschutz),
    data: meta(
      tr('Datenschutzerklärung – Blickfeld Nord', 'Privacy policy – Blickfeld Nord', 'Privacyverklaring – Blickfeld Nord'),
      tr('Datenschutzerklärung der Website von Blickfeld Nord.', 'Privacy policy of the Blickfeld Nord website.', 'Privacyverklaring van de website van Blickfeld Nord.'),
    ),
  },
];

const notFound = () => ({
  loadComponent: () => import('./pages/not-found').then((m) => m.NotFound),
  data: meta(tr('Seite nicht gefunden – Blickfeld Nord', 'Page not found – Blickfeld Nord', 'Pagina niet gevonden – Blickfeld Nord'), undefined, 'noindex'),
});

// Startseite direkt im Hauptpaket, alle Unterseiten werden erst beim Aufruf geladen (kleineres Start-JavaScript)
export const routes: Routes = [
  ...publicPages(),
  { path: 'en', canMatch: [loadUebersetzungen], children: [...publicPages(), { path: '404', ...notFound() }, { path: '**', ...notFound() }] },
  { path: 'nl', canMatch: [loadUebersetzungen], children: [...publicPages(), { path: '404', ...notFound() }, { path: '**', ...notFound() }] },
  // frühere Adressen der fremdsprachigen Booking-Seiten
  { path: 'booking/en', redirectTo: '/en/booking' },
  { path: 'booking/nl', redirectTo: '/nl/booking' },
  // Backstage: nur für die Band, nur auf Deutsch
  // Backstage-Bereiche (vor backstage/:id, damit sie nicht als Auftritt gelten)
  { path: 'backstage/termine', loadComponent: () => import('./pages/backstage-termine').then((m) => m.BackstageTermine), title: 'Termine – Backstage – Blickfeld Nord', data: { robots: 'noindex, nofollow' } },
  { path: 'backstage/zahlen', loadComponent: () => import('./pages/backstage-zahlen').then((m) => m.BackstageZahlen), title: 'Zahlen – Backstage – Blickfeld Nord', data: { robots: 'noindex, nofollow' } },
  { path: 'backstage/material', loadComponent: () => import('./pages/backstage-material').then((m) => m.BackstageMaterial), title: 'Material – Backstage – Blickfeld Nord', data: { robots: 'noindex, nofollow' } },
  { path: 'backstage/aufgaben', loadComponent: () => import('./pages/backstage-aufgaben').then((m) => m.BackstageAufgaben), title: 'Aufgaben – Backstage – Blickfeld Nord', data: { robots: 'noindex, nofollow' } },
  { path: 'backstage/abgleich', loadComponent: () => import('./pages/backstage-abgleich').then((m) => m.BackstageAbgleich), title: 'Abgleich – Backstage – Blickfeld Nord', data: { robots: 'noindex, nofollow' } },
  { path: 'backstage/uebersetzungen', loadComponent: () => import('./pages/uebersetzungen-pruefen').then((m) => m.UebersetzungenPruefen), title: 'Übersetzungen prüfen – Backstage – Blickfeld Nord', data: { robots: 'noindex, nofollow' } },
  { path: 'backstage/:id/:teil', loadComponent: () => import('./pages/backstage-tool').then((m) => m.BackstageTool), title: 'Auftritt – Backstage – Blickfeld Nord', data: { robots: 'noindex, nofollow' } },
  { path: 'backstage/:id', loadComponent: () => import('./pages/backstage-show').then((m) => m.BackstageShow), title: 'Auftritt – Backstage – Blickfeld Nord', data: { robots: 'noindex, nofollow' } },
  { path: 'backstage', loadComponent: () => import('./pages/backstage').then((m) => m.Backstage), title: 'Backstage – Blickfeld Nord', data: { robots: 'noindex, nofollow' } },
  // Fehlerseite: /404 wird vorgerendert und beim Deploy als 404.html genutzt
  { path: '404', ...notFound() },
  { path: '**', ...notFound() },
];

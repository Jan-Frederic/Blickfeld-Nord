import type { Show } from './band.service';

// Danke-Nachricht an den Veranstalter nach einem Auftritt (Backstage): fertiger Text zum Kopieren – mit Link zur
// Konzertseite (nur bei öffentlichen Auftritten), Bitte um Fotos und um eine Empfehlung.
const de = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

export function dankeText(s: Show, id: string, mitRueckblick: boolean): string {
  const ort = s.private ? (s.publicName ?? 'eurer Feier') : `${s.venue}${s.city ? ' in ' + s.city : ''}`;
  const link = s.private ? 'https://blickfeld-nord.de' : `https://blickfeld-nord.de/konzerte/${id}/`;
  return [
    'Hallo,',
    '',
    `vielen Dank für den schönen Abend am ${de(s.date)} bei ${ort}! Es hat uns riesig Spaß gemacht – danke für die Gastfreundschaft und das tolle Publikum.`,
    '',
    mitRueckblick && !s.private ? `Unseren Rückblick auf den Abend findet ihr hier: ${link}` : `Mehr über uns und kommende Termine: ${link}`,
    '',
    'Habt ihr Fotos oder Videos vom Abend? Wir würden uns freuen, wenn ihr sie uns schickt – gern auch mit dem Namen, unter dem wir sie zeigen dürfen.',
    'Und wenn es euch gefallen hat: Über eine Empfehlung an andere Veranstalter freuen wir uns sehr.',
    '',
    'Viele Grüße',
    'Blickfeld Nord – David, Matthias & Fred',
  ].join('\n');
}

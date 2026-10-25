// Werbeplan für öffentliche, geklärte Auftritte: feste Schritte, rückwärts vom Auftrittstag gerechnet – dazu die
// Nachbereitung in den Tagen danach (bei mehrtägigen Auftritten ab dem letzten Tag).
// Angezeigt auf der Backstage-Seite des Auftritts (werbeplan.ts in pages) und als Aufgabe (backstage-aufgaben.ts).
// Plakat, Story und Instagram-Text gibt es auf der Seite des Auftritts – mit Herkunft und Kampagne im Link.
// Erledigte Schritte merkt sich das Gerät (bn-werbeplan-<ID>, mit „Abgleich“ teilbar).
import { Show } from './band.service';
import { postText } from './poster';

export interface WerbeSchritt {
  id: string;
  /** Tage vor dem Auftritt (negativ: Tage nach dem Auftritt) */
  vorher: number;
  titel: string;
  text: string;
}

export const WERBEPLAN: readonly WerbeSchritt[] = [
  { id: 'plakat', vorher: 28, titel: 'Plakat aushängen und posten', text: 'Plakat beim Veranstalter und im Ort aushängen, Plakat-Bild mit dem Instagram-Text posten' },
  { id: 'story-1', vorher: 14, titel: 'Erste Story bzw. Status', text: 'Story mit QR-Code posten, Veranstalter bitten, Plakat oder Story zu teilen' },
  { id: 'woche', vorher: 7, titel: 'Eine Woche vorher', text: 'Story erneut posten und das Plakat noch einmal teilen' },
  { id: 'morgen', vorher: 1, titel: 'Am Tag davor', text: 'Story „Morgen spielen wir …“ mit Uhrzeit und Ort' },
  { id: 'heute', vorher: 0, titel: 'Am Auftrittstag', text: 'Story „Heute …“ – danach Fotos für den Rückblick sammeln' },
  { id: 'danke', vorher: -1, titel: 'Danke sagen', text: 'Danke-Story posten und dem Veranstalter danken (Danke-Nachricht oben auf dieser Seite)' },
  { id: 'fotos', vorher: -3, titel: 'Fotos einsammeln', text: 'Band, Freunde und Gäste nach Fotos fragen – hochladen über die Konzertseite' },
  { id: 'rueckblick', vorher: -7, titel: 'Rückblick schreiben', text: 'Rückblick mit Fotos über das Formular auf dieser Seite schreiben, danach den Link teilen' },
];

/** so viele Tage nach dem letzten Schritt bleibt der Plan noch sichtbar bzw. fällig */
const NACHLAUF = 7;

export type WerbeStatus = 'vorbei' | 'jetzt' | 'kommt';

/** Datum (JJJJ-MM-TT) n Tage vor dem Auftritt */
function minus(datum: string, tage: number): string {
  const d = new Date(`${datum}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - tage);
  return d.toISOString().slice(0, 10);
}

/** Plan läuft noch: vom ersten Schritt bis eine Woche nach dem letzten (Rückblick) */
export function werbeplanAktiv(auftritt: string, heute: string, ende = auftritt): boolean {
  return heute <= minus(ende, WERBEPLAN[WERBEPLAN.length - 1].vorher - NACHLAUF);
}

/** Schritte mit Datum und Status zum Stichtag: „jetzt“ ist der jüngste fällige Schritt, frühere sind „vorbei“.
 *  `ende`: letzter Tag bei mehrtägigen Auftritten – die Nachbereitung zählt ab dort. */
export function werbeplan(auftritt: string, heute: string, ende = auftritt): { schritt: WerbeSchritt; datum: string; status: WerbeStatus }[] {
  const mitDatum = WERBEPLAN.map((schritt) => ({ schritt, datum: minus(schritt.vorher < 0 ? ende : auftritt, schritt.vorher) }));
  const aktuell = werbeplanAktiv(auftritt, heute, ende) ? mitDatum.filter((x) => x.datum <= heute).length - 1 : -1;
  return mitDatum.map((x, i) => ({ ...x, status: i === aktuell ? 'jetzt' : x.datum <= heute ? 'vorbei' : 'kommt' }));
}

/** fälliger Schritt zum Stichtag (oder undefined vor Beginn bzw. nach der Nachbereitung) */
export function faelligerSchritt(auftritt: string, heute: string, ende = auftritt) {
  return werbeplan(auftritt, heute, ende).find((x) => x.status === 'jetzt');
}

// ---- Abhaken ---------------------------------------------------------------------------------------------------

export const WERBEPLAN_PREFIX = 'bn-werbeplan-';

/** abgehakte Schritte eines Auftritts (IDs aus WERBEPLAN) */
export function erledigteSchritte(showId: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(WERBEPLAN_PREFIX + showId) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Schritt ab- bzw. anhaken; gibt die neue Liste zurück */
export function setzeSchritt(showId: string, schritt: string, erledigt: boolean): string[] {
  const alt = erledigteSchritte(showId).filter((x) => x !== schritt);
  const neu = erledigt ? [...alt, schritt] : alt;
  try {
    if (neu.length) localStorage.setItem(WERBEPLAN_PREFIX + showId, JSON.stringify(neu));
    else localStorage.removeItem(WERBEPLAN_PREFIX + showId);
  } catch {
    // ohne Speicher bleibt der Haken nur bis zum Neuladen
  }
  return neu;
}

// ---- Texte je Schritt --------------------------------------------------------------------------------------------

const TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const wann = (d: string) => `${TAGE[new Date(`${d}T12:00:00`).getDay()]}, ${d.split('-').reverse().join('.')}`;

/** fertiger Text für Story, Status oder Beitrag zum jeweiligen Schritt – `link` mit Herkunft und Kampagne */
export function schrittText(schritt: string, s: Show, link: string): string {
  if (schritt === 'plakat') return postText(s, link);
  const ort = `📍 ${s.venue}${s.city ? `, ${s.city}` : ''}`;
  const zeit = s.time ? ` · ab ${s.time} Uhr` : '';
  const eintritt = s.price === 0 ? ['🎟️ Eintritt frei'] : s.price ? [`🎟️ Eintritt ${s.price} €`] : [];
  const kopf: Record<string, string[]> = {
    'story-1': ['🎶 In zwei Wochen sind wir live! 🎶', '', `📅 ${wann(s.date)}${zeit}`, ort, ...eintritt],
    woche: ['🎸 Nächste Woche ist es so weit!', '', `📅 ${wann(s.date)}${zeit}`, ort, ...eintritt, '', 'Sagt es weiter und bringt eure Leute mit!'],
    morgen: ['🎶 Morgen spielen wir!', '', `${ort}${zeit}`, ...eintritt, '', 'Kommt vorbei, singt mit – wir freuen uns auf euch! 🍻'],
    heute: ['🎉 Heute Abend live!', '', `${ort}${zeit}`, ...eintritt, '', 'Bis gleich! 🍻'],
    danke: [`❤️ Danke, ${s.city || s.venue}!`, '', `Was für ein Abend bei ${s.venue} – danke an alle, die mitgefeiert und mitgesungen haben!`, '', '📸 Ihr habt Fotos gemacht? Schickt sie uns gern über die Konzertseite:'],
    fotos: ['Hallo zusammen! 📸', '', `Habt ihr Fotos oder Videos vom Abend bei ${s.venue} (${wann(s.date)})?`, 'Wir würden gern ein paar für den Rückblick auf unserer Website nutzen – hochladen geht über die Konzertseite:'],
    rueckblick: [`📝 Rückblick: ${s.venue}`, '', 'Der Abend ist jetzt mit Fotos auf unserer Website – schaut mal rein:'],
  };
  return [...(kopf[schritt] ?? [ort]), '', `👉 ${link}`, '', '#blickfeldnord #livemusik'].join('\n');
}

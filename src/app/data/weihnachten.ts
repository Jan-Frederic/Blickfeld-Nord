// Weihnachtslieder erkennen (am Titel) und zeitlich passend einsetzen – für den Setlist-Vorschlag im Backstage und
// für die öffentlichen Song-Listen (Repertoire, Songwunsch). Ohne Abhängigkeiten, damit es überall klein bleibt.
const WEIHNACHTEN = /weihnacht|advent|christmas|xmas|jingle bells|santa/i;

export const istWeihnachtslied = (s: { title: string }) => WEIHNACHTEN.test(s.title);

/** Auftritt zwischen 15.11. und 26.12. (Datum JJJJ-MM-TT) – dann passen Weihnachtslieder in die Setlist */
export function adventszeit(datum: string): boolean {
  const md = datum.slice(5, 10);
  return md >= '11-15' && md <= '12-26';
}

/** Vom 1. bis 24. Dezember stehen Weihnachtslieder oben, sonst bleibt die Reihenfolge, wie sie ist */
export function weihnachtenZuerst<T extends { title: string }>(liste: T[], heute = new Date()): T[] {
  if (heute.getMonth() !== 11 || heute.getDate() > 24) return liste;
  return [...liste.filter(istWeihnachtslied), ...liste.filter((s) => !istWeihnachtslied(s))];
}

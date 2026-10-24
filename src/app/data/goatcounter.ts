// Öffentlicher GoatCounter-Zähler (nur Summen, keine Daten über einzelne Besucher) – für Backstage → Besucher und
// die Kampagne eines Auftritts. Voraussetzung: In GoatCounter unter Settings „Allow adding visitor counts on your
// website“ aktivieren, sonst antwortet der Zähler mit 403. GoatCounter puffert die Zahlen bis zu einige Stunden.
export const GC = 'https://blickfeld-nord.goatcounter.com';

/** Aufrufe einer Seite bzw. eines Ereignisses; `start`: 'week', 'month', 'year' oder '' (insgesamt) */
export async function zaehler(path: string, start: string): Promise<number> {
  const url = `${GC}/counter/${encodeURIComponent(path)}.json${start ? '?start=' + start : ''}`;
  const res = await fetch(url);
  if (res.status === 404) return 0; // Seite noch nie aufgerufen
  if (!res.ok) throw new Error(String(res.status));
  // Zahl kommt formatiert („1.234“ / „1,234“ / „1 234“)
  return Number(String((await res.json()).count).replace(/\D/g, '')) || 0;
}

/** Kampagne eines öffentlichen Auftritts (utm_campaign in QR-Codes und geteilten Links), z. B. „konzert-2026-12-04“ */
export const kampagne = (showId: string) => `konzert-${showId}`;
export const KAMPAGNE = /^konzert-\d{4}-\d{2}-\d{2}(-\d+)?$/;

/** Link zur Konzertseite mit Herkunft und Kampagne – für Plakat, Story und Teilen */
export function kampagnenLink(showId: string, ref: string, pfad = `/konzerte/${showId}/`): string {
  return `https://blickfeld-nord.de${pfad}?ref=${ref}&utm_campaign=${kampagne(showId)}`;
}

import data from './orte.json';

// Entfernung eines Orts von Hamminkeln (Luftlinie) – für den Entfernungs-Check im Booking.
// Ortsdaten: GeoNames (CC BY 4.0), Orte ab 1.000 Einwohnern in DE/NL bis 90 km (src/app/data/orte.json).
export const HOME = { name: 'Hamminkeln', lat: 51.733, lon: 6.59 };
export const RADIUS_KM = 50;

// Ortsteile von Hamminkeln (zu klein für die Ortsliste)
const ORTSTEILE = ['Dingden', 'Brünen', 'Ringenberg', 'Loikum', 'Mehrhoog', 'Mehr', 'Wertherbruch'];

export interface Ort {
  name: string;
  country: 'DE' | 'NL';
  km: number;
}

export const norm = (s: string) =>
  s.toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

function km(lat: number, lon: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat - HOME.lat) * rad;
  const dLon = (lon - HOME.lon) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(HOME.lat * rad) * Math.cos(lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

const ORTE: (Ort & { key: string })[] = [
  ...(data.orte as [string, 'DE' | 'NL', number, number][]).map(([name, country, lat, lon]) => ({ name, country, km: Math.round(km(lat, lon)), key: norm(name) })),
  ...ORTSTEILE.filter((n) => !data.orte.some((o) => o[0] === n)).map((name) => ({ name, country: 'DE' as const, km: 0, key: norm(name) })),
];

// genauer Treffer (auch „Hamminkeln-Dingden“, „Rhede (Westf.)“ o. Ä.)
export function findOrt(input: string): Ort | null {
  const q = norm(input);
  if (q.length < 2) return null;
  const exact = ORTE.find((o) => o.key === q);
  if (exact) return exact;
  // zusammengesetzte Eingaben: letzter bekannter Teil zählt („Hamminkeln Dingden“ → Dingden)
  const parts = q.split(' ').reverse();
  for (const p of parts) {
    const hit = ORTE.find((o) => o.key === p);
    if (hit) return hit;
  }
  return null;
}

// Vorschläge beim Tippen: Anfang des Namens zuerst, dann enthaltene
export function suggest(input: string, limit = 8): Ort[] {
  const q = norm(input);
  if (q.length < 2) return [];
  const starts = ORTE.filter((o) => o.key.startsWith(q));
  const contains = ORTE.filter((o) => !o.key.startsWith(q) && o.key.includes(q));
  return [...starts.sort((a, b) => a.km - b.km), ...contains.sort((a, b) => a.km - b.km)].slice(0, limit);
}

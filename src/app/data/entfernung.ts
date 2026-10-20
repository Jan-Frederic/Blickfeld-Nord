// Entfernung eines Orts oder einer Postleitzahl von Hamminkeln (Luftlinie) – für den Entfernungs-Check im Booking.
// Daten: public/data/orte.json (GeoNames, CC BY 4.0): Orte und Postleitzahlen in DE/NL bis 90 km, Ortsteile rund um
// Hamminkeln als Näherungswerte, dazu weiter entfernte größere Städte, Großstädte Europas und PLZ-Leitregionen –
// damit auch „Berlin“ oder „80331“ eine (augenzwinkernde) Antwort bekommt. Wird erst beim ersten Tippen geladen.
export const HOME = { name: 'Hamminkeln', lat: 51.733, lon: 6.59 };
export const RADIUS_KM = 50;

export interface Ort {
  name: string;
  country: string;
  km: number;
  /** Treffer über die Postleitzahl */
  plz?: string;
  /** nur grob bekannt (z. B. über die PLZ-Leitregion) */
  approx?: boolean;
}

interface Daten {
  orte: [string, 'DE' | 'NL', number, number][];
  fern: [string, string, number, number][];
  plz: Record<string, [number, number]>;
  plzRegion: Record<string, [number, number]>;
}

export const norm = (s: string) =>
  s.toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

function km(lat: number, lon: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat - HOME.lat) * rad;
  const dLon = (lon - HOME.lon) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(HOME.lat * rad) * Math.cos(lat * rad) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(a)));
}

export class Ortsverzeichnis {
  private constructor(
    private readonly orte: (Ort & { key: string })[],
    private readonly plz: Record<string, [number, number]>,
    private readonly plzRegion: Record<string, [number, number]>,
  ) {}

  private static loading?: Promise<Ortsverzeichnis>;
  static load(): Promise<Ortsverzeichnis> {
    return (this.loading ??= fetch('data/orte.json')
      .then((r) => r.json() as Promise<Daten>)
      .then(
        (d) =>
          new Ortsverzeichnis(
            [...d.orte, ...d.fern].map(([name, country, lat, lon]) => ({ name, country: country as Ort['country'], km: km(lat, lon), key: norm(name) })),
            d.plz,
            d.plzRegion,
          ),
      ));
  }

  // Postleitzahl (DE fünfstellig, NL vierstellig, auch „7091 AB“) oder Ortsname – auch „Hamminkeln-Dingden“, „Rhede (Westf.)“
  find(input: string): Ort | null {
    const code = /^\s*(\d{4,5})(\s*[a-z]{2})?\s*$/i.exec(input);
    if (code) {
      const plz = code[1];
      const key = (plz.length === 5 ? 'DE' : 'NL') + plz;
      const hit = this.plz[key];
      if (hit) return { name: plz, plz, country: plz.length === 5 ? 'DE' : 'NL', km: km(hit[0], hit[1]) };
      // weiter weg: deutsche PLZ über die Leitregion (erste zwei Ziffern) grob verorten
      const region = plz.length === 5 ? this.plzRegion[plz.slice(0, 2)] : undefined;
      return region ? { name: plz, plz, country: 'DE', km: km(region[0], region[1]), approx: true } : null;
    }
    const q = norm(input);
    if (q.length < 2) return null;
    const exact = this.orte.find((o) => o.key === q);
    if (exact) return exact;
    // zusammengesetzte Eingaben: letzter bekannter Teil zählt („Hamminkeln Dingden“ → Dingden)
    for (const part of q.split(' ').reverse()) {
      const hit = this.orte.find((o) => o.key === part);
      if (hit) return hit;
    }
    return null;
  }

  // Vorschläge beim Tippen: Namensanfang zuerst (nächstgelegene oben), dann enthaltene
  suggest(input: string, limit = 8): Ort[] {
    const q = norm(input);
    if (q.length < 2 || /^\d/.test(q)) return [];
    const starts = this.orte.filter((o) => o.key.startsWith(q)).sort((a, b) => a.km - b.km);
    const contains = this.orte.filter((o) => !o.key.startsWith(q) && o.key.includes(q)).sort((a, b) => a.km - b.km);
    return [...starts, ...contains].slice(0, limit);
  }
}

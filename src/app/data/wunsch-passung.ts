// Wunschliste priorisieren (Backstage → Songs, Liste „Wunschliste“): Welche Wunschsongs passen am besten in die
// Setlist? Bewertet nach Tempo (füllt die Klasse, von der die Spotify-Setlist am wenigsten hat), Tonart (schon
// vertrautes Terrain: Quintenzirkel-Nachbar mehrerer Setlist-Songs) und Länge (3–5 Minuten). Ohne Angular-Abhängigkeiten.
import { quintAbstand } from './tonart-uebergang';

export type TempoKlasse = 'langsam' | 'mittel' | 'schnell';
export const tempoKlasse = (bpm: number): TempoKlasse => (bpm < 95 ? 'langsam' : bpm < 130 ? 'mittel' : 'schnell');
/** angestrebte Anteile einer abwechslungsreichen Setlist */
export const ZIEL: Record<TempoKlasse, number> = { langsam: 0.25, mittel: 0.45, schnell: 0.3 };

export interface PassungsSong {
  title: string;
  artist: string;
  bpm?: number;
  tonart?: string;
  /** Länge in Sekunden */
  dauer?: number;
}

export interface Passung {
  verteilung: Record<TempoKlasse, number>;
  /** Tempo-Klasse, die in der Setlist am deutlichsten fehlt (null, wenn ausgewogen) */
  fehlt: TempoKlasse | null;
  vorschlaege: { song: PassungsSong; punkte: number; gruende: string[] }[];
}

export function wunschPassung(setlist: PassungsSong[], wunsch: PassungsSong[], max = 5): Passung {
  const verteilung: Record<TempoKlasse, number> = { langsam: 0, mittel: 0, schnell: 0 };
  for (const s of setlist) if (s.bpm) verteilung[tempoKlasse(s.bpm)]++;
  const gesamt = verteilung.langsam + verteilung.mittel + verteilung.schnell;
  let fehlt: TempoKlasse | null = null;
  if (gesamt >= 5) {
    const luecke = (Object.keys(ZIEL) as TempoKlasse[]).map((k) => [k, ZIEL[k] - verteilung[k] / gesamt] as const).sort((a, b) => b[1] - a[1])[0];
    if (luecke[1] > 0.08) fehlt = luecke[0];
  }
  const drin = new Set(setlist.map((s) => `${s.title}|${s.artist}`));
  const vorschlaege = wunsch
    .filter((w) => !drin.has(`${w.title}|${w.artist}`))
    .map((song) => {
      let punkte = 0;
      const gruende: string[] = [];
      if (song.bpm) {
        const k = tempoKlasse(song.bpm);
        if (k === fehlt) {
          punkte += 2;
          gruende.push(`${k} (${song.bpm} bpm) – davon hat die Setlist wenig`);
        } else gruende.push(`${k} (${song.bpm} bpm)`);
      } else gruende.push('Tempo noch unbekannt');
      if (song.tonart) {
        const nah = setlist.filter((s) => (quintAbstand(s.tonart, song.tonart) ?? 9) <= 1).length;
        if (nah >= 3) {
          punkte += 1;
          gruende.push(`Tonart ${song.tonart} passt zu ${nah} Setlist-Songs`);
        }
      }
      if (song.dauer && song.dauer >= 180 && song.dauer <= 300) punkte += 0.5;
      else if (song.dauer && song.dauer > 330) gruende.push(`lang (${Math.round(song.dauer / 60)} Min.)`);
      return { song, punkte, gruende };
    })
    .sort((a, b) => b.punkte - a.punkte || a.song.title.localeCompare(b.song.title, 'de'))
    .slice(0, max);
  return { verteilung, fehlt, vorschlaege };
}

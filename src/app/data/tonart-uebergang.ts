// Tonart-Übergänge in der Setlist: Abstand zweier Tonarten im Quintenzirkel (0 = gleich/verwandt … 6 = Tritonus).
// Moll zählt wie die parallele Dur-Tonart (Am = C), damit Am → C kein Sprung ist. Ab 4 Schritten Abstand klingt der
// Wechsel ohne Überleitung hart – die Setlist markiert ihn und kann die Reihenfolge innerhalb eines Sets glätten.
// Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann.
import { Entry, isPause } from './setlist-data';

/** ab so vielen Quinten Abstand gilt ein Wechsel als Tonartsprung */
export const SPRUNG_AB = 4;

const GRUNDTON: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, H: 11, B: 11 };

/** Position im Quintenzirkel (0–11, C = 0, G = 1 …) – undefined, wenn die Tonart nicht lesbar ist */
export function quintPosition(tonart: string | undefined): number | undefined {
  const m = /^([A-H])([#b]?)(m?)$/.exec(tonart?.trim() ?? '');
  if (!m) return undefined;
  let ton = GRUNDTON[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  if (m[3]) ton += 3; // Moll → parallele Dur-Tonart
  return (((ton % 12) + 12) % 12 * 7) % 12;
}

/** Abstand zweier Tonarten im Quintenzirkel (0–6) – undefined, wenn eine fehlt */
export function quintAbstand(a: string | undefined, b: string | undefined): number | undefined {
  const pa = quintPosition(a);
  const pb = quintPosition(b);
  if (pa === undefined || pb === undefined) return undefined;
  const d = Math.abs(pa - pb);
  return Math.min(d, 12 - d);
}

export function istSprung(a: string | undefined, b: string | undefined): boolean {
  return (quintAbstand(a, b) ?? 0) >= SPRUNG_AB;
}

const KREUZ = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'H'];
const BE = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'H'];

/**
 * Überleitung in eine Tonart: ihr Dominantseptakkord (eine Quinte über dem Grundton, in Dur wie in Moll), z. B.
 * E → „H7“, Am → „E7“, Ab → „Eb7“. Kreuz- oder b-Schreibweise wie die Zieltonart; undefined, wenn sie nicht lesbar ist.
 */
export function ueberleitung(nach: string | undefined): string | undefined {
  const m = /^([A-H])([#b]?)(m?)$/.exec(nach?.trim() ?? '');
  if (!m) return undefined;
  const ton = (GRUNDTON[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 7 + 12) % 12;
  return (m[2] === '#' ? KREUZ : BE)[ton] + '7';
}

/** Hinweis für einen Tonartsprung zwischen zwei aufeinanderfolgenden Songs, z. B. „Ab → E · Überleitung H7“ */
export function sprungHinweis(von: string | undefined, nach: string | undefined): string | null {
  return istSprung(von, nach) ? `${von} → ${nach} · Überleitung ${ueberleitung(nach)}` : null;
}

type Song = { title: string; artist: string };

/** Zahl der Tonartsprünge innerhalb der Sets (über eine Pause hinweg zählt kein Wechsel) */
export function spruenge(entries: Entry[], tonart: (s: Song) => string | undefined): number {
  let n = 0;
  for (let i = 1; i < entries.length; i++) {
    const a = entries[i - 1];
    const b = entries[i];
    if (!isPause(a) && !isPause(b) && istSprung(tonart(a as Song), tonart(b as Song))) n++;
  }
  return n;
}

/**
 * Reihenfolge innerhalb jedes Sets glätten: erster und letzter Song bleiben (Opener und Rausschmeißer), dazwischen
 * die Folge mit den wenigsten Sprüngen (bei Gleichstand den kürzesten Wegen im Quintenzirkel). Bis 12 Songs
 * dazwischen wird die beste Folge exakt berechnet, darüber schrittweise (nächste Tonart, dann paarweise tauschen).
 * Songs ohne Tonart zählen als neutral (Abstand 2); ohne Verbesserung bleibt die bisherige Reihenfolge, Pausen
 * bleiben an ihrem Platz.
 */
export function glaetten(entries: Entry[], tonart: (s: Song) => string | undefined): Entry[] {
  const abstand = (a: Entry, b: Entry) => quintAbstand(tonart(a as Song), tonart(b as Song)) ?? 2;
  // Kosten eines Übergangs: ein Sprung zählt mehr als jeder Umweg ohne Sprung
  const schritt = (a: Entry, b: Entry) => (abstand(a, b) >= SPRUNG_AB ? 100 : 0) + abstand(a, b);
  const kosten = (folge: Entry[]) => folge.slice(1).reduce((k, s, i) => k + schritt(folge[i], s), 0);

  // exakt: kürzester Weg vom Opener durch alle Songs zum Schluss (Held-Karp, 2^n · n²)
  const exakt = (erster: Entry, mitte: Entry[], letzter: Entry): Entry[] => {
    const n = mitte.length;
    const voll = (1 << n) - 1;
    const best: number[][] = Array.from({ length: 1 << n }, () => Array(n).fill(Infinity));
    const von: number[][] = Array.from({ length: 1 << n }, () => Array(n).fill(-1));
    for (let i = 0; i < n; i++) best[1 << i][i] = schritt(erster, mitte[i]);
    for (let maske = 1; maske <= voll; maske++)
      for (let i = 0; i < n; i++) {
        if (!(maske & (1 << i)) || best[maske][i] === Infinity) continue;
        for (let j = 0; j < n; j++) {
          if (maske & (1 << j)) continue;
          const k = best[maske][i] + schritt(mitte[i], mitte[j]);
          if (k < best[maske | (1 << j)][j]) [best[maske | (1 << j)][j], von[maske | (1 << j)][j]] = [k, i];
        }
      }
    let ende = 0;
    for (let i = 1; i < n; i++) if (best[voll][i] + schritt(mitte[i], letzter) < best[voll][ende] + schritt(mitte[ende], letzter)) ende = i;
    const folge: Entry[] = [];
    for (let maske = voll, i = ende; i >= 0; ) {
      folge.unshift(mitte[i]);
      const vorher = von[maske][i];
      maske &= ~(1 << i);
      i = vorher;
    }
    return [erster, ...folge, letzter];
  };

  // schrittweise für große Sets: jeweils die nächstgelegene Tonart, dann paarweise tauschen, solange es besser wird
  const schrittweise = (erster: Entry, mitte: Entry[], letzter: Entry): Entry[] => {
    const rest = [...mitte];
    const folge = [erster];
    while (rest.length) {
      let best = 0;
      rest.forEach((s, i) => abstand(folge[folge.length - 1], s) < abstand(folge[folge.length - 1], rest[best]) && (best = i));
      folge.push(...rest.splice(best, 1));
    }
    folge.push(letzter);
    for (let besser = true; besser; ) {
      besser = false;
      for (let i = 1; i < folge.length - 1; i++)
        for (let j = i + 1; j < folge.length - 1; j++) {
          const vorher = kosten(folge);
          [folge[i], folge[j]] = [folge[j], folge[i]];
          if (kosten(folge) < vorher) besser = true;
          else [folge[i], folge[j]] = [folge[j], folge[i]];
        }
    }
    return folge;
  };

  const ordnen = (set: Entry[]): Entry[] => {
    if (set.length <= 3) return set;
    const mitte = set.slice(1, -1);
    const folge = (mitte.length <= 12 ? exakt : schrittweise)(set[0], mitte, set[set.length - 1]);
    return kosten(folge) < kosten(set) ? folge : set;
  };
  const out: Entry[] = [];
  let set: Entry[] = [];
  for (const e of entries) {
    if (isPause(e)) {
      out.push(...ordnen(set), e);
      set = [];
    } else set.push(e);
  }
  return [...out, ...ordnen(set)];
}

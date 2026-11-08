// Notizen im Probe-Modus – je Person: jede schreibt ihre eigene Datei bn-probenotiz-<Person> (mit der Band gespiegelt,
// so ändern nie zwei Leute dieselbe Datei), je Probe (Datum) und Song ein kurzer Text. Die Band sieht sie im Probe-Modus
// („Letzte Probe: Fred: Bridge wackelt · David: Tempo“), im Plan der Probe und im Song-Dialog („Zuletzt geprobt“).
// Die gemeinsame Notiz im Probenplan (Backstage → Probe, Protokoll) bleibt daneben bestehen.
// Ohne Angular-Abhängigkeiten, damit es in Node testbar ist.
import { Mitglied, rufname } from './band-ich';

export const PROBENOTIZ_PREFIX = 'bn-probenotiz-';
/** Datum der Probe → Song-Key → Notiz */
export type PersonNotizen = Record<string, Record<string, string>>;

export function ladeProbeNotizen(slug: string): PersonNotizen {
  try {
    const v = JSON.parse(localStorage.getItem(PROBENOTIZ_PREFIX + slug) ?? '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

export function probeNotizSetzen(slug: string, datum: string, key: string, text: string): void {
  if (!slug) return;
  const alle = ladeProbeNotizen(slug);
  const tag = { ...(alle[datum] ?? {}) };
  const t = text.trim().slice(0, 80);
  if (t) tag[key] = t;
  else delete tag[key];
  if (Object.keys(tag).length) alle[datum] = tag;
  else delete alle[datum];
  try {
    if (Object.keys(alle).length) localStorage.setItem(PROBENOTIZ_PREFIX + slug, JSON.stringify(alle));
    else localStorage.removeItem(PROBENOTIZ_PREFIX + slug);
  } catch {
    // ohne Speicher gilt die Notiz nicht
  }
}

/** Notizen aller Personen zu einer Probe: Song-Key → „Fred: …“ (je Person) */
export function notizenDerProbe(datum: string, mitglieder: Mitglied[], ohne = ''): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const m of mitglieder) {
    if (m.slug === ohne) continue;
    for (const [key, n] of Object.entries(ladeProbeNotizen(m.slug)[datum] ?? {})) out.set(key, [...(out.get(key) ?? []), `${rufname(m)}: ${n}`]);
  }
  return out;
}

/**
 * je Song die Notizen der letzten Probe (vor `vor`, sonst überhaupt), mit der Notiz aus dem Probenplan zusammen:
 * „Bridge wackelt · Fred: Einsatz · David: Tempo“
 */
export function letzteNotizen(
  mitglieder: Mitglied[],
  planNotizen: Map<string, { tag: string; notiz: string }>,
  vor = '9999-12-31',
): Map<string, { tag: string; notiz: string }> {
  const je = new Map<string, { tag: string; teile: string[] }>();
  const dazu = (key: string, tag: string, text: string) => {
    if (tag >= vor) return;
    const alt = je.get(key);
    if (!alt || tag > alt.tag) je.set(key, { tag, teile: [text] });
    else if (tag === alt.tag) alt.teile.push(text);
  };
  for (const [key, n] of planNotizen) dazu(key, n.tag, n.notiz);
  for (const m of mitglieder) for (const [tag, songs] of Object.entries(ladeProbeNotizen(m.slug))) for (const [key, n] of Object.entries(songs)) dazu(key, tag, `${rufname(m)}: ${n}`);
  return new Map([...je].map(([k, v]) => [k, { tag: v.tag, notiz: v.teile.join(' · ') }]));
}
